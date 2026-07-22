# Development Guide

This guide provides step-by-step instructions for setting up the development environment, running the Facturas invoice management system, and executing tests.

## Prerequisites

Ensure you have the following installed:
- **Node.js** (v18 or higher)
- **npm** (v8 or higher)
- **Git**

No Docker or external database required - the project uses SQLite (better-sqlite3) which is embedded.

## 1. Clone the Repository

```bash
git clone <repository-url>
cd facturas
```

## 2. Install Dependencies

```bash
npm install
```

This installs all dependencies including native modules (better-sqlite3, bcrypt).

## 3. Environment Configuration

Create a `.env` file in the project root:

```env
# Google OAuth (for Gmail invoice extraction)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback

# SMTP (for email notifications - Fase 8)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Facturas Bot <your-email@gmail.com>"

# Backups (Fase 7)
BACKUP_DIR=./data/backups
BACKUP_RETENTION_DAYS=30
```

See `.env.example` for reference.

## 4. Create Initial Admin User

```bash
npx tsx scripts/setup-admin.ts admin@yourdomain.com yourpassword
```

This creates the first admin user in the main database (`data/main.db`).

## 5. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### First Time Setup

1. Navigate to `http://localhost:3000/login`
2. Log in with the admin credentials you created
3. Create your first business (negocio) from the admin panel or API
4. Select the business using the negocio selector
5. Connect Gmail for invoice extraction (optional)

## 6. Project Architecture

### Database Structure

The project uses a **multi-tenant SQLite architecture**:

```
data/
├── main.db                          # Shared database
│   ├── negocios                     # Business tenants
│   ├── usuarios                     # Users
│   ├── sesiones                     # Active sessions
│   └── api_keys                     # API keys for public API
└── negocios/
    └── {slug}/
        └── facturas.db              # Per-business database
            ├── facturas             # Invoices
            ├── lineas_factura       # Invoice line items
            ├── adjuntos             # File attachments
            ├── duplicados_potenciales # Detected duplicates
            ├── etiquetas            # Tags
            ├── factura_etiqueta     # Invoice-tag junction
            ├── facturas_fts         # Full-text search (FTS5)
            └── procesamiento_log    # Extraction logs
```

### Key Directories

| Directory | Purpose |
|---|---|
| `src/app/api/` | Next.js API routes (App Router) |
| `src/app/` | Pages and components |
| `src/lib/` | Business logic (auth, extraction, notifications) |
| `src/db/` | Database schema and management |
| `__tests__/` | Test files |
| `scripts/` | Utility scripts (setup-admin, backup) |
| `openspec/` | Change management artifacts |

## 7. Available Scripts

```bash
# Development
npm run dev              # Start development server with hot reload
npm run build            # Build for production
npm start                # Start production server

# Testing
npm test                 # Run all tests (Vitest)
npm run test:watch       # Run tests in watch mode

# Code Quality
npm run lint             # Run ESLint

# Utilities
npm run setup-admin      # Create initial admin user
npm run backup           # Run database backup
```

