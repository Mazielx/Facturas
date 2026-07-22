import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getMainDb } from "@/db"

const EMAIL_COOLDOWN_MONTHS = 6

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const body = await request.json()
    const { nombre, email, telefono } = body

    if (!nombre) {
      return NextResponse.json({ error: "Nombre es requerido" }, { status: 400 })
    }

    const db = getMainDb()
    const current = db.prepare("SELECT email, email_changed_at FROM usuarios WHERE id = ?").get(user.id) as { email: string; email_changed_at: string | null }

    let newEmail = current.email
    let emailChanged = false

    if (email && email !== current.email) {
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

      const existing = db.prepare("SELECT id FROM usuarios WHERE email = ? AND id != ?").get(email, user.id)
      if (existing) {
        return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 })
      }

      newEmail = email
      emailChanged = true
    }

    if (emailChanged) {
      db.prepare("UPDATE usuarios SET nombre = ?, email = ?, telefono = ?, email_changed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(nombre, newEmail, telefono || null, user.id)
    } else {
      db.prepare("UPDATE usuarios SET nombre = ?, telefono = ?, updated_at = datetime('now') WHERE id = ?").run(nombre, telefono || null, user.id)
    }

    const updated = db.prepare("SELECT id, email, nombre, role, profile_photo_url, email_changed_at, telefono FROM usuarios WHERE id = ?").get(user.id)

    return NextResponse.json({ user: updated })
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json({ error: "Error al actualizar perfil" }, { status: 500 })
  }
}
