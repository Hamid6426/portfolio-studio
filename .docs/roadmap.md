# Roadmap — after the core builder loop

Handoff document. Phase 1 (the core builder loop) is done and verified against a live
database. This describes Phase 2 and Phase 3, plus the context needed to not break
Phase 1 while building them.

Read `AGENTS.md` first — it is the authority on stack, layering and routes. This file
only covers what is *not yet built* and the traps that are not obvious from the code.

---

## Where things stand

Working and smoke-tested end to end:

- Visual page editor at `/dashboard/pages/edit?slug=` — 7 block types, nested
  drag-and-drop with reparenting, drop indicator, undo/redo, conflict detection.
- Reusable layout blocks: `blocks.children` is authorable at `/dashboard/blocks/edit?id=`
  and attachable to a page via `pages.block_id`.
- Draft/publish: `pages.content` is the draft, `pages.published_snapshot` is what the
  public site serves, gated by `published_at`. Editing a published page does **not**
  affect the live site until publish.
- Draft preview at `/<slug>?preview=1`, permission-checked.
- Public rendering at `/` (slug `null`) and `/[slug]`, cached per slug with tag
  invalidation on publish/unpublish/delete.
- Seed: `bun run db:seed` (see `AGENTS.md` for datasets).

---

## Critical context — read before writing code

These cost real debugging time to discover. Do not rediscover them.

1. **Passwords are scrypt, not bcrypt.** `src/lib/password.ts` stores
   `scrypt:<salt>:<hash>` and `verifyPassword` rejects any other scheme. A bcrypt or
   argon2 hash will be accepted at insert and then silently never log in.
2. **`revalidateTag` takes two arguments in Next.js 16.** The one-arg form is
   deprecated. The `"max"` profile is *stale-while-revalidate* — using it for a
   user-triggered action makes the site lag one request behind. For immediate effect
   use `revalidateTag(tag, { expire: 0 })`. See `invalidatePageCache` in
   `src/repositories/pages.ts`.
3. **Every route is dynamically rendered, unavoidably.** The root layout calls
   `headers()` for the startup gate, which opts the whole app into dynamic rendering.
   `generateStaticParams` and route-level static config cannot help. Cache *data*
   (`unstable_cache`), not routes.
4. **`cacheComponents` is not enabled** in `next.config.ts`, so `use cache`,
   `cacheTag` and `cacheLife` are unavailable. The governing doc is
   `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md`.
   Read the bundled docs — this Next.js version differs from most online material.
5. **Never pass a function prop from `BlockRenderer` when `editable` is false.** The
   same renderer runs in the public Server Component tree; any handler throws and 500s
   the page. This already caused one production-shaped bug.
6. **Only styles on the allowlist in `src/lib/block-sanitize.ts` survive rendering.**
   Anything else is dropped silently. Notably absent: `flexWrap`, `whiteSpace`,
   `position`, `boxShadow`, `border` shorthands beyond what is listed. Adding a control
   to the style panel means adding its property to the allowlist too, or it will appear
   to work in the editor and vanish on the public site.
7. **Cache keys must not contain an empty string.** `getCachedPublishedPage` uses
   `"__root__"` for the null slug because `""` mis-keys `unstable_cache` into a
   permanent miss. This produced a 404 on `/` that looked like a data problem.

---

## Phase 2 — content sections

The spec (`.docs/portfolio-studio.md`) calls for structured sections: projects, skills,
experience, education, certificates, testimonials, blog, contact, social links.

### Decide this first — it shapes everything

There is an unresolved tension in the design:

- The page editor is **freeform blocks**. The seeded portfolio expresses an entire CV
  as block trees, using none of the content tables.
- The spec wants **structured entities** with their own dashboard screens.

Three coherent answers, pick one deliberately:

| Approach | What it means | Cost |
|---|---|---|
| **Blocks only** | Delete the dead tables. Everything is authored in the editor. | Simplest, but no reusable structured data, no "switch theme, same content" |
| **Entities only** | Content lives in tables; pages compose them via section blocks | Matches the spec's theme story; needs new block types bound to queries |
| **Both** | Blocks for layout, entity-backed blocks for structured lists | Most capable, most complexity |

The spec's one-click theme switching ("each theme consumes the same portfolio data")
only works under **entities only** or **both**. If you choose blocks only, say so in
`.docs/portfolio-studio.md`, because it contradicts the stated vision.

### The head start: 11 dead tables

These exist in `src/db/schema.ts` with migrations applied, and have **zero** code —
no repository, no API route, no payload, no service, no query hook, no UI:

