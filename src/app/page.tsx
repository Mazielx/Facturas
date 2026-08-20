import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import ThemeToggle from "./components/theme-toggle"
import { PLANES, formatPrecio } from "@/lib/plans"
import { APP_NAME, APP_TAGLINE, APP_DESCRIPTION } from "@/lib/brand"

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description: APP_DESCRIPTION,
}

export default async function LandingPage() {
  const cookieStore = await cookies()
  if (cookieStore.get("session_id")) {
    redirect("/dashboard")
  }

  const mensuales = PLANES.filter((p) => p.ciclo === "mensual")

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="flex items-center justify-center w-8 h-8 shrink-0">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c2 0 3.85-.58 5.42-1.58" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round"/>
                <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c1.28 0 2.47-.4 3.46-1.1" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round"/>
                <path d="M13.2 12h6.5" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round"/>
                <path d="M19.7 12v2.8" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
            </span>
            <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 truncate">{APP_NAME}</span>
          </div>
          <nav aria-label="Principal" className="hidden md:flex items-center gap-6 text-sm text-zinc-600 dark:text-zinc-400">
            <a href="#como-funciona" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Como funciona</a>
            <a href="#caracteristicas" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Caracteristicas</a>
            <Link href="/planes" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Precios</Link>
          </nav>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <ThemeToggle />
            <Link
              href="/login"
              className="hidden sm:block text-sm px-4 py-2 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Iniciar sesion
            </Link>
            <Link
              href="/login"
              className="text-sm px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
            >
              Crear cuenta
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="max-w-6xl mx-auto px-4 py-14 md:py-28 text-center">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 mb-4 sm:mb-6">
            Extrae, valida, organiza y archiva
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-zinc-900 dark:text-zinc-100 max-w-3xl mx-auto leading-tight">
            Tus facturas, organizadas automaticamente
          </h1>
          <p className="mt-4 sm:mt-6 text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Conecta tu direccion de correo electronico y {APP_NAME} extraera cada factura que se
            encuentre ahi, detecta duplicados, busca, reporta y exporta todo en segundos. Recupera
            horas cada mes y organiza mejor tus gastos.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login"
              className="px-6 py-3 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors w-full sm:w-auto"
            >
              Crear cuenta
            </Link>
            <Link
              href="/planes"
              className="px-6 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors w-full sm:w-auto"
            >
              Ver precios
            </Link>
          </div>
          <div className="mt-8 sm:mt-12 grid grid-cols-3 gap-3 sm:gap-4 max-w-2xl mx-auto">
            {[
              ["10-15 min", "cuesta capturar una factura a mano"],
              ["Segundos", `es lo que tarda ${APP_NAME}`],
              ["Hasta 80%", "de horas ahorradas al mes"],
            ].map(([num, label]) => (
              <div key={num} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 sm:p-4">
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-100">{num}</p>
                <p className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="como-funciona" className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 text-center">Como funciona</h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-center mt-2 mb-10">
            Tres pasos y tu archivo queda listo sin tocar un solo PDF.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              ["1", "Conecta tu correo", "Autoriza con Gmail en un clic. Elegimos las cuentas de correo institucionales de tu negocio."],
              ["2", "Extraemos y validamos", "Cada factura PDF/XML se lee, se capturan emisor, importes e IVA, y se marca con un indicador de confianza."],
              ["3", "Organiza y reporta", "Detectamos duplicados, etiquetamos, buscamos al instante y exportamos a Excel o CSV."],
            ].map(([num, titulo, texto]) => (
              <div key={num} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold mb-4">
                  {num}
                </span>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{titulo}</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">{texto}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="caracteristicas" className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 text-center">Lo que hace por ti</h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-center mt-2 mb-10">
            Pensado para autonomos y negocios que reciben facturas de muchas fuentes.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              ["Extraccion automatica", "Lee facturas PDF y XML directamente desde el correo, sin descargas manuales."],
              ["Deteccion de duplicados", "Evita pagar dos veces una misma factura o registro repetido."],
              ["Busqueda instantanea", "Encuentra cualquier factura o proveedor en segundos."],
              ["Indicador de confianza", "Cada factura se valida y se marca si requiere revision manual."],
              ["Reportes y graficas", "Gastos por mes, proveedores y estados a un vistazo."],
              ["Exportacion a Excel", "Descarga tus facturas formateadas para contabilidad."],
            ].map(([titulo, texto]) => (
              <div key={titulo} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {titulo}
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">{texto}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 text-center">Precios simples</h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-center mt-2 mb-10">
            Sin cuotas de instalacion. Cancela cuando quieras.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {mensuales.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-xl border p-6 flex flex-col ${
                  plan.destacado
                    ? "border-emerald-300 dark:border-emerald-700 shadow-lg"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                {plan.destacado && (
                  <span className="self-start px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 mb-3">
                    Mas popular
                  </span>
                )}
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{plan.nombre}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{plan.descripcion}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">{formatPrecio(plan.precio)}</span>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">/ mes</span>
                </div>
                <ul className="mt-6 space-y-2 flex-1">
                  {plan.caracteristicas.slice(0, 4).map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                      <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className={`mt-6 w-full px-4 py-2 rounded-lg text-sm font-medium text-center transition-colors ${
                    plan.destacado
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
                  }`}
                >
                  Comenzar ahora
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center mt-6 text-sm text-zinc-500 dark:text-zinc-400">
            Pagos mensuales y anuales disponibles.{" "}
            <Link href="/planes" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 font-medium">
              Ver la comparativa completa
            </Link>
          </p>
        </section>

        <section className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 text-center">Preguntas frecuentes</h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-center mt-2 mb-10">
            Resolvemos tus dudas antes de empezar.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              [
                "Que tipos de facturas puedo subir?",
                "Aceptamos facturas en formato PDF y XML (CFDI 3.3 y 4.0). El sistema detecta automaticamente el formato y extrae los datos relevantes.",
              ],
              [
                "Mis datos estan seguros?",
                "Si. Usamos cifrado en transito y en reposo. Cada negocio tiene sus datos aislados. No compartimos informacion con terceros.",
              ],
              [
                "Puedo cancelar en cualquier momento?",
                "Si. No hay contratos a largo plazo. Cancela tu suscripcion cuando quieras desde tu cuenta.",
              ],
              [
                "Funciona con cualquier correo?",
                "Actualmente soportamos Gmail via Google OAuth. Estamos trabajando en soporte para Outlook y otros proveedores.",
              ],
            ].map(([pregunta, respuesta]) => (
              <div key={pregunta} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{pregunta}</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">{respuesta}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-zinc-100 max-w-2xl mx-auto">
            Recupera las horas que pierdes cada mes capturando facturas
          </h2>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
            Crea tu cuenta en menos de un minuto y conecta tu correo para empezar.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-block px-6 py-3 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            Crear cuenta gratis
          </Link>
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
            14 dias de prueba incluidos. Sin tarjeta de credito.
          </p>
        </section>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c2 0 3.85-.58 5.42-1.58" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round"/>
                <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c1.28 0 2.47-.4 3.46-1.1" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round"/>
                <path d="M13.2 12h6.5" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round"/>
                <path d="M19.7 12v2.8" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
            </span>
            <span>&copy; 2026 {APP_NAME}. Todos los derechos reservados.</span>
          </div>
          <nav aria-label="Legal" className="flex items-center gap-6">
            <Link href="/planes" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">Precios</Link>
            <Link href="/login" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">Iniciar sesion</Link>
            <a href="mailto:hola@kapta.app" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">Contacto</a>
          </nav>
        </div>
      </footer>
    </div>
  )
}
