import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/tenant"
import { getAllUsuarios, createUsuario as dbCreateUsuario, updateUsuario, deleteUsuario, getUsuarioByEmail, getAllNegocios } from "@/db"
import { hashPassword } from "@/lib/auth"
import { checkRateLimit, RATE_LIMITS, getRateLimitHeaders, sanitizeEmail, sanitizeString, validatePasswordStrength, extractClientIp, extractUserAgent, logSecurityEvent, safeLogError } from "@/lib/security"

export async function GET(request: Request) {
  try {
    await requireAdmin(request)
    const usuarios = await getAllUsuarios()
    return NextResponse.json(usuarios.map(({ password_hash, ...u }) => u))
  } catch (error) {
    if (error instanceof Error && error.message === "No autenticado") {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "No autorizado") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }
    safeLogError("usuarios_list", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    const ip = extractClientIp(req)
    const userAgent = extractUserAgent(req)
    const body = await req.json()
    const { email, password, nombre, role, negocio_id } = body

    if (!email || !password || !nombre) {
      return NextResponse.json({ error: "Email, contrasena y nombre son requeridos" }, { status: 400 })
    }

    const cleanEmail = sanitizeEmail(email)
    if (!cleanEmail) {
      return NextResponse.json({ error: "Email invalido" }, { status: 400 })
    }

    const cleanNombre = sanitizeString(nombre, 100)
    if (cleanNombre.length < 1) {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })
    }

    if (role !== undefined && role !== "admin" && role !== "negocio") {
      return NextResponse.json({ error: "Rol invalido. Debe ser 'admin' o 'negocio'" }, { status: 400 })
    }

    const strength = validatePasswordStrength(password)
    if (!strength.valid) {
      return NextResponse.json({ error: "Contrasena debil", feedback: strength.feedback }, { status: 400 })
    }

    const existingUser = await getUsuarioByEmail(cleanEmail)
    if (existingUser) {
      return NextResponse.json({ error: "El email ya esta registrado" }, { status: 409 })
    }

    // Validate negocio_id exists if provided
    if (negocio_id) {
      const { getNegocioById } = await import("@/db")
      const negocio = await getNegocioById(negocio_id)
      if (!negocio) {
        return NextResponse.json({ error: "Negocio no encontrado" }, { status: 400 })
      }
    }

    const passwordHash = await hashPassword(password)
    const nuevoUsuario = await dbCreateUsuario(cleanEmail, passwordHash, cleanNombre, role || "negocio", negocio_id)

    await logSecurityEvent("admin_action", { userId: admin.id, ip, userAgent, metadata: { action: "create_user", targetEmail: cleanEmail } })

    const { password_hash, ...safe } = nuevoUsuario as any
    return NextResponse.json(safe, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === "No autenticado") {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "No autorizado") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }
    safeLogError("usuarios_create", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    const ip = extractClientIp(req)
    const userAgent = extractUserAgent(req)

    // Rate limit admin mutations
    const rl = checkRateLimit(`admin:${admin.id}`, RATE_LIMITS.admin)
    if (!rl.allowed) {
      await logSecurityEvent("rate_limited", { userId: admin.id, ip, userAgent, metadata: { endpoint: "admin_update_user" } })
      return NextResponse.json(
        { error: "Demasiadas peticiones. Intenta de nuevo mas tarde." },
        { status: 429, headers: getRateLimitHeaders(rl) }
      )
    }

    const body = await req.json()
    const { id, email, nombre, role, negocio_id, activo } = body

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 })
    }

    if (role !== undefined && role !== "admin" && role !== "negocio") {
      return NextResponse.json({ error: "Rol invalido. Debe ser 'admin' o 'negocio'" }, { status: 400 })
    }

    if (activo !== undefined && activo !== 0 && activo !== 1) {
      return NextResponse.json({ error: "'activo' debe ser 0 o 1" }, { status: 400 })
    }

    // Validate negocio_id exists if provided
    if (negocio_id) {
      const { getNegocioById } = await import("@/db")
      const negocio = await getNegocioById(negocio_id)
      if (!negocio) {
        return NextResponse.json({ error: "Negocio no encontrado" }, { status: 400 })
      }
    }

    // Prevent admin from deactivating themselves
    if (admin.id === id && activo === 0) {
      return NextResponse.json({ error: "No puedes desactivar tu propia cuenta" }, { status: 400 })
    }

    // Prevent admin role downgrade of self
    if (admin.id === id && role && role !== "admin") {
      return NextResponse.json({ error: "No puedes cambiar tu propio rol" }, { status: 400 })
    }

    if (email) {
      const cleanEmail = sanitizeEmail(email)
      if (!cleanEmail) {
        return NextResponse.json({ error: "Email invalido" }, { status: 400 })
      }
      const existing = await getUsuarioByEmail(cleanEmail)
      if (existing && existing.id !== id) {
        return NextResponse.json({ error: "El email ya esta registrado" }, { status: 409 })
      }
    }

    // Validate that at least one admin always remains
    if (role === "negocio" || activo === 0) {
      const allUsers = await getAllUsuarios()
      const admins = allUsers.filter(u => u.role === "admin" && u.activo === 1 && u.id !== id)
      if (admins.length === 0) {
        return NextResponse.json({ error: "Debe haber al menos un administrador activo" }, { status: 400 })
      }
    }

    await updateUsuario(id, { email, nombre, role, negocio_id, activo })

    await logSecurityEvent("admin_action", { userId: admin.id, ip, userAgent, metadata: { action: "update_user", targetId: id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === "No autenticado") {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "No autorizado") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }
    safeLogError("usuarios_update", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    const ip = extractClientIp(req)
    const userAgent = extractUserAgent(req)
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 })
    }

    const targetId = Number(id)

    // Prevent admin from deleting themselves
    if (admin.id === targetId) {
      return NextResponse.json({ error: "No puedes eliminar tu propia cuenta" }, { status: 400 })
    }

    // Validate that at least one admin always remains
    const allUsers = await getAllUsuarios()
    const target = allUsers.find(u => u.id === targetId)
    if (target?.role === "admin") {
      const otherAdmins = allUsers.filter(u => u.role === "admin" && u.activo === 1 && u.id !== targetId)
      if (otherAdmins.length === 0) {
        return NextResponse.json({ error: "No se puede eliminar el ultimo administrador" }, { status: 400 })
      }
    }

    await deleteUsuario(targetId)

    await logSecurityEvent("admin_action", { userId: admin.id, ip, userAgent, metadata: { action: "delete_user", targetId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === "No autenticado") {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "No autorizado") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }
    safeLogError("usuarios_delete", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
