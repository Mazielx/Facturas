"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"

interface NegocioInfo {
  id: number
  nombre: string
  slug: string
  email: string | null
  moneda_default: string
  plan: string
  nombre_changed_at: string | null
  email_changed_at: string | null
}

interface CuentaCorreo {
  id: number
  email: string
  profile_photo_url: string | null
  activa: number
  created_at: string
}

export default function EmpresaPage() {
  const [negocio, setNegocio] = useState<NegocioInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [showNombre, setShowNombre] = useState(false)
  const [nombre, setNombre] = useState("")
  const [initialNombre, setInitialNombre] = useState("")

  const [showEmail, setShowEmail] = useState(false)
  const [email, setEmail] = useState("")
  const [initialEmail, setInitialEmail] = useState("")

  const [showMoneda, setShowMoneda] = useState(false)
  const [moneda, setMoneda] = useState("")
  const [initialMoneda, setInitialMoneda] = useState("")

  const [cuentas, setCuentas] = useState<CuentaCorreo[]>([])
  const [maxCuentas, setMaxCuentas] = useState(1)
  const [showAddCuenta, setShowAddCuenta] = useState(false)
  const [newCuentaEmail, setNewCuentaEmail] = useState("")
  const [addingCuenta, setAddingCuenta] = useState(false)

  const hasNombreChanges = showNombre && nombre !== initialNombre
  const hasEmailChanges = showEmail && email !== (initialEmail || "")
  const hasMonedaChanges = showMoneda && moneda !== initialMoneda

  const canChangeNombre = useCallback(() => {
    if (!negocio?.nombre_changed_at) return true
    const changedAt = new Date(negocio.nombre_changed_at)
    const now = new Date()
    const monthsDiff = (now.getFullYear() - changedAt.getFullYear()) * 12 + (now.getMonth() - changedAt.getMonth())
    return monthsDiff >= 6
  }, [negocio?.nombre_changed_at])

  const canChangeEmail = useCallback(() => {
    if (!negocio?.email_changed_at) return true
    const changedAt = new Date(negocio.email_changed_at)
    const now = new Date()
    const monthsDiff = (now.getFullYear() - changedAt.getFullYear()) * 12 + (now.getMonth() - changedAt.getMonth())
    return monthsDiff >= 6
  }, [negocio?.email_changed_at])

  const nombreCooldownText = useCallback(() => {
    if (!negocio?.nombre_changed_at) return null
    const changedAt = new Date(negocio.nombre_changed_at)
    const nextAvailable = new Date(changedAt)
    nextAvailable.setMonth(nextAvailable.getMonth() + 6)
    const now = new Date()
    if (now >= nextAvailable) return null
    const monthsLeft = (nextAvailable.getFullYear() - now.getFullYear()) * 12 + (nextAvailable.getMonth() - now.getMonth())
    return `Podras cambiar el nombre en ${monthsLeft} mes(es)`
  }, [negocio?.nombre_changed_at])

  const emailCooldownText = useCallback(() => {
    if (!negocio?.email_changed_at) return null
    const changedAt = new Date(negocio.email_changed_at)
    const nextAvailable = new Date(changedAt)
    nextAvailable.setMonth(nextAvailable.getMonth() + 6)
    const now = new Date()
    if (now >= nextAvailable) return null
    const monthsLeft = (nextAvailable.getFullYear() - now.getFullYear()) * 12 + (nextAvailable.getMonth() - now.getMonth())
    return `Podras cambiar el email en ${monthsLeft} mes(es)`
  }, [negocio?.email_changed_at])

  const fetchCuentas = useCallback(async () => {
    try {
      const res = await fetch("/api/cuentas-correo")
      if (res.ok) {
        const data = await res.json()
        setCuentas(data.cuentas || [])
        setMaxCuentas(data.maxCuentas || 1)
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetch("/api/negocios")
      .then((res) => res.json())
      .then(async (data) => {
        const slug = data.activeSlug
        if (!slug) return
        const res = await fetch(`/api/negocios/${slug}`)
        if (res.ok) {
          const d = await res.json()
          setNegocio(d)
          setNombre(d.nombre || "")
          setEmail(d.email || "")
          setMoneda(d.moneda_default || "MXN")
          setInitialNombre(d.nombre || "")
          setInitialEmail(d.email || "")
          setInitialMoneda(d.moneda_default || "MXN")
        }
      })
      .finally(() => setLoading(false))
    fetchCuentas()
  }, [fetchCuentas])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("msg") === "cuenta_conectada") {
      setMessage("Cuenta de correo conectada correctamente")
      fetchCuentas()
      window.history.replaceState({}, "", "/empresa")
    }
  }, [fetchCuentas])

  const handleNombreChange = (value: string) => {
    const words = value.trim().split(/\s+/)
    if (words.length <= 6) {
      setNombre(value)
    }
  }

  const handleSaveNombre = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!negocio) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(`/api/negocios/${negocio.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Error al guardar"); return }
      setMessage("Nombre actualizado")
      setNegocio(data)
      setInitialNombre(data.nombre || "")
      setNombre(data.nombre || "")
      setShowNombre(false)
    } catch { setError("Error de conexion") } finally { setSaving(false) }
  }

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!negocio) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(`/api/negocios/${negocio.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Error al guardar"); return }
      setMessage("Email de contacto actualizado")
      setNegocio(data)
      setInitialEmail(data.email || "")
      setEmail(data.email || "")
      setShowEmail(false)
    } catch { setError("Error de conexion") } finally { setSaving(false) }
  }

  const handleSaveMoneda = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!negocio) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(`/api/negocios/${negocio.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moneda_default: moneda }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Error al guardar"); return }
      setMessage("Moneda actualizada")
      setNegocio(data)
      setInitialMoneda(data.moneda_default || "MXN")
      setMoneda(data.moneda_default || "MXN")
      setShowMoneda(false)
    } catch { setError("Error de conexion") } finally { setSaving(false) }
  }

  const handleAddCuenta = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddingCuenta(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch("/api/cuentas-correo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newCuentaEmail }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Error al conectar"); return }
      if (data.authUrl) {
        window.location.href = data.authUrl
      }
    } catch { setError("Error de conexion") } finally { setAddingCuenta(false) }
  }

  const handleDeleteCuenta = async (cuentaId: number) => {
    if (!confirm("¿Desconectar esta cuenta de correo?")) return
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(`/api/cuentas-correo/${cuentaId}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Error al desconectar")
        return
      }
      setMessage("Cuenta desconectada")
      fetchCuentas()
    } catch { setError("Error de conexion") }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-600 dark:border-zinc-400" />
      </div>
    )
  }

  const nombreDisabled = !canChangeNombre()
  const emailDisabled = !canChangeEmail()
  const nombreCooldown = nombreCooldownText()
  const emailCooldown = emailCooldownText()
  const wordCount = nombre.trim() ? nombre.trim().split(/\s+/).length : 0

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
            ← Inicio
          </Link>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Mi empresa</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {message && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-sm border border-emerald-200 dark:border-emerald-800">
            {message}
          </div>
        )}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <div className="px-6 py-4">
            <h2 className="font-medium text-zinc-900 dark:text-zinc-100">Nombre de la empresa</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{negocio?.nombre}</p>
            {!showNombre ? (
              <button type="button" onClick={() => setShowNombre(true)} disabled={!canChangeNombre()}
                className="mt-3 px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                Cambiar nombre
              </button>
            ) : (
              <form onSubmit={handleSaveNombre} className="mt-4 space-y-3">
                <input type="text" value={nombre} onChange={(e) => handleNombreChange(e.target.value)} disabled={nombreDisabled} maxLength={100}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                <div className="flex justify-between">
                  {nombreDisabled && nombreCooldown ? (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">{nombreCooldown}</p>
                  ) : (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">Maximo 6 palabras</p>
                  )}
                  <p className={`text-xs ${wordCount > 6 ? "text-red-500" : "text-zinc-400 dark:text-zinc-500"}`}>{wordCount}/6</p>
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={saving || !hasNombreChanges || nombreDisabled}
                    className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                    {saving ? "Guardando..." : "Guardar nombre"}
                  </button>
                  <button type="button" onClick={() => { setShowNombre(false); setNombre(initialNombre) }}
                    className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <div className="px-6 py-4">
            <h2 className="font-medium text-zinc-900 dark:text-zinc-100">Email de contacto</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{negocio?.email || "Sin email de contacto"}</p>
            {!showEmail ? (
              <button type="button" onClick={() => setShowEmail(true)} disabled={!canChangeEmail()}
                className="mt-3 px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                Cambiar email
              </button>
            ) : (
              <form onSubmit={handleSaveEmail} className="mt-4 space-y-3">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={emailDisabled}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                {emailDisabled && emailCooldown && (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">{emailCooldown}</p>
                )}
                <div className="flex gap-2">
                  <button type="submit" disabled={saving || !hasEmailChanges || emailDisabled}
                    className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                    {saving ? "Guardando..." : "Guardar email"}
                  </button>
                  <button type="button" onClick={() => { setShowEmail(false); setEmail(initialEmail || "") }}
                    className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <div className="px-6 py-4">
            <h2 className="font-medium text-zinc-900 dark:text-zinc-100">Moneda</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{initialMoneda}</p>
            {!showMoneda ? (
              <button type="button" onClick={() => setShowMoneda(true)}
                className="mt-3 px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                Cambiar moneda
              </button>
            ) : (
              <form onSubmit={handleSaveMoneda} className="mt-4 space-y-3">
                <select value={moneda} onChange={(e) => setMoneda(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500">
                  <option value="MXN">MXN - Peso Mexicano</option>
                  <option value="USD">USD - Dolar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - Libra</option>
                </select>
                <div className="flex gap-2">
                  <button type="submit" disabled={saving || !hasMonedaChanges}
                    className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                    {saving ? "Guardando..." : "Guardar moneda"}
                  </button>
                  <button type="button" onClick={() => { setShowMoneda(false); setMoneda(initialMoneda) }}
                    className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-medium text-zinc-900 dark:text-zinc-100">Cuentas de correo conectadas</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  {cuentas.length} de {maxCuentas} cuentas
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                negocio?.plan === "multi correo"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              }`}>
                {negocio?.plan === "multi correo" ? "Plan Multi Correo" : "Plan Basico"}
              </span>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {cuentas.map((cuenta) => (
              <div key={cuenta.id} className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  {cuenta.profile_photo_url ? (
                    <img src={cuenta.profile_photo_url} alt="" className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                      <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{cuenta.email}</p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">Conectada {new Date(cuenta.created_at).toLocaleDateString("es-MX")}</p>
                  </div>
                </div>
                <button onClick={() => handleDeleteCuenta(cuenta.id)}
                  className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors">
                  Desconectar
                </button>
              </div>
            ))}

            {cuentas.length === 0 && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">
                No hay cuentas de correo conectadas
              </p>
            )}

            {!showAddCuenta ? (
              <button type="button" onClick={() => setShowAddCuenta(true)}
                disabled={cuentas.length >= maxCuentas}
                className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {cuentas.length >= maxCuentas ? "Limite de cuentas alcanzado" : "Conectar nueva cuenta"}
              </button>
            ) : (
              <form onSubmit={handleAddCuenta} className="space-y-3">
                <input type="email" placeholder="correo@empresa.com" value={newCuentaEmail} onChange={(e) => setNewCuentaEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500" />
                <p className="text-xs text-zinc-400 dark:text-zinc-500">Solo se permiten correos institucionales (no Gmail, Yahoo, Outlook, etc.)</p>
                <div className="flex gap-2">
                  <button type="submit" disabled={addingCuenta || !newCuentaEmail}
                    className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                    {addingCuenta ? "Conectando..." : "Conectar cuenta"}
                  </button>
                  <button type="button" onClick={() => { setShowAddCuenta(false); setNewCuentaEmail("") }}
                    className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {negocio?.plan !== "multi correo" && (
              <div className="mt-4 p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Plan Multi Correo</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Conecta hasta 4 cuentas de correo institucionales para extraer facturas de multiples fuentes. Precio mensual por definir.
                </p>
                <button disabled className="mt-3 px-4 py-2 rounded-lg bg-zinc-300 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 text-sm font-medium cursor-not-allowed">
                  Proximamente
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
