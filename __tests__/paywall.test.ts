import { describe, it, expect, afterEach } from "vitest"
import { isAccesoCompleto, planBloqueado, maxCuentasCorreo } from "@/lib/paywall"

const futuro = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
const pasado = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

describe("isAccesoCompleto", () => {
  it("is false without subscription and without admin", () => {
    expect(isAccesoCompleto({ email: "user@empresa.com", role: "negocio", planPagadoHasta: null })).toBe(false)
  })

  it("is true when the subscription is active", () => {
    expect(isAccesoCompleto({ email: "user@empresa.com", role: "negocio", planPagadoHasta: futuro })).toBe(true)
  })

  it("is false when the subscription expired", () => {
    expect(isAccesoCompleto({ email: "user@empresa.com", role: "negocio", planPagadoHasta: pasado })).toBe(false)
  })

  it("bypasses the paywall for admin role", () => {
    expect(isAccesoCompleto({ email: "user@empresa.com", role: "admin", planPagadoHasta: null })).toBe(true)
  })

  // V-14: esEmailAdmin no longer grants paywall bypass — role-based only
  it("does NOT bypass for admin email (role-based auth only)", () => {
    process.env.ADMIN_EMAIL = "ianmazielromo@gmail.com"
    expect(
      isAccesoCompleto({ email: "ian.maziel.romo@gmail.com", role: "negocio", planPagadoHasta: null })
    ).toBe(false)
  })

  it("does not bypass for other emails", () => {
    process.env.ADMIN_EMAIL = "ianmazielromo@gmail.com"
    expect(isAccesoCompleto({ email: "otro@gmail.com", role: "negocio", planPagadoHasta: null })).toBe(false)
  })
})

describe("planBloqueado", () => {
  it("is the inverse of isAccesoCompleto", () => {
    expect(planBloqueado({ email: "a@b.com", role: "negocio", planPagadoHasta: null })).toBe(true)
    expect(planBloqueado({ email: "a@b.com", role: "negocio", planPagadoHasta: futuro })).toBe(false)
  })
})

describe("maxCuentasCorreo", () => {
  it("respects plan limits for regular users", () => {
    expect(maxCuentasCorreo({ role: "negocio", email: "u@empresa.com" }, "individual-mensual")).toBe(1)
    expect(maxCuentasCorreo({ role: "negocio", email: "u@empresa.com" }, "empresa-mensual")).toBe(4)
  })

  it("gives the admin role the empresa limit regardless of plan", () => {
    expect(maxCuentasCorreo({ role: "admin", email: "u@empresa.com" }, "basico")).toBe(4)
  })

  // V-14: Email-based admin no longer gets elevated limits
  it("does NOT give admin email elevated limits (role-based only)", () => {
    process.env.ADMIN_EMAIL = "ianmazielromo@gmail.com"
    expect(maxCuentasCorreo({ role: "negocio", email: "ian.maziel.romo@gmail.com" }, "basico")).toBe(1)
    expect(maxCuentasCorreo({ role: "negocio", email: "otro@gmail.com" }, "basico")).toBe(1)
  })
})
