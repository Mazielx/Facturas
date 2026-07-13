import { NextResponse } from "next/server"
import { requireActiveTenant } from "@/lib/tenant"

export async function GET(request: Request) {
  try {
    const { db } = await requireActiveTenant()
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const offset = (page - 1) * limit

    const search = searchParams.get("search") || ""
    const fechaDesde = searchParams.get("fecha_desde") || ""
    const fechaHasta = searchParams.get("fecha_hasta") || ""
    const emisor = searchParams.get("emisor") || ""
    const estado = searchParams.get("estado") || ""
    const moneda = searchParams.get("moneda") || ""
    const confianza = searchParams.get("confianza") || ""
    const revision = searchParams.get("revision") || ""
    const etiqueta = searchParams.get("etiqueta") || ""

    let useFts = false
    let ftsIds: number[] | null = null

    if (search) {
      const ftsExists = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='facturas_fts'"
      ).get()

      if (ftsExists) {
        try {
          const ftsRows = db.prepare(
            "SELECT rowid FROM facturas_fts WHERE facturas_fts MATCH ?"
          ).all(`${search}*`) as Array<{ rowid: number }>
          ftsIds = ftsRows.map((r) => r.rowid)
          useFts = true
        } catch {
          useFts = false
        }
      }
    }

    let whereClause = "WHERE 1=1"
    const params: (string | number)[] = []

    if (useFts && ftsIds !== null) {
      if (ftsIds.length === 0) {
        return NextResponse.json({
          facturas: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        })
      }
      const placeholders = ftsIds.map(() => "?").join(",")
      whereClause += ` AND f.id IN (${placeholders})`
      params.push(...ftsIds)
    } else if (search) {
      whereClause += " AND (f.numero_factura LIKE ? OR f.emisor_nombre LIKE ? OR f.receptor_nombre LIKE ?)"
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }

    if (fechaDesde) {
      whereClause += " AND f.fecha_emision >= ?"
      params.push(fechaDesde)
    }

    if (fechaHasta) {
      whereClause += " AND f.fecha_emision <= ?"
      params.push(fechaHasta)
    }

    if (emisor) {
      whereClause += " AND f.emisor_nombre LIKE ?"
      params.push(`%${emisor}%`)
    }

    if (estado) {
      whereClause += " AND f.estado = ?"
      params.push(estado)
    }

    if (moneda) {
      whereClause += " AND f.moneda = ?"
      params.push(moneda)
    }

    if (confianza) {
      whereClause += " AND f.confianza_nivel = ?"
      params.push(confianza)
    }

    if (revision) {
      whereClause += " AND f.requiere_revision = ?"
      params.push(Number(revision))
    }

    let joinClause = ""
    if (etiqueta) {
      joinClause += " JOIN factura_etiqueta fe ON fe.factura_id = f.id JOIN etiquetas e ON e.id = fe.etiqueta_id"
      whereClause += " AND e.nombre = ?"
      params.push(etiqueta)
    }

    const countQuery = `SELECT COUNT(DISTINCT f.id) as total FROM facturas f ${joinClause} ${whereClause}`
    const { total } = db.prepare(countQuery).get(...params) as { total: number }

    const query = `
      SELECT DISTINCT f.* FROM facturas f ${joinClause} ${whereClause}
      ORDER BY f.fecha_emision DESC
      LIMIT ? OFFSET ?
    `
    const facturas = db.prepare(query).all(...params, limit, offset)

    return NextResponse.json({
      facturas,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching facturas:", error)
    if (error instanceof Error && error.message === "No hay negocio seleccionado") {
      return NextResponse.json({ error: "No hay negocio seleccionado" }, { status: 401 })
    }
    return NextResponse.json(
      { error: "Failed to fetch facturas" },
      { status: 500 }
    )
  }
}
