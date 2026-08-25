import { NextRequest, NextResponse } from "next/server"
import { requireActiveTenant } from "@/lib/tenant"
import { dbAll } from "@/db/client"
import { ensureSchema } from "@/db"
import { isAccesoCompleto } from "@/lib/paywall"
import { safeLogError } from "@/lib/security"

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
      `SELECT dp.score, dp.razon, f.numero_factura, f.emisor_nombre, f.total, f.fecha_emision
       FROM duplicados_potenciales dp
       JOIN facturas fo ON fo.id = dp.factura_id
       JOIN facturas f ON f.id = dp.duplicada_de_id AND f.negocio_slug = ?
       WHERE dp.factura_id = ? AND fo.negocio_slug = ?`,
      { "1": tenant.slug, "2": facturaId, "3": tenant.slug }
    )

    return NextResponse.json(duplicados)
  } catch (error) {
    safeLogError("facturas_duplicados", error)
    if (error instanceof Error && error.message.includes("No hay negocio")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
