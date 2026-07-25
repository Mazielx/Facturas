import { NextRequest, NextResponse } from "next/server"
import { verifyPassword, createSession, getUsuarioByEmail, createUsuario as authCreateUsuario } from "@/lib/auth"
import { getAllNegocios, createNegocio } from "@/db"

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

    let usuario = getUsuarioByEmail(email)

    if (!usuario) {
      const adminEmail = process.env.ADMIN_EMAIL
      const adminPassword = process.env.ADMIN_PASSWORD
      const adminNombre = process.env.ADMIN_NOMBRE || "Admin"

      if (email === adminEmail && password === adminPassword) {
        const allNegocios = getAllNegocios()
        let negocioId: number
        if (allNegocios.length > 0) {
          negocioId = allNegocios[0].id
        } else {
          const neg = createNegocio("Mi Empresa", "mi-empresa", email)
          negocioId = neg.id
        }
        usuario = await authCreateUsuario(email, password, adminNombre, "admin", negocioId) as any
        console.log(`[login] Auto-created admin user: ${email}`)
      } else {
        return NextResponse.json(
          { error: "Credenciales invalidas" },
          { status: 401 }
        )
      }
    }

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
    console.error("Login error:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
