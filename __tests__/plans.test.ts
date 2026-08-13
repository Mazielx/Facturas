import { describe, it, expect } from "vitest"
import {
  PLANES,
  getPlanById,
  getPlanInfo,
  getMaxEmailCuentas,
  getPlanNombre,
  formatPrecio,
  getPrecioPorMes,
  isSuscripcionActiva,
} from "@/lib/plans"

describe("PLANES", () => {
  it("contains the four payment plans", () => {
    const ids = PLANES.map((p) => p.id).sort()
    expect(ids).toEqual([
      "empresa-anual",
      "empresa-mensual",
      "individual-anual",
      "individual-mensual",
    ])
  })

  it("limits email accounts by tier", () => {
    const individual = PLANES.filter((p) => p.tipo === "individual")
    const empresa = PLANES.filter((p) => p.tipo === "empresa")
    individual.forEach((p) => expect(p.maxEmailCuentas).toBe(1))
    empresa.forEach((p) => expect(p.maxEmailCuentas).toBe(4))
  })

  it("offers two months free on annual plans", () => {
    for (const p of PLANES) {
      if (p.ciclo !== "anual") continue
      const mensual = PLANES.find(
        (m) => m.tipo === p.tipo && m.ciclo === "mensual"
      )!
      expect(p.precio).toBeLessThan(mensual.precio * 12)
    }
  })
})

describe("getPlanById", () => {
  it("returns the plan for a known id", () => {
    const plan = getPlanById("empresa-anual")
    expect(plan?.precio).toBe(4990)
    expect(plan?.maxEmailCuentas).toBe(4)
  })

  it("returns undefined for unknown id", () => {
    expect(getPlanById("gold")).toBeUndefined()
  })
})

describe("getPlanInfo", () => {
  it("resolves legacy plan ids", () => {
    expect(getPlanInfo("basico").id).toBe("individual-mensual")
    expect(getPlanInfo("multi correo").id).toBe("empresa-mensual")
  })

  it("returns the plan as-is for new ids", () => {
    expect(getPlanInfo("empresa-anual").id).toBe("empresa-anual")
  })

  it("falls back to individual-mensual for unknown plans", () => {
    expect(getPlanInfo("premium").id).toBe("individual-mensual")
  })
})

describe("getMaxEmailCuentas", () => {
  it("allows one account for individual plans", () => {
    expect(getMaxEmailCuentas("individual-mensual")).toBe(1)
    expect(getMaxEmailCuentas("individual-anual")).toBe(1)
    expect(getMaxEmailCuentas("basico")).toBe(1)
  })

  it("allows four accounts for empresa plans", () => {
    expect(getMaxEmailCuentas("empresa-mensual")).toBe(4)
    expect(getMaxEmailCuentas("empresa-anual")).toBe(4)
    expect(getMaxEmailCuentas("multi correo")).toBe(4)
  })

  it("defaults to one account for unknown plans", () => {
    expect(getMaxEmailCuentas("free")).toBe(1)
  })
})

describe("getPlanNombre", () => {
  it("returns a human readable name", () => {
    expect(getPlanNombre("individual-mensual")).toBe("Individual")
    expect(getPlanNombre("empresa-anual")).toBe("Empresa")
    expect(getPlanNombre("basico")).toBe("Individual")
  })
})

describe("formatPrecio", () => {
  it("formats prices in MXN without decimals", () => {
    expect(formatPrecio(199)).toBe("$199")
    expect(formatPrecio(4990)).toBe("$4,990")
  })
})

describe("getPrecioPorMes", () => {
  it("returns monthly price divided by twelve for annual plans", () => {
    expect(getPrecioPorMes("individual-anual")).toBeCloseTo(165.83, 2)
    expect(getPrecioPorMes("empresa-anual")).toBeCloseTo(415.83, 2)
  })

  it("returns the price as-is for monthly plans", () => {
    expect(getPrecioPorMes("individual-mensual")).toBe(199)
    expect(getPrecioPorMes("empresa-mensual")).toBe(499)
  })
})

describe("isSuscripcionActiva", () => {
  it("is false without a paid-until date", () => {
    expect(isSuscripcionActiva(null)).toBe(false)
    expect(isSuscripcionActiva(undefined)).toBe(false)
  })

  it("is true when the paid-until date is today or later", () => {
    const hoy = new Date()
    expect(isSuscripcionActiva(hoy.toISOString())).toBe(true)
    const manana = new Date(hoy)
    manana.setDate(manana.getDate() + 30)
    expect(isSuscripcionActiva(manana.toISOString())).toBe(true)
  })

  it("is false when the paid-until date is in the past", () => {
    const ayer = new Date()
    ayer.setDate(ayer.getDate() - 1)
    expect(isSuscripcionActiva(ayer.toISOString())).toBe(false)
  })

  it("is false for invalid dates", () => {
    expect(isSuscripcionActiva("no-es-una-fecha")).toBe(false)
  })
})
