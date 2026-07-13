# Plan: Sistema Completo de Facturas Multi-Tenant

## Decisiones Tecnicas

| Componente | Tecnologia | Razon |
|---|---|---|
| Auth | bcrypt + httpOnly cookies | Simple, seguro, sin dependencias externas |
| Graficas | Recharts | Declarativa, ligera (~40KB gz), SVG, buen DX |
| Emails | Nodemailer + SMTP | Sin dependencia de servicios externos, flexible |
| Excel | xlsx (SheetJS) | Estandar de industria, genera .xlsx real |
| Busqueda | SQLite FTS5 | Nativo de SQLite, ultra rapido, sin infra extra |
| Backups | Script cron + better-sqlite3 backup API | Consistente sin locks |

---

## Fase 1: Autenticacion y Permisos

### 1.1 Schema - Tabla de usuarios (main.db)

```sql
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nombre TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'negocio',  -- 'admin' | 'negocio'
  negocio_id INTEGER,                     -- NULL para admin
  activo INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sesiones (
  id TEXT PRIMARY KEY,                    -- crypto random hex
  usuario_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
```

### 1.2 Archivos a crear/modificar

| Archivo | Accion | Descripcion |
|---|---|---|
| `src/lib/auth.ts` | **CREAR** | `hashPassword()`, `verifyPassword()`, `createSession()`, `getSessionUser()`, `requireAuth()`, `requireAdmin()` |
| `src/db/index.ts` | **MODIFICAR** | Agregar schema de usuarios/sesiones en `initializeMainSchema()`, CRUD de usuarios |
| `src/middleware.ts` | **CREAR** | Interceptor de rutas: redirigir a `/login` si no hay sesion valida |
| `src/app/login/page.tsx` | **CREAR** | Formulario de login (email + password) |
| `src/app/api/auth/login/route.ts` | **CREAR** | POST: validar credenciales, crear sesion, setear cookie |
| `src/app/api/auth/logout/route.ts` | **CREAR** | POST: eliminar sesion, limpiar cookie |
| `src/app/api/admin/usuarios/route.ts` | **CREAR** | CRUD de usuarios (solo admin) |
| `src/app/admin/page.tsx` | **CREAR** | Dashboard admin: ver todos los negocios, gestionar usuarios |
| `src/lib/tenant.ts` | **MODIFICAR** | `requireActiveTenant()` ahora valida sesion + permisos del negocio |
| Todas las rutas `/api/*` | **MODIFICAR** | Cambiar de `requireActiveTenant()` a `requireAuth()` + verificacion de permiso |

### 1.3 Flujo de autenticacion

```
[Visitante] -> /login -> POST /api/auth/login
  -> bcrypt.compare(password, user.password_hash)
  -> crypto.randomBytes(32) -> sesion_id
  -> INSERT INTO sesiones (id, usuario_id, expires_at)
  -> Set-Cookie: session_id=<token>; HttpOnly; SameSite=Lax; Path=/

[Admin] -> Cookie: session_id=xxx
  -> middleware.ts lee cookie
  -> SELECT u.*, s.expires_at FROM usuarios u JOIN sesiones s...
  -> role = 'admin' -> acceso total a todo
  -> Redirige a /admin si accede a / (opcional)

[Negocio] -> Cookie: session_id=xxx
  -> middleware.ts lee cookie
  -> role = 'negocio' -> solo accede a su negocio_id
  -> requireActiveTenant() verifica que el negocio_slug coincida con su negocio_id
```

### 1.4 Proteccion de rutas (middleware.ts)

```
/login, /api/auth/*  -> Publico
/admin, /api/admin/* -> Solo admin
/*                    -> Requiere sesion valida
/api/facturas/*      -> Requiere sesion + pertenece al negocio
/api/extract         -> Requiere sesion + pertenece al negocio
```

### 1.5 Archivos de migracion

- Script `scripts/setup-admin.ts`: Crea el usuario admin inicial (email + password hasheada)
- Se ejecuta una vez: `npx tsx scripts/setup-admin.ts admin@empresa.com contrasena123`

---

## Fase 2: Indicador de Confianza y Revision Manual

### 2.1 Schema - Campos de confianza (tenant.db)

