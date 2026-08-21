import { NextRequest } from "next/server"
import { validateApiKey } from "@/lib/api-auth"
import { getNegocioById } from "@/db"
import { dbAll } from "@/db/client"
import { isSuscripcionActiva } from "@/lib/plans"
import { buildFacturasWorkbookBuffer, type ExcelColumn } from "@/lib/excel"
import { APP_NAME } from "@/lib/brand"
import {
  checkRateLimit, RATE_LIMITS, getRateLimitHeaders,
  extractClientIp, extractUserAgent,
  logSecurityEvent, secureErrorResponse,
} from "@/lib/security"

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "API key invalida" }), { status: 401, headers: { "Content-Type": "application/json" } })
    }

    const apiKey = await validateApiKey(authHeader.substring(7))
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key invalida" }), { status: 401, headers: { "Content-Type": "application/json" } })
    }

    const ip = extractClientIp(req)
    const userAgent = extractUserAgent(req)

    const rl = checkRateLimit(`apikey:${apiKey.id}`, RATE_LIMITS.export)
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: "Demasiadas exportaciones. Espera unos minutos." }), {
        status: 429,
        headers: { "Content-Type": "application/json", ...getRateLimitHeaders(rl) },
      })
    }

    const negocio = await getNegocioById(apiKey.negocio_id)
    if (!negocio) {
      return new Response(JSON.stringify({ error: "Negocio no encontrado" }), { status: 404, headers: { "Content-Type": "application/json" } })
    }

    if (!isSuscripcionActiva(negocio.plan_pagado_hasta)) {
      return new Response(JSON.stringify({ error: "Se requiere un plan activo para usar la API" }), { status: 402, headers: { "Content-Type": "application/json" } })
    }

    const { searchParams } = new URL(req.url)
    const format = searchParams.get("format") || "csv"

    const facturas = await dbAll(
      `SELECT id, numero_factura, fecha_emision, emisor_nombre, emisor_nif,
             receptor_nombre, receptor_nif, base_imponible, tipo_iva,
             cuota_iva, total, moneda, estado, confianza_nivel, requiere_revision
       FROM facturas WHERE negocio_slug = ? ORDER BY fecha_emision DESC`,
      { "1": negocio.slug }
    ) as Record<string, unknown>[]

    await logSecurityEvent("api_key_used", { ip, userAgent, metadata: { keyId: apiKey.id, endpoint: "export", format, count: facturas.length } })

    if (format === "xlsx") {
      const columns: ExcelColumn[] = [
        { header: "ID", key: "id", width: 6 },
        { header: "Numero Factura", key: "numero_factura", width: 22 },
        { header: "Fecha Emision", key: "fecha_emision", width: 14 },
        { header: "Emisor", key: "emisor_nombre", width: 32 },
        { header: "NIF Emisor", key: "emisor_nif", width: 18 },
        { header: "Receptor", key: "receptor_nombre", width: 32 },
        { header: "Base Imponible", key: "base_imponible", width: 15, type: "money" },
        { header: "Tipo IVA", key: "tipo_iva", width: 10 },
        { header: "Cuota IVA", key: "cuota_iva", width: 15, type: "money" },
        { header: "Total", key: "total", width: 15, type: "money" },
        { header: "Moneda", key: "moneda", width: 8 },
        { header: "Estado", key: "estado", width: 13 },
      ]
      const excelBuffer = buildFacturasWorkbookBuffer(APP_NAME, columns, facturas)

      return new Response(excelBuffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": 'attachment; filename="facturas.xlsx"',
        },
      })
    }

    const headers = ["ID", "Numero Factura", "Fecha Emision", "Emisor", "NIF Emisor", "Receptor", "Base Imponible", "Tipo IVA", "Cuota IVA", "Total", "Moneda", "Estado"]
    const escapeCsv = (v: unknown) => {
      const s = v == null ? "" : String(v)
      return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
    }
    const rows = facturas.map((f) =>
      [f.id, f.numero_factura, f.fecha_emision, f.emisor_nombre, f.emisor_nif, f.receptor_nombre, f.base_imponible, f.tipo_iva, f.cuota_iva, f.total, f.moneda, f.estado].map(escapeCsv).join(",")
    )

    const csv = "\uFEFF" + headers.join(",") + "\n" + rows.join("\n")
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="facturas.csv"',
      },
    })
  } catch {
    return new Response(JSON.stringify({ error: "Error interno" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
}
