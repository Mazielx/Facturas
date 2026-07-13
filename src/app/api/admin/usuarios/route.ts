import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getAllUsuarios, createUsuario, updateUsuario, deleteUsuario, getUsuarioByEmail } from "@/db"
import { hashPassword } from "@/lib/auth"

export async function GET() {
  try {
    await requireAdmin()
    const usuarios = getAllUsuarios()
    return NextResponse.json(usuarios)
  } catch (error) {
    if (error instanceof Error && error.message === "No autenticado") {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "No autorizado") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }
    console.error("Error getting usuarios:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
    const body = await req.json()
    const { email, password, nombre, role, negocio_id } = body

    if (!email || !password || !nombre) {
      return NextResponse.json(
        { error: "Email, contrasena y nombre son requeridos" },
        { status: 400 }
      )
    }

    const existingUser = getUsuarioByEmail(email)
    if (existingUser) {
      return NextResponse.json(
        { error: "El email ya esta registrado" },
        { status: 409 }
      )
    }

    const passwordHash = await hashPassword(password)
    const nuevoUsuario = createUsuario(email, passwordHash, nombre, role || "negocio", negocio_id)

    return NextResponse.json(nuevoUsuario, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === "No autenticado") {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "No autorizado") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }
    console.error("Error creating usuario:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin()
    const body = await req.json()
    const { id, email, nombre, role, negocio_id, activo } = body

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 })
    }

    if (email) {
      const existing = getUsuarioByEmail(email)
      if (existing && existing.id !== id) {
        return NextResponse.json(
          { error: "El email ya esta registrado" },
          { status: 409 }
        )
      }
    }

    updateUsuario(id, { email, nombre, role, negocio_id, activo })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === "No autenticado") {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "No autorizado") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }
    console.error("Error updating usuario:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
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

    deleteUsuario(Number(id))
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === "No autenticado") {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "No autorizado") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }
    console.error("Error deleting usuario:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
