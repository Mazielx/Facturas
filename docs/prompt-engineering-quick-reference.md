# Prompt Engineering Quick Reference Card

Cheat sheet for effective AI prompts. Keep this open while working.

---

## The 5W Framework

Every good prompt has:

| Element | Question | Example |
|---------|----------|---------|
| **Who** | Role for AI | "You are a senior backend engineer" |
| **What** | Clear task | "Review this code for security issues" |
| **Why** | Context/purpose | "This handles user authentication" |
| **When** | Constraints | "Before deploying to production" |
| **How** | Output format | "Return a checklist with severity levels" |

---

## Prompt Templates

### Code Review
```
Review this [language] code for:
1. Security issues
2. Performance problems
3. Code style violations

Context: [What the code does]

Output format: Checklist with severity (Critical/Warning/Info)
```

### Bug Investigation
```
Investigate why [symptom] is happening.

Current behavior: [What's wrong]
Expected behavior: [What should happen]
Relevant files: [List files]

Please:
1. Identify root cause
2. Suggest fix
3. List files to change
```

### Feature Implementation
```
Implement [feature] in [language/framework].

Requirements:
- [Requirement 1]
- [Requirement 2]

Constraints:
- [Constraint 1]
- [Constraint 2]

Output: Production-ready code with tests
```

### Documentation
```
Document [what] for [audience].

Include:
1. Overview (2-3 sentences)
2. Key concepts
3. Usage examples
4. Common pitfalls

Tone: [Professional/Casual/Technical]
```

### Learning Explanation
```
Explain [topic] like I'm a [level] developer.

Assumptions:
- I know [what you know]
- I don't know [what you don't know]

Format: Step-by-step with examples
```

---

## Before/After Examples

### ❌ Bad Prompt
```
Fix this code
```

### ✅ Good Prompt
```
Fix this TypeScript code that's throwing "Cannot read property 'id' of undefined" error.

The error happens when user is not logged in. 

Expected: Show login page
Actual: App crashes

Files: src/app/page.tsx, src/lib/auth.ts
```

---

### ❌ Bad Prompt
```
Make this better
```

### ✅ Good Prompt
```
Optimize this database query for performance.

Current query takes 2+ seconds on 10k records.
Goal: Under 100ms response time.

Current code:
[paste code]

Consider:
- Indexes
- Query structure
- Caching opportunities
```

---

### ❌ Bad Prompt
```
Write tests
```

### ✅ Good Prompt
```
Write unit tests for this function:

[paste function]

Cover these cases:
1. Happy path (valid input)
2. Edge cases (null, empty, boundary values)
3. Error handling (invalid input)

Framework: Vitest + @testing-library/react
```

---

## Power Techniques

### 1. Chain of Thought
```
Think step by step before answering:
1. What's the problem?
2. What are possible solutions?
3. Which is best and why?
4. What are risks?
```

### 2. Few-Shot Examples
```
I want output in this format:

Example 1:
Input: "user login"
Output: "Feature: User authentication"

Example 2:
Input: "password reset"
Output: "Feature: Password recovery"

Now do: "email notifications"
```

### 3. Constraints
```
Rules:
- Max 200 words
- No code, only explanation
- Include 3 concrete examples
- Beginner-friendly language
```

### 4. Self-Reflection
```
After generating, evaluate:
1. Did I answer the question?
2. Is this production-ready?
3. What did I miss?
4. What would you improve?
```

---

## Common Patterns

### Refactoring
```
Refactor this [code] to be more [readable/maintainable/performance].

Current issues:
- [Issue 1]
- [Issue 2]

Keep the same functionality, but improve [specific aspect].
```

### Debugging
```
Debug this error: [error message]

What I've tried:
- [Attempt 1]
- [Attempt 2]

Relevant context: [Context]

Please identify root cause and fix.
```

### Learning
```
I want to learn [topic].

My current level: [Beginner/Intermediate/Advanced]
My goal: [What I want to achieve]
My timeframe: [How much time I have]

Please create a learning plan.
```

### UI Refinement (Progressive Disclosure)
```
The [page] has too many inputs visible at once.
Change it so [field] is hidden by default.
Show it only when user clicks a "[Button label]" button.
Each section needs its own save/cancel flow.

Current state: [What it looks like now]
Desired state: [What it should look like]
```
**Context:** Settings pages with rarely-changing fields
**Result:** Less cognitive load, cleaner UI

