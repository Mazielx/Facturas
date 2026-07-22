import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getMainDb } from "@/db"
import fs from "fs"
import path from "path"
import crypto from "crypto"

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads")
const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("photo") as File | null

    if (!file) {
      return NextResponse.json({ error: "No se proporciono imagen" }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "La imagen no puede superar 5MB" }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Formato no soportado. Usa JPG, PNG, WebP o GIF" }, { status: 400 })
    }

    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true })
    }

    const ext = file.name.split(".").pop() || "jpg"
    const filename = `${user.id}-${crypto.randomBytes(8).toString("hex")}.${ext}`
    const filepath = path.join(UPLOAD_DIR, filename)

    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(filepath, buffer)

    const photoUrl = `/api/auth/photo/${filename}`

    const db = getMainDb()
    db.prepare("UPDATE usuarios SET profile_photo_url = ?, updated_at = datetime('now') WHERE id = ?").run(photoUrl, user.id)

    return NextResponse.json({ photoUrl })
  } catch (error) {
    console.error("Error uploading photo:", error)
    return NextResponse.json({ error: "Error al subir imagen" }, { status: 500 })
  }
}
