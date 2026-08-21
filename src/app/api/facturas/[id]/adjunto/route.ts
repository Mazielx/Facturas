import { requireActiveTenant } from "@/lib/tenant"
import { dbGet } from "@/db/client"
import { ensureSchema } from "@/db"
import { isAccesoCompleto } from "@/lib/paywall"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tenant = await requireActiveTenant()
    await ensureSchema()

    if (!isAccesoCompleto({ email: tenant.user.email, role: tenant.user.role, planPagadoHasta: tenant.negocio.plan_pagado_hasta })) {
      return new Response(JSON.stringify({ error: "Se requiere un plan activo" }), {
        status: 402,
        headers: { "Content-Type": "application/json" },
      })
    }

    const adjunto = await dbGet<{ filename: string; mime_type: string; content: Buffer }>(
      `SELECT a.filename, a.mime_type, a.content
       FROM adjuntos a
       JOIN facturas f ON f.id = a.factura_id
       WHERE a.factura_id = ? AND f.negocio_slug = ?
       LIMIT 1`,
      { "1": id, "2": tenant.slug }
    )

    if (!adjunto || !adjunto.content) {
      return new Response("Adjunto no encontrado", { status: 404 })
    }

    const buffer = new Uint8Array(adjunto.content)

    // V-33 FIX: MIME allowlist + security headers
    const SAFE_MIMES: Record<string, string> = {
      "application/pdf": "application/pdf",
      "image/jpeg": "image/jpeg",
      "image/png": "image/png",
      "image/webp": "image/webp",
      "image/gif": "image/gif",
    }
    const safeMime = SAFE_MIMES[adjunto.mime_type || ""] || "application/octet-stream"

    return new Response(buffer, {
      headers: {
        "Content-Type": safeMime,
        "Content-Disposition": safeMime === "application/octet-stream"
          ? `attachment; filename="${adjunto.filename}"`
          : `inline; filename="${adjunto.filename}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    })
  } catch (error) {
    console.error("Error fetching adjunto:", error)
    if (error instanceof Error && error.message.includes("No hay negocio")) {
      return new Response(JSON.stringify({ error: "No hay negocio seleccionado" }), { status: 401, headers: { "Content-Type": "application/json" } })
    }
    return new Response("Error al obtener el adjunto", { status: 500 })
  }
}
