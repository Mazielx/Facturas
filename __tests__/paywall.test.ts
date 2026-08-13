import { describe, it, expect, afterEach } from "vitest"
import { isAccesoCompleto, esEmailAdmin, planBloqueado, maxCuentasCorreo } from "@/lib/paywall"

const originalAdminEmail = process.env.ADMIN_EMAIL

afterEach(() => {
  if (originalAdminEmail === undefined) {
    delete process.env.ADMIN_EMAIL
  } else {
    process.env.ADMIN_EMAIL = originalAdminEmail
  }
})

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

  it("bypasses the paywall for the configured admin email", () => {
    process.env.ADMIN_EMAIL = "ianmazielromo@gmail.com"
    expect(
      isAccesoCompleto({ email: "ian.maziel.romo@gmail.com", role: "negocio", planPagadoHasta: null })
    ).toBe(true)
  })

  it("does not bypass for other emails", () => {
    process.env.ADMIN_EMAIL = "ianmazielromo@gmail.com"
    expect(isAccesoCompleto({ email: "otro@gmail.com", role: "negocio", planPagadoHasta: null })).toBe(false)
  })

  it("does not bypass when ADMIN_EMAIL is unset", () => {
    delete process.env.ADMIN_EMAIL
    expect(isAccesoCompleto({ email: "ian.maziel.romo@gmail.com", role: "negocio", planPagadoHasta: null })).toBe(false)
  })
})

describe("esEmailAdmin", () => {
  it("matches gmail addresses ignoring dots", () => {
    process.env.ADMIN_EMAIL = "ianmazielromo@gmail.com"
    expect(esEmailAdmin("ian.maziel.romo@gmail.com")).toBe(true)
    expect(esEmailAdmin("IANMAZIELROMO@gmail.com")).toBe(true)
    expect(esEmailAdmin("otro@gmail.com")).toBe(false)
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

  it("gives the owner email the empresa limit regardless of plan", () => {
    process.env.ADMIN_EMAIL = "ianmazielromo@gmail.com"
    expect(maxCuentasCorreo({ role: "negocio", email: "ian.maziel.romo@gmail.com" }, "basico")).toBe(4)
    expect(maxCuentasCorreo({ role: "negocio", email: "otro@gmail.com" }, "basico")).toBe(1)
  })
})
