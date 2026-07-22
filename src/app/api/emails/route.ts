import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getOAuth2ClientWithTokens, listEmailsWithAttachments, getAuthFromCuentaCorreo } from "@/lib/gmail"
import { getCuentasCorreo, updateCuentaCorreoTokens, getNegocioById } from "@/db"
import { requireActiveTenant } from "@/lib/tenant"
import type { Credentials } from "google-auth-library"
import type { EmailListResponse } from "@/lib/types"

export async function GET() {
  let negocioId: number | null = null
  try {
    const tenant = await requireActiveTenant()
    negocioId = tenant.negocio.id
  } catch {
    // no business selected
  }

  if (negocioId) {
    const cuentas = getCuentasCorreo(negocioId)
    if (cuentas.length > 0) {
      const allEmails: EmailListResponse["emails"] = []

      for (const cuenta of cuentas) {
        try {
          const auth = getAuthFromCuentaCorreo(cuenta)
          const result = await listEmailsWithAttachments(auth)

          const credentials = auth.credentials
          if (credentials.access_token && credentials.refresh_token && credentials.expiry_date) {
            updateCuentaCorreoTokens(
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
          console.error(`Error fetching emails for ${cuenta.email}:`, err)
        }
      }

      return NextResponse.json<EmailListResponse>({ emails: allEmails })
    }
  }

  const cookieStore = await cookies()
  const tokensCookie = cookieStore.get("gmail_tokens")

  if (!tokensCookie) {
    return NextResponse.json<EmailListResponse>(
      { emails: [], error: "Not authenticated" },
      { status: 401 }
    )
  }

  try {
    const tokens: Credentials = JSON.parse(tokensCookie.value)
    const auth = getOAuth2ClientWithTokens(tokens)

    let refreshedTokens: Credentials | null = null
    auth.on("tokens", (newTokens) => {
      refreshedTokens = { ...tokens, ...newTokens }
    })

    const result = await listEmailsWithAttachments(auth)

    const response = NextResponse.json<EmailListResponse>({ emails: result.emails })

    if (refreshedTokens) {
      response.headers.set("X-Refreshed-Tokens", JSON.stringify(refreshedTokens))
    }

    return response
  } catch (err) {
    console.error("Error fetching emails:", err)
    return NextResponse.json<EmailListResponse>(
      { emails: [], error: "Failed to fetch emails" },
      { status: 500 }
    )
  }
}
