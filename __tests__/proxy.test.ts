import { describe, it, expect } from "vitest"
import { isPublicPath, isPublicApiPath } from "@/proxy"

describe("isPublicPath", () => {
  it("allows marketing and auth pages", () => {
    expect(isPublicPath("/")).toBe(true)
    expect(isPublicPath("/planes")).toBe(true)
    expect(isPublicPath("/pricing")).toBe(true)
    expect(isPublicPath("/login")).toBe(true)
  })

  it("rejects protected app routes", () => {
    expect(isPublicPath("/dashboard")).toBe(false)
    expect(isPublicPath("/facturas")).toBe(false)
    expect(isPublicPath("/empresa")).toBe(false)
    expect(isPublicPath("/configuracion")).toBe(false)
  })

  it("handles trailing slashes consistently", () => {
    expect(isPublicPath("/planes/")).toBe(true)
    expect(isPublicPath("/pricing/")).toBe(true)
    expect(isPublicPath("/login/")).toBe(true)
  })
})

describe("isPublicApiPath", () => {
  it("allows auth and stripe webhook prefixes", () => {
    expect(isPublicApiPath("/api/auth/login")).toBe(true)
    expect(isPublicApiPath("/api/auth/register")).toBe(true)
    expect(isPublicApiPath("/api/auth/callback")).toBe(true)
    expect(isPublicApiPath("/api/webhooks/stripe")).toBe(true)
  })

  it("blocks business and tenant api routes", () => {
    expect(isPublicApiPath("/api/negocios")).toBe(false)
    expect(isPublicApiPath("/api/facturas")).toBe(false)
    expect(isPublicApiPath("/api/extract")).toBe(false)
  })
})
