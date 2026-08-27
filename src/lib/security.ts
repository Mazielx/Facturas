/**
 * Grydex Security Module
 * 
 * Comprehensive security utilities:
 * - Rate limiting (Upstash-backed with in-memory fallback)
 * - Account lockout after failed attempts (Upstash-backed)
 * - Password strength validation + breach checking
 * - Session fingerprinting
 * - Security audit logging
 * - Input sanitization
 * - Upload content validation
 */

import crypto from "crypto"
import { dbRun, dbGet, dbAll } from "@/db/client"

// Upstash imports — only used when env vars are configured
let _Ratelimit: typeof import("@upstash/ratelimit").Ratelimit | null = null
let _Redis: typeof import("@upstash/redis").Redis | null = null

async function loadUpstash() {
  if (!_Ratelimit) {
    try {
      const ratelimitMod = await import("@upstash/ratelimit")
      const redisMod = await import("@upstash/redis")
      _Ratelimit = ratelimitMod.Ratelimit
      _Redis = redisMod.Redis
    } catch {
      // Upstash not installed — fall back to in-memory
    }
  }
}


// ============================================================================
// RATE LIMITING — Upstash-backed (serverless-safe) with in-memory fallback
// ============================================================================
//
// On Vercel (serverless) in-memory Maps don't persist across invocations,
// so rate limits AND account lockout were non-functional. We now use Upstash
// Redis when configured, falling back to in-memory otherwise (dev/CI/Railway).

interface RateLimitEntry {
  count: number
  resetAt: number
}

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

/** True when Upstash is configured. */
export const isUpstashConfigured = Boolean(UPSTASH_URL && UPSTASH_TOKEN)

let _redis: InstanceType<typeof import("@upstash/redis").Redis> | null = null
function getRedis(): InstanceType<typeof import("@upstash/redis").Redis> | null {
  if (!isUpstashConfigured) return null
  if (_redis) return _redis
  if (_Redis) {
    _redis = new _Redis({ url: UPSTASH_URL!, token: UPSTASH_TOKEN! })
    return _redis
  }
  return null
}

// --- In-memory fallback store (only when Upstash is not configured) ---
const rateLimitStore = new Map<string, RateLimitEntry>()
let rateLimitCleanupStarted = false
function ensureRateLimitCleanup() {
  if (rateLimitCleanupStarted || typeof setInterval === "undefined") return
  rateLimitCleanupStarted = true
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore) {
      if (entry.resetAt <= now) rateLimitStore.delete(key)
    }
  }, 5 * 60 * 1000)
}

export interface RateLimitConfig {
  /** Window size in milliseconds */
  windowMs: number
  /** Max requests per window */
  max: number
  /** Key prefix */
  prefix: string
}

export interface RateLimitResult {
  allowed: boolean
  max: number
  remaining: number
  resetAt: number
}

// Predefined rate limits
export const RATE_LIMITS = {
  login: { windowMs: 15 * 60 * 1000, max: 5, prefix: "rl:login" },          // 5 per 15 min
  register: { windowMs: 60 * 60 * 1000, max: 3, prefix: "rl:register" },     // 3 per hour
  passwordChange: { windowMs: 60 * 60 * 1000, max: 3, prefix: "rl:pw" },     // 3 per hour
  extract: { windowMs: 5 * 60 * 1000, max: 5, prefix: "rl:extract" },        // 5 per 5 min
  export: { windowMs: 5 * 60 * 1000, max: 10, prefix: "rl:export" },         // 10 per 5 min
  apiGlobal: { windowMs: 60 * 1000, max: 60, prefix: "rl:api" },             // 60 per min
  admin: { windowMs: 60 * 1000, max: 30, prefix: "rl:admin" },               // 30 per min
} as const

// Lazily build one Ratelimit instance per prefix (cached across warm starts)
let _ratelimits: Record<string, InstanceType<typeof import("@upstash/ratelimit").Ratelimit>> | null | undefined
async function getRatelimits(): Promise<Record<string, InstanceType<typeof import("@upstash/ratelimit").Ratelimit>> | null> {
  if (_ratelimits !== undefined) return _ratelimits
  await loadUpstash()
  const redis = getRedis()
  if (!redis || !_Ratelimit) {
    _ratelimits = null
    return null
  }
  const map: Record<string, InstanceType<typeof _Ratelimit>> = {}
  for (const cfg of Object.values(RATE_LIMITS)) {
    const windowSec = Math.floor(cfg.windowMs / 1000)
    map[cfg.prefix] = new _Ratelimit({
      redis,
      limiter: _Ratelimit.slidingWindow(cfg.max, `${windowSec} s`),
      prefix: cfg.prefix,
      analytics: false,
    })
  }
  _ratelimits = map as Record<string, InstanceType<typeof _Ratelimit>>
  return _ratelimits
}

