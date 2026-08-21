import { NextResponse } from "next/server"
import { getCurrentUser, verifyPassword, hashPassword } from "@/lib/auth"
import { dbGet, dbRun } from "@/db/client"

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Contrasena actual y nueva contrasena son requeridas" }, { status: 400 })
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "La nueva contrasena debe tener al menos 8 caracteres" }, { status: 400 })
    }

    const usuario = await dbGet<{ password_hash: string }>("SELECT password_hash FROM usuarios WHERE id = ?", { "1": user.id })

    const validPassword = await verifyPassword(currentPassword, usuario!.password_hash)
    if (!validPassword) {
      return NextResponse.json({ error: "La contrasena actual es incorrecta" }, { status: 401 })
    }

    const newHash = await hashPassword(newPassword)
    await dbRun("UPDATE usuarios SET password_hash = ?, updated_at = datetime('now') WHERE id = ?", { "1": newHash, "2": user.id })

    await dbRun("DELETE FROM sesiones WHERE usuario_id = ?", { "1": user.id })

    const response = NextResponse.json({ success: true })
    response.cookies.set("session_id", "", { path: "/", maxAge: 0 })
    return response
  } catch (error) {
    console.error("Error changing password:", error)
    return NextResponse.json({ error: "Error al cambiar contrasena" }, { status: 500 })
  }
}
