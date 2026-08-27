declare module "pdf-parse" {
  interface PDFData {
    numpages: number
    numrender: number
    info: Record<string, unknown>
    metadata: unknown
    text: string
    version: string
  }

  function pdfParse(dataBuffer: Buffer, options?: Record<string, unknown>): Promise<PDFData>
  export default pdfParse
}

declare module "pdf-parse/lib/pdf-parse" {
  import pdfParse from "pdf-parse"
  export default pdfParse
}
