import { ensureSchema, getNegocioBySlug, updateNegocio } from "../src/db"
import { getPlanById } from "../src/lib/plans"

async function main() {
  const slug = process.argv[2]
  const fecha = process.argv[3]
  const plan = process.argv[4]

  if (!slug || !fecha) {
    console.error("Uso: npx tsx scripts/marcar-plan.ts <slug> <fecha> [plan]")
    console.error("  fecha: YYYY-MM-DD (ultimo dia pagado, inclusive)")
    console.error("  plan: individual-mensual | empresa-mensual | individual-anual | empresa-anual")
    process.exit(1)
  }

  if (plan && !getPlanById(plan)) {
    console.error(`Plan desconocido: ${plan}`)
    process.exit(1)
  }

  await ensureSchema()

  const negocio = await getNegocioBySlug(slug)
  if (!negocio) {
    console.error(`El negocio ${slug} no existe.`)
    process.exit(1)
  }

  const data: { plan_pagado_hasta?: string; plan?: string } = { plan_pagado_hasta: `${fecha}T23:59:59` }
  if (plan) data.plan = plan

  const res = await updateNegocio(negocio.id, data)
  if (res.error) {
    console.error(res.error)
    process.exit(1)
  }

  console.log(`Suscripcion activada para ${negocio.nombre} (${slug}):`)
  console.log(`  Plan: ${plan || negocio.plan}`)
  console.log(`  Pagado hasta: ${fecha}`)
}

main()
