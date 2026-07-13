"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface Usuario {
  id: number
  email: string
  nombre: string
  role: string
  negocio_id: number | null
  activo: number
  created_at: string
}

interface Negocio {
  id: number
  nombre: string
  slug: string
}

interface ApiKey {
  id: number
  negocio_id: number
  nombre: string
  key: string
  activa: number
  created_at: string
}

export default function AdminPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [negocios, setNegocios] = useState<Negocio[]>([])
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [activeTab, setActiveTab] = useState<"usuarios" | "apikeys">("usuarios")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [showApiKeyForm, setShowApiKeyForm] = useState(false)
  const [apiKeyFormData, setApiKeyFormData] = useState({
    nombre: "",
    negocio_id: "",
  })
  const [newApiKey, setNewApiKey] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    nombre: "",
    role: "negocio",
    negocio_id: "",
  })
  const router = useRouter()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [usuariosRes, negociosRes, apiKeysRes] = await Promise.all([
        fetch("/api/admin/usuarios"),
        fetch("/api/negocios"),
        fetch("/api/admin/api-keys"),
      ])

      if (!usuariosRes.ok) {
        if (usuariosRes.status === 401 || usuariosRes.status === 403) {
          router.push("/login")
          return
        }
        throw new Error("Error al cargar usuarios")
      }

      const usuariosData = await usuariosRes.json()
      const negociosData = negociosRes.ok ? await negociosRes.json() : []

      setUsuarios(usuariosData)
      setNegocios(negociosData)

      if (apiKeysRes.ok) {
        setApiKeys(await apiKeysRes.json())
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    try {
      const res = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          negocio_id: formData.negocio_id ? Number(formData.negocio_id) : null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al crear usuario")
      }

      setShowForm(false)
      setFormData({ email: "", password: "", nombre: "", role: "negocio", negocio_id: "" })
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Eliminar este usuario?")) return

    try {
      const res = await fetch(`/api/admin/usuarios?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Error al eliminar")
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    }
  }

  async function handleToggleActive(id: number, currentActive: number) {
    try {
      const res = await fetch("/api/admin/usuarios", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, activo: currentActive ? 0 : 1 }),
      })
      if (!res.ok) throw new Error("Error al actualizar")
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    }
  }

  async function handleCreateApiKey(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    try {
      const res = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: apiKeyFormData.nombre,
          negocio_id: Number(apiKeyFormData.negocio_id),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al crear API key")
      }

      const data = await res.json()
      setNewApiKey(data.key)
      setShowApiKeyForm(false)
      setApiKeyFormData({ nombre: "", negocio_id: "" })
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    }
  }

  async function handleToggleApiKey(id: number, currentActive: number) {
    try {
      const res = await fetch("/api/admin/api-keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, activa: currentActive ? 0 : 1 }),
      })
      if (!res.ok) throw new Error("Error al actualizar")
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    }
  }

  async function handleDeleteApiKey(id: number) {
    if (!confirm("Eliminar esta API key?")) return

    try {
      const res = await fetch(`/api/admin/api-keys?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Error al eliminar")
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <div className="flex gap-4">
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              Volver
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Cerrar Sesion
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {newApiKey && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-md">
            <p className="font-medium mb-1">API Key creada:</p>
            <code className="text-sm bg-green-100 px-2 py-1 rounded">{newApiKey}</code>
            <p className="text-sm mt-2">Guarda esta key, no se mostrara de nuevo.</p>
          </div>
        )}

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("usuarios")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "usuarios"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            Usuarios
          </button>
          <button
            onClick={() => setActiveTab("apikeys")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "apikeys"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            API Keys
          </button>
        </div>

        {activeTab === "usuarios" && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Usuarios</h2>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {showForm ? "Cancelar" : "Nuevo Usuario"}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-md">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contrasena
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rol
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="negocio">Negocio</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {formData.role === "negocio" && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Negocio
                    </label>
                    <select
                      value={formData.negocio_id}
                      onChange={(e) => setFormData({ ...formData, negocio_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar negocio</option>
                      {negocios.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Crear Usuario
                </button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {usuarios.map((usuario) => (
                  <tr key={usuario.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {usuario.nombre}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {usuario.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          usuario.role === "admin"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {usuario.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          usuario.activo
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {usuario.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleToggleActive(usuario.id, usuario.activo)}
                        className="text-yellow-600 hover:text-yellow-900 mr-4"
                      >
                        {usuario.activo ? "Desactivar" : "Activar"}
                      </button>
                      <button
                        onClick={() => handleDelete(usuario.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {usuarios.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No hay usuarios registrados
            </div>
          )}
        </div>
        )}

        {activeTab === "apikeys" && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">API Keys</h2>
            <button
              onClick={() => setShowApiKeyForm(!showApiKeyForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {showApiKeyForm ? "Cancelar" : "Nueva API Key"}
            </button>
          </div>

          {showApiKeyForm && (
            <form onSubmit={handleCreateApiKey} className="mb-6 p-4 bg-gray-50 rounded-md">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={apiKeyFormData.nombre}
                    onChange={(e) => setApiKeyFormData({ ...apiKeyFormData, nombre: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Negocio
                  </label>
                  <select
                    value={apiKeyFormData.negocio_id}
                    onChange={(e) => setApiKeyFormData({ ...apiKeyFormData, negocio_id: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar negocio</option>
                    {negocios.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Crear API Key
                </button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Negocio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Key (prefijo)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Creada
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {apiKeys.map((apiKey) => {
                  const negocio = negocios.find((n) => n.id === apiKey.negocio_id)
                  return (
                    <tr key={apiKey.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {apiKey.nombre}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {negocio?.nombre || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {apiKey.key?.substring(0, 12)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            apiKey.activa
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {apiKey.activa ? "Activa" : "Inactiva"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(apiKey.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleToggleApiKey(apiKey.id, apiKey.activa)}
                          className="text-yellow-600 hover:text-yellow-900 mr-4"
                        >
                          {apiKey.activa ? "Desactivar" : "Activar"}
                        </button>
                        <button
                          onClick={() => handleDeleteApiKey(apiKey.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {apiKeys.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No hay API keys registradas
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  )
}
