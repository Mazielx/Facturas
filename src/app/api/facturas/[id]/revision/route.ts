import { NextRequest, NextResponse } from "next/server"
import { requireActiveTenant } from "@/lib/tenant"
import { dbRun } from "@/db/client"
import { ensureSchema } from "@/db"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await requireActiveTenant()
    await ensureSchema()
    const { id } = await params
    const facturaId = Number(id)
    const body = await req.json()
    const { requiere_revision, revision_notas } = body

    const result = await dbRun(
      `UPDATE facturas
       SET requiere_revision = ?, revision_notas = ?, revision_by = ?, revision_at = datetime('now')
       WHERE id = ? AND negocio_slug = ?`,
      {
        "1": requiere_revision ? 1 : 0,
        "2": revision_notas || null,
        "3": tenant.user.id,
        "4": facturaId,
        "5": tenant.slug,
      }
    )

    if (result.changes === 0) {
      return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating revision:", error)
    if (error instanceof Error && error.message.includes("No hay negocio")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
