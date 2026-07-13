import Database from "better-sqlite3"
import path from "path"
import fs from "fs"

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
  `)
}

export interface Negocio {
  id: number
  nombre: string
  slug: string
  email: string | null
  moneda_default: string
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

export function updateNegocio(id: number, data: { nombre?: string; email?: string; moneda_default?: string }): void {
  const fields: string[] = []
  const values: unknown[] = []

  if (data.nombre !== undefined) { fields.push("nombre = ?"); values.push(data.nombre) }
  if (data.email !== undefined) { fields.push("email = ?"); values.push(data.email) }
  if (data.moneda_default !== undefined) { fields.push("moneda_default = ?"); values.push(data.moneda_default) }

  if (fields.length === 0) return

  fields.push("updated_at = datetime('now')")
  values.push(id)

  getMainDb().prepare(`UPDATE negocios SET ${fields.join(", ")} WHERE id = ?`).run(...values)
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
