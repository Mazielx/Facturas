"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import Link from "next/link"

interface UserInfo {
  id: number
  email: string
  nombre: string | null
  role: string
  profile_photo_url: string | null
  email_changed_at: string | null
  telefono: string | null
}

export default function CuentaPage() {
  const [usuario, setUsuario] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [nombre, setNombre] = useState("")
  const [initialNombre, setInitialNombre] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [showEmail, setShowEmail] = useState(false)
  const [email, setEmail] = useState("")
  const [initialEmail, setInitialEmail] = useState("")

  const [showPassword, setShowPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")

  const [showPhone, setShowPhone] = useState(false)
  const [telefono, setTelefono] = useState("")
  const [initialTelefono, setInitialTelefono] = useState("")

  const hasProfileChanges = nombre !== initialNombre
  const hasEmailChanges = showEmail && email !== initialEmail
  const hasPhoneChanges = showPhone && telefono !== (initialTelefono || "")

  const canChangeEmail = useCallback(() => {
    if (!usuario?.email_changed_at) return true
    const changedAt = new Date(usuario.email_changed_at)
    const now = new Date()
    const monthsDiff = (now.getFullYear() - changedAt.getFullYear()) * 12 + (now.getMonth() - changedAt.getMonth())
    return monthsDiff >= 6
  }, [usuario?.email_changed_at])

  const emailCooldownText = useCallback(() => {
    if (!usuario?.email_changed_at) return null
    const changedAt = new Date(usuario.email_changed_at)
    const nextAvailable = new Date(changedAt)
    nextAvailable.setMonth(nextAvailable.getMonth() + 6)
    const now = new Date()
    if (now >= nextAvailable) return null
    const monthsLeft = (nextAvailable.getFullYear() - now.getFullYear()) * 12 + (nextAvailable.getMonth() - now.getMonth())
    return `Podras cambiar el email en ${monthsLeft} mes(es)`
  }, [usuario?.email_changed_at])

  useEffect(() => {
    fetch("/api/negocios")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUsuario(data.user)
          setNombre(data.user.nombre || "")
          setInitialNombre(data.user.nombre || "")
          setEmail(data.user.email || "")
          setInitialEmail(data.user.email || "")
          setTelefono(data.user.telefono || "")
          setInitialTelefono(data.user.telefono || "")
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const handlePhotoClick = () => {
    fileInputRef.current?.click()
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)
    setMessage(null)
    try {
      const formData = new FormData()
      formData.append("photo", file)
      const res = await fetch("/api/auth/photo", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Error al subir imagen")
        return
      }
      setUsuario((prev) => prev ? { ...prev, profile_photo_url: data.photoUrl } : prev)
      setMessage("Foto de perfil actualizada")
    } catch {
      setError("Error al subir imagen")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Error al guardar")
        return
      }
      setMessage("Perfil actualizado")
      if (data.user) {
        setUsuario(data.user)
        setInitialNombre(data.user.nombre || "")
        setNombre(data.user.nombre || "")
      }
    } catch {
      setError("Error de conexion")
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: usuario?.nombre || "", email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Error al cambiar correo")
        return
      }
      setMessage("Correo actualizado correctamente")
      setShowEmail(false)
      if (data.user) {
        setUsuario(data.user)
        setInitialEmail(data.user.email || "")
        setEmail(data.user.email || "")
      }
    } catch {
      setError("Error de conexion")
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch("/api/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Error al cambiar contrasena")
        return
      }
      setMessage("Contrasena cambiada correctamente")
      setShowPassword(false)
      setCurrentPassword("")
      setNewPassword("")
    } catch {
      setError("Error de conexion")
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePhone = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: usuario?.nombre || "", telefono }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Error al guardar telefono")
        return
      }
      setMessage("Telefono actualizado correctamente")
      setShowPhone(false)
      if (data.user) {
        setUsuario(data.user)
        setInitialTelefono(data.user.telefono || "")
        setTelefono(data.user.telefono || "")
      }
    } catch {
      setError("Error de conexion")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-600 dark:border-zinc-400" />
      </div>
    )
  }

  const photoUrl = usuario?.profile_photo_url
  const emailDisabled = !canChangeEmail()
  const cooldown = emailCooldownText()

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
            ← Inicio
          </Link>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Mi cuenta</h1>
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
          <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <h2 className="font-medium text-zinc-900 dark:text-zinc-100">Perfil</h2>
          </div>
          <form onSubmit={handleUpdateProfile} className="p-6 space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <button
                type="button"
                onClick={handlePhotoClick}
                disabled={uploading}
                className="relative w-16 h-16 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center hover:ring-2 hover:ring-zinc-400 dark:hover:ring-zinc-500 transition-all group cursor-pointer"
              >
                {photoUrl ? (
                  <img src={photoUrl} alt="Foto de perfil" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-8 h-8 text-zinc-500 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                  {uploading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  ) : (
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{usuario?.nombre || "Sin nombre"}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 capitalize">{usuario?.role}</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Haz click para cambiar foto</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Nombre</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
              />
            </div>

            <button
              type="submit"
              disabled={saving || !hasProfileChanges}
              className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {saving ? "Guardando..." : "Guardar nombre"}
            </button>
          </form>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <div className="px-6 py-4">
            <h2 className="font-medium text-zinc-900 dark:text-zinc-100">Correo electronico</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{usuario?.email}</p>
            {!showEmail ? (
              <button
                type="button"
                onClick={() => setShowEmail(true)}
                disabled={!canChangeEmail()}
                className="mt-3 px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cambiar correo
              </button>
            ) : (
              <form onSubmit={handleUpdateEmail} className="mt-4 space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={emailDisabled}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {emailDisabled && cooldown && (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">{cooldown}</p>
                )}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving || !hasEmailChanges || emailDisabled}
                    className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {saving ? "Guardando..." : "Guardar correo"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowEmail(false); setEmail(initialEmail) }}
                    className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <div className="px-6 py-4">
            <h2 className="font-medium text-zinc-900 dark:text-zinc-100">Contrasena</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Ultima cambio: nunca</p>
            {!showPassword ? (
              <button
                type="button"
                onClick={() => setShowPassword(true)}
                className="mt-3 px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Cambiar contrasena
              </button>
            ) : (
              <form onSubmit={handleChangePassword} className="mt-4 space-y-3">
                <input
                  type="password"
                  placeholder="Contrasena actual"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
                />
                <input
                  type="password"
                  placeholder="Nueva contrasena"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving || !currentPassword || !newPassword}
                    className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {saving ? "Cambiando..." : "Cambiar contrasena"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowPassword(false); setCurrentPassword(""); setNewPassword("") }}
                    className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <div className="px-6 py-4">
            <h2 className="font-medium text-zinc-900 dark:text-zinc-100">Telefono</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{usuario?.telefono || "Sin telefono registrado"}</p>
            {!showPhone ? (
              <button
                type="button"
                onClick={() => setShowPhone(true)}
                className="mt-3 px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                {usuario?.telefono ? "Cambiar telefono" : "Agregar telefono"}
              </button>
            ) : (
              <form onSubmit={handleUpdatePhone} className="mt-4 space-y-3">
                <input
                  type="tel"
                  placeholder="Ej: 55 1234 5678"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving || telefono === (initialTelefono || "")}
                    className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {saving ? "Guardando..." : "Guardar telefono"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowPhone(false); setTelefono(initialTelefono || "") }}
                    className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
