"use client"

import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"

const NAV_STACK_KEY = "enregla_nav_stack"
const NAV_STACK_MAX = 40

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

function readStack(): string[] {
  try {
    const raw = window.sessionStorage.getItem(NAV_STACK_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((p): p is string => typeof p === "string" && getSafeFrom(p) !== null)
  } catch {
    return []
  }
}

function writeStack(stack: string[]) {
  try {
    window.sessionStorage.setItem(NAV_STACK_KEY, JSON.stringify(stack))
  } catch {
    // sessionStorage no disponible (p.ej. privacidad estricta)
  }
}

function currentPath(): string {
  const p = window.location.pathname
  const s = window.location.search
  return s ? `${p}${s}` : p
}

export function useNavTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const qs = searchParams ? searchParams.toString() : ""

  useEffect(() => {
    const cur = qs ? `${pathname}?${qs}` : pathname
    const stack = readStack()
    if (stack.length === 0) {
      writeStack([cur])
      return
    }
    if (stack[stack.length - 1] !== cur) {
      stack.push(cur)
      if (stack.length > NAV_STACK_MAX) stack.shift()
      writeStack(stack)
    }
  }, [pathname, qs])
}

export function popBackTarget(): string | null {
  if (typeof window === "undefined") return null
  const cur = currentPath()
  const stack = readStack()

  let target: string | null = null
  let targetIndex = -1
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i] !== cur) {
      target = stack[i]
      targetIndex = i
      break
    }
  }

  if (target === null) return null
  writeStack(stack.slice(0, targetIndex + 1))
  return target
}
