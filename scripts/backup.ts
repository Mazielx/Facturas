import { createClient } from "@libsql/client"
import fs from "fs"
import path from "path"

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), "data", "backups")
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || "30")

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
  }
}

function cleanupOldBackups() {
  const files = fs.readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith("backup-") && f.endsWith(".json"))
    .map((f) => ({
      name: f,
      time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.time - a.time)

  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000
  for (const file of files) {
    if (file.time < cutoff) {
      fs.unlinkSync(path.join(BACKUP_DIR, file.name))
      console.log(`Eliminado backup antiguo: ${file.name}`)
    }
  }
}

async function main() {
  console.log("Iniciando backup...")
  ensureBackupDir()

  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN
  if (!url) {
    console.error("TURSO_DATABASE_URL no configurado")
    process.exit(1)
  }

  const client = createClient({ url, authToken })
  const tables = ["facturas", "lineas_factura", "adjuntos", "procesamiento_log", "negocios", "usuarios", "cuentas_correo", "duplicados_potenciales", "api_keys"]
  const backup: Record<string, unknown[]> = {}

  for (const table of tables) {
    try {
      const result = await client.execute(`SELECT * FROM ${table}`)
      backup[table] = result.rows
    } catch {
      backup[table] = []
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}.json`)
  fs.writeFileSync(backupPath, JSON.stringify({ timestamp: new Date().toISOString(), data: backup }, null, 2))
  console.log(`Backup creado: ${backupPath}`)

  cleanupOldBackups()
  client.close()
  console.log("Backup completado")
}

main()
