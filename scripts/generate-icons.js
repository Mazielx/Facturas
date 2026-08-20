const fs = require("fs")
const path = require("path")
const sharp = require("sharp")

const publicDir = path.join(__dirname, "..", "public")
const svgPath = path.join(publicDir, "icon.svg")
const svgBuffer = fs.readFileSync(svgPath)

async function generate() {
  const sizes = [192, 512, 180]

  for (const size of sizes) {
    const outName = size === 180 ? "apple-touch-icon.png" : `icon-${size}.png`
    const outPath = path.join(publicDir, outName)

    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outPath)

    const stat = fs.statSync(outPath)
    console.log(`Created ${outName} (${stat.size} bytes)`)
  }
}

generate().catch(console.error)
