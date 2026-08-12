# What's done

A record of completed work: what changed, why, and where it lives. This exists so the
plans that drove it could be deleted without losing their reasoning.

For the present state see [`current-situation.md`](./current-situation.md); for what's
next see [`future-plans.md`](./future-plans.md).

---

## Phase 1 — the core builder loop

The goal was a working loop: author a page from blocks → save → publish → serve it
publicly.

**Reusable blocks became authorable.** `blocks.children` existed but could never be
written — the payload had no `children` field and the repository hardcoded `[]`, so the
editor's "Layout blocks" palette was a guaranteed no-op and `layoutChildren` was always
empty on the public site. Added `children` to the payloads, persisted it, added
`GET /api/blocks/[id]`, and extracted the recursive node schema into a shared
`src/payloads/block-node.ts` with a depth bound. The depth guard measures depth on the
raw input with an explicit stack *before* piping into the recursive schema, so a deeply
nested payload is rejected rather than blowing the stack — a post-parse `.refine()` could
not guarantee that.

**Nested drag-and-drop was finished.** Reordering within a parent worked; there was no
`else` branch for cross-container drops, so blocks could never be dragged *into* a
container even though `moveNode` had been written for it. Added reparenting, droppable
placeholders for empty containers, a `DragOverlay` and drop indicator. A claimed
"off-by-one on downward drags" turned out not to exist — `removeNodeById` + `insertChild`
is exactly `arrayMove` semantics; the real breakage was cross-parent only.

**The editor document model was rewritten** from `useState` plus a snapshot array to a
reducer over `{past, present, future, baseline, serverKey, conflict}`. This made `dirty`
*derived*, so undoing back to the saved state correctly clears it, and let the sync path
distinguish the save-echo from a genuine external change — keeping local edits and raising
a "Changed elsewhere" badge instead of clobbering.

**Draft/publish.** `published_at` existed on every table and was never written or filtered
on, so saving published instantly. Added `pages.published_snapshot` holding
`{title, description, blockId, content}`. It snapshots the whole public payload rather
than just `content`, because `title` and `description` are rendered publicly too — a
content-only snapshot would still have leaked title edits live. `slug` is deliberately not
snapshotted: it is the page's address, not its content.

**Caching.** Both public routes were pinned to `force-dynamic`. Removed it — but full
static rendering is impossible regardless, because the root layout calls `headers()`,
which opts every route into dynamic rendering (verified in the build output). So the
*data* is cached with `unstable_cache` and precise tag invalidation instead of the route.

**Renderer hardening.** `BlockRenderer` renders the public site from stored jsonb, so it
is a trust boundary. Added a CSS property allowlist and URL scheme sanitisation
(`src/lib/block-sanitize.ts`), rejecting `javascript:`, `data:`, protocol-relative
`//host`, and obfuscated values.

**Seeding.** `bun run db:seed` with pluggable datasets. Datasets are pure content; all
layout and style decisions live in `scripts/sections.ts`. `scripts/datasets/*.private.ts`
is gitignored so real personal content never lands in the public repo, and the committed
`example.ts` doubles as the documentation for writing your own.

### Three bugs only a smoke test could find

All three passed `tsc`, lint, and a production build:

1. **Every public page with a button block 500'd** — `BlockRenderer` always passed an
   `onClick`, and the same renderer runs in the public Server Component tree where any
   function prop throws. Pre-existing; latent only because no public page had contained a
   button until the seed added nav rows.
2. **The landing page 404'd permanently** — the cache key was `slug ?? ""`, and the empty
   key part mis-keyed `unstable_cache` into a permanent miss. Every other slug worked,
   which is what made it hard to see.
3. **The site lagged one request behind every publish** — `revalidateTag(tag, "max")` is
   stale-while-revalidate. Immediate invalidation needs `{ expire: 0 }`.

---

## Content model — blocks only

Decided against structured content entity tables. Eleven unused tables (`user_profiles`,
`user_socials`, `user_educations`, `user_experiences`, `user_skills`, `user_projects`,
`user_achievements`, `user_publications`, `user_awards`, `user_services`, `portfolios`)
had schema and migrations but zero code paths; they were also `user_id`-scoped, a
multi-tenant shape this single-site product does not want. Dropped in migration `0010`.

