import { NextResponse } from "next/server"
import { requireActiveTenant } from "@/lib/tenant"
import { dbGet, dbAll, dbRun } from "@/db/client"
import { ensureSchema } from "@/db"

const VALID_ESTADOS = ["pendiente", "pagada", "cancelada"]

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tenant = await requireActiveTenant()
    await ensureSchema()

    const factura = await dbGet(
      "SELECT * FROM facturas WHERE id = ? AND negocio_slug = ?",
      { "1": id, "2": tenant.slug }
    )

    if (!factura) {
      return NextResponse.json(
        { error: "Factura no encontrada" },
        { status: 404 }
      )
    }

    const lineas = await dbAll(
      "SELECT * FROM lineas_factura WHERE factura_id = ? AND negocio_slug = ? ORDER BY numero_linea",
      { "1": id, "2": tenant.slug }
    )

    const adjuntos = await dbAll(
      "SELECT id, factura_id, filename, mime_type, size, attachment_id, content_hash FROM adjuntos WHERE factura_id = ? AND negocio_slug = ?",
      { "1": id, "2": tenant.slug }
    )

    return NextResponse.json({ factura, lineas, adjuntos })
  } catch (error) {
    console.error("Error fetching factura:", error)
    if (error instanceof Error && error.message.includes("No hay negocio")) {
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
    const tenant = await requireActiveTenant()
    await ensureSchema()
    const body = await request.json()

    if (body.estado && !VALID_ESTADOS.includes(body.estado)) {
      return NextResponse.json(
        { error: `Estado invalido. Valores permitidos: ${VALID_ESTADOS.join(", ")}` },
        { status: 400 }
      )
    }

    const factura = await dbGet(
      "SELECT id FROM facturas WHERE id = ? AND negocio_slug = ?",
      { "1": id, "2": tenant.slug }
    )
    if (!factura) {
      return NextResponse.json(
        { error: "Factura no encontrada" },
        { status: 404 }
      )
    }

    const updates: string[] = []
    const args: Record<string, unknown> = {}
    let idx = 1

    if (body.estado) {
      updates.push("estado = ?")
      args[String(idx++)] = body.estado
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No hay campos para actualizar" },
        { status: 400 }
      )
    }

    updates.push("updated_at = datetime('now')")
    args[String(idx++)] = id
    args[String(idx++)] = tenant.slug

    await dbRun(`UPDATE facturas SET ${updates.join(", ")} WHERE id = ? AND negocio_slug = ?`, args)

    const updated = await dbGet(
      "SELECT * FROM facturas WHERE id = ? AND negocio_slug = ?",
      { "1": id, "2": tenant.slug }
    )
    return NextResponse.json({ factura: updated })
  } catch (error) {
    console.error("Error updating factura:", error)
    if (error instanceof Error && error.message.includes("No hay negocio")) {
      return NextResponse.json({ error: "No hay negocio seleccionado" }, { status: 401 })
    }
    return NextResponse.json(
      { error: "Error al actualizar la factura" },
      { status: 500 }
    )
  }
}
