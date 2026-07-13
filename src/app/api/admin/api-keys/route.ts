import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { createApiKey, getApiKeysByNegocio, deleteApiKey, toggleApiKey } from "@/lib/api-auth"
import { getAllNegocios } from "@/db"

export async function GET() {
  try {
    await requireAdmin()
    const negocios = getAllNegocios()

    const allKeys = negocios.flatMap((n) => {
      const keys = getApiKeysByNegocio(n.id)
      return keys.map((k) => ({
        ...k,
        negocio_nombre: n.nombre,
        key_prefix: k.key_prefix + "****",
      }))
    })

    return NextResponse.json(allKeys)
  } catch (error) {
    console.error("Error fetching API keys:", error)
    if (error instanceof Error && error.message === "No autenticado") {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "No autorizado") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
    const body = await req.json()
    const { negocio_id, nombre, permisos } = body

    if (!negocio_id || !nombre) {
      return NextResponse.json(
        { error: "negocio_id y nombre son requeridos" },
        { status: 400 }
      )
    }

    const { key, apiKey } = createApiKey(negocio_id, nombre, permisos || "read")

    return NextResponse.json({
      ...apiKey,
      key,
      key_preview: key.substring(0, 11) + "****",
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating API key:", error)
    if (error instanceof Error && error.message === "No autenticado") {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "No autorizado") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 })
    }

    deleteApiKey(Number(id))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting API key:", error)
    if (error instanceof Error && error.message === "No autenticado") {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "No autorizado") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin()
    const body = await req.json()
    const { id, activa } = body

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 })
    }

    toggleApiKey(id, activa)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error toggling API key:", error)
    if (error instanceof Error && error.message === "No autenticado") {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "No autorizado") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
