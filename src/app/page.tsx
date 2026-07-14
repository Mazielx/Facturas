"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import NegocioSelector from "./negocio-selector"
import MonthlySpending from "./components/charts/monthly-spending"
import TopProviders from "./components/charts/top-providers"
import StatusDistribution from "./components/charts/status-distribution"

interface NegocioInfo {
  nombre: string
  slug: string
  moneda_default: string
}

interface Resumen {
  totalFacturas: number
  totalImporte: number
  totalIva: number
  porConfianza: Record<string, number>
  requierenRevision: number
  duplicados: number
}

interface Factura {
  id: number
  numero_factura: string
  fecha_emision: string
  emisor_nombre: string
  total: number
  moneda: string
  estado: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function Home() {
  const [negocio, setNegocio] = useState<NegocioInfo | null | undefined>(undefined)
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [porMes, setPorMes] = useState<Array<{ mes: string; count: number; sum: number }>>([])
  const [topEmisores, setTopEmisores] = useState<Array<{ emisor_nombre: string; count: number; sum: number }>>([])
  const [porEstado, setPorEstado] = useState<Array<{ estado: string; count: number; sum: number }>>([])
  const [loading, setLoading] = useState(true)
  const [extracting, setExtracting] = useState(false)
  const [extractResult, setExtractResult] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function check() {
      try {
        const res = await fetch("/api/negocios")
        if (res.status === 401) {
          window.location.href = "/login"
          return
        }
        const data = await res.json()
        if (cancelled) return
        if (data.activeSlug && data.negocios) {
          const active = data.negocios.find(
            (n: NegocioInfo) => n.slug === data.activeSlug
          )
          if (active) {
            setNegocio(active)
            return
          }
        }
        setNegocio(null)
      } catch {
        if (!cancelled) setNegocio(null)
      }
    }
    check()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!negocio) return

    const load = async () => {
      setLoading(true)
      try {
        const [statsRes, facturasRes] = await Promise.all([
          fetch("/api/facturas/stats"),
          fetch("/api/facturas?limit=10"),
        ])

        if (statsRes.status === 401) {
          setNegocio(null)
          return
        }

        if (statsRes.ok) {
          const stats = await statsRes.json()
          setResumen(stats.resumen)
          setPorMes(stats.porMes || [])
          setTopEmisores(stats.topEmisores || [])
          setPorEstado(stats.porEstado || [])
        }

        if (facturasRes.ok) {
          const data = await facturasRes.json()
          setFacturas(data.facturas)
          setPagination(data.pagination)
        }
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [negocio])

  const handleExtract = async () => {
    setExtracting(true)
    setExtractResult(null)

    try {
      const res = await fetch("/api/extract", { method: "POST" })
      const data = await res.json()

      if (res.ok) {
        setExtractResult(
          `Extraídas ${data.processed} facturas. ${data.errors > 0 ? `${data.errors} errores.` : ""}`
        )
        if (data.processed > 0) {
          const [statsRes, facturasRes] = await Promise.all([
            fetch("/api/facturas/stats"),
            fetch("/api/facturas?limit=10"),
          ])
          if (statsRes.ok) {
            const stats = await statsRes.json()
            setResumen(stats.resumen)
            setPorMes(stats.porMes || [])
            setTopEmisores(stats.topEmisores || [])
            setPorEstado(stats.porEstado || [])
          }
          if (facturasRes.ok) {
            const factData = await facturasRes.json()
            setFacturas(factData.facturas)
            setPagination(factData.pagination)
          }
        }
      } else {
        setExtractResult(data.error || "Error en la extracción")
      }
    } catch {
      setExtractResult("Error de conexión")
    } finally {
      setExtracting(false)
    }
  }

  const handleLogout = async () => {
    if (!negocio) return
    await fetch(`/api/negocios/${negocio.slug}/select`, { method: "DELETE" })
    setNegocio(null)
    setResumen(null)
    setFacturas([])
  }

  const formatCurrency = (amount: number, currency?: string) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: currency || negocio?.moneda_default || "MXN" }).format(amount)

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("es-MX")
    } catch {
      return dateStr
    }
  }

  const estadoBadge = (estado: string) => {
    const colors: Record<string, string> = {
      pagada: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
      pendiente: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
      cancelada: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800",
    }
    return colors[estado] || "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
  }

  if (negocio === undefined) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-600 dark:border-zinc-400" />
      </div>
    )
  }

  if (!negocio) {
    return <NegocioSelector onSelect={() => { window.location.reload() }} />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-600 dark:border-zinc-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              {negocio.nombre}
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-mono">
              {negocio.moneda_default}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExtract}
              disabled={extracting}
              className="text-sm px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              {extracting ? "Extrayendo..." : "Extraer de Gmail"}
            </button>
            <Link
              href="/facturas"
              className="text-sm px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
            >
              Ver todas
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm px-3 py-2 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
              title="Cambiar de negocio"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {extractResult && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm border border-blue-200 dark:border-blue-800">
            {extractResult}
          </div>
        )}

        {resumen && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Total Facturas</p>
                <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                  {resumen.totalFacturas}
                </p>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Importe Total</p>
                <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(resumen.totalImporte)}
                </p>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">IVA Total</p>
                <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(resumen.totalIva)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Confianza Alta</p>
                <p className="text-2xl font-semibold text-green-600 dark:text-green-400">
                  {resumen.porConfianza?.alta || 0}
                </p>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Requieren Revision</p>
                <p className="text-2xl font-semibold text-orange-600 dark:text-orange-400">
                  {resumen.requierenRevision || 0}
                </p>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Duplicados Potenciales</p>
                <p className="text-2xl font-semibold text-red-600 dark:text-red-400">
                  {resumen.duplicados || 0}
                </p>
              </div>
            </div>
          </>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4 uppercase tracking-wide">Gasto Mensual</h2>
            <MonthlySpending />
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4 uppercase tracking-wide">Top Proveedores</h2>
            <TopProviders />
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4 uppercase tracking-wide">Distribucion por Estado</h2>
            <StatusDistribution />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="font-medium text-zinc-900 dark:text-zinc-100">
              Últimas Facturas
            </h2>
          </div>

          {facturas.length === 0 ? (
            <div className="px-5 py-12 text-center text-zinc-500 dark:text-zinc-400">
              <p className="text-lg mb-2">No hay facturas registradas</p>
              <p className="text-sm">Conecta Gmail y extrae facturas para comenzar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-zinc-500 dark:text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                    <th className="px-5 py-3 font-medium">Fecha</th>
                    <th className="px-5 py-3 font-medium">Emisor</th>
                    <th className="px-5 py-3 font-medium">Número</th>
                    <th className="px-5 py-3 font-medium text-right">Total</th>
                    <th className="px-5 py-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {facturas.map((f) => (
                    <tr
                      key={f.id}
                      className="border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">
                        {formatDate(f.fecha_emision)}
                      </td>
                      <td className="px-5 py-3 text-zinc-900 dark:text-zinc-100 font-medium">
                        {f.emisor_nombre}
                      </td>
                      <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400 font-mono text-xs">
                        {f.numero_factura}
                      </td>
                      <td className="px-5 py-3 text-right text-zinc-900 dark:text-zinc-100 font-medium">
                        {formatCurrency(f.total, f.moneda)}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${estadoBadge(f.estado)}`}>
                          {f.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pagination && pagination.total > 10 && (
            <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 text-right">
              <Link
                href="/facturas"
                className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
              >
                Ver las {pagination.total} facturas →
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
