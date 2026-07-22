<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Always read before any task

1. `docs/base-standards.md` — ALWAYS first
2. `docs/backend-standards.md` — if backend/API/DB work
3. `docs/frontend-standards.md` — if UI/component work
4. `docs/data-model.md` — if touching data structures
5. `docs/api-spec.yml` — if creating/modifying API endpoints

# Auto-update learning documentation

After each interaction, update these files if learning occurred:

1. `docs/ai-engineering-learning-log.md` — Add entry for new learning (process, mistakes, insights)
2. `docs/prompt-engineering-quick-reference.md` — Add/update effective prompts discovered
3. `docs/portfolio-template.md` — Update case studies if project work happened

Rules:
- Only update if meaningful learning occurred (not routine tasks)
- Focus on process and insights, not just "what was done"
- Include mistakes and how they were fixed
- Keep entries concise but useful
- Update "Last updated" date in each file
