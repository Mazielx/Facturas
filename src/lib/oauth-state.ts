import crypto from "crypto"

const STATE_TTL_MS = 15 * 60 * 1000

function signingKey(): Buffer {
  // V-16 FIX: Fail hard if no secret is configured. Never fall back to hardcoded string.
  const secret = process.env.OAUTH_STATE_SECRET
  if (!secret) {
    throw new Error("OAUTH_STATE_SECRET env var is required. Generate with: openssl rand -hex 32")
  }
  return crypto.createHash("sha256").update(secret).digest()
}

export interface OAuthState {
  kind: "cuenta_correo"
  email: string
  negocioId: number
  exp: number
}

export function signCuentaCorreoState(email: string, negocioId: number): string {
  const payload = Buffer.from(
    JSON.stringify({ kind: "cuenta_correo", email, negocioId, exp: Date.now() + STATE_TTL_MS })
  ).toString("base64url")
  const sig = crypto.createHmac("sha256", signingKey()).update(payload).digest("hex")
  return `${payload}.${sig}`
}

export function verifyOAuthState(state: string): OAuthState | null {
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
    if (parsed.kind !== "cuenta_correo" || !parsed.email || !Number.isInteger(parsed.negocioId)) {
      return null
    }
    if (typeof parsed.exp !== "number" || parsed.exp < Date.now()) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}
