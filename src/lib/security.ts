/**
 * Grydex Security Module
 * 
 * Comprehensive security utilities:
 * - Rate limiting (in-memory with sliding window)
 * - Account lockout after failed attempts
 * - Password strength validation + breach checking
 * - Session fingerprinting
 * - Security audit logging
 * - Input sanitization
 * - Upload content validation
 */

import crypto from "crypto"
import { dbRun, dbGet, dbAll } from "@/db/client"

// ============================================================================
// RATE LIMITING — In-memory sliding window
// ============================================================================

interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore) {
    if (entry.resetAt <= now) rateLimitStore.delete(key)
  }
}, 5 * 60 * 1000)

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
  remaining: number
  resetAt: number
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const key = `${config.prefix}:${identifier}`
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + config.windowMs })
    return { allowed: true, remaining: config.max - 1, resetAt: now + config.windowMs }
  }

  entry.count++
  if (entry.count > config.max) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  return { allowed: true, remaining: config.max - entry.count, resetAt: entry.resetAt }
}

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.resetAt),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  }
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


// ============================================================================
// ACCOUNT LOCKOUT — Track failed login attempts
// ============================================================================

interface LockoutEntry {
  failures: number
  lockedUntil: number
}

const lockoutStore = new Map<string, LockoutEntry>()

export const LOCKOUT_CONFIG = {
  maxFailures: 5,
  lockoutDurationMs: 15 * 60 * 1000, // 15 minutes
  failureWindowMs: 30 * 60 * 1000,   // Reset counter after 30 min of no failures
}

export function recordFailedLogin(identifier: string): { locked: boolean; remainingMs: number } {
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

export function clearFailedLogins(identifier: string): void {
  lockoutStore.delete(identifier)
}

export function isAccountLocked(identifier: string): { locked: boolean; remainingMs: number } {
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
  const expected = createSessionFingerprint(ip, userAgent)
  return crypto.timingSafeEqual(
    Buffer.from(fingerprint, "hex"),
    Buffer.from(expected, "hex")
  )
}

export function extractClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
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
// CORS
// ============================================================================

export function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigins = [
    process.env.APP_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    "https://facturas-sigma.vercel.app",
  ].filter(Boolean) as string[]

  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400",
  }

  if (origin && allowedOrigins.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin
    headers["Vary"] = "Origin"
  }

  return headers
}

export function handleCors(request: Request): { allowed: boolean; headers: Record<string, string> } {
  const origin = request.headers.get("origin")

  // OPTIONS requests are always preflight
  if (request.method === "OPTIONS") {
    return { allowed: true, headers: getCorsHeaders(origin) }
  }

  // For non-preflight requests, check origin for state-changing methods
  if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
    const allowedOrigins = [
      process.env.APP_URL,
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
      "https://facturas-sigma.vercel.app",
    ].filter(Boolean) as string[]

    // Same-origin requests (no Origin header) are allowed
    if (!origin) return { allowed: true, headers: {} }

    if (!allowedOrigins.includes(origin)) {
      return { allowed: false, headers: getCorsHeaders(null) }
    }
  }

  return { allowed: true, headers: getCorsHeaders(origin) }
}


// ============================================================================
// ERROR RESPONSE — Never leak internals
// ============================================================================

export function secureErrorResponse(error: unknown, context: string): { message: string; status: number } {
  console.error(`[${context}]`, error)

  // In production, never expose error details
  if (process.env.NODE_ENV === "production") {
    return { message: "Error interno del servidor", status: 500 }
  }

  // In development, provide more detail
  const message = error instanceof Error ? error.message : "Error desconocido"
  return { message, status: 500 }
}


// ============================================================================
// REQUEST SIZE LIMITS
// ============================================================================

export function checkRequestSize(request: Request, maxBytes: number): boolean {
  const contentLength = request.headers.get("content-length")
  if (contentLength && parseInt(contentLength, 10) > maxBytes) return false
  return true
}

export const REQUEST_LIMITS = {
  json: 1024 * 1024,        // 1MB for JSON bodies
  upload: 10 * 1024 * 1024, // 10MB for file uploads
  export: 0,                 // No limit for exports (GET)
} as const