```sql
-- Nuevas columnas en facturas:
ALTER TABLE facturas ADD COLUMN confianza_score REAL DEFAULT 1.0;  -- 0.0 a 1.0
ALTER TABLE facturas ADD COLUMN confianza_nivel TEXT DEFAULT 'alta';  -- 'alta' | 'media' | 'baja' | 'error'
ALTER TABLE facturas ADD COLUMN requiere_revision INTEGER DEFAULT 0;
ALTER TABLE facturas ADD COLUMN revision_notas TEXT;
ALTER TABLE facturas ADD COLUMN revision_by INTEGER;
ALTER TABLE facturas ADD COLUMN revision_at TEXT;
```

### 2.2 Logica de scoring

En `src/lib/extraction/index.ts`, despues de parsear:

```typescript
function calcularConfianza(datos: FacturaCompleta, source: 'xml' | 'pdf'): number {
  let score = source === 'xml' ? 1.0 : 0.7  // XML结构化 = alta confianza

  // Penalizaciones
  if (!datos.emisor.nif) score -= 0.15
  if (!datos.emisor.direccion) score -= 0.10
  if (!datos.receptor.nif) score -= 0.10
  if (datos.factura.total <= 0) score -= 0.20
  if (datos.lineas.length === 0) score -= 0.15
  if (!datos.factura.fechaEmision) score -= 0.20

  // Penalizacion por calculos inconsistentes
  const expectedIva = datos.factura.baseImponible * (datos.factura.tipoIva / 100)
  if (Math.abs(expectedIva - datos.factura.cuotaIva) > 0.01) score -= 0.15

  const expectedTotal = datos.factura.baseImponible + datos.factura.cuotaIva - datos.factura.descuento
  if (Math.abs(expectedTotal - datos.factura.total) > 0.01) score -= 0.15

  return Math.max(0, Math.min(1, score))
}

function nivelConfianza(score: number): 'alta' | 'media' | 'baja' | 'error' {
  if (score >= 0.85) return 'alta'
  if (score >= 0.65) return 'media'
  if (score >= 0.4) return 'baja'
  return 'error'
}
```

### 2.3 Archivos a crear/modificar

| Archivo | Accion | Descripcion |
|---|---|---|
| `src/lib/extraction/index.ts` | **MODIFICAR** | Agregar `calcularConfianza()`, guardar score al insertar |
| `src/db/schema.ts` | **MODIFICAR** | Agregar columnas de confianza al schema |
| `src/app/api/facturas/[id]/revision/route.ts` | **CREAR** | PUT: marcar/desmarcar como "requiere_revision", agregar notas |
| `src/app/api/facturas/stats/route.ts` | **MODIFICAR** | Agregar conteo por nivel de confianza |
| `src/app/facturas/content.tsx` | **MODIFICAR** | Filtro por confianza, badge de nivel, columna de revision |
| `src/app/facturas/[id]/page.tsx` | **MODIFICAR** | Mostrar score de confianza, boton de "Marcar para revision" |
| `src/app/page.tsx` | **MODIFICAR** | Dashboard: card "Requieren revision" |
| `src/app/api/extract/route.ts` | **MODIFICAR** | Retornar estadisticas: procesados, revision, error |

---

## Fase 3: Deteccion de Duplicados

### 3.1 Schema

```sql
-- En tenant.db:
CREATE TABLE IF NOT EXISTS duplicados_potenciales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  factura_id INTEGER NOT NULL,
  duplicada_de_id INTEGER NOT NULL,
  razon TEXT NOT NULL,              -- 'hash_exacto' | 'mismo_numero' | 'mismo_monto_fecha'
  score REAL NOT NULL,              -- 0.0 a 1.0 que tan seguro es el duplicado
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE,
  FOREIGN KEY (duplicada_de_id) REFERENCES facturas(id) ON DELETE CASCADE
);
```

### 3.2 Logica de deteccion

