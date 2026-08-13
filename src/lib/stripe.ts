import Stripe from "stripe"
import { getPlanById, type Plan } from "@/lib/plans"

let stripeClient: Stripe | null = null

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error("Stripe no configurado: falta STRIPE_SECRET_KEY")
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key)
  }
  return stripeClient
}

export function buildStripeLineItem(plan: Plan): Stripe.Checkout.SessionCreateParams.LineItem {
  return {
    quantity: 1,
    price_data: {
      currency: "mxn",
      unit_amount: Math.round(plan.precio * 100),
      recurring: { interval: plan.ciclo === "anual" ? "year" : "month" },
      product_data: {
        name: `${plan.nombre} (${plan.ciclo === "anual" ? "Anual" : "Mensual"})`,
      },
    },
  }
}

function getBaseUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return "http://localhost:3000"
}

export async function createCheckoutSession(opts: {
  negocioId: number
  planId: string
  email?: string
}): Promise<{ url: string | null }> {
  const stripe = getStripe()
  const plan = getPlanById(opts.planId)
  if (!plan) {
    throw new Error("Plan no encontrado")
  }

  const metadata = {
    negocioId: String(opts.negocioId),
    planId: plan.id,
  }

  const baseUrl = getBaseUrl()
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [buildStripeLineItem(plan)],
    customer_email: opts.email,
    metadata,
    subscription_data: { metadata },
    success_url: `${baseUrl}/empresa?msg=suscripcion_activa`,
    cancel_url: `${baseUrl}/planes?msg=suscripcion_cancelada`,
  })

  return { url: session.url }
}

export function constructStripeEvent(body: string, signature: string): Stripe.Event {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    throw new Error("Webhook no configurado: falta STRIPE_WEBHOOK_SECRET")
  }
  return stripe.webhooks.constructEvent(body, signature, secret)
}
