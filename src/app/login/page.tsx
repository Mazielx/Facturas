"use client"

import { Suspense, useState, useEffect } from "react"
import Link from "next/link"
import ThemeToggle from "../components/theme-toggle"
import BackLink from "../components/back-link"
import { useFromParam } from "@/lib/back-nav"

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  )
}

function LoginPageContent() {
  const [mode, setMode] = useState<"login" | "register">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [nombre, setNombre] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const from = useFromParam()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("error") === "auth_denied") setError("Acceso denegado. Intenta de nuevo.")
    if (params.get("error") === "auth_failed") setError("Error de autenticacion con Google.")
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const url = mode === "login" ? "/api/auth/login" : "/api/auth/register"
      const payload = mode === "login"
        ? { email, password }
        : { email, password, nombre }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Error al procesar")
        return
      }

      const defaultTarget = data.redirectTo || "/dashboard"
      const target = from && from !== "/" ? from : defaultTarget
      window.location.href = target
    } catch {
      setError("Error de conexion")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950">
      <div className="absolute top-4 left-4">
        <BackLink
          fallback="/"
          className="text-sm text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 transition-colors"
        >
          ← Volver
        </BackLink>
      </div>
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <div className="w-full max-w-md p-5 sm:p-8 bg-white dark:bg-zinc-900 rounded-lg shadow-md mx-4">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-zinc-100 mb-6">
          {mode === "login" ? "Iniciar Sesion" : "Crear Cuenta"}
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label
                htmlFor="nombre"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Nombre
              </label>
              <input
                id="nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="Tu nombre"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="admin@empresa.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Contrasena
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="Minimo 6 caracteres"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            {loading
              ? (mode === "login" ? "Entrando..." : "Creando cuenta...")
              : (mode === "login" ? "Entrar" : "Crear cuenta")}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-600 dark:text-zinc-400">
          {mode === "login" ? (
            <>
              No tienes cuenta?{" "}
              <button
                onClick={() => { setMode("register"); setError("") }}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Registrate
              </button>
            </>
          ) : (
            <>
              Ya tienes cuenta?{" "}
              <button
                onClick={() => { setMode("login"); setError("") }}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Inicia sesion
              </button>
            </>
          )}
        </div>

        <div className="mt-6 pt-5 border-t border-gray-200 dark:border-zinc-800 text-center text-sm text-gray-500 dark:text-zinc-500">
          <Link href="/planes" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
            Ver planes y precios
          </Link>
        </div>
      </div>
    </div>
  )
}
