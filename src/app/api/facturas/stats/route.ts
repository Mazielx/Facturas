import { NextResponse } from "next/server"
import { requireActiveTenant } from "@/lib/tenant"
import { convertCurrency } from "@/lib/currency"
import { dbGet, dbAll } from "@/db/client"
import { ensureSchema } from "@/db"
import { isAccesoCompleto } from "@/lib/paywall"
import { safeLogError } from "@/lib/security"

interface FacturaRow {
  total: number
  cuota_iva: number
  moneda: string
  estado: string
  fecha_emision: string | null
  emisor_nombre: string | null
  confianza_nivel: string
  requiere_revision: number
}

export async function GET() {
  try {
    const tenant = await requireActiveTenant()
    await ensureSchema()
    if (!isAccesoCompleto({ email: tenant.user.email, role: tenant.user.role, planPagadoHasta: tenant.negocio.plan_pagado_hasta })) {
      return NextResponse.json({ error: "Se requiere un plan activo para ver las estadisticas" }, { status: 402 })
    }
    const monedaDefault = tenant.negocio?.moneda_default || "MXN"
    const slug = tenant.slug

    // Zoldyck FIX: Replace N+1 (36 queries) with a single query
    // Fetch ALL facturas once, then group in JavaScript
    const allFacturas = await dbAll<FacturaRow>(
      `SELECT total, cuota_iva, moneda, estado, fecha_emision, emisor_nombre,
              confianza_nivel, requiere_revision
       FROM facturas WHERE negocio_slug = ?`,
      { "1": slug }
    )

    // Compute totals with currency conversion
    let totalImporte = 0
    let totalIva = 0
    const estadoMap = new Map<string, { count: number; sum: number }>()
    const mesMap = new Map<string, { count: number; sum: number }>()
    const emisorMap = new Map<string, { count: number; sum: number }>()
    const monedaMap = new Map<string, { count: number; sum: number }>()
    const confianzaMap = new Map<string, number>()
    let requierenRevision = 0

    for (const f of allFacturas) {
      const convertedTotal = convertCurrency(f.total, f.moneda || "MXN", monedaDefault)
      const convertedIva = convertCurrency(f.cuota_iva, f.moneda || "MXN", monedaDefault)
      totalImporte += convertedTotal
      totalIva += convertedIva

      // porEstado
      const es = f.estado || "pendiente"
      const eEntry = estadoMap.get(es) || { count: 0, sum: 0 }
      eEntry.count++
      eEntry.sum += convertedTotal
      estadoMap.set(es, eEntry)

      // porMes
      if (f.fecha_emision) {
        const mes = f.fecha_emision.substring(0, 7)
        const mEntry = mesMap.get(mes) || { count: 0, sum: 0 }
        mEntry.count++
        mEntry.sum += convertedTotal
        mesMap.set(mes, mEntry)
      }

      // topEmisores
      if (f.emisor_nombre) {
        const emEntry = emisorMap.get(f.emisor_nombre) || { count: 0, sum: 0 }
        emEntry.count++
        emEntry.sum += convertedTotal
        emisorMap.set(f.emisor_nombre, emEntry)
      }

      // porMoneda
      const mon = f.moneda || "MXN"
      const monEntry = monedaMap.get(mon) || { count: 0, sum: 0 }
      monEntry.count++
      monEntry.sum += f.total // keep in original currency
      monedaMap.set(mon, monEntry)

      // porConfianza
      const cn = f.confianza_nivel || "sin_clasificar"
      confianzaMap.set(cn, (confianzaMap.get(cn) || 0) + 1)

      // requierenRevision
      if (f.requiere_revision) requierenRevision++
    }

    // Build response — convert maps to sorted arrays
    const porMes = Array.from(mesMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 12)
      .map(([mes, v]) => ({ mes, count: v.count, sum: Math.round(v.sum * 100) / 100 }))

    const topEmisores = Array.from(emisorMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([emisor_nombre, v]) => ({ emisor_nombre, count: v.count, sum: Math.round(v.sum * 100) / 100 }))

    const porEstado = Array.from(estadoMap.entries()).map(([estado, v]) => ({
      estado, count: v.count, sum: Math.round(v.sum * 100) / 100,
    }))

    const porMoneda = Array.from(monedaMap.entries()).map(([moneda, v]) => ({
      moneda, count: v.count, sum: Math.round(v.sum * 100) / 100,
    }))

    const porConfianza = Array.from(confianzaMap.entries()).map(([confianza_nivel, count]) => ({
      confianza_nivel, count,
    }))

    const duplicados = await dbGet<{ count: number }>(
      "SELECT COUNT(DISTINCT dp.factura_id) as count FROM duplicados_potenciales dp JOIN facturas f ON dp.factura_id = f.id WHERE f.negocio_slug = ?",
      { "1": slug }
    )

    return NextResponse.json({
      moneda: monedaDefault,
      resumen: {
        totalFacturas: allFacturas.length,
        totalImporte: Math.round(totalImporte * 100) / 100,
        totalIva: Math.round(totalIva * 100) / 100,
      },
      porEstado,
      porMoneda,
      porMes,
      topEmisores,
      porConfianza,
      requierenRevision,
      duplicados: duplicados?.count ?? 0,
    })
  } catch (error) {
    safeLogError("facturas_stats", error)
    if (error instanceof Error && error.message.includes("No hay negocio")) {
      return NextResponse.json({ error: "No hay negocio seleccionado" }, { status: 401 })
    }
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    )
  }
}
