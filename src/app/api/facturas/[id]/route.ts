import { NextResponse } from "next/server"
import { requireActiveTenant } from "@/lib/tenant"

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
