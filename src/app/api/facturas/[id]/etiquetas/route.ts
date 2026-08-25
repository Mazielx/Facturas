import { NextRequest, NextResponse } from "next/server"
import { requireActiveTenant } from "@/lib/tenant"
import { dbGet, dbAll, dbRun } from "@/db/client"
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

    const factura = await dbGet(
      "SELECT id FROM facturas WHERE id = ? AND negocio_slug = ?",
      { "1": facturaId, "2": tenant.slug }
    )
    if (!factura) {
      return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 })
    }

    const etiquetas = await dbAll(
      `SELECT e.* FROM etiquetas e
       JOIN factura_etiqueta fe ON fe.etiqueta_id = e.id
       WHERE fe.factura_id = ?
       ORDER BY e.nombre`,
      { "1": facturaId }
    )

    return NextResponse.json(etiquetas)
  } catch (error) {
    safeLogError("factura_etiquetas_list", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // V-27 FIX: Verify session fingerprint (IP + UA) on state-changing request
    const tenant = await requireActiveTenant(req)
    await ensureSchema()
    if (!isAccesoCompleto({ email: tenant.user.email, role: tenant.user.role, planPagadoHasta: tenant.negocio.plan_pagado_hasta })) {
      return NextResponse.json({ error: "Se requiere un plan activo" }, { status: 402 })
    }
    const { id } = await params
    const facturaId = Number(id)
    const body = await req.json()
    const { etiqueta_id } = body

    if (!etiqueta_id) {
      return NextResponse.json({ error: "etiqueta_id requerido" }, { status: 400 })
    }

    const factura = await dbGet(
      "SELECT id FROM facturas WHERE id = ? AND negocio_slug = ?",
      { "1": facturaId, "2": tenant.slug }
    )
    if (!factura) {
      return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 })
    }

    // V-35b FIX: Verify etiqueta belongs to this tenant before linking
    const etiqueta = await dbGet(
      "SELECT id FROM etiquetas WHERE id = ? AND negocio_id = ?",
      { "1": etiqueta_id, "2": tenant.negocio.id }
    )
    if (!etiqueta) {
      return NextResponse.json({ error: "Etiqueta no encontrada en este negocio" }, { status: 404 })
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
    safeLogError("factura_etiqueta_add", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // V-27 FIX: Verify session fingerprint (IP + UA) on state-changing request
    const tenant = await requireActiveTenant(req)
    await ensureSchema()
    if (!isAccesoCompleto({ email: tenant.user.email, role: tenant.user.role, planPagadoHasta: tenant.negocio.plan_pagado_hasta })) {
      return NextResponse.json({ error: "Se requiere un plan activo" }, { status: 402 })
    }
    const { id } = await params
    const facturaId = Number(id)
    const { searchParams } = new URL(req.url)
    const etiquetaId = searchParams.get("etiqueta_id")

    if (!etiquetaId) {
      return NextResponse.json({ error: "etiqueta_id requerido" }, { status: 400 })
    }

    const factura = await dbGet(
      "SELECT id FROM facturas WHERE id = ? AND negocio_slug = ?",
      { "1": facturaId, "2": tenant.slug }
    )
    if (!factura) {
      return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 })
    }

    await dbRun(
      "DELETE FROM factura_etiqueta WHERE factura_id = ? AND etiqueta_id = ?",
      { "1": facturaId, "2": Number(etiquetaId) }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    safeLogError("factura_etiqueta_remove", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
