import Link from "next/link"
import { APP_NAME } from "@/lib/brand"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6">
          <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c2 0 3.85-.58 5.42-1.58" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c1.28 0 2.47-.4 3.46-1.1" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M13.2 12h6.5" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M19.7 12v2.8" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round"/>
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
