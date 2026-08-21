import { NextResponse } from "next/server"
import { deleteSession } from "@/lib/auth"
import { cookies } from "next/headers"

export async function POST() {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("session_id")?.value

    if (sessionId) {
      await deleteSession(sessionId)
    }

    const response = NextResponse.json({ success: true })

    response.cookies.set("session_id", "", { path: "/", maxAge: 0 })
    response.cookies.set("negocio_slug", "", { path: "/", maxAge: 0 })
    response.cookies.set("gmail_tokens", "", { path: "/", maxAge: 0 })

    return response
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
