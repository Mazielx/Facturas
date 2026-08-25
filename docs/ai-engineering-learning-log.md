# AI Engineering Learning Log

Personal learning journal documenting my journey to become an AI-assisted development engineer.

## How to Use This Log

- **Update after each learning session** (5-10 minutes)
- **Focus on process, not just results**
- **Include mistakes and lessons learned**
- **Keep entries concise but useful**

---

## Current Skill Level (Baseline)

**Technical Skills:**
- Next.js 16 (App Router)
- TypeScript (strict mode)
- SQLite (better-sqlite3)
- Multi-tenant architecture
- Gmail API integration
- PDF/XML parsing
- Authentication (bcrypt + cookies)

**AI Skills:**
- Basic prompt usage
- Opencode workflow
- Documentation creation

**Date:** 2024-01-XX

---

## Learning Entries

### Entry 001: Documentation-Driven Development

**Date:** 2024-01-XX
**Topic:** Rewriting docs for a real project
**Time spent:** ~2 hours

**What I learned:**
- Documentation from different projects can be misleading
- Need to understand the actual system before writing docs
- OpenSpec config needs project-specific context

**The process:**
1. Started with docs from another project (LTI)
2. Realized they didn't match the actual facturas system
3. Rewrote each doc based on real codebase
4. Added verification gates and workflow patterns

**Mistakes I made:**
- Initially tried to fix wrong docs instead of rewriting
- Didn't read the actual codebase first

**Key insight:**
> "Documentation is only useful if it matches reality. Wrong docs are worse than no docs."

**Confidence level:** Can repeat this process

---

### Entry 002: AI Workflow Patterns

**Date:** 2024-01-XX
**Topic:** Exploring Claude Code best practices
**Time spent:** ~1 hour

**What I learned:**
- Verification gates (lint/typecheck/test) must happen after each change
- Explore → Plan → Code workflow prevents rework
- Context management matters (fresh sessions for different tasks)
- Adversarial review catches edge cases

**The process:**
1. Read Claude Code best practices article
2. Extracted key patterns
3. Applied to my docs (base-standards, backend-standards, etc.)
4. Created structured workflow sections

**Mistakes I made:**
- Initially skipped the explore phase
- Didn't have clear verification steps

**Key insight:**
> "Speed without quality is waste. Verification gates slow you down but prevent bigger slowdowns later."

**Confidence level:** Can explain and apply

---

### Entry 003: Portfolio Documentation System

**Date:** 2024-01-XX
**Topic:** Creating learning documentation system
**Time spent:** ~30 minutes

**What I learned:**
- Documentation should capture process, not just results
- Learning logs help explain "how" you did things
- Portfolio needs case studies with before/after comparisons
- Quick reference cards are more useful than long docs

**The process:**
1. Created learning log template with entry structure
2. Built prompt engineering quick reference card
3. Designed portfolio template for showcasing skills
4. Added auto-update rules to AGENTS.md

**Mistakes I made:**
- Initially thought about uploading to GitHub immediately
- Didn't consider that documentation should grow with learning

**Key insight:**
> "The value is in the process documentation, not just the final code. Recruiters want to see how you think, not just what you built."

**Confidence level:** Can explain and apply

---

### Entry 004: Auto-Update Documentation System

**Date:** 2024-01-XX
**Topic:** Adding auto-update rules to global config
**Time spent:** ~10 minutes

**What I learned:**
- AGENTS.md is auto-loaded by opencode
- Rules in AGENTS.md apply to all sessions
- Documentation should update automatically when learning occurs
- Focus on meaningful learning, not routine tasks

**The process:**
1. Read current AGENTS.md structure
2. Added auto-update rules for learning documentation
3. Defined when and what to update
4. Set quality standards for entries

**Mistakes I made:**
- Initially thought about updating after every interaction
- Realized should only update when meaningful learning occurred

**Key insight:**
> "Auto-update rules make documentation sustainable. Without them, docs become stale and useless."

**Confidence level:** Can explain and apply

---

### Entry 005: Confidence Scoring for Business UX

**Date:** 2026-07-22
**Topic:** Adjusting invoice confidence thresholds for business users
**Time spent:** ~15 minutes

**What I learned:**
- Technical accuracy != business value. A confidence system that marks 60% invoices as "low" is technically correct but commercially harmful
- Thresholds need to match user expectations, not just mathematical purity
- The scoring formula matters less than the label boundaries
- PDF invoices start at a lower base score (0.85) vs XML (1.0) because extraction is less reliable

**The process:**
1. User reported most invoices showing "baja" confidence
2. Analyzed the scoring formula: penalties were too aggressive (-0.15 for missing NIF, -0.20 for missing date, etc.)
3. Reduced penalties for non-critical fields (address removed entirely, NIF reduced to -0.05)
4. Changed IVA/total mismatch tolerance from $0.01 to $1.00
5. Adjusted thresholds: baja 0-33%, media 33-66%, alta 66-88%, confiable 88%+

**Mistakes I made:**
- Initial thresholds (alta >= 0.85) were too strict for real-world CFDI invoices
- Forgot to recalculate existing invoices in the database after changing thresholds — old "baja" labels persisted

**Key insight:**
> "Confidence labels are a UX decision, not just a math problem. The thresholds should reflect what 'good enough' means for the business, not what's statistically perfect."

**Confidence level:** Can apply to any scoring/classification system

---

### Entry 006: Toggle UI Pattern for Settings Pages

**Date:** 2026-07-22
**Topic:** Replacing always-visible forms with button-toggle sections
**Time spent:** ~30 minutes

**What I learned:**
- For settings with infrequent changes (email, password, phone), hiding inputs behind buttons reduces cognitive load
- Each action should have its own toggle state and save/cancel flow
- The pattern: "Show current value + button" -> click -> "Show input + save/cancel"
- User explicitly requested this for both Mi Cuenta and Mi Empresa pages

**The process:**
1. Started with always-visible forms (email, password fields visible on page load)
2. User requested: "the password option shouldn't show inputs from the start, only after pressing the button"
3. Applied same pattern to email change, phone addition
4. Each section became independent: own state, own save handler, own cancel

**Mistakes I made:**
- Initially combined email change into the profile save handler — had to separate into dedicated endpoints
- Forgot to add telefono column to DB and Usuario interface — caused TypeScript build errors

**Key insight:**
> "For settings that change rarely, progressive disclosure beats information density. Users don't need to see every input — they need to see every option."

**Confidence level:** Can apply to any settings/configuration UI

---

### Entry 007: HTTPS Cookie Handling and Deployment Debugging

**Date:** 2026-07-22
**Topic:** Fixing authentication failures on Railway (HTTPS) deployment
**Time spent:** ~45 minutes

**What I learned:**
- `document.cookie` without `SameSite` and `Secure` flags can fail silently on HTTPS
- OAuth callbacks should use `Set-Cookie` headers instead of `document.cookie` via `<script>` tags
- Next.js SSR can hide client components from the HTML if gated behind client-only state
- The `mounted` pattern (useState false -> useEffect true) hides content during SSR — bad for critical UI like login/register toggle
- Railway's free tier has ephemeral filesystem — SQLite databases are wiped on every restart/deploy
- CDN caching (`s-maxage=31536000`) can serve stale builds even after a successful deploy

**The process:**
1. User reported login failures on Railway deployment
2. Discovered cookies were set without SameSite/Secure — some browsers rejected them
3. Created shared `cookie-utils.ts` with auto-detection of HTTPS
4. Converted OAuth callback from `<script>document.cookie=...</script>` to proper `NextResponse.redirect` with `Set-Cookie` headers
5. Discovered register link missing from SSR — was gated behind `mounted` state
6. Removed `mounted` gate from register toggle — now renders in SSR based on `mode` state
7. Pushed to GitHub — Railway deploy was slow due to CDN cache

**Mistakes I made:**
- First fix used `mounted` state to gate the register toggle — this hid it during SSR, making it invisible until JavaScript hydrated
- Forgot that OAuth callback was using raw `<script>` tags to set cookies — these don't get `Secure`/`SameSite` flags
- Didn't realize Railway's `s-maxage=31536000` cache would serve old builds for a long time

**Key insight:**
> "Deployment debugging requires thinking in layers: code correctness, build artifacts, CDN caching, cookie mechanics, and browser security policies. The bug is rarely in the layer you're looking at."

**Confidence level:** Can debug deployment issues across the full stack

---

### Entry 008: Multi-Account Architecture with Plan Gating

**Date:** 2026-07-22
**Topic:** Designing multi-email Gmail connection with institutional validation and plan-based limits
**Time spent:** ~1 hour

**What I learned:**
- Extending OAuth from single-account (cookie-based) to multi-account (DB-persisted) requires a new data model
- Institutional email validation is a simple domain whitelist check (not from known personal providers = institutional)
- Plan-based feature gating needs: DB column for plan, max-limits function, UI with upgrade prompt
- Token refresh must happen per-account in a loop when processing multiple Gmail connections
- The existing cookie-based flow must be preserved as fallback for backward compatibility

**The process:**
1. Created `cuentas_correo` table with OAuth tokens per email account
2. Added `plan` column to negocios (default: "basico")
3. Created institutional email validator (`email-validation.ts`) with 40+ personal domain blocks
4. Built API endpoints: GET/POST/DELETE for `/api/cuentas-correo`
5. Created new OAuth flow: `/api/auth/cuenta-correo` initiates connection, callback stores tokens in DB
6. Modified extract route to process emails from all connected accounts in sequence
7. Added plan display and upgrade prompt in Mi Empresa page

**Mistakes I made:**
- Initially tried to reuse the existing cookie-based OAuth callback — had to create a separate flow with state parameter
- Forgot to update the `emails/route.ts` to also use DB-stored tokens

