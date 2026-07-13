import { NextResponse } from "next/server"
import { requireActiveTenant } from "@/lib/tenant"

export async function GET() {
  try {
    const { db } = await requireActiveTenant()

    const totalFacturas = db.prepare("SELECT COUNT(*) as count FROM facturas").get() as { count: number }
    const totalImporte = db.prepare("SELECT SUM(total) as sum FROM facturas").get() as { sum: number }
    const totalIva = db.prepare("SELECT SUM(cuota_iva) as sum FROM facturas").get() as { sum: number }

    const porEstado = db.prepare(`
      SELECT estado, COUNT(*) as count, SUM(total) as sum
      FROM facturas
      GROUP BY estado
    `).all() as Array<{ estado: string; count: number; sum: number }>

    const porMoneda = db.prepare(`
      SELECT moneda, COUNT(*) as count, SUM(total) as sum
      FROM facturas
      GROUP BY moneda
    `).all() as Array<{ moneda: string; count: number; sum: number }>

    const porMes = db.prepare(`
      SELECT 
        substr(fecha_emision, 1, 7) as mes,
        COUNT(*) as count,
        SUM(total) as sum
      FROM facturas
      WHERE fecha_emision IS NOT NULL
      GROUP BY mes
      ORDER BY mes DESC
      LIMIT 12
    `).all() as Array<{ mes: string; count: number; sum: number }>

    const topEmisores = db.prepare(`
      SELECT emisor_nombre, COUNT(*) as count, SUM(total) as sum
      FROM facturas
      WHERE emisor_nombre IS NOT NULL
      GROUP BY emisor_nombre
      ORDER BY sum DESC
      LIMIT 10
    `).all() as Array<{ emisor_nombre: string; count: number; sum: number }>

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
      resumen: {
        totalFacturas: totalFacturas.count,
        totalImporte: totalImporte.sum || 0,
        totalIva: totalIva.sum || 0,
      },
      porEstado,
      porMoneda,
      porMes,
      topEmisores,
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
