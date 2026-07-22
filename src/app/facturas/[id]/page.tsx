"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"

interface LineaFactura {
  id: number
  numero_linea: number
  descripcion: string
  cantidad: number
  precio_unitario: number
  descuento: number
  tipo_iva: number
  subtotal: number
  total: number
}

interface Adjunto {
  id: number
  filename: string
  mime_type: string
  size: number
  content_hash: string
}

interface Etiqueta {
  id: number
  nombre: string
  color: string
}

interface Duplicado {
  id: number
  factura_id: number
  duplicada_de_id: number
  razon: string
  score: number
  numero_factura: string
  emisor_nombre: string
  total: number
  fecha_emision: string
}

interface Factura {
  id: number
  emisor_nombre: string
  emisor_nif: string
  emisor_direccion: string
  emisor_poblacion: string
  emisor_provincia: string
  emisor_cp: string
  emisor_pais: string
  emisor_email: string
  emisor_telefono: string
  receptor_nombre: string
  receptor_nif: string
  receptor_direccion: string
  receptor_poblacion: string
  receptor_provincia: string
  receptor_cp: string
  receptor_pais: string
  receptor_email: string
  numero_factura: string
  fecha_emision: string
  fecha_vencimiento: string
  tipo_documento: string
  moneda: string
  base_imponible: number
  tipo_iva: number
  cuota_iva: number
  total: number
  descuento: number
  retencion: number
  neto: number
  metodo_pago: string
  estado: string
  confianza_score: number
  confianza_nivel: string
  requiere_revision: number
  revision_notas: string
}

