import { NextResponse } from "next/server"
import { getAllNegocios, createNegocio, updateUsuario } from "@/db"
import { getActiveTenant } from "@/lib/tenant"
import { getCurrentUser } from "@/lib/auth"
import { isAccesoCompleto } from "@/lib/paywall"
import { cookies } from "next/headers"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const withPlanActivo = (n: { id: number; plan_pagado_hasta: string | null }) => ({
    ...n,
    planActivo: isAccesoCompleto({ email: user.email, role: user.role, planPagadoHasta: n.plan_pagado_hasta }),
  })

  const userInfo = { id: user.id, email: user.email, nombre: user.nombre, role: user.role, profile_photo_url: user.profile_photo_url, email_changed_at: user.email_changed_at, telefono: user.telefono }

  if (user.role === "admin") {
    const cookieStore = await cookies()
    const activeSlug = cookieStore.get("negocio_slug")?.value || null
    const negocios = await getAllNegocios()
    return NextResponse.json({ negocios: negocios.map(withPlanActivo), activeSlug, user: userInfo })
  }

  const tenant = await getActiveTenant()
  if (!tenant) {
    const allNegocios = await getAllNegocios()
    const negocios = allNegocios.filter((n) => n.id === user.negocio_id)
    return NextResponse.json({ negocios: negocios.map(withPlanActivo), activeSlug: null, user: userInfo })
  }

  return NextResponse.json({ negocios: [withPlanActivo(tenant.negocio)], activeSlug: tenant.negocio.slug, user: userInfo })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const body = await request.json()
  const { nombre, email } = body as { nombre: string; email?: string }
  if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })

  const slug = nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  const { getNegocioBySlug } = await import("@/db")
  if (await getNegocioBySlug(slug)) return NextResponse.json({ error: "Ya existe un negocio con ese nombre" }, { status: 409 })

  const negocio = await createNegocio(nombre, slug, email || user.email)
  await updateUsuario(user.id, { negocio_id: negocio.id })
  return NextResponse.json(negocio, { status: 201 })
}