`user_profiles` · `user_socials` · `user_educations` · `user_experiences` ·
`user_skills` · `user_projects` · `user_achievements` · `user_publications` ·
`user_awards` · `user_services` · `portfolios`

Two warnings:

- **They are too thin to use as-is.** `user_skills` is a single `skill` column;
  `user_projects` a single `project`; `user_experiences` only `company` + `position`
  with no dates or description. Real content needs more columns — expect to extend
  them, not just wire them up.
- **They are `user_id`-scoped**, which is a multi-tenant shape. This product is
  single-site (see `AGENTS.md`). Decide whether `user_id` means "owner" or should be
  dropped before building on them.

### Per-entity checklist

Every entity needs all seven layers, in this order. Copy the `pages` or `blocks` slice
as the reference implementation — both are complete and consistent.

1. `src/db/schema.ts` — extend columns, then `bun run db:generate` (never hand-write SQL)
2. `src/payloads/<entity>.ts` — Zod create/update
3. `src/repositories/<entity>.ts` — validate in the repo, return `ApiSuccess|ApiError`,
   route errors through `apiErrorFromPostgres`
4. `src/app/api/<entity>/` — `requireRoutePermission` for reads,
   `requireButtonPermission` for writes
5. `src/config/permissions.ts` — new permission keys, added to the default role sets
6. `src/services/<entity>.ts` + `src/queries/<entity>.ts` — keys in `src/config/storage-keys.ts`
7. Dashboard screen — match the dialog/toast/`canShowButton` idiom in
   `pages-page-client.tsx`

Blog additionally needs public routes. Current slug routing is single-segment only
(`/[slug]`), so `/blog/<post>` requires a new segment — this is the one place Phase 2
touches the public renderer.

---

## Phase 3 — themes and domains

### Theme engine

Nothing exists: no `themes` table, one fixed `:root` token block in
`src/app/globals.css`, no `.dark` block, no switcher. `next-themes` was deliberately
removed in commit `a4e2e87` — check why before reintroducing it.

This phase depends on the Phase 2 decision. "Switch theme, keep content" is only
meaningful if content is structured; with freeform blocks a theme can only restyle
tokens, not relayout.

Suggested shape: themes as CSS-variable token sets over Tailwind 4's `@theme`, stored
per-site with per-theme settings. Note that block `styles` are inline per-node and will
**override** any theme — decide how a theme and a hand-set block style compose, or
themes will appear not to work on edited pages.

### Custom domains

For a single-tenant self-hosted app this is mostly deployment configuration, not
application code. Do not build tenant-to-domain mapping — that is the multi-tenant
design this product explicitly is not.

---

## Carried-over defects

Found while building Phase 1, deliberately left. Each is small and independent.

- **No sign-out anywhere in the UI.** `POST /api/auth/logout`, `logoutRequest()` and the
  `button:sign-out` permission all exist; nothing calls them. There is no
  `useLogoutMutation`.
- **`editor` and `viewer` roles have identical permissions** (`src/config/permissions.ts`)
  — the `editor` role cannot edit anything.
- **`/dashboard/overview` never checks its own route permission**, unlike every other
  dashboard page.
- **Redirect loop:** an access cookie that is present but invalid (e.g. rotated
  `AUTH_SECRET`) with no refresh cookie bounces `/login` ↔ `/dashboard/overview` forever.
- **Setup is not transactional** — two concurrent `POST /api/auth/setup` calls can both
  pass `checkAdminExists()` and create two admins.
- **Dead server actions** in `src/app/(auth)/setup/actions.ts` and
  `src/app/(auth)/login/actions.ts` — unreferenced duplicates. The setup one omits
  `ensureDefaultRoles()` and would fail on the role FK if ever wired up.
- **Migration check is shallow** (`src/config/migration.ts`) — it only tests that the
  `drizzle.__drizzle_migrations` table exists, so a half-migrated database reports
  `ready`.
- **Deletes are hard deletes.** `deleted_at` is filtered on reads but never written.
  Soft delete needs a partial unique index first, because `pages.slug` is UNIQUE and a
  soft-deleted row would squat its slug forever.
- **No Drizzle `relations()` are declared**, so the relational query API cannot traverse;
  all joins are hand-written.

---

## Recommended first task

**Add a schema version to stored block trees**, before either phase.

`BlockNode` is a nested `{type, props, children}` tree resolved through a registry —
the same shape Puck uses. Puck's 0.19 release changed its document model and forced
migration of every user's already-persisted content. This repo now has ~700 seeded
nodes plus published snapshots, and Phase 2 will likely add entity-backed block types,
which is exactly the kind of change that breaks stored trees.

A `version` field on the stored document plus a `migrate()` step on read is cheap now
and expensive later.
