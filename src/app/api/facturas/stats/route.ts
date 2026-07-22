import { NextResponse } from "next/server"
import { requireActiveTenant, getActiveTenant } from "@/lib/tenant"
import { convertCurrency } from "@/lib/currency"

export async function GET() {
  try {
    const { db } = await requireActiveTenant()
    const tenant = await getActiveTenant()
    const monedaDefault = tenant?.negocio?.moneda_default || "MXN"

    const totalFacturas = db.prepare("SELECT COUNT(*) as count FROM facturas").get() as { count: number }
    const totalImporteRaw = db.prepare("SELECT SUM(total) as sum FROM facturas").get() as { sum: number }
    const totalIvaRaw = db.prepare("SELECT SUM(cuota_iva) as sum FROM facturas").get() as { sum: number }

    const allFacturas = db.prepare("SELECT total, cuota_iva, moneda FROM facturas").all() as Array<{ total: number; cuota_iva: number; moneda: string }>
    let totalImporte = 0
    let totalIva = 0
    for (const f of allFacturas) {
      totalImporte += convertCurrency(f.total, f.moneda || "MXN", monedaDefault)
      totalIva += convertCurrency(f.cuota_iva, f.moneda || "MXN", monedaDefault)
    }
    totalImporte = Math.round(totalImporte * 100) / 100
    totalIva = Math.round(totalIva * 100) / 100

    const porEstado = db.prepare(`
      SELECT estado, COUNT(*) as count, SUM(total) as sum
      FROM facturas
      GROUP BY estado
    `).all() as Array<{ estado: string; count: number; sum: number }>

    const porEstadoConverted = porEstado.map((e) => {
      const rows = db.prepare("SELECT total, moneda FROM facturas WHERE estado = ?").all(e.estado) as Array<{ total: number; moneda: string }>
      let sum = 0
      for (const r of rows) {
        sum += convertCurrency(r.total, r.moneda || "MXN", monedaDefault)
      }
      return { estado: e.estado, count: e.count, sum: Math.round(sum * 100) / 100 }
    })

    const porMoneda = db.prepare(`
      SELECT moneda, COUNT(*) as count, SUM(total) as sum
      FROM facturas
      GROUP BY moneda
    `).all() as Array<{ moneda: string; count: number; sum: number }>

    const porMes = db.prepare(`
      SELECT 
        substr(fecha_emision, 1, 7) as mes,
        COUNT(*) as count
      FROM facturas
      WHERE fecha_emision IS NOT NULL
      GROUP BY mes
      ORDER BY mes DESC
      LIMIT 12
    `).all() as Array<{ mes: string; count: number }>

    const porMesConverted = porMes.map((m) => {
      const rows = db.prepare("SELECT total, moneda FROM facturas WHERE substr(fecha_emision, 1, 7) = ?").all(m.mes) as Array<{ total: number; moneda: string }>
      let sum = 0
      for (const r of rows) {
        sum += convertCurrency(r.total, r.moneda || "MXN", monedaDefault)
      }
      return { mes: m.mes, count: m.count, sum: Math.round(sum * 100) / 100 }
    })

    const topEmisores = db.prepare(`
      SELECT emisor_nombre, COUNT(*) as count
      FROM facturas
      WHERE emisor_nombre IS NOT NULL
      GROUP BY emisor_nombre
      ORDER BY count DESC
      LIMIT 10
    `).all() as Array<{ emisor_nombre: string; count: number }>

    const topEmisoresConverted = topEmisores.map((e) => {
      const rows = db.prepare("SELECT total, moneda FROM facturas WHERE emisor_nombre = ?").all(e.emisor_nombre) as Array<{ total: number; moneda: string }>
      let sum = 0
      for (const r of rows) {
        sum += convertCurrency(r.total, r.moneda || "MXN", monedaDefault)
      }
      return { emisor_nombre: e.emisor_nombre, count: e.count, sum: Math.round(sum * 100) / 100 }
    })

    const porConfianza = db.prepare(`
      SELECT confianza_nivel, COUNT(*) as count
      FROM facturas
      GROUP BY confianza_nivel
    `).all() as Array<{ confianza_nivel: string; count: number }>

    const requierenRevision = db.prepare(`
      SELECT COUNT(*) as count FROM facturas WHERE requiere_revision = 1
    `).get() as { count: number }

    const duplicados = db.prepare(`
      SELECT COUNT(DISTINCT factura_id) as count FROM duplicados_potenciales
    `).get() as { count: number }

    return NextResponse.json({
      moneda: monedaDefault,
      resumen: {
        totalFacturas: totalFacturas.count,
        totalImporte,
        totalIva,
      },
      porEstado: porEstadoConverted,
      porMoneda,
      porMes: porMesConverted,
      topEmisores: topEmisoresConverted,
      porConfianza,
      requierenRevision: requierenRevision.count,
      duplicados: duplicados.count,
    })
  } catch (error) {
    console.error("Error fetching stats:", error)
    if (error instanceof Error && error.message === "No hay negocio seleccionado") {
      return NextResponse.json({ error: "No hay negocio seleccionado" }, { status: 401 })
    }
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    )
  }
}
