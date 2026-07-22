---
description: Frontend development standards, best practices, and conventions for the Facturas Next.js application including server components, client components, Tailwind CSS, and UI patterns
globs: ["src/**/*.tsx", "src/**/*.ts"]
alwaysApply: true
---

# Frontend Standards and Best Practices

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Component Architecture](#component-architecture)
- [Styling with Tailwind CSS](#styling-with-tailwind-css)
- [Server Components vs Client Components](#server-components-vs-client-components)
- [Data Fetching](#data-fetching)
- [State Management](#state-management)
- [Forms and Validation](#forms-and-validation)
- [UI Patterns](#ui-patterns)
- [Accessibility](#accessibility)
- [Testing](#testing)
- [Performance](#performance)
- [Development Workflow](#development-workflow)

---

## Overview

This document outlines the standards for the Facturas frontend. The application is a **Next.js 16 monolith** using the App Router, with server-side rendering, React Server Components, and Tailwind CSS for styling.

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **React**: 19.2.4 (with Server Components support)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Charts**: Recharts
- **Icons**: React Bootstrap Icons (legacy) / Tailwind-compatible icons
- **Deployment**: Railway

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout (html, body, global providers)
│   ├── page.tsx                # Dashboard page
│   ├── login/page.tsx          # Login page
│   ├── facturas/
│   │   ├── page.tsx            # Invoice list page (server component wrapper)
│   │   └── [id]/page.tsx       # Invoice detail page
│   ├── empresa/page.tsx        # Business settings page
│   ├── configuracion/page.tsx  # Configuration page
│   ├── cuenta/page.tsx         # Account/profile page
│   ├── admin/page.tsx          # Admin dashboard
│   ├── components/             # Shared React components
│   │   └── charts/             # Chart components (Recharts)
│   └── api/                    # API routes (see backend-standards.md)
```

## Component Architecture

### Server Components (Default)

Next.js 16 App Router defaults to Server Components. Use them for:

- Pages that fetch data directly
- Layouts
- Static content
- Components that don't need browser APIs

```tsx
// Server Component - no "use client" directive
import { requireActiveTenant } from "@/lib/tenant"

export default async function FacturasPage() {
  const { db } = await requireActiveTenant()
  const facturas = db.prepare("SELECT * FROM facturas").all()

  return (
    <div>
      {facturas.map(f => (
        <FacturaCard key={f.id} factura={f} />
      ))}
    </div>
  )
}
```

### Client Components

Use `"use client"` directive for components that need:

- Event handlers (onClick, onChange, onSubmit)
- Browser APIs (window, document, localStorage)
- React hooks (useState, useEffect, useCallback)
- Interactive UI (forms, modals, dropdowns)

```tsx
"use client"

import { useState } from "react"

export function FacturaFilters() {
  const [search, setSearch] = useState("")

  return (
    <input
      type="text"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Search invoices..."
    />
  )
}
```

### Component Organization

- Keep components in `src/app/components/` for shared/reusable components
- Page-specific components can live alongside their pages
- One component per file for large components
- Group related components in subdirectories (e.g., `charts/`)

### Props Typing

```tsx
type FacturaCardProps = {
  factura: Factura
  onSelect?: (id: number) => void
  showConfidence?: boolean
}

export function FacturaCard({ factura, onSelect, showConfidence = false }: FacturaCardProps) {
  return (
    <div onClick={() => onSelect?.(factura.id)}>
      {/* ... */}
    </div>
  )
}
```

## Styling with Tailwind CSS

### Conventions

- Use Tailwind utility classes for all styling
- Use `cn()` or template literals for conditional classes
- Keep inline styles to absolute minimum (only for dynamic values like colors)

```tsx
// Good
<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">

// Conditional classes
<div className={`p-4 ${isActive ? "bg-blue-50 border-blue-300" : "bg-gray-50 border-gray-200"}`}>
```

### Responsive Design

- Use Tailwind responsive prefixes: `sm:`, `md:`, `lg:`, `xl:`
- Mobile-first approach
- Use `grid` and `flex` for layouts

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

### Color System

- Use Tailwind's built-in color palette
- Use semantic colors for states:
  - Success: `text-green-600`, `bg-green-50`
  - Warning: `text-yellow-600`, `bg-yellow-50`
  - Error: `text-red-600`, `bg-red-50`
  - Info: `text-blue-600`, `bg-blue-50`

### Dark Mode

- Not currently implemented, but keep in mind for future
- Use color classes that work well in both modes when possible

## Server Components vs Client Components

### Decision Tree

1. Does it need `useState`, `useEffect`, `useCallback`, or event handlers? **Client Component**
2. Does it fetch data from the server? **Server Component** (default)
3. Is it a layout or page? **Server Component** (default)
4. Is it a form with interactive state? **Client Component**
5. Is it a chart or visualization? **Client Component** (Recharts requires client)

### Data Flow Pattern

```
Server Component (page.tsx)
  ├── Fetches data from DB or API
  ├── Passes data as props to Client Components
  └── Client Component handles interaction and re-fetching

Client Component
  ├── Receives initial data as props
  ├── Manages interactive state
  ├── Calls API routes for mutations
  └── Re-fetches data as needed
```

## Data Fetching

### Server-Side (Preferred)

```tsx
// In Server Component
import { getTenantDb } from "@/db"

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const db = getTenantDb(slug)
  const facturas = db.prepare("SELECT * FROM facturas").all()

  return <FacturaList facturas={facturas} />
}
```

### Client-Side

```tsx
"use client"

import { useState, useEffect } from "react"

export function FacturaList() {
  const [facturas, setFacturas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/facturas")
      .then(res => res.json())
      .then(data => {
        setFacturas(data.facturas)
        setLoading(false)
      })
  }, [])

  if (loading) return <div>Loading...</div>
  return <div>{/* render facturas */}</div>
}
```

### API Route Calls

- Use `fetch()` for client-side API calls
- Handle errors gracefully
- Show loading states during fetches
- Use consistent error message patterns

```tsx
try {
  const response = await fetch("/api/facturas")
  if (!response.ok) throw new Error("Failed to fetch")
  const data = await response.json()
  setFacturas(data.facturas)
} catch (error) {
  console.error("Error fetching facturas:", error)
  setError("Unable to load invoices. Please try again.")
}
```

## State Management

### Local State

- Use `useState` for component-level state
- Use `useEffect` for side effects and data fetching
- Extract custom hooks for reusable stateful logic

```tsx
// Custom hook
function useFacturaStats(negocioSlug: string) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/facturas/stats`)
      .then(res => res.json())
      .then(setStats)
      .finally(() => setLoading(false))
  }, [negocioSlug])

  return { stats, loading }
}
```

### Loading and Error States

```tsx
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

// Always handle these states in the UI
if (loading) return <LoadingSpinner />
if (error) return <ErrorMessage message={error} />
```

## Forms and Validation

### Controlled Components

```tsx
"use client"

import { useState } from "react"

export function NegocioForm() {
  const [formData, setFormData] = useState({ nombre: "", email: "" })
  const [saving, setSaving] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await fetch("/api/negocios/slug", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="nombre" value={formData.nombre} onChange={handleInputChange} />
      <button type="submit" disabled={saving}>
        {saving ? "Saving..." : "Save"}
      </button>
    </form>
  )
}
```

### Validation Patterns

- Validate on the client before submission
- Always validate on the server (API routes)
- Show inline error messages near the relevant field
- Disable submit buttons during submission

## UI Patterns

### Currency Display

```tsx
// Format currency with locale
const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currency,
  }).format(amount)
}

// Usage
<span>{formatCurrency(factura.total, factura.moneda)}</span>
```

### Confidence Badges

```tsx
const confidenceColors = {
  alta: "bg-green-100 text-green-800",
  media: "bg-yellow-100 text-yellow-800",
  baja: "bg-orange-100 text-orange-800",
  error: "bg-red-100 text-red-800",
}

<span className={`px-2 py-1 rounded-full text-xs font-medium ${confidenceColors[factura.confianza_nivel]}`}>
  {factura.confianza_nivel}
</span>
```

### Status Badges

```tsx
const statusColors = {
  pendiente: "bg-blue-100 text-blue-800",
  pagada: "bg-green-100 text-green-800",
  cancelada: "bg-red-100 text-red-800",
}

<span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[factura.estado]}`}>
  {factura.estado}
</span>
```

### Loading States

```tsx
// Skeleton loading
<div className="animate-pulse bg-gray-200 h-4 rounded w-3/4" />

// Spinner
<div className="flex items-center justify-center p-8">
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
</div>
```

### Tables

```tsx
<div className="overflow-x-auto">
  <table className="min-w-full divide-y divide-gray-200">
    <thead className="bg-gray-50">
      <tr>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
          Invoice
        </th>
        {/* ... */}
      </tr>
    </thead>
    <tbody className="bg-white divide-y divide-gray-200">
      {facturas.map(f => (
        <tr key={f.id} className="hover:bg-gray-50 cursor-pointer">
          <td className="px-6 py-4 whitespace-nowrap">{f.numero_factura}</td>
          {/* ... */}
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

## Accessibility

- Use semantic HTML elements (`<nav>`, `<main>`, `<header>`, `<section>`)
- Include `aria-label` attributes for interactive elements
- Ensure keyboard navigation support
- Provide alternative text for images
- Use proper heading hierarchy (h1 > h2 > h3)
- Ensure sufficient color contrast

```tsx
<nav aria-label="Main navigation">
  <a href="/facturas" className="sr-only focus:not-sr-only">Invoices</a>
</nav>

<button aria-label="Delete invoice" onClick={handleDelete}>
  <TrashIcon />
</button>
```

## Testing

### Component Testing

```tsx
import { render, screen } from "@testing-library/react"
import { FacturaCard } from "./FacturaCard"

describe("FacturaCard", () => {
  it("should display invoice number", () => {
    render(<FacturaCard factura={mockFactura} />)
    expect(screen.getByText("FAC-001")).toBeInTheDocument()
  })
})
```

### Test Patterns

- Use `data-testid` attributes for reliable element selection
- Mock API calls in component tests
- Test both success and error states
- Test user interactions (clicks, form submissions)

## Performance

- Use Server Components by default (no client-side JavaScript)
- Only add `"use client"` when truly needed
- Use `React.memo()` for expensive components that receive stable props
- Avoid creating new objects/arrays in render (use `useMemo`)
- Use `useCallback` for event handlers passed to child components
- Lazy load heavy components (charts, etc.)

## Development Workflow

### Verification Checklist

Before marking frontend work complete:

1. ✅ ESLint passes with zero warnings
2. ✅ TypeScript compiles without errors
3. ✅ All component tests pass
4. ✅ Visual verification (check rendering in browser)
5. ✅ Responsive design works on mobile/desktop
6. ✅ Loading/error states handled
7. ✅ Accessibility checked (keyboard nav, aria labels)

### Visual Verification Steps

After UI changes, verify in browser:

1. **Render check**: Page loads without errors
2. **Interaction check**: Click/hover/form submit work
3. **Responsive check**: Resize browser window
4. **Data check**: Correct data displays
5. **Edge case check**: Empty states, loading, errors

### Frontend Debugging Tips

| Problem | Likely Cause | Fix |
|---------|--------------|-----|
| Component not re-rendering | Missing dependency in useEffect | Check dependency array |
| Styling not applied | Tailwind class typo | Check class names in browser dev tools |
| Hydration error | Server/client mismatch | Ensure `"use client"` on client components |
| API fetch fails | Missing credentials | Add `credentials: "include"` to fetch |

### Feature branches with descriptive names

- Feature branches with descriptive names
- Descriptive commit messages in English
- Code review before merging
- Small, focused branches

### Scripts

```bash
npm run dev            # Development server
npm run build          # Production build
npm start              # Production start
npm run lint           # ESLint
npm test               # Run tests
```

### Code Quality

- Run ESLint before commits
- Ensure TypeScript compiles without errors
- All tests must pass before merging
