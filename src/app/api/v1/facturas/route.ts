import { NextRequest, NextResponse } from "next/server"
import { validateApiKey } from "@/lib/api-auth"
import { getTenantDb } from "@/db"
import { getNegocioById } from "@/db"

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
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = (page - 1) * limit

    const facturas = db
      .prepare(
        `SELECT id, numero_factura, emisor_nombre, emisor_nif, total, moneda,
                fecha_emision, estado, created_at
         FROM facturas
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(limit, offset)

    const total = db.prepare("SELECT COUNT(*) as count FROM facturas").get() as { count: number }

    return NextResponse.json({
      data: facturas,
      pagination: {
        page,
        limit,
        total: total.count,
        pages: Math.ceil(total.count / limit),
      },
    })
  } catch (error) {
    console.error("API v1 error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = await authApi(req)
    if (!apiKey) {
      return NextResponse.json({ error: "API key invalida" }, { status: 401 })
    }

    if (!apiKey.permisos.includes("write")) {
      return NextResponse.json({ error: "Sin permisos de escritura" }, { status: 403 })
    }

    const negocio = getNegocioById(apiKey.negocio_id)
    if (!negocio) {
      return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })
    }

    const body = await req.json()
    const { numero_factura, emisor_nombre, emisor_nif, receptor_nombre, receptor_nif, fecha_emision, base_imponible, tipo_iva, cuota_iva, total, moneda, estado } = body

    if (!numero_factura || !emisor_nombre) {
      return NextResponse.json({ error: "numero_factura y emisor_nombre son requeridos" }, { status: 400 })
    }

    const db = getTenantDb(negocio.slug)
    const result = db.prepare(`
      INSERT INTO facturas (numero_factura, emisor_nombre, emisor_nif, receptor_nombre, receptor_nif,
        fecha_emision, base_imponible, tipo_iva, cuota_iva, total, moneda, estado,
        confianza_score, confianza_nivel)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1.0, 'alta')
    `).run(
      numero_factura, emisor_nombre, emisor_nif || null, receptor_nombre || null, receptor_nif || null,
      fecha_emision || new Date().toISOString().slice(0, 10),
      base_imponible || 0, tipo_iva || 21, cuota_iva || 0, total || 0,
      moneda || "EUR", estado || "pendiente"
    )

    return NextResponse.json({ id: result.lastInsertRowid, success: true }, { status: 201 })
  } catch (error) {
    console.error("API v1 error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
