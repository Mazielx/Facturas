import { getMainDb, createUsuario, getUsuarioByEmail } from "../src/db"
import bcrypt from "bcrypt"

async function main() {
  const email = process.argv[2]
  const password = process.argv[3]

  if (!email || !password) {
    console.error("Uso: npx tsx scripts/setup-admin.ts <email> <password>")
    console.error("Ejemplo: npx tsx scripts/setup-admin.ts admin@empresa.com contrasena123")
    process.exit(1)
  }

  getMainDb()

  const existing = getUsuarioByEmail(email)
  if (existing) {
    console.error(`El usuario con email ${email} ya existe`)
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const admin = createUsuario(email, passwordHash, "Administrador", "admin")

  console.log("Usuario admin creado exitosamente:")
  console.log(`  ID: ${admin.id}`)
  console.log(`  Email: ${admin.email}`)
  console.log(`  Nombre: ${admin.nombre}`)
  console.log(`  Rol: ${admin.role}`)
}

main()
