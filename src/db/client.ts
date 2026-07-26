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

function toArgs(args?: Record<string, unknown>): InValue[] | Record<string, InValue> {
  if (!args || Object.keys(args).length === 0) return []
  const keys = Object.keys(args)
  const isPositional = keys.every((k) => /^\d+$/.test(k))
  if (isPositional) {
    const sorted = keys.sort((a, b) => parseInt(a) - parseInt(b))
    return sorted.map((k) => args[k] as InValue)
  }
  const result: Record<string, InValue> = {}
  for (const k of keys) {
    const name = k.startsWith("$") || k.startsWith(":") || k.startsWith("@") ? k : `$${k}`
    result[name] = args[k] as InValue
  }
  return result
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
