import { isSuscripcionActiva, getMaxEmailCuentas } from "@/lib/plans"

// V-14 FIX: Removed canonicalEmail + esEmailAdmin.
// Admin entitlements are role-based only, never email-based.
// Gmail dot-stripping created a squatting vulnerability.

export function esEmailAdmin(_email: string | null | undefined): boolean {
  return false // Deprecated — role-based auth only
}

export function isAccesoCompleto(opts: {
  email?: string | null
  role?: string
  planPagadoHasta?: string | null
}): boolean {
  if (opts.role === "admin") return true
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
  if (user.role === "admin") return MAX_CUENTAS_ADMIN
  return getMaxEmailCuentas(plan)
}