**Key insight:**
> "When extending a system (1 email -> N emails), preserve the original path as fallback. The new architecture should be additive, not a replacement."

**Confidence level:** Can design multi-tenant feature gating systems

---

### Entry 009: Theme Switching (Dark/Light/System) in Next.js 16 + Tailwind v4

**Date:** 2026-07-24
**Topic:** Implementing a 3-mode theme toggle with localStorage persistence, SSR-safe initialization, and class-based dark mode
**Time spent:** ~45 minutes

**What I learned:**
- Tailwind CSS v4 defaults to media-query-based dark mode (`prefers-color-scheme`), not class-based — you need to override this to allow user toggling
- `suppressHydrationWarning` on `<html>` is mandatory when using an inline `<script>` that modifies the class before React hydrates — otherwise you get hydration mismatch errors
- The correct pattern for SSR-safe theme initialization: inline `<script>` in `<head>` that reads localStorage and sets the class BEFORE React loads
- A `ThemeProvider` context wraps the app and syncs localStorage + `<html>` class on every theme change
- React 19 / Next.js 16 removed the global `JSX` namespace — use `React.ReactNode` instead of `JSX.Element` for type annotations
- Extracting a shared component (`ThemeToggle`) early avoids duplicating the same logic across 6+ pages

**The process:**
1. Created `src/lib/theme-context.tsx` — ThemeProvider + useTheme hook with localStorage persistence and system preference listener
2. Updated `globals.css` — changed from `@media (prefers-color-scheme: dark)` to `.dark { ... }` class-based approach
3. Updated `layout.tsx` — added `suppressHydrationWarning`, inline theme init script, wrapped children with ThemeProvider
4. Created `src/app/components/theme-toggle.tsx` — dropdown with Claro/Oscuro/Sistema options, click-outside close
5. Added ThemeToggle to all page headers: dashboard, cuenta, empresa, configuracion, facturas list, factura detail, login
6. Login page also got dark mode classes (was previously light-only)

**Mistakes I made:**
- Type error: used `JSX.Element` which doesn't exist in React 19's global scope — fixed by using `React.ReactNode`
- Initially placed ThemeToggle inside the export button's `<button>` tag in facturas/content.tsx — broke the export dropdown. Had to restructure the flex container

**Key insight:**
> "When adding a cross-cutting concern (like theme), extract the shared component FIRST, then add it everywhere. Don't inline it in one page and then copy-paste."

**Confidence level:** Can implement client-side preferences with SSR-safe patterns in Next.js

### Entry 010: Migrating from better-sqlite3 (Sync) to Turso/libsql (Async)

**Date:** 2026-07-25
**Topic:** Rewriting an entire DB layer from synchronous better-sqlite3 to async @libsql/client for cloud deployment
**Time spent:** ~90 minutes

**What I learned:**
- `@libsql/client`'s `execute()` expects `InValue[]` (positional arrays), NOT `Record<string, unknown>` named params — the `{ "1": val }` pattern used throughout the codebase was incompatible
- Solved by adding a `toArgs()` converter in the DB client that extracts numeric keys from `{ "1": val, "2": val }` objects and returns sorted arrays — zero changes needed at 122+ call sites
- better-sqlite3's `db.transaction()` (synchronous atomic block) has no direct equivalent in async libsql — replaced with sequential `await` calls (acceptable for this use case since each extraction is a single-user operation)
- better-sqlite3's `.prepare().run()` pattern accepts named params with `@param` syntax; libsql only supports positional `?` — had to use `$N` named params in SQL with the `toArgs()` converter
- The backup route's `.backup()` method is better-sqlite3-specific — converted to JSON data export (more portable for cloud DB)
- Schema initialization went from multi-statement `db.exec()` to single-statement execution (Turso limitation)

**The process:**
1. Created `src/db/client.ts` — `dbExec`, `dbAll`, `dbGet`, `dbRun` wrappers with `toArgs()` converter
2. Rewrote `src/db/index.ts` — all 25+ functions made async
3. Rewrote `src/db/schema.ts` — single-statement execution for Turso
4. Rewrote `src/lib/auth.ts`, `src/lib/tenant.ts`, `src/lib/api-auth.ts` — all async
5. Updated all ~30 API route files — async DB calls, `WHERE negocio_slug = ?` filtering
6. Rewrote `src/lib/extraction/index.ts` — removed `Database.Database` type dependency, async insert/detect
7. Simplified `src/app/api/admin/backup/route.ts` — JSON export instead of file copy
8. Updated `src/app/api/extract/route.ts` — removed `new Database()` instantiation
9. Rewrote `__tests__/db.test.ts` — all tests now use libsql client

**Mistakes I made:**
- First attempt used `InArgs` type from libsql but the actual call sites still passed `Record<string, unknown>` — had to revert to keeping the function signatures as `Record<string, unknown>` and converting internally
- Forgot to add `negocio_slug` column to test fixture — caused test failure

**Key insight:**
> "When migrating a database layer, create an adapter (client.ts) that matches the OLD calling convention, then migrate consumers one-by-one. This minimizes the blast radius of each change."

**Confidence level:** Can migrate synchronous DB layers to async cloud DBs without breaking consumers

---

### Entry 011: Fixing Broken Multi-Tenant Queries and Email Extraction Dedup

**Date:** 2026-07-27
**Topic:** Systematic audit of SQL queries referencing non-existent columns, and fixing email extraction duplication
**Time spent:** ~45 minutes

**What I learned:**
- When adding `negocio_slug` column to the `facturas` table for multi-tenancy, it's easy to accidentally add `AND negocio_slug = ?` to queries on OTHER tables (like `lineas_factura`, `adjuntos`, `etiquetas`, `duplicados_potenciales`) that don't have that column — causes silent SQL errors → 500s
- The `listEmailsWithAttachments` function in gmail.ts already filters to only PDF/XML attachments via `isPdfOrXmlAttachment`, so by the time the extract route sees them, an email with PDF + XML + image appears to have only 2 attachments — misleading the dedup logic
- Solved by adding `totalAttachmentCount` field to `EmailMessage` type that counts ALL attachments (including non-PDF/XML) before filtering, then checking `totalAttachmentCount === 2` in the extract route
- Only process the XML attachment (skip PDFs entirely when XML exists) — XML contains structured CFDI data, PDF is redundant

**The process:**
1. Used explore agent to audit ALL SQL queries in `src/app/api/` for `negocio_slug` references on tables that don't have the column — found 12 broken references across 4 files
2. Fixed `src/app/api/facturas/[id]/route.ts` — removed `negocio_slug` from `lineas_factura` and `adjuntos` queries
3. Fixed `src/app/api/etiquetas/route.ts` — removed `negocio_slug` from SELECT, INSERT, DELETE (etiquetas is a shared table, not per-tenant)
4. Fixed `src/app/api/facturas/[id]/duplicados/route.ts` — removed `dp.negocio_slug` (duplicados_potenciales has no slug column)
5. Fixed `src/app/api/facturas/[id]/etiquetas/route.ts` — removed `negocio_slug` from `factura_etiqueta` and `etiquetas` queries
6. Fixed `src/app/api/facturas/[id]/adjunto/route.ts` — removed `negocio_slug` from `adjuntos` query
7. Added `totalAttachmentCount` to `EmailMessage` type and `listEmailsWithAttachments` function
8. Updated extract route to filter emails with `totalAttachmentCount === 2` and exactly 1 PDF + 1 XML

**Mistakes I made:**
- Initially added `otherAttachments` filter but it was redundant since `listEmailsWithAttachments` already filters to PDF/XML only — the real issue was needing the total count of ALL attachments

**Key insight:**
> "When adding a multi-tenant column to one table, do a full codebase grep for that column name to find all queries that might have incorrectly adopted it on OTHER tables. A single audit pass prevents 12 broken endpoints."

**Confidence level:** Can systematically audit and fix multi-tenant query issues across a codebase

---

### Entry 012: Value-Based Pricing Plans for a SaaS Feature

**Date:** 2026-08-04
**Topic:** Researching manual-work cost to anchor SaaS pricing, and implementing a plan registry + public pricing page
**Time spent:** ~1 hour

**What I learned:**
- Manual invoice processing benchmarks: 10-15 min per invoice (Ardent Partners ~12.5 min avg), full cost 2-3x labor once errors/filing/conciliation are included (APQC, IOFM)
- Mexican labor anchor: auxiliar contable ~$10-14k MXN/month → ~$100-120/hr loaded (prestaciones/IMSS ~30%); so manual processing costs ~$50-70 MXN per invoice and $1.1k-2.3k/month in labor for 50-100 invoices
- Price at 10-20% of the value saved: Individual $199/mes ($1,990 anual = 2 meses gratis), Empresa $499/mes ($4,990 anual) — competitive vs despachos ($2.5-5k/mes) and automated platforms ($500-1.2k/mes)
- Single source of truth for plan data: a pure `src/lib/plans.ts` registry (no server-only imports) is importable from both server (email-validation) and client (pages) — avoids duplicating max-email-account logic
- Legacy plan values ('basico', 'multi correo') must map to new ids ('individual-mensual', 'empresa-mensual') for backwards compatibility
- New public page needs adding to the proxy `publicPaths` array, otherwise middleware redirects to /login

**The process:**
1. Researched manual processing cost (time/factura + MX labor) and competitor pricing
2. Wrote failing tests first (TDD): plan count, email-account limits per tier, 2-months-free annual math, legacy mapping, price formatting
3. Created `src/lib/plans.ts` registry + helpers; delegated `getMaxEmailCuentas` from email-validation.ts
4. Built public `/planes` pricing page with monthly/annual toggle, manual-vs-app comparison tables, and CTA to /login
5. Updated empresa page plan badge + replaced the "Proximamente" promo box with price + link
6. Verified with eslint/tsc/vitest/build gates

