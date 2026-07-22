import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getCuentasCorreo, getNegocioById } from "@/db"
import { isEmailInstitucional, getMaxEmailCuentas } from "@/lib/email-validation"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const negocio = getNegocioById(user.negocio_id!)
    if (!negocio) {
      return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })
    }

    const cuentas = getCuentasCorreo(negocio.id)
    const maxCuentas = getMaxEmailCuentas(negocio.plan)

    return NextResponse.json({
      cuentas: cuentas.map((c) => ({
        id: c.id,
        email: c.email,
        profile_photo_url: c.profile_photo_url,
        activa: c.activa,
        created_at: c.created_at,
      })),
      maxCuentas,
      plan: negocio.plan,
    })
  } catch (error) {
    console.error("Error fetching cuentas correo:", error)
    return NextResponse.json({ error: "Error al obtener cuentas" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.negocio_id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const negocio = getNegocioById(user.negocio_id)
    if (!negocio) {
      return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })
    }

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Solo los administradores pueden conectar cuentas" }, { status: 403 })
    }

    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: "Email es requerido" }, { status: 400 })
    }

    if (!isEmailInstitucional(email)) {
      return NextResponse.json(
        { error: "Solo se permiten correos institucionales. No se aceptan Gmail, Yahoo, Outlook, etc." },
        { status: 400 }
      )
    }

    const existing = getCuentasCorreo(negocio.id)
    const maxCuentas = getMaxEmailCuentas(negocio.plan)

    if (existing.length >= maxCuentas) {
      return NextResponse.json(
        { error: `Tu plan ${negocio.plan} permite un maximo de ${maxCuentas} cuenta(s). Actualiza tu plan para conectar mas cuentas.` },
        { status: 400 }
      )
    }

    const duplicate = existing.find((c) => c.email.toLowerCase() === email.toLowerCase())
    if (duplicate) {
      return NextResponse.json({ error: "Este correo ya esta conectado" }, { status: 409 })
    }

    return NextResponse.json({
      authUrl: `/api/auth/cuenta-correo?email=${encodeURIComponent(email)}&negocioId=${negocio.id}`,
    })
  } catch (error) {
    console.error("Error creating cuenta correo:", error)
    return NextResponse.json({ error: "Error al conectar cuenta" }, { status: 500 })
  }
}
