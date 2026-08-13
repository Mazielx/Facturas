"use client"

import { useState } from "react"

interface ExportFilenameModalProps {
  open: boolean
  format: "csv" | "xlsx" | null
  defaultName: string
  onClose: () => void
  onConfirm: (name: string) => void
}

export default function ExportFilenameModal({
  open,
  format,
  defaultName,
  onClose,
  onConfirm,
}: ExportFilenameModalProps) {
  const [name, setName] = useState(defaultName)

  if (!open || !format) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onConfirm(name.trim())
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Nombre del archivo de exportacion"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-xl">
        <div className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Nombre del archivo
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Elige como quieres que se llame el archivo que se descargara.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5">
            <label htmlFor="export-filename" className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">
              Nombre
            </label>
            <div className="flex items-center rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus-within:ring-2 focus-within:ring-zinc-400 dark:focus-within:ring-zinc-500">
              <input
                id="export-filename"
                type="text"
                value={name}
                autoFocus
                onFocus={(e) => e.target.select()}
                onChange={(e) => setName(e.target.value)}
                placeholder="facturas"
                className="flex-1 min-w-0 px-3 py-2 bg-transparent text-zinc-900 dark:text-zinc-100 text-sm outline-none"
              />
              <span className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-700/50 border-l border-zinc-200 dark:border-zinc-700 rounded-r-lg font-mono">
                .{format}
              </span>
            </div>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
              No es necesario escribir la extension; se agrega automaticamente.
            </p>
          </div>

          <div className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
              disabled={!name.trim()}
            >
              Descargar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
