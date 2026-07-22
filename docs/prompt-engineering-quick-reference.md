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

*Keep this card visible while working. Update with your own discoveries.*
