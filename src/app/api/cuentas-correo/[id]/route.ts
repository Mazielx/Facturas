import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getCuentaCorreoById, deleteCuentaCorreo, getNegocioById } from "@/db"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Solo los administradores pueden desconectar cuentas" }, { status: 403 })
    }

    const { id } = await params
    const cuentaId = parseInt(id)
    if (isNaN(cuentaId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 })
    }

    const cuenta = getCuentaCorreoById(cuentaId)
    if (!cuenta) {
      return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 })
    }

    const negocio = getNegocioById(user.negocio_id!)
    if (!negocio || cuenta.negocio_id !== negocio.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    deleteCuentaCorreo(cuentaId)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Error deleting cuenta correo:", error)
    return NextResponse.json({ error: "Error al desconectar cuenta" }, { status: 500 })
  }
}
