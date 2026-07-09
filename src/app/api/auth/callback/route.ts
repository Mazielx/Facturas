import { NextResponse } from "next/server"
import { getTokensFromCode } from "@/lib/gmail"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  if (error || !code) {
    return NextResponse.redirect(new URL("/?error=auth_denied", request.url))
  }

  try {
    const tokens = await getTokensFromCode(code)

    const response = NextResponse.redirect(new URL("/", request.url))

    response.cookies.set("gmail_tokens", JSON.stringify(tokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    })

    return response
  } catch (err) {
    console.error("Auth error:", err)
    return NextResponse.redirect(new URL("/?error=auth_failed", request.url))
  }
}
