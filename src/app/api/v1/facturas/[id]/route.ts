import { NextRequest, NextResponse } from "next/server"
import { validateApiKey } from "@/lib/api-auth"
import { getNegocioById } from "@/db"
import { dbGet, dbAll, dbRun } from "@/db/client"
import { isSuscripcionActiva } from "@/lib/plans"
import {
  checkRateLimit, RATE_LIMITS, getRateLimitHeaders,
  extractClientIp, extractUserAgent,
  logSecurityEvent, secureErrorResponse,
} from "@/lib/security"

async function authApi(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }
  const key = authHeader.substring(7)
  return validateApiKey(key)
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const apiKey = await authApi(req)
    if (!apiKey) {
      return NextResponse.json({ error: "API key invalida" }, { status: 401 })
    }

    const ip = extractClientIp(req)
    const userAgent = extractUserAgent(req)

    const rl = await checkRateLimit(`apikey:${apiKey.id}`, RATE_LIMITS.apiGlobal)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Demasiadas peticiones. Intenta de nuevo mas tarde." },
        { status: 429, headers: getRateLimitHeaders(rl) }
      )
    }

    const negocio = await getNegocioById(apiKey.negocio_id)
    if (!negocio) {
      return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })
    }

    if (!isSuscripcionActiva(negocio.plan_pagado_hasta)) {
      return NextResponse.json({ error: "Se requiere un plan activo para usar la API" }, { status: 402 })
    }

    const { id } = await params

    const factura = await dbGet(
      "SELECT * FROM facturas WHERE id = ? AND negocio_slug = ?",
      { "1": Number(id), "2": negocio.slug }
    )

    if (!factura) {
      return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 })
    }

    const lineas = await dbAll(
      "SELECT * FROM lineas_factura WHERE factura_id = ?",
      { "1": Number(id) }
    )

    await logSecurityEvent("api_key_used", { ip, userAgent, metadata: { keyId: apiKey.id, endpoint: "get_factura", facturaId: id } })

    return NextResponse.json({ ...factura, lineas })
  } catch (error) {
    const { message } = secureErrorResponse(error, "api_v1_get")
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const apiKey = await authApi(req)
    if (!apiKey) {
      return NextResponse.json({ error: "API key invalida" }, { status: 401 })
    }

    const ip = extractClientIp(req)
    const userAgent = extractUserAgent(req)

    const rl = await checkRateLimit(`apikey:${apiKey.id}`, RATE_LIMITS.apiGlobal)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Demasiadas peticiones. Intenta de nuevo mas tarde." },
        { status: 429, headers: getRateLimitHeaders(rl) }
      )
    }

    if (!(apiKey.permisos === "write" || apiKey.permisos === "read,write")) {
      return NextResponse.json({ error: "Sin permisos de escritura" }, { status: 403 })
    }

    const negocio = await getNegocioById(apiKey.negocio_id)
    if (!negocio) {
      return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })
    }

    if (!isSuscripcionActiva(negocio.plan_pagado_hasta)) {
      return NextResponse.json({ error: "Se requiere un plan activo para usar la API" }, { status: 402 })
    }

    const { id } = await params

    await dbRun(
      "DELETE FROM facturas WHERE id = ? AND negocio_slug = ?",
      { "1": Number(id), "2": negocio.slug }
    )

    await logSecurityEvent("api_key_used", { ip, userAgent, metadata: { keyId: apiKey.id, endpoint: "delete_factura", facturaId: id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    const { message } = secureErrorResponse(error, "api_v1_delete")
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
