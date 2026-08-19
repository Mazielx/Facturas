const fs = require("fs")
const path = require("path")
const zlib = require("zlib")

function createPNG(width, height, r, g, b) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  function chunk(type, data) {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const typeB = Buffer.from(type)
    const crcData = Buffer.concat([typeB, data])
    let crc = 0xffffffff
    for (const byte of crcData) {
      crc ^= byte
      for (let i = 0; i < 8; i++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
      }
    }
    crc ^= 0xffffffff
    const crcB = Buffer.alloc(4)
    crcB.writeUInt32BE(crc >>> 0)
    return Buffer.concat([len, typeB, data, crcB])
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type (RGB)
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace

  // Create raw image data with filter bytes
  const raw = Buffer.alloc(height * (1 + width * 3))
  const cornerRadius = Math.floor(width * 0.18)

  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 3)
    raw[rowStart] = 0 // no filter
    for (let x = 0; x < width; x++) {
      const pixStart = rowStart + 1 + x * 3
      // Check if pixel is inside rounded rectangle
      const inCorner = (cx, cy) => {
        const dx = Math.abs(x - cx)
        const dy = Math.abs(y - cy)
        if (dx > cornerRadius || dy > cornerRadius) return false
        const dist = Math.sqrt((dx - cornerRadius) ** 2 + (dy - cornerRadius) ** 2)
        return dist <= cornerRadius
      }
      const inRect =
        (x >= cornerRadius && x < width - cornerRadius) ||
        (y >= cornerRadius && y < height - cornerRadius) ||
        inCorner(cornerRadius, cornerRadius) ||
        inCorner(width - 1 - cornerRadius, cornerRadius) ||
        inCorner(cornerRadius, height - 1 - cornerRadius) ||
        inCorner(width - 1 - cornerRadius, height - 1 - cornerRadius)

      if (inRect) {
        // Draw "K" letter
        const cx = width / 2
        const cy = height / 2
        const armLen = width * 0.28
        const strokeW = width * 0.07

        const inK = (() => {
          // Vertical bar
          if (Math.abs(x - (cx - armLen * 0.4)) < strokeW && Math.abs(y - cy) < armLen) return true
          // Upper diagonal
          const t1 = (y - cy + armLen) / (2 * armLen)
          const kx1 = (cx - armLen * 0.4) + t1 * armLen * 0.9
          if (t1 >= 0 && t1 <= 1 && Math.abs(x - kx1) < strokeW) return true
          // Lower diagonal
          const t2 = (cy + armLen - y) / (2 * armLen)
          const kx2 = (cx - armLen * 0.4) + t2 * armLen * 0.9
          if (t2 >= 0 && t2 <= 1 && Math.abs(x - kx2) < strokeW) return true
          return false
        })()

        // Bottom accent line
        const inAccent = y > height * 0.73 && y < height * 0.75 && x > width * 0.16 && x < width * 0.84

        if (inK) {
          raw[pixStart] = 16   // #10b981
          raw[pixStart + 1] = 185
          raw[pixStart + 2] = 129
        } else if (inAccent) {
          raw[pixStart] = 16
          raw[pixStart + 1] = 185
          raw[pixStart + 2] = 129
        } else {
          raw[pixStart] = r
          raw[pixStart + 1] = g
          raw[pixStart + 2] = b
        }
      } else {
        // Transparent (but PNG RGB doesn't support alpha, use background)
        raw[pixStart] = 30
        raw[pixStart + 1] = 30
        raw[pixStart + 2] = 30
      }
    }
  }

  const compressed = zlib.deflateSync(raw)

  const png = Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ])

  return png
}

const publicDir = path.join(__dirname, "..", "public")
const sizes = [192, 512]

for (const size of sizes) {
  const png = createPNG(size, size, 24, 24, 27) // zinc-900
  const outPath = path.join(publicDir, `icon-${size}.png`)
  fs.writeFileSync(outPath, png)
  console.log(`Created ${outPath} (${png.length} bytes)`)
}

// Also create apple-touch-icon (180x180)
const apple = createPNG(180, 180, 24, 24, 27)
fs.writeFileSync(path.join(publicDir, "apple-touch-icon.png"), apple)
console.log(`Created apple-touch-icon.png (${apple.length} bytes)`)
