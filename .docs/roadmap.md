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

**Decision: Blocks only.** Portfolio content is authored entirely in the page
editor as freeform block trees. There are no structured content entity tables.

Rationale: Phase 1 already ships a working block editor and a seeded CV that
uses none of the old content tables. Keeping a second parallel content model
would split the product. Themes (Phase 3) restyle via CSS tokens / layout
blocks; they do not re-bind the same relational rows into different layouts.

The eleven unused `user_*` / `portfolios` tables were dropped in migration
`0010`. Phase 2 work is therefore editor/block improvements (new block types,
better section presets in seed builders), not CRUD screens for entities.
See `.docs/portfolio-studio.md` for the updated vision note.

### ~~Decide this first~~ (resolved — Blocks only)

| Approach | Status |
|---|---|
| **Blocks only** | **Chosen** — dead tables removed |
| **Entities only** | Rejected for now |
| **Both** | Rejected for now |

### Per-entity checklist

Not applicable under Blocks only. Prefer new `BlockType`s and seed section
builders (`scripts/sections.ts`) when you need reusable section patterns.

---

## Phase 3 — themes and domains

### Theme engine

Nothing exists: no `themes` table, one fixed `:root` token block in
`src/app/globals.css`, no `.dark` block, no switcher. `next-themes` was deliberately
removed in commit `a4e2e87` — check why before reintroducing it.

This phase depends on the Phase 2 decision. **Blocks only** means a theme can
restyle design tokens (and optionally swap layout blocks), not remount the same
relational rows into different section layouts.

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

Found while building Phase 1. Checked off items were fixed after the Blocks-only
decision.

- [x] **No sign-out in the UI** — sidebar `DashboardSignOut` + `useLogoutMutation`.
- [x] **`editor` == `viewer` permissions** — editor now gets pages/blocks routes and
  CRUD buttons; `ensureDefaultRoles` merges the new defaults on next dashboard load.
- [x] **Overview route permission** — dashboard layout rejects any pathname the role
  cannot access (including overview).
- [x] **Redirect loop** on invalid access cookie — proxy no longer treats cookie
  presence as signed-in; layout deletes a stale access cookie before sending to
  `/login`; login page redirects only after a verified session.
- [x] **Dead server actions** — removed `login/actions.ts` and `setup/actions.ts`.
- [x] **Setup is not transactional** — `createAdminUser` uses
  `pg_advisory_xact_lock(hashtext('portfolio-studio:setup'))` so concurrent setup
  calls serialize.
- [ ] **Migration check is shallow** (`src/config/migration.ts`) — only tests that
  `drizzle.__drizzle_migrations` exists.
- [ ] **Deletes are hard deletes.** Soft delete needs a partial unique index first
  (`pages.slug` UNIQUE).
- [ ] **No Drizzle `relations()`** — all joins are hand-written.

---

## Recommended first task

**Add a schema version to stored block trees** — done.

Stored shape is now `{ version, nodes }` (`BlockDocument`) for `pages.content`,
`blocks.children`, and `published_snapshot.content`. Legacy bare arrays are
treated as version 0 and upgraded on every read via `migrateBlockDocument` in
`src/lib/blocks/document.ts`. Bump `CURRENT_BLOCK_DOCUMENT_VERSION` and add a
step there when Phase 2 changes the tree model.

**BlockDocument v2 gate (5d)** — done. Documents with `version > CURRENT` return
`unsupported-version` on read and are refused on write. Public pages and editors
show an error instead of clamping. Required before any responsive/breakpoint v2
work that bumps the stored version.

~~A `version` field on the stored document plus a `migrate()` step on read is cheap now
and expensive later.~~
