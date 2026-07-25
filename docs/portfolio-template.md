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
```

**Results:**
- 25/25 tests passing
- Multi-tenant architecture supporting unlimited businesses
- CFDI, Facturae, UBL invoice format parsing
- Real-time dashboard with charts and currency conversion
- Deployed on Railway with HTTPS auth flow
- Multi-account Gmail connection with institutional email validation
- Dark/Light/System theme toggle with SSR-safe initialization

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
| Multi-Tenant Architecture | Intermediate | SQLite per-business DBs, session auth, plan gating |
| SSR-Safe Client Features | Beginner+ | Theme toggle with localStorage, suppressHydrationWarning, inline init script |

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

3. **Confidence thresholds too strict**
   - What happened: Most invoices labeled "low confidence" — bad for business UX
   - Why it happened: Optimized for mathematical purity instead of business needs
   - What I learned: Classification thresholds are a UX decision, not just math
   - How I avoid it now: Ask "what does the user expect to see?" before setting thresholds

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
*Last updated: 2026-07-24*
