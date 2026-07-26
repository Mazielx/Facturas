import { createClient, type Client, type InValue } from "@libsql/client"

let client: Client | null = null

export function getDb(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL || "file:local.db"
    const authToken = process.env.TURSO_AUTH_TOKEN || undefined
    client = createClient({ url, authToken })
  }
  return client
}

function toArgs(args?: Record<string, unknown>): InValue[] {
  if (!args || Object.keys(args).length === 0) return []
  const keys = Object.keys(args).sort((a, b) => {
    const na = parseInt(a)
    const nb = parseInt(b)
    if (!isNaN(na) && !isNaN(nb)) return na - nb
    return a.localeCompare(b)
  })
  return keys.map((k) => args[k] as InValue)
}

export async function dbExec(sql: string, args?: Record<string, unknown>) {
  return getDb().execute({ sql, args: toArgs(args) })
}

export async function dbAll<T = Record<string, unknown>>(sql: string, args?: Record<string, unknown>): Promise<T[]> {
  const result = await getDb().execute({ sql, args: toArgs(args) })
  return result.rows as unknown as T[]
}

export async function dbGet<T = Record<string, unknown>>(sql: string, args?: Record<string, unknown>): Promise<T | undefined> {
  const result = await getDb().execute({ sql, args: toArgs(args) })
  return (result.rows[0] as unknown as T) || undefined
}

export async function dbRun(sql: string, args?: Record<string, unknown>) {
  const result = await getDb().execute({ sql, args: toArgs(args) })
  return { lastInsertRowid: Number(result.lastInsertRowid), changes: result.rowsAffected }
}
