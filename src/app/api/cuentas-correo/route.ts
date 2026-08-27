import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/tenant"
import { getCuentasCorreo, getNegocioById } from "@/db"
import { isEmailInstitucional } from "@/lib/email-validation"
import { isAccesoCompleto, maxCuentasCorreo } from "@/lib/paywall"
import { safeLogError } from "@/lib/security"

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const negocio = await getNegocioById(user.negocio_id!)
    if (!negocio) {
      return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })
    }

    const accesoCompleto = isAccesoCompleto({ email: user.email, role: user.role, planPagadoHasta: negocio.plan_pagado_hasta })

    if (!accesoCompleto) {
      return NextResponse.json(
        { error: "Se requiere un plan activo para ver las cuentas de correo" },
        { status: 402 }
      )
    }

    const cuentas = await getCuentasCorreo(negocio.id)
    const maxCuentas = maxCuentasCorreo(user, negocio.plan)

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
      planActivo: accesoCompleto,
    })
  } catch (error) {
    safeLogError("cuentas_correo_list", error)
    return NextResponse.json({ error: "Error al obtener cuentas" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request)
    if (!user || !user.negocio_id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const negocio = await getNegocioById(user.negocio_id)
    if (!negocio) {
      return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })
    }

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Solo los administradores pueden conectar cuentas" }, { status: 403 })
    }

    if (!isAccesoCompleto({ email: user.email, role: user.role, planPagadoHasta: negocio.plan_pagado_hasta })) {
      return NextResponse.json(
        { error: "Se requiere un plan activo para conectar cuentas de correo" },
        { status: 402 }
      )
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

    const existing = await getCuentasCorreo(negocio.id)
    const maxCuentas = maxCuentasCorreo(user, negocio.plan)

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
    safeLogError("cuentas_correo_create", error)
    return NextResponse.json({ error: "Error al conectar cuenta" }, { status: 500 })
  }
}
