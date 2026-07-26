import { NextRequest, NextResponse } from "next/server"
import { validateApiKey } from "@/lib/api-auth"
import { getNegocioById } from "@/db"
import { dbGet, dbAll, dbRun } from "@/db/client"

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

    const negocio = await getNegocioById(apiKey.negocio_id)
    if (!negocio) {
      return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })
    }

    const { id } = await params

    const factura = await dbGet(
      "SELECT * FROM facturas WHERE id = ? AND negocio_slug = ?",
      { "1": Number(id), "2": negocio.slug }
    )

    if (!factura) {
      return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 })
    }

    const lineas = await dbAll(
      "SELECT * FROM lineas_factura WHERE factura_id = ?",
      { "1": Number(id) }
    )

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

    const negocio = await getNegocioById(apiKey.negocio_id)
    if (!negocio) {
      return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })
    }

    const { id } = await params

    await dbRun(
      "DELETE FROM facturas WHERE id = ? AND negocio_slug = ?",
      { "1": Number(id), "2": negocio.slug }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("API v1 error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
