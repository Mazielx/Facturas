import { NextResponse } from "next/server"
import { getNegocioBySlug, deleteNegocio, updateNegocio } from "@/db"
import { getCurrentUser } from "@/lib/auth"
import { isAccesoCompleto } from "@/lib/paywall"

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const user = await getCurrentUser()
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

export async function DELETE(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const user = await getCurrentUser()
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
  const user = await getCurrentUser()
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const { slug } = await params
  const negocio = await getNegocioBySlug(slug)
  if (!negocio) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })
  const body = await request.json()
  const result = await updateNegocio(negocio.id, body)
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  const updated = await getNegocioBySlug(slug)
  return NextResponse.json(updated)
}
