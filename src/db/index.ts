import { initializeSchema } from "./schema"
import { dbExec, dbAll, dbGet, dbRun } from "./client"

let schemaInitialized = false

export async function ensureSchema(): Promise<void> {
  if (!schemaInitialized) {
    await initializeSchema()
    schemaInitialized = true
  }
}

export interface Negocio {
  id: number
  nombre: string
  slug: string
  email: string | null
  moneda_default: string
  plan: string
  nombre_changed_at: string | null
  email_changed_at: string | null
  created_at: string
  updated_at: string
}

export async function getNegocioBySlug(slug: string): Promise<Negocio | undefined> {
  await ensureSchema()
  return dbGet<Negocio>("SELECT * FROM negocios WHERE slug = ?", { "1": slug })
}

export async function getNegocioById(id: number): Promise<Negocio | undefined> {
  await ensureSchema()
  return dbGet<Negocio>("SELECT * FROM negocios WHERE id = ?", { "1": id })
}

export async function getAllNegocios(): Promise<Negocio[]> {
  await ensureSchema()
  return dbAll<Negocio>("SELECT * FROM negocios ORDER BY nombre")
}

export async function createNegocio(nombre: string, slug: string, email?: string, monedaDefault = "MXN"): Promise<Negocio> {
  await ensureSchema()
  await dbRun(
    "INSERT INTO negocios (nombre, slug, email, moneda_default) VALUES (?, ?, ?, ?)",
    { "1": nombre, "2": slug, "3": email || null, "4": monedaDefault }
  )
  return (await getNegocioBySlug(slug))!
}

export async function updateNegocio(id: number, data: { nombre?: string; email?: string; moneda_default?: string }): Promise<{ error?: string }> {
  await ensureSchema()
  const fields: string[] = []
  const args: Record<string, unknown> = {}

  const current = await getNegocioById(id)
  if (!current) return { error: "Negocio no encontrado" }

  let idx = 1

  if (data.nombre !== undefined && data.nombre !== current.nombre) {
    if (current.nombre_changed_at) {
      const changedAt = new Date(current.nombre_changed_at)
      const now = new Date()
      const monthsDiff = (now.getFullYear() - changedAt.getFullYear()) * 12 + (now.getMonth() - changedAt.getMonth())
      if (monthsDiff < 8) {
        return { error: `Solo puedes cambiar el nombre una vez cada 8 meses. Intenta de nuevo en ${8 - monthsDiff} mes(es)` }
      }
    }
    fields.push(`nombre = ?`)
    args[String(idx++)] = data.nombre
    fields.push(`nombre_changed_at = datetime('now')`)
  }

  if (data.email !== undefined && data.email !== current.email) {
    if (current.email_changed_at) {
      const changedAt = new Date(current.email_changed_at)
      const now = new Date()
      const monthsDiff = (now.getFullYear() - changedAt.getFullYear()) * 12 + (now.getMonth() - changedAt.getMonth())
      if (monthsDiff < 8) {
        return { error: `Solo puedes cambiar el email una vez cada 8 meses. Intenta de nuevo en ${8 - monthsDiff} mes(es)` }
      }
    }
    fields.push(`email = ?`)
    args[String(idx++)] = data.email
    fields.push(`email_changed_at = datetime('now')`)
  }

  if (data.moneda_default !== undefined) {
    fields.push(`moneda_default = ?`)
    args[String(idx++)] = data.moneda_default
  }

  if (fields.length === 0) return {}

  fields.push(`updated_at = datetime('now')`)
  args[String(idx)] = id

  await dbRun(`UPDATE negocios SET ${fields.join(", ")} WHERE id = ?`, args)
  return {}
}

export async function deleteNegocio(id: number): Promise<void> {
  await ensureSchema()
  await dbRun("DELETE FROM facturas WHERE negocio_slug IN (SELECT slug FROM negocios WHERE id = ?)", { "1": id })
  await dbRun("DELETE FROM lineas_factura WHERE factura_id IN (SELECT id FROM facturas WHERE negocio_slug IN (SELECT slug FROM negocios WHERE id = ?))", { "1": id })
  await dbRun("DELETE FROM adjuntos WHERE factura_id IN (SELECT id FROM facturas WHERE negocio_slug IN (SELECT slug FROM negocios WHERE id = ?))", { "1": id })
  await dbRun("DELETE FROM negocios WHERE id = ?", { "1": id })
}

export interface CuentaCorreo {
  id: number
  negocio_id: number
  email: string
  access_token: string | null
  refresh_token: string | null
  token_expiry: string | null
  profile_photo_url: string | null
  activa: number
  created_at: string
  updated_at: string
}

export async function getCuentasCorreo(negocioId: number): Promise<CuentaCorreo[]> {
  await ensureSchema()
  return dbAll<CuentaCorreo>("SELECT * FROM cuentas_correo WHERE negocio_id = ? ORDER BY created_at", { "1": negocioId })
}

