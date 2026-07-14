import { getMainDb, createUsuario, getUsuarioByEmail } from "../src/db"
import bcrypt from "bcrypt"

async function main() {
  const email = process.argv[2]
  const password = process.argv[3]
  const force = process.argv.includes("--force")

  if (!email || !password) {
    console.error("Uso: npx tsx scripts/setup-admin.ts <email> <password> [--force]")
    process.exit(1)
  }

  const db = getMainDb()

  const existing = getUsuarioByEmail(email)
  if (existing && !force) {
    console.error(`El usuario ${email} ya existe. Usa --force para sobreescribir.`)
    process.exit(1)
  }

  if (existing && force) {
    const passwordHash = await bcrypt.hash(password, 12)
    db.prepare("UPDATE usuarios SET password_hash = ?, activo = 1 WHERE id = ?").run(passwordHash, existing.id)
    console.log(`Usuario ${email} actualizado correctamente.`)
    return
  }

  const admin = await createUsuario(email, password, "Administrador", "admin")

  console.log("Usuario admin creado exitosamente:")
  console.log(`  ID: ${admin.id}`)
  console.log(`  Email: ${admin.email}`)
  console.log(`  Nombre: ${admin.nombre}`)
  console.log(`  Rol: ${admin.role}`)
}

main()
