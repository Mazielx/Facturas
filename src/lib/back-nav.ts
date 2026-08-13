"use client"

import { useEffect, useRef } from "react"
import { usePathname, useSearchParams } from "next/navigation"

const NAV_FLAG_KEY = "enregla_nav_flag"

export function getSafeFrom(from: string | null | undefined): string | null {
  if (!from) return null
  if (from.length > 512) return null
  if (!from.startsWith("/")) return null
  if (from.startsWith("//")) return null
  if (from.includes("\\")) return null
  if (from.includes("://")) return null
  return from
}

export function useFromParam(): string | null {
  const searchParams = useSearchParams()
  return getSafeFrom(searchParams.get("from"))
}

function hasInAppHistory(): boolean {
  try {
    return window.sessionStorage.getItem(NAV_FLAG_KEY) === "1"
  } catch {
    return false
  }
}

function markInAppHistory() {
  try {
    window.sessionStorage.setItem(NAV_FLAG_KEY, "1")
  } catch {
    // sessionStorage no disponible (p.ej. privacidad estricta)
  }
}

export function shouldUseHistoryBack(): boolean {
  if (typeof window === "undefined") return false
  return hasInAppHistory() && window.history.length > 1
}

export function useNavTracker() {
  const pathname = usePathname()
  const isFirstRun = useRef(true)

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false
      return
    }
    markInAppHistory()
  }, [pathname])
}
