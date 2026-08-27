import { NextRequest, NextResponse } from "next/server"
import { verifyPassword, createSession, getUsuarioByEmail } from "@/lib/auth"
import { getAllNegocios } from "@/db"
import {
  checkRateLimit, RATE_LIMITS, getRateLimitHeaders,
  recordFailedLogin, clearFailedLogins, isAccountLocked,
  createSessionFingerprint, extractClientIp, extractUserAgent,
  logSecurityEvent, secureErrorResponse,
} from "@/lib/security"

// V-39 FIX: Unified error message for all auth failures (prevents account enumeration)
const AUTH_ERROR = "Credenciales invalidas"

export async function POST(req: NextRequest) {
  try {
    const ip = extractClientIp(req)
    const userAgent = extractUserAgent(req)
    const fingerprint = createSessionFingerprint(ip, userAgent)

    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      // V-39 FIX: Same error for missing fields (prevents field-level enumeration)
      return NextResponse.json(
        { error: AUTH_ERROR },
        { status: 401 }
      )
    }

    // V-39 FIX: Normalize email to lowercase + trim (prevents case-based enumeration)
    const normalizedEmail = email.toLowerCase().trim()

    // Rate limit by IP + email combination (prevents targeted lockout DoS)
    const rl = await checkRateLimit(`${ip}:${normalizedEmail}`, RATE_LIMITS.login)
    if (!rl.allowed) {
      await logSecurityEvent("rate_limited", { ip, userAgent, metadata: { endpoint: "login" } })
      return NextResponse.json(
        { error: "Demasiados intentos. Intenta de nuevo mas tarde." },
        { status: 429, headers: getRateLimitHeaders(rl) }
      )
    }

    // Check account lockout
    const lockout = await isAccountLocked(normalizedEmail)
    if (lockout.locked) {
      await logSecurityEvent("login_locked", { email: normalizedEmail, ip, userAgent })
      // V-39 FIX: Don't reveal lockout status to unauthenticated users (enumeration vector)
      return NextResponse.json(
        { error: AUTH_ERROR },
        { status: 401 }
      )
    }

    const usuario = await getUsuarioByEmail(normalizedEmail)

    if (!usuario) {
      // V-14 FIX: Removed admin auto-provisioning from env vars.
      await recordFailedLogin(normalizedEmail)
      await logSecurityEvent("login_failed", { email: normalizedEmail, ip, userAgent, metadata: { reason: "user_not_found" } })
      // V-39 FIX: Same error for user not found (prevents enumeration)
      return NextResponse.json(
        { error: AUTH_ERROR },
        { status: 401, headers: getRateLimitHeaders(rl) }
      )
    }

    // V-39 FIX: Removed dead duplicate `if (!usuario)` block

    if (!usuario.activo) {
      // V-39 FIX: Same error for disabled accounts (prevents enumeration)
      await logSecurityEvent("login_failed", { userId: usuario.id, email: normalizedEmail, ip, userAgent, metadata: { reason: "account_disabled" } })
      return NextResponse.json(
        { error: AUTH_ERROR },
        { status: 401 }
      )
    }

    const validPassword = await verifyPassword(password, usuario.password_hash)

    if (!validPassword) {
      const lockResult = await recordFailedLogin(normalizedEmail)
      await logSecurityEvent("login_failed", { userId: usuario.id, email: normalizedEmail, ip, userAgent, metadata: { reason: "wrong_password" } })
      if (lockResult.locked) {
        await logSecurityEvent("account_locked", { userId: usuario.id, email: normalizedEmail, ip, userAgent })
      }
      return NextResponse.json(
        { error: AUTH_ERROR },
        { status: 401, headers: getRateLimitHeaders(rl) }
      )
    }

    // Success — clear lockout, create session with fingerprint
    await clearFailedLogins(normalizedEmail)
    const session = await createSession(usuario.id, fingerprint)

    await logSecurityEvent("login_success", { userId: usuario.id, email: normalizedEmail, ip, userAgent })

    let negocioSlug: string | null = null
    const allNegocios = await getAllNegocios()
    if (allNegocios.length === 1) {
      negocioSlug = allNegocios[0].slug
    }

    const response = NextResponse.json({
      success: true,
      redirectTo: "/dashboard",
      negocioSlug,
      user: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        role: usuario.role,
        negocio_id: usuario.negocio_id,
      },
    })

    const maxAge = 7 * 24 * 60 * 60
    response.cookies.set("session_id", session.id, {
      path: "/",
      maxAge,
      sameSite: "lax",
      secure: true,
      httpOnly: true,
    })

    if (negocioSlug) {
      response.cookies.set("negocio_slug", negocioSlug, {
        path: "/",
        maxAge: 365 * 24 * 60 * 60,
        sameSite: "lax",
        secure: true,
        httpOnly: true,
      })
    }

    return response
  } catch (error) {
    const { message } = secureErrorResponse(error, "login")
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
