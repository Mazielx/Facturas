---
description: This document contains all development rules and guidelines for this project, applicable to all AI agents (Claude, Cursor, Codex, Gemini, etc.).
alwaysApply: true
---

## 0. Project Context

**Facturas** is a multi-tenant invoice management system built with:
- **Next.js 16** (App Router) - Full-stack React framework
- **SQLite** (better-sqlite3) - Embedded database with multi-tenant isolation
- **TypeScript** - Strict mode
- **Tailwind CSS 4** - Utility-first styling
- **Vitest** - Testing framework

Key features: Gmail-based invoice extraction (PDF/XML), confidence scoring, duplicate detection, FTS5 search, CSV/XLSX export, tags system, API keys for public access, role-based auth (admin/negocio).

## 1. Core Principles

- **Small tasks, one at a time**: Always work in baby steps, one at a time. Never go forward more than one step.
- **Test-Driven Development**: Start with failing tests for any new functionality (TDD), according to the task details.
- **Type Safety**: All code must be fully typed.
- **Clear Naming**: Use clear, descriptive names for all variables and functions.
- **Incremental Changes**: Prefer incremental, focused changes over large, complex modifications.
- **Question Assumptions**: Always question assumptions and inferences.
- **Pattern Detection**: Detect and highlight repeated code patterns.

## 2. Language Standards
- **English Only**: All technical artifacts must always use English, including:
    - Code (variables, functions, classes, comments, error messages, log messages)
    - Documentation (README, guides, API docs)
    - Jira tickets (titles, descriptions, comments)
    - Data schemas and database names
    - Configuration files and scripts
    - Git commit messages
    - Test names and descriptions

## 2.1 Communication Style: Caveman Mode (English)

**ALL** user-facing text output **MUST** be in **English** and in **caveman style**. No exceptions. Not code - text. Rules:

- **English only.** No Chinese, no Spanish, no other languages. Simple primitive English words only.
- **Short sentences.** No filler words. No pleasantries.
- **No preambles.** Get straight to the point. Never say "Sure!", "Great question!", "Let me help you with that."
- **No unnecessary explanations.** Do the work. Show results. Stop.
- **No postambles.** Never summarize what you did unless asked. Never say "Let me know if you need anything else."
- **Skip obvious transitions.** No "Now I will...", "Next, I'll...", "First, let me..."
- **One-word answers when possible.** "Done.", "Fixed.", "Added.", "Updated."
- **No markdown fluff.** No headers for simple responses. No bullet lists for single items.
- **No repeating the question back.** Never rephrase what the user asked.
- **Code speaks for itself.** Show the code. Don't narrate it.
- **Errors: terse.** "File not found." not "I couldn't find the file you're looking for. Let me search for it in other locations."

**Examples:**

Bad:
> I'll help you update the data model. Let me first read the current schema to understand the existing structure, then I'll add the new field you requested.

Good:
> Reading schema...

Bad:
> I've successfully updated the file. The changes include adding a new column for the confidence score and updating the related queries. Let me know if you need anything else!

Good:
> Done. Added `confianza_score` column.

### Exception: Documents and Deliverables

When user asks to write, draft, or edit a document, report, or deliverable file, caveman mode stops. Use proper language (English or Spanish) as specified by user for that document. Resume caveman after done.

## 2.2 AI Workflow: Explore → Plan → Code

Before writing code, follow this sequence:

1. **Explore**: Read existing patterns. Grep for similar implementations. Understand current state.
2. **Plan**: Write todo list. Break work into baby steps. Identify verification gates.
3. **Code**: Implement changes.
4. **Verify**: Run lint/typecheck/tests before next step. Gate = must pass.
5. **Document**: Update docs if behavior or data model changed.

Never skip explore phase. Never write code without a todo list.

### Verification Gates (Mandatory)

After each code change, run verification before proceeding:

```bash
npx eslint src/ --max-warnings 0  # Must pass (zero warnings)
npx tsc --noEmit                   # Type check must pass
npm test                           # Tests must pass
```

If gate fails → fix immediately → re-verify. Do not continue to next step until gate passes.

### Adversarial Review (Mandatory)

Before finalizing a change, have a second pass review:
- Check for edge cases missed
- Verify test coverage is sufficient
- Confirm docs reflect actual behavior
- Look for security issues (SQL injection, auth bypass, tenant isolation)

## 3. Specific standards

For detailed standards and guidelines specific to different areas of the project, refer to:

- [Backend Standards](./backend-standards.md) - API development, database patterns, testing, security and backend best practices
- [Frontend Standards](./frontend-standards.md) - React components, UI/UX guidelines, and frontend architecture
- [Documentation Standards](./documentation-standards.md) - Technical documentation structure, formatting, and maintenance guidelines, including AI standards like this document
- [OpenSpec Tasks Mandatory Steps](./openspec-tasks-mandatory-steps.md) - Required checklist and execution rules when creating or updating OpenSpec `tasks.md` files

## 4. Project Skills

- Skills live in `ai-specs/skills`.
- When a request matches a skill, load and follow the corresponding `SKILL.md` automatically before continuing.
- Also load any referenced files in the skill folder (for example, `references/*.md`) when the skill requires them.

## 5. Planning Model Requirement

Planning workflows must run with Opus high reasoning.

This requirement applies to:
- `enrich-us`
- `openspec-ff-change`
- `openspec-continue-change`

Before starting any of these workflows, verify the session is using Opus high reasoning. If it is not, **self-correct** by adding `"model": "claude-opus-4-7"` to `.claude/settings.json` (use the `update-config` skill or edit directly), then continue — do not stop and ask the user. Do the same to come back to sonnet medium for any other step.

## 6. Symlink Integrity and Multi-Agent Portability

- **Canonical Source**: Keep reusable artifacts in `ai-specs` as the canonical source. Agent-specific paths (such as `.claude` and `.cursor`) should reference them through symlinks when possible.
- **Update Safety**: Whenever a file is renamed, moved, or its suffix changes, verify and update all symlinks that target it before considering the change complete.
- **New Artifact Linking**: Whenever creating a new artifact that requires multi-agent exposure (for example new agents or skills in `ai-specs`), create the corresponding symlinks from the expected agent-specific reference paths.
- **External Customization Review**: Whenever customization is introduced outside `ai-specs`, evaluate whether it should be moved into `ai-specs` and replaced with symlinks from the original locations.
- **Completion Gate**: A change is incomplete if it leaves broken symlinks, stale targets, or duplicated canonical artifacts across agent-specific folders.

## 7. Mandatory OpenSpec Artifact Updates for Post-Apply Changes

When a new fix/change request appears after `opsx:apply` (or `/apply`) and before `opsx:archive` (or `/archive`), agents must treat it as a spec update first, not as an informal "fix this quickly". It's the core principle of openspec, documentation is the source of truth.

Required order:

1. Update the current OpenSpec change artifacts that are affected (for example: scenarios, requirements/specs, and `tasks.md`). Don't add tasks as "bugfixes" but as part of the initial design, thus in the proper section
2. If artifact regeneration is needed, run the corresponding OpenSpec step (`opsx:continue`, `opsx:ff`, or equivalent) before coding.
3. Implement code only after artifacts reflect the new request.
4. Re-run verification against the updated artifacts before archiving.

Do not apply direct code-only fixes in this window without updating OpenSpec artifacts.

