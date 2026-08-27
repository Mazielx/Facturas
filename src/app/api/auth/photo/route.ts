import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/tenant"
import { dbRun } from "@/db/client"
import fs from "fs"
import path from "path"
import crypto from "crypto"
import {
  validateFileContent, extractClientIp, extractUserAgent,
  logSecurityEvent, secureErrorResponse,
} from "@/lib/security"

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads")
const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const ip = extractClientIp(request)
    const userAgent = extractUserAgent(request)

    const formData = await request.formData()
    const file = formData.get("photo") as File | null

    if (!file) {
      return NextResponse.json({ error: "No se proporciono imagen" }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "La imagen no puede superar 5MB" }, { status: 400 })
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Formato no soportado. Usa JPG, PNG, WebP o GIF" }, { status: 400 })
    }

    // Validate magic bytes — don't trust the declared MIME type
    const buffer = Buffer.from(await file.arrayBuffer())
    const contentCheck = validateFileContent(buffer, file.type)
    if (!contentCheck.valid) {
      await logSecurityEvent("file_uploaded", { userId: user.id, ip, userAgent, metadata: { result: "magic_bytes_mismatch", declared: file.type } })
      return NextResponse.json({ error: "El archivo no coincide con su tipo declarado" }, { status: 400 })
    }

    // Use the ACTUAL detected type for the extension
    const extMap: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    }
    const ext = extMap[contentCheck.actualType || file.type] || "jpg"

    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true })
    }

    const filename = `${user.id}-${crypto.randomBytes(8).toString("hex")}.${ext}`
    const filepath = path.join(UPLOAD_DIR, filename)

    fs.writeFileSync(filepath, buffer)

    const photoUrl = `/api/auth/photo/${filename}`

    await dbRun("UPDATE usuarios SET profile_photo_url = ?, updated_at = datetime('now') WHERE id = ?", { "1": photoUrl, "2": user.id })

    await logSecurityEvent("file_uploaded", { userId: user.id, ip, userAgent, metadata: { filename, type: contentCheck.actualType } })

    return NextResponse.json({ photoUrl })
  } catch (error) {
    const { message } = secureErrorResponse(error, "photo_upload")
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
