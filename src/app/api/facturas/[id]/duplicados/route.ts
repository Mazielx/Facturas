import { NextRequest, NextResponse } from "next/server"
import { requireActiveTenant } from "@/lib/tenant"
import { dbAll } from "@/db/client"
import { ensureSchema } from "@/db"
import { isAccesoCompleto } from "@/lib/paywall"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await requireActiveTenant()
    await ensureSchema()
    if (!isAccesoCompleto({ email: tenant.user.email, role: tenant.user.role, planPagadoHasta: tenant.negocio.plan_pagado_hasta })) {
      return NextResponse.json({ error: "Se requiere un plan activo" }, { status: 402 })
    }
    const { id } = await params
    const facturaId = Number(id)

    const duplicados = await dbAll(
      `SELECT dp.*, f.numero_factura, f.emisor_nombre, f.total, f.fecha_emision
       FROM duplicados_potenciales dp
       JOIN facturas f ON f.id = dp.duplicada_de_id
       WHERE dp.factura_id = ? AND f.negocio_slug = ?
       ORDER BY dp.score DESC`,
      { "1": facturaId, "2": tenant.slug }
    )

    return NextResponse.json(duplicados)
  } catch (error) {
    console.error("Error fetching duplicados:", error)
    if (error instanceof Error && error.message.includes("No hay negocio")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
