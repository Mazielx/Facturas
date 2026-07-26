import { parseXml } from "./xml-parser"
import { parsePdf } from "./pdf-parser"
import type { FacturaCompleta, ExtractionResult } from "./types"
import { dbGet, dbAll, dbRun } from "@/db/client"
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

export async function detectarDuplicados(
  facturaId: number,
  datos: FacturaCompleta
): Promise<Array<{ facturaId: number; razon: string; score: number }>> {
  const duplicados: Array<{ facturaId: number; razon: string; score: number }> = []

  const mismoNumero = await dbGet<{ id: number }>(
    "SELECT id FROM facturas WHERE numero_factura = ? AND emisor_nif = ? AND id != ?",
    { "1": datos.factura.numeroFactura, "2": datos.emisor.nif || "", "3": facturaId }
  )
  if (mismoNumero) {
    duplicados.push({ facturaId: mismoNumero.id, razon: "mismo_numero", score: 0.95 })
  }

  const mismoMonto = await dbGet<{ id: number }>(
    "SELECT id FROM facturas WHERE ABS(total - ?) < 0.01 AND fecha_emision = ? AND emisor_nif = ? AND id != ?",
    { "1": datos.factura.total, "2": datos.factura.fechaEmision, "3": datos.emisor.nif || "", "4": facturaId }
  )
  if (mismoMonto) {
    duplicados.push({ facturaId: mismoMonto.id, razon: "mismo_monto_fecha", score: 0.85 })
  }

  return duplicados
}

export async function processAttachment(
  content: Buffer,
  filename: string,
  mimeType: string,
  emailId: string,
  emailSubject: string,
  emailFrom: string,
  emailDate: string,
  negocioSlug?: string
): Promise<ExtractionResult> {
  const contentHash = crypto.createHash("sha256").update(content).digest("hex")

  const existing = await dbGet<{ id: number }>(
    "SELECT id FROM facturas WHERE adjunto_hash = ?",
    { "1": contentHash }
  )
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

    if (!datos.factura.numeroFactura || datos.factura.numeroFactura.trim() === "") {
      datos.factura.numeroFactura = filename.replace(/\.[^.]+$/, "")
    }

    if (!datos.factura.fechaEmision || datos.factura.fechaEmision.trim() === "") {
      datos.factura.fechaEmision = new Date().toISOString().slice(0, 10)
    }

    if (!datos.emisor.nombre || datos.emisor.nombre.trim() === "") {
      datos.emisor.nombre = emailFrom || "Desconocido"
    }

    const confianzaScore = calcularConfianza(datos, source)
    const confianzaNivel = nivelConfianza(confianzaScore)

    const facturaId = await insertFactura(datos, {
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
      negocioSlug: negocioSlug || "default",
    })

    const duplicados = await detectarDuplicados(facturaId, datos)
    for (const dup of duplicados) {
      await dbRun(
        "INSERT INTO duplicados_potenciales (factura_id, duplicada_de_id, razon, score) VALUES (?, ?, ?, ?)",
        { "1": facturaId, "2": dup.facturaId, "3": dup.razon, "4": dup.score }
      )
    }

    return { success: true, facturaId, datos }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Error desconocido"
    await insertLog(emailId, filename, "error", errorMsg)
    return { success: false, error: errorMsg }
  }
}

async function insertFactura(
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
    negocioSlug: string
  }
): Promise<number> {
  const result = await dbRun(`
    INSERT INTO facturas (
      negocio_slug,
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
      $negocio_slug,
      $emisor_nombre, $emisor_nif, $emisor_direccion, $emisor_poblacion, $emisor_provincia,
      $emisor_cp, $emisor_pais, $emisor_email, $emisor_telefono, $emisor_logo,
      $receptor_nombre, $receptor_nif, $receptor_direccion, $receptor_poblacion,
      $receptor_provincia, $receptor_cp, $receptor_pais, $receptor_email,
      $numero_factura, $fecha_emision, $fecha_vencimiento, $tipo_documento, $moneda,
      $base_imponible, $tipo_iva, $cuota_iva, $total, $descuento, $retencion, $neto,
      $metodo_pago, $estado,
      $email_id, $email_asunto, $email_emisor, $email_fecha,
      $adjunto_nombre, $adjunto_tipo, $adjunto_hash,
      $confianza_score, $confianza_nivel
    )
  `, {
    negocio_slug: metadata.negocioSlug,
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

  const facturaId = result.lastInsertRowid

  for (const linea of datos.lineas) {
    await dbRun(`
      INSERT INTO lineas_factura (
        factura_id, numero_linea, descripcion, cantidad, precio_unitario,
        descuento, tipo_iva, subtotal, total
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, {
      "1": facturaId, "2": linea.numeroLinea, "3": linea.descripcion,
      "4": linea.cantidad, "5": linea.precioUnitario, "6": linea.descuento,
      "7": linea.tipoIva, "8": linea.subtotal, "9": linea.total,
    })
  }

  await dbRun(`
    INSERT INTO adjuntos (factura_id, filename, mime_type, content_hash, content)
    VALUES (?, ?, ?, ?, ?)
  `, { "1": facturaId, "2": metadata.filename, "3": metadata.mimeType, "4": metadata.contentHash, "5": metadata.content })

  await insertLog(metadata.emailId, metadata.filename, "success", null, facturaId)

  return facturaId
}

async function insertLog(
  emailId: string,
  filename: string,
  status: string,
  errorMessage: string | null,
  facturaId?: number
): Promise<void> {
  await dbRun(`
    INSERT INTO procesamiento_log (email_id, adjunto_filename, status, error_message, factura_id)
    VALUES (?, ?, ?, ?, ?)
  `, { "1": emailId, "2": filename, "3": status, "4": errorMessage, "5": facturaId || null })
}
