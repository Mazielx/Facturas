import crypto from "crypto"
import { dbExec, dbGet } from "@/db/client"

const STATE_TTL_MS = 2 * 60 * 1000 // V-34 FIX: Reduced from 15min to 2min (Google consent should be < 2min)

function signingKey(): Buffer {
  // V-16 FIX: Fail hard if no secret is configured. Never fall back to hardcoded string.
  const secret = process.env.OAUTH_STATE_SECRET
  if (!secret) {
    throw new Error("OAUTH_STATE_SECRET env var is required. Generate with: openssl rand -hex 32")
  }
  return crypto.createHash("sha256").update(secret).digest()
}

export interface OAuthState {
  kind: "cuenta_correo" | "login"
  email?: string
  negocioId?: number
  jti: string // V-34: Nonce for single-use enforcement
  exp: number
}

/**
 * V-34 FIX: Generate a nonce (jti) for single-use enforcement.
 * The nonce is stored in the DB and consumed on verification.
 * On Vercel (serverless), each invocation is isolated, but DB persists.
 */
async function consumeNonce(jti: string): Promise<boolean> {
  try {
    // Try to insert the nonce — if it already exists, this is a replay
    const existing = await dbGet<{ jti: string }>(
      "SELECT jti FROM oauth_nonces WHERE jti = ?",
      { "1": jti }
    )
    if (existing) return false // Already consumed — REPLAY DETECTED

    // Insert as consumed with TTL expiry
    await dbExec(
      "INSERT INTO oauth_nonces (jti, expires_at) VALUES (?, datetime('now', '+5 minutes'))",
      { "1": jti }
    )
    return true
  } catch {
    return false
  }
}

export function signCuentaCorreoState(email: string, negocioId: number): string {
  const jti = crypto.randomBytes(16).toString("hex")
  const payload = Buffer.from(
    JSON.stringify({ kind: "cuenta_correo", email, negocioId, jti, exp: Date.now() + STATE_TTL_MS })
  ).toString("base64url")
  const sig = crypto.createHmac("sha256", signingKey()).update(payload).digest("hex")
  return `${payload}.${sig}`
}

// V-44 FIX: Generate state for login flow (replaces bare no-state OAuth entrypoint)
export function signLoginState(): string {
  const jti = crypto.randomBytes(16).toString("hex")
  const payload = Buffer.from(
    JSON.stringify({ kind: "login", jti, exp: Date.now() + STATE_TTL_MS })
  ).toString("base64url")
  const sig = crypto.createHmac("sha256", signingKey()).update(payload).digest("hex")
  return `${payload}.${sig}`
}

/**
 * V-34 FIX: Verify OAuth state with nonce consumption (single-use enforcement).
 * Returns null on: invalid signature, expired, malformed, or REPLAY (already consumed).
 */
export async function verifyOAuthState(state: string): Promise<OAuthState | null> {
  const parts = state.split(".")
  if (parts.length !== 2) return null
  const [payload, sig] = parts
  if (!payload || !sig) return null

  const expected = crypto.createHmac("sha256", signingKey()).update(payload).digest()
  const received = Buffer.from(sig, "hex")
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    return null
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as OAuthState
    if (!parsed.kind || !parsed.jti) return null
    if (parsed.kind === "cuenta_correo") {
      if (!parsed.email || !Number.isInteger(parsed.negocioId)) return null
    }
    if (typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null

    // V-34: Consume nonce — reject if already used (replay protection)
    const consumed = await consumeNonce(parsed.jti)
    if (!consumed) return null

    return parsed
  } catch {
    return null
  }
}

/**
 * V-45 FIX: Cleanup expired nonces (called periodically).
 */
export async function cleanupExpiredNonces(): Promise<void> {
  await dbExec("DELETE FROM oauth_nonces WHERE expires_at < datetime('now')").catch(() => {})
}