**Mistakes I made:**
- Named annual plans "Empresa Anual" but `getPlanNombre` should return the tier base ("Empresa") for badges — fixed by deriving name from `tipo` instead of the display name
- Initially left a redundant ternary in `getPlanNombre` — simplified after the failing test

**Key insight:**
> "Anchor SaaS pricing to the manual alternative, not to cost of goods. Charge a fraction (10-20%) of what the customer saves; put plan data in one pure module importable from both server and client."

**Confidence level:** Can research a market anchor and ship a plan registry + public pricing page end to end

---

### Entry 013: Paywall Gate with a Modal for Unpaid Subscriptions

**Date:** 2026-08-05
**Topic:** Enforcing the subscription on the actions that create real value (extract, connect accounts, export) using a reusable plan modal + server-side 402 gates
**Time spent:** ~1 hour

**What I learned:**
- Never gate only on the client: the modal is UX, the real gate is HTTP 402 from the API routes (`/api/extract`, `/api/cuentas-correo` POST), so a crafted request can't bypass the paywall
- Client-side pre-check (before the fetch) avoids a wasted request, but the 402 response handler still opens the same modal as defense in depth
- Adding a nullable `plan_pagado_hasta` column is the minimal "paid until" model; no payment gateway yet, so a script (`scripts/marcar-plan.ts`) simulates the webhook that will later set it
- SQLite migration: `CREATE TABLE IF NOT EXISTS` won't add columns to an existing table — a guarded `ALTER TABLE ... ADD COLUMN` with a `PRAGMA table_info` existence check is required (idempotent, safe to run every boot)
- A pure date helper (`isSuscripcionActiva`) belongs next to the plan registry (`plans.ts`) so server routes, client components, and tests share one truth about "active"

**The process:**
1. Added `plan_pagado_hasta` to schema (CREATE + guarded migration) and to the `Negocio` type / `updateNegocio`
2. Wrote `isSuscripcionActiva` + failing tests first (TDD)
3. Added server gates returning 402; wired client pre-checks + 402 handlers to open a shared `PlanModal`
4. Reused the modal across dashboard (extract), empresa (connect account) and facturas (export)
5. Ran eslint/tsc/vitest gates (no new errors; 44/44 tests pass)

**Mistakes I made:**
- `useState` typed `boolean | null` for "subscription status not loaded yet" — exporting must not block while the status fetch is in flight (null = allow), only block on explicit `false`

**Key insight:**
> "A paywall is two layers: a reusable modal for the user and a 402 for the server. Gate only the actions that cost money to run."

**Confidence level:** Can implement a paywall gate end to end (schema migration + shared modal + server 402 + tests)

---

### Entry 014: Stripe Checkout Integration with Webhook

**Date:** 2026-08-05
**Topic:** Wiring the paywall to real payments: Stripe Checkout subscription sessions + a webhook that grants/extends `plan_pagado_hasta`
**Time spent:** ~1 hour

**What I learned:**
- Test mode first: `sk_test_` keys and the `4242 4242 4242 4242` test card make the whole flow testable without money or full business verification
- Stripe Checkout with `mode: "subscription"` + `price_data` avoids managing Price objects: currency MXN, `unit_amount = precio*100`, `recurring.interval = month|year`
- Carry the plan context on the SUBSCRIPTION metadata (`negocioId`, `planId`) — the checkout session completes once, but `invoice.paid` fires on every renewal, and `invoice.parent.subscription_details.metadata` is an immutable snapshot of that subscription metadata
- The webhook must be verifiable without a session: add `/api/webhooks/stripe` to the proxy `publicApiPrefixes`, then rely on `stripe.webhooks.constructEvent` + `STRIPE_WEBHOOK_SECRET` for security
- stripe-node v22.4.0 type shape surprised me: `Invoice.subscription_details` moved to `Invoice.parent.subscription_details`, so TypeScript caught my first guess — always check the installed package's types, not the docs
- Client button pattern: shared `SubscribeButton` POSTs `/api/checkout`, on 401 redirects to `/login` (works on public pages), on 200 redirects to `session.url`

**The process:**
1. `npm install stripe`; added columns `stripe_customer_id`/`stripe_subscription_id` + guarded migrations
2. Pure `buildStripeLineItem(plan)` helper (tested) maps plan registry → Stripe line item
3. `POST /api/checkout` creates the session; `POST /api/webhooks/stripe` handles `checkout.session.completed` (store ids) and `invoice.paid` (grant/extend paid-until)
4. Graded gates: tsc/eslint/tests (49/49) + build + deploy; verified 401 on checkout and 400 on unsigned webhook
5. Left to the user (needs their Stripe account): test secret key + webhook signing secret

**Mistakes I made:**
- Used `invoice.subscription` / `invoice.subscription_details` from memory; the installed Stripe types moved these under `invoice.parent.*` — fixed after tsc errors

**Key insight:**
> "Subscription metadata is the contract between Checkout and your webhook — put the plan id there and read it from invoice.paid for every renewal."

**Confidence level:** Can integrate Stripe Checkout + webhook grants end to end

---

### Entry 015: Full Paywall (402 Gating) with Admin Bypass

**Date:** 2026-08-06
**Topic:** Blocking every feature until a plan is active, while exempting the app owner's admin account
**Time spent:** ~1.5 hours

**What I learned:**
- A paywall is a *cross-cutting concern*: one helper (`isAccesoCompleto`) reused by every protected route beats scattered `if` checks — it makes the block list reviewable at a glance
- The helper accepts a single object `{ email, role, planPagadoHasta }` so each route passes what it has and the policy stays in one file (`src/lib/paywall.ts`)
- Admin bypass is a security decision: grant by **role** (`role === "admin"`) OR by **email** (the app owner) — because an admin user might have `role: "negocio"` in DB while still owning the app
- Gmail dots are semantically irrelevant: canonicalize before comparing admin email (`ian.maziel.romo@gmail.com` === `ianmazielromo@gmail.com`), otherwise the bypass silently breaks for the app owner
- `402 Payment Required` is the right HTTP code for paywalled features — it reads clearly in the client and lets the UI react with `if (res.status === 402) setShowPlanModal(true)`
- API-key routes (`/api/v1/*`) cannot use the email/role bypass (no user session) — gate them with `isSuscripcionActiva(negocio.plan_pagado_hasta)` instead; the admin exemption is inherently per-user
- Separate "have access" (blocking) from "plan limits" (how many emails you may connect): the paywall unlocks access; `getMaxEmailCuentas` still caps empresa=4 vs individual=1
- The test checkout session carried `negocioId: "2"` (my test business) in metadata — the user paid but *their* business (`mi-empresa`, id 1) stayed locked. Payments unlock the business in the session metadata, not "whoever clicked"
- Local dev databases hide real state: scripts that forgot to load `.env` silently hit `file:local.db` instead of Turso, so DB "verification" looked wrong until env was sourced

**The process:**
1. Extracted `isAccesoCompleto`/`esEmailAdmin`/`canonicalEmail` into `src/lib/paywall.ts`
2. Gated every feature route with 402 (extract, cuentas-correo, facturas, emails, etiquetas, factura detail/revision/duplicados/adjunto, and `/api/v1/*`)
3. Surfaced `planActivo` on `/api/negocios`, `/api/negocios/[slug]`, `/api/cuentas-correo` so the UI can render a locked banner without guessing
4. UI: amber "Tu plan no esta activo" banner + PlanModal on 402 across dashboard, facturas, empresa, and invoice detail
5. Added `__tests__/paywall.test.ts` (58/58 tests pass), tsc clean, lint clean on touched files, build OK
6. Created the owner admin account `ian.maziel.romo@gmail.com` (role admin) in the real Turso DB

**Mistakes I made:**
- Assumed the checkout the user paid was tied to their business — it was tied to my `acme-test` fixture (id 2). Lesson: always confirm which tenant id is in the session metadata when debugging "paid but locked"
- Wrote a one-off admin-creation script with a nonsense `email` reassignment line before simplifying; kept it minimal and removed it after use
- Initial tsc run flagged a temp inspection script (`Row[]` cast) — delete scratch scripts before running the type check

**Key insight:**
> "The paywall blocks *actions*, not the tenant — gate by the logged-in user's access, but grant/revoke on the business attached to the Stripe session."

**Confidence level:** Can build a subscription paywall with per-role/per-email exemptions and 402-gated UI

---

### Entry 016: Styled Excel Exports

**Date:** 2026-08-06
**Topic:** Making XLSX exports readable instead of cramped
**Time spent:** ~45 min

**What I learned:**
- SheetJS community (`xlsx@0.18.5`) writes data but NO styles — `json_to_sheet` produces a spreadsheet where every cell is default width, so long names and numbers pile together
- The drop-in styled fork is `xlsx-js-style` (same API, plus `cell.s = {...}` styles: font, fill, alignment, border). Verify your features actually survive a write→read→XML round trip
- `!cols: [{wch}]` sets column widths (characters); the reader may not round-trip them, so assert against the raw `xl/worksheets/sheet1.xml` inside the zip, not `XLSX.read`
- Header style: bold white font + dark fill + center alignment reads instantly as "this is the header"; alternating row fill (`F2F2F2`) keeps long rows visually aligned
- Money cells: coerce DB values to numbers and set `cell.z = "#,##0.00"` — Excel then right-aligns and formats thousands separators automatically
- `!autofilter` gives the user sortable/filterable columns for free
- `!freeze` (freeze header row) is NOT supported in xlsx-js-style 1.2.0 — write ignores it, so don't rely on it
- Type friction: Next `Response` wants `ArrayBuffer`, not `Buffer<ArrayBufferLike>` (TS strict DOM libs) — return a sliced `ArrayBuffer` from the helper
- Extract the styling into one pure helper (`src/lib/excel.ts`) used by both the web and `/api/v1` export routes

