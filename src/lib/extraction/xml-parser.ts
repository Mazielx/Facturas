import { XMLParser } from "fast-xml-parser"
import type { FacturaCompleta, DatosEmisor, DatosReceptor, DatosFactura, LineaFactura } from "./types"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type XmlParsed = Record<string, any>

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  allowBooleanAttributes: true,
  parseTagValue: true,
  trimValues: true,
})

function str(val: unknown): string | undefined {
  if (val === undefined || val === null) return undefined
  return String(val)
}

export function parseFacturaeXml(xmlContent: string): FacturaCompleta {
  const result: XmlParsed = xmlParser.parse(xmlContent)
  const facturaHeader = result.Facturae?.FileHeader
  const parties = result.Facturae?.Parties
  const invoice = result.Facturae?.Invoice

  if (!facturaHeader || !parties || !invoice) {
    throw new Error("Formato Facturae no válido")
  }

  const emisor = extractEmisor(parties.SellerParty)
  const receptor = extractReceptor(parties.BuyerParty)
  const factura = extractFactura(facturaHeader, invoice)
  const lineas = extractLineas(invoice.Items?.InvoiceLine)

  return { emisor, receptor, factura, lineas }
}

function extractEmisor(seller: XmlParsed): DatosEmisor {
  const legalEntity = seller.LegalEntity || seller.Individual
  const taxIdentification = seller.TaxIdentification

  return {
    nombre: legalEntity?.TradeName || legalEntity?.Name || "Desconocido",
    nif: taxIdentification?.TaxIdentificationNumber,
    direccion: legalEntity?.Address?.Address,
    poblacion: legalEntity?.Address?.Town,
    provincia: legalEntity?.Address?.Province,
    cp: str(legalEntity?.Address?.PostCode),
    pais: legalEntity?.Address?.CountryCode === "ESP" ? "ES" : legalEntity?.Address?.CountryCode,
    email: legalEntity?.ElectronicMail,
    telefono: str(legalEntity?.Telephone),
    logo: legalEntity?.Logo,
  }
}

function extractReceptor(buyer: XmlParsed): DatosReceptor {
  const legalEntity = buyer.LegalEntity || buyer.Individual
  const taxIdentification = buyer.TaxIdentification

  return {
    nombre: legalEntity?.TradeName || legalEntity?.Name,
    nif: taxIdentification?.TaxIdentificationNumber,
    direccion: legalEntity?.Address?.Address,
    poblacion: legalEntity?.Address?.Town,
    provincia: legalEntity?.Address?.Province,
    cp: str(legalEntity?.Address?.PostCode),
    pais: legalEntity?.Address?.CountryCode === "ESP" ? "ES" : legalEntity?.Address?.CountryCode,
    email: legalEntity?.ElectronicMail,
  }
}

function extractFactura(header: XmlParsed, invoice: XmlParsed): DatosFactura {
  const invoiceTotals = invoice.InvoiceTotals
  const paymentMeansRaw = invoice.PaymentData?.PaymentMeans
  const paymentMeans = Array.isArray(paymentMeansRaw) ? paymentMeansRaw[0] : paymentMeansRaw
  const taxTotals = invoiceTotals?.TaxTotals

  let cuotaIva = 0
  if (taxTotals) {
    const taxArr = Array.isArray(taxTotals.Tax) ? taxTotals.Tax : [taxTotals.Tax].filter(Boolean)
    if (taxArr.length > 0) {
      cuotaIva = Number(taxArr[0]?.TaxAmount) || 0
    } else {
      cuotaIva = Number(taxTotals.TaxAmount) || 0
    }
  }

  const total = Number(invoiceTotals?.InvoiceTotal?.TotalAmount) || 0
  const descuento = Number(invoiceTotals?.InvoiceTotal?.TotalDiscountAmount) || 0
  const baseImponible = Number(invoiceTotals?.InvoiceTotal?.GrossAmount) ||
    Number(invoiceTotals?.InvoiceTotal?.TaxableAmount) ||
    (total - cuotaIva + descuento)
  const retencion = Number(invoiceTotals?.InvoiceTotal?.TotalRetentionsAmount) || 0

  return {
    numeroFactura: header.InvoiceNumber || header.InvoiceDocumentNumber || "",
    fechaEmision: header.InvoiceIssueDate || "",
    fechaVencimiento: invoice.DueDate,
    tipoDocumento: header.InvoiceDocumentType?.toString() || "factura",
    moneda: invoiceTotals?.InvoiceCurrencyCode || "MXN",
    baseImponible,
    tipoIva: cuotaIva > 0 && baseImponible > 0 ? Math.round((cuotaIva / baseImponible) * 100) : 21,
    cuotaIva,
    total,
    descuento,
    retencion,
    neto: baseImponible - descuento,
    metodoPago: paymentMeans?.PaymentMeansCode?.toString(),
    estado: "pendiente",
  }
}