export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const ratelimits = await getRatelimits()
  const rl = ratelimits?.[config.prefix]

  if (rl) {
    try {
      const { success, limit, remaining, reset } = await rl.limit(identifier)
      return {
        allowed: success,
        max: limit,
        remaining: Math.max(0, remaining),
        resetAt: reset,
      }
    } catch (err) {
      // Fail open on Redis errors — degrade to per-instance in-memory
      safeLogError("ratelimit:upstash", err)
    }
  }

  // Fallback: in-memory sliding window
  ensureRateLimitCleanup()
  const key = `${config.prefix}:${identifier}`
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + config.windowMs })
    return { allowed: true, max: config.max, remaining: config.max - 1, resetAt: now + config.windowMs }
  }

  entry.count++
  if (entry.count > config.max) {
    return { allowed: false, max: config.max, remaining: 0, resetAt: entry.resetAt }
  }

  return { allowed: true, max: config.max, remaining: config.max - entry.count, resetAt: entry.resetAt }
}

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.max),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  }
}


// ============================================================================
// ACCOUNT LOCKOUT — Track failed login attempts (Upstash-backed, in-memory fallback)
// ============================================================================

interface LockoutEntry {
  failures: number
  lockedUntil: number
}

const lockoutStore = new Map<string, LockoutEntry>()
let lockoutCleanupStarted = false
function ensureLockoutCleanup() {
  if (lockoutCleanupStarted || typeof setInterval === "undefined") return
  lockoutCleanupStarted = true
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of lockoutStore) {
      if (entry.lockedUntil !== 0 && entry.lockedUntil <= now) {
        lockoutStore.delete(key)
      }
    }
  }, 5 * 60 * 1000)
}

const lockoutFailureKey = (id: string) => `lockout:fail:${id}`
const lockoutLockKey = (id: string) => `lockout:lock:${id}`

export const LOCKOUT_CONFIG = {
  maxFailures: 5,
  lockoutDurationMs: 15 * 60 * 1000, // 15 minutes
  failureWindowMs: 30 * 60 * 1000,   // Reset counter after 30 min of no failures
}

export async function recordFailedLogin(identifier: string): Promise<{ locked: boolean; remainingMs: number }> {
  const redis = getRedis()
  if (redis) {
    try {
      const failKey = lockoutFailureKey(identifier)
      const count = await redis.incr(failKey)
      if (count === 1) {
        await redis.expire(failKey, Math.ceil(LOCKOUT_CONFIG.failureWindowMs / 1000))
      }
      if (count >= LOCKOUT_CONFIG.maxFailures) {
        await redis.set(lockoutLockKey(identifier), "1", {
          ex: Math.ceil(LOCKOUT_CONFIG.lockoutDurationMs / 1000),
        })
        return { locked: true, remainingMs: LOCKOUT_CONFIG.lockoutDurationMs }
      }
      return { locked: false, remainingMs: 0 }
    } catch (err) {
      safeLogError("lockout:upstash", err)
    }
  }

  // Fallback: in-memory
  ensureLockoutCleanup()
  const now = Date.now()
  const entry = lockoutStore.get(identifier)

  if (entry && entry.lockedUntil > now) {
    return { locked: true, remainingMs: entry.lockedUntil - now }
  }

  if (!entry || (now - entry.lockedUntil) > LOCKOUT_CONFIG.failureWindowMs) {
    lockoutStore.set(identifier, { failures: 1, lockedUntil: 0 })
    return { locked: false, remainingMs: 0 }
  }

  entry.failures++
  if (entry.failures >= LOCKOUT_CONFIG.maxFailures) {
    entry.lockedUntil = now + LOCKOUT_CONFIG.lockoutDurationMs
    return { locked: true, remainingMs: LOCKOUT_CONFIG.lockoutDurationMs }
  }

  return { locked: false, remainingMs: 0 }
}

export async function clearFailedLogins(identifier: string): Promise<void> {
  const redis = getRedis()
  if (redis) {
    try {
      await redis.del(lockoutFailureKey(identifier), lockoutLockKey(identifier))
      return
    } catch (err) {
      safeLogError("lockout:clear:upstash", err)
    }
  }
  lockoutStore.delete(identifier)
}

export async function isAccountLocked(identifier: string): Promise<{ locked: boolean; remainingMs: number }> {
  const redis = getRedis()
  if (redis) {
    try {
      const ttl = await redis.ttl(lockoutLockKey(identifier))
      if (ttl > 0) return { locked: true, remainingMs: ttl * 1000 }
      return { locked: false, remainingMs: 0 }
    } catch (err) {
      safeLogError("lockout:check:upstash", err)
    }
  }
  const entry = lockoutStore.get(identifier)
  if (!entry) return { locked: false, remainingMs: 0 }
  if (entry.lockedUntil <= Date.now()) return { locked: false, remainingMs: 0 }
  return { locked: true, remainingMs: entry.lockedUntil - Date.now() }
}


