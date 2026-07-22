import bcrypt from "bcrypt"
import crypto from "crypto"
import { cookies } from "next/headers"
import { getMainDb } from "@/db"

const SESSION_COOKIE = "session_id"
const SESSION_EXPIRY_DAYS = 30

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

export interface Session {
  id: string
  usuario_id: number
  expires_at: string
  created_at: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function createSessionId(): string {
  return crypto.randomBytes(32).toString("hex")
}

export function createSession(usuarioId: number): Session {
  const db = getMainDb()
  const sessionId = createSessionId()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS)

  db.prepare(
    "INSERT INTO sesiones (id, usuario_id, expires_at) VALUES (?, ?, ?)"
  ).run(sessionId, usuarioId, expiresAt.toISOString())

  return {
    id: sessionId,
    usuario_id: usuarioId,
    expires_at: expiresAt.toISOString(),
    created_at: new Date().toISOString(),
  }
}

export function getSessionUser(sessionId: string): (Usuario & { session: Session }) | null {
  const db = getMainDb()
  const row = db
    .prepare(
      `SELECT u.*, s.id as session_id, s.expires_at as session_expires_at, s.created_at as session_created_at
       FROM usuarios u
       JOIN sesiones s ON s.usuario_id = u.id
       WHERE s.id = ? AND s.expires_at > datetime('now') AND u.activo = 1`
    )
    .get(sessionId) as (Usuario & { session_id: string; session_expires_at: string; session_created_at: string }) | undefined

  if (!row) return null

  return {
    id: row.id,
    email: row.email,
    password_hash: row.password_hash,
    nombre: row.nombre,
    role: row.role,
    negocio_id: row.negocio_id,
    activo: row.activo,
    profile_photo_url: row.profile_photo_url ?? null,
    email_changed_at: row.email_changed_at ?? null,
    telefono: row.telefono ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    session: {
      id: row.session_id,
      usuario_id: row.id,
      expires_at: row.session_expires_at,
      created_at: row.session_created_at,
    },
  }
}

export async function getCurrentUser(): Promise<(Usuario & { session: Session }) | null> {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value
  if (!sessionId) return null
  return getSessionUser(sessionId)
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

export function deleteSession(sessionId: string): void {
  const db = getMainDb()
  db.prepare("DELETE FROM sesiones WHERE id = ?").run(sessionId)
}

export function deleteExpiredSessions(): void {
  const db = getMainDb()
  db.prepare("DELETE FROM sesiones WHERE expires_at < datetime('now')").run()
}

export function getUsuarioByEmail(email: string): Usuario | undefined {
  const db = getMainDb()
  return db.prepare("SELECT * FROM usuarios WHERE email = ?").get(email) as Usuario | undefined
}

export function createUsuario(
  email: string,
  password: string,
  nombre: string,
  role: "admin" | "negocio" = "negocio",
  negocioId?: number
): Promise<Usuario> {
  const db = getMainDb()
  const passwordHash = bcrypt.hashSync(password, 12)

  const result = db
    .prepare(
      "INSERT INTO usuarios (email, password_hash, nombre, role, negocio_id) VALUES (?, ?, ?, ?, ?)"
    )
    .run(email, passwordHash, nombre, role, negocioId || null)

  return Promise.resolve({
    id: result.lastInsertRowid as number,
    email,
    password_hash: passwordHash,
    nombre,
    role,
    negocio_id: negocioId || null,
    activo: 1,
    profile_photo_url: null,
    email_changed_at: null,
    telefono: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
}