export async function getCuentaCorreoById(id: number): Promise<CuentaCorreo | undefined> {
  await ensureSchema()
  return dbGet<CuentaCorreo>("SELECT * FROM cuentas_correo WHERE id = ?", { "1": id })
}

export async function getCuentaCorreoByEmail(negocioId: number, email: string): Promise<CuentaCorreo | undefined> {
  await ensureSchema()
  return dbGet<CuentaCorreo>("SELECT * FROM cuentas_correo WHERE negocio_id = ? AND email = ?", { "1": negocioId, "2": email })
}

export async function createCuentaCorreo(negocioId: number, email: string, accessToken: string, refreshToken: string, tokenExpiry: string, profilePhotoUrl?: string): Promise<CuentaCorreo> {
  await ensureSchema()
  await dbRun(
    "INSERT INTO cuentas_correo (negocio_id, email, access_token, refresh_token, token_expiry, profile_photo_url) VALUES (?, ?, ?, ?, ?, ?)",
    { "1": negocioId, "2": email, "3": accessToken, "4": refreshToken, "5": tokenExpiry, "6": profilePhotoUrl || null }
  )
  const row = await dbGet<CuentaCorreo>("SELECT * FROM cuentas_correo WHERE negocio_id = ? AND email = ?", { "1": negocioId, "2": email })
  return row!
}

export async function updateCuentaCorreoTokens(id: number, accessToken: string, refreshToken: string, tokenExpiry: string): Promise<void> {
  await ensureSchema()
  await dbRun(
    "UPDATE cuentas_correo SET access_token = ?, refresh_token = ?, token_expiry = ?, updated_at = datetime('now') WHERE id = ?",
    { "1": accessToken, "2": refreshToken, "3": tokenExpiry, "4": id }
  )
}

export async function deleteCuentaCorreo(id: number): Promise<void> {
  await ensureSchema()
  await dbRun("DELETE FROM cuentas_correo WHERE id = ?", { "1": id })
}

export interface Usuario {
  id: number
  email: string
  password_hash: string
  nombre: string
  role: "admin" | "negocio"
  negocio_id: number | null
  activo: number
  profile_photo_url: string | null
  email_changed_at: string | null
  telefono: string | null
  created_at: string
  updated_at: string
}

export async function getUsuarioById(id: number): Promise<Usuario | undefined> {
  await ensureSchema()
  return dbGet<Usuario>("SELECT * FROM usuarios WHERE id = ?", { "1": id })
}

export async function getUsuarioByEmail(email: string): Promise<Usuario | undefined> {
  await ensureSchema()
  return dbGet<Usuario>("SELECT * FROM usuarios WHERE email = ?", { "1": email })
}

export async function getAllUsuarios(): Promise<Usuario[]> {
  await ensureSchema()
  return dbAll<Usuario>("SELECT * FROM usuarios ORDER BY nombre")
}

export async function getUsuariosByNegocio(negocioId: number): Promise<Usuario[]> {
  await ensureSchema()
  return dbAll<Usuario>("SELECT * FROM usuarios WHERE negocio_id = ? ORDER BY nombre", { "1": negocioId })
}

export async function createUsuario(
  email: string,
  passwordHash: string,
  nombre: string,
  role: "admin" | "negocio" = "negocio",
  negocioId?: number
): Promise<Usuario> {
  await ensureSchema()
  await dbRun(
    "INSERT INTO usuarios (email, password_hash, nombre, role, negocio_id) VALUES (?, ?, ?, ?, ?)",
    { "1": email, "2": passwordHash, "3": nombre, "4": role, "5": negocioId || null }
  )
  const user = await getUsuarioByEmail(email)
  return user!
}

export async function updateUsuario(
  id: number,
  data: {
    email?: string
    nombre?: string
    role?: "admin" | "negocio"
    negocio_id?: number | null
    activo?: number
  }
): Promise<void> {
  await ensureSchema()
  const fields: string[] = []
  const args: Record<string, unknown> = {}
  let idx = 1

  if (data.email !== undefined) { fields.push("email = ?"); args[String(idx++)] = data.email }
  if (data.nombre !== undefined) { fields.push("nombre = ?"); args[String(idx++)] = data.nombre }
  if (data.role !== undefined) { fields.push("role = ?"); args[String(idx++)] = data.role }
  if (data.negocio_id !== undefined) { fields.push("negocio_id = ?"); args[String(idx++)] = data.negocio_id }
  if (data.activo !== undefined) { fields.push("activo = ?"); args[String(idx++)] = data.activo }

  if (fields.length === 0) return

  fields.push("updated_at = datetime('now')")
  args[String(idx)] = id

  await dbRun(`UPDATE usuarios SET ${fields.join(", ")} WHERE id = ?`, args)
}

export async function deleteUsuario(id: number): Promise<void> {
  await ensureSchema()
  await dbRun("DELETE FROM usuarios WHERE id = ?", { "1": id })
}
