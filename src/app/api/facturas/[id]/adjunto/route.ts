import { requireActiveTenant } from "@/lib/tenant"
import { dbGet } from "@/db/client"
import { ensureSchema } from "@/db"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tenant = await requireActiveTenant()
    await ensureSchema()

    const adjunto = await dbGet<{ filename: string; mime_type: string; content: Buffer }>(
      "SELECT filename, mime_type, content FROM adjuntos WHERE factura_id = ? AND negocio_slug = ? LIMIT 1",
      { "1": id, "2": tenant.slug }
    )

    if (!adjunto || !adjunto.content) {
      return new Response("Adjunto no encontrado", { status: 404 })
    }

    const buffer = new Uint8Array(adjunto.content)

    return new Response(buffer, {
      headers: {
        "Content-Type": adjunto.mime_type || "application/pdf",
        "Content-Disposition": `inline; filename="${adjunto.filename}"`,
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
