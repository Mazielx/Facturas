import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getOAuth2ClientWithTokens, listEmailsWithAttachments } from "@/lib/gmail"
import type { Credentials } from "google-auth-library"
import type { EmailListResponse } from "@/lib/types"

export async function GET() {
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
      response.cookies.set("gmail_tokens", JSON.stringify(refreshedTokens), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      })
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
