import { NextResponse } from "next/server"
import { getAllNegocios, createNegocio } from "@/db"
import { getActiveTenant } from "@/lib/tenant"

export async function GET() {
  const negocios = getAllNegocios()
  const active = await getActiveTenant()
  return NextResponse.json({ negocios, activeSlug: active?.negocio.slug || null })
}

export async function POST(request: Request) {
  const body = await request.json()
  const { nombre, email } = body as { nombre: string; email?: string }
  if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })

  const slug = nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  const { getNegocioBySlug } = await import("@/db")
  if (getNegocioBySlug(slug)) return NextResponse.json({ error: "Ya existe un negocio con ese nombre" }, { status: 409 })

  const negocio = createNegocio(nombre, slug, email)
  return NextResponse.json(negocio, { status: 201 })
}
