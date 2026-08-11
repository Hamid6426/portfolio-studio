<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Portfolio Studio

Self-hosted, single-site portfolio CMS (dashboard + public renderer) in one Next.js app. Not a static-site CLI, not multi-tenant.

One deployment serves one website. The dashboard (`/dashboard/*`) and the public site (`/[slug]`) share the same domain. `users`/`roles` exist for collaborators on that one site, not for tenants.

## Stack

Bun · Next.js 16 App Router · React 19 (+ Compiler) · TS · Tailwind 4 · shadcn/Base UI · Drizzle · Postgres · Zod · Axios · TanStack Query

## Layout

```
src/app/(auth)/     # /home /setup /setup-guide /login
src/app/dashboard/  # /dashboard → /dashboard/overview
src/app/[slug]/     # public CMS page by slug
src/app/error/      # /error/database
src/components/ui/  # shadcn (Base UI). Button: custom `render` ⇒ nativeButton=false (defaulted in button.tsx)
src/config/         # env, startup, permissions, storage-keys
src/db/             # schema, client
src/payloads/       # Zod request payloads (e.g. auth)
src/responses/      # ApiSuccess / ApiError (+ domain unions)
src/lib/axiosInstance.ts  # Axios + 401 refresh interceptor (3 retries)
src/lib/auth/             # cookies, tokens, session helpers
src/services/       # Frontend services (Axios → /api)
src/repositories/   # Backend services + DB for API controllers
src/queries/        # TanStack Query hooks (use frontend services)
src/proxy.ts        # x-pathname + optimistic /dashboard auth gate
```

## Startup gate

`layout.tsx` calls `getStartupState()` unless path starts with PUBLIC_ROUTES (`/setup`, `/error/database` — `/setup` also covers `/setup-guide`).

| state | redirect |
|---|---|
| database-connection-failed | `/error/database` |
| needs-migration \| needs-setup | `/setup` |
| ready | continue |

Keep gate redirect targets in PUBLIC_ROUTES or loops occur.

## Auth gate (dashboard)

1. `proxy.ts` — optimistic: `/dashboard/*` needs access or refresh cookie, else → `/login?next=`
2. `dashboard/layout.tsx` — verifies access JWT; if expired but refresh exists → `/api/auth/session/refresh`; else → `/login`

## Routes (do not invent)

`/` · `/home` · `/setup` · `/setup-guide` · `/login` · `/dashboard/overview` · `/dashboard/pages` · `/dashboard/pages/edit` · `/dashboard/blocks` · `/dashboard/blocks/edit` · `/dashboard/users` · `/dashboard/roles` · `/error/database` · `/[slug]`

## Env

`.env.local`: `DATABASE_URL` (Postgres), `AUTH_SECRET` (≥32), `NODE_ENV` (`development`|`production`|`test`). Parsed in `src/config/env.ts`. Drizzle loads `.env.local` via `drizzle.config.ts`.

## Commands

`bun dev` · `bun run db:generate` · `bun run db:migrate` · `bun run db:studio` · `bun run db:seed`

`db:seed` creates the default roles, an admin user, and the dataset's portfolio pages (published). Idempotent; `--force` rewrites the seeded pages. Never deletes.

Datasets live in `scripts/datasets/` and are **pure content** — a `PortfolioDataset` (`datasets/types.ts`): `admin`, `nav`, and `pages[].sections[]` of `SectionSpec` records (`hero`, `pageHeader`, `prose`, `statRow`, `itemList`, `cardGrid`, `linkRow`, `timeline`, `citationList`). `scripts/sections.ts` owns every layout/style decision and turns each spec into one `section` block via the builders in `scripts/seed-blocks.ts`.

- `bun run db:seed` — default dataset `example` (fictional persona; also the docs for writing your own).
- `bun run db:seed -- --dataset=me.private` — loads `scripts/datasets/me.private.ts`.
- `scripts/datasets/*.private.ts` is gitignored: real personal content goes there, never in `example.ts`.

## Conventions

- Prefer Server Components; client mutations via TanStack Query (`src/queries`) → frontend `src/services` → `src/app/api` → backend `src/repositories`.
- Alias `@/*` → `src/*`. Match existing UI patterns; don't swap Base UI for Radix.
- Schema changes → drizzle generate + migrate. Tables use `baseColumns`.
- Spec/vision: `.docs/portfolio-studio.md` (read when building features).
- Roadmap + gotchas: `.docs/roadmap.md` (read before starting anything beyond the page editor — it lists version-sensitive traps that are not obvious from the code).
- Block trees are stored as versioned `BlockDocument` (`{ version, nodes }`) in `pages.content` / `blocks.children`. Migrate on read via `src/lib/blocks/document.ts`; never write bare arrays.
