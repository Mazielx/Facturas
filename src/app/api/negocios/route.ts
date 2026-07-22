import { NextResponse } from "next/server"
import { getAllNegocios, createNegocio } from "@/db"
import { getActiveTenant } from "@/lib/tenant"
import { getCurrentUser } from "@/lib/auth"
import { cookies } from "next/headers"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const userInfo = { id: user.id, email: user.email, nombre: user.nombre, role: user.role, profile_photo_url: user.profile_photo_url, email_changed_at: user.email_changed_at, telefono: user.telefono }

  if (user.role === "admin") {
    const cookieStore = await cookies()
    const activeSlug = cookieStore.get("negocio_slug")?.value || null
    const negocios = getAllNegocios()
    return NextResponse.json({ negocios, activeSlug, user: userInfo })
  }

  const tenant = await getActiveTenant()
  if (!tenant) {
    const negocios = getAllNegocios().filter((n) => n.id === user.negocio_id)
    return NextResponse.json({ negocios, activeSlug: null, user: userInfo })
  }

  return NextResponse.json({ negocios: [tenant.negocio], activeSlug: tenant.negocio.slug, user: userInfo })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const body = await request.json()
  const { nombre, email } = body as { nombre: string; email?: string }
  if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })

  const slug = nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  const { getNegocioBySlug } = await import("@/db")
  if (getNegocioBySlug(slug)) return NextResponse.json({ error: "Ya existe un negocio con ese nombre" }, { status: 409 })

  const negocio = createNegocio(nombre, slug, email)
  return NextResponse.json(negocio, { status: 201 })
}