```typescript
function detectarDuplicados(db, nuevaFactura: FacturaCompleta): DuplicadoDetectado[] {
  const duplicados = []

  // 1. Hash exacto (ya existe - cubierto)
  // 2. Mismo numero de factura + mismo emisor NIF
  const mismoNumero = db.prepare(
    "SELECT id FROM facturas WHERE numero_factura = ? AND emisor_nif = ? AND id != ?"
  ).get(nuevaFactura.factura.numeroFactura, nuevaFactura.emisor.nif, nuevaId)
  if (mismoNumero) duplicados.push({ facturaId: mismoNumero.id, razon: 'mismo_numero', score: 0.95 })

  // 3. Mismo monto + misma fecha + mismo emisor (tolerancia 0.01)
  const mismoMonto = db.prepare(
    "SELECT id FROM facturas WHERE ABS(total - ?) < 0.01 AND fecha_emision = ? AND emisor_nif = ? AND id != ?"
  ).get(nuevaFactura.factura.total, nuevaFactura.factura.fechaEmision, nuevaFactura.emisor.nif, nuevaId)
  if (mismoMonto) duplicados.push({ facturaId: mismoMonto.id, razon: 'mismo_monto_fecha', score: 0.85 })

  return duplicados
}
```

### 3.3 Archivos a crear/modificar

| Archivo | Accion | Descripcion |
|---|---|---|
| `src/lib/extraction/index.ts` | **MODIFICAR** | Llamar `detectarDuplicados()` despues de insertar |
| `src/db/schema.ts` | **MODIFICAR** | Agregar tabla `duplicados_potenciales` |
| `src/app/api/facturas/[id]/duplicados/route.ts` | **CREAR** | GET: ver duplicados de una factura |
| `src/app/facturas/content.tsx` | **MODIFICAR** | Icono/indicador de duplicado en la tabla |

---

## Fase 4: Tags/Etiquetas

### 4.1 Schema

```sql
-- En tenant.db:
CREATE TABLE IF NOT EXISTS etiquetas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6b7280',     -- hex color
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS factura_etiqueta (
  factura_id INTEGER NOT NULL,
  etiqueta_id INTEGER NOT NULL,
  PRIMARY KEY (factura_id, etiqueta_id),
  FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE,
  FOREIGN KEY (etiqueta_id) REFERENCES etiquetas(id) ON DELETE CASCADE
);
```

### 4.2 Archivos a crear/modificar

| Archivo | Accion | Descripcion |
|---|---|---|
| `src/db/schema.ts` | **MODIFICAR** | Agregar tablas de etiquetas |
| `src/app/api/etiquetas/route.ts` | **CREAR** | CRUD de etiquetas |
| `src/app/api/facturas/[id]/etiquetas/route.ts` | **CREAR** | GET/POST/DELETE etiquetas de una factura |
| `src/app/facturas/content.tsx` | **MODIFICAR** | Filtro por etiqueta, badges de color |
| `src/app/facturas/[id]/page.tsx` | **MODIFICAR** | Agregar/quitar etiquetas |

---

## Fase 5: Busqueda FTS5

### 5.1 Implementacion

```sql
-- En tenant.db, al inicializar schema:
CREATE VIRTUAL TABLE IF NOT EXISTS facturas_fts USING fts5(
  numero_factura, emisor_nombre, receptor_nombre, emisor_nif,
  adjunto_nombre, email_asunto, content='facturas', content_rowid='id'
);

-- Triggers para mantener sincronizado:
CREATE TRIGGER IF NOT EXISTS facturas_ai AFTER INSERT ON facturas BEGIN
  INSERT INTO facturas_fts(rowid, numero_factura, emisor_nombre, receptor_nombre, emisor_nif, adjunto_nombre, email_asunto)
  VALUES (new.id, new.numero_factura, new.emisor_nombre, new.receptor_nombre, new.emisor_nif, new.adjunto_nombre, new.email_asunto);
END;
```

### 5.2 Archivos a crear/modificar

| Archivo | Accion | Descripcion |
|---|---|---|
| `src/db/schema.ts` | **MODIFICAR** | Crear FTS5 table + triggers |
| `src/app/api/facturas/route.ts` | **MODIFICAR** | Usar FTS5 cuando `search` esta presente |
| `src/app/facturas/content.tsx` | **MODIFICAR** | Debounced search con resultados instantaneos |

---

## Fase 6: Graficas y Excel

### 6.1 Dependencias a instalar

```bash
npm install recharts xlsx
```

### 6.2 Graficas (Recharts)

