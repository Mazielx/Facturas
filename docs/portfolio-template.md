# AI Engineering Portfolio Template

Template for showcasing your AI-assisted development skills.

---

## Portfolio Structure

### 1. Hero Section

**Name:** [Your name]
**Title:** AI-Assisted Development Engineer
**Focus:** [What you specialize in]

**One-liner:** "I build software faster and better using AI workflows and prompt engineering."

---

### 2. Case Studies (3-5 projects)

Each project follows this format:

---

#### Case Study: [Project Name]

**Problem:** What needed to be solved

**Context:**
- Tech stack: [List]
- Team size: [Solo/Team]
- Timeline: [Duration]
- Challenges: [Key difficulties]

**AI Workflow Used:**
```
1. Explore: [What you researched]
2. Plan: [How you broke down the work]
3. Code: [AI-assisted implementation]
4. Verify: [Quality checks]
5. Document: [What you recorded]
```

**Key Prompts:**
```yaml
# Prompt 1: [What it did]
- Input: [Your prompt]
- Output: [Result]
- Improvement: [What you changed]

# Prompt 2: [What it did]
- Input: [Your prompt]
- Output: [Result]
```

**Results:**
- Time saved: [Before vs After]
- Quality: [Bugs reduced, etc.]
- Skills gained: [What you learned]

**What I'd do differently:**
- [Reflection 1]
- [Reflection 2]

---

#### Case Study: Facturas (Multi-Tenant Invoice Management)

**Problem:** A business needs to automatically extract, categorize, and track invoices from Gmail, with real-time dashboards and multi-currency support. Users are non-technical business owners in Mexico.

**Context:**
- Tech stack: Next.js 16, TypeScript, SQLite (better-sqlite3), Tailwind CSS 4, Gmail API
- Team size: Solo developer + AI assistant
- Timeline: ~2 weeks
- Challenges: CFDI (Mexican SAT) XML parsing, ephemeral deployment storage, HTTPS cookie compatibility, multi-account Gmail OAuth, SSR-safe client preferences

**AI Workflow Used:**
```
1. Explore: Analyzed existing codebase, Gmail API docs, CFDI XML schema
2. Plan: Broke down into extraction pipeline, dashboard, auth, deployment
3. Code: AI-assisted implementation of parsers, API routes, UI components
4. Verify: 25 passing tests, TypeScript strict mode, build verification
5. Document: Learning log, prompt reference, deployment debugging notes
```

**Key Prompts:**
```yaml
# Prompt: Multi-email architecture
- Input: "Add functionality where a single business can connect up to 4 email accounts, 
  but only institutional emails, requires a payment plan"
- Output: New DB table, OAuth flow, institutional email validator, plan gating UI
- Improvement: Separated cookie-based (original) and DB-based (new) token storage

# Prompt: Deployment debugging  
- Input: "Login page register link not showing on Railway, credentials sometimes fail"
- Output: Cookie SameSite/Secure fix, SSR rendering fix, ephemeral storage diagnosis
- Improvement: Checked 5 layers: code -> build -> CDN -> cookies -> platform

# Prompt: Confidence threshold tuning
- Input: "The confidence analysis is too strict, most invoices show low confidence"
- Output: Reduced penalties, changed thresholds (0-33% baja, 33-66% media, 66-88% alta, 88%+ confiable)
- Improvement: Recalculated existing records in DB after threshold change

# Prompt: Theme switching
- Input: "Add theme selector (dark, light, system default) to the dashboard"
- Output: ThemeContext with localStorage, class-based Tailwind dark mode, inline SSR init script, ThemeToggle component across 7 pages
- Improvement: Extracted shared component first, avoided JSX.Element type error in React 19

# Prompt: Value-based pricing plans
- Input: "Investigate how much the manual work our app automates costs, propose a price, then create monthly/company plans (monthly, company, annual individual, annual company)"
- Output: Manual-cost research (Ardent/IOFM benchmarks + MX labor), 4 plans (Individual $199/$1,990, Empresa $499/$4,990), plans.ts registry, public /planes page, plan gating by email accounts
- Improvement: Anchored price to 10-20% of value saved; single plan registry importable from server + client; legacy plan mapping for backwards compatibility
```

