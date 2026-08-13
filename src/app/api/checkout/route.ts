import { NextResponse } from "next/server"
import { requireActiveTenant } from "@/lib/tenant"
import { getPlanById } from "@/lib/plans"
import { createCheckoutSession } from "@/lib/stripe"

export async function POST(request: Request) {
  let tenant: Awaited<ReturnType<typeof requireActiveTenant>>
  try {
    tenant = await requireActiveTenant()
  } catch {
    return NextResponse.json({ error: "No hay negocio seleccionado" }, { status: 401 })
  }

  let body: { planId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo invalido" }, { status: 400 })
  }

  const { planId } = body
  if (!planId || !getPlanById(planId)) {
    return NextResponse.json({ error: "Plan no encontrado" }, { status: 400 })
  }

  try {
    const result = await createCheckoutSession({
      negocioId: tenant.negocio.id,
      planId,
      email: tenant.user.email,
    })
    return NextResponse.json(result)
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error desconocido"
    console.error("Checkout error:", msg)
    if (msg.includes("Stripe no configurado")) {
      return NextResponse.json({ error: "Pagos no configurados" }, { status: 503 })
    }
    return NextResponse.json({ error: "Error al iniciar el pago" }, { status: 500 })
  }
}
