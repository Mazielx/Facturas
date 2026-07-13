import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getOAuth2ClientWithTokens, listEmailsWithAttachments } from "@/lib/gmail"
import { processAttachment } from "@/lib/extraction"
import { requireActiveTenant } from "@/lib/tenant"
import { notifyExtractionErrors } from "@/lib/notifications"
import type { Credentials } from "google-auth-library"
import { google } from "googleapis"

export async function POST() {
  const cookieStore = await cookies()
  const tokensCookie = cookieStore.get("gmail_tokens")

  if (!tokensCookie) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  let db
  try {
    const tenant = await requireActiveTenant()
    db = tenant.db
  } catch {
    return NextResponse.json({ error: "No hay negocio seleccionado" }, { status: 401 })
  }

  try {
    const tokens: Credentials = JSON.parse(tokensCookie.value)
    const auth = getOAuth2ClientWithTokens(tokens)

    const result = await listEmailsWithAttachments(auth, 50)
    const gmail = google.gmail({ version: "v1", auth })

    const processed = []
    const errors = []

    for (const email of result.emails) {
      for (const attachment of email.attachments) {
        try {
          const response = await gmail.users.messages.attachments.get({
            userId: "me",
            messageId: email.id,
            id: attachment.attachmentId,
          })

          const data = response.data.data
          if (!data) continue

          const buffer = Buffer.from(data, "base64url")

          const result = await processAttachment(
            db,
            buffer,
            attachment.filename,
            attachment.mimeType,
            email.id,
            email.subject,
            email.from,
            email.date
          )

          if (result.success) {
            processed.push({
              emailId: email.id,
              filename: attachment.filename,
              facturaId: result.facturaId,
              datos: result.datos,
            })
          } else {
            errors.push({
              emailId: email.id,
              filename: attachment.filename,
              error: result.error,
            })
          }
        } catch (error) {
          errors.push({
            emailId: email.id,
            filename: attachment.filename,
            error: error instanceof Error ? error.message : "Error desconocido",
          })
        }
      }
    }

    if (errors.length > 0) {
      const adminEmail = process.env.ADMIN_EMAIL
      if (adminEmail) {
        await notifyExtractionErrors(adminEmail, errors.map((e) => ({ filename: e.filename, error: e.error || "Error desconocido" }))).catch(() => {})
      }
    }

    return NextResponse.json({
      success: true,
      processed: processed.length,
      errors: errors.length,
      details: { processed, errors },
    })
  } catch (error) {
    console.error("Error extracting invoices:", error)
    return NextResponse.json(
      { error: "Failed to extract invoices" },
      { status: 500 }
    )
  }
}