**Results:**
- 25/25 tests passing
- Multi-tenant architecture supporting unlimited businesses
- CFDI, Facturae, UBL invoice format parsing
- Real-time dashboard with charts and currency conversion
- Deployed on Railway with HTTPS auth flow
- Multi-account Gmail connection with institutional email validation
- Dark/Light/System theme toggle with SSR-safe initialization
- Value-based pricing: 4 plans (Individual/Empresa x mensual/anual) with public pricing page and email-account plan gating

**What I'd do differently:**
- Would use PostgreSQL instead of SQLite from the start to avoid ephemeral storage issues on Railway
- Would implement cookie utils with SameSite/Secure from day one instead of retrofitting
- Would design the confidence scoring system with business stakeholders first, not mathematically

---

### 3. Skills Matrix

| Skill | Level | Evidence |
|-------|-------|----------|
| Prompt Engineering | Intermediate | Multi-email architecture, deployment debugging prompts |
| AI Workflow Design | Intermediate | explore→plan→code pattern applied consistently |
| Documentation | Intermediate | Learning log, prompt reference, case studies |
| Code Quality | Intermediate | TypeScript strict, 25 tests, lint passes |
| Deployment Debugging | Beginner+ | Railway HTTPS cookie + CDN cache + SSR diagnosis |
| Multi-Tenant Architecture | Intermediate | Single-DB with negocio_slug filtering, session auth, plan gating |
| SSR-Safe Client Features | Beginner+ | Theme toggle with localStorage, suppressHydrationWarning, inline init script |
| Database Migration | Intermediate | Sync better-sqlite3 → Async libsql/Turso, adapter pattern, zero-downtime call-site migration |

---

### 4. Prompt Examples

#### Example 1: Multi-Email Architecture

**Scenario:** User needs to connect multiple Gmail accounts to a single business, with institutional email validation and plan-based limits.

**Prompt:**
```
Add functionality where a single business can connect up to 4 email accounts,
but only institutional emails, and requires a payment plan to unlock this.

Requirements:
- New DB table for connected email accounts with OAuth tokens
- Validate emails are institutional (not Gmail, Yahoo, etc.)
- Plan-based limits (basico: 1, multi correo: 4)
- UI to manage connected accounts (add, list, remove)
- OAuth flow that stores tokens in DB instead of cookies
```

**Result:** Full multi-account system with DB token persistence, email domain validation, and plan gating UI.

**Why it works:** Specific requirements with constraints. Mentions what to validate, where to store data, and UI expectations.

---

#### Example 2: Deployment Debugging

**Scenario:** Login page works locally but fails on Railway deployment.

**Prompt:**
```
On https://facturas-production-b5e0.up.railway.app/login the register option
doesn't show and login credentials sometimes fail even when correct.

The dashboard runs locally on my machine. I think it's because the local
dashboard is not part of the Railway deployment, just a redirect.

Verify what's actually failing and fix it.
```

**Result:** Found 3 issues: cookies without SameSite/Secure, register gated behind mounted state, Railway ephemeral storage.

**Why it works:** Reports symptoms, provides URL, shares hypothesis, asks for verification before fixing.

---

### 5. Learning Journey

#### Key Milestones

