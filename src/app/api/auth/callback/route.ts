import { getTokensFromCode, getGoogleUserInfo } from "@/lib/gmail"
import { getCurrentUser } from "@/lib/auth"
import { createCuentaCorreo, getCuentaCorreoByEmail } from "@/db"
import { dbRun } from "@/db/client"
import { verifyOAuthState } from "@/lib/oauth-state"
import { logSecurityEvent, extractClientIp, extractUserAgent } from "@/lib/security"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")
  const state = searchParams.get("state") || ""

  if (error || !code) {
    return NextResponse.redirect(new URL("/?error=auth_denied", request.url))
  }

  const ip = extractClientIp(request)
  const userAgent = extractUserAgent(request)

  try {
    // V-43 FIX: Validate state FIRST, before exchanging tokens with Google.
    // This prevents wasting a token exchange on invalid/replayed states.
    const verifiedState = await verifyOAuthState(state)

    if (!verifiedState) {
      // V-44 FIX: No valid state = reject entirely. Do NOT exchange the code.
      // The old fallback stored attacker tokens on victim's profile.
      await logSecurityEvent("oauth_invalid_state", { ip, userAgent, metadata: { state_provided: !!state } })
      return NextResponse.redirect(new URL("/?error=invalid_state", request.url))
    }

    const currentUser = await getCurrentUser()
    if (!currentUser || !currentUser.negocio_id) {
      return NextResponse.redirect(new URL("/?error=no_negocio", request.url))
    }

    if (verifiedState.kind === "cuenta_correo") {
      // V-15 FIX: Validate that the OAuth state belongs to the current user's negocio
      if (verifiedState.negocioId !== currentUser.negocio_id) {
        await logSecurityEvent("oauth_state_tenant_mismatch", {
          userId: currentUser.id, ip, userAgent,
          metadata: { state_negocio: verifiedState.negocioId, user_negocio: currentUser.negocio_id }
        })
        return NextResponse.redirect(new URL("/?error=invalid_state", request.url))
      }

      // NOW exchange tokens (state is valid and consumed)
      const tokens = await getTokensFromCode(code)

      if (tokens.access_token && tokens.refresh_token) {
        const googleInfo = await getGoogleUserInfo(tokens.access_token)
        // V-15 FIX: Use Google's verified email, not the state-provided one
        const email = googleInfo?.email
        if (!email) {
          return NextResponse.redirect(new URL("/empresa?error=no_email", request.url))
        }

        // V-35 FIX: Warn if Google email doesn't match the expected email from state.
        // This prevents connecting the wrong Google account to a negocio mailbox slot.
        if (verifiedState.email && email.toLowerCase() !== verifiedState.email.toLowerCase()) {
          await logSecurityEvent("oauth_email_mismatch", {
            userId: currentUser.id, ip, userAgent,
            metadata: { expected: verifiedState.email, got: email }
          })
          return NextResponse.redirect(new URL("/empresa?error=email_mismatch", request.url))
        }
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

      await logSecurityEvent("oauth_cuenta_connected", { userId: currentUser.id, ip, userAgent })
      return NextResponse.redirect(new URL("/empresa?msg=cuenta_conectada", request.url))
    }

    if (verifiedState.kind === "login") {
      // V-44 FIX: Login flow — exchange tokens, update profile photo ONLY.
      // H3 FIX: Do NOT set a gmail_tokens cookie — nothing reads it server-side
      // and it exposed the full Google token set (incl. refresh_token).
      const tokens = await getTokensFromCode(code)

      if (tokens.access_token) {
        const googleInfo = await getGoogleUserInfo(tokens.access_token)
        if (googleInfo?.picture) {
          await dbRun("UPDATE usuarios SET profile_photo_url = ? WHERE id = ?", { "1": googleInfo.picture, "2": currentUser.id })
        }
      }

      await logSecurityEvent("oauth_login_completed", { userId: currentUser.id, ip, userAgent })
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }

    // Unknown state kind — should not reach here
    return NextResponse.redirect(new URL("/?error=invalid_state", request.url))
  } catch (err) {
    // V-45 FIX: Don't log sensitive error details (tokens, codes)
    const errMsg = err instanceof Error ? err.message : "unknown"
    const safeMsg = errMsg.includes("invalid_grant") ? "invalid_grant" : "auth_error"
    await logSecurityEvent("oauth_error", { ip, userAgent, metadata: { error: safeMsg } })
    return NextResponse.redirect(new URL("/dashboard?error=auth_failed", request.url))
  }
}
