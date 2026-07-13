import { NextRequest, NextResponse } from "next/server"
import { deleteSession } from "@/lib/auth"
import { cookies } from "next/headers"

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("session_id")?.value

    if (sessionId) {
      deleteSession(sessionId)
    }

    const response = NextResponse.json({ success: true })
    response.cookies.delete("session_id")

    return response
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
