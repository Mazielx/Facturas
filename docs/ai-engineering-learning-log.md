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

*Last updated: 2026-07-24*
