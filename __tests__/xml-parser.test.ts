import { describe, it, expect } from "vitest"
import { parseXml, detectXmlFormat, parseFacturaeXml, parseUblXml } from "@/lib/extraction/xml-parser"

const FACTURAE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Facturae xmlns="http://www.facturae.es/data/2009/v1.1/Facturae">
  <FileHeader>
    <InvoiceDocumentType>FC</InvoiceDocumentType>
    <InvoiceNumber>FAC-2024-001</InvoiceNumber>
    <InvoiceIssueDate>2024-03-15</InvoiceIssueDate>
  </FileHeader>
  <Parties>
    <SellerParty>
      <TaxIdentification>
        <TaxIdentificationNumber>B12345678</TaxIdentificationNumber>
      </TaxIdentification>
      <LegalEntity>
        <TradeName>Empresa Vendedora S.L.</TradeName>
        <Address>
          <Address>Calle Mayor 1</Address>
          <Town>Madrid</Town>
          <Province>Madrid</Province>
          <PostCode>28001</PostCode>
          <CountryCode>ESP</CountryCode>
        </Address>
        <Telephone>912345678</Telephone>
        <ElectronicMail>ventas@vendedora.com</ElectronicMail>
      </LegalEntity>
    </SellerParty>
    <BuyerParty>
      <TaxIdentification>
        <TaxIdentificationNumber>A87654321</TaxIdentificationNumber>
      </TaxIdentification>
      <LegalEntity>
        <TradeName>Empresa Compradora S.A.</TradeName>
        <Address>
          <Address>Avda. de la Paz 100</Address>
          <Town>Barcelona</Town>
          <Province>Barcelona</Province>
          <PostCode>08001</PostCode>
          <CountryCode>ESP</CountryCode>
        </Address>
        <ElectronicMail>compras@compradora.com</ElectronicMail>
      </LegalEntity>
    </BuyerParty>
  </Parties>
  <Invoice>
    <InvoiceTotals>
      <InvoiceCurrencyCode>EUR</InvoiceCurrencyCode>
      <InvoiceTotal>
        <TotalAmount>1210.00</TotalAmount>
        <TotalDiscountAmount>100.00</TotalDiscountAmount>
      </InvoiceTotal>
      <TaxTotals>
        <TaxAmount>210.00</TaxAmount>
      </TaxTotals>
    </InvoiceTotals>
    <PaymentData>
      <PaymentMeans>
        <PaymentMeansCode>4</PaymentMeansCode>
      </PaymentMeans>
    </PaymentData>
    <Items>
      <InvoiceLine>
        <Item>
          <Description>Servicio de consultoría</Description>
          <Price>
            <UnitPrice>500.00</UnitPrice>
          </Price>
        </Item>
        <Quantity>2</Quantity>
        <TaxesAndSurcharges>
          <Tax>
            <TaxRate>21</TaxRate>
          </Tax>
        </TaxesAndSurcharges>
      </InvoiceLine>
      <InvoiceLine>
        <Item>
          <Description>Desarrollo web</Description>
          <Price>
            <UnitPrice>300.00</UnitPrice>
          </Price>
        </Item>
        <Quantity>2</Quantity>
        <TaxesAndSurcharges>
          <Tax>
            <TaxRate>21</TaxRate>
          </Tax>
        </TaxesAndSurcharges>
      </InvoiceLine>
    </Items>
  </Invoice>
</Facturae>`

const UBL_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ID>INV-2024-042</cbc:ID>
  <cbc:IssueDate>2024-06-01</cbc:IssueDate>
  <cbc:DueDate>2024-07-01</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>Proveedor Tech GmbH</cbc:Name>
      </cac:PartyName>
      <cac:PartyIdentification>
        <cbc:ID>DE123456789</cbc:ID>
      </cac:PartyIdentification>
      <cac:PostalAddress>
        <cbc:StreetName>Hauptstr. 42</cbc:StreetName>
        <cbc:CityName>Berlin</cbc:CityName>
        <cbc:PostalZone>10115</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>DE</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:Contact>
        <cbc:Telephone>+49 30 1234567</cbc:Telephone>
        <cbc:ElectronicMail>info@tech-gmbh.de</cbc:ElectronicMail>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>Cliente España S.L.</cbc:Name>
      </cac:PartyName>
      <cac:PartyIdentification>
        <cbc:ID>B99999999</cbc:ID>
      </cac:PartyIdentification>
      <cac:PostalAddress>
        <cbc:StreetName>Calle Gran Via 50</cbc:StreetName>
        <cbc:CityName>Madrid</cbc:CityName>
        <cbc:PostalZone>28013</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>ES</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:LegalMonetaryTotal>
    <cbc:TaxExclusiveAmount currencyID="EUR">2000.00</cbc:TaxExclusiveAmount>
    <cbc:AllowanceTotalAmount currencyID="EUR">200.00</cbc:AllowanceTotalAmount>
    <cbc:PayableAmount currencyID="EUR">2220.00</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="EUR">420.00</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="EUR">2000.00</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="EUR">420.00</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:Percent>21</cbc:Percent>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:InvoiceLine>
    <cbc:InvoicedQuantity unitCode="EA">10</cbc:InvoicedQuantity>
    <cac:Price>
      <cbc:PriceAmount currencyID="EUR">200.00</cbc:PriceAmount>
    </cac:Price>
    <cac:Item>
      <cbc:Name>Licencia software</cbc:Name>
      <cbc:Description>Licencia anual</cbc:Description>
      <cac:ClassifiedTaxCategory>
        <cbc:Percent>21</cbc:Percent>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
  </cac:InvoiceLine>
  <cac:InvoiceLine>
    <cbc:InvoicedQuantity unitCode="EA">5</cbc:InvoicedQuantity>
    <cac:Price>
      <cbc:PriceAmount currencyID="EUR">100.00</cbc:PriceAmount>
    </cac:Price>
    <cac:Item>
      <cbc:Name>Soporte técnico</cbc:Name>
      <cbc:Description>Mensual</cbc:Description>
      <cac:ClassifiedTaxCategory>
        <cbc:Percent>21</cbc:Percent>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
  </cac:InvoiceLine>
</Invoice>`

