import { isSuscripcionActiva, getMaxEmailCuentas } from "@/lib/plans"

function canonicalEmail(email: string): string {
  const lower = email.trim().toLowerCase()
  const [local, domain] = lower.split("@")
  if (domain === "gmail.com" || domain === "googlemail.com") {
    return `${local.replace(/\./g, "")}@${domain}`
  }
  return lower
}

export function esEmailAdmin(email: string | null | undefined): boolean {
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail || !email) return false
  return canonicalEmail(email) === canonicalEmail(adminEmail)
}

export function isAccesoCompleto(opts: {
  email?: string | null
  role?: string
  planPagadoHasta?: string | null
}): boolean {
  if (opts.role === "admin") return true
  if (esEmailAdmin(opts.email)) return true
  return isSuscripcionActiva(opts.planPagadoHasta)
}

export function planBloqueado(opts: {
  email?: string | null
  role?: string
  planPagadoHasta?: string | null
}): boolean {
  return !isAccesoCompleto(opts)
}

const MAX_CUENTAS_ADMIN = getMaxEmailCuentas("empresa-mensual")

export function maxCuentasCorreo(user: { role?: string; email?: string | null }, plan: string): number {
  if (user.role === "admin" || esEmailAdmin(user.email)) return MAX_CUENTAS_ADMIN
  return getMaxEmailCuentas(plan)
}
