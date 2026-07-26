import { cookies } from "next/headers"
import { getNegocioBySlug, getNegocioById, type Negocio } from "@/db"
import { getCurrentUser, type Usuario, type Session } from "@/lib/auth"

const COOKIE_NAME = "negocio_slug"

export interface AuthenticatedTenant {
  negocio: Negocio
  slug: string
  user: Usuario & { session: Session }
}

export async function getActiveTenant(): Promise<AuthenticatedTenant | null> {
  const cookieStore = await cookies()
  const slug = cookieStore.get(COOKIE_NAME)?.value

  if (!slug) return null

  const user = await getCurrentUser()
  if (!user) return null

  const negocio = await getNegocioBySlug(slug)
  if (!negocio) return null

  if (user.role === "negocio" && user.negocio_id !== negocio.id) {
    return null
  }

  return { negocio, slug, user }
}

export async function requireActiveTenant(): Promise<AuthenticatedTenant> {
  const tenant = await getActiveTenant()
  if (!tenant) {
    throw new Error("No hay negocio seleccionado o no autorizado")
  }
  return tenant
}

export async function requireAuth(): Promise<Usuario & { session: Session }> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("No autenticado")
  }
  return user
}

export async function requireAdmin(): Promise<Usuario & { session: Session }> {
  const user = await requireAuth()
  if (user.role !== "admin") {
    throw new Error("No autorizado")
  }
  return user
}

export async function getNegocioIdFromSlug(slug: string): Promise<number | null> {
  const negocio = await getNegocioBySlug(slug)
  return negocio?.id ?? null
}

export async function getNegocioSlugFromId(id: number): Promise<string | null> {
  const negocio = await getNegocioById(id)
  return negocio?.slug ?? null
}