| Date | Milestone | Impact |
|------|-----------|--------|
| 2026-07-15 | Built multi-tenant invoice extraction pipeline | Core product feature |
| 2026-07-18 | Implemented CFDI (Mexican SAT) parser | Supports 99% of Mexican invoices |
| 2026-07-20 | Created real-time dashboard with charts | Visual business intelligence |
| 2026-07-22 | Fixed HTTPS cookie auth for Railway deployment | Production-ready auth |
| 2026-07-22 | Added multi-email account system | Premium feature architecture |
| 2026-07-24 | Implemented dark/light/system theme toggle | SSR-safe cross-cutting concern |
| 2026-07-25 | Migrated DB layer from better-sqlite3 to Turso/libsql | Zero-cost cloud DB, async architecture |
| 2026-07-27 | Fixed 12 broken multi-tenant queries + extraction dedup | Systematic audit prevented 500 errors across 4 API routes |
| 2026-08-04 | Value-based pricing plans + public `/planes` page | Anchored pricing to manual-work cost; 4 plans, 2-months-free annual |
| 2026-08-05 | Subscription paywall gate (modal + server 402) | Blocks extract/export/connect for unpaid; reusable PlanModal |
| 2026-08-05 | Stripe Checkout + webhook auto-grants | Real MXN subscriptions; renewals extend `plan_pagado_hasta` via `invoice.paid` |

#### Mistakes That Taught Me

1. **mounted state hiding register link from SSR**
   - What happened: Added `useState(false)` gate to render register toggle
   - Why it happened: Thought it would prevent hydration mismatch
   - What I learned: Critical UI should render in SSR, not depend on client hydration
   - How I avoid it now: Always render important elements based on default state, use mounted only for URL params

2. **SQLite ephemeral storage on Railway**
   - What happened: Users lost accounts after every deploy
   - Why it happened: Assumed filesystem was persistent like local development
   - What I learned: Cloud platforms often have ephemeral storage — check before choosing DB
   - How I avoid it now: Always consider storage persistence in deployment architecture

3. **Broken multi-tenant queries on non-tenant tables**
   - What happened: Added `negocio_slug` column to `facturas` table, then queries on `lineas_factura`, `adjuntos`, `etiquetas` etc. started 500-ing because they also got `AND negocio_slug = ?` added
   - Why it happened: Assumed all tables should have the tenant column — didn't audit which tables actually have it
   - What I learned: When adding a multi-tenant column, grep the entire codebase for that column name and verify each query targets a table that actually has it
   - How I avoid it now: Always list which tables DO and DON'T have a column before adding it to queries

3. **Confidence thresholds too strict**
   - What happened: Most invoices labeled "low confidence" — bad for business UX
   - Why it happened: Optimized for mathematical purity instead of business needs
   - What I learned: Classification thresholds are a UX decision, not just math
   - How I avoid it now: Ask "what does the user expect to see?" before setting thresholds

4. **Client-only paywall (initially)**
   - What happened: Almost gated paid actions only in the frontend component
   - Why it happened: Thought a modal was enough to stop unpaid usage
   - What I learned: The modal is UX; the real gate is a 402 from the API route, so crafted requests can't bypass it
   - How I avoid it now: Always add a server-side check for paid features, with the client modal as a second layer

5. **Test checkout tied to the wrong business**
   - What happened: The user paid the Stripe test session but their business stayed locked — the session metadata pointed to `negocioId: 2` (my `acme-test` fixture), not their `mi-empresa`
   - Why it happened: I created the checkout for my fixture and assumed it would unlock "whoever pays"
   - What I learned: Payments unlock the business named in the session metadata, never "the payer" — when debugging "paid but locked", verify which tenant id is in the session metadata first
   - How I avoid it now: Confirm the active tenant's id before creating test checkouts; the `/api/checkout` route already uses `requireActiveTenant` so production sessions always carry the right `negocioId`

6. **Admin email mismatch from gmail dots**
   - What happened: The owner's admin email was configured as `ianmazielromo@gmail.com` but they log in as `ian.maziel.romo@gmail.com` — a naive comparison would silently strip their access
   - Why it happened: Gmail ignores dots in local parts
   - What I learned: Canonicalize emails (strip dots for gmail/googlemail) before comparing the admin exemption
   - How I avoid it now: `canonicalEmail()` + `esEmailAdmin()` in `src/lib/paywall.ts`, covered by unit tests

