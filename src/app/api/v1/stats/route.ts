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

    const totalFacturas = await dbGet<{ count: number }>(
      "SELECT COUNT(*) as count FROM facturas WHERE negocio_slug = ?",
      { "1": negocio.slug }
    )
    const totalImporte = await dbGet<{ sum: number }>(
      "SELECT SUM(total) as sum FROM facturas WHERE negocio_slug = ?",
      { "1": negocio.slug }
    )

    const porEstado = await dbAll(
      `SELECT estado, COUNT(*) as count, SUM(total) as sum
       FROM facturas WHERE negocio_slug = ?
       GROUP BY estado`,
      { "1": negocio.slug }
    )

    return NextResponse.json({
      totalFacturas: totalFacturas?.count || 0,
      totalImporte: totalImporte?.sum || 0,
      porEstado,
    })
  } catch (error) {
    console.error("API v1 error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
