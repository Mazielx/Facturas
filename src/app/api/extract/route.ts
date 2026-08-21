import { NextResponse } from "next/server"
import { listEmailsWithAttachments, getAuthFromCuentaCorreo } from "@/lib/gmail"
import { processAttachment } from "@/lib/extraction"
import { requireActiveTenant } from "@/lib/tenant"
import { notifyExtractionErrors } from "@/lib/notifications"
import { getCuentasCorreo, updateCuentaCorreoTokens } from "@/db"
import { isAccesoCompleto } from "@/lib/paywall"
import { google } from "googleapis"

export async function POST() {
  let tenant: Awaited<ReturnType<typeof requireActiveTenant>>
  try {
    tenant = await requireActiveTenant()
  } catch {
    return NextResponse.json({ error: "No hay negocio seleccionado" }, { status: 401 })
  }

  if (!isAccesoCompleto({ email: tenant.user.email, role: tenant.user.role, planPagadoHasta: tenant.negocio.plan_pagado_hasta })) {
    return NextResponse.json(
      { error: "Se requiere un plan activo para extraer facturas" },
      { status: 402 }
    )
  }

  const slug = tenant.slug
  const negocioId = tenant.negocio.id
  const cuentas = await getCuentasCorreo(negocioId)

  if (cuentas.length === 0) {
    return NextResponse.json({ error: "No hay cuentas de correo conectadas" }, { status: 401 })
  }

  const allProcessed: Array<{ emailId: string; filename: string; facturaId: number; cuenta: string }> = []
  const allErrors: Array<{ emailId: string; filename: string; error: string; cuenta: string }> = []

  console.log("EXTRACT_START:", { slug, cuentaCount: cuentas.length })

  async function processWithAuth(auth: ReturnType<typeof getAuthFromCuentaCorreo>, cuentaEmail: string) {
    let emailList
    try {
      emailList = await listEmailsWithAttachments(auth, 50)
    } catch (gmailError) {
      const msg = gmailError instanceof Error ? gmailError.message : "Error desconocido"
      console.error(`Gmail list error [${cuentaEmail}]:`, msg)
      if (msg.includes("invalid_grant") || msg.includes("Token has been expired or revoked")) {
        allErrors.push({ emailId: "", filename: "", error: "Tokens expirados o revocados", cuenta: cuentaEmail })
        return
      }
      throw gmailError
    }

    if (emailList.emails.length === 0) return

    const gmail = google.gmail({ version: "v1", auth })

    for (const email of emailList.emails) {
      const xmlAttachments = email.attachments.filter(
        (a) => a.filename.toLowerCase().endsWith(".xml") || a.mimeType?.includes("xml")
      )
      const pdfAttachments = email.attachments.filter(
        (a) => a.filename.toLowerCase().endsWith(".pdf") || a.mimeType?.includes("pdf")
      )

      if (xmlAttachments.length === 0 || pdfAttachments.length === 0 || email.totalAttachmentCount !== 2) {
        console.log(`SKIP email ${email.id}: ${email.totalAttachmentCount} adjuntos totales (xml=${xmlAttachments.length}, pdf=${pdfAttachments.length})`)
        continue
      }

      const attachment = xmlAttachments[0]
      {
        try {
          const response = await gmail.users.messages.attachments.get({
            userId: "me",
            messageId: email.id,
            id: attachment.attachmentId,
          })

          const data = response.data.data
          if (!data) {
            allErrors.push({ emailId: email.id, filename: attachment.filename, error: "Datos de adjunto vacios", cuenta: cuentaEmail })
            continue
          }

          const buffer = Buffer.from(data, "base64url")

          const extractionResult = await processAttachment(
            buffer,
            attachment.filename,
            attachment.mimeType,
            email.id,
            email.subject,
            email.from,
            email.date,
            slug
          )

          if (extractionResult.success) {
            allProcessed.push({ emailId: email.id, filename: attachment.filename, facturaId: extractionResult.facturaId!, cuenta: cuentaEmail })
          } else {
            allErrors.push({ emailId: email.id, filename: attachment.filename, error: extractionResult.error || "Error desconocido", cuenta: cuentaEmail })
          }
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : "Error desconocido"
          console.error(`Extract error [${email.id}/${attachment.filename}]:`, errMsg)
          allErrors.push({ emailId: email.id, filename: attachment.filename, error: errMsg, cuenta: cuentaEmail })
        }
      }
    }
  }

  try {
    for (const cuenta of cuentas) {
      const auth = getAuthFromCuentaCorreo(cuenta)
      await processWithAuth(auth, cuenta.email)

      const credentials = auth.credentials
      if (credentials.access_token && credentials.refresh_token && credentials.expiry_date) {
        await updateCuentaCorreoTokens(
          cuenta.id,
          credentials.access_token,
          credentials.refresh_token,
          new Date(credentials.expiry_date).toISOString()
        )
      }
    }

    if (allErrors.length > 0) {
      const adminEmail = process.env.ADMIN_EMAIL
      if (adminEmail) {
        await notifyExtractionErrors(
          adminEmail,
          allErrors.map((e) => ({ filename: e.filename, error: e.error }))
        ).catch(() => {})
      }
    }

    console.log("EXTRACT_RESULT:", JSON.stringify({ processed: allProcessed.length, errors: allErrors.length, errorDetails: allErrors }))

    return NextResponse.json({
      success: true,
      processed: allProcessed.length,
      errors: allErrors.length,
      details: { processed: allProcessed, errors: allErrors },
    })
  } catch (error) {
    console.error("Error extracting invoices:", error)
    const message = error instanceof Error ? error.message : "Error desconocido"
    if (message.includes("invalid_grant") || message.includes("Token has been expired or revoked")) {
      return NextResponse.json(
        { error: "Gmail tokens expirados o revocados" },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: "Error al extraer facturas" },
      { status: 500 }
    )
  }
}
