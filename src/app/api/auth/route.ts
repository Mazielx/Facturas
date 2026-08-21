import { NextResponse } from "next/server"
import { getAuthUrl } from "@/lib/gmail"
import { signLoginState } from "@/lib/oauth-state"

// V-44 FIX: Generate a signed login state instead of empty state.
// This prevents the callback fallback branch from storing attacker tokens.
export async function GET() {
  const state = signLoginState()
  const authUrl = getAuthUrl(state)
  return NextResponse.redirect(authUrl)
}
