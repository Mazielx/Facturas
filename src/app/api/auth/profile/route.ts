import { NextResponse } from "next/server"
import { getCurrentUserWithFingerprint, verifyPassword, deleteAllUserSessions } from "@/lib/auth"
import { sanitizeEmail, sanitizeString, safeLogError } from "@/lib/security"
import { dbGet, dbRun } from "@/db/client"

const EMAIL_COOLDOWN_MONTHS = 6

export async function PUT(request: Request) {
  try {
    // V-27 FIX: Verify session fingerprint (IP + UA) on state-changing request
    const user = await getCurrentUserWithFingerprint(request)
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const body = await request.json()
    // V-30 FIX: Sanitize inputs before use
    const nombre = typeof body.nombre === "string" ? sanitizeString(body.nombre, 100) : ""
    const email = typeof body.email === "string" ? body.email : null
    const telefono = body.telefono ? sanitizeString(String(body.telefono), 20) : null
    const current_password = body.current_password

    if (!nombre) {
      return NextResponse.json({ error: "Nombre es requerido" }, { status: 400 })
    }

    const current = await dbGet<{ email: string; email_changed_at: string | null; password_hash: string }>("SELECT email, email_changed_at, password_hash FROM usuarios WHERE id = ?", { "1": user.id })

    if (!current) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    let newEmail = current.email
    let emailChanged = false

    // V-30 FIX: Sanitize/validate the requested email before using it
    let sanitizedNewEmail: string | null = null
    if (email) {
      const clean = sanitizeEmail(email)
      if (!clean) {
        return NextResponse.json({ error: "Email invalido" }, { status: 400 })
      }
      sanitizedNewEmail = clean
    }

    if (sanitizedNewEmail && sanitizedNewEmail !== current.email) {
      // V-31 FIX: Require current password for email change to prevent account takeover
      if (!current_password) {
        return NextResponse.json(
          { error: "Debes ingresar tu contrasena actual para cambiar el email" },
          { status: 400 }
        )
      }
      const validPassword = await verifyPassword(current_password, current.password_hash)
      if (!validPassword) {
        return NextResponse.json(
          { error: "La contrasena actual es incorrecta" },
          { status: 401 }
        )
      }

      if (current.email_changed_at) {
        const changedAt = new Date(current.email_changed_at)
        const now = new Date()
        const monthsDiff = (now.getFullYear() - changedAt.getFullYear()) * 12 + (now.getMonth() - changedAt.getMonth())
        if (monthsDiff < EMAIL_COOLDOWN_MONTHS) {
          const monthsLeft = EMAIL_COOLDOWN_MONTHS - monthsDiff
          return NextResponse.json(
            { error: `Solo puedes cambiar el email una vez cada 6 meses. Intenta de nuevo en ${monthsLeft} mes(es)` },
            { status: 400 }
          )
        }
      }

      const existing = await dbGet<{ id: number }>("SELECT id FROM usuarios WHERE email = ? AND id != ?", { "1": sanitizedNewEmail, "2": user.id })
      if (existing) {
        return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 })
      }

      newEmail = sanitizedNewEmail
      emailChanged = true
    }

    if (emailChanged) {
      await dbRun("UPDATE usuarios SET nombre = ?, email = ?, telefono = ?, email_changed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?", { "1": nombre, "2": newEmail, "3": telefono || null, "4": user.id })
      // V-31 FIX: Invalidate all OTHER sessions after email change
      await deleteAllUserSessions(user.id, user.session?.id)
    } else {
      await dbRun("UPDATE usuarios SET nombre = ?, telefono = ?, updated_at = datetime('now') WHERE id = ?", { "1": nombre, "2": telefono || null, "3": user.id })
    }

    const updated = await dbGet("SELECT id, email, nombre, role, profile_photo_url, email_changed_at, telefono FROM usuarios WHERE id = ?", { "1": user.id })

    return NextResponse.json({ user: updated })
  } catch (error) {
    safeLogError("profile_update", error)
    return NextResponse.json({ error: "Error al actualizar perfil" }, { status: 500 })
  }
}
