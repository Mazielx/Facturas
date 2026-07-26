import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { dbAll } from "@/db/client"

export async function POST() {
  try {
    const user = await requireAuth()
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Solo admins" }, { status: 403 })
    }

    const tables = ["facturas", "lineas_factura", "adjuntos", "procesamiento_log", "negocios", "usuarios", "cuentas_correo", "duplicados_potenciales", "api_keys"]
    const backup: Record<string, unknown[]> = {}

    for (const table of tables) {
      try {
        backup[table] = await dbAll(`SELECT * FROM ${table}`)
      } catch {
        backup[table] = []
      }
    }

    return new NextResponse(JSON.stringify({ timestamp: new Date().toISOString(), data: backup }, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="backup-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    })
  } catch (error) {
    console.error("Backup error:", error)
    return NextResponse.json({ error: "Error al crear backup" }, { status: 500 })
  }
}
