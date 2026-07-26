import { ensureSchema, getUsuarioByEmail, createUsuario } from "../src/db"
import { hashPassword } from "../src/lib/auth"

async function main() {
  const email = process.argv[2]
  const password = process.argv[3]
  const force = process.argv.includes("--force")

  if (!email || !password) {
    console.error("Uso: npx tsx scripts/setup-admin.ts <email> <password> [--force]")
    process.exit(1)
  }

  await ensureSchema()

  const existing = await getUsuarioByEmail(email)
  if (existing && !force) {
    console.error(`El usuario ${email} ya existe. Usa --force para sobreescribir.`)
    process.exit(1)
  }

  if (existing && force) {
    const passwordHash = await hashPassword(password)
    const { dbRun } = await import("../src/db/client")
    await dbRun("UPDATE usuarios SET password_hash = ?, activo = 1 WHERE id = ?", { "1": passwordHash, "2": existing.id })
    console.log(`Usuario ${email} actualizado correctamente.`)
    return
  }

  const user = await createUsuario(email, password, "Administrador", "admin")

  console.log("Usuario admin creado exitosamente:")
  console.log(`  ID: ${user.id}`)
  console.log(`  Email: ${email}`)
  console.log(`  Nombre: Administrador`)
  console.log(`  Rol: admin`)
}

main()
