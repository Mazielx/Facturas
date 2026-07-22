import type { FacturaCompleta, DatosEmisor, DatosReceptor, DatosFactura, LineaFactura } from "./types"

// eslint-disable-next-line @typescript-eslint/no-require-imports
const loadPdfParse = () => require("pdf-parse/lib/pdf-parse")

export async function parsePdf(pdfBuffer: Buffer): Promise<FacturaCompleta> {
  const pdfParse = await loadPdfParse()
  const data = await pdfParse(pdfBuffer)
  const text = data.text

  const emisor = extractEmisorFromText(text)
  const receptor = extractReceptorFromText(text)
  const factura = extractFacturaFromText(text)
  const lineas = extractLineasFromText(text)

  return { emisor, receptor, factura, lineas }
}

function extractEmisorFromText(text: string): DatosEmisor {
  const nombreMatch = text.match(/(?:Empresa|Emisor|Razón Social|Proveedor)[:\s]*(.+?)(?:\n|$)/i)
  const nifMatch = text.match(/(?:NIF|CIF|RFC)[:\s]*([A-Z0-9-]+)/i)
  const direccionMatch = text.match(/(?:Dirección|Domicilio)[:\s]*(.+?)(?:\n|$)/i)
  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
  const telefonoMatch = text.match(/(?:Tel(?:éfono)?|Tel\.?|Phone)[:\s]*([+]?[\d\s()-]+)/i)

  return {
    nombre: nombreMatch?.[1]?.trim() || "Desconocido",
    nif: nifMatch?.[1]?.trim(),
    direccion: direccionMatch?.[1]?.trim(),
    email: emailMatch?.[1]?.trim(),
    telefono: telefonoMatch?.[1]?.trim(),
  }
}

function extractReceptorFromText(text: string): DatosReceptor {
  const nombreMatch = text.match(/(?:Cliente|Receptor|Destinatario|Comprador)[:\s]*(.+?)(?:\n|$)/i)
  const nifMatch = text.match(/(?:NIF(?:\s+Receptor)?|CIF(?:\s+Receptor)?|RFC(?:\s+Cliente)?)[:\s]*([A-Z0-9-]+)/i)
  const emailMatch = text.match(/(?:Email(?:\s+Receptor)?|Correo(?:\s+Receptor)?)[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)

  return {
    nombre: nombreMatch?.[1]?.trim(),
    nif: nifMatch?.[1]?.trim(),
    email: emailMatch?.[1]?.trim(),
  }
}

function extractFacturaFromText(text: string): DatosFactura {
  const numeroMatch = text.match(/(?:Factura(?:\s+Nº?)?|Invoice|Nº|No\.?)[:\s]*(.+?)(?:\n|$)/i)
  const fechaMatch = text.match(/(?:Fecha|Date|Emisión)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i)
  const totalMatch = text.match(/(?:Total|Importe Total|Total Amount)[:\s]*([€$]?[\d.,]+)/i)
  const baseMatch = text.match(/(?:Base Imponible|Subtotal|Neto|Base)[:\s]*([€$]?[\d.,]+)/i)
  const ivaMatch = text.match(/(?:IVA|Impuesto|Tax)[:\s]*\(?(\d+)%\)?[:\s]*([€$]?[\d.,]+)/i)
  const monedaMatch = text.match(/(?:Moneda|Currency)[:\s]*(EUR|USD|MXN|GBP)/i)
  const descuentoMatch = text.match(/(?:Descuento|Discount|Dto\.?)[:\s]*([€$]?[\d.,]+)/i)
  const metodoPagoMatch = text.match(/(?:Forma de Pago|Método de Pago|Payment Method|Payment)[:\s]*(.+?)(?:\n|$)/i)
  const estadoMatch = text.match(/(?:Estado|Status)[:\s]*(pendiente|pagada|cancelada|pending|paid|cancelled)/i)

  const parseAmount = (str: string | undefined): number => {
    if (!str) return 0
    const cleaned = str.replace(/[€$,\s]/g, "").replace(",", ".")
    return parseFloat(cleaned) || 0
  }

  return {
    numeroFactura: numeroMatch?.[1]?.trim() || "",
    fechaEmision: fechaMatch?.[1]?.trim() || "",
    tipoDocumento: "factura",
    moneda: monedaMatch?.[1]?.toUpperCase() || "MXN",
    baseImponible: parseAmount(baseMatch?.[1]),
    tipoIva: ivaMatch?.[1] ? parseInt(ivaMatch[1]) : 21,
    cuotaIva: parseAmount(ivaMatch?.[2]),
    total: parseAmount(totalMatch?.[1]),
    descuento: parseAmount(descuentoMatch?.[1]),
    retencion: 0,
    neto: undefined,
    metodoPago: metodoPagoMatch?.[1]?.trim(),
    estado: (estadoMatch?.[1]?.toLowerCase() as "pendiente" | "pagada" | "cancelada") || "pendiente",
  }
}

function extractLineasFromText(text: string): LineaFactura[] {
  const lineas: LineaFactura[] = []
  const lines = text.split("\n")

  let inLineasSection = false
  let lineaIndex = 1

  for (const line of lines) {
    if (line.match(/(?:Detalle|Descripción|Description|Concepto|Línea)/i)) {
      inLineasSection = true
      continue
    }

    if (inLineasSection && line.trim()) {
      const parts = line.split(/\s{2,}/)
      if (parts.length >= 2) {
        const descripcion = parts[0].trim()
        const cantidadMatch = line.match(/(\d+(?:\.\d+)?)\s*[xX*]\s*([\d.,]+)/)
        const precioMatch = line.match(/([\d.,]+)\s*[€$]?/)
        const totalMatch = line.match(/([€$]?[\d.,]+)\s*$/)

        const cantidad = cantidadMatch ? parseFloat(cantidadMatch[1]) : 1
        const precioUnitario = cantidadMatch ? parseFloat(cantidadMatch[2].replace(",", ".")) : precioMatch ? parseFloat(precioMatch[1].replace(",", ".")) : 0
        const totalLinea = totalMatch ? parseFloat(totalMatch[1].replace(/[€$,\s]/g, "").replace(",", ".")) : cantidad * precioUnitario

        lineas.push({
          numeroLinea: lineaIndex++,
          descripcion,
          cantidad,
          precioUnitario,
          descuento: 0,
          tipoIva: 21,
          subtotal: totalLinea / 1.21,
          total: totalLinea,
        })
      }
    }
  }

  return lineas
}
