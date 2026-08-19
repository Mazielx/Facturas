import { NextResponse } from "next/server"
import { getAuthUrl } from "@/lib/gmail"
import { getCurrentUser } from "@/lib/auth"
import { getNegocioById } from "@/db"
import { signCuentaCorreoState } from "@/lib/oauth-state"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const email = url.searchParams.get("email")
  const negocioIdRaw = url.searchParams.get("negocioId")

  if (!email || !negocioIdRaw) {
    return NextResponse.json({ error: "Email y negocioId son requeridos" }, { status: 400 })
  }

  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const negocioId = Number(negocioIdRaw)
  if (!Number.isInteger(negocioId)) {
    return NextResponse.json({ error: "negocioId invalido" }, { status: 400 })
  }

  const negocio = await getNegocioById(negocioId)
  if (!negocio) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })
  }

  if (user.role !== "admin" && user.negocio_id !== negocio.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const state = signCuentaCorreoState(email, negocio.id)
  const authUrl = getAuthUrl(state)

  return NextResponse.redirect(authUrl)
}
