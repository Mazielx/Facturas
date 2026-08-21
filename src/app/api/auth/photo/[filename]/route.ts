import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { getCurrentUser } from "@/lib/auth"

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads")

// V-48: MIME allowlist for profile photos
const ALLOWED_MIMES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
}

// V-48: Magic byte validation (first 8 bytes only — full validation would need more bytes)
const MAGIC_BYTES: Record<string, Buffer[]> = {
  ".jpg": [Buffer.from([0xff, 0xd8, 0xff])],
  ".jpeg": [Buffer.from([0xff, 0xd8, 0xff])],
  ".png": [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
  ".webp": [Buffer.from([0x52, 0x49, 0x46, 0x46])], // RIFF header
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params

  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  // Path traversal protection
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 })
  }

  const ext = path.extname(filename).toLowerCase()
  if (!ALLOWED_MIMES[ext]) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 })
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

  // V-48: Validate magic bytes (prevent serving non-image files with image extension)
  const expectedMagic = MAGIC_BYTES[ext]
  if (expectedMagic) {
    const valid = expectedMagic.every((sig) => buffer.subarray(0, sig.length).equals(sig))
    if (!valid) {
      return NextResponse.json({ error: "Invalid file content" }, { status: 400 })
    }
  }

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": ALLOWED_MIMES[ext],
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=86400", // V-48: Private cache, 1 day (not public immutable)
      "Content-Disposition": "inline",
    },
  })
}
