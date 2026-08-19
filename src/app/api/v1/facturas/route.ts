import { NextRequest, NextResponse } from "next/server"
import { validateApiKey } from "@/lib/api-auth"
import { getNegocioById } from "@/db"
import { dbGet, dbAll } from "@/db/client"
import { isSuscripcionActiva } from "@/lib/plans"

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

    const negocio = await getNegocioById(apiKey.negocio_id)
    if (!negocio) {
      return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })
    }

    if (!isSuscripcionActiva(negocio.plan_pagado_hasta)) {
      return NextResponse.json({ error: "Se requiere un plan activo para usar la API" }, { status: 402 })
    }

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50") || 50))
    const offset = (page - 1) * limit

    const facturas = await dbAll(
      `SELECT id, numero_factura, emisor_nombre, emisor_nif, total, moneda,
              fecha_emision, estado, created_at
       FROM facturas
       WHERE negocio_slug = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      { "1": negocio.slug, "2": limit, "3": offset }
    )

    const total = await dbGet<{ count: number }>(
      "SELECT COUNT(*) as count FROM facturas WHERE negocio_slug = ?",
      { "1": negocio.slug }
    )

    return NextResponse.json({
      data: facturas,
      pagination: {
        page,
        limit,
        total: total?.count || 0,
        pages: Math.ceil((total?.count || 0) / limit),
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

    const negocio = await getNegocioById(apiKey.negocio_id)
    if (!negocio) {
      return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })
    }

    if (!isSuscripcionActiva(negocio.plan_pagado_hasta)) {
      return NextResponse.json({ error: "Se requiere un plan activo para usar la API" }, { status: 402 })
    }

    const body = await req.json()
    const { numero_factura, emisor_nombre, emisor_nif, receptor_nombre, receptor_nif, fecha_emision, base_imponible, tipo_iva, cuota_iva, total, moneda, estado } = body

    if (!numero_factura || !emisor_nombre) {
      return NextResponse.json({ error: "numero_factura y emisor_nombre son requeridos" }, { status: 400 })
    }

    const { dbRun } = await import("@/db/client")
    const result = await dbRun(
      `INSERT INTO facturas (numero_factura, emisor_nombre, emisor_nif, receptor_nombre, receptor_nif,
        fecha_emision, base_imponible, tipo_iva, cuota_iva, total, moneda, estado,
        confianza_score, confianza_nivel, negocio_slug)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1.0, 'alta', ?)`,
      {
        "1": numero_factura, "2": emisor_nombre, "3": emisor_nif || null,
        "4": receptor_nombre || null, "5": receptor_nif || null,
        "6": fecha_emision || new Date().toISOString().slice(0, 10),
        "7": base_imponible || 0, "8": tipo_iva || 21, "9": cuota_iva || 0,
        "10": total || 0, "11": moneda || "EUR", "12": estado || "pendiente",
        "13": negocio.slug,
      }
    )

    return NextResponse.json({ id: result.lastInsertRowid, success: true }, { status: 201 })
  } catch (error) {
    console.error("API v1 error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
