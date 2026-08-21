import { requireActiveTenant } from "@/lib/tenant"
import { dbAll } from "@/db/client"
import { ensureSchema } from "@/db"
import { isAccesoCompleto } from "@/lib/paywall"
import { buildFacturasWorkbookBuffer, type ExcelColumn } from "@/lib/excel"
import { APP_NAME } from "@/lib/brand"
import {
  checkRateLimit, RATE_LIMITS, getRateLimitHeaders,
  extractClientIp, extractUserAgent,
  logSecurityEvent, secureErrorResponse,
} from "@/lib/security"

export async function GET(request: Request) {
  try {
    const tenant = await requireActiveTenant()

    const ip = extractClientIp(request)
    const userAgent = extractUserAgent(request)

    // Rate limit exports
    const rl = checkRateLimit(String(tenant.user.id), RATE_LIMITS.export)
    if (!rl.allowed) {
      await logSecurityEvent("rate_limited", { userId: tenant.user.id, ip, userAgent, metadata: { endpoint: "export" } })
      return new Response(JSON.stringify({ error: "Demasiadas exportaciones. Espera unos minutos." }), {
        status: 429,
        headers: { "Content-Type": "application/json", ...getRateLimitHeaders(rl) },
      })
    }

    await ensureSchema()
    if (!isAccesoCompleto({ email: tenant.user.email, role: tenant.user.role, planPagadoHasta: tenant.negocio.plan_pagado_hasta })) {
      return new Response(JSON.stringify({ error: "Se requiere un plan activo para exportar" }), {
        status: 402,
        headers: { "Content-Type": "application/json" },
      })
    }
    const { searchParams } = new URL(request.url)

    const search = searchParams.get("search") || ""
    const fechaDesde = searchParams.get("fecha_desde") || ""
    const fechaHasta = searchParams.get("fecha_hasta") || ""
    const emisor = searchParams.get("emisor") || ""
    const estado = searchParams.get("estado") || ""
    const moneda = searchParams.get("moneda") || ""
    const format = searchParams.get("format") || "csv"

    let whereClause = "WHERE negocio_slug = ?"
    const args: Record<string, unknown> = { "1": tenant.slug }
    let paramIdx = 2

    if (search) {
      whereClause += " AND (numero_factura LIKE ? OR emisor_nombre LIKE ? OR receptor_nombre LIKE ?)"
      args[String(paramIdx++)] = `%${search}%`
      args[String(paramIdx++)] = `%${search}%`
      args[String(paramIdx++)] = `%${search}%`
    }

    if (fechaDesde) {
      whereClause += " AND fecha_emision >= ?"
      args[String(paramIdx++)] = fechaDesde
    }

    if (fechaHasta) {
      whereClause += " AND fecha_emision <= ?"
      args[String(paramIdx++)] = fechaHasta
    }

    if (emisor) {
      whereClause += " AND emisor_nombre LIKE ?"
      args[String(paramIdx++)] = `%${emisor}%`
    }

    if (estado) {
      whereClause += " AND estado = ?"
      args[String(paramIdx++)] = estado
    }

    if (moneda) {
      whereClause += " AND moneda = ?"
      args[String(paramIdx++)] = moneda
    }

    const query = `
      SELECT id, numero_factura, fecha_emision, fecha_vencimiento, emisor_nombre,
             emisor_nif, receptor_nombre, receptor_nif, base_imponible, tipo_iva,
             cuota_iva, total, moneda, estado, metodo_pago, descuento, retencion,
             confianza_nivel, requiere_revision
      FROM facturas ${whereClause}
      ORDER BY fecha_emision DESC
    `

    const facturas = await dbAll(query, args)

    await logSecurityEvent("export_downloaded", { userId: tenant.user.id, ip, userAgent, metadata: { format, count: facturas.length } })

    if (format === "xlsx") {
      const columns: ExcelColumn[] = [
        { header: "ID", key: "id", width: 6 },
        { header: "Numero Factura", key: "numero_factura", width: 22 },
        { header: "Fecha Emision", key: "fecha_emision", width: 14 },
        { header: "Fecha Vencimiento", key: "fecha_vencimiento", width: 14 },
        { header: "Emisor", key: "emisor_nombre", width: 32 },
        { header: "NIF Emisor", key: "emisor_nif", width: 18 },
        { header: "Receptor", key: "receptor_nombre", width: 32 },
        { header: "NIF Receptor", key: "receptor_nif", width: 18 },
        { header: "Base Imponible", key: "base_imponible", width: 15, type: "money" },
        { header: "Tipo IVA", key: "tipo_iva", width: 10 },
        { header: "Cuota IVA", key: "cuota_iva", width: 15, type: "money" },
        { header: "Total", key: "total", width: 15, type: "money" },
        { header: "Moneda", key: "moneda", width: 8 },
        { header: "Estado", key: "estado", width: 13 },
        { header: "Metodo Pago", key: "metodo_pago", width: 16 },
        { header: "Descuento", key: "descuento", width: 12, type: "money" },
        { header: "Retencion", key: "retencion", width: 12, type: "money" },
        { header: "Confianza", key: "confianza_nivel", width: 11 },
        { header: "Requiere Revision", key: "requiere_revision", width: 16 },
      ]
      const rows = facturas.map((f) => ({ ...f, requiere_revision: f.requiere_revision ? "Si" : "No" }))

      const excelBuffer = buildFacturasWorkbookBuffer(APP_NAME, columns, rows)

      return new Response(excelBuffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": 'attachment; filename="facturas.xlsx"',
        },
      })
    }

    const escapeCsv = (value: unknown) => {
      const str = value == null ? "" : String(value)
      // V-25 FIX: Sanitize formula injection characters
      const sanitized = str.replace(/^[\t\r ]*[=+\-@\t\r]/, "'$&".slice(1))
      if (sanitized.includes(",") || sanitized.includes('"') || sanitized.includes("\n")) {
        return `"${sanitized.replace(/"/g, '""')}"`
      }
      return sanitized
    }

    const headers = [
      "ID", "Numero Factura", "Fecha Emision", "Fecha Vencimiento",
      "Emisor", "NIF Emisor", "Receptor", "NIF Receptor",
      "Base Imponible", "Tipo IVA", "Cuota IVA", "Total",
      "Moneda", "Estado", "Metodo Pago", "Descuento", "Retencion",
      "Confianza", "Requiere Revision",
    ]

    const rows = facturas.map((f) =>
      [
        f.id, f.numero_factura, f.fecha_emision, f.fecha_vencimiento,
        f.emisor_nombre, f.emisor_nif, f.receptor_nombre, f.receptor_nif,
        f.base_imponible, f.tipo_iva, f.cuota_iva, f.total,
        f.moneda, f.estado, f.metodo_pago, f.descuento, f.retencion,
        f.confianza_nivel, f.requiere_revision ? "Si" : "No",
      ].map(escapeCsv).join(",")
    )

    const csv = "\uFEFF" + headers.join(",") + "\n" + rows.join("\n")

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="facturas.csv"',
      },
    })
  } catch (error) {
    console.error("Error exporting facturas:", error)
    const { message } = secureErrorResponse(error, "export")
    if (message.includes("No hay negocio")) {
      return new Response(JSON.stringify({ error: "No hay negocio seleccionado" }), { status: 401, headers: { "Content-Type": "application/json" } })
    }
    return new Response(JSON.stringify({ error: "Error al exportar" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
}
