declare module "fast-xml-parser" {
  interface XMLParserOptions {
    ignoreAttributes?: boolean
    attributeNamePrefix?: string
    allowBooleanAttributes?: boolean
    parseTagValue?: boolean
    trimValues?: boolean
    [key: string]: unknown
  }

  export class XMLParser {
    constructor(options?: XMLParserOptions)
    parse(xmlData: string): Record<string, unknown>
  }
}
