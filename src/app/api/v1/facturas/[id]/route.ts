import { NextRequest, NextResponse } from "next/server"
import { validateApiKey } from "@/lib/api-auth"
import { getTenantDb, getNegocioById } from "@/db"

async function authApi(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }
  const key = authHeader.substring(7)
  return validateApiKey(key)
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const apiKey = await authApi(req)
    if (!apiKey) {
      return NextResponse.json({ error: "API key invalida" }, { status: 401 })
    }

    const negocio = getNegocioById(apiKey.negocio_id)
    if (!negocio) {
      return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })
    }

    const db = getTenantDb(negocio.slug)
    const { id } = await params

    const factura = db.prepare("SELECT * FROM facturas WHERE id = ?").get(Number(id))

    if (!factura) {
      return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 })
    }

    const lineas = db.prepare("SELECT * FROM lineas_factura WHERE factura_id = ?").all(Number(id))

    return NextResponse.json({ ...factura, lineas })
  } catch (error) {
    console.error("API v1 error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const apiKey = await authApi(req)
    if (!apiKey) {
      return NextResponse.json({ error: "API key invalida" }, { status: 401 })
    }

    if (!apiKey.permisos.includes("write")) {
      return NextResponse.json({ error: "Sin permisos de escritura" }, { status: 403 })
    }

    const negocio = getNegocioById(apiKey.negocio_id)
    if (!negocio) {
      return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })
    }

    const db = getTenantDb(negocio.slug)
    const { id } = await params

    db.prepare("DELETE FROM facturas WHERE id = ?").run(Number(id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("API v1 error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
