export type PlanTipo = "individual" | "empresa"
export type PlanCiclo = "mensual" | "anual"

export interface Plan {
  id: string
  nombre: string
  tipo: PlanTipo
  ciclo: PlanCiclo
  precio: number
  maxEmailCuentas: number
  descripcion: string
  caracteristicas: string[]
  destacado?: boolean
}

export const PLANES: Plan[] = [
  {
    id: "individual-mensual",
    nombre: "Individual",
    tipo: "individual",
    ciclo: "mensual",
    precio: 199,
    maxEmailCuentas: 1,
    descripcion: "Para autonomos y personas con actividad empresarial.",
    caracteristicas: [
      "1 cuenta de correo institucional",
      "Extraccion automatica de facturas PDF/XML desde el correo",
      "Deteccion de duplicados",
      "Busqueda instantanea",
      "Exportacion CSV y Excel",
      "Backups automaticos",
      "Indicador de confianza y revision manual",
    ],
  },
  {
    id: "empresa-mensual",
    nombre: "Empresa",
    tipo: "empresa",
    ciclo: "mensual",
    precio: 499,
    maxEmailCuentas: 4,
    descripcion: "Para negocios que reciben facturas de multiples fuentes.",
    destacado: true,
    caracteristicas: [
      "Hasta 4 cuentas de correo institucional",
      "Todo lo del plan Individual",
      "Graficas de gastos y proveedores",
      "Etiquetas y categorias",
      "Multiples usuarios del negocio",
      "API publica para integraciones",
      "Notificaciones por email",
    ],
  },
  {
    id: "individual-anual",
    nombre: "Individual Anual",
    tipo: "individual",
    ciclo: "anual",
    precio: 1990,
    maxEmailCuentas: 1,
    descripcion: "Todo lo del plan Individual con 2 meses gratis al pagar por adelantado.",
    caracteristicas: [
      "1 cuenta de correo institucional",
      "Extraccion automatica de facturas PDF/XML desde el correo",
      "Deteccion de duplicados",
      "Busqueda instantanea",
      "Exportacion CSV y Excel",
      "Backups automaticos",
      "Indicador de confianza y revision manual",
    ],
  },
  {
    id: "empresa-anual",
    nombre: "Empresa Anual",
    tipo: "empresa",
    ciclo: "anual",
    precio: 4990,
    maxEmailCuentas: 4,
    descripcion: "Todo lo del plan Empresa con 2 meses gratis al pagar por adelantado.",
    destacado: true,
    caracteristicas: [
      "Hasta 4 cuentas de correo institucional",
      "Todo lo del plan Empresa mensual",
      "Graficas de gastos y proveedores",
      "Etiquetas y categorias",
      "Multiples usuarios del negocio",
      "API publica para integraciones",
      "Notificaciones por email",
    ],
  },
]

const LEGACY_PLAN_MAP: Record<string, string> = {
  basico: "individual-mensual",
  "multi correo": "empresa-mensual",
}

export const PLAN_DEFAULT = "individual-mensual"

export function getPlanById(id: string): Plan | undefined {
  return PLANES.find((p) => p.id === id)
}

export function getPlanInfo(plan: string): Plan {
  const resolved = LEGACY_PLAN_MAP[plan] ?? plan
  const info = getPlanById(resolved) ?? getPlanById(PLAN_DEFAULT)
  if (!info) throw new Error(`Plan no encontrado: ${resolved}`)
  return info
}

export function getMaxEmailCuentas(plan: string): number {
  return getPlanInfo(plan).maxEmailCuentas
}

export function getPlanNombre(plan: string): string {
  const info = getPlanInfo(plan)
  return info.tipo === "empresa" ? "Empresa" : "Individual"
}

export function getPrecioPorMes(plan: string): number {
  const info = getPlanInfo(plan)
  return info.ciclo === "anual" ? info.precio / 12 : info.precio
}

export function formatPrecio(precio: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(precio)
}

export function isSuscripcionActiva(planPagadoHasta?: string | null): boolean {
  if (!planPagadoHasta) return false
  const hasta = new Date(planPagadoHasta)
  if (Number.isNaN(hasta.getTime())) return false
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  return hasta.getTime() >= hoy.getTime()
}
