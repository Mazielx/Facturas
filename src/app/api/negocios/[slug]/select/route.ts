import { NextResponse } from "next/server"
import { getNegocioBySlug } from "@/db"
import { getCurrentUser } from "@/lib/auth"

export async function POST(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { slug } = await params
  const negocio = await getNegocioBySlug(slug)
  if (!negocio) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })

  if (user.role === "negocio" && user.negocio_id !== negocio.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const response = NextResponse.json({ ok: true, slug })
  response.cookies.set("negocio_slug", slug, {
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
    sameSite: "lax",
    secure: true,
    httpOnly: true,
  })
  return response
}

export async function DELETE() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const response = NextResponse.json({ ok: true })
  response.cookies.set("negocio_slug", "", { path: "/", maxAge: 0 })
  return response
}
