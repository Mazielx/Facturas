import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { getCurrentUser } from "@/lib/auth"

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads")

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params

  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  if (filename.includes("..") || filename.includes("/")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 })
  }

  const fileUserId = filename.split("-")[0]
  if (String(user.id) !== fileUserId && user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const filepath = path.join(UPLOAD_DIR, filename)

  if (!fs.existsSync(filepath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const buffer = fs.readFileSync(filepath)
  const ext = path.extname(filename).toLowerCase()

  const mimeTypes: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
  }

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": mimeTypes[ext] || "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}