Portfolio content is authored as block trees. The consequence to keep in mind: a theme can
restyle tokens but cannot relayout content, because there is no structured content to
relayout.

---

## Versioned block documents

Stored trees became `{ version, nodes }` (`BlockDocument`) across `pages.content`,
`blocks.children` and the published snapshot, with legacy bare arrays treated as version 0
and upgraded on read (`src/lib/blocks/document.ts`). Migration `0009` back-filled existing
rows idempotently and set versioned column defaults.

This was done early and deliberately: production block editors have had document-model
changes force migration of every user's persisted content, and there were already
hundreds of seeded nodes plus published snapshots. A later fix made documents *newer* than
`CURRENT_BLOCK_DOCUMENT_VERSION` unreadable rather than silently relabelled — without it,
an older build could read a v2 document, call it v1, and save it back down, destroying
data.

---

## Remediation pass

Driven by three independent audits of the whole codebase.

**Authorization — the one that was actually exploitable.** `canAccessRoute` granted access
when any held route was a *prefix* of the path, and all three default roles held
`route:/dashboard`. So `"/dashboard/users".startsWith("/dashboard/")` was true for
everyone: a viewer could load `/dashboard/users` and `/dashboard/roles`, call
`GET /api/users` for every user's email, read unpublished drafts, and preview drafts.

Rewritten to **longest declared route wins, default deny**, with `route:/path/*` for
subtrees. Undeclared paths are now rejected for every role including admin, so adding a
route without a permission fails closed. Because `ensureDefaultRoles` union-merged
defaults on every dashboard render — meaning code changes alone would never remove a
persisted grant — this shipped as one deploy: matcher rewrite, redirect-target fix, data
migrations (`0011`, then `0013` for custom roles), and making the merge create-if-missing
and off the render path.

**Redirects.** `next=` was validated with `startsWith("/")` only, so `//evil.com` escaped
the origin — and the refresh route is a GET that mutates, making it a cross-site
session-rotation gadget under `SameSite=Lax`. `safeRedirectPath` now rejects
protocol-relative URLs, backslashes, control characters (URL parsers strip CR/LF/TAB
before parsing, which is otherwise an open redirect), absolute URLs, and `/api/*` loops,
with a `new URL(...).origin` equality check as the durable backstop.

**Sessions and passwords.** Password hashes now carry their cost parameters
(`scrypt$N=…$salt$hash`) so N can be raised later, with the legacy format still verifying
and rehash-on-login; hashing moved to async `scrypt` so it stops blocking the event loop.
Refresh rotation became atomic — a single `DELETE ... RETURNING` *is* the claim. Password
change revokes tokens in the same transaction. Login and setup are rate-limited. The setup
race uses `pg_advisory_xact_lock` rather than a unique index on `role='admin'`, because
this product has collaborators and two admins must remain legal.

**Input validation.** Routes cast `request.json()` to a payload type and four repositories
dereferenced fields before validating, so `POST /api/auth/login` with `{}` threw outside
any try/catch — an unauthenticated 500. Normalisation moved into the Zod schemas and the
signatures became `unknown`, since the type was lying about runtime reality.

**Editor.** The canvas could not scroll — the shell was fixed-height with
`overflow-hidden` — so most of a real page was unreachable. Fixing that required fixing
the drop math in the same change: `over.rect` is measured at drag start, so scrolling
without re-measuring would have landed drops in the wrong place. Also added
`Backspace`/`Ctrl+S`, insertion next to the selection, undo coalescing, a dirty-nav guard,
and Move up/down/Outdent/Indent buttons in the layers panel — the accessible path for
restructuring, chosen over keyboard drag-and-drop, which needs a custom coordinate getter
for reparenting and would likely have shipped worse than nothing.

**Layout blocks got their own publish state** (`blocks.published_children`, migration
`0012`). Public pages had loaded block children live, so editing a shared header changed
every live page instantly, bypassing draft/publish entirely. Publishing a layout block
updates everything at once, which is what an author expects of a site header.

