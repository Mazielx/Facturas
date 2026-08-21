import { NextResponse } from "next/server"
import { getCurrentUser, verifyPassword, hashPassword, deleteAllUserSessions } from "@/lib/auth"
import { dbGet, dbRun } from "@/db/client"
import {
  checkRateLimit, RATE_LIMITS, getRateLimitHeaders,
  validatePasswordStrength, checkPasswordBreach,
  extractClientIp, extractUserAgent,
  logSecurityEvent, secureErrorResponse,
} from "@/lib/security"

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const ip = extractClientIp(request)
    const userAgent = extractUserAgent(request)

    // Rate limit
    const rl = checkRateLimit(`${user.id}`, RATE_LIMITS.passwordChange)
    if (!rl.allowed) {
      await logSecurityEvent("rate_limited", { userId: user.id, ip, userAgent, metadata: { endpoint: "password_change" } })
      return NextResponse.json(
        { error: "Demasiados cambios de contrasena. Intenta de nuevo mas tarde." },
        { status: 429, headers: getRateLimitHeaders(rl) }
      )
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Contrasena actual y nueva contrasena son requeridas" }, { status: 400 })
    }

    // Password strength validation
    const strength = validatePasswordStrength(newPassword)
    if (!strength.valid) {
      return NextResponse.json(
        { error: "La nueva contrasena no cumple requisitos de seguridad", feedback: strength.feedback },
        { status: 400 }
      )
    }

    // Check if new password is breached
    const breach = await checkPasswordBreach(newPassword)
    if (breach.breached) {
      await logSecurityEvent("password_changed", { userId: user.id, ip, userAgent, metadata: { result: "breached_password" } })
      return NextResponse.json(
        { error: "Esta contrasena ha sido comprometida en una filtracion de datos. Elige una contrasena diferente." },
        { status: 400 }
      )
    }

    const usuario = await dbGet<{ password_hash: string }>("SELECT password_hash FROM usuarios WHERE id = ?", { "1": user.id })

    const validPassword = await verifyPassword(currentPassword, usuario!.password_hash)
    if (!validPassword) {
      await logSecurityEvent("login_failed", { userId: user.id, ip, userAgent, metadata: { reason: "wrong_password_on_change" } })
      return NextResponse.json({ error: "La contrasena actual es incorrecta" }, { status: 401 })
    }

    const newHash = await hashPassword(newPassword)
    await dbRun("UPDATE usuarios SET password_hash = ?, updated_at = datetime('now') WHERE id = ?", { "1": newHash, "2": user.id })

    // Invalidate ALL sessions except current (force re-login everywhere else)
    const currentSession = user.session?.id
    await deleteAllUserSessions(user.id, currentSession)

    await logSecurityEvent("password_changed", { userId: user.id, ip, userAgent })

    const response = NextResponse.json({ success: true })
    return response
  } catch (error) {
    const { message } = secureErrorResponse(error, "password_change")
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
