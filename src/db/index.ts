import Database from "better-sqlite3"
import path from "path"
import fs from "fs"
import { initializeSchema } from "./schema"

const DATA_DIR = path.join(process.cwd(), "data")
const MAIN_DB_PATH = path.join(DATA_DIR, "main.db")

let mainDb: Database.Database | null = null

export function getMainDb(): Database.Database {
  if (!mainDb) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    mainDb = new Database(MAIN_DB_PATH)
    mainDb.pragma("journal_mode = WAL")
    mainDb.pragma("foreign_keys = ON")
    initializeMainSchema(mainDb)
  }
  return mainDb
}

function initializeMainSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS negocios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      email TEXT,
      moneda_default TEXT DEFAULT 'MXN',
      nombre_changed_at TEXT,
      email_changed_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      nombre TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'negocio',
      negocio_id INTEGER,
      activo INTEGER DEFAULT 1,
      profile_photo_url TEXT,
      email_changed_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS sesiones (
      id TEXT PRIMARY KEY,
      usuario_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key_hash TEXT NOT NULL UNIQUE,
      key_prefix TEXT NOT NULL,
      negocio_id INTEGER NOT NULL,
      nombre TEXT NOT NULL,
      permisos TEXT DEFAULT 'read',
      activa INTEGER DEFAULT 1,
      ultimo_uso TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cuentas_correo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      negocio_id INTEGER NOT NULL,
      email TEXT NOT NULL,
      access_token TEXT,
      refresh_token TEXT,
      token_expiry TEXT,
      profile_photo_url TEXT,
      activa INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE
    );
    `)

  const columns = db.prepare("PRAGMA table_info(usuarios)").all() as Array<{ name: string }>
  const colNames = columns.map((c) => c.name)
  if (!colNames.includes("profile_photo_url")) {
    db.exec("ALTER TABLE usuarios ADD COLUMN profile_photo_url TEXT")
  }
  if (!colNames.includes("email_changed_at")) {
    db.exec("ALTER TABLE usuarios ADD COLUMN email_changed_at TEXT")
  }
  if (!colNames.includes("telefono")) {
    db.exec("ALTER TABLE usuarios ADD COLUMN telefono TEXT")
  }

  const negocioColumns = db.prepare("PRAGMA table_info(negocios)").all() as Array<{ name: string }>
  const negocioColNames = negocioColumns.map((c) => c.name)
  if (!negocioColNames.includes("nombre_changed_at")) {
    db.exec("ALTER TABLE negocios ADD COLUMN nombre_changed_at TEXT")
  }
  if (!negocioColNames.includes("email_changed_at")) {
    db.exec("ALTER TABLE negocios ADD COLUMN email_changed_at TEXT")
  }
  if (!negocioColNames.includes("plan")) {
    db.exec("ALTER TABLE negocios ADD COLUMN plan TEXT DEFAULT 'basico'")
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

export function getNegocioBySlug(slug: string): Negocio | undefined {
  return getMainDb().prepare("SELECT * FROM negocios WHERE slug = ?").get(slug) as Negocio | undefined
}

export function getNegocioById(id: number): Negocio | undefined {
  return getMainDb().prepare("SELECT * FROM negocios WHERE id = ?").get(id) as Negocio | undefined
}

export function getAllNegocios(): Negocio[] {
  return getMainDb().prepare("SELECT * FROM negocios ORDER BY nombre").all() as Negocio[]
}

export function createNegocio(nombre: string, slug: string, email?: string, monedaDefault = "MXN"): Negocio {
  const result = getMainDb()
    .prepare("INSERT INTO negocios (nombre, slug, email, moneda_default) VALUES (?, ?, ?, ?)")
    .run(nombre, slug, email || null, monedaDefault)

  return getNegocioById(result.lastInsertRowid as number)!
}

export function updateNegocio(id: number, data: { nombre?: string; email?: string; moneda_default?: string }): { error?: string } {
  const fields: string[] = []
  const values: unknown[] = []

  const current = getNegocioById(id)
  if (!current) return { error: "Negocio no encontrado" }

  if (data.nombre !== undefined && data.nombre !== current.nombre) {
    if (current.nombre_changed_at) {
      const changedAt = new Date(current.nombre_changed_at)
      const now = new Date()
      const monthsDiff = (now.getFullYear() - changedAt.getFullYear()) * 12 + (now.getMonth() - changedAt.getMonth())
      if (monthsDiff < 6) {
        return { error: `Solo puedes cambiar el nombre una vez cada 6 meses. Intenta de nuevo en ${6 - monthsDiff} mes(es)` }
      }
    }
    fields.push("nombre = ?")
    values.push(data.nombre)
    fields.push("nombre_changed_at = datetime('now')")
    const newSlug = data.nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    if (newSlug && newSlug !== current.slug) {
      const slugExists = getMainDb().prepare("SELECT id FROM negocios WHERE slug = ? AND id != ?").get(newSlug, id)
      if (!slugExists) {
        fields.push("slug = ?")
        values.push(newSlug)
      }
    }
  }

  if (data.email !== undefined && data.email !== current.email) {
    if (current.email_changed_at) {
      const changedAt = new Date(current.email_changed_at)
      const now = new Date()
      const monthsDiff = (now.getFullYear() - changedAt.getFullYear()) * 12 + (now.getMonth() - changedAt.getMonth())
      if (monthsDiff < 6) {
        return { error: `Solo puedes cambiar el email una vez cada 6 meses. Intenta de nuevo en ${6 - monthsDiff} mes(es)` }
      }
    }
    fields.push("email = ?")
    values.push(data.email)
    fields.push("email_changed_at = datetime('now')")
  }

  if (data.moneda_default !== undefined) {
    fields.push("moneda_default = ?")
    values.push(data.moneda_default)
  }

  if (fields.length === 0) return {}

  fields.push("updated_at = datetime('now')")
  values.push(id)

  getMainDb().prepare(`UPDATE negocios SET ${fields.join(", ")} WHERE id = ?`).run(...values)
  return {}
}

export function deleteNegocio(id: number): void {
  const negocio = getNegocioById(id)
  if (!negocio) return

  const tenantDbPath = getTenantDbPath(negocio.slug)
  if (fs.existsSync(tenantDbPath)) {
    fs.unlinkSync(tenantDbPath)
    const walPath = tenantDbPath + "-wal"
    const shmPath = tenantDbPath + "-shm"
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath)
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath)
  }

  const tenantDir = path.dirname(tenantDbPath)
  if (fs.existsSync(tenantDir) && fs.readdirSync(tenantDir).length === 0) {
    fs.rmdirSync(tenantDir)
  }

  getMainDb().prepare("DELETE FROM negocios WHERE id = ?").run(id)
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

export function getCuentasCorreo(negocioId: number): CuentaCorreo[] {
  return getMainDb().prepare("SELECT * FROM cuentas_correo WHERE negocio_id = ? ORDER BY created_at").all(negocioId) as CuentaCorreo[]
}

export function getCuentaCorreoById(id: number): CuentaCorreo | undefined {
  return getMainDb().prepare("SELECT * FROM cuentas_correo WHERE id = ?").get(id) as CuentaCorreo | undefined
}

export function getCuentaCorreoByEmail(negocioId: number, email: string): CuentaCorreo | undefined {
  return getMainDb().prepare("SELECT * FROM cuentas_correo WHERE negocio_id = ? AND email = ?").get(negocioId, email) as CuentaCorreo | undefined
}

export function createCuentaCorreo(negocioId: number, email: string, accessToken: string, refreshToken: string, tokenExpiry: string, profilePhotoUrl?: string): CuentaCorreo {
  const result = getMainDb()
    .prepare("INSERT INTO cuentas_correo (negocio_id, email, access_token, refresh_token, token_expiry, profile_photo_url) VALUES (?, ?, ?, ?, ?, ?)")
    .run(negocioId, email, accessToken, refreshToken, tokenExpiry, profilePhotoUrl || null)
  return getCuentaCorreoById(result.lastInsertRowid as number)!
}

export function updateCuentaCorreoTokens(id: number, accessToken: string, refreshToken: string, tokenExpiry: string): void {
  getMainDb().prepare("UPDATE cuentas_correo SET access_token = ?, refresh_token = ?, token_expiry = ?, updated_at = datetime('now') WHERE id = ?").run(accessToken, refreshToken, tokenExpiry, id)
}

export function deleteCuentaCorreo(id: number): void {
  getMainDb().prepare("DELETE FROM cuentas_correo WHERE id = ?").run(id)
}

const tenantDbs = new Map<string, Database.Database>()

export function getTenantDbPath(slug: string): string {
  return path.join(DATA_DIR, "negocios", slug, "facturas.db")
}

export function getTenantDb(slug: string): Database.Database {
  let db = tenantDbs.get(slug)
  if (!db) {
    const dbPath = getTenantDbPath(slug)
    const dbDir = path.dirname(dbPath)
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }
    db = new Database(dbPath)
    db.pragma("journal_mode = WAL")
    db.pragma("foreign_keys = ON")
    initializeSchema(db)
    tenantDbs.set(slug, db)
  }
  return db
}

export function closeTenantDb(slug: string): void {
  const db = tenantDbs.get(slug)
  if (db) {
    db.close()
    tenantDbs.delete(slug)
  }
}

export interface Usuario {
  id: number
  email: string
  password_hash: string
  nombre: string
  role: "admin" | "negocio"
  negocio_id: number | null
  activo: number
  created_at: string
  updated_at: string
}

export function getUsuarioById(id: number): Usuario | undefined {
  return getMainDb().prepare("SELECT * FROM usuarios WHERE id = ?").get(id) as Usuario | undefined
}

export function getUsuarioByEmail(email: string): Usuario | undefined {
  return getMainDb().prepare("SELECT * FROM usuarios WHERE email = ?").get(email) as Usuario | undefined
}

export function getAllUsuarios(): Usuario[] {
  return getMainDb().prepare("SELECT * FROM usuarios ORDER BY nombre").all() as Usuario[]
}

export function getUsuariosByNegocio(negocioId: number): Usuario[] {
  return getMainDb().prepare("SELECT * FROM usuarios WHERE negocio_id = ? ORDER BY nombre").all(negocioId) as Usuario[]
}

export function createUsuario(
  email: string,
  passwordHash: string,
  nombre: string,
  role: "admin" | "negocio" = "negocio",
  negocioId?: number
): Usuario {
  const result = getMainDb()
    .prepare(
      "INSERT INTO usuarios (email, password_hash, nombre, role, negocio_id) VALUES (?, ?, ?, ?, ?)"
    )
    .run(email, passwordHash, nombre, role, negocioId || null)

  return getUsuarioById(result.lastInsertRowid as number)!
}

export function updateUsuario(
  id: number,
  data: {
    email?: string
    nombre?: string
    role?: "admin" | "negocio"
    negocio_id?: number | null
    activo?: number
  }
): void {
  const fields: string[] = []
  const values: unknown[] = []

  if (data.email !== undefined) { fields.push("email = ?"); values.push(data.email) }
  if (data.nombre !== undefined) { fields.push("nombre = ?"); values.push(data.nombre) }
  if (data.role !== undefined) { fields.push("role = ?"); values.push(data.role) }
  if (data.negocio_id !== undefined) { fields.push("negocio_id = ?"); values.push(data.negocio_id) }
  if (data.activo !== undefined) { fields.push("activo = ?"); values.push(data.activo) }

  if (fields.length === 0) return

  fields.push("updated_at = datetime('now')")
  values.push(id)

  getMainDb().prepare(`UPDATE usuarios SET ${fields.join(", ")} WHERE id = ?`).run(...values)
}

export function deleteUsuario(id: number): void {
  getMainDb().prepare("DELETE FROM usuarios WHERE id = ?").run(id)
}
