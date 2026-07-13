import { requireActiveTenant } from "@/lib/tenant"
import * as XLSX from "xlsx"

export async function GET(request: Request) {
  try {
    const { db } = await requireActiveTenant()
    const { searchParams } = new URL(request.url)

    const search = searchParams.get("search") || ""
    const fechaDesde = searchParams.get("fecha_desde") || ""
    const fechaHasta = searchParams.get("fecha_hasta") || ""
    const emisor = searchParams.get("emisor") || ""
    const estado = searchParams.get("estado") || ""
    const moneda = searchParams.get("moneda") || ""
    const format = searchParams.get("format") || "csv"

    let whereClause = "WHERE 1=1"
    const params: (string | number)[] = []

    if (search) {
      whereClause += " AND (numero_factura LIKE ? OR emisor_nombre LIKE ? OR receptor_nombre LIKE ?)"
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }

    if (fechaDesde) {
      whereClause += " AND fecha_emision >= ?"
      params.push(fechaDesde)
    }

    if (fechaHasta) {
      whereClause += " AND fecha_emision <= ?"
      params.push(fechaHasta)
    }

    if (emisor) {
      whereClause += " AND emisor_nombre LIKE ?"
      params.push(`%${emisor}%`)
    }

    if (estado) {
      whereClause += " AND estado = ?"
      params.push(estado)
    }

    if (moneda) {
      whereClause += " AND moneda = ?"
      params.push(moneda)
    }

    const query = `
      SELECT id, numero_factura, fecha_emision, fecha_vencimiento, emisor_nombre,
             emisor_nif, receptor_nombre, receptor_nif, base_imponible, tipo_iva,
             cuota_iva, total, moneda, estado, metodo_pago, descuento, retencion,
             confianza_nivel, requiere_revision
      FROM facturas ${whereClause}
      ORDER BY fecha_emision DESC
    `

    const facturas = db.prepare(query).all(...params) as Record<string, unknown>[]

    if (format === "xlsx") {
      const worksheetData = facturas.map((f) => ({
        ID: f.id,
        "Numero Factura": f.numero_factura,
        "Fecha Emision": f.fecha_emision,
        "Fecha Vencimiento": f.fecha_vencimiento,
        Emisor: f.emisor_nombre,
        "NIF Emisor": f.emisor_nif,
        Receptor: f.receptor_nombre,
        "NIF Receptor": f.receptor_nif,
        "Base Imponible": f.base_imponible,
        "Tipo IVA": f.tipo_iva,
        "Cuota IVA": f.cuota_iva,
        Total: f.total,
        Moneda: f.moneda,
        Estado: f.estado,
        "Metodo Pago": f.metodo_pago,
        Descuento: f.descuento,
        Retencion: f.retencion,
        Confianza: f.confianza_nivel,
        "Requiere Revision": f.requiere_revision ? "Si" : "No",
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

    const escapeCsv = (value: unknown) => {
      const str = value == null ? "" : String(value)
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
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
    if (error instanceof Error && error.message === "No hay negocio seleccionado") {
      return new Response(JSON.stringify({ error: "No hay negocio seleccionado" }), { status: 401, headers: { "Content-Type": "application/json" } })
    }
    return new Response("Error al exportar", { status: 500 })
  }
}
