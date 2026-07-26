import { NextResponse } from "next/server"
import { requireActiveTenant } from "@/lib/tenant"
import { convertCurrency } from "@/lib/currency"
import { dbGet, dbAll } from "@/db/client"
import { ensureSchema } from "@/db"

export async function GET() {
  try {
    const tenant = await requireActiveTenant()
    await ensureSchema()
    const monedaDefault = tenant.negocio?.moneda_default || "MXN"
    const slug = tenant.slug

    const totalFacturas = await dbGet<{ count: number }>(
      "SELECT COUNT(*) as count FROM facturas WHERE negocio_slug = ?",
      { "1": slug }
    )

    const totalImporteRaw = await dbGet<{ sum: number | null }>(
      "SELECT SUM(total) as sum FROM facturas WHERE negocio_slug = ?",
      { "1": slug }
    )

    const totalIvaRaw = await dbGet<{ sum: number | null }>(
      "SELECT SUM(cuota_iva) as sum FROM facturas WHERE negocio_slug = ?",
      { "1": slug }
    )

    const allFacturas = await dbAll<{ total: number; cuota_iva: number; moneda: string }>(
      "SELECT total, cuota_iva, moneda FROM facturas WHERE negocio_slug = ?",
      { "1": slug }
    )
    let totalImporte = 0
    let totalIva = 0
    for (const f of allFacturas) {
      totalImporte += convertCurrency(f.total, f.moneda || "MXN", monedaDefault)
      totalIva += convertCurrency(f.cuota_iva, f.moneda || "MXN", monedaDefault)
    }
    totalImporte = Math.round(totalImporte * 100) / 100
    totalIva = Math.round(totalIva * 100) / 100

    const porEstado = await dbAll<{ estado: string; count: number; sum: number }>(
      `SELECT estado, COUNT(*) as count, SUM(total) as sum
       FROM facturas WHERE negocio_slug = ?
       GROUP BY estado`,
      { "1": slug }
    )

    const porEstadoConverted = []
    for (const e of porEstado) {
      const rows = await dbAll<{ total: number; moneda: string }>(
        "SELECT total, moneda FROM facturas WHERE estado = ? AND negocio_slug = ?",
        { "1": e.estado, "2": slug }
      )
      let sum = 0
      for (const r of rows) {
        sum += convertCurrency(r.total, r.moneda || "MXN", monedaDefault)
      }
      porEstadoConverted.push({ estado: e.estado, count: e.count, sum: Math.round(sum * 100) / 100 })
    }

    const porMoneda = await dbAll<{ moneda: string; count: number; sum: number }>(
      `SELECT moneda, COUNT(*) as count, SUM(total) as sum
       FROM facturas WHERE negocio_slug = ?
       GROUP BY moneda`,
      { "1": slug }
    )

    const porMes = await dbAll<{ mes: string; count: number }>(
      `SELECT
        substr(fecha_emision, 1, 7) as mes,
        COUNT(*) as count
       FROM facturas
       WHERE fecha_emision IS NOT NULL AND negocio_slug = ?
       GROUP BY mes
       ORDER BY mes DESC
       LIMIT 12`,
      { "1": slug }
    )

    const porMesConverted = []
    for (const m of porMes) {
      const rows = await dbAll<{ total: number; moneda: string }>(
        "SELECT total, moneda FROM facturas WHERE substr(fecha_emision, 1, 7) = ? AND negocio_slug = ?",
        { "1": m.mes, "2": slug }
      )
      let sum = 0
      for (const r of rows) {
        sum += convertCurrency(r.total, r.moneda || "MXN", monedaDefault)
      }
      porMesConverted.push({ mes: m.mes, count: m.count, sum: Math.round(sum * 100) / 100 })
    }

    const topEmisores = await dbAll<{ emisor_nombre: string; count: number }>(
      `SELECT emisor_nombre, COUNT(*) as count
       FROM facturas
       WHERE emisor_nombre IS NOT NULL AND negocio_slug = ?
       GROUP BY emisor_nombre
       ORDER BY count DESC
       LIMIT 10`,
      { "1": slug }
    )

    const topEmisoresConverted = []
    for (const e of topEmisores) {
      const rows = await dbAll<{ total: number; moneda: string }>(
        "SELECT total, moneda FROM facturas WHERE emisor_nombre = ? AND negocio_slug = ?",
        { "1": e.emisor_nombre, "2": slug }
      )
      let sum = 0
      for (const r of rows) {
        sum += convertCurrency(r.total, r.moneda || "MXN", monedaDefault)
      }
      topEmisoresConverted.push({ emisor_nombre: e.emisor_nombre, count: e.count, sum: Math.round(sum * 100) / 100 })
    }

    const porConfianza = await dbAll<{ confianza_nivel: string; count: number }>(
      `SELECT confianza_nivel, COUNT(*) as count
       FROM facturas WHERE negocio_slug = ?
       GROUP BY confianza_nivel`,
      { "1": slug }
    )

    const requierenRevision = await dbGet<{ count: number }>(
      "SELECT COUNT(*) as count FROM facturas WHERE requiere_revision = 1 AND negocio_slug = ?",
      { "1": slug }
    )

    const duplicados = await dbGet<{ count: number }>(
      "SELECT COUNT(DISTINCT factura_id) as count FROM duplicados_potenciales WHERE negocio_slug = ?",
      { "1": slug }
    )

    return NextResponse.json({
      moneda: monedaDefault,
      resumen: {
        totalFacturas: totalFacturas?.count ?? 0,
        totalImporte,
        totalIva,
      },
      porEstado: porEstadoConverted,
      porMoneda,
      porMes: porMesConverted,
      topEmisores: topEmisoresConverted,
      porConfianza,
      requierenRevision: requierenRevision?.count ?? 0,
      duplicados: duplicados?.count ?? 0,
    })
  } catch (error) {
    console.error("Error fetching stats:", error)
    if (error instanceof Error && error.message.includes("No hay negocio")) {
      return NextResponse.json({ error: "No hay negocio seleccionado" }, { status: 401 })
    }
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    )
  }
}