### Deployment Debugging (Layer-by-Layer)
```
[Feature] works locally but fails on [platform].

Check these layers in order:
1. Code correctness (compiles? types right?)
2. Build artifacts (is deployed build current?)
3. Cookie/header handling (SameSite, Secure)
4. CDN caching (stale version?)
5. Platform issues (ephemeral storage, env vars)
```
**Context:** Feature works on localhost but breaks in production
**Result:** Systematic debugging instead of guessing

### Iterative Threshold Tuning
```
The [scoring] system is too [strict/lenient].
Currently: [Thresholds and their effect]
User feedback: [What user sees]

Adjust so:
- [Expected for X% of cases]
- [Expected for Y% of cases]

Recalculate existing records after.
```
**Context:** Scoring labels don't match business expectations
**Result:** Thresholds tuned to real-world usage

---

## Quick Fixes

| Problem | Solution |
|---------|----------|
| AI gives too much detail | Add "Be concise, max 3 sentences" |
| AI is too generic | Add specific context/constraints |
| AI misses the point | Rephrase with concrete example |
| AI output is wrong format | Show desired format explicitly |
| AI makes assumptions | State assumptions clearly |

---

## Pattern: SSR-Safe Client Features

When adding client-side features to Next.js that need to persist state (like theme, language):

```
Problem: "Add dark mode toggle that persists across page loads"

Correct approach:
1. Inline <script> in layout.tsx <head> that reads localStorage BEFORE React
2. suppressHydrationWarning on <html> to prevent SSR mismatch
3. React context (ThemeProvider) that syncs state + localStorage + DOM class
4. Extract shared component FIRST, then add to all pages

Common mistake: Using useEffect to set initial theme — causes flash of wrong theme
```

---

## Pattern: Dynamic Back Navigation (History Memory)

When a page's "back" arrow must return to where the user actually came from, not a hardcoded page:

```
Problem: "Back from /planes should return to landing if the user came from landing, to dashboard if they came from the app"

Correct approach:
1. Router.back() is native dynamic back — delegate to browser history
2. Track "has in-app history" with a sessionStorage flag set by a layout-level path tracker
   (NavMemory client component watching usePathname; first navigation sets the flag)
3. BackLink click handler: if flag set && history.length > 1 → router.back(); else router.push(fallback)
4. Give each page a sensible fallback for direct visits (landing "/" for /planes, /dashboard for app pages)
5. Wrap the layout tracker's usePathname in <Suspense> so prerendered routes stay prerendered
6. Keep ?from=<path> ONLY for post-login redirects, not for the back link

Common mistakes:
- Hardcoding "← Iniciar sesion" → /login as the back link
- Encoding the origin into every link (?from=) when the browser already remembers history
- Storing a single "previous path" slot — loops when the user backs out twice (login → planes → back → login)
```

---

## Database Migration Patterns

### Pattern: Sync-to-Async Adapter Layer

**When:** Migrating from synchronous ORM/driver (better-sqlite3) to async cloud DB (Turso/libsql)

**Wrong approach:** Change every call site simultaneously
- Massive diff, impossible to review
- Breaks everything at once, hard to bisect

**Correct approach:**
1. Create an adapter (`client.ts`) that wraps the new async client
2. Make the adapter accept the OLD calling convention (e.g., named params `{ "1": val }`) and convert internally
3. Change function signatures from sync to async one module at a time
4. Use `replaceAll` for mechanical renames (e.g., `db.prepare(` → `await dbAll(`)
5. Test after each module migration, not after all

**Key insight:** Keep the interface compatible with existing consumers, then migrate consumers incrementally.

**Common mistake:** Changing the adapter's parameter format to match the new DB's native format — forces you to update ALL callers at once.

### Pattern: Multi-Tenant Column Audit

**When:** Adding a tenant-scoping column (like `negocio_slug`) to one table and need to verify it wasn't accidentally added to queries on OTHER tables

**Wrong approach:** Search for the column name and manually check each occurrence
- Easy to miss queries in nested files
- Tedious and error-prone