// ============================================================================
// PASSWORD STRENGTH VALIDATION
// ============================================================================

export interface PasswordStrength {
  valid: boolean
  score: number // 0-4 (0=terrible, 4=excellent)
  feedback: string[]
}

export function validatePasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = []
  let score = 0

  if (password.length >= 8) score++
  else feedback.push("Minimo 8 caracteres")

  if (password.length >= 12) score++
  else if (password.length >= 8) feedback.push("Recomendado: 12+ caracteres")

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  else feedback.push("Mezcla mayusculas y minusculas")

  if (/\d/.test(password)) {
    score++
  } else {
    feedback.push("Incluye al menos un numero")
  }

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score = Math.min(score + 1, 4)
  }

  // Check for common patterns
  const lower = password.toLowerCase()
  const commonPatterns = [
    "password", "contrasena", "123456", "qwerty", "abc123",
    "letmein", "admin", "welcome", "monkey", "dragon",
    "111111", "password1", "abcdef", "iloveyou", "master",
  ]
  if (commonPatterns.some(p => lower.includes(p))) {
    score = Math.min(score, 1)
    feedback.push("Evita contrasenas comunes")
  }

  // Check for repeated characters
  if (/(.)\1{3,}/.test(password)) {
    score = Math.min(score, 1)
    feedback.push("Evita caracteres repetidos (ej: aaaa)")
  }

  // Check for sequential characters
  if (/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password)) {
    score = Math.min(score, 2)
    feedback.push("Evita secuencias (abc, 123)")
  }

  return {
    valid: score >= 3 && password.length >= 8,
    score: Math.min(score, 4),
    feedback,
  }
}


// ============================================================================
// PASSWORD BREACH CHECK — HaveIBeenPwned k-anonymity
// ============================================================================

export async function checkPasswordBreach(password: string): Promise<{ breached: boolean; count: number }> {
  try {
    const sha1 = crypto.createHash("sha1").update(password).digest("hex").toUpperCase()
    const prefix = sha1.substring(0, 5)
    const suffix = sha1.substring(5)

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" },
    })

    if (!response.ok) return { breached: false, count: 0 }

    const text = await response.text()
    const lines = text.split("\n")

    for (const line of lines) {
      const [hashSuffix, count] = line.split(":")
      if (hashSuffix?.trim() === suffix) {
        return { breached: true, count: parseInt(count?.trim() || "0", 10) }
      }
    }

    return { breached: false, count: 0 }
  } catch {
    // If HIBP is unreachable, don't block registration
    return { breached: false, count: 0 }
  }
}


// ============================================================================
// SESSION FINGERPRINTING
// ============================================================================

export function createSessionFingerprint(ip: string, userAgent: string): string {
  const raw = `${ip}:${userAgent}`
  return crypto.createHash("sha256").update(raw).digest("hex")
}

export function verifySessionFingerprint(
  fingerprint: string | null,
  ip: string,
  userAgent: string
): boolean {
  if (!fingerprint) return true // Legacy sessions without fingerprint are allowed
  try {
    const expected = createSessionFingerprint(ip, userAgent)
    const expectedBuf = Buffer.from(expected, "hex")
    const receivedBuf = Buffer.from(fingerprint, "hex")
    // V-27 FIX: Length check before timingSafeEqual to prevent throw
    if (expectedBuf.length !== receivedBuf.length) return false
    return crypto.timingSafeEqual(expectedBuf, receivedBuf)
  } catch {
    return false
  }
}

export function extractClientIp(request: Request): string {
  // V-21 FIX: On Vercel, x-real-ip is set by the platform proxy.
  // Only trust platform-provided headers, not client-supplied X-Forwarded-For.
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  )
}

export function extractUserAgent(request: Request): string {
  return request.headers.get("user-agent") || "unknown"
}


// ============================================================================
// SECURITY AUDIT LOGGING
// ============================================================================

export type SecurityEvent =
  | "login_success"
  | "login_failed"
  | "login_locked"
  | "register"
  | "password_changed"
  | "session_created"
  | "session_invalidated"
  | "account_locked"
  | "unauthorized_access"
  | "rate_limited"
  | "file_uploaded"
  | "admin_action"
  | "api_key_created"
  | "api_key_deleted"
  | "api_key_used"
  | "tenant_switched"
  | "export_downloaded"
  | "oauth_invalid_state"
  | "oauth_state_tenant_mismatch"
  | "oauth_email_mismatch"
  | "oauth_cuenta_connected"
  | "oauth_login_completed"
  | "oauth_error"

