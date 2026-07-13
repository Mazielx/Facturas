import crypto from "crypto"
import { getMainDb } from "@/db"

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

export function createApiKey(
  negocioId: number,
  nombre: string,
  permisos: string = "read"
): { key: string; apiKey: ApiKey } {
  const db = getMainDb()
  const key = generateApiKey()
  const keyHash = hashApiKey(key)
  const keyPrefix = key.substring(0, 11)

  const result = db
    .prepare(
      "INSERT INTO api_keys (key_hash, key_prefix, negocio_id, nombre, permisos) VALUES (?, ?, ?, ?, ?)"
    )
    .run(keyHash, keyPrefix, negocioId, nombre, permisos)

  const apiKey = db
    .prepare("SELECT * FROM api_keys WHERE id = ?")
    .get(result.lastInsertRowid) as ApiKey

  return { key, apiKey }
}

export function validateApiKey(key: string): ApiKey | null {
  const db = getMainDb()
  const keyHash = hashApiKey(key)

  const apiKey = db
    .prepare("SELECT * FROM api_keys WHERE key_hash = ? AND activa = 1")
    .get(keyHash) as ApiKey | undefined

  if (!apiKey) return null

  db.prepare("UPDATE api_keys SET ultimo_uso = datetime('now') WHERE id = ?").run(apiKey.id)

  return apiKey
}

export function getApiKeysByNegocio(negocioId: number): ApiKey[] {
  const db = getMainDb()
  return db
    .prepare("SELECT * FROM api_keys WHERE negocio_id = ? ORDER BY created_at DESC")
    .all(negocioId) as ApiKey[]
}

export function deleteApiKey(id: number): void {
  const db = getMainDb()
  db.prepare("DELETE FROM api_keys WHERE id = ?").run(id)
}

export function toggleApiKey(id: number, activa: boolean): void {
  const db = getMainDb()
  db.prepare("UPDATE api_keys SET activa = ? WHERE id = ?").run(activa ? 1 : 0, id)
}
