"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import ThemeToggle from "../components/theme-toggle"
import PlanModal from "../components/plan-modal"
import ExportFilenameModal from "../components/export-filename-modal"
import BackLink from "../components/back-link"
import { isSuscripcionActiva } from "@/lib/plans"

interface Factura {
  id: number
  numero_factura: string
  fecha_emision: string
  emisor_nombre: string
  receptor_nombre: string
  base_imponible: number
  tipo_iva: number
  cuota_iva: number
  total: number
  total_convertido: number
  moneda: string
  moneda_original: string
  moneda_default: string
  estado: string
  confianza_nivel: string
  confianza_score: number
  requiere_revision: number
  duplicados_count?: number
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function FacturasContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [facturas, setFacturas] = useState<Factura[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [planActivo, setPlanActivo] = useState<boolean | null>(null)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx" | null>(null)
  const [exportName, setExportName] = useState("facturas")

  const search = searchParams.get("search") || ""
  const fechaDesde = searchParams.get("fecha_desde") || ""
  const fechaHasta = searchParams.get("fecha_hasta") || ""
  const emisor = searchParams.get("emisor") || ""
  const estado = searchParams.get("estado") || ""
  const moneda = searchParams.get("moneda") || ""
  const confianza = searchParams.get("confianza") || ""
  const revision = searchParams.get("revision") || ""
  const etiqueta = searchParams.get("etiqueta") || ""
  const page = parseInt(searchParams.get("page") || "1")

  const [searchInput, setSearchInput] = useState(search)

  const buildUrl = useCallback(
    (overrides: Record<string, string>) => {
      const params = new URLSearchParams()
      const values = { search, fecha_desde: fechaDesde, fecha_hasta: fechaHasta, emisor, estado, moneda, confianza, revision, etiqueta, page: "1", ...overrides }
      for (const [k, v] of Object.entries(values)) {
        if (v) params.set(k, v)
      }
      return `/facturas?${params.toString()}`
    },
    [search, fechaDesde, fechaHasta, emisor, estado, moneda, confianza, revision, etiqueta]
  )

  useEffect(() => {
    if (searchInput === search) return
    const timer = setTimeout(() => {
      router.push(buildUrl({ search: searchInput }))
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput, search, buildUrl, router])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/negocios")
        if (!res.ok) return
        const data = await res.json()
        const active = (data.negocios || []).find(
          (n: { slug: string; plan_pagado_hasta: string | null; planActivo?: boolean }) => n.slug === data.activeSlug
        )
        setPlanActivo(
          active
            ? typeof active.planActivo === "boolean"
              ? active.planActivo
              : isSuscripcionActiva(active.plan_pagado_hasta)
            : false
        )
      } catch {}
    }
    load()
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (fechaDesde) params.set("fecha_desde", fechaDesde)
      if (fechaHasta) params.set("fecha_hasta", fechaHasta)
      if (emisor) params.set("emisor", emisor)
      if (estado) params.set("estado", estado)
      if (moneda) params.set("moneda", moneda)
      if (confianza) params.set("confianza", confianza)
      if (revision) params.set("revision", revision)
      if (etiqueta) params.set("etiqueta", etiqueta)
      params.set("page", String(page))
      params.set("limit", "20")

      try {
        const res = await fetch(`/api/facturas?${params.toString()}`)
        if (res.ok) {
          const data = await res.json()
          setFacturas(data.facturas)
          setPagination(data.pagination)
        } else if (res.status === 402) {
          setShowPlanModal(true)
        }
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [search, fechaDesde, fechaHasta, emisor, estado, moneda, confianza, revision, etiqueta, page])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(buildUrl({ search: searchInput }))
  }

  const handleExport = (format: "csv" | "xlsx") => {
    if (planActivo === false) {
      setShowPlanModal(true)
      return
    }
    const today = new Date().toISOString().slice(0, 10)
    setExportName(`facturas-${today}`)
    setExportFormat(format)
  }

  const sanitizeFileName = (name: string) => {
    const cleaned = name.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim()
    return cleaned || "facturas"
  }

