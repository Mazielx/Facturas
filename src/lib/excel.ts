import * as XLSX from "xlsx-js-style"

export interface ExcelColumn {
  header: string
  key: string
  width: number
  type?: "money" | "text"
}

const HEADER_STYLE: XLSX.CellStyle = {
  font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
  fill: { fgColor: { rgb: "1F4E78" } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: {
    top: { style: "thin", color: { rgb: "B7C4D6" } },
    bottom: { style: "thin", color: { rgb: "B7C4D6" } },
    left: { style: "thin", color: { rgb: "B7C4D6" } },
    right: { style: "thin", color: { rgb: "B7C4D6" } },
  },
}

const BORDER_LIGHT = {
  top: { style: "thin", color: { rgb: "D9D9D9" } },
  bottom: { style: "thin", color: { rgb: "D9D9D9" } },
  left: { style: "thin", color: { rgb: "D9D9D9" } },
  right: { style: "thin", color: { rgb: "D9D9D9" } },
}

function coerceMoney(value: unknown): number | string {
  if (value == null || value === "") return ""
  if (typeof value === "number") return Number.isFinite(value) ? value : ""
  const num = Number(String(value).replace(/[^0-9.-]/g, ""))
  return Number.isFinite(num) ? num : ""
}

function cellValue(value: unknown, type: "money" | "text" | undefined): string | number {
  if (value == null) return ""
  if (type === "money") return coerceMoney(value)
  return String(value)
}

export function buildFacturasWorkbookBuffer(
  sheetName: string,
  columns: ExcelColumn[],
  rows: Record<string, unknown>[]
): ArrayBuffer {
  const aoa: (string | number)[][] = [columns.map((c) => c.header)]
  for (const row of rows) {
    aoa.push(columns.map((c) => cellValue(row[c.key], c.type)))
  }

  const worksheet = XLSX.utils.aoa_to_sheet(aoa)
  worksheet["!cols"] = columns.map((c) => ({ wch: c.width }))

  for (let c = 0; c < columns.length; c++) {
    const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c })]
    if (cell) cell.s = HEADER_STYLE
  }

  for (let r = 1; r < aoa.length; r++) {
    const fill = r % 2 === 0 ? "FFFFFF" : "F2F2F2"
    for (let c = 0; c < columns.length; c++) {
      const cell = worksheet[XLSX.utils.encode_cell({ r, c })]
      if (!cell) continue
      const type = columns[c].type
      cell.s = {
        font: { sz: 10 },
        fill: { fgColor: { rgb: fill } },
        alignment: {
          horizontal: type === "money" ? "right" : "left",
          vertical: "top",
          wrapText: type !== "money",
        },
        border: BORDER_LIGHT,
      }
      if (type === "money" && typeof cell.v === "number") {
        cell.z = "#,##0.00"
      }
    }
  }

  worksheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: aoa.length - 1, c: columns.length - 1 } }),
  }

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  const buf = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }) as Buffer
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
}
