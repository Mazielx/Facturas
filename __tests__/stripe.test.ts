import { describe, it, expect, afterEach } from "vitest"
import { buildStripeLineItem, getStripe } from "@/lib/stripe"
import { getPlanById } from "@/lib/plans"

describe("buildStripeLineItem", () => {
  it("maps a monthly plan to MXN with monthly recurrence", () => {
    const item = buildStripeLineItem(getPlanById("individual-mensual")!)
    expect(item.price_data?.currency).toBe("mxn")
    expect(item.price_data?.unit_amount).toBe(19900)
    expect(item.price_data?.recurring?.interval).toBe("month")
  })

  it("maps an annual plan to yearly recurrence with the discounted price", () => {
    const item = buildStripeLineItem(getPlanById("empresa-anual")!)
    expect(item.price_data?.unit_amount).toBe(499000)
    expect(item.price_data?.recurring?.interval).toBe("year")
  })

  it("rounds fractional MXN prices to the smallest coin", () => {
    const item = buildStripeLineItem(getPlanById("individual-anual")!)
    expect(item.price_data?.unit_amount).toBe(199000)
  })
})

describe("getStripe", () => {
  afterEach(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy"
  })

  it("throws when STRIPE_SECRET_KEY is not configured", () => {
    delete process.env.STRIPE_SECRET_KEY
    expect(() => getStripe()).toThrow()
  })

  it("returns a client when STRIPE_SECRET_KEY is set", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy"
    expect(() => getStripe()).not.toThrow()
  })
})
