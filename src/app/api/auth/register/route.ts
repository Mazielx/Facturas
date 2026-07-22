import { NextRequest, NextResponse } from "next/server"
import { createUsuario, getUsuarioByEmail, createSession } from "@/lib/auth"
import { getAllNegocios } from "@/db"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, nombre } = body

    if (!email || !password || !nombre) {
      return NextResponse.json(
        { error: "Email, contrasena y nombre son requeridos" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contrasena debe tener al menos 6 caracteres" },
        { status: 400 }
      )
    }

    const existing = getUsuarioByEmail(email)
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con ese email" },
        { status: 409 }
      )
    }

    const usuario = await createUsuario(email, password, nombre, "negocio")
    const session = createSession(usuario.id)

    let negocioSlug: string | null = null
    const allNegocios = getAllNegocios()
    if (allNegocios.length === 1) {
      negocioSlug = allNegocios[0].slug
    }

    return NextResponse.json({
      success: true,
      redirectTo: "/",
      sessionId: session.id,
      negocioSlug,
      user: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        role: usuario.role,
        negocio_id: usuario.negocio_id,
      },
    })
  } catch (error) {
    console.error("Register error:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
