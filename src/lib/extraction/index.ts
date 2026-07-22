import type Database from "better-sqlite3"
import { parseXml } from "./xml-parser"
import { parsePdf } from "./pdf-parser"
import type { FacturaCompleta, ExtractionResult } from "./types"
import crypto from "crypto"

export function calcularConfianza(datos: FacturaCompleta, source: "xml" | "pdf"): number {
  let score = source === "xml" ? 1.0 : 0.85

  if (!datos.emisor.nif) score -= 0.05
  if (!datos.receptor.nif) score -= 0.05
  if (datos.factura.total <= 0) score -= 0.15
  if (datos.lineas.length === 0) score -= 0.10
  if (!datos.factura.fechaEmision) score -= 0.10

  const expectedIva = datos.factura.baseImponible * (datos.factura.tipoIva / 100)
  if (datos.factura.cuotaIva > 0 && Math.abs(expectedIva - datos.factura.cuotaIva) > 1) {
    score -= 0.10
  }

  const expectedTotal = datos.factura.baseImponible + datos.factura.cuotaIva - datos.factura.descuento
  if (Math.abs(expectedTotal - datos.factura.total) > 1) {
    score -= 0.10
  }

  return Math.max(0, Math.min(1, score))
}

export function nivelConfianza(score: number): "confiable" | "alta" | "media" | "baja" {
  if (score >= 0.88) return "confiable"
  if (score >= 0.66) return "alta"
  if (score >= 0.33) return "media"
  return "baja"
}

export function detectarDuplicados(
  db: Database.Database,
  facturaId: number,
  datos: FacturaCompleta
): Array<{ facturaId: number; razon: string; score: number }> {
  const duplicados: Array<{ facturaId: number; razon: string; score: number }> = []

  const mismoNumero = db
    .prepare(
      "SELECT id FROM facturas WHERE numero_factura = ? AND emisor_nif = ? AND id != ?"
    )
    .get(datos.factura.numeroFactura, datos.emisor.nif || "", facturaId) as { id: number } | undefined
  if (mismoNumero) {
    duplicados.push({ facturaId: mismoNumero.id, razon: "mismo_numero", score: 0.95 })
  }

  const mismoMonto = db
    .prepare(
      "SELECT id FROM facturas WHERE ABS(total - ?) < 0.01 AND fecha_emision = ? AND emisor_nif = ? AND id != ?"
    )
    .get(
      datos.factura.total,
      datos.factura.fechaEmision,
      datos.emisor.nif || "",
      facturaId
    ) as { id: number } | undefined
  if (mismoMonto) {
    duplicados.push({ facturaId: mismoMonto.id, razon: "mismo_monto_fecha", score: 0.85 })
  }

  return duplicados
}

export async function processAttachment(
  db: Database.Database,
  content: Buffer,
  filename: string,
  mimeType: string,
  emailId: string,
  emailSubject: string,
  emailFrom: string,
  emailDate: string
): Promise<ExtractionResult> {
  const contentHash = crypto.createHash("sha256").update(content).digest("hex")

  const existing = db.prepare("SELECT id FROM facturas WHERE adjunto_hash = ?").get(contentHash) as { id: number } | undefined
  if (existing) {
    return { success: true, facturaId: existing.id, error: "Ya procesado previamente" }
  }

  try {
    let datos: FacturaCompleta
    let source: "xml" | "pdf"

    if (mimeType === "text/xml" || mimeType === "application/xml" || filename.toLowerCase().endsWith(".xml")) {
      datos = parseXml(content.toString("utf-8"))
      source = "xml"
    } else if (mimeType === "application/pdf" || filename.toLowerCase().endsWith(".pdf")) {
      datos = await parsePdf(content)
      source = "pdf"
    } else {
      return { success: false, error: `Tipo de archivo no soportado: ${mimeType}` }
    }

    const confianzaScore = calcularConfianza(datos, source)
    const confianzaNivel = nivelConfianza(confianzaScore)

    const insertAll = db.transaction(() => {
      const facturaId = insertFactura(db, datos, {
        emailId,
        emailSubject,
        emailFrom,
        emailDate,
        filename,
        mimeType,
        contentHash,
        content,
        confianzaScore,
        confianzaNivel,
      })

      const duplicados = detectarDuplicados(db, facturaId, datos)
      for (const dup of duplicados) {
        db.prepare(
          "INSERT INTO duplicados_potenciales (factura_id, duplicada_de_id, razon, score) VALUES (?, ?, ?, ?)"
        ).run(facturaId, dup.facturaId, dup.razon, dup.score)
      }

      return facturaId
    })

    const facturaId = insertAll()

    return { success: true, facturaId, datos }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Error desconocido"
    insertLog(db, emailId, filename, "error", errorMsg)
    return { success: false, error: errorMsg }
  }
}