7. **Cramped Excel exports**
   - What happened: The XLSX export piled all text into narrow default columns — unusable at a glance
   - Why it happened: SheetJS community edition (`xlsx@0.18.5`) writes data only, no column widths or styles
   - What I learned: A styled export needs the `xlsx-js-style` fork, and you must test against the OOXML XML (Excel's output), because `XLSX.read` doesn't round-trip styles, widths, or number formats
   - How I avoid it now: Shared `src/lib/excel.ts` builder (widths, styled header, zebra rows, `#,##0.00` money formats, autofilter) used by both export routes, with XML-level tests

8. **Generic export filenames**
   - What happened: Every download was `facturas.xlsx` — they piled up in Downloads and looked unpolished
   - Why it happened: The server's `Content-Disposition` fixed the name; navigation-based downloads can't change it
   - What I learned: `fetch` the file as a blob and click an `<a download="name">` to let the user choose the saved filename (the anchor wins over the header); sanitize the input
   - How I avoid it now: `ExportFilenameModal` dialog with a dated default name, and a blob-download helper

---

### 6. Process Philosophy

**My approach to AI-assisted development:**
1. Explore before coding — understand the system, then plan, then implement
2. Verify after every change — lint, typecheck, test, build
3. Debug by layers — code, build, CDN, cookies, platform — the bug is rarely where you're looking

**What I believe makes good AI engineering:**
- Specific prompts with constraints produce better code than vague requests
- Documentation of process matters as much as documentation of results
- Deployment debugging requires thinking across the full stack, not just the code layer

---

### 7. Contact

**Email:** [your@email.com]
**GitHub:** [github.com/yourusername]
**LinkedIn:** [linkedin.com/in/yourusername]
**Portfolio:** [your-portfolio.com]

---

## Case Study: Launch Readiness for a SaaS Subscription Product

**Project:** Facturas — SaaS invoice app with paywall and email ingestion
**Role:** Full-stack developer + product owner
**Milestone:** Signup flow + subscription billing hardened for real customers

**What I did:**
- Fixed a role-mismatch bug that blocked every new customer: the "create business" form was visible to all users but its API was admin-only (403 dead end); made it owner-assigning for any authenticated user
- Extended the Stripe webhook to the full billing lifecycle: `invoice.payment_failed` (dunning) and `customer.subscription.deleted` (cancellation) now revoke access and email the business
- Made billing resilient by resolving the owning business via three fallbacks (subscription id → session metadata → customer id)
- Exempted admin/owner from plan account limits without bypassing the paywall
- Purged test subscriptions and fixture data before launch

**Result:** A brand-new user can sign up, create their business, and hit the paywall at the correct plan gate — verified live against production.

**Skills demonstrated:** auth/role gating, webhook lifecycle design, data cleanup, pre-launch QA.

---

## Case Study: Public Marketing Site for a SaaS

**Project:** Facturas — SaaS invoice app with paywall and email ingestion
**Role:** Full-stack developer + product owner
**Milestone:** Built the public marketing surface so the product can be advertised

**What I did:**
- Audited the deployed app and found `/` and `/pricing` both redirected to the login screen — the product was invisible to strangers
- Restructured routes: marketing landing at `/`, authenticated app at `/dashboard` (landing server-redirects signed-in users back to the app)
- Built a landing page with hero, how-it-works, features, and pricing preview, reusing the app's design system
- Exposed `/planes` publicly (it already existed) and added a `/pricing` marketing alias
- Made the middleware allowlist testable (`isPublicPath`/`isPublicApiPath`) with unit tests
- Re-pointed every auth redirect and in-app link to the new dashboard URL

**Result:** `/`, `/pricing`, and `/planes` are now public and ad-ready; protected routes still require a session. Verified live in production.

**Skills demonstrated:** route architecture, auth-adjacent middleware, marketing UX, SEO metadata, pre-advertising QA.

---

## Case Study: Product Branding (Name + Domain)

**Project:** Facturas → **En Regla** — SaaS invoice app with paywall and email ingestion
**Role:** Product + brand + full-stack developer
**Milestone:** Gave the product a commercial identity ready to advertise

**What I did:**
- Shortlisted 15 candidate names across everyday-language themes (verbs, accounting words, common phrases)
- Verified real domain availability via RDAP (registry API) instead of guesswork; found `enregla.mx`, `cuadre.mx`, `factua.mx`, `remite.mx` all available
- User chose **En Regla** ("todo en regla" — everything in order)
- Centralized branding in `src/lib/brand.ts` and applied it to metadata, landing page, auth screens, settings, billing emails, and exported Excel sheets
- Kept the feature name "facturas" (invoices) distinct from the brand name throughout the codebase

**Result:** The app now presents a consistent, memorable brand across every surface — verified live in production (title tag, logo, landing, pricing).

**Skills demonstrated:** brand naming, domain research, design-system consistency, careful find-and-replace scoping.

---

## Case Study: Mobile Responsiveness Pass

**Project:** En Regla — SaaS invoice app with paywall and email ingestion
**Role:** Frontend developer
**Milestone:** Made the public + app UI hold up on a phone

**What I did:**
- Audited without a browser: confirmed every `<table>` sits inside an `overflow-x-auto` wrapper (scroll, not break)
- Found the real failure point: header flex rows with 4+ controls overflow a 360px phone
- Fixed 4 headers (landing, dashboard, invoice list, invoice detail) with a reusable pattern: `flex-wrap gap-2` on the container, `min-w-0 truncate` on titles, `flex-wrap justify-end` on action groups, `hidden sm:block` on secondary CTAs
- Verified: tsc clean, ESLint only the pre-existing warning, 71/71 tests, deployed, 200 in prod

**Result:** Pages now wrap gracefully on narrow screens instead of overflowing; tables scroll horizontally.

**Skills demonstrated:** responsive layout debugging, Tailwind utility mastery, browser-free visual QA.

---

## Case Study: Dynamic Back Navigation (Site-Wide History Memory)

**Project:** En Regla — SaaS invoice app with paywall and email ingestion
**Role:** Frontend developer
**Milestone:** Every "back" arrow now returns to the page the user actually came from

**What I did:**
- Audited the app: 9 back arrows were hardcoded links ("← Inicio" → `/dashboard`, "← Volver" → `/login`), so back always landed on a fixed page regardless of origin
- Built a site-wide navigation memory: a null-rendering `NavMemory` component in the root layout watches `usePathname` and flags the first in-app navigation in `sessionStorage`
- Created a reusable `BackLink` component that delegates to `router.back()` (native, handles repeated backs) when in-app history exists, else falls back to each page's natural home
- Replaced all 9 back links across planes, login, facturas, invoice detail, account, company, settings, and admin
- Kept `?from=` only where it powers the post-login redirect (subscribe button 401 → login → back to the page), and wrapped the layout tracker in `<Suspense>` so prerendered routes stay static
- Verified: tsc clean, ESLint no new errors, full `next build` passes

**Result:** Back from `/planes` returns to landing; back from the app pages returns to wherever the user was (dashboard, invoice list, etc.); direct visits still get a sensible default instead of an unexpected login screen.

**Skills demonstrated:** origin-aware UX, browser-history navigation, client-component patterns in Next.js App Router, reusable UI primitives.

---

## Portfolio Platforms

- **GitHub**: Code + READMEs (show technical skill)
- **Personal site**: Case studies (show communication)
- **LinkedIn**: Professional narrative (show growth)
- **Blog/Medium**: Deep dives (show expertise)

---

## What Recruiters Look For

1. **Technical competence** - Code quality, patterns
2. **Problem-solving** - How you approach challenges
3. **Communication** - Can you explain your process?
4. **Learning velocity** - How fast you improve
5. **Initiative** - Do you build things on your own?

---

## Tips

1. **Show process, not just results** - "How" matters more than "What"
2. **Be honest about mistakes** - Shows growth mindset
3. **Quantify when possible** - "Saved 50% time" > "Made it faster"
4. **Update regularly** - Shows active learning
5. **Keep it concise** - Recruiters skim, not read

---

*Template by: Ian Maziel*
*Last updated: 2026-08-12*
