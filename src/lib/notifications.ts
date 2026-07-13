import nodemailer from "nodemailer"

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
      console.warn("SMTP no configurado, omitiendo envio de email")
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
    console.error("Error enviando email:", error)
    return false
  }
}

export async function notifyExtractionErrors(
  adminEmail: string,
  errors: Array<{ filename: string; error: string }>
): Promise<void> {
  if (errors.length === 0) return

  const errorList = errors
    .map((e) => `<li><strong>${e.filename}</strong>: ${e.error}</li>`)
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
