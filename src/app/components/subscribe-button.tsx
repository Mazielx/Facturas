"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"

interface SubscribeButtonProps {
  planId: string
  label?: string
  className?: string
}

export default function SubscribeButton({ planId, label = "Suscribirme", className }: SubscribeButtonProps) {
  const [subscribing, setSubscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pathname = usePathname()

  const handleSubscribe = async () => {
    setSubscribing(true)
    setError(null)
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      })
      if (res.status === 401) {
        window.location.href = `/login?from=${encodeURIComponent(pathname)}`
        return
      }
      const data = await res.json()
      if (res.ok && data.url) {
        window.location.href = data.url
        return
      }
      setError(data.error || "No se pudo iniciar el pago")
    } catch {
      setError("Error de conexion")
    } finally {
      setSubscribing(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleSubscribe}
        disabled={subscribing}
        className={className}
      >
        {subscribing ? "Creando pago..." : label}
      </button>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
