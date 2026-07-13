"use client"

import { useEffect, useState } from "react"

interface Negocio {
  id: number
  nombre: string
  slug: string
  email: string | null
  moneda_default: string
}

interface Props {
  onSelect: (slug: string) => void
}

export default function NegocioSelector({ onSelect }: Props) {
  const [negocios, setNegocios] = useState<Negocio[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/negocios")
      .then((r) => r.json())
      .then((data) => setNegocios(data.negocios))
      .finally(() => setLoading(false))
  }, [])

  const handleSelect = async (slug: string) => {
    await fetch(`/api/negocios/${slug}/select`, { method: "POST" })
    onSelect(slug)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError(null)

    try {
      const res = await fetch("/api/negocios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, email }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error)
        return
      }

      await handleSelect(data.slug)
    } catch {
      setError("Error de conexión")
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-600 dark:border-zinc-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
      <div className="w-full max-w-lg px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Facturas
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Selecciona un negocio para comenzar
          </p>
        </div>

        {negocios.length > 0 && (
          <div className="space-y-3 mb-6">
            {negocios.map((n) => (
              <button
                key={n.id}
                onClick={() => handleSelect(n.slug)}
                className="w-full text-left px-5 py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {n.nombre}
                    </p>
                    {n.email && (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {n.email}
                      </p>
                    )}
                  </div>
                  <span className="text-xs px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-mono">
                    {n.moneda_default}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {negocios.length === 0 && !showCreate && (
          <div className="text-center py-8 mb-6">
            <p className="text-zinc-500 dark:text-zinc-400 mb-4">
              No hay negocios registrados. Crea uno para empezar.
            </p>
          </div>
        )}

        {!showCreate ? (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full py-3 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
          >
            + Crear nuevo negocio
          </button>
        ) : (
          <form onSubmit={handleCreate} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
            <h2 className="font-medium text-zinc-900 dark:text-zinc-100 mb-4">
              Nuevo negocio
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Mi Empresa S.A. de C.V."
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                  Email (opcional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="contacto@miempresa.com"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-500 dark:text-red-400 text-sm mt-2">{error}</p>
            )}

            <div className="flex gap-2 mt-4">
              <button
                type="submit"
                disabled={creating || !nombre.trim()}
                className="flex-1 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                {creating ? "Creando..." : "Crear"}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setError(null) }}
                className="px-4 py-2 rounded-lg text-zinc-500 dark:text-zinc-400 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
