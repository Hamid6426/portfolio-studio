# Portfolio Studio

> A modern, open-source portfolio builder built with **Next.js**, inspired by the flexibility of WordPress but designed specifically for developers, designers, freelancers, and professionals.

## Vision

The goal of this project is **not** to generate static portfolio websites from a CLI.

Instead, this project aims to build a complete **Portfolio Management Platform** where users can:

- Create an account
- Manage their portfolio from a dashboard
- Customize layouts and themes
- Build pages using reusable blocks
- Publish their portfolio instantly
- Host everything from a single application

Think of it as:

> **WordPress + Framer + Portfolio CMS**, built entirely with **Next.js**.

---

# Objectives

- Build a complete portfolio management system
- Support multiple users
- Allow theme switching (design tokens / layout blocks — content stays in the page editor)
- Create reusable portfolio blocks
- Build a drag-and-drop page builder
- Support custom domains
- Make the platform scalable from day one

> **Content model (resolved):** Portfolio content is **blocks only** — authored in
> the visual page editor as versioned block trees (`pages.content` /
> `blocks.children`). There are no separate Projects/Skills/Experience tables.
> See `.docs/whats-done.md` for the reasoning.

---

# Tech Stack

- Bun
- Next.js 16 (App Router)
- React 19
- TypeScript
- Axios
- TanStack Query
- Cookie JWT auth (custom)
- Tailwind CSS 4
- shadcn / Base UI
- PostgreSQL
- Drizzle (ORM)
- Zod
- Redis (Future)

---

# High-Level Architecture

```text
                User
                  │
                  ▼
        Portfolio Dashboard
                  │
                  ▼
        PostgreSQL Database
                  │
                  ▼
      Dynamic Portfolio Renderer
                  │
                  ▼
             Public Portfolio
```

One Next.js application will power:

- Landing website
- Authentication
- Dashboard
- API
- Portfolio rendering
- Theme engine

---

# Core Features

## Authentication

- User registration
- Login
- Session management
- Profile management

---

## Dashboard

Users should be able to manage:

- Profile
- Hero Section
- About
- Projects
- Skills
- Experience
- Education
- Certificates
- Blog
- Testimonials
- Contact Information
- Social Links

---

## Portfolio Themes

Users can switch between multiple themes. Under the **blocks-only** content model,
themes change appearance (CSS variables, fonts, spacing tokens) and may swap
reusable layout blocks — they do not re-query structured entity tables.

Example:

```
Minimal

Modern

Creative

Professional

Developer
```

Page content remains the authored block tree; a theme should not require rewriting it.

---

## Theme Settings

Each theme can expose options such as:

- Primary Color
- Secondary Color
- Fonts
- Border Radius
- Dark Mode
- Background Style
- Section Spacing

---

# Portfolio Sections

Examples:

- Hero
- About
- Skills
- Projects
- Experience
- Education
- Certificates
- Testimonials
- Blog
- Contact
- Footer

Users should be able to:

- Show/Hide sections
- Reorder sections
- Customize settings

---

# Page Builder

Eventually the platform will include a visual page builder.

Example blocks:

- Hero
- Text
- Gallery
- Timeline
- Cards
- FAQ
- Statistics
- Contact Form
- Markdown
- Video
- Buttons

Each block will have editable properties.

---

# Layout System

Rather than hardcoding page structure, layouts will be stored in the database.

Example:

```json
[
  {
    "type": "hero"
  },
  {
    "type": "projects"
  },
  {
    "type": "skills"
  },
  {
    "type": "contact"
  }
]
```

The renderer dynamically maps each block to its React component.

---

# Database

Main entities include:

- Users / Roles
- Pages (draft `content` + `published_snapshot` block documents)
- Blocks (reusable / layout trees)
- Theme Settings (Phase 3)

Portfolio sections (projects, skills, experience, etc.) are **block trees**, not
relational rows. Flexible page/block bodies use PostgreSQL JSONB
(`BlockDocument`: `{ version, nodes }`).

---

# Multi-Tenant Architecture

A single Next.js application serves every portfolio.

Example URLs:

```
portfoliobuilder.com/john

portfoliobuilder.com/alice

portfoliobuilder.com/sarah
```

Future support:

```
john.dev

alice.dev
```

using custom domains.

---

# Roadmap

## Phase 1 — Foundation

- Authentication
- Dashboard
- Database
- Portfolio CRUD
- Public portfolio rendering

---

## Phase 2 — Themes

- Multiple portfolio themes
- Theme switching
- Theme settings

---

## Phase 3 — Layout System

- Section visibility
- Section ordering
- JSON-based layouts

---

## Phase 4 — Drag & Drop

- Visual section ordering
- Live preview
- Auto-save

---

## Phase 5 — Block Library

Reusable blocks such as:

- Hero
- Gallery
- Timeline
- FAQ
- Pricing
- Statistics
- Contact Form

---

## Phase 6 — Full Page Builder

Visual editing experience inspired by modern website builders.

---

## Phase 7 — Deployment

- Custom domains
- SEO
- Analytics
- Image optimization
- Performance improvements

---

# Long-Term Goals

- AI-assisted portfolio generation
- Resume builder with PDF export
- Markdown blog engine
- Plugin system
- Theme marketplace
- API for integrations
- Internationalization (i18n)
- Team portfolios
- GitHub integration
- LinkedIn import
- Portfolio templates marketplace

---

# Development Philosophy

- Type-safe
- Modular
- Component-driven
- Server-first architecture
- Performance-focused
- Accessible by default
- Open source
- Extensible and maintainable

---

# License

This project will be released under the MIT License.