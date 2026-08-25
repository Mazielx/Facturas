import { NextRequest, NextResponse } from "next/server"
import { createUsuario, getUsuarioByEmail, createSession } from "@/lib/auth"
import { getAllNegocios } from "@/db"
import {
  checkRateLimit, RATE_LIMITS, getRateLimitHeaders,
  validatePasswordStrength, checkPasswordBreach,
  createSessionFingerprint, extractClientIp, extractUserAgent,
  sanitizeEmail, sanitizeString,
  logSecurityEvent, secureErrorResponse,
} from "@/lib/security"

export async function POST(req: NextRequest) {
  try {
    const ip = extractClientIp(req)
    const userAgent = extractUserAgent(req)
    const fingerprint = createSessionFingerprint(ip, userAgent)

    const body = await req.json()
    const { email, password, nombre } = body

    if (!email || !password || !nombre) {
      return NextResponse.json(
        { error: "Email, contrasena y nombre son requeridos" },
        { status: 400 }
      )
    }

    // Sanitize inputs
    const cleanEmail = sanitizeEmail(email)
    if (!cleanEmail) {
      return NextResponse.json({ error: "Email invalido" }, { status: 400 })
    }

    const cleanNombre = sanitizeString(nombre, 100)
    if (cleanNombre.length < 1) {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })
    }

    // Rate limit by IP + email
    const rl = checkRateLimit(`${ip}:${cleanEmail}`, RATE_LIMITS.register)
    if (!rl.allowed) {
      await logSecurityEvent("rate_limited", { ip, userAgent, metadata: { endpoint: "register" } })
      return NextResponse.json(
        { error: "Demasiados registros. Intenta de nuevo mas tarde." },
        { status: 429, headers: getRateLimitHeaders(rl) }
      )
    }

    // Password strength validation
    const strength = validatePasswordStrength(password)
    if (!strength.valid) {
      return NextResponse.json(
        { error: "Contrasena no cumple requisitos de seguridad", feedback: strength.feedback },
        { status: 400 }
      )
    }

    // Password breach check (HIBP)
    const breach = await checkPasswordBreach(password)
    if (breach.breached) {
      return NextResponse.json(
        { error: "Esta contrasena ha sido comprometida en una filtracion de datos. Elige una contrasena diferente." },
        { status: 400 }
      )
    }

    const existing = await getUsuarioByEmail(cleanEmail)
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con ese email" },
        { status: 409 }
      )
    }

    const allNegocios = await getAllNegocios()

    // V-13 FIX: Never auto-assign negocio on registration.
    // Only the first user (creator) should be auto-assigned during bootstrap.
    // Subsequent registrations require explicit invitation/assignment.
    const usuario = await createUsuario(cleanEmail, password, cleanNombre, "negocio", undefined)
    const session = await createSession(usuario.id, fingerprint)

    await logSecurityEvent("register", { userId: usuario.id, email: cleanEmail, ip, userAgent })
    await logSecurityEvent("session_created", { userId: usuario.id, ip, userAgent })

    const response = NextResponse.json({
      success: true,
      redirectTo: allNegocios.length === 0 ? "/onboarding" : "/",
      negocioSlug: null,
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

    return response
  } catch (error) {
    const { message } = secureErrorResponse(error, "register")
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
