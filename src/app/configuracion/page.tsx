"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { deleteClientCookie } from "@/lib/cookie-utils"

export default function ConfiguracionPage() {
  const [gmailConnected, setGmailConnected] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    fetch("/api/facturas?limit=1")
      .then((res) => {
        setGmailConnected(res.ok)
      })
      .finally(() => setChecking(false))
  }, [])

  const handleConnectGmail = () => {
    window.location.href = "/api/auth"
  }

  const handleDisconnectGmail = async () => {
    deleteClientCookie("gmail_tokens")
    setGmailConnected(false)
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
            ← Inicio
          </Link>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Configuración</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <h2 className="font-medium text-zinc-900 dark:text-zinc-100">Gmail</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Conecta tu cuenta de Gmail para extraer facturas automaticamente
            </p>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Estado:{" "}
                  {checking ? (
                    <span className="text-zinc-400">Verificando...</span>
                  ) : gmailConnected ? (
                    <span className="text-emerald-600 dark:text-emerald-400">Conectado</span>
                  ) : (
                    <span className="text-zinc-500 dark:text-zinc-400">No conectado</span>
                  )}
                </p>
              </div>
              {gmailConnected ? (
                <button
                  onClick={handleDisconnectGmail}
                  className="px-4 py-2 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Desconectar
                </button>
              ) : (
                <button
                  onClick={handleConnectGmail}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Conectar Gmail
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <h2 className="font-medium text-zinc-900 dark:text-zinc-100">Extracción</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Configura como se procesan las facturas
            </p>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Deteccion automatica de duplicados</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Marca facturas potencialmente duplicadas</p>
              </div>
              <div className="w-10 h-6 bg-emerald-500 rounded-full relative">
                <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow" />
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Analisis de confianza</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Evalua la calidad de los datos extraidos</p>
              </div>
              <div className="w-10 h-6 bg-emerald-500 rounded-full relative">
                <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <h2 className="font-medium text-zinc-900 dark:text-zinc-100">Acerca de</h2>
          </div>
          <div className="p-6 space-y-2">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">Facturas</span> v0.1.0
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Sistema de gestion de facturas con extraccion automatica desde Gmail
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
