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

  return {
    numeroFactura: header.InvoiceNumber || header.InvoiceDocumentNumber || "",
    fechaEmision: header.InvoiceIssueDate || "",
    fechaVencimiento: invoice.DueDate,
    tipoDocumento: header.InvoiceDocumentType?.toString() || "factura",
    moneda: invoiceTotals?.InvoiceCurrencyCode || "EUR",
    baseImponible: Number(invoiceTotals?.InvoiceTotal?.TotalAmount) || 0,
    tipoIva: 21,
    cuotaIva,
    total: Number(invoiceTotals?.InvoiceTotal?.TotalAmount) || 0,
    descuento: Number(invoiceTotals?.InvoiceTotal?.TotalDiscountAmount) || 0,
    retencion: Number(invoiceTotals?.InvoiceTotal?.TotalRetentionsAmount) || 0,
    neto: undefined,
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
    const unitPrice = Number(item?.Price?.UnitPrice) || 0
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
  const roundingAmount = getVal(legalMonetaryTotal, "cbc:PayableRoundingAmount", "PayableRoundingAmount")

  const taxAmountVal = getVal(taxTotal, "cbc:TaxAmount", "TaxAmount")
  const taxSubtotal = getVal(taxTotal, "cac:TaxSubtotal", "TaxSubtotal") as XmlParsed | XmlParsed[] | undefined
  const taxSubtotalArr = Array.isArray(taxSubtotal) ? taxSubtotal : [taxSubtotal].filter(Boolean)
  const ivaPercent = getVal(taxSubtotalArr[0], "cbc:Percent", "Percent")

  return {
    numeroFactura: getStr(getVal(invoice, "cbc:ID", "ID")) || "",
    fechaEmision: getStr(getVal(invoice, "cbc:IssueDate", "IssueDate")) || "",
    fechaVencimiento: getStr(getVal(invoice, "cbc:DueDate", "DueDate")),
    tipoDocumento: getStr(getVal(invoice, "cbc:InvoiceTypeCode", "InvoiceTypeCode")) || "factura",
    moneda: (taxExclusiveAmount && typeof taxExclusiveAmount === "object" && "@_currencyID" in taxExclusiveAmount
      ? (taxExclusiveAmount as XmlParsed)["@_currencyID"]
      : undefined) || "EUR",
    baseImponible: getNum(taxExclusiveAmount),
    tipoIva: getNum(ivaPercent) || 21,
    cuotaIva: getNum(taxAmountVal),
    total: getNum(payableAmount),
    descuento: getNum(allowanceTotal),
    retencion: getNum(roundingAmount),
    neto: undefined,
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

export function detectXmlFormat(xmlContent: string): "facturae" | "ubl" | "unknown" {
  if (xmlContent.includes("Facturae") || xmlContent.includes("http://www.facturae.es")) {
    return "facturae"
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
    case "ubl":
      return parseUblXml(xmlContent)
    default:
      throw new Error("Formato XML de factura no reconocido")
  }
}
