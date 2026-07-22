---
description: Backend development standards, best practices, and conventions for the Facturas Next.js application including API routes, SQLite database patterns, multi-tenant architecture, and testing practices
globs: ["src/**/*.ts", "src/**/*.tsx", "__tests__/**/*.ts"]
alwaysApply: true
---

# Backend Standards and Best Practices

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [API Routes (Next.js App Router)](#api-routes-nextjs-app-router)
- [Database Patterns (SQLite)](#database-patterns-sqlite)
- [Multi-Tenant Architecture](#multi-tenant-architecture)
- [Authentication & Authorization](#authentication--authorization)
- [Coding Standards](#coding-standards)
- [Testing Standards](#testing-standards)
- [Performance Best Practices](#performance-best-practices)
- [Security Best Practices](#security-best-practices)

---

## Overview

This document outlines the standards for the Facturas backend. The application is a **Next.js monolith** using the App Router, with SQLite (better-sqlite3) as the database, multi-tenant architecture, and server-side rendering.

## Technology Stack

- **Runtime**: Node.js (>=18)
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: SQLite via better-sqlite3
- **ORM**: None (raw SQL with better-sqlite3)
- **Testing**: Vitest + @testing-library/react
- **Linting**: ESLint (eslint-config-next)
- **Email Extraction**: Gmail API (googleapis) + XML/PDF parsing
- **Excel Export**: xlsx (SheetJS)
- **Charts**: Recharts
- **Auth**: bcrypt + httpOnly cookies
- **Deployment**: Railway

## Project Structure

```
src/
├── app/
│   ├── api/                    # Next.js API routes (App Router)
│   │   ├── auth/               # Auth endpoints (login, register, logout, callback)
│   │   ├── facturas/           # Invoice CRUD + stats + export + sub-resources
│   │   ├── etiquetas/          # Tags CRUD
│   │   ├── extract/            # Gmail extraction trigger
│   │   ├── emails/             # Gmail email listing
│   │   ├── negocios/           # Business management
│   │   ├── v1/                 # Public API (key-authenticated)
│   │   └── admin/              # Admin endpoints (users, backup, api-keys)
│   ├── (pages)/                # Server-rendered pages
│   │   ├── login/
│   │   ├── facturas/
│   │   ├── empresa/
│   │   ├── configuracion/
│   │   ├── cuenta/
│   │   └── admin/
│   └── components/             # Shared React components
├── lib/
│   ├── auth.ts                 # Authentication logic (bcrypt, sessions, cookies)
│   ├── tenant.ts               # Multi-tenant helpers (getActiveTenant, requireAuth)
│   ├── api-auth.ts             # API key authentication
│   ├── gmail.ts                # Gmail API integration
│   ├── notifications.ts        # Email notification (Nodemailer)
│   ├── currency.ts             # Currency conversion utilities
│   ├── types.ts                # Shared TypeScript types
│   └── extraction/             # Invoice extraction pipeline
│       ├── index.ts            # Main extraction logic + confidence scoring + duplicate detection
│       ├── types.ts            # Extraction-specific types
│       ├── xml-parser.ts       # Spanish XML invoice parser
│       └── pdf-parser.ts       # PDF invoice parser
├── db/
│   ├── schema.ts               # Tenant database schema (facturas, lineas, etc.)
│   └── index.ts                # Database initialization + tenant DB management + CRUD
├── types/                      # TypeScript declaration files
│   ├── pdf-parse.d.ts
│   └── fast-xml-parser.d.ts
├── proxy.ts                    # Next.js middleware (route protection)
└── layout.tsx                  # Root layout
__tests__/                      # Test files
├── setup.ts                    # Test setup
└── **/*.test.ts                # Test files
scripts/
├── setup-admin.ts              # Initial admin user creation
└── backup.ts                   # Database backup script
data/                           # Runtime data (gitignored)
├── main.db                     # Main database
├── negocios/{slug}/facturas.db # Per-tenant databases
└── backups/                    # Backup files
openspec/                       # OpenSpec change management
```

## API Routes (Next.js App Router)

### Route Conventions

- All API routes live under `src/app/api/`
- Each route file exports named functions: `GET`, `POST`, `PATCH`, `PUT`, `DELETE`
- Route handlers receive `(request: Request, context: { params: Promise<...> })`
- Use `NextResponse.json()` for JSON responses
- Use `NextResponse.redirect()` for redirects

### Route Handler Pattern

```typescript
import { NextResponse } from "next/server"
import { requireActiveTenant } from "@/lib/tenant"

export async function GET(request: Request) {
  try {
    const { db } = await requireActiveTenant()
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const page = parseInt(searchParams.get("page") || "1")

    // Database queries
    const result = db.prepare("SELECT * FROM facturas LIMIT ? OFFSET ?").all(limit, offset)

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error("Error description:", error)
    if (error instanceof Error && error.message === "No hay negocio seleccionado") {
      return NextResponse.json({ error: "No hay negocio seleccionado" }, { status: 401 })
    }
    return NextResponse.json({ error: "Error message" }, { status: 500 })
  }
}
```

### Error Handling Pattern

- Always wrap route handlers in try/catch
- Check for specific error messages (`"No hay negocio seleccionado"`, `"No autenticado"`)
- Return appropriate HTTP status codes:
  - 200: Success
  - 201: Created
  - 400: Bad request / validation error
  - 401: Authentication required
  - 403: Authorization denied
  - 404: Resource not found
  - 409: Conflict (duplicate)
  - 500: Internal server error
- Log errors with `console.error()` including context

### Dynamic Route Segments

- Use `[id]` for dynamic segments: `src/app/api/facturas/[id]/route.ts`
- Access params via: `{ params }: { params: Promise<{ id: string }> }`
- Always `await params` before using

### Response Format

```typescript
// Success
{ "data": { ... } }
{ "facturas": [...], "pagination": { ... } }

// Error
{ "error": "Error message" }
```

## Database Patterns (SQLite)

### Schema Management

- Tenant schema lives in `src/db/schema.ts` - `initializeSchema(db)`
- Main schema lives in `src/db/index.ts` - `initializeMainSchema(db)`
- Use `CREATE TABLE IF NOT EXISTS` for idempotent initialization
- Use `ALTER TABLE ... ADD COLUMN` with existence checks for migrations:

```typescript
const columns = db.prepare("PRAGMA table_info(facturas)").all() as Array<{ name: string }>
const columnNames = columns.map((c) => c.name)
if (!columnNames.includes("new_column")) {
  db.exec("ALTER TABLE facturas ADD COLUMN new_column TYPE DEFAULT value")
}
```

### Query Patterns

```typescript
// Select single row
const factura = db.prepare("SELECT * FROM facturas WHERE id = ?").get(id) as Factura | undefined

// Select multiple rows
const facturas = db.prepare("SELECT * FROM facturas WHERE estado = ?").all(estado) as Factura[]

// Insert with parameters (named)
const result = db.prepare(`
  INSERT INTO facturas (emisor_nombre, total) VALUES (@emisor_nombre, @total)
`).run({ emisor_nombre: "Acme", total: 100 })

// Get last insert ID
const newId = result.lastInsertRowid as number

// Update
db.prepare("UPDATE facturas SET estado = ? WHERE id = ?").run("pagada", id)

// Delete
db.prepare("DELETE FROM facturas WHERE id = ?").run(id)

// Transactions
const insertAll = db.transaction(() => {
  const id = insertFactura(...)
  insertLineas(id, ...)
  return id
})
const facturaId = insertAll()
```

### Indexes

- Add indexes for frequently queried columns
- Use `CREATE INDEX IF NOT EXISTS` for idempotency
- Index foreign keys and columns used in WHERE clauses

### Connection Management

- Main DB: Singleton via `getMainDb()`, WAL mode, foreign keys ON
- Tenant DB: Cached in Map via `getTenantDb(slug)`, WAL mode, foreign keys ON
- Never close tenant DBs during normal operation (cached for performance)

## Multi-Tenant Architecture

### Tenant Isolation

- Each negocio has its own SQLite database at `data/negocios/{slug}/facturas.db`
- Tenant is resolved from `negocio_slug` cookie
- Use `requireActiveTenant()` to get authenticated tenant context:

```typescript
const { negocio, db, user } = await requireActiveTenant()
// db is the tenant-specific database instance
// user is the authenticated user
// negocio is the business entity
```

### Tenant Selection

- Users select their active negocio via `POST /api/negocios/{slug}/select`
- Admin users can switch between any negocio
- Business users can only access their assigned negocio

### Database Isolation

- Each tenant DB has its own schema (facturas, lineas, adjuntos, etc.)
- No cross-tenant queries are possible
- Main DB only contains shared entities (negocios, usuarios, sesiones, api_keys)

## Authentication & Authorization

### Session-Based Auth

- Passwords hashed with bcrypt (12 rounds)
- Sessions stored in `sesiones` table with 30-day expiry
- Session ID stored in httpOnly cookie (`session_id`)
- Middleware in `proxy.ts` protects all routes except public paths

### Role-Based Access

- **admin**: Full access to all negocios and admin endpoints
- **negocio**: Access only to their assigned negocio's data

```typescript
// Require any authenticated user
const user = await requireAuth()

// Require admin
const admin = await requireAdmin()

// Require active tenant (user + negocio)
const { negocio, db, user } = await requireActiveTenant()
```

### API Key Auth

- API keys stored hashed in `api_keys` table
- Used for `/api/v1/*` public endpoints
- Header: `Authorization: Bearer <api_key>`
- Keys have permission levels: `read` or `read,write`
- Scoped to a specific negocio

## Coding Standards

### Naming Conventions

- **Variables/Functions**: camelCase (`facturaId`, `getFacturaById`)
- **Types/Interfaces**: PascalCase (`Factura`, `Usuario`, `LineaFactura`)
- **Constants**: UPPER_SNAKE_CASE (`SESSION_COOKIE`, `MAX_RESULTS`)
- **Files**: camelCase (`tenant.ts`, `xml-parser.ts`)
- **SQL columns**: snake_case (`numero_factura`, `fecha_emision`)
- **All code and comments in English**

### TypeScript Usage

- Strict mode enabled
- Use explicit types for function parameters and return values
- Define interfaces for data structures
- Avoid `any` - use `unknown` or specific types
- Use type assertions sparingly and with justification

```typescript
// Good
function getFacturaById(id: number): Factura | undefined {
  return db.prepare("SELECT * FROM facturas WHERE id = ?").get(id) as Factura | undefined
}

// Avoid
function getFacturaById(id: any): any {
  return db.prepare("SELECT * FROM facturas WHERE id = ?").get(id)
}
```

### Error Handling

- Use try/catch in all async operations
- Log errors with context (`console.error("Description:", error)`)
- Return user-friendly error messages in responses
- Check specific error messages for known failure modes

```typescript
try {
  const result = await riskyOperation()
  return NextResponse.json(result)
} catch (error) {
  console.error("Failed to process invoice:", error)
  if (error instanceof Error && error.message === "Known error") {
    return NextResponse.json({ error: "Specific message" }, { status: 400 })
  }
  return NextResponse.json({ error: "Internal error" }, { status: 500 })
}
```

### Logging

- Use `console.error()` for errors (captured by Next.js)
- Use `console.warn()` for non-critical warnings
- Include context in log messages: what was being done, what failed
- Never log sensitive data (passwords, session tokens, API keys)

## Testing Standards

### Framework

- **Vitest** as test runner
- **@testing-library/react** for component tests
- **@testing-library/jest-dom** for DOM assertions
- Test files in `__tests__/` directory
- File naming: `*.test.ts` or `*.test.tsx`

### Test Configuration

```typescript
// vitest.config.mts
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./__tests__/setup.ts"],
    include: ["__tests__/**/*.test.ts"],
  },
})
```

### Test Organization

```typescript
describe("ComponentName - methodName", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("should_[expected_behavior]_when_[condition]", () => {
    it("should [specific test case]", async () => {
      // Arrange
      // Act
      // Assert
    })
  })
})
```

### Test Patterns

- **AAA Pattern**: Arrange-Act-Assert
- **Mock all external dependencies** (database, file system, external APIs)
- **Test both success and error paths**
- **Test edge cases**: null values, empty arrays, boundary values
- **Use descriptive test names** that explain the scenario

### Running Tests

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npx vitest run --coverage  # With coverage
```

### Coverage Requirements

- Generate coverage reports with date stamp: `YYYYMMDD-backend-coverage.md`
- Target: meaningful coverage of critical paths

## Performance Best Practices

### Database Queries

- Use indexes for frequently queried columns
- Use `SELECT` specific columns instead of `SELECT *` when only needing a few fields
- Use Prisma-style `include` equivalent: join queries for related data
- Avoid N+1 queries - fetch related data in single queries when possible

```typescript
// Good: Single query with JOIN
const facturas = db.prepare(`
  SELECT f.*, GROUP_CONCAT(e.nombre) as etiquetas
  FROM facturas f
  LEFT JOIN factura_etiqueta fe ON fe.factura_id = f.id
  LEFT JOIN etiquetas e ON e.id = fe.etiqueta_id
  GROUP BY f.id
`).all()

// Avoid: N+1 queries
const facturas = db.prepare("SELECT * FROM facturas").all()
for (const f of facturas) {
  f.etiquetas = db.prepare("SELECT e.* FROM etiquetas e JOIN factura_etiqueta fe...").all(f.id)
}
```

### Currency Conversion

- Convert currencies at the query level when possible
- Cache conversion rates if needed
- Always round to 2 decimal places: `Math.round(value * 100) / 100`

### FTS5 Search

- Use FTS5 when available for full-text search
- Fallback to LIKE queries when FTS5 is not compiled
- Use `MATCH` operator with `*` suffix for prefix matching

```typescript
const ftsExists = db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' AND name='facturas_fts'"
).get()

if (ftsExists) {
  const results = db.prepare(
    "SELECT rowid FROM facturas_fts WHERE facturas_fts MATCH ?"
  ).all(`${search}*`)
} else {
  // Fallback to LIKE
  const results = db.prepare(
    "SELECT id FROM facturas WHERE numero_factura LIKE ?"
  ).all(`%${search}%`)
}
```

## Security Best Practices

### Input Validation

- Validate all input at the API route level
- Check required fields before processing
- Validate enum values (estado, role, etc.)
- Sanitize strings to prevent SQL injection (use parameterized queries)

### Authentication

- Never commit `.env` files or secrets
- Use bcrypt for password hashing (12 rounds minimum)
- Use httpOnly cookies for session tokens
- Set SameSite=Lax on cookies
- Implement session expiry (30 days)

### SQL Injection Prevention

- **Always use parameterized queries** - never interpolate user input into SQL
- Use named parameters for complex inserts: `@param_name`
- Use positional parameters for simple queries: `?`

```typescript
// Good: Parameterized query
db.prepare("SELECT * FROM facturas WHERE id = ?").get(userId)

// DANGEROUS: Never do this
db.prepare(`SELECT * FROM facturas WHERE id = ${userId}`).get()
```

### Multi-Tenant Security

- Always use `requireActiveTenant()` to ensure tenant isolation
- Never query across tenant databases
- Validate that the user belongs to the requested negocio
- Admin users must still select a active negocio for tenant operations

### Environment Variables

Required variables:
```
GOOGLE_CLIENT_ID       # Gmail OAuth2
GOOGLE_CLIENT_SECRET   # Gmail OAuth2
GOOGLE_REDIRECT_URI    # OAuth2 callback URL
SMTP_HOST              # Email notifications
SMTP_PORT              # Email notifications
SMTP_USER              # Email notifications
SMTP_PASS              # Email notifications
BACKUP_DIR             # Backup directory
BACKUP_RETENTION_DAYS  # Backup retention
```

## Development Workflow

### Verification Checklist

Before marking a task complete, verify:

1. ✅ ESLint passes with zero warnings
2. ✅ TypeScript compiles without errors
3. ✅ All tests pass
4. ✅ API endpoints work as specified in `api-spec.yml`
5. ✅ Multi-tenant isolation maintained (no cross-tenant queries)
6. ✅ Input validation present on all endpoints
7. ✅ Error messages are user-friendly

### Git Workflow

- Feature branches from main
- Descriptive commit messages in English
- Small, focused branches
- Code review before merging

### Development Scripts

```bash
npm run dev            # Development server
npm run build          # Production build
npm start              # Production start
npm run lint           # ESLint
npm test               # Run tests
npm run test:watch     # Tests in watch mode
npm run setup-admin    # Create initial admin user
npm run backup         # Run database backup
```

### Code Quality

- Run ESLint before commits
- Ensure TypeScript compiles without errors
- All tests must pass before merging
- Update documentation when changing APIs or data model

### Extraction Pipeline Debugging

Common issues and fixes:

| Problem | Likely Cause | Fix |
|---------|--------------|-----|
| Low confidence scores | OCR quality issues | Check `confianza_score` in DB, adjust thresholds |
| Duplicates not detected | Fuzzy matching too strict | Check `similitud_duplicados` in config |
| FTS5 not working | SQLite compiled without FTS5 | Fallback to LIKE queries (see code) |
| PDF parse fails | pdf-parse library issues | Check `pdf-parse` version, try reprocessing |

### Multi-Tenant Debugging

- Check `negocio_slug` cookie is set correctly
- Verify `requireActiveTenant()` returns valid tenant
- Check tenant DB exists at `data/negocios/{slug}/facturas.db`
- Main DB stores shared entities (negocios, usuarios, sesiones)
- Tenant DB stores invoice-specific tables (facturas, lineas, adjuntos, etiquetas)
