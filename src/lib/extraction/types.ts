export interface DatosEmisor {
  nombre: string
  nif?: string
  direccion?: string
  poblacion?: string
  provincia?: string
  cp?: string
  pais?: string
  email?: string
  telefono?: string
  logo?: string
}

export interface DatosReceptor {
  nombre?: string
  nif?: string
  direccion?: string
  poblacion?: string
  provincia?: string
  cp?: string
  pais?: string
  email?: string
}

export interface LineaFactura {
  numeroLinea: number
  descripcion: string
  cantidad: number
  precioUnitario: number
  descuento: number
  tipoIva: number
  subtotal: number
  total: number
}

export interface DatosFactura {
  numeroFactura: string
  fechaEmision: string
  fechaVencimiento?: string
  tipoDocumento: string
  moneda: string
  baseImponible: number
  tipoIva: number
  cuotaIva: number
  total: number
  descuento: number
  retencion: number
  neto?: number
  metodoPago?: string
  estado: "pendiente" | "pagada" | "cancelada"
}

export interface FacturaCompleta {
  emisor: DatosEmisor
  receptor: DatosReceptor
  factura: DatosFactura
  lineas: LineaFactura[]
}

export interface ExtractionResult {
  success: boolean
  facturaId?: number
  error?: string
  datos?: FacturaCompleta
}
