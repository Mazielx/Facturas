import { NextResponse } from "next/server"
import { getNegocioBySlug, deleteNegocio, updateNegocio } from "@/db"

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const negocio = getNegocioBySlug(slug)
  if (!negocio) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })
  return NextResponse.json(negocio)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { getNegocioBySlug } = await import("@/db")
  const negocio = getNegocioBySlug(slug)
  if (!negocio) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })
  deleteNegocio(negocio.id)
  return NextResponse.json({ ok: true })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { getNegocioBySlug } = await import("@/db")
  const negocio = getNegocioBySlug(slug)
  if (!negocio) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })
  const body = await request.json()
  updateNegocio(negocio.id, body)
  return NextResponse.json({ ok: true })
}
