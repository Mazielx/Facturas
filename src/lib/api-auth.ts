import crypto from "crypto"
import { ensureSchema } from "@/db"
import { dbGet, dbAll, dbRun } from "@/db/client"

export interface ApiKey {
  id: number
  key_hash: string
  key_prefix: string
  negocio_id: number
  nombre: string
  permisos: string
  activa: number
  ultimo_uso: string | null
  created_at: string
}

export function generateApiKey(): string {
  return `fk_${crypto.randomBytes(32).toString("hex")}`
}

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex")
}

export async function createApiKey(
  negocioId: number,
  nombre: string,
  permisos: string = "read"
): Promise<{ key: string; apiKey: ApiKey }> {
  await ensureSchema()
  const key = generateApiKey()
  const keyHash = hashApiKey(key)
  const keyPrefix = key.substring(0, 11)

  const result = await dbRun(
    "INSERT INTO api_keys (key_hash, key_prefix, negocio_id, nombre, permisos) VALUES (?, ?, ?, ?, ?)",
    { "1": keyHash, "2": keyPrefix, "3": negocioId, "4": nombre, "5": permisos }
  )

  const apiKey = await dbGet<ApiKey>(
    "SELECT * FROM api_keys WHERE id = ?",
    { "1": result.lastInsertRowid }
  )

  if (!apiKey) throw new Error("No se pudo crear la API key")
  return { key, apiKey }
}

export async function validateApiKey(key: string): Promise<ApiKey | null> {
  await ensureSchema()
  const keyHash = hashApiKey(key)

  const apiKey = await dbGet<ApiKey>(
    "SELECT * FROM api_keys WHERE key_hash = ? AND activa = 1",
    { "1": keyHash }
  )

  if (!apiKey) return null

  await dbRun(
    "UPDATE api_keys SET ultimo_uso = datetime('now') WHERE id = ?",
    { "1": apiKey.id }
  )

  return apiKey
}

export async function getApiKeysByNegocio(negocioId: number): Promise<ApiKey[]> {
  await ensureSchema()
  return dbAll<ApiKey>(
    "SELECT * FROM api_keys WHERE negocio_id = ? ORDER BY created_at DESC",
    { "1": negocioId }
  )
}

export async function deleteApiKey(id: number): Promise<void> {
  await ensureSchema()
  await dbRun(
    "DELETE FROM api_keys WHERE id = ?",
    { "1": id }
  )
}

export async function toggleApiKey(id: number, activa: boolean): Promise<void> {
  await ensureSchema()
  await dbRun(
    "UPDATE api_keys SET activa = ? WHERE id = ?",
    { "1": activa ? 1 : 0, "2": id }
  )
}