## 8. Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage
npx vitest run --coverage
```

### Test Structure

```
__tests__/
├── setup.ts                    # Test setup and global mocks
└── **/*.test.ts                # Test files (colocated by feature)
```

### Writing Tests

Tests use **Vitest** with `@testing-library/react` for component tests:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest"

describe("Feature - method", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should do something when condition", () => {
    // Arrange
    const input = { ... }

    // Act
    const result = doSomething(input)

    // Assert
    expect(result).toBe(expected)
  })
})
```

### Test Coverage

Generate coverage reports:
```bash
npx vitest run --coverage
```

Coverage reports should be saved with date stamps: `YYYYMMDD-coverage.md`

## 9. API Endpoints Reference

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login with email/password |
| POST | `/api/auth/register` | Register new user (admin) |
| POST | `/api/auth/logout` | Logout and clear session |
| GET | `/api/auth/callback` | Google OAuth callback |

### Invoices
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/facturas` | List invoices (paginated, filtered) |
| GET | `/api/facturas/:id` | Get invoice detail |
| PATCH | `/api/facturas/:id` | Update invoice (estado) |
| GET | `/api/facturas/stats` | Dashboard statistics |
| GET | `/api/facturas/export` | Export CSV/XLSX |
| GET | `/api/facturas/:id/adjunto` | Download attachment |
| PUT | `/api/facturas/:id/revision` | Toggle revision status |
| GET | `/api/facturas/:id/duplicados` | Get potential duplicates |
| GET/POST/DELETE | `/api/facturas/:id/etiquetas` | Manage invoice tags |

### Tags
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/etiquetas` | List all tags |
| POST | `/api/etiquetas` | Create tag |
| DELETE | `/api/etiquetas?id=` | Delete tag |

### Extraction
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/extract` | Extract invoices from Gmail |
| GET | `/api/emails` | List Gmail emails |

### Business Management
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/negocios` | List businesses |
| POST | `/api/negocios` | Create business (admin) |
| PATCH | `/api/negocios/:slug` | Update business settings |
| POST | `/api/negocios/:slug/select` | Select active business |

### Admin
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/admin/usuarios` | Manage users |
| POST | `/api/admin/backup` | Trigger backup |
| GET/POST | `/api/admin/api-keys` | Manage API keys |

### Public API (API Key Auth)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/facturas` | List invoices |
| GET | `/api/v1/facturas/:id` | Get invoice detail |
| GET | `/api/v1/facturas/export` | Export invoices |
| GET | `/api/v1/stats` | Get statistics |

## 10. Multi-Tenant Workflow

1. **Admin creates a business**: `POST /api/negocios` with `{ nombre: "My Business" }`
2. **User is assigned to business**: User's `negocio_id` is set
3. **User selects business**: `POST /api/negocios/{slug}/select` sets the `negocio_slug` cookie
4. **All subsequent requests**: Use the selected business's isolated database
5. **Admin can switch**: Admin users can select any business

## 11. Invoice Extraction Workflow

1. **Connect Gmail**: User authenticates via Google OAuth (`/api/auth/callback`)
2. **Trigger extraction**: `POST /api/extract` scans recent emails for PDF/XML attachments
3. **Parse invoices**: XML invoices parsed with `fast-xml-parser`, PDF with `pdf-parse`
4. **Confidence scoring**: Each invoice gets a score (0.0-1.0) based on data completeness
5. **Duplicate detection**: System checks for matching invoice numbers, amounts, or content hashes
6. **Store in database**: Invoice data, line items, and attachments stored in tenant database
7. **Notification**: Admin notified via email if errors occurred during extraction

## 12. Deployment

### Railway

The project is configured for Railway deployment:

```json
{
  "build": { "builder": "NIXPACKS" },
  "deploy": {
    "startCommand": "npx next start -p ${PORT:-3000}",
    "healthcheckPath": "/login",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

### Environment Variables for Production

Set the following in Railway:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (production URL)
- `SMTP_*` variables for notifications
- `BACKUP_DIR` and `BACKUP_RETENTION_DAYS`

### Database Persistence

SQLite databases are stored in `data/`. For Railway:
- Ensure the `data/` directory is persistent (Railway volumes)
- Or use the backup system to persist data externally

## 13. Troubleshooting

### Common Issues

| Issue | Solution |
|---|---|
| `better-sqlite3` compilation error | Ensure Node.js >= 18 and build tools are installed |
| `bcrypt` compilation error | Install build essentials: `apt-get install build-essential` |
| FTS5 not available | System SQLite may not have FTS5 compiled. Fallback to LIKE queries works automatically. |
| Gmail token expired | Re-authenticate via Google OAuth flow |
| Port 3000 in use | Set `PORT` environment variable or use `--port` flag |
| Tenant DB not found | Check `negocio_slug` cookie is set. Verify `data/negocios/{slug}/facturas.db` exists |
| Extraction fails silently | Check `procesamiento_log` table. Verify Gmail OAuth token not expired |
| Confidence scores too low | Review extraction logic in `src/lib/extraction/index.ts`. Check data completeness |

### Multi-Tenant Debugging

1. **Check cookie**: `negocio_slug` must be set correctly
2. **Check tenant**: `requireActiveTenant()` returns `{ negocio, db, user }`
3. **Check DB path**: `data/negocios/{slug}/facturas.db`
4. **Check isolation**: Never query across tenant databases

### Extraction Debugging

1. **Check logs**: Query `procesamiento_log` table
2. **Check attachments**: Verify PDF/XML parsing in `src/lib/extraction/`
3. **Check confidence**: Review scoring logic in `src/lib/extraction/index.ts`
4. **Check duplicates**: Verify duplicate detection in `src/lib/extraction/index.ts`

## 14. Effective AI Workflow

### Context Management

- **Fresh session for each task**: Use `/clear` between unrelated tasks
- **Keep docs lean**: Update docs if >500 lines, remove stale info
- **Reference, don't inline**: Link to code instead of duplicating

### Planning Before Coding

1. **Explore first**: Read existing patterns before writing new code
2. **Write todo list**: Break work into verifiable steps
3. **Identify gates**: Specify what "done" looks like
4. **Verify incrementally**: Don't wait until end to test

### Verification Gates

After each code change:

```bash
npx eslint src/ --max-warnings 0   # Lint
npx tsc --noEmit                   # Type check
npm test                           # Tests
```

Gate fails → fix → re-verify. Don't proceed until gate passes.

### Adversarial Review

Before finalizing, check:
- Edge cases covered?
- Tests sufficient?
- Docs updated?
- Security issues? (SQL injection, auth bypass, tenant isolation)