**The process:**
1. Verified fork capabilities with a throwaway script before writing production code (write, read back, unzip the XML)
2. Built `buildFacturasWorkbookBuffer(sheet, columns, rows)` — column widths, styled header, zebra rows, money formats, autofilter
3. Column spec per route (`{ header, key, width, type }`) so each export keeps its own columns but shares the styling
4. Tests assert against the actual OOXML XML (what Excel renders), since the JS reader doesn't round-trip styles/widths
5. Deployed and verified the live download: widths present, header styled, autofilter set

**Mistakes I made:**
- Tested style persistence via `XLSX.read` and got false negatives — the read-back drops `!cols`, `z`, and font. Fix: assert on the XML inside the zip
- Expected `rgb="1F4E78"` in styles.xml but xlsx-js-style writes `rgb="FF1F4E78"` (ARGB with alpha prefix)
- Tried `Buffer` as the helper return type — Next's `Response` body rejects `Buffer<ArrayBufferLike>`; switched to `ArrayBuffer`

**Key insight:**
> "SheetJS community writes data; a styled export needs a fork or hand-rolled XML. Test what Excel renders (the XML), not what the JS reader reconstructs."

**Confidence level:** Can produce professional-looking styled XLSX exports

---

### Entry 017: User-Chosen Export Filenames

**Date:** 2026-08-06
**Topic:** Letting users name their downloaded export instead of shipping a fixed `facturas.xlsx`
**Time spent:** ~30 min

**What I learned:**
- A fixed `Content-Disposition: attachment; filename="facturas.xlsx"` makes every download collide in the Downloads folder — a filename dialog is a cheap professionalism win
- `window.location.href = url` can't control the saved name; you must `fetch` the file as a blob, create an object URL, and click an `<a download="custom-name.csv">`
- The browser prefers the anchor's `download` attribute over the server `Content-Disposition`, so the server name becomes irrelevant once you download client-side
- Sanitize the user's filename: strip `\/:*?"<>|` and collapse whitespace, fall back to `facturas` if empty (or a user names it `../../evil`)
- Suggest a dated default (`facturas-2026-08-06`) so files don't collide even if the user doesn't type anything
- Don't `setState` inside a `useEffect` to reset a modal's input (lint `set-state-in-effect`) — remount the dialog with a `key` tied to its open state and let `useState(defaultName)` pick up the fresh default
- Same-origin `fetch` sends cookies by default, so the 402-gated export endpoint keeps working

**The process:**
1. New `ExportFilenameModal` component: input with the `.csv`/`.xlsx` suffix shown, Enter submits, Esc/overlay closes
2. `handleExport` now opens the dialog instead of navigating; `downloadExport` does the blob fetch + anchor click
3. Kept the 402 → PlanModal behavior on the export fetch
4. tsc + 63/63 tests + lint clean (no new warnings) + build + deploy

**Mistakes I made:**
- First version reset the input via `useEffect` + `setState` — ESLint flagged it (a rule already failing elsewhere in the codebase); fixed by remounting with `key`

**Key insight:**
> "The server names the file, but the client decides the saved name — fetch-as-blob + `a[download]` puts the filename in the user's hands."

**Confidence level:** Can implement client-side downloads with user-defined filenames

---

### Entry 018: Launch Readiness Pass

**Date:** 2026-08-06
**Topic:** Three fixes that unblock signing up real customers
**Time spent:** ~1 hour

**What I learned:**
- Walk the signup flow as a *brand-new user*, not as admin: the negocio-creation form was visible to everyone but `POST /api/negocios` was admin-only — every new customer hit a 403 dead end. Role-gated UI needs role-gated API, and they must match
- When a user creates a tenant, assign ownership: `updateUsuario(user.id, { negocio_id: newNegocio.id })` and default the business email to their account email. "Created it" and "belongs to them" are two DB writes, don't forget the second
- A subscription SaaS lives on the full webhook lifecycle: `invoice.paid` grants, but `invoice.payment_failed` (dunning!) and `customer.subscription.deleted` (cancellation) are where access control and communication actually happen
- Fall back through subscription id → session metadata → customer id when resolving which business owns a Stripe event; don't rely on one field alone
- On `customer.subscription.deleted`, null `plan_pagado_hasta` and the subscription id immediately — Stripe fires it either at instant-cancel or after `cancel_at_period_end`, and in both cases access should end
- Payment-failure emails need SMTP configured to actually reach users, but the code must fail soft (`sendEmail` returns false) so a missing SMTP never breaks the webhook
- Admin "full access without subscription" should also extend to *limits*, not just the paywall gate: `maxCuentasCorreo()` gives admin/owner the empresa tier (4 accounts) even on a `basico` plan, via one pure helper
- Before launch: cancel test subscriptions and purge fixture data (stripe test subscriptions can also just disappear — verify with `stripe subscriptions list`)

**The process:**
1. Reproduced the 403 by reading the route + selector instead of assuming
2. Made tenant creation owner-assigning; added `getNegocioByStripeCustomerId` fallback
3. Added `invoice.payment_failed` + `customer.subscription.deleted` handlers with email notifications
4. Extracted `maxCuentasCorreo` into `paywall.ts` and re-used it in GET/POST
5. Cleaned Turso (deleted `acme-test` fixture) and verified the signup flow live (register → 201 → negocio listed → duplicate 409)

**Mistakes I made:**
- First attempt to cancel the test subscription failed — `stripe subscriptions cancel` needs `--confirm` interactively, and the sub was already gone (test data reset)

**Key insight:**
> "Launch readiness is exercised from the customer's seat: sign up like a stranger would, and you find the 403s the admin never sees."

**Confidence level:** Can run a pre-launch product readiness pass

---

### Entry 019: Public Marketing Pages and Route Restructuring

**Date:** 2026-08-06
**Topic:** Landing page + public pricing so the SaaS can be advertised
**Time spent:** ~45 minutes

**What I learned:**
- Audited the deployed routes before assuming "the app is ready to advertise": `/` and `/pricing` both redirected to `/login` — the product was invisible to anyone without an account. Check the *public* surface of a site before marketing it
- Next.js 16 renamed middleware to `proxy.ts` (same file location, `export default function proxy`). The app had a hand-rolled `publicPaths` allowlist — I extracted `isPublicPath`/`isPublicApiPath` into exported pure functions so routing rules are unit-testable
- The auth split for a SaaS is: marketing site at the root `/`, authenticated app under `/dashboard`. Logged-in users hitting `/` get a server-side `redirect("/dashboard")` read from the session cookie; logged-out visitors get the landing
- `cookies()` is async in Next 16 (`await cookies()`), and calling `redirect()` from a Server Component throws `NEXT_REDIRECT` — it's the clean way to branch server-side
- Moving a page means fixing relative imports (`./(components|negocio-selector)` → `../(...)`) and auditing every place that pointed at the old URL: `redirectTo` in auth routes, `window.location.href` fallbacks, and `<Link href="/">` "back to dashboard" links across 4 pages
- When a repo's lint gate is already failing on `main` (15 pre-existing errors), verify your change didn't add new ones by running eslint against a clean worktree of HEAD and diffing the counts, instead of "fixing" unrelated pre-existing debt
- A price page that already exists publicly (`/planes`) can be given a friendlier marketing alias (`/pricing` → server-component `redirect("/planes")`), and both must be in the proxy allowlist or the alias silently 307s to `/login`

**The process:**
1. `curl`ed every route to map what was public (found `/planes` was already public, `/pricing` and `/` were not)
2. Extracted testable path helpers in `proxy.ts`; added `__tests__/proxy.test.ts` first
3. Moved the dashboard to `/dashboard` (fixed 6 relative imports)
4. Built the landing at `/` (server component: session cookie → `/dashboard`; else marketing content reusing the zinc/dark design system)
5. Re-pointed every login/register/callback redirect and "← back" link to `/dashboard`
6. Verified prod: `/`→200, `/planes`→200, `/pricing`→307→`/planes`, `/dashboard`→307→`/login` (anon), `/dashboard`→200 (auth), `/`→`/dashboard` (auth)

**Mistakes I made:**
- Almost put `/` into the proxy `publicPaths` with a naive matcher — caught that `startsWith("/" + "/")` never matches and used the exact-equality branch
- The first deploy test showed `/pricing` 307 to `/login` before I added it to the allowlist (alias page existed but proxy blocked it)

**Key insight:**
> "A SaaS's public surface is part of the product. If the landing page 307s to login, the ad budget is wasted before a user reads a word."

**Confidence level:** Can restructure routes for public marketing pages and verify auth boundaries

---

### Entry 020: Branding the Product (Name + Domain)

**Date:** 2026-08-06
**Topic:** Choosing a commercial name and wiring it into the app
**Time spent:** ~1 hour

**What I learned:**
- A brand name should work as an everyday phrase, not just describe the product: "En Regla" (as in "todo en regla") was picked over literal names like "Factu" or "Facturo" — and it was chosen by the user because it already lives in daily speech
- Check domain availability with **RDAP** (registries expose a free JSON API): `curl -L https://rdap.org/domain/name.tld` — HTTP **404 = available**, **200 = registered**. DNS lookup is only a weak heuristic (a registered domain can have no DNS), so RDAP is the real answer
- Good `.com` names are essentially all taken; the realistic play for a Mexican market is `.mx` (e.g. `enregla.mx`), which is registrable by individuals
- Centralize the brand in one module (`src/lib/brand.ts` with `APP_NAME`/`APP_TAGLINE`/`APP_DESCRIPTION`) and import it everywhere — otherwise the name leaks into 10 scattered files (metadata, logo, hero, footer, version label, payment emails, even the exported Excel sheet tab)
- Distinguish the **brand name** from the **feature name**: "En Regla" (brand) vs "facturas" (invoices — route folders, API paths, "Últimas Facturas" labels). Grep for brand usage with start/end-boundary patterns (`>Facturas<`, `"Facturas"`) so you don't accidentally rename feature code
- When a domain changes, it's not just DNS: Google OAuth redirect URI, Stripe payment links/webhooks, and any absolute `SITE_URL` env values all point at the old host

