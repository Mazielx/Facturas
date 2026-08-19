import Link from "next/link"
import { APP_NAME } from "@/lib/brand"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 mx-auto mb-6">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-6xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300 mb-4">Pagina no encontrada</h2>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8">
          La pagina que buscas no existe o fue movida. Revisa la URL o regresa al inicio.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="px-6 py-3 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors w-full sm:w-auto"
          >
            Volver al inicio
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors w-full sm:w-auto"
          >
            Ir al dashboard
          </Link>
        </div>
        <p className="mt-8 text-xs text-zinc-400 dark:text-zinc-500">{APP_NAME}</p>
      </div>
    </div>
  )
}