function extractLineas(lines: XmlParsed[] | XmlParsed | undefined): LineaFactura[] {
  if (!lines) return []

  const lineArray = Array.isArray(lines) ? lines : [lines]

  return lineArray.map((line: XmlParsed, index: number) => {
    const item = line.Item
    const quantity = Number(line.Quantity) || 1
    const unitPrice = Number(item?.Price?.UnitPrice) ||
      Number(line.ItemPriceExtension?.UnitAmount) ||
      (Number(line.ItemPriceExtension?.TotalAmount) / quantity) || 0
    const discount = Number(line.DiscountsAndBonuses?.Discount?.[0]?.DiscountAmount) || 0
    const iva = Number(line.TaxesAndSurcharges?.Tax?.[0]?.TaxRate) || 21
    const subtotal = quantity * unitPrice - discount
    const ivaAmount = subtotal * (iva / 100)

    return {
      numeroLinea: index + 1,
      descripcion: item?.Description || item?.DescriptionText || "",
      cantidad: quantity,
      precioUnitario: unitPrice,
      descuento: discount,
      tipoIva: iva,
      subtotal,
      total: subtotal + ivaAmount,
    }
  })
}

function getVal(obj: XmlParsed | undefined, ...keys: string[]): unknown {
  if (!obj) return undefined
  for (const key of keys) {
    if (obj[key] !== undefined) return obj[key]
  }
  return undefined
}

function deepVal(obj: XmlParsed | undefined, path: string[]): unknown {
  if (!obj || path.length === 0) return undefined
  const [first, ...rest] = path
  const val = getVal(obj, first, first.replace(/^[^:]+:/, ""))
  if (rest.length === 0) return val
  if (typeof val === "object" && val !== null) return deepVal(val as XmlParsed, rest)
  return undefined
}

function getNum(val: unknown): number {
  if (val && typeof val === "object" && "#text" in val) {
    return Number((val as XmlParsed)["#text"]) || 0
  }
  return Number(val) || 0
}

function getStr(val: unknown): string | undefined {
  if (val === undefined || val === null) return undefined
  if (typeof val === "object" && "#text" in val) {
    return String((val as XmlParsed)["#text"])
  }
  return String(val)
}

export function parseUblXml(xmlContent: string): FacturaCompleta {
  const result: XmlParsed = xmlParser.parse(xmlContent)
  const invoice = result.Invoice || result["ubl:Invoice"]

  if (!invoice) {
    throw new Error("Formato UBL no válido")
  }

  const emisor = extractUblEmisor(invoice)
  const receptor = extractUblReceptor(invoice)
  const factura = extractUblFactura(invoice)
  const lineas = extractUblLineas(invoice["cac:InvoiceLine"] || invoice.InvoiceLine)

  return { emisor, receptor, factura, lineas }
}

function extractUblEmisor(invoice: XmlParsed): DatosEmisor {
  const supplier = getVal(invoice, "cac:AccountingSupplierParty", "AccountingSupplierParty") as XmlParsed
  const party = getVal(supplier, "cac:Party", "Party") as XmlParsed
  const partyName = getVal(party, "cac:PartyName", "PartyName") as XmlParsed
  const postalAddress = getVal(party, "cac:PostalAddress", "PostalAddress") as XmlParsed
  const contact = getVal(party, "cac:Contact", "Contact") as XmlParsed
  const partyId = getVal(party, "cac:PartyIdentification", "PartyIdentification") as XmlParsed | XmlParsed[] | undefined
  const partyIdArr = Array.isArray(partyId) ? partyId : [partyId].filter(Boolean)

  return {
    nombre: getStr(getVal(partyName, "cbc:Name", "Name")) || "Desconocido",
    nif: getStr(getVal(partyIdArr[0], "cbc:ID", "ID")),
    direccion: getStr(getVal(postalAddress, "cbc:StreetName", "StreetName")),
    poblacion: getStr(getVal(postalAddress, "cbc:CityName", "CityName")),
    cp: getStr(getVal(postalAddress, "cbc:PostalZone", "PostalZone")),
    pais: getStr(deepVal(postalAddress, ["cac:Country", "cbc:IdentificationCode"])),
    email: getStr(getVal(contact, "cbc:ElectronicMail", "ElectronicMail")),
    telefono: getStr(getVal(contact, "cbc:Telephone", "Telephone")),
  }
}