**The process:**
1. Shortlisted 15 candidate names across themes (verbs, everyday phrases, accounting words)
2. Heuristic DNS check, then RDAP verification for the finalists; recorded `cuadre.mx`, `factua.mx`, `remite.mx`, `enregla.mx` as available
3. User picked **En Regla**; confirmed `enregla.mx` available
4. Created `src/lib/brand.ts` and applied it to metadata, landing, login selector, config, planes, notifications, and both Excel export routes
5. Deployed and verified the title tag, logo, and public routes in production

**Mistakes I made:**
- First used `socket.gethostbyname` to infer availability — unreliable (registered domains without DNS look "free"). RDAP 404 is the trustworthy signal
- Initially planned to rename dashboard's "Facturas" labels before realizing they were feature labels, not brand text

**Key insight:**
> "A brand is a sentence people already say, and a domain is real only when the registry says 404."

**Confidence level:** Can select a brand name, verify domain availability, and rebrand an app cleanly

---

### Entry 021: Launching on the Free Vercel Domain + Social Sharing

**Date:** 2026-08-06
**Topic:** Going live without a paid domain, and making shared links look professional
**Time spent:** ~40 minutes

**What I learned:**
- The app can go live with zero cost on Vercel's production domain (`*.vercel.app`). It's a real domain with HTTPS and full public access — the only "cost" is that it isn't branded
- Custom `vercel.app` aliases are NOT a free branding trick: when an account has deployment protection enabled, every alias except the main production domain sits behind a Vercel SSO login wall (302 → `vercel.com/sso-api`). Verified: `facturas-sigma.vercel.app` → 200, every new alias → 302
- Adding an alias via `vercel alias set <hostname> <alias>` pins it to whatever deployment the source resolved at that moment — wrong way to do it; aliases should be attached to an explicit deployment URL if you must create them
- Some free-domain paths can't be fully delegated: eu.org requires an email confirmation click by the real owner, so "just do it for me" hits a hard human step I can't perform. Be explicit about which steps are mine and which are the owner's
- Open Graph metadata is the difference between an ugly link and a card: `metadataBase` + `openGraph` + `twitter` in Next 16 layout metadata, deployed, produces `og:title`/`og:site_name`/`twitter:card` that Instagram/Facebook/X scrapers read

**The process:**
1. Confirmed the app already serves publicly at the production domain (no waiting required)
2. Tried branded aliases → all SSO-walled → removed them, kept the public production domain
3. Added OG + Twitter card metadata with the brand name and tagline
4. Built, deployed, and verified the meta tags live

**Mistakes I made:**
- Created 4 aliases before checking whether they'd actually be public; verified AFTER (SSO 302) and had to remove them. Check the protection behavior first

**Key insight:**
> "Free launch = the production vercel.app domain. Fancy aliases are SSO-gated, paid domains need a wallet, and eu.org needs a human's inbox — the product doesn't need any of them to go live today."

**Confidence level:** Can take a SaaS live on a free domain with presentable social sharing

---

### Entry 022: Mobile Responsiveness Audit (Tables + Headers)

**Date:** 2026-08-06
**Topic:** Verifying and fixing "does it look right on a phone?"
**Time spent:** ~30 minutes

**What I learned:**
- The fastest way to answer "se ve bien en celular?" without a browser is an audit script: every `<table>` must be inside an `overflow-x-auto` wrapper (checked with `grep -rl "<table"` + counting wrappers per file) — all 6 tables already had it, so tables scroll horizontally instead of breaking the layout
- The real mobile failure points are headers with multiple controls in one `justify-between` row: dashboard (title + badge + "Extraer de Gmail" + "Ver todas" + theme toggle + avatar), facturas detail (number + estado + Cancelar + confianza + revisión), landing (logo + 2 CTAs + toggle). At 360px those rows overflow
- The fix pattern is cheap and low-risk: add `flex-wrap gap-2` to the header container + `min-w-0 truncate` on the title + `flex-wrap justify-end` on the action group, so items wrap to a new line instead of overflowing; plus `hidden sm:block` for secondary CTA on tiny screens
- Distinguish "responsive enough" (single-column grids, hidden nav, scrollable tables) from "responsive gaps" (crowded flex rows) — the former was already fine, the latter needed the wraps

**The process:**
1. Audited tables via grep → all wrapped, no action needed
2. Audited headers row by row for control counts at 360px width
3. Applied the flex-wrap pattern to 4 headers (landing, dashboard, facturas list, facturas detail)
4. `tsc`, ESLint (only pre-existing warning), 71/71 tests, build, deploy, verified 200 in prod

**Key insight:**
> "Mobile 'breaks' are usually horizontal overflow in flex rows and tables. Tables need `overflow-x-auto`; crowded headers need `flex-wrap`. Audit with grep for the table case, read the JSX for the header case."

**Confidence level:** Can audit and fix a Next/Tailwind app's mobile layout without a browser, using grep + class reasoning

---

### Entry 023: Back-Navigation "Memory" Across Pages

**Date:** 2026-08-12
**Topic:** Making the back arrow return to the page the user actually came from, not a hardcoded target
**Time spent:** ~1.5 hours

