import type Database from "better-sqlite3"

export function initializeSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS facturas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      
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
      
      email_id TEXT,
      email_asunto TEXT,
      email_emisor TEXT,
      email_fecha TEXT,
      adjunto_nombre TEXT,
      adjunto_tipo TEXT,
      adjunto_hash TEXT UNIQUE,
      
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS lineas_factura (
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
    );

    CREATE TABLE IF NOT EXISTS adjuntos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      factura_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      mime_type TEXT,
      size INTEGER,
      attachment_id TEXT,
      content_hash TEXT,
      content BLOB,
      
      FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS duplicados_potenciales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      factura_id INTEGER NOT NULL,
      duplicada_de_id INTEGER NOT NULL,
      razon TEXT NOT NULL,
      score REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE,
      FOREIGN KEY (duplicada_de_id) REFERENCES facturas(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS etiquetas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#6b7280',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS factura_etiqueta (
      factura_id INTEGER NOT NULL,
      etiqueta_id INTEGER NOT NULL,
      PRIMARY KEY (factura_id, etiqueta_id),
      FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE,
      FOREIGN KEY (etiqueta_id) REFERENCES etiquetas(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS procesamiento_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email_id TEXT NOT NULL,
      adjunto_filename TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      error_message TEXT,
      factura_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      
      FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_facturas_emisor_nif ON facturas(emisor_nif);
    CREATE INDEX IF NOT EXISTS idx_facturas_fecha_emision ON facturas(fecha_emision);
    CREATE INDEX IF NOT EXISTS idx_facturas_numero ON facturas(numero_factura);
    CREATE INDEX IF NOT EXISTS idx_facturas_adjunto_hash ON facturas(adjunto_hash);
    CREATE INDEX IF NOT EXISTS idx_facturas_estado ON facturas(estado);
    CREATE INDEX IF NOT EXISTS idx_lineas_factura_id ON lineas_factura(factura_id);
    CREATE INDEX IF NOT EXISTS idx_adjuntos_factura_id ON adjuntos(factura_id);
    CREATE INDEX IF NOT EXISTS idx_duplicados_factura_id ON duplicados_potenciales(factura_id);
    CREATE INDEX IF NOT EXISTS idx_duplicados_duplicada_de_id ON duplicados_potenciales(duplicada_de_id);
  `)

  const columns = db.prepare("PRAGMA table_info(facturas)").all() as Array<{ name: string }>
  const columnNames = columns.map((c) => c.name)

  if (!columnNames.includes("confianza_score")) {
    db.exec("ALTER TABLE facturas ADD COLUMN confianza_score REAL DEFAULT 1.0")
  }
  if (!columnNames.includes("confianza_nivel")) {
    db.exec("ALTER TABLE facturas ADD COLUMN confianza_nivel TEXT DEFAULT 'alta'")
  }
  if (!columnNames.includes("requiere_revision")) {
    db.exec("ALTER TABLE facturas ADD COLUMN requiere_revision INTEGER DEFAULT 0")
  }
  if (!columnNames.includes("revision_notas")) {
    db.exec("ALTER TABLE facturas ADD COLUMN revision_notas TEXT")
  }
  if (!columnNames.includes("revision_by")) {
    db.exec("ALTER TABLE facturas ADD COLUMN revision_by INTEGER")
  }
  if (!columnNames.includes("revision_at")) {
    db.exec("ALTER TABLE facturas ADD COLUMN revision_at TEXT")
  }

  try {
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS facturas_fts USING fts5(
        numero_factura, emisor_nombre, receptor_nombre, emisor_nif,
        adjunto_nombre, email_asunto, content='facturas', content_rowid='id'
      );

      CREATE TRIGGER IF NOT EXISTS facturas_ai AFTER INSERT ON facturas BEGIN
        INSERT INTO facturas_fts(rowid, numero_factura, emisor_nombre, receptor_nombre, emisor_nif, adjunto_nombre, email_asunto)
        VALUES (new.id, new.numero_factura, new.emisor_nombre, new.receptor_nombre, new.emisor_nif, new.adjunto_nombre, new.email_asunto);
      END;

      CREATE TRIGGER IF NOT EXISTS facturas_ad AFTER DELETE ON facturas BEGIN
        INSERT INTO facturas_fts(facturas_fts, rowid, numero_factura, emisor_nombre, receptor_nombre, emisor_nif, adjunto_nombre, email_asunto)
        VALUES ('delete', old.id, old.numero_factura, old.emisor_nombre, old.receptor_nombre, old.emisor_nif, old.adjunto_nombre, old.email_asunto);
      END;

      CREATE TRIGGER IF NOT EXISTS facturas_au AFTER UPDATE ON facturas BEGIN
        INSERT INTO facturas_fts(facturas_fts, rowid, numero_factura, emisor_nombre, receptor_nombre, emisor_nif, adjunto_nombre, email_asunto)
        VALUES ('delete', old.id, old.numero_factura, old.emisor_nombre, old.receptor_nombre, old.emisor_nif, old.adjunto_nombre, old.email_asunto);
        INSERT INTO facturas_fts(rowid, numero_factura, emisor_nombre, receptor_nombre, emisor_nif, adjunto_nombre, email_asunto)
        VALUES (new.id, new.numero_factura, new.emisor_nombre, new.receptor_nombre, new.emisor_nif, new.adjunto_nombre, new.email_asunto);
      END;
    `)
  } catch {
    console.warn("FTS5 no disponible, usando busqueda con LIKE")
  }
}
