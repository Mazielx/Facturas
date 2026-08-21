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

    if (password.length < 8) {
      return NextResponse.json(
        { error: "La contrasena debe tener al menos 8 caracteres" },
        { status: 400 }
      )
    }

    const existing = await getUsuarioByEmail(email)
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con ese email" },
        { status: 409 }
      )
    }

    const allNegocios = await getAllNegocios()
    const negocioId = allNegocios.length === 1 ? allNegocios[0].id : undefined

    const usuario = await createUsuario(email, password, nombre, "negocio", negocioId)
    const session = await createSession(usuario.id)

    let negocioSlug: string | null = null
    if (allNegocios.length === 1) {
      negocioSlug = allNegocios[0].slug
    }

    const response = NextResponse.json({
      success: true,
      redirectTo: "/dashboard",
      negocioSlug,
      user: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        role: usuario.role,
        negocio_id: usuario.negocio_id,
      },
    })

    const maxAge = 30 * 24 * 60 * 60
    response.cookies.set("session_id", session.id, {
      path: "/",
      maxAge,
      sameSite: "lax",
      secure: true,
      httpOnly: true,
    })

    if (negocioSlug) {
      response.cookies.set("negocio_slug", negocioSlug, {
        path: "/",
        maxAge: 365 * 24 * 60 * 60,
        sameSite: "lax",
        secure: true,
        httpOnly: true,
      })
    }

    return response
  } catch (error) {
    console.error("Register error:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