| Grafica | Tipo | Ubicacion |
|---|---|---|
| Gasto mensual | Line chart | `/admin` y `/` (dashboard) |
| Top proveedores | Horizontal bar chart | `/admin` y `/` |
| Distribucion por estado | Pie chart | `/admin` |
| Tendencia de extraccion | Area chart | `/admin` |

### 6.3 Exportacion Excel

| Archivo | Accion | Descripcion |
|---|---|---|
| `src/app/api/facturas/export/route.ts` | **MODIFICAR** | Agregar `?format=xlsx` para exportar Excel |
| `src/app/facturas/content.tsx` | **MODIFICAR** | Boton dropdown: "Exportar CSV" / "Exportar Excel" |

### 6.4 Archivos a crear/modificar

| Archivo | Accion | Descripcion |
|---|---|---|
| `src/app/admin/page.tsx` | **CREAR** | Dashboard admin con graficas |
| `src/app/components/charts/monthly-spending.tsx` | **CREAR** | Componente grafica gasto mensual |
| `src/app/components/charts/top-providers.tsx` | **CREAR** | Componente grafica top proveedores |
| `src/app/components/charts/status-distribution.tsx` | **CREAR** | Componente grafica distribucion por estado |
| `src/app/api/facturas/stats/route.ts` | **MODIFICAR** | Datos para graficas |

---

## Fase 7: Backups Automaticos

### 7.1 Implementacion

Script `scripts/backup.ts`:
```typescript
import Database from "better-sqlite3"
import fs from "fs"
import path from "path"

function backupDb(sourcePath: string, backupDir: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const backupPath = path.join(backupDir, `backup-${timestamp}.db`)

  const source = new Database(sourcePath)
  const backup = new Database(backupPath)
  source.backup(backup)
  backup.close()
  source.close()

  // Mantener ultimos 30 backups
  cleanupOldBackups(backupDir, 30)
}
```

### 7.2 Configuracion

- `.env`: `BACKUP_DIR=./data/backups`, `BACKUP_RETENTION_DAYS=30`
- `scripts/backup.ts`: Se ejecuta via cron o `npm run backup`
- `package.json`: Agregar script `"backup": "tsx scripts/backup.ts"`
- Opcional: `src/app/api/admin/backup/route.ts`: POST para trigger backup manual

### 7.3 Archivos a crear

| Archivo | Accion | Descripcion |
|---|---|---|
| `scripts/backup.ts` | **CREAR** | Script de backup con rotacion |
| `package.json` | **MODIFICAR** | Agregar script `backup` |

---

## Fase 8: Notificaciones por Email

### 8.1 Dependencia

```bash
npm install nodemailer
npm install -D @types/nodemailer
```

### 8.2 Configuracion

