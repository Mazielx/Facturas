"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { PLANES, formatPrecio, getPrecioPorMes } from "@/lib/plans"
import ThemeToggle from "../components/theme-toggle"
import SubscribeButton from "../components/subscribe-button"
import BackLink from "../components/back-link"
import { APP_NAME } from "@/lib/brand"

const CICLOS = [
  { id: "mensual", label: "Mensual" },
  { id: "anual", label: "Anual" },
] as const

const COMPARATIVA_MANUAL = [
  { tarea: "Revisar el correo y descargar cada factura (PDF/XML)", manual: "10-15 min por factura", app: "Automatico" },
  { tarea: "Capturar emisor, RFC/NIF, importes, IVA y lineas", manual: "2-5 min por factura", app: "Segundos" },
  { tarea: "Detectar pagos duplicados o facturas repetidas", manual: "Revision manual de cada una", app: "Automatico" },
  { tarea: "Organizar, etiquetar y archivar cada documento", manual: "2-3 min por factura", app: "Automatico" },
  { tarea: "Buscar una factura o proveedor especifico", manual: "5-15 min por consulta", app: "Instantaneo" },
  { tarea: "Generar reportes de gastos y exportar a Excel", manual: "2-4 horas al cierre de mes", app: "1 clic" },
  { tarea: "Respaldar y resguardar la informacion", manual: "Manual y propenso a perdidas", app: "Backups automaticos" },
]

const CALCULO_MANUAL = [
  { facturas: "50 / mes", horas: "~10 hrs", costoManoDeObra: "$1,100", costoPleno: "$2,500-3,500" },
  { facturas: "100 / mes", horas: "~21 hrs", costoManoDeObra: "$2,300", costoPleno: "$5,000-7,000" },
]

export default function PlanesPage() {
  return (
    <Suspense fallback={null}>
      <PlanesPageContent />
    </Suspense>
  )
}

function PlanesPageContent() {
  const [ciclo, setCiclo] = useState<"mensual" | "anual">("mensual")
  const pathname = usePathname()
  const visibles = PLANES.filter((p) => p.ciclo === ciclo)

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <BackLink fallback="/" className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
            ← Volver
          </BackLink>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Planes</h1>
          <div className="ml-auto"><ThemeToggle /></div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 sm:py-10 space-y-10 sm:space-y-12">
        <section className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            Recupera horas de trabajo cada mes
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            {APP_NAME} extrae, valida, organiza y archiva tus facturas automaticamente desde tu correo.
            Por una fraccion de lo que cuesta hacerlo a mano.
          </p>
        </section>

        <section className="flex justify-center">
          <div className="inline-flex rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-1">
            {CICLOS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCiclo(c.id)}
                className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
                  ciclo === c.id
                    ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {visibles.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-xl border bg-white dark:bg-zinc-900 p-6 flex flex-col ${
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
                <span className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">
                  {formatPrecio(plan.precio)}
                </span>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {ciclo === "anual" ? "/ año" : "/ mes"}
                </span>
              </div>
              {ciclo === "anual" && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  Equivale a {formatPrecio(getPrecioPorMes(plan.id))}/mes · 2 meses gratis
                </p>
              )}
              <ul className="mt-6 space-y-2 flex-1">
                {plan.caracteristicas.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                    <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <SubscribeButton
                planId={plan.id}
                label="Comenzar ahora"
                className={`mt-6 w-full px-4 py-2 rounded-lg text-sm font-medium text-center transition-colors ${
                  plan.destacado
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
                }`}
              />
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Cuanto cuesta hacer el mismo trabajo a mano
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 mb-4">
            Datos de Ardent Partners, IOFM y APQC: capturar y archivar una factura manualmente toma de 10 a 15
            minutos, sin contar errores, correcciones y conciliaciones.
          </p>
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Facturas/mes</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Horas/mes</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Mano de obra</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Costo pleno</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {CALCULO_MANUAL.map((fila) => (
                  <tr key={fila.facturas}>
                    <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">{fila.facturas}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{fila.horas}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{fila.costoManoDeObra}</td>
                    <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 font-medium">{fila.costoPleno}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="sm:hidden space-y-3">
            {CALCULO_MANUAL.map((fila) => (
              <div key={fila.facturas} className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{fila.facturas}</span>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{fila.costoPleno}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                  <span>{fila.horas} de trabajo</span>
                  <span>Mano de obra: {fila.costoManoDeObra}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-4">
            Costo pleno estimado incluyendo errores, correcciones, archivo y conciliacion. En MXN, con salario
            real de auxiliar contable (~$110/hr con prestaciones).
          </p>
        </section>

        <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Tarea por tarea</h3>
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Tarea</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">A mano</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Con {APP_NAME}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {COMPARATIVA_MANUAL.map((fila) => (
                  <tr key={fila.tarea}>
                    <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">{fila.tarea}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{fila.manual}</td>
                    <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-medium">{fila.app}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="sm:hidden space-y-3">
            {COMPARATIVA_MANUAL.map((fila) => (
              <div key={fila.tarea} className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1.5">{fila.tarea}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500 dark:text-zinc-400">A mano: {fila.manual}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">{fila.app}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="text-center">
          <Link
            href={`/login?from=${encodeURIComponent(pathname)}`}
            className="inline-block px-6 py-3 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            Crear cuenta y empezar
          </Link>
        </section>
      </main>
    </div>
  )
}
