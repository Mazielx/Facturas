import { NextRequest, NextResponse } from "next/server"
import { verifyPassword, createSession, getUsuarioByEmail, createUsuario as authCreateUsuario } from "@/lib/auth"
import { getAllNegocios, createNegocio } from "@/db"
import {
  checkRateLimit, RATE_LIMITS, getRateLimitHeaders,
  recordFailedLogin, clearFailedLogins, isAccountLocked,
  createSessionFingerprint, extractClientIp, extractUserAgent,
  logSecurityEvent, secureErrorResponse,
} from "@/lib/security"

export async function POST(req: NextRequest) {
  try {
    const ip = extractClientIp(req)
    const userAgent = extractUserAgent(req)
    const fingerprint = createSessionFingerprint(ip, userAgent)

    // Rate limit
    const rl = checkRateLimit(ip, RATE_LIMITS.login)
    if (!rl.allowed) {
      await logSecurityEvent("rate_limited", { ip, userAgent, metadata: { endpoint: "login" } })
      return NextResponse.json(
        { error: "Demasiados intentos. Intenta de nuevo mas tarde." },
        { status: 429, headers: getRateLimitHeaders(rl) }
      )
    }

    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contrasena son requeridos" },
        { status: 400 }
      )
    }

    // Check account lockout
    const lockout = isAccountLocked(email)
    if (lockout.locked) {
      await logSecurityEvent("login_locked", { email, ip, userAgent })
      return NextResponse.json(
        { error: `Cuenta bloqueada temporalmente. Intenta en ${Math.ceil(lockout.remainingMs / 60000)} minutos.` },
        { status: 423 }
      )
    }

    let usuario = await getUsuarioByEmail(email)

    if (!usuario) {
      const adminEmail = process.env.ADMIN_EMAIL
      const adminPassword = process.env.ADMIN_PASSWORD
      const adminNombre = process.env.ADMIN_NOMBRE || "Admin"

      if (email === adminEmail && password === adminPassword) {
        const allNegocios = await getAllNegocios()
        let negocioId: number
        if (allNegocios.length > 0) {
          negocioId = allNegocios[0].id
        } else {
          const neg = await createNegocio("Mi Empresa", "mi-empresa", email)
          negocioId = neg.id
        }
        usuario = await authCreateUsuario(email, password, adminNombre, "admin", negocioId) as any
        console.log(`[login] Auto-created admin user: ${email}`)
      } else {
        recordFailedLogin(email)
        await logSecurityEvent("login_failed", { email, ip, userAgent, metadata: { reason: "user_not_found" } })
        return NextResponse.json(
          { error: "Credenciales invalidas" },
          { status: 401, headers: getRateLimitHeaders(rl) }
        )
      }
    }

    if (!usuario) {
      return NextResponse.json(
        { error: "Credenciales invalidas" },
        { status: 401 }
      )
    }

    if (!usuario.activo) {
      await logSecurityEvent("login_failed", { userId: usuario.id, email, ip, userAgent, metadata: { reason: "account_disabled" } })
      return NextResponse.json(
        { error: "Usuario desactivado" },
        { status: 401 }
      )
    }

    const validPassword = await verifyPassword(password, usuario.password_hash)

    if (!validPassword) {
      const lockResult = recordFailedLogin(email)
      await logSecurityEvent("login_failed", { userId: usuario.id, email, ip, userAgent, metadata: { reason: "wrong_password" } })
      if (lockResult.locked) {
        await logSecurityEvent("account_locked", { userId: usuario.id, email, ip, userAgent })
      }
      return NextResponse.json(
        { error: "Credenciales invalidas" },
        { status: 401, headers: getRateLimitHeaders(rl) }
      )
    }

    // Success — clear lockout, create session with fingerprint
    clearFailedLogins(email)
    const session = await createSession(usuario.id, fingerprint)

    await logSecurityEvent("login_success", { userId: usuario.id, email, ip, userAgent })

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

    const maxAge = 30 * 24 * 60 * 60
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
