import { describe, it, expect } from "vitest"
import { inflateRawSync } from "node:zlib"
import * as XLSX from "xlsx-js-style"
import { buildFacturasWorkbookBuffer, type ExcelColumn } from "@/lib/excel"

const columns: ExcelColumn[] = [
  { header: "Numero Factura", key: "numero_factura", width: 22 },
  { header: "Emisor", key: "emisor_nombre", width: 32 },
  { header: "Total", key: "total", width: 15, type: "money" },
]

function getZipEntry(buf: Buffer, entryName: string): Buffer | null {
  let eocd = -1
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) return null
  const cdOffset = buf.readUInt32LE(eocd + 16)
  let p = cdOffset
  while (p + 46 <= buf.length && buf.readUInt32LE(p) === 0x02014b50) {
    const method = buf.readUInt16LE(p + 10)
    const csize = buf.readUInt32LE(p + 20)
    const namelen = buf.readUInt16LE(p + 28)
    const extralen = buf.readUInt16LE(p + 30)
    const commentlen = buf.readUInt16LE(p + 32)
    const localOffset = buf.readUInt32LE(p + 42)
    const name = buf.subarray(p + 46, p + 46 + namelen).toString()
    const entrySize = 46 + namelen + extralen + commentlen
    if (name === entryName) {
      const lhMethod = buf.readUInt16LE(localOffset + 8)
      const lhCsize = buf.readUInt32LE(localOffset + 18)
      const lhNamelen = buf.readUInt16LE(localOffset + 26)
      const lhExtralen = buf.readUInt16LE(localOffset + 28)
      const dataStart = localOffset + 30 + lhNamelen + lhExtralen
      const data = buf.subarray(dataStart, dataStart + lhCsize)
      return lhMethod === 8 ? inflateRawSync(data) : Buffer.from(data)
    }
    p += entrySize
  }
  return null
}

function asBuffer(buffer: ArrayBuffer): Buffer {
  return Buffer.from(buffer)
}

describe("buildFacturasWorkbookBuffer", () => {
  it("returns a valid xlsx buffer with header and data rows", () => {
    const buffer = buildFacturasWorkbookBuffer("Facturas", columns, [
      { numero_factura: "F-001", emisor_nombre: "ACME SA de CV", total: 1234.5 },
    ])
    expect(buffer.byteLength).toBeGreaterThan(0)
    expect(new Uint8Array(buffer).subarray(0, 2).toString()).toBe("80,75")

    const workbook = XLSX.read(asBuffer(buffer), { type: "buffer" })
    const sheet = workbook.Sheets["Facturas"]
    expect(sheet).toBeDefined()
    expect(sheet["A1"].v).toBe("Numero Factura")
    expect(sheet["A2"].v).toBe("F-001")
    expect(sheet["B2"].v).toBe("ACME SA de CV")
  })

  it("writes column widths that Excel applies", () => {
    const buffer = buildFacturasWorkbookBuffer("Facturas", columns, [])
    const sheetXml = getZipEntry(asBuffer(buffer), "xl/worksheets/sheet1.xml")?.toString() ?? ""
    expect(sheetXml).toContain('<col min="1" max="1" width="22')
    expect(sheetXml).toContain('<col min="2" max="2" width="32')
    expect(sheetXml).toContain('<col min="3" max="3" width="15')
  })

  it("stores money amounts as numbers with a currency number format", () => {
    const buffer = buildFacturasWorkbookBuffer("Facturas", columns, [{ total: "1500.75" }])
    const sheet = XLSX.read(asBuffer(buffer), { type: "buffer" }).Sheets["Facturas"]
    expect(sheet["C2"].t).toBe("n")
    expect(sheet["C2"].v).toBe(1500.75)
    expect(sheet["C2"].w).toBe("1,500.75")
  })

  it("styles the header (bold white on dark fill, centered) and body rows", () => {
    const buffer = buildFacturasWorkbookBuffer("Facturas", columns, [
      { numero_factura: "F-001", emisor_nombre: "ACME", total: 100 },
    ])
    const stylesXml = getZipEntry(asBuffer(buffer), "xl/styles.xml")?.toString() ?? ""
    const sheetXml = getZipEntry(asBuffer(buffer), "xl/worksheets/sheet1.xml")?.toString() ?? ""
    expect(stylesXml).toContain("<b/>")
    expect(stylesXml).toContain('rgb="FFFFFF"')
    expect(stylesXml).toContain('rgb="FF1F4E78"')
    expect(stylesXml).toContain('horizontal="center"')
    expect(stylesXml).toContain('wrapText="true"')
    expect(sheetXml).toMatch(/<c r="A1" s="3"/)
  })

  it("adds an autofilter over the used range", () => {
    const buffer = buildFacturasWorkbookBuffer("Facturas", columns, [{ numero_factura: "F-001", total: 1 }])
    const sheetXml = getZipEntry(asBuffer(buffer), "xl/worksheets/sheet1.xml")?.toString() ?? ""
    expect(sheetXml).toContain('autoFilter ref="A1:C2"')
  })
})