describe("detectXmlFormat", () => {
  it("detects Facturae format", () => {
    expect(detectXmlFormat(FACTURAE_XML)).toBe("facturae")
  })

  it("detects UBL format", () => {
    expect(detectXmlFormat(UBL_XML)).toBe("ubl")
  })

  it("returns unknown for unrecognized XML", () => {
    expect(detectXmlFormat("<root><data>test</data></root>")).toBe("unknown")
  })
})

describe("parseFacturaeXml", () => {
  const result = parseFacturaeXml(FACTURAE_XML)

  it("extracts emisor data", () => {
    expect(result.emisor.nombre).toBe("Empresa Vendedora S.L.")
    expect(result.emisor.nif).toBe("B12345678")
    expect(result.emisor.direccion).toBe("Calle Mayor 1")
    expect(result.emisor.poblacion).toBe("Madrid")
    expect(result.emisor.provincia).toBe("Madrid")
    expect(result.emisor.cp).toBe("28001")
    expect(result.emisor.pais).toBe("ES")
    expect(result.emisor.email).toBe("ventas@vendedora.com")
    expect(result.emisor.telefono).toBe("912345678")
  })

  it("extracts receptor data", () => {
    expect(result.receptor.nombre).toBe("Empresa Compradora S.A.")
    expect(result.receptor.nif).toBe("A87654321")
    expect(result.receptor.email).toBe("compras@compradora.com")
  })

  it("extracts factura data", () => {
    expect(result.factura.numeroFactura).toBe("FAC-2024-001")
    expect(result.factura.fechaEmision).toBe("2024-03-15")
    expect(result.factura.moneda).toBe("EUR")
    expect(result.factura.total).toBe(1210)
    expect(result.factura.descuento).toBe(100)
    expect(result.factura.cuotaIva).toBe(210)
    expect(result.factura.metodoPago).toBe("4")
    expect(result.factura.estado).toBe("pendiente")
  })

  it("extracts line items", () => {
    expect(result.lineas).toHaveLength(2)
    expect(result.lineas[0].descripcion).toBe("Servicio de consultoría")
    expect(result.lineas[0].cantidad).toBe(2)
    expect(result.lineas[0].precioUnitario).toBe(500)
    expect(result.lineas[0].tipoIva).toBe(21)
    expect(result.lineas[1].descripcion).toBe("Desarrollo web")
    expect(result.lineas[1].cantidad).toBe(2)
  })
})

describe("parseUblXml", () => {
  const result = parseUblXml(UBL_XML)

  it("extracts emisor data", () => {
    expect(result.emisor.nombre).toBe("Proveedor Tech GmbH")
    expect(result.emisor.nif).toBe("DE123456789")
    expect(result.emisor.direccion).toBe("Hauptstr. 42")
    expect(result.emisor.poblacion).toBe("Berlin")
    expect(result.emisor.cp).toBe("10115")
    expect(result.emisor.pais).toBe("DE")
    expect(result.emisor.email).toBe("info@tech-gmbh.de")
    expect(result.emisor.telefono).toBe("+49 30 1234567")
  })

  it("extracts receptor data", () => {
    expect(result.receptor.nombre).toBe("Cliente España S.L.")
    expect(result.receptor.nif).toBe("B99999999")
  })

  it("extracts factura data", () => {
    expect(result.factura.numeroFactura).toBe("INV-2024-042")
    expect(result.factura.fechaEmision).toBe("2024-06-01")
    expect(result.factura.fechaVencimiento).toBe("2024-07-01")
    expect(result.factura.moneda).toBe("EUR")
    expect(result.factura.baseImponible).toBe(2000)
    expect(result.factura.total).toBe(2220)
    expect(result.factura.descuento).toBe(200)
    expect(result.factura.cuotaIva).toBe(420)
  })

  it("extracts line items", () => {
    expect(result.lineas).toHaveLength(2)
    expect(result.lineas[0].descripcion).toBe("Licencia software")
    expect(result.lineas[0].cantidad).toBe(10)
    expect(result.lineas[0].precioUnitario).toBe(200)
    expect(result.lineas[0].tipoIva).toBe(21)
    expect(result.lineas[1].descripcion).toBe("Soporte técnico")
    expect(result.lineas[1].cantidad).toBe(5)
  })
})

describe("parseXml", () => {
  it("auto-detects and parses Facturae", () => {
    const result = parseXml(FACTURAE_XML)
    expect(result.emisor.nif).toBe("B12345678")
    expect(result.factura.numeroFactura).toBe("FAC-2024-001")
  })

  it("auto-detects and parses UBL", () => {
    const result = parseXml(UBL_XML)
    expect(result.emisor.nif).toBe("DE123456789")
    expect(result.factura.numeroFactura).toBe("INV-2024-042")
  })

  it("throws on unknown format", () => {
    expect(() => parseXml("<root>data</root>")).toThrow("Formato XML de factura no reconocido")
  })
})