function extractUblReceptor(invoice: XmlParsed): DatosReceptor {
  const customer = getVal(invoice, "cac:AccountingCustomerParty", "AccountingCustomerParty") as XmlParsed
  const party = getVal(customer, "cac:Party", "Party") as XmlParsed
  const partyName = getVal(party, "cac:PartyName", "PartyName") as XmlParsed
  const postalAddress = getVal(party, "cac:PostalAddress", "PostalAddress") as XmlParsed
  const partyId = getVal(party, "cac:PartyIdentification", "PartyIdentification") as XmlParsed | XmlParsed[] | undefined
  const partyIdArr = Array.isArray(partyId) ? partyId : [partyId].filter(Boolean)

  return {
    nombre: getStr(getVal(partyName, "cbc:Name", "Name")),
    nif: getStr(getVal(partyIdArr[0], "cbc:ID", "ID")),
    direccion: getStr(getVal(postalAddress, "cbc:StreetName", "StreetName")),
    poblacion: getStr(getVal(postalAddress, "cbc:CityName", "CityName")),
    cp: getStr(getVal(postalAddress, "cbc:PostalZone", "PostalZone")),
    pais: getStr(deepVal(postalAddress, ["cac:Country", "cbc:IdentificationCode"])),
    email: getStr(getVal(party, "cac:Contact", "Contact", "cbc:ElectronicMail", "ElectronicMail")),
  }
}

function extractUblFactura(invoice: XmlParsed): DatosFactura {
  const legalMonetaryTotal = getVal(invoice, "cac:LegalMonetaryTotal", "LegalMonetaryTotal") as XmlParsed
  const taxTotal = getVal(invoice, "cac:TaxTotal", "TaxTotal") as XmlParsed
  const paymentTerms = getVal(invoice, "cac:PaymentTerms", "PaymentTerms") as XmlParsed

  const taxExclusiveAmount = getVal(legalMonetaryTotal, "cbc:TaxExclusiveAmount", "TaxExclusiveAmount")
  const payableAmount = getVal(legalMonetaryTotal, "cbc:PayableAmount", "PayableAmount")
  const allowanceTotal = getVal(legalMonetaryTotal, "cbc:AllowanceTotalAmount", "AllowanceTotalAmount")

  const taxAmountVal = getVal(taxTotal, "cbc:TaxAmount", "TaxAmount")
  const taxSubtotal = getVal(taxTotal, "cac:TaxSubtotal", "TaxSubtotal") as XmlParsed | XmlParsed[] | undefined
  const taxSubtotalArr = Array.isArray(taxSubtotal) ? taxSubtotal : [taxSubtotal].filter(Boolean)
  const ivaPercent = getVal(taxSubtotalArr[0], "cbc:Percent", "Percent")

  const baseImponible = getNum(taxExclusiveAmount)
  const total = getNum(payableAmount)
  const descuento = getNum(allowanceTotal)

  let retentionAmount = 0
  const withholdingTaxTotal = getVal(invoice, "cac:WithholdingTaxTotal", "WithholdingTaxTotal") as XmlParsed | XmlParsed[] | undefined
  if (withholdingTaxTotal) {
    const wttArr = Array.isArray(withholdingTaxTotal) ? withholdingTaxTotal : [withholdingTaxTotal]
    for (const wtt of wttArr) {
      retentionAmount += getNum(getVal(wtt, "cbc:TaxAmount", "TaxAmount"))
    }
  }

  return {
    numeroFactura: getStr(getVal(invoice, "cbc:ID", "ID")) || "",
    fechaEmision: getStr(getVal(invoice, "cbc:IssueDate", "IssueDate")) || "",
    fechaVencimiento: getStr(getVal(invoice, "cbc:DueDate", "DueDate")),
    tipoDocumento: getStr(getVal(invoice, "cbc:InvoiceTypeCode", "InvoiceTypeCode")) || "factura",
    moneda: (taxExclusiveAmount && typeof taxExclusiveAmount === "object" && "@_currencyID" in taxExclusiveAmount
      ? (taxExclusiveAmount as XmlParsed)["@_currencyID"]
      : undefined) || "MXN",
    baseImponible,
    tipoIva: getNum(ivaPercent) || 21,
    cuotaIva: getNum(taxAmountVal),
    total,
    descuento,
    retencion: retentionAmount,
    neto: baseImponible - descuento,
    metodoPago: getStr(paymentTerms?.PaymentTermsDetails?.PaymentMeansCode),
    estado: "pendiente",
  }
}

