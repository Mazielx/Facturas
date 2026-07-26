import { NextRequest, NextResponse } from "next/server"
import { requireActiveTenant } from "@/lib/tenant"
import { dbGet, dbAll, dbRun } from "@/db/client"
import { ensureSchema } from "@/db"

export async function GET() {
  try {
    const tenant = await requireActiveTenant()
    await ensureSchema()
    const etiquetas = await dbAll(
      "SELECT * FROM etiquetas WHERE negocio_slug = ? ORDER BY nombre",
      { "1": tenant.slug }
    )
    return NextResponse.json(etiquetas)
  } catch (error) {
    console.error("Error fetching etiquetas:", error)
    if (error instanceof Error && error.message.includes("No hay negocio")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await requireActiveTenant()
    await ensureSchema()
    const body = await req.json()
    const { nombre, color } = body

    if (!nombre) {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })
    }

    const existing = await dbGet(
      "SELECT id FROM etiquetas WHERE nombre = ? AND negocio_slug = ?",
      { "1": nombre, "2": tenant.slug }
    )
    if (existing) {
      return NextResponse.json({ error: "La etiqueta ya existe" }, { status: 409 })
    }

    const result = await dbRun(
      "INSERT INTO etiquetas (nombre, color, negocio_slug) VALUES (?, ?, ?)",
      { "1": nombre, "2": color || "#6b7280", "3": tenant.slug }
    )

    return NextResponse.json({
      id: result.lastInsertRowid,
      nombre,
      color: color || "#6b7280",
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating etiqueta:", error)
    if (error instanceof Error && error.message.includes("No hay negocio")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const tenant = await requireActiveTenant()
    await ensureSchema()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 })
    }

    await dbRun(
      "DELETE FROM etiquetas WHERE id = ? AND negocio_slug = ?",
      { "1": Number(id), "2": tenant.slug }
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting etiqueta:", error)
    if (error instanceof Error && error.message.includes("No hay negocio")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
