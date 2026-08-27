import nodemailer from "nodemailer"
import { APP_NAME } from "@/lib/brand"
import { safeLogError } from "@/lib/security"

/** V-45 FIX: Escape HTML entities to prevent injection in notification emails */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  try {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
      safeLogError("smtp_not_configured", { message: "SMTP no configurado, omitiendo envio de email" })
      return false
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
    })

    return true
  } catch (error) {
    safeLogError("email_send_failed", error)
    return false
  }
}

export async function notifyExtractionErrors(
  adminEmail: string,
  errors: Array<{ filename: string; error: string }>
): Promise<void> {
  if (errors.length === 0) return

  const errorList = errors
    .map((e) => `<li><strong>${escapeHtml(e.filename)}</strong>: ${escapeHtml(e.error)}</li>`)
    .join("")

  const html = `
    <h2>Errores en la extraccion de facturas</h2>
    <p>Se encontraron ${errors.length} error(es) al procesar archivos:</p>
    <ul>${errorList}</ul>
    <p>Por favor revisa el sistema para mas detalles.</p>
  `

  await sendEmail(adminEmail, "Errores en extraccion de facturas", html)
}

export async function notifyNewInvoices(
  adminEmail: string,
  count: number
): Promise<void> {
  if (count === 0) return

  const html = `
    <h2>Nuevas facturas procesadas</h2>
    <p>Se procesaron ${count} factura(s) nuevas exitosamente.</p>
  `

  await sendEmail(adminEmail, "Nuevas facturas procesadas", html)
}

export async function notifyPaymentFailed(
  to: string,
  negocioNombre: string
): Promise<void> {
  const html = `
    <h2>No pudimos cobrar tu suscripcion</h2>
    <p>Tu pago mensual para <strong>${escapeHtml(negocioNombre)}</strong> fallo.</p>
    <p>Para seguir usando ${APP_NAME}, actualiza tu metodo de pago en tu cuenta de Stripe antes de que venza tu acceso.</p>
  `

  await sendEmail(to, `Pago fallido - ${negocioNombre}`, html)
}

export async function notifySubscriptionCanceled(
  to: string,
  negocioNombre: string
): Promise<void> {
  const html = `
    <h2>Suscripcion cancelada</h2>
    <p>La suscripcion de <strong>${escapeHtml(negocioNombre)}</strong> fue cancelada.</p>
    <p>Si fue un error, puedes volver a suscribirte desde la seccion de planes.</p>
  `

  await sendEmail(to, `Suscripcion cancelada - ${negocioNombre}`, html)
}
