import { requireActiveTenant } from "@/lib/tenant"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { db } = await requireActiveTenant()

    const adjunto = db
      .prepare("SELECT filename, mime_type, content FROM adjuntos WHERE factura_id = ? LIMIT 1")
      .get(id) as { filename: string; mime_type: string; content: Buffer } | undefined

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
    if (error instanceof Error && error.message === "No hay negocio seleccionado") {
      return new Response(JSON.stringify({ error: "No hay negocio seleccionado" }), { status: 401, headers: { "Content-Type": "application/json" } })
    }
    return new Response("Error al obtener el adjunto", { status: 500 })
  }
}
