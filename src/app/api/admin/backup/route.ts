import { NextResponse } from "next/server"
import Database from "better-sqlite3"
import fs from "fs"
import path from "path"
import { requireAuth } from "@/lib/auth"

const DATA_DIR = path.join(process.cwd(), "data")
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(DATA_DIR, "backups")

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
  }
}

function cleanupOldBackups(retentionDays: number) {
  const files = fs.readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith("backup-") && f.endsWith(".db"))
    .map((f) => ({
      name: f,
      time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.time - a.time)

  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000
  for (const file of files) {
    if (file.time < cutoff) {
      fs.unlinkSync(path.join(BACKUP_DIR, file.name))
    }
  }
  return files.filter((f) => f.time >= cutoff)
}

export async function POST() {
  try {
    const user = await requireAuth()
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Solo admins" }, { status: 403 })
    }

    ensureBackupDir()
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const backedUp: string[] = []

    const mainDbPath = path.join(DATA_DIR, "main.db")
    if (fs.existsSync(mainDbPath)) {
      const backupPath = path.join(BACKUP_DIR, `backup-main-${timestamp}.db`)
      const source = new Database(mainDbPath)
      source.backup(backupPath)
      source.close()
      backedUp.push("main.db")
    }

    const negociosDir = path.join(DATA_DIR, "negocios")
    if (fs.existsSync(negociosDir)) {
      for (const negocio of fs.readdirSync(negociosDir)) {
        const tenantDbPath = path.join(negociosDir, negocio, "facturas.db")
        if (fs.existsSync(tenantDbPath)) {
          const backupPath = path.join(BACKUP_DIR, `backup-${negocio}-${timestamp}.db`)
          const source = new Database(tenantDbPath)
          source.backup(backupPath)
          source.close()
          backedUp.push(`${negocio}/facturas.db`)
        }
      }
    }

    const retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS || "30")
    const remaining = cleanupOldBackups(retentionDays)

    return NextResponse.json({
      success: true,
      backedUp,
      totalBackups: remaining.length,
    })
  } catch (error) {
    console.error("Backup error:", error)
    return NextResponse.json({ error: "Error al crear backup" }, { status: 500 })
  }
}