**Correct approach:** Use an explore agent with explicit list of tables that DO and DON'T have the column:
```
Find ALL SQL queries that reference `negocio_slug` on tables that DON'T have that column.
Tables WITH the column: facturas
Tables WITHOUT: lineas_factura, adjuntos, etiquetas, duplicados_potenciales, etc.
Return exact file paths, line numbers, and full SQL query for each broken reference.
```

**Key insight:** When adding a multi-tenant column to one table, do a full codebase grep for that column name to find all queries that might have incorrectly adopted it on OTHER tables. A single audit pass prevents dozens of broken endpoints.

---

### Pricing / Value Research

```
Research how much [manual task] costs [region, currency].
Requirements:
- Time per unit (use industry benchmarks, e.g. Ardent Partners/IOFM/APQC if relevant)
- Labor cost per hour (local salary source, add ~30% for employer burden)
- Full cost including errors/rework/filing
- Price anchor = 10-20% of the value the customer saves
- Competitor comparison for calibration
Return: a table by volume, then proposed price points.
```

**Key insight:** Price SaaS by the value of the manual alternative, not by cost of goods. Keep plan data in one pure module (no server-only imports) so both server and client code can import it; always map legacy plan values for backwards compatibility and add new public pages to the proxy `publicPaths`.

---

### Pattern: Subscription Paywall Gate (Modal + 402)

**When:** Blocking paid actions (extract, export, connect accounts) for users without an active plan

**Wrong approach:** Gate only in the client component
- A crafted request still hits the API and runs the expensive action

**Correct approach:** Two layers — client modal for UX + server 402 for enforcement:
```
Server: in each paid API route, right after tenant/auth check:
  if (!isSuscripcionActiva(negocio.plan_pagado_hasta)) return 402 { error: "..." }
Client: pre-check before the fetch opens the modal; handle res.status === 402 the same way.
```
Keep a pure helper `isSuscripcionActiva` in the plan module so routes, components and tests share one definition of "active". Store "paid until" as a nullable column; add it with a guarded `ALTER TABLE` (PRAGMA table_info existence check) since `CREATE TABLE IF NOT EXISTS` never alters existing tables.

**Key insight:** The modal is UX, the 402 is the real paywall. Gate only the actions that cost money to run.

### Pattern: Full Paywall with Admin/Owner Bypass

**When:** All features (not just the expensive ones) must be locked until payment, while the app owner keeps full access without subscribing

**Wrong approach:** Copy-paste `isSuscripcionActiva` checks into every route
- Adding the admin exemption later means touching N files; easy to miss one

**Correct approach:** One policy helper + consistent 402s:
```
src/lib/paywall.ts
  canonicalEmail(e): strip dots for gmail/googlemail
  esEmailAdmin(e): canonicalEmail(e) === canonicalEmail(ADMIN_EMAIL)
  isAccesoCompleto({ email, role, planPagadoHasta }):
      true if role === 'admin' || esEmailAdmin(email) || isSuscripcionActiva(planPagadoHasta)
```
- Every route passes what it has; routes with a user session call `isAccesoCompleto`, API-key routes (`/api/v1/*`) have no user so they use `isSuscripcionActiva(negocio.plan_pagado_hasta)`
- Expose `planActivo: boolean` on `/api/negocios*` and `/api/cuentas-correo` so the UI renders a locked banner without re-deriving policy
- Client: `if (res.status === 402) setShowPlanModal(true)` and disable buttons when `!negocio.planActivo`

**Key insight:** Grant access per logged-in user (role or owner email) but grant *payment* per business (Stripe session metadata) — a test checkout tied to the wrong `negocioId` unlocked the wrong tenant. Canonicalize gmail before comparing admin emails or the owner's bypass silently breaks.

---

### Pattern: Stripe Checkout + Webhook Grant

**When:** Making a paywall collect real payments and grant access automatically

**Wrong approach:** Setting access directly at checkout creation
- You never learn about renewals or cancellations; access would expire without updates

