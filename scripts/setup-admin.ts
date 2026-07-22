import { getMainDb, getUsuarioByEmail } from "../src/db"
import { hashPassword } from "../src/lib/auth"

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
    const passwordHash = await hashPassword(password)
    db.prepare("UPDATE usuarios SET password_hash = ?, activo = 1 WHERE id = ?").run(passwordHash, existing.id)
    console.log(`Usuario ${email} actualizado correctamente.`)
    return
  }

  const passwordHash = await hashPassword(password)
  const result = db
    .prepare("INSERT INTO usuarios (email, password_hash, nombre, role) VALUES (?, ?, ?, ?)")
    .run(email, passwordHash, "Administrador", "admin")

  console.log("Usuario admin creado exitosamente:")
  console.log(`  ID: ${result.lastInsertRowid}`)
  console.log(`  Email: ${email}`)
  console.log(`  Nombre: Administrador`)
  console.log(`  Rol: admin`)
}

main()
