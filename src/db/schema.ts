import { dbExec, dbAll } from "./client"

export async function initializeSchema(): Promise<void> {
  const statements = [
    `CREATE TABLE IF NOT EXISTS negocios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      email TEXT,
      moneda_default TEXT DEFAULT 'MXN',
      plan TEXT DEFAULT 'basico',
      plan_pagado_hasta TEXT,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      nombre_changed_at TEXT,
      email_changed_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      nombre TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'negocio',
      negocio_id INTEGER,
      activo INTEGER DEFAULT 1,
      profile_photo_url TEXT,
      email_changed_at TEXT,
      telefono TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS sesiones (
      id TEXT PRIMARY KEY,
      usuario_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      fingerprint TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS security_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      user_id INTEGER,
      email TEXT,
      ip TEXT,
      user_agent TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key_hash TEXT NOT NULL UNIQUE,
      key_prefix TEXT NOT NULL,
      negocio_id INTEGER NOT NULL,
      nombre TEXT NOT NULL,
      permisos TEXT DEFAULT 'read',
      activa INTEGER DEFAULT 1,
      ultimo_uso TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS cuentas_correo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      negocio_id INTEGER NOT NULL,
      email TEXT NOT NULL,
      access_token TEXT,
      refresh_token TEXT,
      token_expiry TEXT,
      profile_photo_url TEXT,
      activa INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS facturas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      negocio_slug TEXT NOT NULL DEFAULT 'default',
      emisor_nombre TEXT NOT NULL,
      emisor_nif TEXT,
      emisor_direccion TEXT,
      emisor_poblacion TEXT,
      emisor_provincia TEXT,
      emisor_cp TEXT,
      emisor_pais TEXT DEFAULT 'ES',
      emisor_email TEXT,
      emisor_telefono TEXT,
      emisor_logo TEXT,
      receptor_nombre TEXT,
      receptor_nif TEXT,
      receptor_direccion TEXT,
      receptor_poblacion TEXT,
      receptor_provincia TEXT,
      receptor_cp TEXT,
      receptor_pais TEXT DEFAULT 'ES',
      receptor_email TEXT,
      numero_factura TEXT NOT NULL,
      fecha_emision TEXT NOT NULL,
      fecha_vencimiento TEXT,
      tipo_documento TEXT DEFAULT 'factura',
      moneda TEXT DEFAULT 'MXN',
      base_imponible REAL NOT NULL,
      tipo_iva REAL DEFAULT 21.0,
      cuota_iva REAL NOT NULL,
      total REAL NOT NULL,
      descuento REAL DEFAULT 0,
      retencion REAL DEFAULT 0,
      neto REAL,
      metodo_pago TEXT,
      estado TEXT DEFAULT 'pendiente',
      confianza_score REAL DEFAULT 1.0,
      confianza_nivel TEXT DEFAULT 'alta',
      requiere_revision INTEGER DEFAULT 0,
      revision_notas TEXT,
      revision_by INTEGER,
      revision_at TEXT,
      email_id TEXT,
      email_asunto TEXT,
      email_emisor TEXT,
      email_fecha TEXT,
      adjunto_nombre TEXT,
      adjunto_tipo TEXT,
      adjunto_hash TEXT UNIQUE,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS lineas_factura (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      factura_id INTEGER NOT NULL,
      numero_linea INTEGER NOT NULL,
      descripcion TEXT NOT NULL,
      cantidad REAL DEFAULT 1,
      precio_unitario REAL NOT NULL,
      descuento REAL DEFAULT 0,
      tipo_iva REAL DEFAULT 21.0,
      subtotal REAL NOT NULL,
      total REAL NOT NULL,
      FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS adjuntos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      factura_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      mime_type TEXT,
      size INTEGER,
      attachment_id TEXT,
      content_hash TEXT,
      content BLOB,
      FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS duplicados_potenciales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      factura_id INTEGER NOT NULL,
      duplicada_de_id INTEGER NOT NULL,
      razon TEXT NOT NULL,
      score REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE,
      FOREIGN KEY (duplicada_de_id) REFERENCES facturas(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS etiquetas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      negocio_id INTEGER NOT NULL,
      nombre TEXT NOT NULL,
      color TEXT DEFAULT '#6b7280',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(nombre, negocio_id),
      FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS factura_etiqueta (
      factura_id INTEGER NOT NULL,
      etiqueta_id INTEGER NOT NULL,
      PRIMARY KEY (factura_id, etiqueta_id),
      FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE,
      FOREIGN KEY (etiqueta_id) REFERENCES etiquetas(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS procesamiento_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email_id TEXT NOT NULL,
      adjunto_filename TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      error_message TEXT,
      factura_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE SET NULL
    )`,
  ]

  for (const sql of statements) {
    await dbExec(sql)
  }

  const indexes = [
    "CREATE INDEX IF NOT EXISTS idx_facturas_negocio ON facturas(negocio_slug)",
    "CREATE INDEX IF NOT EXISTS idx_facturas_emisor_nif ON facturas(emisor_nif)",
    "CREATE INDEX IF NOT EXISTS idx_facturas_fecha_emision ON facturas(fecha_emision)",
    "CREATE INDEX IF NOT EXISTS idx_facturas_numero ON facturas(numero_factura)",
    "CREATE INDEX IF NOT EXISTS idx_facturas_adjunto_hash ON facturas(adjunto_hash)",
    "CREATE INDEX IF NOT EXISTS idx_facturas_estado ON facturas(estado)",
    "CREATE INDEX IF NOT EXISTS idx_lineas_factura_id ON lineas_factura(factura_id)",
    "CREATE INDEX IF NOT EXISTS idx_adjuntos_factura_id ON adjuntos(factura_id)",
    "CREATE INDEX IF NOT EXISTS idx_duplicados_factura_id ON duplicados_potenciales(factura_id)",
    "CREATE INDEX IF NOT EXISTS idx_duplicados_duplicada_de_id ON duplicados_potenciales(duplicada_de_id)",
  ]

  for (const sql of indexes) {
    await dbExec(sql)
  }

  const negociosColumns = await dbAll<{ name: string }>("PRAGMA table_info(negocios)")
  if (!negociosColumns.some((c) => c.name === "plan_pagado_hasta")) {
    await dbExec("ALTER TABLE negocios ADD COLUMN plan_pagado_hasta TEXT")
  }
  if (!negociosColumns.some((c) => c.name === "stripe_customer_id")) {
    await dbExec("ALTER TABLE negocios ADD COLUMN stripe_customer_id TEXT")
  }
  if (!negociosColumns.some((c) => c.name === "stripe_subscription_id")) {
    await dbExec("ALTER TABLE negocios ADD COLUMN stripe_subscription_id TEXT")
  }

  const etiquetasColumns = await dbAll<{ name: string }>("PRAGMA table_info(etiquetas)")
  if (!etiquetasColumns.some((c) => c.name === "negocio_id")) {
    await dbExec("ALTER TABLE etiquetas ADD COLUMN negocio_id INTEGER DEFAULT 1")
    await dbExec("UPDATE etiquetas SET negocio_id = 1 WHERE negocio_id IS NULL")
  }

  // Security tables
  await dbExec(`CREATE TABLE IF NOT EXISTS security_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    user_id INTEGER,
    email TEXT,
    ip TEXT,
    user_agent TEXT,
    metadata TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`)

  const sesionesColumns = await dbAll<{ name: string }>("PRAGMA table_info(sesiones)")
  if (!sesionesColumns.some((c) => c.name === "fingerprint")) {
    await dbExec("ALTER TABLE sesiones ADD COLUMN fingerprint TEXT")
  }
  // V-40: Add last_activity_at for idle timeout
  if (!sesionesColumns.some((c) => c.name === "last_activity_at")) {
    await dbExec("ALTER TABLE sesiones ADD COLUMN last_activity_at TEXT")
  }

  // V-34: OAuth nonce table for single-use state enforcement
  await dbExec(`CREATE TABLE IF NOT EXISTS oauth_nonces (
    jti TEXT PRIMARY KEY,
    expires_at TEXT NOT NULL
  )`)

  // V-34: Cleanup expired nonces
  await dbExec("DELETE FROM oauth_nonces WHERE expires_at < datetime('now')").catch(() => {})

  // V-31c FIX: Add per-tenant unique index on adjunto_hash.
  // Note: SQLite doesn't support dropping the global UNIQUE constraint,
  // so we add a per-tenant index and handle cross-tenant UNIQUE violations
  // gracefully in the extraction code (treat as "already processed").
  await dbExec("CREATE UNIQUE INDEX IF NOT EXISTS idx_facturas_hash_tenant ON facturas(adjunto_hash, negocio_slug)").catch(() => {})
}
