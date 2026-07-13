import { NextRequest, NextResponse } from "next/server"
import { validateApiKey } from "@/lib/api-auth"
import { getTenantDb, getNegocioById } from "@/db"

async function authApi(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }
  const key = authHeader.substring(7)
  return validateApiKey(key)
}

export async function GET(req: NextRequest) {
  try {
    const apiKey = await authApi(req)
    if (!apiKey) {
      return NextResponse.json({ error: "API key invalida" }, { status: 401 })
    }

    const negocio = getNegocioById(apiKey.negocio_id)
    if (!negocio) {
      return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })
    }

    const db = getTenantDb(negocio.slug)

    const totalFacturas = db.prepare("SELECT COUNT(*) as count FROM facturas").get() as { count: number }
    const totalImporte = db.prepare("SELECT SUM(total) as sum FROM facturas").get() as { sum: number }

    const porEstado = db.prepare(`
      SELECT estado, COUNT(*) as count, SUM(total) as sum
      FROM facturas GROUP BY estado
    `).all()

    return NextResponse.json({
      totalFacturas: totalFacturas.count,
      totalImporte: totalImporte.sum || 0,
      porEstado,
    })
  } catch (error) {
    console.error("API v1 error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
