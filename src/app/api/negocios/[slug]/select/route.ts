import { NextResponse } from "next/server"
import { getNegocioBySlug } from "@/db"
import { getCurrentUser } from "@/lib/auth"

export async function POST(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { slug } = await params
  const negocio = getNegocioBySlug(slug)
  if (!negocio) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })

  if (user.role === "negocio" && user.negocio_id !== negocio.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  return NextResponse.json({ ok: true, slug })
}

export async function DELETE() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  return NextResponse.json({ ok: true })
}