**Correct approach:** Subscription session + webhook events:
```
POST /api/checkout  ->  stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{ price_data: { currency: 'mxn', unit_amount: precio*100,
                recurring: { interval: month|year } } }],
  subscription_data: { metadata: { negocioId, planId } }   // THE contract
})
POST /api/webhooks/stripe (public, signature-verified):
  checkout.session.completed -> store customer/subscription ids + plan
  invoice.paid               -> grant plan_pagado_hasta = period.end  (fires on renewals too)
```
Read plan context from `invoice.parent.subscription_details.metadata`. Use `stripe.webhooks.constructEvent` + `STRIPE_WEBHOOK_SECRET`. Never trust the payload without the signature. Test with `sk_test_` keys + card `4242 4242 4242 4242`.

**Key insight:** Subscription metadata is the contract between Checkout and the webhook; renewals arrive as `invoice.paid`. Verify the installed stripe-node types before coding (fields like `subscription_details` moved to `invoice.parent.*`).

### Pattern: Styled XLSX Export (Spreadsheet That Looks Professional)

**When:** Users complain exports are cramped ("se amontonan los textos") — text piles into narrow default-width columns

**Wrong approach:** `XLSX.utils.json_to_sheet(data)` from SheetJS community (`xlsx@0.18.5`)
- Writes cells with no column widths, no header, no formats — default column width for everything

**Correct approach:** Use `xlsx-js-style` (drop-in fork) and a shared builder:
```
src/lib/excel.ts  buildFacturasWorkbookBuffer(sheetName, columns, rows)
  columns: { header, key, width, type?: 'money' | 'text' }[]
  ws['!cols']  = columns.map(c => ({ wch: c.width }))     // spacing per column
  ws['!autofilter'] = { ref }                             // sortable/filterable
  header cell.s = { font:{bold,color:FFFFFF}, fill:{fgColor:1F4E78}, alignment:{center} }
  body cell.s  = zebra fill F2F2F2, wrapText for text, right align for money
  money cell.z = '#,##0.00'  (coerce DB string amounts to numbers first)
  return ArrayBuffer  // Next Response accepts ArrayBuffer, not Buffer
```
Verify features survive a round trip: unzip the buffer and check `xl/worksheets/sheet1.xml` + `xl/styles.xml`, because `XLSX.read` does NOT round-trip `!cols`, `z`, or fonts. `!freeze` is ignored by this fork. Colors are written as ARGB (`FF1F4E78`).

**Key insight:** The styled fork shares SheetJS's API; test against the real OOXML, not the JS read-back. A shared column-spec helper keeps both web and `/api/v1` exports consistent.

### Pattern: User-Defined Download Filename

**When:** Every export is named `facturas.xlsx` and files pile up / look unprofessional

**Wrong approach:** `window.location.href = '/api/facturas/export?...'`
- The saved name is whatever `Content-Disposition` says — always the same, can't be changed

**Correct approach:** Ask the name in a dialog, then download client-side:
```
handleExport -> open dialog (default: `facturas-<YYYY-MM-DD>`)
downloadExport(name):
  res = await fetch(`/api/.../export?${params}`)      // same-origin sends cookies
  blob = await res.blob()
  a = document.createElement('a')
  a.download = sanitize(name) + '.' + format           // sanitize \/:*?"<>|, fallback
  URL.createObjectURL(blob); a.click(); revokeObjectURL
```
Reset the dialog input by remounting it with `key={openState}` instead of `setState` in an effect (avoids `set-state-in-effect` lint). Handle `res.status === 402` → PlanModal like any other gated call.

**Key insight:** The server names the attachment, but `a[download]` overrides it in the browser — fetching as a blob hands the filename decision to the user.

---

## Context Management

### When to start fresh (/clear):
- Switching to unrelated task
- Context feels cluttered
- AI seems confused
- After 30+ minutes of work

### When to continue conversation:
- Building on previous work
- Related changes to same feature
- Need to reference earlier decisions

---

## Pre-launch checklist prompts

Run these before shipping a feature that real customers will touch:

- "Verify the role-gated API matches the role-gated UI: reproduce the flow as a brand-new non-admin user"
- "Walk the full webhook lifecycle for this event, not just the happy path (payment_failed, subscription.deleted, cancellation)"
- "Check limits apply to admins too — full access without a subscription should still respect plan limits or explicitly exempt them"
- "Purge fixture/test data and test subscriptions before going live"

## Public-site audit prompts

