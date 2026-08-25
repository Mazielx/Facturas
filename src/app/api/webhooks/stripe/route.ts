import { NextResponse } from "next/server"
import { getNegocioById, getNegocioByStripeSubscriptionId, getNegocioByStripeCustomerId, updateNegocio } from "@/db"
import { getPlanById } from "@/lib/plans"
import { constructStripeEvent } from "@/lib/stripe"
import { notifyPaymentFailed, notifySubscriptionCanceled } from "@/lib/notifications"
import type Stripe from "stripe"
import { safeLogError } from "@/lib/security"

async function findNegocioForInvoice(invoice: Stripe.Invoice) {
  const subscriptionId =
    typeof invoice.parent?.subscription_details?.subscription === "string"
      ? invoice.parent.subscription_details.subscription
      : null
  const customerId = typeof invoice.customer === "string" ? invoice.customer : null
  const metadata = (invoice.parent?.subscription_details?.metadata as Record<string, string> | undefined) || {}

  let negocio = subscriptionId ? await getNegocioByStripeSubscriptionId(subscriptionId) : undefined
  if (!negocio && metadata.negocioId) {
    negocio = await getNegocioById(Number(metadata.negocioId))
  }
  if (!negocio && customerId) {
    negocio = await getNegocioByStripeCustomerId(customerId)
  }
  return { negocio, subscriptionId, customerId, metadata }
}

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json({ error: "Sin firma" }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = constructStripeEvent(body, signature)
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error desconocido"
    if (msg.includes("Stripe no configurado") || msg.includes("Webhook no configurado")) {
      return NextResponse.json({ error: "Webhook no configurado" }, { status: 503 })
    }
    return NextResponse.json({ error: "Firma invalida" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const metadata = session.metadata || {}
        const negocioId = Number(metadata.negocioId)
        const planId = metadata.planId
        if (!negocioId || !planId || !getPlanById(planId)) break
        const update: { plan?: string; stripe_customer_id?: string; stripe_subscription_id?: string } = {
          plan: planId,
        }
        if (typeof session.customer === "string") update.stripe_customer_id = session.customer
        if (typeof session.subscription === "string") update.stripe_subscription_id = session.subscription
        await updateNegocio(negocioId, update)
        break
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice
        const { negocio, subscriptionId, customerId, metadata } = await findNegocioForInvoice(invoice)
        const planId = metadata.planId
        const periodEnd = invoice.lines?.data?.[0]?.period?.end

        if (!negocio) break

        const update: { plan?: string; plan_pagado_hasta?: string; stripe_customer_id?: string; stripe_subscription_id?: string } = {}
        if (planId && getPlanById(planId)) update.plan = planId
        if (periodEnd) update.plan_pagado_hasta = new Date(periodEnd * 1000).toISOString()
        if (customerId) update.stripe_customer_id = customerId
        if (subscriptionId) update.stripe_subscription_id = subscriptionId
        if (Object.keys(update).length > 0) {
          await updateNegocio(negocio.id, update)
        }
        break
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        const { negocio } = await findNegocioForInvoice(invoice)
        if (!negocio) break
        const to = typeof invoice.customer_email === "string" ? invoice.customer_email : negocio.email
        if (to) await notifyPaymentFailed(to, negocio.nombre)
        console.warn(`[stripe] Pago de suscripcion fallido para negocio ${negocio.id} (${negocio.slug})`)
        break
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        const metadata = (subscription.metadata || {}) as Record<string, string>
        let negocio = metadata.negocioId ? await getNegocioById(Number(metadata.negocioId)) : undefined
        if (!negocio) negocio = await getNegocioByStripeSubscriptionId(subscription.id)
        if (!negocio) break
        await updateNegocio(negocio.id, { plan_pagado_hasta: null, stripe_subscription_id: null })
        const to = negocio.email || process.env.ADMIN_EMAIL
        if (to) await notifySubscriptionCanceled(to, negocio.nombre)
        console.warn(`[stripe] Suscripcion cancelada para negocio ${negocio.id} (${negocio.slug})`)
        break
      }
      default:
        break
    }
  } catch (error) {
    safeLogError("stripe_webhook", error)
    return NextResponse.json({ error: "Error procesando evento" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