export default function FacturaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [factura, setFactura] = useState<Factura | null>(null)
  const [lineas, setLineas] = useState<LineaFactura[]>([])
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>([])
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([])
  const [todasEtiquetas, setTodasEtiquetas] = useState<Etiqueta[]>([])
  const [duplicados, setDuplicados] = useState<Duplicado[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revisionNotes, setRevisionNotes] = useState("")

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/facturas/${id}`)
        if (!res.ok) {
          setError("Factura no encontrada")
          return
        }
        const data = await res.json()
        setFactura(data.factura)
        setLineas(data.lineas)
        setAdjuntos(data.adjuntos)
        setEtiquetas(data.etiquetas || [])
        setRevisionNotes(data.factura?.revision_notas || "")

        const [etiquetasRes, duplicadosRes] = await Promise.all([
          fetch("/api/etiquetas"),
          fetch(`/api/facturas/${id}/duplicados`),
        ])

        if (etiquetasRes.ok) {
          setTodasEtiquetas(await etiquetasRes.json())
        }
        if (duplicadosRes.ok) {
          setDuplicados(await duplicadosRes.json())
        }
      } catch {
        setError("Error al cargar la factura")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [id])

  const formatCurrency = (amount: number, currency: string = "EUR") =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(amount)

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-"
    try {
      return new Date(dateStr).toLocaleDateString("es-ES")
    } catch {
      return dateStr
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleToggleRevision = async () => {
    if (!factura) return
    const newValue = factura.requiere_revision ? 0 : 1
    await fetch(`/api/facturas/${id}/revision`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requiere_revision: newValue, revision_notas: revisionNotes }),
    })
    setFactura({ ...factura, requiere_revision: newValue })
  }

  const handleSaveRevisionNotes = async () => {
    if (!factura) return
    await fetch(`/api/facturas/${id}/revision`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requiere_revision: factura.requiere_revision, revision_notas: revisionNotes }),
    })
  }

  const handleAddEtiqueta = async (etiquetaId: number) => {
    await fetch(`/api/facturas/${id}/etiquetas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etiqueta_id: etiquetaId }),
    })
    const etiqueta = todasEtiquetas.find((e) => e.id === etiquetaId)
    if (etiqueta) {
      setEtiquetas([...etiquetas, etiqueta])
    }
  }

  const handleRemoveEtiqueta = async (etiquetaId: number) => {
    await fetch(`/api/facturas/${id}/etiquetas?etiqueta_id=${etiquetaId}`, {
      method: "DELETE",
    })
    setEtiquetas(etiquetas.filter((e) => e.id !== etiquetaId))
  }

  const handleEstadoChange = async (newEstado: string) => {
    if (!factura) return
    const res = await fetch(`/api/facturas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: newEstado }),
    })
    if (res.ok) {
      setFactura({ ...factura, estado: newEstado })
    }
  }

  const confianzaBadge = (nivel: string) => {
    const colors: Record<string, string> = {
      confiable: "bg-emerald-100 text-emerald-800",
      alta: "bg-green-100 text-green-800",
      media: "bg-yellow-100 text-yellow-800",
      baja: "bg-orange-100 text-orange-800",
    }
    return colors[nivel] || "bg-zinc-100 text-zinc-600"
  }

  const availableEtiquetas = todasEtiquetas.filter(
    (e) => !etiquetas.find((el) => el.id === e.id)
  )

  const estadoBadge = (estado: string) => {
    const colors: Record<string, string> = {
      pagada: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
      pendiente: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
      cancelada: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800",
    }
    return colors[estado] || "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-600 dark:border-zinc-400" />
      </div>
    )
  }

  if (error || !factura) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
            <Link
              href="/facturas"
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
              ← Facturas
            </Link>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-16 text-center">
          <p className="text-zinc-500 dark:text-zinc-400 text-lg">{error}</p>
        </main>
      </div>
    )
  }

  const moneda = factura.moneda || "EUR"

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/facturas"
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
              ← Facturas
            </Link>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              {factura.numero_factura}
            </h1>
            <button
              onClick={() => handleEstadoChange(factura.estado === "pagada" ? "pendiente" : "pagada")}
              className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium cursor-pointer hover:opacity-80 ${estadoBadge(factura.estado)}`}
            >
              {factura.estado}
            </button>
            {factura.estado !== "cancelada" && (
              <button
                onClick={() => handleEstadoChange("cancelada")}
                className="inline-block px-2 py-0.5 rounded-md text-xs font-medium cursor-pointer hover:opacity-80 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800"
              >
                Cancelar
              </button>
            )}
            <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${confianzaBadge(factura.confianza_nivel)}`}>
              Confianza: {factura.confianza_nivel} ({Math.round(factura.confianza_score * 100)}%)
            </span>
            {factura.requiere_revision ? (
              <span className="inline-block px-2 py-0.5 rounded-md text-xs font-medium bg-orange-100 text-orange-800">
                Requiere Revision
              </span>
            ) : null}
          </div>
          {adjuntos.length > 0 && (
            <a
              href={`/api/facturas/${factura.id}/adjunto`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Descargar PDF
            </a>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3 uppercase tracking-wide">Emisor</h2>
            <div className="space-y-1 text-sm">
              <p className="text-zinc-900 dark:text-zinc-100 font-medium">{factura.emisor_nombre}</p>
              {factura.emisor_nif && <p className="text-zinc-600 dark:text-zinc-400">NIF: {factura.emisor_nif}</p>}
              {factura.emisor_direccion && <p className="text-zinc-600 dark:text-zinc-400">{factura.emisor_direccion}</p>}
              {(factura.emisor_cp || factura.emisor_poblacion) && (
                <p className="text-zinc-600 dark:text-zinc-400">
                  {factura.emisor_cp} {factura.emisor_poblacion}
                  {factura.emisor_provincia ? `, ${factura.emisor_provincia}` : ""}
                </p>
              )}
              {factura.emisor_pais && <p className="text-zinc-600 dark:text-zinc-400">{factura.emisor_pais}</p>}
              {factura.emisor_email && <p className="text-zinc-600 dark:text-zinc-400">{factura.emisor_email}</p>}
              {factura.emisor_telefono && <p className="text-zinc-600 dark:text-zinc-400">{factura.emisor_telefono}</p>}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3 uppercase tracking-wide">Receptor</h2>
            <div className="space-y-1 text-sm">
              {factura.receptor_nombre ? (
                <p className="text-zinc-900 dark:text-zinc-100 font-medium">{factura.receptor_nombre}</p>
              ) : (
                <p className="text-zinc-400 dark:text-zinc-500 italic">Sin datos</p>
              )}
              {factura.receptor_nif && <p className="text-zinc-600 dark:text-zinc-400">NIF: {factura.receptor_nif}</p>}
              {factura.receptor_direccion && <p className="text-zinc-600 dark:text-zinc-400">{factura.receptor_direccion}</p>}
              {(factura.receptor_cp || factura.receptor_poblacion) && (
                <p className="text-zinc-600 dark:text-zinc-400">
                  {factura.receptor_cp} {factura.receptor_poblacion}
                  {factura.receptor_provincia ? `, ${factura.receptor_provincia}` : ""}
                </p>
              )}
              {factura.receptor_pais && <p className="text-zinc-600 dark:text-zinc-400">{factura.receptor_pais}</p>}
              {factura.receptor_email && <p className="text-zinc-600 dark:text-zinc-400">{factura.receptor_email}</p>}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4 uppercase tracking-wide">Datos de la Factura</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs">Número</p>
              <p className="text-zinc-900 dark:text-zinc-100 font-mono">{factura.numero_factura}</p>
            </div>
            <div>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs">Fecha Emisión</p>
              <p className="text-zinc-900 dark:text-zinc-100">{formatDate(factura.fecha_emision)}</p>
            </div>
            <div>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs">Fecha Vencimiento</p>
              <p className="text-zinc-900 dark:text-zinc-100">{formatDate(factura.fecha_vencimiento)}</p>
            </div>
            <div>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs">Tipo</p>
              <p className="text-zinc-900 dark:text-zinc-100">{factura.tipo_documento}</p>
            </div>
            <div>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs">Método de Pago</p>
              <p className="text-zinc-900 dark:text-zinc-100">{factura.metodo_pago || "-"}</p>
            </div>
            <div>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs">Moneda</p>
              <p className="text-zinc-900 dark:text-zinc-100 font-mono">{factura.moneda}</p>
            </div>
            <div>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs">Base Imponible</p>
              <p className="text-zinc-900 dark:text-zinc-100">{formatCurrency(factura.base_imponible, moneda)}</p>
            </div>
            <div>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs">Tipo IVA</p>
              <p className="text-zinc-900 dark:text-zinc-100">{factura.tipo_iva}%</p>
            </div>
            <div>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs">Cuota IVA</p>
              <p className="text-zinc-900 dark:text-zinc-100">{formatCurrency(factura.cuota_iva, moneda)}</p>
            </div>
            {factura.descuento > 0 && (
              <div>
                <p className="text-zinc-500 dark:text-zinc-400 text-xs">Descuento</p>
                <p className="text-zinc-900 dark:text-zinc-100">{formatCurrency(factura.descuento, moneda)}</p>
              </div>
            )}
            {factura.retencion > 0 && (
              <div>
                <p className="text-zinc-500 dark:text-zinc-400 text-xs">Retención</p>
                <p className="text-zinc-900 dark:text-zinc-100">{formatCurrency(factura.retencion, moneda)}</p>
              </div>
            )}
            <div>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs">Total</p>
              <p className="text-zinc-900 dark:text-zinc-100 font-semibold text-lg">{formatCurrency(factura.total, moneda)}</p>
            </div>
          </div>
        </div>

        {lineas.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Líneas</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-zinc-500 dark:text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                    <th className="px-5 py-3 font-medium">#</th>
                    <th className="px-5 py-3 font-medium">Descripción</th>
                    <th className="px-5 py-3 font-medium text-right">Cantidad</th>
                    <th className="px-5 py-3 font-medium text-right">P. Unitario</th>
                    <th className="px-5 py-3 font-medium text-right">Dto.</th>
                    <th className="px-5 py-3 font-medium text-right">IVA</th>
                    <th className="px-5 py-3 font-medium text-right">Subtotal</th>
                    <th className="px-5 py-3 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lineas.map((l) => (
                    <tr
                      key={l.id}
                      className="border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                    >
                      <td className="px-5 py-3 text-zinc-400 dark:text-zinc-500 text-xs">{l.numero_linea}</td>
                      <td className="px-5 py-3 text-zinc-900 dark:text-zinc-100">{l.descripcion}</td>
                      <td className="px-5 py-3 text-right text-zinc-600 dark:text-zinc-400">{l.cantidad}</td>
                      <td className="px-5 py-3 text-right text-zinc-600 dark:text-zinc-400">
                        {formatCurrency(l.precio_unitario, moneda)}
                      </td>
                      <td className="px-5 py-3 text-right text-zinc-600 dark:text-zinc-400">
                        {l.descuento > 0 ? `${l.descuento}%` : "-"}
                      </td>
                      <td className="px-5 py-3 text-right text-zinc-600 dark:text-zinc-400">{l.tipo_iva}%</td>
                      <td className="px-5 py-3 text-right text-zinc-600 dark:text-zinc-400">
                        {formatCurrency(l.subtotal, moneda)}
                      </td>
                      <td className="px-5 py-3 text-right text-zinc-900 dark:text-zinc-100 font-medium">
                        {formatCurrency(l.total, moneda)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {adjuntos.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3 uppercase tracking-wide">Archivos Adjuntos</h2>
            <div className="space-y-2">
              {adjuntos.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800"
                >
                  <svg className="w-5 h-5 text-zinc-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-900 dark:text-zinc-100 truncate">{a.filename}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {a.mime_type} · {formatSize(a.size)}
                    </p>
                  </div>
                  <a
                    href={`/api/facturas/${factura.id}/adjunto`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 rounded-md bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors shrink-0"
                  >
                    Abrir
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3 uppercase tracking-wide">Etiquetas</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {etiquetas.length === 0 && (
                <p className="text-sm text-zinc-400 dark:text-zinc-500 italic">Sin etiquetas</p>
              )}
              {etiquetas.map((e) => (
                <span
                  key={e.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium text-white"
                  style={{ backgroundColor: e.color || "#6b7280" }}
                >
                  {e.nombre}
                  <button
                    onClick={() => handleRemoveEtiqueta(e.id)}
                    className="ml-0.5 opacity-70 hover:opacity-100"
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
            {availableEtiquetas.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {availableEtiquetas.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => handleAddEtiqueta(e.id)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    + {e.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Revision</h2>
              <button
                onClick={handleToggleRevision}
                className={`text-xs px-3 py-1 rounded-md transition-colors ${
                  factura.requiere_revision
                    ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                }`}
              >
                {factura.requiere_revision ? "Marcar revisada" : "Marcar para revision"}
              </button>
            </div>
            <textarea
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              onBlur={handleSaveRevisionNotes}
              placeholder="Notas de revision..."
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500 resize-none"
              rows={3}
            />
          </div>
        </div>

        {duplicados.length > 0 && (
          <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-xl p-5">
            <h2 className="text-sm font-medium text-orange-800 dark:text-orange-300 mb-3 uppercase tracking-wide">
              Duplicados Potenciales ({duplicados.length})
            </h2>
            <div className="space-y-2">
              {duplicados.map((d) => (
                <div key={d.id} className="flex items-center gap-3 text-sm">
                  <Link
                    href={`/facturas/${d.factura_id === Number(id) ? d.duplicada_de_id : d.factura_id}`}
                    className="text-orange-700 dark:text-orange-300 hover:underline font-medium"
                  >
                    {d.numero_factura}
                  </Link>
                  <span className="text-orange-600 dark:text-orange-400">{d.emisor_nombre}</span>
                  <span className="text-orange-500 dark:text-orange-500">{formatCurrency(d.total, moneda)}</span>
                  <span className="text-orange-400 dark:text-orange-500 text-xs">Score: {Math.round(d.score * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
