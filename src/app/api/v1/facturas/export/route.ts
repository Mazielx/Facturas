import { NextRequest } from "next/server"
import { validateApiKey } from "@/lib/api-auth"
import { getTenantDb, getNegocioById } from "@/db"
import * as XLSX from "xlsx"

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

    const negocio = getNegocioById(apiKey.negocio_id)
    if (!negocio) {
      return new Response(JSON.stringify({ error: "Negocio no encontrado" }), { status: 404, headers: { "Content-Type": "application/json" } })
    }

    const db = getTenantDb(negocio.slug)
    const { searchParams } = new URL(req.url)
    const format = searchParams.get("format") || "csv"

    const facturas = db.prepare(`
      SELECT id, numero_factura, fecha_emision, emisor_nombre, emisor_nif,
             receptor_nombre, receptor_nif, base_imponible, tipo_iva,
             cuota_iva, total, moneda, estado, confianza_nivel, requiere_revision
      FROM facturas ORDER BY fecha_emision DESC
    `).all() as Record<string, unknown>[]

    if (format === "xlsx") {
      const worksheetData = facturas.map((f) => ({
        ID: f.id,
        "Numero Factura": f.numero_factura,
        "Fecha Emision": f.fecha_emision,
        Emisor: f.emisor_nombre,
        "NIF Emisor": f.emisor_nif,
        Receptor: f.receptor_nombre,
        "Base Imponible": f.base_imponible,
        "Tipo IVA": f.tipo_iva,
        "Cuota IVA": f.cuota_iva,
        Total: f.total,
        Moneda: f.moneda,
        Estado: f.estado,
      }))
      const worksheet = XLSX.utils.json_to_sheet(worksheetData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Facturas")
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" })

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
