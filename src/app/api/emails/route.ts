import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getOAuth2ClientWithTokens, listEmailsWithAttachments } from "@/lib/gmail"
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
    const tokens = JSON.parse(tokensCookie.value)
    const auth = getOAuth2ClientWithTokens(tokens)

    const result = await listEmailsWithAttachments(auth)

    return NextResponse.json<EmailListResponse>({ emails: result.emails })
  } catch (err) {
    console.error("Error fetching emails:", err)
    return NextResponse.json<EmailListResponse>(
      { emails: [], error: "Failed to fetch emails" },
      { status: 500 }
    )
  }
}
