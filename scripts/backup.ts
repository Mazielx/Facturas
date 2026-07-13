import Database from "better-sqlite3"
import fs from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(DATA_DIR, "backups")
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || "30")

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
  }
}

function cleanupOldBackups() {
  const files = fs.readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith("backup-") && f.endsWith(".db"))
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

function backupDb(dbPath: string) {
  if (!fs.existsSync(dbPath)) {
    console.log(`Base de datos no encontrada: ${dbPath}`)
    return
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}.db`)

  const source = new Database(dbPath)
  source.backup(backupPath)
  source.close()

  console.log(`Backup creado: ${backupPath}`)
}

function main() {
  console.log("Iniciando backup...")
  ensureBackupDir()

  const mainDbPath = path.join(DATA_DIR, "main.db")
  backupDb(mainDbPath)

  const negociosDir = path.join(DATA_DIR, "negocios")
  if (fs.existsSync(negociosDir)) {
    const negocios = fs.readdirSync(negociosDir)
    for (const negocio of negocios) {
      const tenantDbPath = path.join(negociosDir, negocio, "facturas.db")
      backupDb(tenantDbPath)
    }
  }

  cleanupOldBackups()
  console.log("Backup completado")
}

main()