export async function logSecurityEvent(
  event: SecurityEvent,
  details: {
    userId?: number
    email?: string
    ip?: string
    userAgent?: string
    metadata?: Record<string, unknown>
  }
): Promise<void> {
  try {
    await dbRun(
      `INSERT INTO security_log (event_type, user_id, email, ip, user_agent, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`,
      {
        "1": event,
        "2": details.userId || null,
        "3": details.email || null,
        "4": details.ip || null,
        "5": details.userAgent || null,
        "6": details.metadata ? JSON.stringify(details.metadata) : null,
      }
    )
  } catch {
    // Never let logging failure break the request
  }
}


// ============================================================================
// INPUT SANITIZATION
// ============================================================================

/**
 * Sanitize a string for safe storage/display.
 * Strips control characters, trims whitespace, limits length.
 */
export function sanitizeString(input: string, maxLength = 1000): string {
  return input
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Control chars
    .trim()
    .substring(0, maxLength)
}

/**
 * Validate and sanitize an email address.
 */
export function sanitizeEmail(email: string): string | null {
  const cleaned = email.trim().toLowerCase()
  // RFC 5322 simplified
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  if (!emailRegex.test(cleaned) || cleaned.length > 254) return null
  return cleaned
}

/**
 * Validate that a string is a safe slug (alphanumeric + hyphens only).
 */
export function sanitizeSlug(slug: string): string | null {
  const cleaned = slug.trim().toLowerCase()
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cleaned)) return null
  if (cleaned.length > 100) return null
  return cleaned
}

/**
 * Parse and validate a safe integer from a string.
 */
export function sanitizeInt(value: string | null, min?: number, max?: number): number | null {
  if (!value) return null
  const parsed = parseInt(value, 10)
  if (isNaN(parsed)) return null
  if (min !== undefined && parsed < min) return null
  if (max !== undefined && parsed > max) return null
  return parsed
}


// ============================================================================
// UPLOAD VALIDATION — Magic bytes
// ============================================================================

const MAGIC_BYTES: Record<string, Buffer[]> = {
  "image/jpeg": [Buffer.from([0xff, 0xd8, 0xff])],
  "image/png": [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
  "image/gif": [Buffer.from("GIF87a"), Buffer.from("GIF89a")],
  "image/webp": [Buffer.from("RIFF")], // + offset 8: "WEBP"
  "application/pdf": [Buffer.from("%PDF")],
  "text/xml": [Buffer.from("<?xml"), Buffer.from("<xml")],
  "application/xml": [Buffer.from("<?xml"), Buffer.from("<xml")],
}

export function validateFileContent(
  buffer: Buffer,
  declaredMimeType: string
): { valid: boolean; actualType?: string } {
  if (buffer.length < 4) return { valid: false }

  // Check magic bytes
  for (const [mimeType, signatures] of Object.entries(MAGIC_BYTES)) {
    for (const sig of signatures) {
      if (buffer.subarray(0, sig.length).equals(sig)) {
        // For WebP, also check the "WEBP" marker at offset 8
        if (mimeType === "image/webp") {
          if (buffer.length >= 12 && buffer.subarray(8, 12).toString() === "WEBP") {
            return { valid: true, actualType: mimeType }
          }
          continue
        }
        return { valid: true, actualType: mimeType }
      }
    }
  }

  // No known magic bytes matched
  return { valid: false }
}


// ============================================================================
// ERROR RESPONSE — Never leak internals
// ============================================================================

export function secureErrorResponse(error: unknown, context: string): { message: string; status: number } {
  safeLogError(context, error)

  // In production, never expose error details
  if (process.env.NODE_ENV === "production") {
    return { message: "Error interno del servidor", status: 500 }
  }

  // In development, provide more detail
  const message = error instanceof Error ? error.message : "Error desconocido"
  return { message, status: 500 }
}


// ============================================================================
// V-45: SAFE ERROR LOGGING — prevents leaking sensitive data in error objects
// ============================================================================

/**
 * Safe error logger — never logs full error objects (may contain tokens, PII, stack traces).
 * Only logs a sanitized category code.
 */
export function safeLogError(context: string, error: unknown): void {
  const msg = error instanceof Error ? error.message : "unknown"
  // Truncate + classify — never log full error objects
  const safe = msg.includes("invalid_grant") ? "invalid_grant"
    : msg.includes("ECONNREFUSED") ? "connection_refused"
    : msg.includes("SQLITE") ? "database_error"
    : msg.includes("timeout") ? "timeout"
    : msg.includes("auth") ? "auth_error"
    : "error"
  console.error(`[${context}] ${safe}`)
}

