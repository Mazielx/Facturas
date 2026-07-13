import { describe, it, expect, beforeAll, afterAll } from "vitest"
import Database from "better-sqlite3"
import { initializeSchema } from "@/db/schema"
import path from "path"
import fs from "fs"

const TEST_DB_PATH = path.join(process.cwd(), "data", "test.db")

let db: Database.Database

beforeAll(() => {
  const dataDir = path.dirname(TEST_DB_PATH)
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  db = new Database(TEST_DB_PATH)
  db.pragma("journal_mode = WAL")
  db.pragma("foreign_keys = ON")
  initializeSchema(db)
})

afterAll(() => {
  db.close()
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH)
  }
  const walPath = TEST_DB_PATH + "-wal"
  const shmPath = TEST_DB_PATH + "-shm"
  if (fs.existsSync(walPath)) fs.unlinkSync(walPath)
  if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath)
})

describe("Database Schema", () => {
  it("creates all required tables", () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((row: any) => row.name)

    expect(tables).toContain("facturas")
    expect(tables).toContain("lineas_factura")
    expect(tables).toContain("adjuntos")
    expect(tables).toContain("procesamiento_log")
  })

  it("creates required indexes", () => {
    const indexes = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'")
      .all()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((row: any) => row.name)

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

  it("inserts a factura", () => {
    const columns = Object.keys(testFactura)
    const placeholders = columns.map(() => "?").join(", ")
    const values = Object.values(testFactura)

    const result = db
      .prepare(`INSERT INTO facturas (${columns.join(", ")}) VALUES (${placeholders})`)
      .run(...values)

    facturaId = result.lastInsertRowid as number
    expect(facturaId).toBeGreaterThan(0)
  })

  it("retrieves the inserted factura", () => {
    const row = db.prepare("SELECT * FROM facturas WHERE id = ?").get(facturaId) as Record<string, unknown>

    expect(row.emisor_nombre).toBe("Test Corp S.L.")
    expect(row.emisor_nif).toBe("B11111111")
    expect(row.receptor_nombre).toBe("Cliente Test S.A.")
    expect(row.numero_factura).toBe("TEST-001")
    expect(row.total).toBe(1210)
    expect(row.estado).toBe("pendiente")
    expect(row.moneda).toBe("EUR")
    expect(row.metodo_pago).toBe("transferencia")
  })

  it("inserts line items", () => {
    const result = db
      .prepare(
        `INSERT INTO lineas_factura (factura_id, numero_linea, descripcion, cantidad, precio_unitario, descuento, tipo_iva, subtotal, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(facturaId, 1, "Producto A", 5, 100, 0, 21, 500, 605)

    expect(result.lastInsertRowid).toBeGreaterThan(0)
  })

  it("retrieves line items with factura", () => {
    const lineas = db
      .prepare("SELECT * FROM lineas_factura WHERE factura_id = ?")
      .all(facturaId) as Record<string, unknown>[]

    expect(lineas).toHaveLength(1)
    expect(lineas[0].descripcion).toBe("Producto A")
    expect(lineas[0].cantidad).toBe(5)
    expect(lineas[0].precio_unitario).toBe(100)
    expect(lineas[0].subtotal).toBe(500)
  })

  it("enforces unique adjunto_hash", () => {
    expect(() => {
      db.prepare("INSERT INTO facturas (emisor_nombre, numero_factura, fecha_emision, base_imponible, cuota_iva, total, adjunto_hash) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
        "Duplicate Corp",
        "DUP-001",
        "2024-01-01",
        100,
        21,
        121,
        "hash_test_001"
      )
    }).toThrow()
  })

  it("filters by estado", () => {
    db.prepare("UPDATE facturas SET estado = ? WHERE id = ?").run("pagada", facturaId)

    const row = db.prepare("SELECT estado FROM facturas WHERE id = ?").get(facturaId) as Record<string, unknown>
    expect(row.estado).toBe("pagada")

    db.prepare("UPDATE facturas SET estado = ? WHERE id = ?").run("pendiente", facturaId)
  })

  it("searches by text", () => {
    const results = db
      .prepare("SELECT * FROM facturas WHERE numero_factura LIKE ? OR emisor_nombre LIKE ?")
      .all("%TEST%", "%TEST%") as Record<string, unknown>[]

    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results.some((r) => r.numero_factura === "TEST-001")).toBe(true)
  })

  it("deletes factura cascades to lineas", () => {
    db.prepare("DELETE FROM facturas WHERE id = ?").run(facturaId)

    const lineas = db.prepare("SELECT * FROM lineas_factura WHERE factura_id = ?").all(facturaId)
    expect(lineas).toHaveLength(0)

    const remaining = db.prepare("SELECT * FROM facturas WHERE id = ?").get(facturaId)
    expect(remaining).toBeUndefined()
  })
})

describe("Processing Log", () => {
  it("inserts and retrieves log entries", () => {
    const result = db
      .prepare("INSERT INTO procesamiento_log (email_id, adjunto_filename, status) VALUES (?, ?, ?)")
      .run("test_email", "test.pdf", "processing")

    const logId = result.lastInsertRowid as number
    const entry = db.prepare("SELECT * FROM procesamiento_log WHERE id = ?").get(logId) as Record<string, unknown>

    expect(entry.email_id).toBe("test_email")
    expect(entry.adjunto_filename).toBe("test.pdf")
    expect(entry.status).toBe("processing")

    db.prepare("UPDATE procesamiento_log SET status = ?, factura_id = NULL WHERE id = ?").run("success", logId)
  })
})
