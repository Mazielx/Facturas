import { NextResponse } from "next/server"
import { requireActiveTenant } from "@/lib/tenant"
import { convertCurrency } from "@/lib/currency"
import { dbGet, dbAll } from "@/db/client"
import { ensureSchema } from "@/db"
import { isAccesoCompleto } from "@/lib/paywall"

export async function GET(request: Request) {
  try {
    const tenant = await requireActiveTenant()
    await ensureSchema()
    if (!isAccesoCompleto({ email: tenant.user.email, role: tenant.user.role, planPagadoHasta: tenant.negocio.plan_pagado_hasta })) {
      return NextResponse.json({ error: "Se requiere un plan activo para ver las facturas" }, { status: 402 })
    }
    const monedaDefault = tenant.negocio?.moneda_default || "MXN"
    const { searchParams } = new URL(request.url)

    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20") || 20))
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
      const ftsExists = await dbGet(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='facturas_fts'"
      )

      if (ftsExists) {
        try {
          const ftsRows = await dbAll<{ rowid: number }>(
            "SELECT rowid FROM facturas_fts WHERE facturas_fts MATCH ?",
            { "1": `${search}*` }
          )
          ftsIds = ftsRows.map((r) => r.rowid)
          useFts = true
        } catch {
          useFts = false
        }
      }
    }

    let whereClause = "WHERE f.negocio_slug = ?"
    const args: Record<string, unknown> = { "1": tenant.slug }
    let paramIdx = 2

    if (useFts && ftsIds !== null) {
      if (ftsIds.length === 0) {
        return NextResponse.json({
          facturas: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        })
      }
      const placeholders = ftsIds.map(() => "?").join(",")
      whereClause += ` AND f.id IN (${placeholders})`
      for (const id of ftsIds) {
        args[String(paramIdx++)] = id
      }
    } else if (search) {
      whereClause += " AND (f.numero_factura LIKE ? OR f.emisor_nombre LIKE ? OR f.receptor_nombre LIKE ?)"
      args[String(paramIdx++)] = `%${search}%`
      args[String(paramIdx++)] = `%${search}%`
      args[String(paramIdx++)] = `%${search}%`
    }

    if (fechaDesde) {
      whereClause += " AND f.fecha_emision >= ?"
      args[String(paramIdx++)] = fechaDesde
    }

    if (fechaHasta) {
      whereClause += " AND f.fecha_emision <= ?"
      args[String(paramIdx++)] = fechaHasta
    }

    if (emisor) {
      whereClause += " AND f.emisor_nombre LIKE ?"
      args[String(paramIdx++)] = `%${emisor}%`
    }

    if (estado) {
      whereClause += " AND f.estado = ?"
      args[String(paramIdx++)] = estado
    }

    if (moneda) {
      whereClause += " AND f.moneda = ?"
      args[String(paramIdx++)] = moneda
    }

    if (confianza) {
      whereClause += " AND f.confianza_nivel = ?"
      args[String(paramIdx++)] = confianza
    }

    if (revision) {
      whereClause += " AND f.requiere_revision = ?"
      args[String(paramIdx++)] = Number(revision)
    }

    let joinClause = ""
    if (etiqueta) {
      joinClause += " JOIN factura_etiqueta fe ON fe.factura_id = f.id JOIN etiquetas e ON e.id = fe.etiqueta_id"
      whereClause += " AND e.nombre = ?"
      args[String(paramIdx++)] = etiqueta
    }

    const countQuery = `SELECT COUNT(DISTINCT f.id) as total FROM facturas f ${joinClause} ${whereClause}`
    const countResult = await dbGet<{ total: number }>(countQuery, { ...args })
    const total = countResult?.total ?? 0

    args[String(paramIdx++)] = limit
    args[String(paramIdx++)] = offset

    const query = `
      SELECT DISTINCT f.* FROM facturas f ${joinClause} ${whereClause}
      ORDER BY f.fecha_emision DESC
      LIMIT ? OFFSET ?
    `
    const facturasRaw = await dbAll(query, args)

    const facturas = facturasRaw.map((f) => {
      const originalCurrency = (f.moneda as string) || "MXN"
      return {
        ...f,
        total_original: f.total,
        moneda_original: originalCurrency,
        total_convertido: Math.round(convertCurrency(f.total as number, originalCurrency, monedaDefault) * 100) / 100,
        moneda_default: monedaDefault,
      }
    })

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
    if (error instanceof Error && error.message.includes("No hay negocio")) {
      return NextResponse.json({ error: "No hay negocio seleccionado" }, { status: 401 })
    }
    return NextResponse.json(
      { error: "Failed to fetch facturas" },
      { status: 500 }
    )
  }
}
