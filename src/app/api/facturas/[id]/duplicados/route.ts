import { NextRequest, NextResponse } from "next/server"
import { requireActiveTenant } from "@/lib/tenant"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { db } = await requireActiveTenant()
    const { id } = await params
    const facturaId = Number(id)

    const duplicados = db
      .prepare(
        `SELECT dp.*, f.numero_factura, f.emisor_nombre, f.total, f.fecha_emision
         FROM duplicados_potenciales dp
         JOIN facturas f ON f.id = dp.duplicada_de_id
         WHERE dp.factura_id = ?
         ORDER BY dp.score DESC`
      )
      .all(facturaId)

    return NextResponse.json(duplicados)
  } catch (error) {
    console.error("Error fetching duplicados:", error)
    if (error instanceof Error && error.message.includes("No hay negocio")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
