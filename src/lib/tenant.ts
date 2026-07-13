import { cookies } from "next/headers"
import { getTenantDb, getNegocioBySlug, getNegocioById, type Negocio } from "@/db"
import type Database from "better-sqlite3"
import { getCurrentUser, type Usuario, type Session } from "@/lib/auth"

const COOKIE_NAME = "negocio_slug"

export interface AuthenticatedTenant {
  negocio: Negocio
  db: Database.Database
  user: Usuario & { session: Session }
}

export async function getActiveTenant(): Promise<AuthenticatedTenant | null> {
  const cookieStore = await cookies()
  const slug = cookieStore.get(COOKIE_NAME)?.value

  if (!slug) return null

  const user = await getCurrentUser()
  if (!user) return null

  const negocio = getNegocioBySlug(slug)
  if (!negocio) return null

  if (user.role === "negocio" && user.negocio_id !== negocio.id) {
    return null
  }

  const db = getTenantDb(slug)
  return { negocio, db, user }
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

export function getNegocioIdFromSlug(slug: string): number | null {
  const negocio = getNegocioBySlug(slug)
  return negocio?.id ?? null
}

export function getNegocioSlugFromId(id: number): string | null {
  const negocio = getNegocioById(id)
  return negocio?.slug ?? null
}