function extractUblLineas(lines: XmlParsed[] | XmlParsed | undefined): LineaFactura[] {
  if (!lines) return []

  const lineArray = Array.isArray(lines) ? lines : [lines]

  return lineArray.map((line: XmlParsed, index: number) => {
    const item = getVal(line, "cac:Item", "Item") as XmlParsed
    const price = getVal(line, "cac:Price", "Price") as XmlParsed
    const invoicedQty = getVal(line, "cbc:InvoicedQuantity", "InvoicedQuantity")
    const priceAmount = getVal(price, "cbc:PriceAmount", "PriceAmount")
    const allowanceCharge = getVal(line, "cac:AllowanceCharge", "AllowanceCharge") as XmlParsed | XmlParsed[] | undefined
    const allowanceArr = Array.isArray(allowanceCharge) ? allowanceCharge : [allowanceCharge].filter(Boolean)
    const classifiedTax = getVal(item, "cac:ClassifiedTaxCategory", "ClassifiedTaxCategory") as XmlParsed

    const quantity = getNum(invoicedQty) || 1
    const unitPrice = getNum(priceAmount)
    const discount = getNum(allowanceArr[0]?.ChargeAmount)
    const iva = getNum(getVal(classifiedTax, "cbc:Percent", "Percent")) || 21
    const subtotal = quantity * unitPrice - discount
    const ivaAmount = subtotal * (iva / 100)

    return {
      numeroLinea: index + 1,
      descripcion: getStr(getVal(item, "cbc:Name", "Name", "cbc:Description", "Description")) || "",
      cantidad: quantity,
      precioUnitario: unitPrice,
      descuento: discount,
      tipoIva: iva,
      subtotal,
      total: subtotal + ivaAmount,
    }
  })
}

function parseCfdiXml(xmlContent: string): FacturaCompleta {
  const result: XmlParsed = xmlParser.parse(xmlContent)
  const comprobante = result["cfdi:Comprobante"] || result.Comprobante

  if (!comprobante) {
    throw new Error("Formato CFDI no valido")
  }

  const emisor = extractCfdiEmisor(comprobante["cfdi:Emisor"] || comprobante.Emisor)
  const receptor = extractCfdiReceptor(comprobante["cfdi:Receptor"] || comprobante.Receptor)
  const factura = extractCfdiFactura(comprobante)
  const lineas = extractCfdiLineas(comprobante["cfdi:Conceptos"]?.["cfdi:Concepto"] || comprobante.Conceptos?.Concepto)

  return { emisor, receptor, factura, lineas }
}

function extractCfdiEmisor(emisor: XmlParsed | undefined): DatosEmisor {
  if (!emisor) {
    return { nombre: "Desconocido" }
  }
  return {
    nombre: emisor["@_Nombre"] || "Desconocido",
    nif: emisor["@_Rfc"],
    email: undefined,
    telefono: undefined,
  }
}

function extractCfdiReceptor(receptor: XmlParsed | undefined): DatosReceptor {
  if (!receptor) {
    return { nombre: undefined }
  }
  return {
    nombre: receptor["@_Nombre"],
    nif: receptor["@_Rfc"],
    email: undefined,
  }
}

