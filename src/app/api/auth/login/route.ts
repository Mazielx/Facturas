import { NextRequest, NextResponse } from "next/server"
import { verifyPassword, createSession, getUsuarioByEmail } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contrasena son requeridos" },
        { status: 400 }
      )
    }

    const usuario = getUsuarioByEmail(email)

    if (!usuario) {
      return NextResponse.json(
        { error: "Credenciales invalidas" },
        { status: 401 }
      )
    }

    if (!usuario.activo) {
      return NextResponse.json(
        { error: "Usuario desactivado" },
        { status: 401 }
      )
    }

    const validPassword = await verifyPassword(password, usuario.password_hash)

    if (!validPassword) {
      return NextResponse.json(
        { error: "Credenciales invalidas" },
        { status: 401 }
      )
    }

    const session = createSession(usuario.id)

    const redirectTo = usuario.role === "admin" ? "/admin" : "/"
    const response = NextResponse.json({
      success: true,
      redirectTo,
      user: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        role: usuario.role,
        negocio_id: usuario.negocio_id,
      },
    })

    response.cookies.set("session_id", session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    })

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