**Public surface.** Per-page metadata (description, Open Graph, Twitter, canonical) —
previously every page inherited the CMS's own marketing description. Added `sitemap.ts`,
`robots.ts`, a `<main>` wrapper and skip link, lazy images, and stopped rendering
`Unknown block: …` to visitors.

**Responsive stop-gap.** Seeded pages overflowed horizontally at 360px, and
`scrollbar-none` on `html` hid the symptom so it looked like content was cut off.
Allowlisted `flexWrap`/`minWidth`/`flex`, re-seeded the row builders to wrap, removed the
scrollbar hiding, and added a canvas device-width toggle. Breakpoints and hover states
remain impossible by data model — that is the responsive project in `future-plans.md`.

**Infrastructure.** vitest across the pure-function seams (permission matrix, token
tamper/`alg`-swap/expiry, password legacy format, sanitiser XSS vectors, depth guard at
exactly 32/33, redirect validator, document migration), GitHub Actions CI, five error
boundaries that re-throw `NEXT_*` digests so the startup gate's `redirect()` is not
swallowed, security headers, env validation that refuses the placeholder `AUTH_SECRET` in
production, and a README that documents self-hosting.

---

## Close-out of the open-issue backlog

Taken from `future-plans.md` "Now" (formerly the 17 issues in `current-situation.md`).
Reasoning for each:

1. **Undo mergeKey corruption** — the coalesce branch cleared neither `future` nor the
   merge clock on undo/redo, so undo → retype → redo could resurrect a divergent tree.
   Reducer lives in `editor-document-state.ts` with a regression test.
2. **Ctrl+S gating** — threaded `canEdit`, skip when not dirty, ignore `event.repeat`.
3. **Layout block public reads** — soft-delete (`deletedAt`) filter + `unstable_cache`
   tagged with `block:{id}`; publish invalidates that tag.
4. **`expectedUpdatedAt` required** on page/block PATCH; list metadata forms send it and
   no longer wipe `content: []` on page edit.
5. **Sticky device-width toggle** — survives canvas scroll.
6. **Flex item controls** — `flex`/`minWidth` when the *parent* is a flex container.
7. **Fill vs BG** — single Fill control writes `background` and clears `backgroundColor`.
8. **Colour swatch** — checkerboard unset state for rgba / short hex / named colours.
9. **Dirty guard** — shared Dialog via `DirtyNavProvider.requestNavigation` for nav, logo,
   sign-out, and conflict reload.
10. **Section aria-label + missing-h1 warning** — settings control + non-blocking banner;
    dnd-kit screen-reader copy no longer mentions space-bar.
11. **`bun test` / docs** — `bunfig.toml` preload + prefer `bun run test` in docs.
12. **`requireRoutePermission` tests** — mocked session/role matrix pins the enforcement
    seam (including `/*` stripping).
13–14. **Refresh query string + redirect loops** — already fixed in the remediation follow-up
    (`x-pathname` includes search; `/dashboard` fallback; sign-out on no-access panel).
15. **Structured logger** — `src/lib/logger.ts` emits JSON lines with a short `id`;
    repositories call `logError`.
16. **robots disallow** — `/api/`, `/dashboard/`, auth routes. OG image asset deferred
    until `public/og.png` exists (no 404 image URL).
17. **Re-seed** — operator step: `bun run db:seed -- --force` on existing DBs.

---

## Migrations

| | |
|---|---|
| `0000`–`0005` | initial schema, roles/users, pages |
| `0006` | layouts → blocks |
| `0007` | page editor: `pages.content`, drop `blocks.slug` |
| `0008` | `pages.published_snapshot` (draft/publish) |
| `0009` | `BlockDocument` back-fill + versioned defaults |
| `0010` | drop 11 unused content tables (blocks-only) |
| `0011` | system-role permission reset (route matcher change) |
| `0012` | `blocks.published_children` + indexes |
| `0013` | custom-role permission rewrite + `expires_at` index |
