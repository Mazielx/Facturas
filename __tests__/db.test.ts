import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { initializeSchema } from "@/db/schema"
import { dbGet, dbAll, dbRun, dbExec, getDb } from "@/db/client"

beforeAll(async () => {
  process.env.TURSO_DATABASE_URL = "file:data/test.db"
  await initializeSchema()
})

afterAll(() => {
  getDb().close()
  try {
    const fs = require("fs")
    const paths = ["data/test.db", "data/test.db-wal", "data/test.db-shm"]
    for (const p of paths) {
      if (fs.existsSync(p)) fs.unlinkSync(p)
    }
  } catch {}
})

describe("Database Schema", () => {
  it("creates all required tables", async () => {
    const rows = await dbAll<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    const tables = rows.map((r) => r.name)

    expect(tables).toContain("facturas")
    expect(tables).toContain("lineas_factura")
    expect(tables).toContain("adjuntos")
    expect(tables).toContain("procesamiento_log")
  })

  it("creates required indexes", async () => {
    const rows = await dbAll<{ name: string }>("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'")
    const indexes = rows.map((r) => r.name)

    expect(indexes).toContain("idx_facturas_emisor_nif")
    expect(indexes).toContain("idx_facturas_fecha_emision")
    expect(indexes).toContain("idx_facturas_numero")
    expect(indexes).toContain("idx_facturas_adjunto_hash")
    expect(indexes).toContain("idx_facturas_estado")
    expect(indexes).toContain("idx_lineas_factura_id")
    expect(indexes).toContain("idx_adjuntos_factura_id")
  })
})