  const downloadExport = async (name: string, format: "csv" | "xlsx") => {
    setExportFormat(null)
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (fechaDesde) params.set("fecha_desde", fechaDesde)
    if (fechaHasta) params.set("fecha_hasta", fechaHasta)
    if (emisor) params.set("emisor", emisor)
    if (estado) params.set("estado", estado)
    if (moneda) params.set("moneda", moneda)
    params.set("format", format)

    const res = await fetch(`/api/facturas/export?${params.toString()}`)
    if (!res.ok) {
      if (res.status === 402) setShowPlanModal(true)
      return
    }

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${sanitizeFileName(name)}.${format}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const toggleEstado = async (facturaId: number, current: string) => {
    const newEstado = current === "pagada" ? "pendiente" : "pagada"
    const res = await fetch(`/api/facturas/${facturaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: newEstado }),
    })
    if (res.ok) {
      setFacturas((prev) =>
        prev.map((f) => (f.id === facturaId ? { ...f, estado: newEstado } : f))
      )
    }
  }

  const formatCurrency = (amount: number, currency: string = "MXN") =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(amount)

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("es-ES")
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

  const confianzaBadge = (nivel: string) => {
    const colors: Record<string, string> = {
      confiable: "bg-emerald-100 text-emerald-800",
      alta: "bg-green-100 text-green-800",
      media: "bg-yellow-100 text-yellow-800",
      baja: "bg-orange-100 text-orange-800",
    }
    return colors[nivel] || "bg-zinc-100 text-zinc-600"
  }

  const hasFilters = search || fechaDesde || fechaHasta || emisor || estado || moneda || confianza || revision || etiqueta

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <BackLink
              fallback="/dashboard"
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
              <svg className="w-5 h-5 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">← Inicio</span>
            </BackLink>
            <h1 className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Facturas
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle />
            <div className="relative group">
              <button className="text-sm px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                <span className="hidden sm:inline">Exportar ▾</span>
                <svg className="w-4 h-4 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
              <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={() => handleExport("csv")}
                  className="w-full text-left px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-t-lg"
                >
                  Exportar CSV
                </button>
                <button
                  onClick={() => handleExport("xlsx")}
                  className="w-full text-left px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-b-lg"
                >
                  Exportar Excel
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {planActivo === false && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 text-sm border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-4">
            <p>Tu plan no esta activo. Las funciones estan bloqueadas hasta que confirmes el pago de uno de los planes.</p>
            <button
              onClick={() => setShowPlanModal(true)}
              className="shrink-0 px-4 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium transition-colors"
            >
              Activar plan
            </button>
          </div>
        )}
        <form onSubmit={handleSearch} className="mb-6 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar factura..."
              className="flex-1 px-3 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500 min-w-0"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shrink-0"
            >
              Buscar
            </button>
            {hasFilters && (
              <Link
                href="/facturas"
                className="px-3 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
              >
                Limpiar
              </Link>
            )}
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
            <div>
              <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Desde</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => router.push(buildUrl({ fecha_desde: e.target.value }))}
                className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Hasta</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => router.push(buildUrl({ fecha_hasta: e.target.value }))}
                className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Estado</label>
              <select
                value={estado}
                onChange={(e) => router.push(buildUrl({ estado: e.target.value }))}
                className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
              >
                <option value="">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="pagada">Pagada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Moneda</label>
              <select
                value={moneda}
                onChange={(e) => router.push(buildUrl({ moneda: e.target.value }))}
                className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
              >
                <option value="">Todas</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Emisor</label>
              <input
                type="text"
                value={emisor}
                onChange={(e) => router.push(buildUrl({ emisor: e.target.value }))}
                placeholder="Filtrar..."
                className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Confianza</label>
              <select
                value={confianza}
                onChange={(e) => router.push(buildUrl({ confianza: e.target.value }))}
                className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
              >
                <option value="">Todas</option>
                <option value="confiable">Confiable</option>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Revision</label>
              <select
                value={revision}
                onChange={(e) => router.push(buildUrl({ revision: e.target.value }))}
                className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
              >
                <option value="">Todas</option>
                <option value="1">Requiere revision</option>
                <option value="0">Sin revision</option>
              </select>
            </div>
          </div>
        </form>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-600 dark:border-zinc-400" />
            </div>
          ) : facturas.length === 0 ? (
            <div className="py-16 text-center text-zinc-500 dark:text-zinc-400">
              <p className="text-lg mb-1">No se encontraron facturas</p>
              <p className="text-sm">Prueba a cambiar los filtros de búsqueda</p>
            </div>
          ) : (
            <>
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-zinc-500 dark:text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                      <th className="px-5 py-3 font-medium">#</th>
                      <th className="px-5 py-3 font-medium">Fecha</th>
                      <th className="px-5 py-3 font-medium">Emisor</th>
                      <th className="px-5 py-3 font-medium">Numero</th>
                      <th className="px-5 py-3 font-medium text-right">Base</th>
                      <th className="px-5 py-3 font-medium text-right">IVA</th>
                      <th className="px-5 py-3 font-medium text-right">Total</th>
                      <th className="px-5 py-3 font-medium">Moneda</th>
                      <th className="px-5 py-3 font-medium">Estado</th>
                      <th className="px-5 py-3 font-medium">Confianza</th>
                      <th className="px-5 py-3 font-medium">Rev.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facturas.map((f) => (
                      <tr
                        key={f.id}
                        onClick={() => router.push(`/facturas/${f.id}`)}
                        className="border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                      >
                        <td className="px-5 py-3 text-zinc-400 dark:text-zinc-500 text-xs">
                          {f.id}
                        </td>
                        <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">
                          {formatDate(f.fecha_emision)}
                        </td>
                        <td className="px-5 py-3 text-zinc-900 dark:text-zinc-100 font-medium max-w-[200px] truncate">
                          {f.emisor_nombre}
                        </td>
                        <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400 font-mono text-xs">
                          {f.numero_factura}
                        </td>
                        <td className="px-5 py-3 text-right text-zinc-600 dark:text-zinc-400">
                          {formatCurrency(f.base_imponible, f.moneda)}
                        </td>
                        <td className="px-5 py-3 text-right text-zinc-600 dark:text-zinc-400">
                          {formatCurrency(f.cuota_iva, f.moneda)}
                        </td>
                        <td className="px-5 py-3 text-right text-zinc-900 dark:text-zinc-100 font-medium">
                          {f.total_convertido !== undefined
                            ? formatCurrency(f.total_convertido, f.moneda_default || "MXN")
                            : formatCurrency(f.total, f.moneda)}
                        </td>
                        <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400 text-xs font-mono">
                          {f.moneda_default || f.moneda}
                        </td>
                        <td className="px-5 py-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleEstado(f.id, f.estado)
                            }}
                            className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium cursor-pointer hover:opacity-80 ${estadoBadge(f.estado)}`}
                          >
                            {f.estado}
                          </button>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${confianzaBadge(f.confianza_nivel)}`}>
                            {f.confianza_nivel}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {f.requiere_revision ? (
                            <span className="inline-block w-2 h-2 rounded-full bg-orange-500" title="Requiere revision" />
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="sm:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
                {facturas.map((f) => (
                  <div
                    key={f.id}
                    onClick={() => router.push(`/facturas/${f.id}`)}
                    className="px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer active:bg-zinc-100 dark:active:bg-zinc-800"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate flex-1 min-w-0">
                        {f.emisor_nombre}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {f.requiere_revision ? (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500" />
                        ) : null}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleEstado(f.id, f.estado)
                          }}
                          className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium cursor-pointer hover:opacity-80 ${estadoBadge(f.estado)}`}
                        >
                          {f.estado}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="truncate">{formatDate(f.fecha_emision)} · {f.numero_factura}</span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100 shrink-0 ml-2">
                        {f.total_convertido !== undefined
                          ? formatCurrency(f.total_convertido, f.moneda_default || "MXN")
                          : formatCurrency(f.total, f.moneda)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${confianzaBadge(f.confianza_nivel)}`}>
                        {f.confianza_nivel}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">{f.moneda_default || f.moneda}</span>
                    </div>
                  </div>
                ))}
              </div>

              {pagination && pagination.totalPages > 1 && (
                <div className="px-4 sm:px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
                  <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 truncate">
                    {pagination.total} facturas · {pagination.page}/{pagination.totalPages}
                  </p>
                  <div className="flex gap-1.5 shrink-0">
                    {page > 1 && (
                      <Link
                        href={buildUrl({ page: String(page - 1) })}
                        className="px-2.5 sm:px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        ← Ant
                      </Link>
                    )}
                    {page < pagination.totalPages && (
                      <Link
                        href={buildUrl({ page: String(page + 1) })}
                        className="px-2.5 sm:px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        Sig →
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <PlanModal open={showPlanModal} onClose={() => setShowPlanModal(false)} />
      <ExportFilenameModal
        key={exportFormat ?? "closed"}
        open={exportFormat !== null}
        format={exportFormat}
        defaultName={exportName}
        onClose={() => setExportFormat(null)}
        onConfirm={(name) => {
          if (exportFormat) downloadExport(name, exportFormat)
        }}
      />
    </div>
  )
}
