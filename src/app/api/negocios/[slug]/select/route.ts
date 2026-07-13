import { NextResponse } from "next/server"
import { getNegocioBySlug } from "@/db"

export async function POST(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const negocio = getNegocioBySlug(slug)
  if (!negocio) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })

  const response = NextResponse.json({ ok: true, slug })
  response.cookies.set("negocio_slug", slug, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  })
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set("negocio_slug", "", { maxAge: 0, path: "/" })
  return response
}
