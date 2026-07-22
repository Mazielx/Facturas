"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { deleteClientCookie } from "@/lib/cookie-utils"
import NegocioSelector from "./negocio-selector"
import MonthlySpending from "./components/charts/monthly-spending"
import TopProviders from "./components/charts/top-providers"
import StatusDistribution from "./components/charts/status-distribution"

interface NegocioInfo {
  nombre: string
  slug: string
  moneda_default: string
}

interface UserInfo {
  id: number
  email: string
  nombre: string | null
  role: string
  profile_photo_url: string | null
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
  total_convertido: number
  moneda: string
  moneda_original: string
  moneda_default: string
  estado: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function Home() {
  const router = useRouter()
  const [negocio, setNegocio] = useState<NegocioInfo | null | undefined>(undefined)
  const [usuario, setUsuario] = useState<UserInfo | null>(null)
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [, setPorMes] = useState<Array<{ mes: string; count: number; sum: number }>>([])
  const [, setTopEmisores] = useState<Array<{ emisor_nombre: string; count: number; sum: number }>>([])
  const [, setPorEstado] = useState<Array<{ estado: string; count: number; sum: number }>>([])
  const [loading, setLoading] = useState(true)
  const [extracting, setExtracting] = useState(false)
  const [extractResult, setExtractResult] = useState<string | null>(null)
  const [chartsKey, setChartsKey] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

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
            if (data.user) setUsuario(data.user)
            return
          }
        }

        if (data.negocios && data.negocios.length === 1) {
          const only = data.negocios[0] as NegocioInfo
          await fetch(`/api/negocios/${only.slug}/select`, { method: "POST" })
          document.cookie = `negocio_slug=${only.slug}; path=/; max-age=${365 * 24 * 60 * 60}`
          if (!cancelled) setNegocio(only)
          if (data.user) setUsuario(data.user)
          return
        }

        setNegocio(null)
        if (data.user) setUsuario(data.user)
      } catch {
        if (!cancelled) setNegocio(null)
      }
    }
    check()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
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

      if (res.status === 401) {
        deleteClientCookie("gmail_tokens")
        setExtractResult("Gmail no conectado o tokens expirados. Redirigiendo para autorizar...")
        setTimeout(() => { window.location.href = "/api/auth" }, 1500)
        return
      }

      if (res.ok) {
        setExtractResult(
          `Extraidas ${data.processed} facturas. ${data.errors > 0 ? `${data.errors} errores.` : ""}`
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
        setExtractResult(data.error || "Error en la extraccion")
      }
    } catch {
      setExtractResult("Error de conexion")
    } finally {
      setExtracting(false)
    }
  }

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    deleteClientCookie("session_id")
    deleteClientCookie("negocio_slug")
    window.location.href = "/login"
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
      setChartsKey((k) => k + 1)
      fetch("/api/facturas/stats")
        .then((r) => r.json())
        .then((stats) => {
          setResumen({
            totalFacturas: stats.resumen?.totalFacturas || 0,
            totalImporte: stats.resumen?.totalImporte || 0,
            totalIva: stats.resumen?.totalIva || 0,
            porConfianza: stats.porConfianza || {},
            requierenRevision: stats.requierenRevision || 0,
            duplicados: stats.duplicados || 0,
          })
        })
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
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors overflow-hidden"
              >
                {usuario?.profile_photo_url ? (
                  <img src={usuario.profile_photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-700">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {usuario?.nombre || "Usuario"}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      {usuario?.email}
                    </p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/cuenta"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors"
                    >
                      <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Mi cuenta
                    </Link>
                    <Link
                      href="/empresa"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors"
                    >
                      <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Mi empresa
                    </Link>
                    <Link
                      href="/configuracion"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors"
                    >
                      <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Configuración
                    </Link>
                  </div>
                  <div className="border-t border-zinc-100 dark:border-zinc-700 py-1">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
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
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Confiables</p>
                <p className="text-2xl font-semibold text-green-600 dark:text-green-400">
                  {(resumen.porConfianza?.confiable || 0) + (resumen.porConfianza?.alta || 0)}
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
            <MonthlySpending refreshKey={chartsKey} />
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4 uppercase tracking-wide">Top Proveedores</h2>
            <TopProviders refreshKey={chartsKey} />
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4 uppercase tracking-wide">Distribucion por Estado</h2>
            <StatusDistribution refreshKey={chartsKey} />
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
              <p className="text-lg mb-2">No hay facturas realizadas recientemente</p>
              <p className="text-sm mb-4">Conecta tu Gmail y extrae las facturas para comenzar</p>
              <a
                href="/api/auth"
                className="inline-block px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Conectar Gmail
              </a>
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
                      onClick={() => router.push(`/facturas/${f.id}`)}
                      className="border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
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
                        {f.total_convertido !== undefined
                          ? formatCurrency(f.total_convertido, f.moneda_default || "MXN")
                          : formatCurrency(f.total, f.moneda)}
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
