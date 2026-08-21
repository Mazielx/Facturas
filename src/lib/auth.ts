import bcrypt from "bcrypt"
import crypto from "crypto"
import { cookies } from "next/headers"
import { dbRun, dbGet } from "@/db/client"

const SESSION_COOKIE = "session_id"
// V-40 FIX: Reduced from 30 days to 7 days (NIST recommendation: max 30 days for low-risk, 7 days for financial)
const SESSION_EXPIRY_DAYS = 7
// V-40: Idle timeout — session expires after 30 minutes of inactivity
const IDLE_TIMEOUT_MINUTES = 30

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

export async function createSession(usuarioId: number, fingerprint?: string): Promise<Session> {
  const sessionId = createSessionId()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS)

  await dbRun(
    "INSERT INTO sesiones (id, usuario_id, expires_at, fingerprint, last_activity_at) VALUES (?, ?, ?, ?, datetime('now'))",
    { "1": sessionId, "2": usuarioId, "3": expiresAt.toISOString(), "4": fingerprint || null }
  )

  return {
    id: sessionId,
    usuario_id: usuarioId,
    expires_at: expiresAt.toISOString(),
    created_at: new Date().toISOString(),
  }
}

/**
 * V-40 FIX: Update last_activity_at (sliding window idle timeout).
 * Called on every authenticated request.
 */
export async function touchSession(sessionId: string): Promise<void> {
  await dbRun(
    "UPDATE sesiones SET last_activity_at = datetime('now') WHERE id = ?",
    { "1": sessionId }
  ).catch(() => {})
}

export async function getSessionUser(sessionId: string): Promise<(Usuario & { session: Session }) | null> {
  const row = await dbGet<Usuario & { session_id: string; session_expires_at: string; session_created_at: string; last_activity_at: string | null }>(
    `SELECT u.*, s.id as session_id, s.expires_at as session_expires_at, s.created_at as session_created_at, s.last_activity_at
     FROM usuarios u
     JOIN sesiones s ON s.usuario_id = u.id
     WHERE s.id = ? AND s.expires_at > datetime('now') AND u.activo = 1`,
    { "1": sessionId }
  )

  if (!row) return null

  // V-40 FIX: Check idle timeout — session expires after IDLE_TIMEOUT_MINUTES of inactivity
  if (row.last_activity_at) {
    const lastActivity = new Date(row.last_activity_at).getTime()
    const idleMs = Date.now() - lastActivity
    if (idleMs > IDLE_TIMEOUT_MINUTES * 60 * 1000) {
      // Session idle too long — delete it
      await dbRun("DELETE FROM sesiones WHERE id = ?", { "1": sessionId })
      return null
    }
  }

  // V-40: Touch session (sliding window) on every authenticated access
  await touchSession(sessionId)

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

export async function deleteSession(sessionId: string): Promise<void> {
  await dbRun("DELETE FROM sesiones WHERE id = ?", { "1": sessionId })
}

export async function deleteExpiredSessions(): Promise<void> {
  await dbRun("DELETE FROM sesiones WHERE expires_at < datetime('now')")
}

export async function deleteAllUserSessions(usuarioId: number, exceptSessionId?: string): Promise<void> {
  if (exceptSessionId) {
    await dbRun("DELETE FROM sesiones WHERE usuario_id = ? AND id != ?", { "1": usuarioId, "2": exceptSessionId })
  } else {
    await dbRun("DELETE FROM sesiones WHERE usuario_id = ?", { "1": usuarioId })
  }
}

export async function getUsuarioByEmail(email: string): Promise<Usuario | undefined> {
  return dbGet<Usuario>("SELECT * FROM usuarios WHERE email = ?", { "1": email })
}

export async function createUsuario(
  email: string,
  password: string,
  nombre: string,
  role: "admin" | "negocio" = "negocio",
  negocioId?: number
): Promise<Usuario> {
  const passwordHash = await hashPassword(password)

  await dbRun(
    "INSERT INTO usuarios (email, password_hash, nombre, role, negocio_id) VALUES (?, ?, ?, ?, ?)",
    { "1": email, "2": passwordHash, "3": nombre, "4": role, "5": negocioId || null }
  )

  const user = await dbGet<Usuario>("SELECT * FROM usuarios WHERE email = ?", { "1": email })
  return user!
}
