import { NextResponse } from "next/server"
import { getNegocioBySlug, deleteNegocio, updateNegocio } from "@/db"
import { requireAuth } from "@/lib/tenant"
import { isAccesoCompleto } from "@/lib/paywall"

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const user = await requireAuth(request)
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { slug } = await params
  const negocio = await getNegocioBySlug(slug)
  if (!negocio) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })

  if (user.role === "negocio" && user.negocio_id !== negocio.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  return NextResponse.json({
    ...negocio,
    planActivo: isAccesoCompleto({ email: user.email, role: user.role, planPagadoHasta: negocio.plan_pagado_hasta }),
  })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const user = await requireAuth(request)
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const { slug } = await params
  const negocio = await getNegocioBySlug(slug)
  if (!negocio) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })
  await deleteNegocio(negocio.id)
  return NextResponse.json({ ok: true })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const user = await requireAuth(request)
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const { slug } = await params
  const negocio = await getNegocioBySlug(slug)
  if (!negocio) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })
  const body = await request.json()

  const allowed: Record<string, unknown> = {}
  if (body.nombre !== undefined) allowed.nombre = body.nombre
  if (body.email !== undefined) allowed.email = body.email
  if (body.moneda_default !== undefined) allowed.moneda_default = body.moneda_default

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 })
  }

  const result = await updateNegocio(negocio.id, allowed)
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  const updated = await getNegocioBySlug(slug)
  return NextResponse.json(updated)
}
