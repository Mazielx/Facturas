import { NextResponse } from "next/server"
import { getAuthUrl } from "@/lib/gmail"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const email = url.searchParams.get("email")
  const negocioId = url.searchParams.get("negocioId")

  if (!email || !negocioId) {
    return NextResponse.json({ error: "Email y negocioId son requeridos" }, { status: 400 })
  }

  const authUrl = getAuthUrl(`cuenta_correo:${email}:${negocioId}`)

  return NextResponse.redirect(authUrl)
}
