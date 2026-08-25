import { NextResponse } from "next/server"
import { listEmailsWithAttachments, getAuthFromCuentaCorreo } from "@/lib/gmail"
import { getCuentasCorreo, updateCuentaCorreoTokens } from "@/db"
import { requireActiveTenant } from "@/lib/tenant"
import { getCurrentUser } from "@/lib/auth"
import { isAccesoCompleto } from "@/lib/paywall"
import type { EmailListResponse } from "@/lib/types"
import { safeLogError } from "@/lib/security"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json<EmailListResponse>(
      { emails: [], error: "No autenticado" },
      { status: 401 }
    )
  }

  let tenant
  try {
    tenant = await requireActiveTenant()
  } catch {
    return NextResponse.json<EmailListResponse>(
      { emails: [], error: "No hay negocio seleccionado" },
      { status: 401 }
    )
  }

  if (!isAccesoCompleto({ email: tenant.user.email, role: tenant.user.role, planPagadoHasta: tenant.negocio.plan_pagado_hasta })) {
    return NextResponse.json(
      { emails: [], error: "Se requiere un plan activo" },
      { status: 402 }
    )
  }

  const cuentas = await getCuentasCorreo(tenant.negocio.id)
  if (cuentas.length === 0) {
    return NextResponse.json<EmailListResponse>(
      { emails: [], error: "No hay cuentas de correo conectadas" },
      { status: 401 }
    )
  }

  const allEmails: EmailListResponse["emails"] = []

  for (const cuenta of cuentas) {
    try {
      const auth = getAuthFromCuentaCorreo(cuenta)
      const result = await listEmailsWithAttachments(auth)

      const credentials = auth.credentials
      if (credentials.access_token && credentials.refresh_token && credentials.expiry_date) {
        await updateCuentaCorreoTokens(
          cuenta.id,
          credentials.access_token,
          credentials.refresh_token,
          new Date(credentials.expiry_date).toISOString()
        )
      }

      for (const email of result.emails) {
        allEmails.push({ ...email, from: `${cuenta.email}: ${email.from}` })
      }
    } catch (err) {
      safeLogError("emails_fetch_cuenta", err)
    }
  }

  return NextResponse.json<EmailListResponse>({ emails: allEmails })
}
