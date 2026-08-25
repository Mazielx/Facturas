import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { dbAll } from "@/db/client"
import {
  checkRateLimit, RATE_LIMITS, getRateLimitHeaders,
  extractClientIp, extractUserAgent,
  logSecurityEvent, secureErrorResponse, safeLogError,
} from "@/lib/security"

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Solo admins" }, { status: 403 })
    }

    const ip = extractClientIp(request)
    const userAgent = extractUserAgent(request)

    // Rate limit backups
    const rl = checkRateLimit(String(user.id), RATE_LIMITS.admin)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Espera unos minutos." },
        { status: 429, headers: getRateLimitHeaders(rl) }
      )
    }

    const tables = ["facturas", "lineas_factura", "adjuntos", "procesamiento_log", "negocios", "usuarios", "cuentas_correo", "duplicados_potenciales", "api_keys"]
    const backup: Record<string, unknown[]> = {}

    for (const table of tables) {
      try {
        const rows = await dbAll(`SELECT * FROM ${table}`)
        if (table === "usuarios") {
          backup[table] = rows.map(({ password_hash, ...rest }) => rest)
        } else if (table === "cuentas_correo") {
          // V-17 FIX: Strip OAuth tokens from backup
          backup[table] = rows.map(({ access_token, refresh_token, ...rest }) => rest)
        } else if (table === "api_keys") {
          // V-17 FIX: Strip API key hashes from backup
          backup[table] = rows.map(({ key_hash, ...rest }) => rest)
        } else if (table === "adjuntos") {
          // V-34 FIX: Strip binary content blobs from backup (metadata only)
          backup[table] = rows.map(({ content, ...rest }) => rest)
        } else {
          backup[table] = rows
        }
      } catch {
        backup[table] = []
      }
    }

    await logSecurityEvent("admin_action", { userId: user.id, ip, userAgent, metadata: { action: "backup_download" } })

    return new NextResponse(JSON.stringify({ timestamp: new Date().toISOString(), data: backup }, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="backup-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    })
  } catch (error) {
    safeLogError("backup", error)
    return NextResponse.json({ error: "Error al crear backup" }, { status: 500 })
  }
}
