"use client"

import { useCallback, useEffect, useState } from "react"
import type { EmailListResponse, EmailMessage } from "@/lib/types"

export default function Home() {
  const [emails, setEmails] = useState<EmailMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authenticated, setAuthenticated] = useState(false)

  const fetchEmails = useCallback(async () => {
    setLoading(true)
    setError(null)

    const res = await fetch("/api/emails")

    if (res.status === 401) {
      setAuthenticated(false)
      setLoading(false)
      return
    }

    if (!res.ok) {
      setError("Error al obtener los correos")
      setLoading(false)
      return
    }

    const data: EmailListResponse = await res.json()

    if (data.error) {
      setError(data.error)
    } else {
      setEmails(data.emails)
      setAuthenticated(true)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const errorParam = params.get("error")

    if (errorParam === "auth_denied") {
      setError("Autenticación denegada")
    } else if (errorParam === "auth_failed") {
      setError("Error de autenticación")
    }

    fetchEmails()
  }, [fetchEmails])

  const handleLogin = () => {
    window.location.href = "/api/auth"
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return dateStr
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            Facturas - Correos con adjuntos PDF/XML
          </h1>
          {authenticated ? (
            <button
              onClick={fetchEmails}
              disabled={loading}
              className="text-sm px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Cargando..." : "Actualizar"}
            </button>
          ) : null}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {!authenticated && !loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
                Conecta tu Gmail
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400 max-w-md">
                Inicia sesión con Google para ver los correos que contienen
                archivos PDF y XML adjuntos.
              </p>
            </div>
            <button
              onClick={handleLogin}
              className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl shadow-sm hover:shadow-md transition-shadow text-zinc-700 dark:text-zinc-300 font-medium"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Iniciar sesión con Google
            </button>
            {error && (
              <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>
            )}
          </div>
        ) : null}

        {loading && authenticated ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-600 dark:border-zinc-400" />
          </div>
        ) : null}

        {authenticated && !loading && emails.length === 0 ? (
          <div className="text-center py-20 text-zinc-500 dark:text-zinc-400">
            <p className="text-lg">
              No se encontraron correos con adjuntos PDF o XML.
            </p>
          </div>
        ) : null}

        {authenticated && emails.length > 0 ? (
          <div className="space-y-4">
            {emails.map((email) => (
              <div
                key={email.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {email.subject}
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                      {email.from}
                    </p>
                  </div>
                  <time className="text-xs text-zinc-400 dark:text-zinc-500 whitespace-nowrap ml-4">
                    {formatDate(email.date)}
                  </time>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3 line-clamp-2">
                  {email.snippet}
                </p>
                <div className="flex flex-wrap gap-2">
                  {email.attachments.map((att, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                        />
                      </svg>
                      {att.filename}
                      <span className="text-blue-400 dark:text-blue-400">
                        ({formatSize(att.size)})
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </main>
    </div>
  )
}