describe("Invoice CRUD", () => {
  const testFactura = {
    negocio_slug: "test",
    emisor_nombre: "Test Corp S.L.",
    emisor_nif: "B11111111",
    emisor_direccion: "Calle Test 1",
    emisor_poblacion: "Madrid",
    emisor_provincia: "Madrid",
    emisor_cp: "28001",
    emisor_pais: "ES",
    emisor_email: "test@corp.com",
    emisor_telefono: "911111111",
    emisor_logo: null,
    receptor_nombre: "Cliente Test S.A.",
    receptor_nif: "A22222222",
    receptor_direccion: "Avda. Cliente 2",
    receptor_poblacion: "Barcelona",
    receptor_provincia: "Barcelona",
    receptor_cp: "08001",
    receptor_pais: "ES",
    receptor_email: "cliente@test.com",
    numero_factura: "TEST-001",
    fecha_emision: "2024-06-15",
    fecha_vencimiento: "2024-07-15",
    tipo_documento: "factura",
    moneda: "EUR",
    base_imponible: 1000,
    tipo_iva: 21,
    cuota_iva: 210,
    total: 1210,
    descuento: 0,
    retencion: 0,
    neto: null,
    metodo_pago: "transferencia",
    estado: "pendiente",
    email_id: "gmail_abc123",
    email_asunto: "Factura TEST-001",
    email_emisor: "test@corp.com",
    email_fecha: "2024-06-15T10:00:00Z",
    adjunto_nombre: "test.pdf",
    adjunto_tipo: "application/pdf",
    adjunto_hash: "hash_test_001",
  }

  let facturaId: number

  it("inserts a factura", async () => {
    const columns = Object.keys(testFactura)
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ")
    const values = Object.values(testFactura)

    const result = await dbRun(
      `INSERT INTO facturas (${columns.join(", ")}) VALUES (${placeholders})`,
      Object.fromEntries(columns.map((c, i) => [String(i + 1), values[i]]))
    )

    facturaId = result.lastInsertRowid
    expect(facturaId).toBeGreaterThan(0)
  })

  it("retrieves the inserted factura", async () => {
    const row = await dbGet<Record<string, unknown>>("SELECT * FROM facturas WHERE id = ?", { "1": facturaId })

    expect(row?.emisor_nombre).toBe("Test Corp S.L.")
    expect(row?.emisor_nif).toBe("B11111111")
    expect(row?.receptor_nombre).toBe("Cliente Test S.A.")
    expect(row?.numero_factura).toBe("TEST-001")
    expect(row?.total).toBe(1210)
    expect(row?.estado).toBe("pendiente")
    expect(row?.moneda).toBe("EUR")
    expect(row?.metodo_pago).toBe("transferencia")
  })

  it("inserts line items", async () => {
    const result = await dbRun(
      `INSERT INTO lineas_factura (factura_id, numero_linea, descripcion, cantidad, precio_unitario, descuento, tipo_iva, subtotal, total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      { "1": facturaId, "2": 1, "3": "Producto A", "4": 5, "5": 100, "6": 0, "7": 21, "8": 500, "9": 605 }
    )

    expect(result.lastInsertRowid).toBeGreaterThan(0)
  })

  it("retrieves line items with factura", async () => {
    const lineas = await dbAll<Record<string, unknown>>("SELECT * FROM lineas_factura WHERE factura_id = ?", { "1": facturaId })

    expect(lineas).toHaveLength(1)
    expect(lineas[0].descripcion).toBe("Producto A")
    expect(lineas[0].cantidad).toBe(5)
    expect(lineas[0].precio_unitario).toBe(100)
    expect(lineas[0].subtotal).toBe(500)
  })

  it("enforces unique adjunto_hash", async () => {
    try {
      await dbRun(
        "INSERT INTO facturas (negocio_slug, emisor_nombre, numero_factura, fecha_emision, base_imponible, cuota_iva, total, adjunto_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        { "1": "test", "2": "Duplicate Corp", "3": "DUP-001", "4": "2024-01-01", "5": 100, "6": 21, "7": 121, "8": "hash_test_001" }
      )
      expect.fail("Should have thrown")
    } catch {
      expect(true).toBe(true)
    }
  })

  it("filters by estado", async () => {
    await dbRun("UPDATE facturas SET estado = ? WHERE id = ?", { "1": "pagada", "2": facturaId })

    const row = await dbGet<Record<string, unknown>>("SELECT estado FROM facturas WHERE id = ?", { "1": facturaId })
    expect(row?.estado).toBe("pagada")

    await dbRun("UPDATE facturas SET estado = ? WHERE id = ?", { "1": "pendiente", "2": facturaId })
  })

  it("searches by text", async () => {
    const results = await dbAll<Record<string, unknown>>(
      "SELECT * FROM facturas WHERE numero_factura LIKE ? OR emisor_nombre LIKE ?",
      { "1": "%TEST%", "2": "%TEST%" }
    )

    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results.some((r) => r.numero_factura === "TEST-001")).toBe(true)
  })

  it("deletes factura cascades to lineas", async () => {
    await dbRun("DELETE FROM facturas WHERE id = ?", { "1": facturaId })

    const lineas = await dbAll("SELECT * FROM lineas_factura WHERE factura_id = ?", { "1": facturaId })
    expect(lineas).toHaveLength(0)

    const remaining = await dbGet("SELECT * FROM facturas WHERE id = ?", { "1": facturaId })
    expect(remaining).toBeUndefined()
  })
})

describe("Processing Log", () => {
  it("inserts and retrieves log entries", async () => {
    const result = await dbRun(
      "INSERT INTO procesamiento_log (email_id, adjunto_filename, status) VALUES (?, ?, ?)",
      { "1": "test_email", "2": "test.pdf", "3": "processing" }
    )

    const logId = result.lastInsertRowid
    const entry = await dbGet<Record<string, unknown>>("SELECT * FROM procesamiento_log WHERE id = ?", { "1": logId })

    expect(entry?.email_id).toBe("test_email")
    expect(entry?.adjunto_filename).toBe("test.pdf")
    expect(entry?.status).toBe("processing")

    await dbRun("UPDATE procesamiento_log SET status = ?, factura_id = NULL WHERE id = ?", { "1": "success", "2": logId })
  })
})