**What I learned:**
- Every back arrow in the app was a hardcoded link ("← Inicio" → `/dashboard`, "← Volver" → `/login`). No matter where the user came from, back dumped them on a fixed page
- First attempt used query-param memory (`?from=<path>` propagated through links). It worked but the user rejected it: they want the page to *detect* where the user was, not have every link hand-carry a param
- The right tool is the browser's own history: `router.back()` from `next/navigation` is native dynamic back, including repeated backs (a single "previous path" slot loops when you go back twice)
- The only missing piece is knowing whether there IS in-app history (direct visit vs. navigated). Solved with a global tracker: a `NavMemory` client component in the root layout watches `usePathname` and sets a `sessionStorage` flag on the first in-app navigation
- `BackLink` component: click → if the flag is set and `history.length > 1` → `router.back()`; else `router.push(fallback)` (each page's natural home: landing for `/planes`, dashboard for `/facturas`/`/cuenta`/etc.)
- `usePathname` in the root layout needs a `<Suspense>` boundary per the Next 16 docs so prerendered routes stay prerendered
- Keep the `?from=` param ONLY where it feeds a post-login redirect (SubscribeButton 401 → `/login?from=<page>`), not for the back link itself

**The process:**
1. `src/lib/back-nav.ts`: `useNavTracker()` (sets sessionStorage flag after first nav) + `shouldUseHistoryBack()`
2. `src/app/components/nav-memory.tsx`: null-rendering tracker mounted in layout inside `<Suspense>`
3. `src/app/components/back-link.tsx`: reusable dynamic back link (history-back with fallback)
4. Replaced all 9 hardcoded back links (planes, login, facturas, factura detail, cuenta, empresa, configuracion, admin)
5. Verified `tsc --noEmit`, ESLint (no new errors on touched files), full `next build` pass

**Key insight:**
> "For 'back' that adapts to where the user was, delegate to the browser history with `router.back()` and only add a fallback for direct visits. Detect 'has in-app history' with a tiny sessionStorage flag set by a layout-level path tracker — don't encode the origin into every link."

**Confidence level:** Can implement origin-aware back navigation across a Next.js app

---

### Entry 024: Verifying Stripe Is Actually "Ready for Real Payments"

**Date:** 2026-08-12
**Topic:** Auditing a Stripe integration to find out whether it can take real money, and proving the webhook secret is correct
**Time spent:** ~45 minutes

**What I learned:**
- "Stripe connected" is not the same as "Stripe live": `stripe config --list` shows the account mode. `Live mode key: not available` on a "New business sandbox" account means the account is NOT activated for real charges — everything so far (sk_test keys, webhook endpoints with `livemode: false`) is sandbox-only
- `stripe webhook_endpoints list` reveals the registered endpoint and its `enabled_events`. Mine only had `checkout.session.completed` + `invoice.paid`; the code handles two more events (`invoice.payment_failed`, `customer.subscription.deleted`) that were never subscribed → renewals would still work but dunning/cancellation silently wouldn't
- The Stripe API **no longer returns the endpoint secret on retrieve** (`secret` key is simply absent) — you only see it once at creation, so you can't diff secrets via the API
- Definitive proof of a correct `STRIPE_WEBHOOK_SECRET` without the dashboard: sign a fake event yourself with the local secret and POST it to the production webhook URL. Craft `t=<ts>,v1=HMAC-SHA256(secret, "<ts>.<body>")` (Stripe's signed-payload scheme), send it with `stripe-signature` header → production returns `{"received":true}` only if the server's env secret matches yours. 200 = secrets match, 400 "Firma invalida" = they don't
- `stripe trigger <event>` creates real test fixtures and delivers to registered endpoints, but Vercel request logs (`vercel logs <url>`) only show `λ POST /api/webhooks/stripe`, not the response status — so the self-signed test is the only way to confirm signature acceptance
- The webhook handler returns `received: true` for ANY valid-signature event even when no negocio matches (it just `break`s per case) — so unmatched fixtures are harmless, by design

**The process:**
1. `stripe config --list` → confirmed sandbox/test-only account, no live key available (blocked step: user must activate the Stripe account)
2. `stripe webhook_endpoints list` → found endpoint missing 2 of 4 handled events
3. `stripe webhook_endpoints update <id> --enabled-events <a> --enabled-events <b> ...` → subscribed all 4
4. Signed a fake `invoice.paid` event with the local `whsec` in a throwaway Node script, POSTed to `https://…/api/webhooks/stripe` → `200 {"received":true}` → Vercel production secret confirmed correct
5. `stripe trigger checkout.session.completed / invoice.paid / invoice.payment_failed` + `vercel logs` → confirmed live delivery to production (3 λ POSTs)

**Key insight:**
> "Before telling a founder 'you can charge real money', audit the mode: test vs live key, subscribed webhook events vs the events the handler actually switches on, and prove the webhook secret with a locally-signed test event that gets a 200 — logs alone don't show the status code."

**Confidence level:** Can audit and verify a Stripe production-readiness chain end-to-end

---

### Entry 025: Multi-Tenant IDOR Hunting (Client-Modified Data, Not Just Auth)

**Date:** 2026-08-13
**Topic:** Auditing a Next.js multi-tenant app for cross-tenant data leaks after a "back button" bug report grew into a full project bug hunt
**Time spent:** ~1.5 hours

**What I learned:**
- Multi-tenant leaks hide on the **client-modified data** (join tables, files, tokens), not just the obvious `WHERE negocio_slug = ?` rows. Pattern to check: any handler that takes a `:id` from the URL and queries a child table by that id (adjuntos, etiquetas, duplicados) must verify the PARENT row belongs to the tenant — otherwise enumerating ids leaks other tenants' rows (confirmed: `adjunto/route.ts` and `etiquetas/route.ts` read by `factura_id` with no ownership check)
- When a table is global by design (`etiquetas`, `duplicados_potenciales`), the fix is a JOIN back to the tenant-scoped parent: `JOIN facturas fo ON fo.id = dp.factura_id AND fo.negocio_slug = ?` — and BOTH sides of a duplicate pair must be same-tenant (`detectarDuplicados` was inserting cross-tenant pairs because its SELECT had no slug)
- An OAuth `state` param that is just `kind:email:negocioId` is forgeable: an attacker completes their own Google flow but stamps the victim's business + email into the state, poisoning the victim's connected account. Fix: sign the state (HMAC-SHA256, `payload.sig` with base64url JSON + expiry) at mint time and verify in the callback; derive the key from an existing prod secret so no new env var breaks the paused deployment
- The client-supplied email in a connect-account flow must not be trusted for WHERE clauses — fetch the **Google-verified email** from `/oauth2/v2/userinfo` instead
- A "back" bug (`/planes` looping) was caused by a heuristic (`history.length > 1` + a never-cleared flag) — replaced with an explicit sessionStorage stack of visited paths popped via `router.replace(target)`, which is deterministic and testable
- Truncated audit reports lose findings: when a subagent report gets cut off, re-run a focused audit with explicit "do not re-report already-fixed issues" to recover the rest (found 2 more HIGHs this way)
- Registering a user with `negocio_id = null` in a system whose tenant gate requires `negocio_id === negocio.id` locks them out of EVERY tenant feature permanently — ownership must be assigned at creation

**The process:**
1. Refactored back-nav to a sessionStorage stack; ran `tsc` — passes
2. Audited frontend+API (2 subagents) → 4 confirmed HIGHs (admin `setNegocios`, dashboard stats shape, adjunto IDOR, OAuth state)
3. Fixed those + etiquetas IDOR; added `src/lib/oauth-state.ts` (signed, expiring states)
4. Re-audited the remaining surface → 2 more HIGHs (duplicados cross-tenant, register lockout) + 3 MEDIUMs, all fixed (duplicados scoping, register negocio_id, photo GET auth, emails route 401, etiquetas in factura payload, v1 pagination clamp)
5. Gates: `tsc --noEmit` clean, `next build` clean

**Key insight:**
> "In multi-tenant apps, audit the id-routed child reads (adjuntos, tags, duplicates, OAuth callbacks) and always prove parent ownership. Sign anything you round-trip through a third party (Google's state param), and never trust a client-supplied identity for a WHERE clause."

**Confidence level:** Can audit and harden a multi-tenant Next.js app for cross-tenant IDORs and tamperable OAuth state

---

### Entry 026: Production Launch Readiness Pass

**Date:** 2026-08-19
**Topic:** Preparing a SaaS for public launch: SEO, security headers, PWA, error handling, and loading states
**Time spent:** ~1 hour

**What I learned:**
- A production app needs: custom 404 page, robots.txt (block private routes), sitemap.xml (list public routes), OG image for social previews, security headers (HSTS, CSP, X-Frame-Options), and loading/error boundary pages
- Next.js 16 supports `robots.ts` and `sitemap.ts` as route handlers that return typed objects — no need to manually create XML files in `public/`
- `next.config.ts` is the right place for security headers via `async headers()` — they apply to every route automatically
- `poweredByHeader: false` removes the `X-Powered-By: Next.js` header (minor security hardening)
- `reactStrictMode: true` enables extra development checks (double-invocation of effects, etc.)
- Loading states (`loading.tsx`) in Next.js App Router are automatically shown during server component rendering — they replace the page content with a skeleton while data loads
- Error boundaries (`error.tsx`) catch rendering errors in their child routes — must be `"use client"` since they use hooks
- The `not-found.tsx` page is served by Next.js when no route matches — different from `error.tsx` which catches runtime errors
- OG images can be SVG for simplicity, though some social platforms don't render SVG well — for maximum compatibility, a PNG is better (but SVG works for testing)
- Service worker versioning (`kapta-v1` → `kapta-v2`) forces cache invalidation on updates — old caches are deleted in the `activate` handler

**The process:**
1. Created `not-found.tsx` — custom 404 with brand-consistent styling and navigation options
2. Created `robots.ts` — blocks crawling of private routes (api, admin, dashboard, facturas, empresa, cuenta, configuracion)
3. Created `sitemap.ts` — lists public routes (/, /login, /planes) with priorities
4. Created `error.tsx` — client-side error boundary with reset button
5. Created loading states for dashboard, facturas, and login pages (skeleton UIs)
6. Updated `next.config.ts` — added security headers, `poweredByHeader: false`, `reactStrictMode: true`, `bcrypt` to `serverExternalPackages`
7. Updated `layout.tsx` — added OG images, Twitter card `summary_large_image`, robots metadata, noscript fallback
8. Updated `manifest.json` — added screenshots, id field, prefer_related_applications
9. Updated `sw.js` — bumped cache version, added image caching strategy, added og-image to precache
10. Improved landing page — added FAQ section, "14 dias de prueba" CTA text, contact email in footer
11. Created `og-image.svg` — social preview image with brand colors and tagline
12. Verified: `tsc --noEmit` clean, ESLint clean on all touched files, `npm test` 71/71 pass, `npm run build` successful

**Mistakes I made:**
- Initially forgot to add `bcrypt` to `serverExternalPackages` — it was already there in the original config but I rewrote the file from scratch
- OG image as SVG won't render on all platforms (Facebook, some email clients) — acceptable for launch, can convert to PNG later

**Key insight:**
> "Launch readiness is a checklist, not a feature. robots.txt, sitemap, security headers, error boundaries, and loading states are invisible when they work and catastrophic when missing. Do them all in one pass."

**Confidence level:** Can prepare a Next.js app for production launch with full SEO, security, and PWA configuration

---

### Entry 027: Logo Redesign & Brand Refinement

**Date:** 2026-08-19
**Topic:** SVG logo design iteration — removing backgrounds, stroke-based letterforms, and consistent branding across all touchpoints
**Time spent:** ~20 min

**What I learned:**
- SVG logos should use stroke-based letterforms for scalability and clean rendering at any size
- Removing background rectangles from SVGs makes them truly transparent — works on any page background
- When redesigning a logo, you must update every instance: favicon/icon SVG, PNGs (192, 512, apple-touch), OG image, and all inline SVGs in components
- `scripts/generate-icons.js` with sharp makes PNG regeneration from SVG trivial
- Inline SVGs in React need consistent proportions — the `viewBox` and `strokeWidth` must scale together
- Background containers (`bg-zinc-900 dark:bg-zinc-100`) on logo `<span>` elements are unnecessary when the SVG itself is the brand mark — removing them gives a cleaner, more professional look
- The 404 page also had the old logo — grepping for all logo instances across the codebase before a redesign prevents missed spots

**The process:**
1. Redesigned `icon.svg` — removed dark background rect, rebuilt G as stroke-based path with proper open-right arc and horizontal bar
2. Regenerated PNGs via `node scripts/generate-icons.js`
3. Updated inline SVGs in `page.tsx` header and footer
4. Updated `og-image.svg` with the new G design
5. Removed background containers from all 3 logo instances (header, footer, 404)
6. Verified: tsc clean, 71/71 tests pass, deployed to production

**Mistakes I made:**
- First logo design looked like a "C with a dot" instead of a "G" — had to iterate on the stroke paths to get the open arc + horizontal bar right
- Forgot to update the 404 page logo — caught it via grep before shipping

**Key insight:**
> "A logo redesign touches every file that references it. Use grep to find all instances before starting — SVGs, PNGs, inline components, OG images, manifest. Miss one and the brand looks inconsistent."

**Confidence level:** Can design stroke-based SVG logos, iterate on them, and propagate changes across an entire Next.js app

---

### Entry 028: Security Pentest & Hardening

**Date:** 2026-08-19
**Topic:** Full security audit of Grydex — reconnaissance, threat modeling, vulnerability discovery, and remediation across 48 API endpoints
**Time spent:** ~2 hours

**What I learned:**
- Cookie security: `document.cookie` in JavaScript CANNOT set `HttpOnly` — if you set session cookies client-side, XSS can always steal them. The fix is to set cookies server-side via `Set-Cookie` headers with `HttpOnly: true`
- Mass assignment: passing `request.json()` directly to an update function is dangerous if the function accepts fields like `plan_pagado_hasta`, `stripe_customer_id`, or `stripe_subscription_id`. Always whitelist allowed fields
- Tenant isolation must be applied to EVERY data model, not just the main entities. Etiquetas (labels) were global across all tenants — a schema migration adding `negocio_id` was needed
- Password change should invalidate ALL existing sessions, not just the current one. Otherwise a stolen session persists after the password reset
- Backups that include password hashes are a data leak vector — always strip sensitive fields
- Profile photo filenames are predictable (`{userId}-{random}.ext`) — even with random bytes, add an ownership check (user ID prefix validation)
- Content-Security-Policy header mitigates XSS impact — without it, any XSS has full DOM access
- Legacy cookie-based auth paths (like `gmail_tokens` fallback) are attack surface — remove them when DB-based storage is in place
- OAuth state signing should never fall back to a hardcoded key in production — enforce env vars

**The process:**
1. Mapped full attack surface: 48 API endpoints, 8 protected pages, auth flows, DB schema
2. Read EVERY backend file (auth, tenant, paywall, proxy, all API routes, DB schema/client, gmail, stripe, notifications)
3. Identified 12 vulnerabilities: 3 CRITICAL, 5 HIGH, 4 MEDIUM
4. Fixed 10 vulnerabilities in one pass (V-05 rate limiting deferred — needs serverless-compatible solution)
5. Verified: tsc clean, 71/71 tests pass, CSP header confirmed in production

**Mistakes I made:**
- Initially forgot that the select endpoint also needed server-side cookie setting (client was using `document.cookie`)
- The extract route had leftover references to `tokensCookie` and `getOAuth2ClientWithTokens` after cleanup — caught by tsc

**Key insight:**
> "A security audit isn't about finding one bug. It's about reading every file, understanding every trust boundary, and asking 'what if this control fails?' at every layer. The most dangerous vulnerabilities are the ones that chain together — XSS + non-HttpOnly cookies = full account takeover."

**Confidence level:** Can perform a systematic security audit of a full-stack Next.js app, identify vulnerabilities across auth, authz, data isolation, and configuration, and implement fixes

---

### Entry 029: Security Hardening — Rate Limiting, Audit Logging, Production Hardening

**Date:** 2026-08-20
**Topic:** Complete security hardening — wire in-memory rate limiting, account lockout, HIBP password breach check, security audit logging, CORS headers, production error handling, admin protections
**Time spent:** ~1.5 hours

**What I learned:**
- In-memory rate limiting with sliding window works on Vercel serverless because each invocation shares the same Node.js process (not truly ephemeral per-request). BUT on cold starts the store resets — acceptable tradeoff for this threat model
- HIBP k-anonymity is elegant: you only send the first 5 chars of the SHA-1 hash, never the full password. Even if HIBP is down, it should fail open (don't block registration)
- Account lockout should be email-based (not IP-based) because IPs can be shared behind NAT/VPN. Lockout should also reset after a quiet period
- Password breach check should run on: register, password change, and password reset — all three entry points for new credentials
- Session fingerprinting (IP + User-Agent hash) stored in the sessions table gives a detection signal for session theft, but should NOT hard-fail because legitimate users change IPs/User-Agents (mobile networks, browser updates). Log anomalies instead
- Rate limiting needs different configs per endpoint: login (5/15min), register (3/hr), password change (3/hr), extract (5/5min), export (10/5min), API key (60/min)
- Admin protection: prevent self-deletion, prevent self-role-downgrade, enforce minimum 1 active admin — these are business logic protections, not just auth checks
- CORS on Next.js is done via `headers()` in `next.config.ts` — can set per-path. The API routes need `Access-Control-Allow-Credentials: true` for cookie-based auth from same-origin
- Production error handling: `secureErrorResponse()` returns generic message in production, detailed in development — prevents stack trace leakage

**The process:**
1. Wired rate limiting into login, register, password change, extract, export, and all 4 v1 API routes
2. Wired account lockout into login (email-based, 5 failures = 15min lock)
3. Wired HIBP breach check into register and password change
4. Wired security audit logging into all auth events, admin actions, API key usage, exports, file uploads
5. Added admin protections: prevent self-deletion, prevent self-role-downgrade, enforce min 1 admin
6. Hardened upload validation with magic byte checking (trust bytes, not MIME type)
7. Added CORS headers to next.config.ts for `/api/*` paths
8. Added `secureErrorResponse()` to all error handlers to prevent stack trace leakage in production
9. Updated all v1 API routes with rate limiting + audit logging

**Files modified:**
- `src/app/api/auth/login/route.ts` — rate limit, lockout, breach check, fingerprint, audit
- `src/app/api/auth/register/route.ts` — rate limit, breach check, fingerprint, audit
- `src/app/api/auth/password/route.ts` — rate limit, breach check, audit
- `src/app/api/auth/photo/route.ts` — magic byte validation, audit
- `src/app/api/admin/usuarios/route.ts` — admin protections, audit
- `src/app/api/extract/route.ts` — rate limit, audit
- `src/app/api/facturas/export/route.ts` — rate limit, audit
- `src/app/api/v1/facturas/route.ts` — rate limit, audit
- `src/app/api/v1/facturas/[id]/route.ts` — rate limit, audit
- `src/app/api/v1/facturas/export/route.ts` — rate limit, audit
- `src/app/api/v1/stats/route.ts` — rate limit, audit
- `next.config.ts` — CORS headers for `/api/*`

**Mistakes I made:**
- Initially forgot to add `secureErrorResponse` to the extract route's catch block — would have leaked error messages in production

**Key insight:**
> "Security hardening isn't about one big fix — it's about systematically wiring defense-in-depth across every entry point. Rate limiting, breach checking, audit logging, and error sanitization are not optional features — they're baseline requirements. The in-memory approach is imperfect for serverless but appropriate for the threat model (single-region, non-critical SaaS)."

**Confidence level:** Can implement comprehensive security hardening with rate limiting, audit logging, breach detection, and production error handling across a full-stack Next.js application

---

### Entry 030: Pentest Phases 5-8 — Business Logic, Infrastructure, Client-Side, API Fuzzing

**Date:** 2026-08-21
**Topic:** Deep pentest across 4 attack surfaces — business logic flaws, infrastructure weaknesses, client-side vulnerabilities, and API-level attacks. 19 unique vulnerabilities found and fixed.
**Time spent:** ~2 hours

**What I learned:**
- **Cross-tenant auto-join is a critical architectural flaw.** When you auto-assign every new user to the only existing tenant, you've created an open membership model. Any signup gets full access to the victim's invoices, Gmail connections, and paid plan. The fix: registration should never auto-assign tenants — require explicit invitation.
- **Email-based admin identification is dangerous.** Gmail dot-stripping (`ian.maziel.romo@gmail.com` → `ianmazielromo@gmail.com`) meant anyone who registered the dot-variant could claim admin identity. Combined with `esEmailAdmin()` granting paywall bypass, this created permanent revenue bypass. The lesson: auth/entitlements must be role-based (DB), never email-matched against env vars.
- **OAuth state tokens prove integrity, not entitlement.** A signed state with `negocioId` proves the state wasn't tampered with — but doesn't prove the user making the callback actually owns that negocio. Always validate that `state.negocioId === session.user.negocio_id` in the callback.
- **Hardcoded fallback secrets are ticking time bombs.** `OAUTH_STATE_SECRET || GOOGLE_CLIENT_SECRET || "hardcoded-dev-string"` means any environment missing the var silently degrades to a public signing key. Fail hard at startup instead.
- **Backup endpoints are credential exfiltration vectors.** `SELECT * FROM cuentas_correo` in a backup downloads every user's Gmail OAuth tokens. Always strip sensitive columns.
- **Cross-tenant data dedup must be scoped.** `WHERE hash = ?` without `AND tenant = ?` leaks document existence across tenants and silently skips legitimate invoices.
- **Delete children before parents.** SQLite doesn't enforce FK cascades by default — deleting parent rows first orphans all children.
- **X-Forwarded-For is client-controlled.** On Vercel, only `x-real-ip` is trustworthy. IP-based rate limiting keyed on spoofable headers is theater.
- **CSV/formula injection is real.** A cell starting with `=WEBSERVICE(...)` executes when opened in Excel. Sanitize at export time.
- **Service workers cache authenticated pages forever.** Logout must send a message to clear caches, or the next visitor on a shared machine gets the previous user's data.

**Mistakes I made:**
- Initially forgot that removing `esEmailAdmin` would break 3 paywall tests — had to update test expectations to match the new role-based-only behavior
- The subagent tasks returned empty on first call — had to resume them to get actual findings

**Key insight:**
> "The most dangerous vulnerabilities aren't technical — they're architectural. Cross-tenant auto-join, email-based identity squatting, and OAuth state that proves integrity but not entitlement are design flaws that no amount of input validation can fix. You have to rethink the trust model."

**Confidence level:** Can perform deep pentest across business logic, infrastructure, client-side, and API surfaces. Can identify architectural trust model flaws, not just technical injection bugs. Can systematically fix vulnerabilities across 4 attack vectors in a single session.

---

### Entry 031: Pentest Phases 9-11 — Deep Auth, Data Exfiltration, Edge Cases & Chaining

**Date:** 2026-08-21
**Topic:** Deep pentest across authentication, data exfiltration paths, edge cases, and vulnerability chaining. 19 more vulnerabilities found and fixed (total: 50).
**Time spent:** ~2 hours

**What I learned:**
- **Email change without re-auth is the most dangerous account-level flaw.** A stolen session cookie → instant, permanent account takeover. The fix (require current password) is simple but critical — this is what separates a security audit from a code review.
- **CSV injection sanitization is only useful if it actually works.** The previous fix used `"'$&".slice(1)` which evaluates to `"$&"` — a regex backreference that returns the original string unchanged. The code looked correct, had a comment claiming it was fixed, and was completely inert. **Always write tests for security fixes.**
- **Attachment serving is a stored XSS delivery mechanism.** If an attacker can control the `mime_type` field (via crafted email attachment) and the server serves it inline with `Content-Type: attacker-controlled`, the attacker gets script execution on the app origin. MIME allowlisting + `nosniff` + `Content-Disposition: attachment` for unknown types is the defense.
- **Backup endpoints are the ultimate data exfiltration primitive.** One admin request → entire database including all tenants' invoice binaries. Strip `content` blobs, add rate limiting, add audit logging, and require re-authentication.
- **Cross-tenant JOIN leaks in child tables are silent.** `duplicados_potenciales` had no tenant filter on the "original" side of the join — the "duplicated" side was filtered but the "source" was global. Always filter BOTH sides of a JOIN.
- **XML entity expansion (billion laughs) is still a real attack.** `fast-xml-parser` with default settings processes entities. Set `processEntities: false` to block it.
- **Global UNIQUE constraints in multi-tenant databases break tenant isolation.** `UNIQUE(adjunto_hash)` across all tenants means tenant A's hash blocks tenant B from ever storing the same file. Handle gracefully in code + add per-tenant unique index.
- **Financial field validation at ingestion prevents downstream corruption.** Negative totals, broken IVA calculations, and manipulated amounts flow through to exports, stats, and accounting — validate at the door.

**Key insight:**
> "The difference between 'this looks secure' and 'this is secure' is often one line of code — the line that checks the right condition. A CSV escape function that doesn't actually escape anything is worse than not having one, because it creates false confidence. Always test security controls with adversarial inputs."

**Confidence level:** Can perform deep-dive pentest across auth flows, data exfiltration paths, edge cases, and vulnerability chains. Can identify and fix both obvious injection bugs and subtle logic flaws (broken sanitization, cross-tenant JOIN leaks, dead security code).

---

### Entry 032: Pre-Launch Comprehensive Hardening — 23 More Fixes (67 Total)

**Date:** 2026-08-24
**Topic:** Full pre-launch audit and hardening. Fixed 5 HIGH, 8 MEDIUM, 10 LOW. Session fingerprinting now active, all console.error leaks plugged, dead code removed.
**Time spent:** ~3 hours

**What I learned:**
- **Session fingerprinting without verification is security theater.** We spent time creating fingerprints at login and storing them, but never checked them. A stolen session cookie works from any device. The fix was simple — pass the current fingerprint to `getSessionUser()` and compare. Lesson: if you build a security control, verify it exists on every path that matters.
- **Dead code is a security liability, not just clutter.** Functions like `esEmailAdmin`, `handleCors`, `getCorsHeaders` were shipped but never called. They created false confidence ("CORS is handled") while the actual code paths had no CORS protection. Delete dead security code aggressively.
- **console.error with full error objects is an information disclosure vulnerability.** Error objects can contain tokens, PII, stack traces, database queries. Across 29 call sites, this was a massive leak surface. The `safeLogError` pattern (classify + truncate) is now mandatory.
- **Global UNIQUE constraints in multi-tenant schemas cause silent data loss.** Tenant B uploads the same PDF as Tenant A → insert fails → silently dropped → user told "already processed." The proper fix is per-tenant uniqueness + graceful handling. In SQLite, you can't DROP CONSTRAINT, so the app-level handling is critical.
- **Cookie maxAge must match session expiry.** Session expires in 7 days, but cookie lived 30 days = 23 days of a stale cookie that 404s on every request. Small mismatch, big user-facing bug.
- **Rate limit headers had a bug.** `X-RateLimit-Limit` was sending `resetAt` timestamp instead of the max request count. The `checkRateLimit` function didn't expose `max` in its result. Added it.
- **Substring matching for permissions is dangerous.** `permisos.includes("write")` matches `"read-write-all"`, `"write-only"`, etc. Exact match or explicit set membership is required.

**Key insight:**
> "The pre-launch security audit is where the gap between 'we did security' and 'we are secure' gets closed. Every dead code path, every unverified control, every raw error log is a gap. The audit found 23 issues that the initial pentest missed — not because they were hidden, but because the initial pass focused on injection/auth and missed logging, configuration, and dead code categories. A truly secure app needs multiple passes across different categories."

**Confidence level:** Can perform comprehensive pre-launch security audits covering auth, data isolation, logging hygiene, configuration hardening, dead code removal, input validation, and supply chain. Can coordinate parallel fixes across 37 files simultaneously.

---

## Project Portfolio

### Project 1: Gobernanza (Learning Management System)

**Stack:** [Your tech stack]
**What it does:** [Brief description]
**What I learned:** [Key skills gained]
**AI usage:** [How you used AI]

### Project 2: Facturas (Invoice Management)

**Stack:** Next.js 16, TypeScript, SQLite, Tailwind CSS 4
**What it does:** Multi-tenant invoice management with Gmail extraction, PDF/XML/CFDI parsing, real-time dashboard with charts, multi-account email connections
**What I learned:**
- Multi-tenant architecture with SQLite per-business databases
- CFDI (Mexican SAT) invoice parsing — namespaces, emisor/receptor, impuestos
- PDF parser import bug workarounds (`pdf-parse/lib/pdf-parse`)
- Confidence scoring tuned for business UX
- Cookie-based auth with HTTPS compatibility (SameSite/Secure)
- OAuth multi-account flow with DB token persistence
- Institutional email validation for feature gating
- Railway deployment: ephemeral storage, CDN caching, SSR rendering
- Stripe Checkout subscriptions + webhook grants (`invoice.paid` renewals)
- Full paywall with 402 gating and admin/owner bypass (`src/lib/paywall.ts`)
- Production-readiness audit: test vs live mode, subscribed webhook events, signature-secret verification (see Entry 024)
- Styled XLSX exports with `xlsx-js-style` (widths, header, zebra rows, money formats)
- Client-side downloads with user-defined filenames (`fetch` blob + `a[download]`)
- Multi-tenant security hardening: IDOR fixes on id-routed child reads (adjuntos, etiquetas, duplicados), signed OAuth state, register ownership (see Entry 025)
- Origin-aware back navigation via sessionStorage stack (see Entry 023)

**AI usage:**
- Created documentation suite
- Implemented verification workflows
- Applied explore→plan→code pattern
- Debugged deployment issues across full stack (code -> build -> CDN -> cookies -> browser)

---

## Prompt Library

### Effective Prompts I've Discovered

**For documentation:**
```
[Prompt that worked well for you]
```
**Context:** When to use this
**Result:** What it produces

**For code review:**
```
[Prompt that worked well for you]
```
**Context:** When to use this
**Result:** What it produces

---

## Mistakes Log

### Mistake 001: [Date]

**What went wrong:**
**Why it happened:**
**How I fixed it:**
**Lesson learned:**

---

## Goals

### Short-term (1 month)
- [ ] Complete 5+ prompt engineering examples
- [ ] Document 3 projects with process logs
- [ ] Create reusable templates

### Medium-term (2 months)
- [ ] Portfolio with 10+ documented examples
- [ ] Blog post about AI-assisted development
- [ ] Community contribution (answer questions, share learnings)

### Long-term (6 months)
- [ ] Recognized as competent AI engineer
- [ ] Job-ready skills demonstrated
- [ ] Professional network established

---

## Resources Used

- [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)
- Anthropic Cookbook
- Harness documentation
- [Add more as you discover them]

---

## Notes

### Things that help me learn:
- [Your learning style]
- [Best practices for you]

### Things that slow me down:
- [Challenges you face]
- [Areas to improve]

---

## 2026-08-24 — Pre-launch security/quality audit (facturas)

**Insight:** Full-codebase audits surface "fixed but not finished" patterns: `verifySessionFingerprint` exists and fingerprints are stored at login, but no request path ever verifies them. Same with the global `UNIQUE(adjunto_hash)` left in schema.ts after adding the per-tenant index — app code now works around a constraint that should have been migrated away.
**Lesson:** After each V-fix, grep for both halves of the fix (creation AND enforcement) before marking it done.

---

*Last updated: 2026-08-24*

---

## 2026-08-24 — MEDIUM/LOW security fixes batch (facturas)

**What:** Executed M3 (admin/usuarios role whitelist + PUT rate limiting), M6 (API key permisos exact match), L1/L2/L5/L7/L8/L9/L10/L13.
**Mistake fixed:** `src/lib/security.ts` was truncated mid-function (`safeLogError` missing closing brace) in the uncommitted working tree — tsc caught it as TS1005. Also: my first `esEmailAdmin` grep only covered `src/`, missing that a test file still imported it; grep scope must include tests/docs when deleting exports.
**Lesson:** After removing exports, run `tsc --noEmit` immediately — it is the authoritative "is anything still referencing this" check, faster and more reliable than manual greps.

---

## 2026-08-24 — V-45 rollout: safeLogError across API routes (facturas)

**What:** Replaced raw `console.error("...", error)` calls (full error objects) with `safeLogError(context, error)` across all route files under `src/app/api/`, plus `secureErrorResponse` now delegates to `safeLogError` internally instead of double-logging the raw error. PII fix: `/api/emails` no longer logs `cuenta.email`.
**Mistake fixed:** First `tsc --noEmit` run failed with TS1128 at security.ts EOF — file changed on disk mid-run (concurrent session in same working tree); brace-depth re-check was balanced and second run passed clean. Lesson: when multiple agents share a working tree, treat one-off syntax errors at EOF as possible read/write races, not real code bugs — verify before "fixing".
**Pattern:** Context strings follow the existing `secureErrorResponse` house style: short snake_case operation names (`facturas_stats`, `api_keys_toggle`). Merge new symbols into an existing `@/lib/security` import rather than adding a duplicate import line.
