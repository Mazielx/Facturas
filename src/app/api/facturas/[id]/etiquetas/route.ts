import { NextRequest, NextResponse } from "next/server"
import { requireActiveTenant } from "@/lib/tenant"
import { dbGet, dbAll, dbRun } from "@/db/client"
import { ensureSchema } from "@/db"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireActiveTenant()
    await ensureSchema()
    const { id } = await params
    const facturaId = Number(id)

    const etiquetas = await dbAll(
      `SELECT e.* FROM etiquetas e
       JOIN factura_etiqueta fe ON fe.etiqueta_id = e.id
       WHERE fe.factura_id = ?
       ORDER BY e.nombre`,
      { "1": facturaId }
    )

    return NextResponse.json(etiquetas)
  } catch (error) {
    console.error("Error fetching factura etiquetas:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireActiveTenant()
    await ensureSchema()
    const { id } = await params
    const facturaId = Number(id)
    const body = await req.json()
    const { etiqueta_id } = body

    if (!etiqueta_id) {
      return NextResponse.json({ error: "etiqueta_id requerido" }, { status: 400 })
    }

    const existing = await dbGet(
      "SELECT 1 FROM factura_etiqueta WHERE factura_id = ? AND etiqueta_id = ?",
      { "1": facturaId, "2": etiqueta_id }
    )

    if (existing) {
      return NextResponse.json({ error: "La etiqueta ya esta asignada" }, { status: 409 })
    }

    await dbRun(
      "INSERT INTO factura_etiqueta (factura_id, etiqueta_id) VALUES (?, ?)",
      { "1": facturaId, "2": etiqueta_id }
    )

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error("Error adding etiqueta to factura:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireActiveTenant()
    await ensureSchema()
    const { id } = await params
    const facturaId = Number(id)
    const { searchParams } = new URL(req.url)
    const etiquetaId = searchParams.get("etiqueta_id")

    if (!etiquetaId) {
      return NextResponse.json({ error: "etiqueta_id requerido" }, { status: 400 })
    }

    await dbRun(
      "DELETE FROM factura_etiqueta WHERE factura_id = ? AND etiqueta_id = ?",
      { "1": facturaId, "2": Number(etiquetaId) }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing etiqueta from factura:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
