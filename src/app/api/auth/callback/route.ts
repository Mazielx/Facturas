import { getTokensFromCode, getGoogleProfilePhoto } from "@/lib/gmail"
import { getCurrentUser } from "@/lib/auth"
import { getMainDb, createCuentaCorreo, getCuentaCorreoByEmail } from "@/db"
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

    if (state.startsWith("cuenta_correo:")) {
      const parts = state.split(":")
      const email = parts[1]
      const negocioId = parseInt(parts[2])

      if (email && !isNaN(negocioId) && tokens.access_token && tokens.refresh_token) {
        const photoUrl = await getGoogleProfilePhoto(tokens.access_token)
        const tokenExpiry = tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null

        const existing = getCuentaCorreoByEmail(negocioId, email)
        if (existing) {
          getMainDb().prepare(
            "UPDATE cuentas_correo SET access_token = ?, refresh_token = ?, token_expiry = ?, profile_photo_url = ?, updated_at = datetime('now') WHERE id = ?"
          ).run(tokens.access_token, tokens.refresh_token, tokenExpiry, photoUrl, existing.id)
        } else {
          createCuentaCorreo(negocioId, email, tokens.access_token, tokens.refresh_token, tokenExpiry || "", photoUrl || undefined)
        }
      }

      return NextResponse.redirect(new URL("/empresa?msg=cuenta_conectada", request.url))
    }

    const user = await getCurrentUser()
    if (user && tokens.access_token) {
      const photoUrl = await getGoogleProfilePhoto(tokens.access_token)
      if (photoUrl) {
        const db = getMainDb()
        db.prepare("UPDATE usuarios SET profile_photo_url = ? WHERE id = ?").run(photoUrl, user.id)
      }
    }

    const encoded = encodeURIComponent(JSON.stringify(tokens))
    const origin = new URL(request.url).origin
    const response = NextResponse.redirect(new URL("/", origin))
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
    return NextResponse.redirect(new URL("/?error=auth_failed", request.url))
  }
}
