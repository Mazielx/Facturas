import { getTokensFromCode, getGoogleUserInfo } from "@/lib/gmail"
import { getCurrentUser } from "@/lib/auth"
import { createCuentaCorreo, getCuentaCorreoByEmail } from "@/db"
import { dbRun } from "@/db/client"
import { verifyOAuthState } from "@/lib/oauth-state"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")
  const state = searchParams.get("state") || ""

  if (error || !code) {
    return NextResponse.redirect(new URL("/?error=auth_denied", request.url))
  }

  try {
    const tokens = await getTokensFromCode(code)

    const verifiedState = verifyOAuthState(state)

    if (verifiedState) {
      if (tokens.access_token && tokens.refresh_token) {
        const googleInfo = await getGoogleUserInfo(tokens.access_token)
        const email = googleInfo?.email || verifiedState.email
        const photoUrl = googleInfo?.picture || null
        const tokenExpiry = tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null

        const existing = await getCuentaCorreoByEmail(verifiedState.negocioId, email)
        if (existing) {
          await dbRun(
            "UPDATE cuentas_correo SET access_token = ?, refresh_token = ?, token_expiry = ?, profile_photo_url = ?, updated_at = datetime('now') WHERE id = ?",
            { "1": tokens.access_token, "2": tokens.refresh_token, "3": tokenExpiry, "4": photoUrl, "5": existing.id }
          )
        } else {
          await createCuentaCorreo(verifiedState.negocioId, email, tokens.access_token, tokens.refresh_token, tokenExpiry || "", photoUrl || undefined)
        }
      }

      return NextResponse.redirect(new URL("/empresa?msg=cuenta_conectada", request.url))
    }

    const user = await getCurrentUser()
    if (user && tokens.access_token) {
      const googleInfo = await getGoogleUserInfo(tokens.access_token)
      if (googleInfo?.picture) {
        await dbRun("UPDATE usuarios SET profile_photo_url = ? WHERE id = ?", { "1": googleInfo.picture, "2": user.id })
      }
    }

    const encoded = encodeURIComponent(JSON.stringify(tokens))
    const origin = new URL(request.url).origin
    const response = NextResponse.redirect(new URL("/dashboard", origin))
    response.cookies.set("gmail_tokens", encoded, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
      secure: true,
      httpOnly: false,
    })

    return response
  } catch (err) {
    console.error("Auth error:", err)
    return NextResponse.redirect(new URL("/dashboard?error=auth_failed", request.url))
  }
}
