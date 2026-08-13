"use client"

import { useState } from "react"
import Link from "next/link"
import { PLANES, formatPrecio, getPrecioPorMes } from "@/lib/plans"
import SubscribeButton from "./subscribe-button"

const CICLOS = [
  { id: "mensual", label: "Mensual" },
  { id: "anual", label: "Anual" },
] as const

interface PlanModalProps {
  open: boolean
  onClose: () => void
}

export default function PlanModal({ open, onClose }: PlanModalProps) {
  const [ciclo, setCiclo] = useState<"mensual" | "anual">("mensual")

  if (!open) return null

  const visibles = PLANES.filter((p) => p.ciclo === ciclo)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Planes de pago"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-xl">
        <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Se requiere un plan activo
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Activa tu mensualidad para continuar. Por una fraccion de lo que cuesta hacerlo a mano.
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

        <div className="px-6 py-5 space-y-5">
          <div className="flex justify-center">
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {visibles.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-xl border p-4 flex flex-col ${
                  plan.destacado
                    ? "border-emerald-300 dark:border-emerald-700"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{plan.nombre}</h3>
                  {plan.destacado && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                      Mas popular
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    {formatPrecio(plan.precio)}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {ciclo === "anual" ? "/ año" : "/ mes"}
                  </span>
                </div>
                {ciclo === "anual" && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                    Equivale a {formatPrecio(getPrecioPorMes(plan.id))}/mes · 2 meses gratis
                  </p>
                )}
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 flex-1">
                  Hasta {plan.maxEmailCuentas} cuenta{plan.maxEmailCuentas > 1 ? "s" : ""} de correo institucional
                </p>
                <SubscribeButton
                  planId={plan.id}
                  label="Suscribirme"
                  className="mt-4 w-full px-4 py-2 rounded-lg text-sm font-medium text-center transition-colors bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
                />
              </div>
            ))}
          </div>

          <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center">
            Pagas con tarjeta via Stripe. Puedes cancelar cuando quieras.
          </p>

          <Link
            href="/planes"
            onClick={onClose}
            className="block text-center px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
          >
            Ver planes y precios
          </Link>
        </div>
      </div>
    </div>
  )
}