`.env`:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-app-password
SMTP_FROM="Facturas Bot <tu-email@gmail.com>"
```

### 8.3 Logica

```typescript
// src/lib/notifications.ts
import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function notifyExtractionErrors(
  adminEmail: string,
  errors: Array<{ filename: string; error: string }>
) { ... }
```

### 8.4 Archivos a crear/modificar

| Archivo | Accion | Descripcion |
|---|---|---|
| `src/lib/notifications.ts` | **CREAR** | Funciones de notificacion por email |
| `src/app/api/extract/route.ts` | **MODIFICAR** | Enviar notificacion al finalizar si hay errores |
| `.env.example` | **MODIFICAR** | Agregar variables SMTP |

---

## Fase 9: API Publica

### 9.1 Schema

```sql
-- En main.db:
CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,          -- primeros 8 chars para identificacion
  negocio_id INTEGER NOT NULL,
  nombre TEXT NOT NULL,
  permisos TEXT DEFAULT 'read',      -- 'read' | 'read,write'
  activa INTEGER DEFAULT 1,
  ultimo_uso TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE
);
```

### 9.2 Endpoints

```
GET    /api/v1/facturas              -> Listar facturas
GET    /api/v1/facturas/:id          -> Detalle de factura
GET    /api/v1/stats                 -> Estadisticas
GET    /api/v1/facturas/export       -> Exportar (CSV/XLSX)
POST   /api/v1/facturas              -> Crear factura (si write)
DELETE /api/v1/facturas/:id          -> Eliminar factura (si write)
```

### 9.3 Autenticacion API

Header: `Authorization: Bearer <api_key>`

El middleware detecta si es `/api/v1/*` y valida la API key en vez de la cookie de sesion.

### 9.4 Archivos a crear

| Archivo | Accion | Descripcion |
|---|---|---|
| `src/lib/api-auth.ts` | **CREAR** | Validacion de API keys |
| `src/app/api/v1/facturas/route.ts` | **CREAR** | API publica de facturas |
| `src/app/api/v1/facturas/[id]/route.ts` | **CREAR** | API publica detalle |
| `src/app/api/v1/stats/route.ts` | **CREAR** | API publica stats |
| `src/app/api/admin/api-keys/route.ts` | **CREAR** | CRUD de API keys (admin) |
| `src/app/admin/api-keys/page.tsx` | **CREAR** | UI para gestionar API keys |
| `src/db/index.ts` | **MODIFICAR** | Schema de api_keys |

---

## Orden de implementacion

```
Fase 1 (Auth + Permisos)          <- BASE, todo depende de esto
  ├── 1.1 Schema usuarios
  ├── 1.2 lib/auth.ts
  ├── 1.3 middleware.ts
  ├── 1.4 Login page + API
  ├── 1.5 Admin page
  └── 1.6 Migrar todas las rutas

Fase 2 (Confianza + Revision)     <- Independiente, puede paralelizar con 3
  ├── 2.1 Schema confianza
  ├── 2.2 Logica scoring
  └── 2.3 UI confianza + revision

Fase 3 (Duplicados)               <- Independiente
  ├── 3.1 Schema duplicados
  ├── 3.2 Logica deteccion
  └── 3.3 UI indicadores

Fase 4 (Tags)                     <- Independiente
  ├── 4.1 Schema tags
  ├── 4.2 API tags
  └── 4.3 UI tags

Fase 5 (FTS5 Busqueda)            <- Independiente
  ├── 5.1 Schema FTS5
  ├── 5.2 API con FTS5
  └── 5.3 UI busqueda instantanea

Fase 6 (Graficas + Excel)         <- Despues de Fase 2 (necesita stats)
  ├── 6.1 Instalar recharts + xlsx
  ├── 6.2 Componentes graficas
  ├── 6.3 Admin dashboard
  └── 6.4 Exportacion Excel

Fase 7 (Backups)                  <- Independiente
  ├── 7.1 Script backup
  └── 7.2 npm script

Fase 8 (Notificaciones)           <- Despues de Fase 1 (necesita admin email)
  ├── 8.1 Config SMTP
  ├── 8.2 lib/notifications.ts
  └── 8.3 Integrar en extraction

Fase 9 (API Publica)              <- Despues de Fase 1 (necesita auth)
  ├── 9.1 Schema api_keys
  ├── 9.2 lib/api-auth.ts
  ├── 9.3 Endpoints v1
  └── 9.4 Admin UI api-keys
```

---

## Estimacion de archivos nuevos/modificados

| Tipo | Cantidad |
|---|---|
| Archivos nuevos | ~25 |
| Archivos modificados | ~15 |
| Dependencias nuevas | `bcrypt`, `@types/bcrypt`, `recharts`, `xlsx`, `nodemailer`, `@types/nodemailer` |
| Tests a agregar | Auth (login/logout/permisos), confianza, duplicados, tags, API publica |

---

## Riesgos y mitigaciones

| Riesgo | Mitigacion |
|---|---|
| FTS5 puede no estar compilado en better-sqlite3 | Verificar con `db.prepare("SELECT * FROM sqlite_master WHERE type='table' AND name='facturas_fts'")`. Fallback a LIKE con indices. |
| Backups pueden causar locks en WAL | Usar `VACUUM INTO` o la API `.backup()` de better-sqlite3 que es non-blocking |
| bcrypt es nativo (C++) | Ya usamos better-sqlite3 que tambien es nativo. Si hay problemas de compilacion, fallback a `crypto.scrypt` con salt |
| Muchas migraciones de schema | Usar `ALTER TABLE ... ADD COLUMN` con `IF NOT EXISTS` (SQLite 3.25+). Verificar version. |