- "Curl every route unauthenticated and list what returns 200 vs 307-to-login; report the public surface"
- "Add a marketing alias route and confirm it's in the proxy allowlist, or it will redirect to login"
- "After moving a page, grep the whole repo for redirectTo, href, router.push, and window.location that still target the old URL"
- "Before advertising: is there a public landing page and a public pricing page, or does an ad click land on a login screen?"

## Naming and branding prompts

- "Verify domain availability with RDAP, not DNS: curl -L https://rdap.org/domain/name.tld (404 = available, 200 = registered)"
- "Centralize the brand name in src/lib/brand.ts and import it everywhere; never hardcode the app name"
- "Grep for the brand with boundary patterns (>Brand<, 'Brand') so feature names that coincidentally match stay untouched"
- "When the domain changes, audit: Google OAuth redirect URI, Stripe webhook/return URLs, and absolute SITE_URL env vars"
- "Before sharing links on social media, add Open Graph + Twitter card metadata (metadataBase, openGraph, twitter) and verify og:title live"
- "Verify whether a custom vercel.app alias is actually public (curl it) — deployment protection can put it behind a Vercel SSO wall"

## Mobile-responsiveness audit prompts

- "Audit tables for mobile: find every `<table>` and confirm each is inside an `overflow-x-auto` wrapper so it scrolls instead of breaking the page"
- "Read every header row for control count: a `justify-between` flex row with 4+ controls overflows a 360px phone"
- "Fix crowded headers with `flex-wrap gap-2` on the container, `min-w-0 truncate` on the title, `flex-wrap justify-end` on the action group, and `hidden sm:block` for secondary CTAs"
- "Verify the fix without a browser: tsc, lint the changed files only, run tests, deploy, then curl for 200"

## Stripe production-readiness prompts

- "Run `stripe config --list` and report the account mode: is `Live mode key` available, or is this a sandbox/test-only account?"
- "List `stripe webhook_endpoints` and diff `enabled_events` against the events the webhook route switches on — if the handler covers more than the subscription, add the missing events with `stripe webhook_endpoints update <id> --enabled-events ...`"
- "Verify the production webhook secret without the dashboard: sign a fake event with the local secret (`t=<ts>,v1=HMAC-SHA256(secret, '<ts>.<body>')`) and POST to the live webhook URL; 200 `received:true` means the env secrets match, 400 'Firma invalida' means they don't"
- "Confirm webhook delivery with `stripe trigger <event>` + `vercel logs <url>`, and remember the log line only proves the function ran — it does NOT show the response status"

## Multi-tenant security audit prompts

- "For every API route that takes an `:id` and reads a CHILD table (adjuntos, etiquetas, duplicados, lineas), verify the PARENT row belongs to the tenant — `JOIN facturas fo ON fo.id = child.factura_id AND fo.negocio_slug = ?` — before returning anything; enumerating ids must not leak another tenant's rows"
- "When a join/mapping table is global by design, check BOTH sides of every relation for the tenant predicate (a duplicate-pair table must link same-tenant invoices only)"
- "Treat OAuth `state` as untrusted input: sign it (`payload.sig` = base64url JSON + HMAC-SHA256 with expiry) at mint time and verify in the callback; derive the key from an existing production secret so no new env var is required"
- "Never use a client-supplied email in a WHERE clause for token/account writes — fetch the Google-verified email from /oauth2/v2/userinfo and use that"
- "Re-run a focused audit with explicit 'already-fixed issues are excluded' when a previous audit report was truncated — recovered findings are usually HIGH severity"
- "Check that account creation assigns ownership (negocio_id) at insert time; a user created with `negocio_id = null` fails every tenant gate forever"
- "An audit script over `:id` routes + a signed-state OAuth helper is the difference between 'auth works' and 'data is actually isolated'"

## SVG logo design prompts

- "Redesign this SVG logo: remove background rectangles, use stroke-based letterforms for scalability, iterate on paths until the letter reads correctly at 16px and 512px"
- "After a logo redesign, grep the entire codebase for every logo instance (inline SVGs, `<img>` tags, manifest.json, OG images) before shipping — miss one and the brand looks inconsistent"
- "Regenerate PNGs from updated SVG via sharp script, then update all inline React SVG components with matching viewBox and strokeWidth ratios"

---

*Last updated: 2026-08-19*