function insertFactura(
  db: Database.Database,
  datos: FacturaCompleta,
  metadata: {
    emailId: string
    emailSubject: string
    emailFrom: string
    emailDate: string
    filename: string
    mimeType: string
    contentHash: string
    content: Buffer
    confianzaScore: number
    confianzaNivel: string
  }
): number {
  const result = db.prepare(`
    INSERT INTO facturas (
      emisor_nombre, emisor_nif, emisor_direccion, emisor_poblacion, emisor_provincia,
      emisor_cp, emisor_pais, emisor_email, emisor_telefono, emisor_logo,
      receptor_nombre, receptor_nif, receptor_direccion, receptor_poblacion,
      receptor_provincia, receptor_cp, receptor_pais, receptor_email,
      numero_factura, fecha_emision, fecha_vencimiento, tipo_documento, moneda,
      base_imponible, tipo_iva, cuota_iva, total, descuento, retencion, neto,
      metodo_pago, estado,
      email_id, email_asunto, email_emisor, email_fecha,
      adjunto_nombre, adjunto_tipo, adjunto_hash,
      confianza_score, confianza_nivel
    ) VALUES (
      @emisor_nombre, @emisor_nif, @emisor_direccion, @emisor_poblacion, @emisor_provincia,
      @emisor_cp, @emisor_pais, @emisor_email, @emisor_telefono, @emisor_logo,
      @receptor_nombre, @receptor_nif, @receptor_direccion, @receptor_poblacion,
      @receptor_provincia, @receptor_cp, @receptor_pais, @receptor_email,
      @numero_factura, @fecha_emision, @fecha_vencimiento, @tipo_documento, @moneda,
      @base_imponible, @tipo_iva, @cuota_iva, @total, @descuento, @retencion, @neto,
      @metodo_pago, @estado,
      @email_id, @email_asunto, @email_emisor, @email_fecha,
      @adjunto_nombre, @adjunto_tipo, @adjunto_hash,
      @confianza_score, @confianza_nivel
    )
  `).run({
    emisor_nombre: datos.emisor.nombre,
    emisor_nif: datos.emisor.nif || null,
    emisor_direccion: datos.emisor.direccion || null,
    emisor_poblacion: datos.emisor.poblacion || null,
    emisor_provincia: datos.emisor.provincia || null,
    emisor_cp: datos.emisor.cp || null,
    emisor_pais: datos.emisor.pais || "ES",
    emisor_email: datos.emisor.email || null,
    emisor_telefono: datos.emisor.telefono || null,
    emisor_logo: datos.emisor.logo || null,
    receptor_nombre: datos.receptor.nombre || null,
    receptor_nif: datos.receptor.nif || null,
    receptor_direccion: datos.receptor.direccion || null,
    receptor_poblacion: datos.receptor.poblacion || null,
    receptor_provincia: datos.receptor.provincia || null,
    receptor_cp: datos.receptor.cp || null,
    receptor_pais: datos.receptor.pais || "ES",
    receptor_email: datos.receptor.email || null,
    numero_factura: datos.factura.numeroFactura,
    fecha_emision: datos.factura.fechaEmision,
    fecha_vencimiento: datos.factura.fechaVencimiento || null,
    tipo_documento: datos.factura.tipoDocumento,
    moneda: datos.factura.moneda,
    base_imponible: datos.factura.baseImponible,
    tipo_iva: datos.factura.tipoIva,
    cuota_iva: datos.factura.cuotaIva,
    total: datos.factura.total,
    descuento: datos.factura.descuento,
    retencion: datos.factura.retencion,
    neto: datos.factura.neto || null,
    metodo_pago: datos.factura.metodoPago || null,
    estado: datos.factura.estado,
    email_id: metadata.emailId,
    email_asunto: metadata.emailSubject,
    email_emisor: metadata.emailFrom,
    email_fecha: metadata.emailDate,
    adjunto_nombre: metadata.filename,
    adjunto_tipo: metadata.mimeType,
    adjunto_hash: metadata.contentHash,
    confianza_score: metadata.confianzaScore,
    confianza_nivel: metadata.confianzaNivel,
  })

  const facturaId = result.lastInsertRowid as number

  for (const linea of datos.lineas) {
    db.prepare(`
      INSERT INTO lineas_factura (
        factura_id, numero_linea, descripcion, cantidad, precio_unitario,
        descuento, tipo_iva, subtotal, total
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      facturaId,
      linea.numeroLinea,
      linea.descripcion,
      linea.cantidad,
      linea.precioUnitario,
      linea.descuento,
      linea.tipoIva,
      linea.subtotal,
      linea.total
    )
  }

  db.prepare(`
    INSERT INTO adjuntos (factura_id, filename, mime_type, content_hash, content)
    VALUES (?, ?, ?, ?, ?)
  `).run(facturaId, metadata.filename, metadata.mimeType, metadata.contentHash, metadata.content)

  insertLog(db, metadata.emailId, metadata.filename, "success", null, facturaId)

  return facturaId
}

function insertLog(
  db: Database.Database,
  emailId: string,
  filename: string,
  status: string,
  errorMessage: string | null,
  facturaId?: number
): void {
  db.prepare(`
    INSERT INTO procesamiento_log (email_id, adjunto_filename, status, error_message, factura_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(emailId, filename, status, errorMessage, facturaId || null)
}