function extractCfdiFactura(comprobante: XmlParsed): DatosFactura {
  const impuestos = comprobante["cfdi:Impuestos"] || comprobante.Impuestos
  const traslados = impuestos?.["cfdi:Traslados"]?.["cfdi:Traslado"] || impuestos?.Traslados?.Traslado
  const trasladosArr = Array.isArray(traslados) ? traslados : [traslados].filter(Boolean)

  let cuotaIva = 0
  let tipoIva = 16
  for (const traslado of trasladosArr) {
    const tasa = Number(traslado?.["@_TasaCuota"]) || 0
    const importe = Number(traslado?.["@_Importe"]) || 0
    if (tasa > 0) {
      cuotaIva += importe
      tipoIva = Math.round(tasa * 100)
    }
  }

  const subTotal = Number(comprobante["@_SubTotal"]) || 0
  const total = Number(comprobante["@_Total"]) || 0
  const descuento = Number(comprobante["@_Descuento"]) || 0
  const fecha = comprobante["@_Fecha"] || ""
  const serie = comprobante["@_Serie"] || ""
  const folio = comprobante["@_Folio"] || ""
  const numeroFactura = `${serie}${folio}`.trim() || ""

  const formaPago = comprobante["@_FormaPago"]
  const metodoPago = comprobante["@_MetodoPago"]

  return {
    numeroFactura,
    fechaEmision: fecha.split("T")[0] || fecha,
    fechaVencimiento: undefined,
    tipoDocumento: "factura",
    moneda: comprobante["@_Moneda"] || "MXN",
    baseImponible: subTotal,
    tipoIva,
    cuotaIva,
    total,
    descuento,
    retencion: 0,
    neto: subTotal - descuento,
    metodoPago: metodoPago || formaPago || undefined,
    estado: "pendiente",
  }
}

function extractCfdiLineas(conceptos: XmlParsed[] | XmlParsed | undefined): LineaFactura[] {
  if (!conceptos) return []
  const lineaArray = Array.isArray(conceptos) ? conceptos : [conceptos]

  return lineaArray.map((concepto: XmlParsed, index: number) => {
    const cantidad = Number(concepto["@_Cantidad"]) || 1
    const valorUnitario = Number(concepto["@_ValorUnitario"]) || 0
    const importe = Number(concepto["@_Importe"]) || 0
    const descuento = Number(concepto["@_Descuento"]) || 0

    const impuestos = concepto["cfdi:Impuestos"] || concepto.Impuestos
    const traslados = impuestos?.["cfdi:Traslados"]?.["cfdi:Traslado"] || impuestos?.Traslados?.Traslado
    const trasladosArr = Array.isArray(traslados) ? traslados : [traslados].filter(Boolean)

    let ivaRate = 16
    for (const t of trasladosArr) {
      const tasa = Number(t?.["@_TasaCuota"]) || 0
      if (tasa > 0) {
        ivaRate = Math.round(tasa * 100)
        break
      }
    }

    const subtotal = importe - descuento
    const ivaAmount = subtotal * (ivaRate / 100)

    return {
      numeroLinea: index + 1,
      descripcion: concepto["@_Descripcion"] || getStr(getVal(concepto, "cfdi:Descripcion", "Descripcion")) || "",
      cantidad,
      precioUnitario: valorUnitario,
      descuento,
      tipoIva: ivaRate,
      subtotal,
      total: subtotal + ivaAmount,
    }
  })
}

export function detectXmlFormat(xmlContent: string): "facturae" | "ubl" | "cfdi" | "unknown" {
  if (xmlContent.includes("Facturae") || xmlContent.includes("http://www.facturae.es")) {
    return "facturae"
  }
  if (xmlContent.includes("cfdi:Comprobante") || xmlContent.includes("http://www.sat.gob.mx/cfd")) {
    return "cfdi"
  }
  if (xmlContent.includes("Invoice") || xmlContent.includes("urn:oasis:names:specification:ubl")) {
    return "ubl"
  }
  return "unknown"
}

export function parseXml(xmlContent: string): FacturaCompleta {
  const format = detectXmlFormat(xmlContent)

  switch (format) {
    case "facturae":
      return parseFacturaeXml(xmlContent)
    case "cfdi":
      return parseCfdiXml(xmlContent)
    case "ubl":
      return parseUblXml(xmlContent)
    default:
      throw new Error("Formato XML de factura no reconocido")
  }
}
