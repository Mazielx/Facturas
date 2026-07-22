import { NextResponse } from "next/server"
import { requireActiveTenant } from "@/lib/tenant"

const VALID_ESTADOS = ["pendiente", "pagada", "cancelada"]

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { db } = await requireActiveTenant()

    const factura = db.prepare("SELECT * FROM facturas WHERE id = ?").get(id)

    if (!factura) {
      return NextResponse.json(
        { error: "Factura no encontrada" },
        { status: 404 }
      )
    }

    const lineas = db
      .prepare("SELECT * FROM lineas_factura WHERE factura_id = ? ORDER BY numero_linea")
      .all(id)

    const adjuntos = db
      .prepare("SELECT id, factura_id, filename, mime_type, size, attachment_id, content_hash FROM adjuntos WHERE factura_id = ?")
      .all(id)

    return NextResponse.json({ factura, lineas, adjuntos })
  } catch (error) {
    console.error("Error fetching factura:", error)
    if (error instanceof Error && error.message === "No hay negocio seleccionado") {
      return NextResponse.json({ error: "No hay negocio seleccionado" }, { status: 401 })
    }
    return NextResponse.json(
      { error: "Error al obtener la factura" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { db } = await requireActiveTenant()
    const body = await request.json()

    if (body.estado && !VALID_ESTADOS.includes(body.estado)) {
      return NextResponse.json(
        { error: `Estado invalido. Valores permitidos: ${VALID_ESTADOS.join(", ")}` },
        { status: 400 }
      )
    }

    const factura = db.prepare("SELECT id FROM facturas WHERE id = ?").get(id)
    if (!factura) {
      return NextResponse.json(
        { error: "Factura no encontrada" },
        { status: 404 }
      )
    }

    const updates: string[] = []
    const values: (string | number)[] = []

    if (body.estado) {
      updates.push("estado = ?")
      values.push(body.estado)
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No hay campos para actualizar" },
        { status: 400 }
      )
    }

    updates.push("updated_at = datetime('now')")
    values.push(id)

    db.prepare(`UPDATE facturas SET ${updates.join(", ")} WHERE id = ?`).run(...values)

    const updated = db.prepare("SELECT * FROM facturas WHERE id = ?").get(id)
    return NextResponse.json({ factura: updated })
  } catch (error) {
    console.error("Error updating factura:", error)
    if (error instanceof Error && error.message === "No hay negocio seleccionado") {
      return NextResponse.json({ error: "No hay negocio seleccionado" }, { status: 401 })
    }
    return NextResponse.json(
      { error: "Error al actualizar la factura" },
      { status: 500 }
    )
  }
}
