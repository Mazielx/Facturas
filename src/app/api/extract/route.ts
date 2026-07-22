import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getOAuth2ClientWithTokens, listEmailsWithAttachments, getAuthFromCuentaCorreo } from "@/lib/gmail"
import { processAttachment } from "@/lib/extraction"
import { requireActiveTenant } from "@/lib/tenant"
import { notifyExtractionErrors } from "@/lib/notifications"
import { getCuentasCorreo, updateCuentaCorreoTokens, getNegocioById } from "@/db"
import type { Credentials } from "google-auth-library"
import { google } from "googleapis"

export async function POST() {
  let db: import("better-sqlite3").Database
  let negocioId: number
  try {
    const tenant = await requireActiveTenant()
    db = tenant.db
    negocioId = tenant.negocio.id
  } catch {
    return NextResponse.json({ error: "No hay negocio seleccionado" }, { status: 401 })
  }

  const cuentas = getCuentasCorreo(negocioId)
  const cookieStore = await cookies()
  const tokensCookie = cookieStore.get("gmail_tokens")

  if (cuentas.length === 0 && !tokensCookie) {
    return NextResponse.json({ error: "No hay cuentas de correo conectadas" }, { status: 401 })
  }

  const allProcessed: Array<{ emailId: string; filename: string; facturaId: number; cuenta: string }> = []
  const allErrors: Array<{ emailId: string; filename: string; error: string; cuenta: string }> = []

  async function processWithAuth(auth: ReturnType<typeof getOAuth2ClientWithTokens>, cuentaEmail: string) {
    let emailList
    try {
      emailList = await listEmailsWithAttachments(auth, 50)
    } catch (gmailError) {
      const msg = gmailError instanceof Error ? gmailError.message : "Error desconocido"
      if (msg.includes("invalid_grant") || msg.includes("Token has been expired or revoked")) {
        allErrors.push({ emailId: "", filename: "", error: "Tokens expirados o revocados", cuenta: cuentaEmail })
        return
      }
      throw gmailError
    }

    if (emailList.emails.length === 0) return

    const gmail = google.gmail({ version: "v1", auth })

    for (const email of emailList.emails) {
      for (const attachment of email.attachments) {
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
            db,
            buffer,
            attachment.filename,
            attachment.mimeType,
            email.id,
            email.subject,
            email.from,
            email.date
          )

          if (extractionResult.success) {
            allProcessed.push({ emailId: email.id, filename: attachment.filename, facturaId: extractionResult.facturaId!, cuenta: cuentaEmail })
          } else {
            allErrors.push({ emailId: email.id, filename: attachment.filename, error: extractionResult.error || "Error desconocido", cuenta: cuentaEmail })
          }
        } catch (error) {
          allErrors.push({ emailId: email.id, filename: attachment.filename, error: error instanceof Error ? error.message : "Error desconocido", cuenta: cuentaEmail })
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
        updateCuentaCorreoTokens(
          cuenta.id,
          credentials.access_token,
          credentials.refresh_token,
          new Date(credentials.expiry_date).toISOString()
        )
      }
    }

    if (cuentas.length === 0 && tokensCookie) {
      const tokens: Credentials = JSON.parse(tokensCookie.value)
      const auth = getOAuth2ClientWithTokens(tokens)
      await processWithAuth(auth, "cuenta_principal")
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
