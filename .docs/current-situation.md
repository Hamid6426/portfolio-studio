# Current situation

**Last verified: 2026-08-12, at commit `016b37a`.**

A snapshot of what actually works, what is known-broken, and the design decisions that
are load-bearing. Everything below was checked against the code, not inferred from
commit messages. For what to build next, see [`future-plans.md`](./future-plans.md).

---

## Status

The core builder loop is complete and has been exercised end to end against a live
Postgres. A security and correctness remediation pass has landed on top of it. The
product is usable; the open items below are real but none of them block normal use.

Static gates are green: `bun run typecheck`, `bun run lint`, `bun run test` (42 tests
across 7 files), `bun run build`.

---

## What works

### Editing
- Visual page editor at `/dashboard/pages/edit?slug=` — 7 block types, nested
  drag-and-drop **with reparenting**, drop indicator, `DragOverlay`.
- The canvas scrolls, and the drop math is scroll-corrected. These had to ship together:
  `pointerY` derives from `active.rect.current.translated` (dnd-kit's own
  `collisionRect`), and `over.rect`'s `top`/`bottom` are live getters that subtract the
  scroll delta — so both sides of the before/after comparison are in the same space.
  `MeasuringStrategy.Always` re-measures when the tree reflows mid-drag.
- Undo/redo with derived `dirty` (undoing back to the saved state clears it), external
  change detection, `Ctrl+Z` / `Ctrl+Shift+Z` / `Ctrl+Y`, `Delete` **and** `Backspace`,
  `Ctrl+S`. The global key handler bails out when focus is inside a dialog.
- Layers panel with Move up / Move down / Outdent / Indent — the accessible path for
  restructuring, since keyboard drag-and-drop was deliberately not built.
- Reusable layout blocks authored at `/dashboard/blocks/edit?id=`, with their own
  publish step.

### Publishing
- `pages.content` is the **draft**; `pages.published_snapshot` holds
  `{title, description, blockId, content}` and is what the public site serves, gated by
  `published_at`. Editing a published page does not affect the live site until publish.
- Layout blocks publish independently via `blocks.published_children` and
  `POST /api/blocks/[id]/publish`; publishing one invalidates the pages that use it.
- Draft preview at `/<slug>?preview=1`, permission-checked, `noindex`, and it renders the
  **draft** layout block, not the published one.
- Public reads are cached per slug with tag invalidation (see trap 2 for the profile that
  must be used).

### Security
- Route permissions are **longest declared route wins, default deny**. Verified live:

  | path | admin | editor | viewer |
  |---|---|---|---|
  | `/dashboard/overview` | ✓ | ✓ | ✓ |
  | `/dashboard/pages` | ✓ | ✓ | ✗ |
  | `/dashboard/users` | ✓ | ✗ | ✗ |
  | `/dashboard/unknown` | ✗ | ✗ | ✗ |
  | `/dashboard/usersX` | ✗ | ✗ | ✗ |

  Undeclared paths are rejected for **every** role including admin, so adding a route
  without a matching `route:` permission fails closed.
- Redirect targets go through `safeRedirectPath`, which rejects protocol-relative URLs,
  backslashes, **control characters** (URL parsers strip CR/LF/TAB, which is otherwise an
  open redirect), absolute URLs, and `/api/*` self-referential loops — plus a
  `new URL(...).origin` equality check as the durable backstop.
- Passwords are **scrypt with cost parameters stored in the hash**
  (`scrypt$N=…,r=…,p=…$salt$hash`), async so it does not block the event loop, with the
  legacy 3-part format still verifying and opportunistic rehash on login.
- Refresh-token rotation is atomic — a single `DELETE ... RETURNING` is the claim.
  Expired tokens are swept on login. Password change revokes tokens **in the same
  transaction**.
- Login and setup are rate-limited. Setup is race-safe via
  `pg_advisory_xact_lock`, not a unique index — two admins must remain legal.
- Block content is sanitised at render: CSS property allowlist, URL scheme allowlist,
  `rel="noopener noreferrer"` on external links. This renderer also runs in the public
  Server Component tree.
- Security headers set; `poweredByHeader` off. Full CSP deliberately deferred — block
  styles are inline `style` attributes, so a real policy needs `style-src-attr
  'unsafe-inline'` until styling moves to classes.

### Infrastructure
- vitest suite covering the pure-function seams: permission matrix, token
  sign/verify/tamper/`alg`-swap/expiry, password legacy format, block sanitiser XSS
  vectors, block-node depth guard at exactly 32/33, redirect validator, document
  migration.
- GitHub Actions CI: lint, typecheck, test.
- Five error boundaries, all correctly re-throwing `NEXT_*` digests so the startup gate's
  `redirect()` is not swallowed.
- `sitemap.ts` / `robots.ts`; per-page metadata with description, Open Graph, Twitter,
  canonical.
- README documents self-hosting properly.

---

## Load-bearing design decisions

- **Single-site, not multi-tenant.** One deployment serves one website; dashboard and
  public site share a domain. `users`/`roles` are collaborators. Never add tenant
  scoping.
- **Blocks only.** There are no structured content entity tables — the eleven `user_*` /
  `portfolios` tables were dropped in migration `0010`. Portfolio content is authored as
  block trees.
- **Block trees are versioned** — `{ version, nodes }` (`BlockDocument`) in
  `pages.content`, `blocks.children` and the published snapshot. Migrate on read via
  `src/lib/blocks/document.ts`; never write a bare array. Documents newer than
  `CURRENT_BLOCK_DOCUMENT_VERSION` are refused rather than silently downgraded.

---

## Traps — read before writing code

Each of these cost real debugging time. Do not rediscover them.

1. **Passwords are scrypt, not bcrypt.** `src/lib/password.ts` stores
   `scrypt$N=16384,r=8,p=1$<salt>$<hash>` (async `scrypt`); the legacy
   `scrypt:<salt>:<hash>` form is still verified and rehashed on login. A bcrypt or
   argon2 hash is **accepted at insert and then silently never logs in.**

2. **`revalidateTag` takes two arguments in Next.js 16**, and the `"max"` profile is
   *stale-while-revalidate* — using it for a user-triggered action makes the site lag one
   request behind. For immediate effect use `revalidateTag(tag, { expire: 0 })`. See
   `invalidatePageCache` in `src/repositories/pages.ts`. The one-argument form is
   deprecated.

3. **Every route is dynamically rendered, unavoidably.** The root layout calls `headers()`
   for the startup gate, which opts the whole app into dynamic rendering.
   `generateStaticParams` and route-level static config cannot help. Cache *data*
   (`unstable_cache`), not routes.

4. **`cacheComponents` is not enabled** in `next.config.ts`, so `use cache`, `cacheTag`
   and `cacheLife` are unavailable. The governing doc is
   `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md`.
   Read the bundled docs — this Next.js version differs from most material online.

5. **Never pass a function prop from `BlockRenderer` when `editable` is false.** The same
   renderer runs in the public Server Component tree; any handler throws and 500s the
   page. This already caused an outage on every public page containing a button block.

6. **Only styles on the allowlist in `src/lib/block-sanitize.ts` survive rendering.**
   Anything else is dropped silently, so adding a control to the style panel means adding
   its property to the allowlist too — otherwise it appears to work in the editor and
   vanishes on the public site.

7. **Cache keys must not contain an empty string.** `getCachedPublishedPage` uses
   `"__root__"` for the null slug because `""` mis-keys `unstable_cache` into a permanent
   miss. This presented as a 404 on `/` that looked like a data problem.

---

## Known open issues

None block normal use. Ranked by consequence.

### Correctness

1. **Undo history can corrupt.** The `mergeKey` coalescing branch in
   `use-editor-document.ts:81-87` returns without clearing `future`, and neither `undo`
   nor `redo` resets `lastMergeKey`/`lastMergeAt`. Edit a field → `Ctrl+Z` → refocus the
   same field and type within the merge window → the edit merges without pushing to
   `past` while `future` still holds the pre-undo state, so Redo lands on a tree that
   never followed from the current one.
2. **`Ctrl+S` bypasses the permission gate and the dirty check**
   (`use-editor-document.ts:316-320`). The Save button is gated by `canShowButton`, but
   the shortcut lives in the hook, which has no permission input — a read-only user fires
   a PATCH that 403s, and a clean document fires a no-op PATCH with a success toast. No
   `event.repeat` guard.
3. **Public layout-block reads ignore soft delete and are uncached**
   (`repositories/blocks.ts:188-202`) — a raw `db.select` per public request with no
   `deletedAt` predicate, so a deleted layout block keeps rendering.
4. **`expectedUpdatedAt` is optional**, and the comparison returns `true` when it is
   absent — any client that omits it opts out of the 409. The concurrency guard is
   advisory, not enforced.
### Editor UX

5. **The device-width toggle scrolls out of view** — it is `absolute top-3 right-3`
   inside the element that is now the scroll container (`canvas.tsx:356,359`), so on a
   long page the 360/768/full buttons are only reachable at scroll-top. Needs `sticky`
   or hoisting above the scroll container.
6. **`flex` and `minWidth` are unreachable where they matter.** Both sit behind `isFlex`
   (`style-panel.tsx:369`), true only when the *selected block is a flex container*. A
   heading/text/image/button inside a wrapping row is a flex **item**, so its `flex` and
   `minWidth` cannot be set from the panel — yet `scripts/sections.ts` depends on exactly
   those properties on children.
7. **Two competing background controls** — "Fill" writes `background`, "BG" writes
   `backgroundColor`. Both are allowlisted and emitted; which wins depends on key
   insertion order, so setting Fill on a block that already has BG appears to do nothing.
8. **The colour swatch misreports** `rgba()` and 3-digit hex (renders as `#000000`). The
   stored value is preserved — that was the point of the paired text input — but the
   swatch lies for exactly the values the seeded design uses.
9. **The unsaved-changes guard covers only the sidebar nav.** The logo link, the
    sign-out `router.replace`, and the conflict dialog's `window.location.reload()` all
    still discard a dirty draft. It also uses `window.confirm` while the editor's own
    back button uses a styled `Dialog` — two UIs for one decision.
10. **Section `aria-label` is read by the renderer but no control writes it** — dead code.
    There is also no "page has no `<h1>`" warning.

### Operational

11. **`bun test` (literal) fails** — Bun's own runner ignores `vitest.setup.ts`, so
    `env.ts` throws on missing `DATABASE_URL`. Use **`bun run test`** (vitest).
12. **No route-level authorization test.** The permission matrix is unit-tested, but
    `requireRoutePermission` — the actual enforcement seam — is not. This is the
    highest-value missing test.
13. **Query strings are dropped on the refresh bounce** — the layout reads `x-pathname`,
    which the proxy sets from `pathname` only, so refreshing from
    `/dashboard/pages/edit?slug=about` returns you to the editor with no slug.
14. **Latent redirect loops**: `dashboard/users/page.tsx:22` hardcodes
    `redirect("/dashboard/overview")` — the pattern removed from the layout — and the
    "No dashboard access" panel links to `/login`, which redirects a valid session
    straight back to the panel with no way to sign out.
15. **No structured logging** — 28 unstructured `console.error` calls.
16. `robots.ts` has no `disallow` for `/dashboard` or `/api`; `openGraph.images` is never
    set.
17. **Existing databases still hold pre-wrap seed trees.** `scripts/sections.ts` is fixed
    in source only; a seeded database needs `bun run db:seed -- --force`.

---

## Verifying

```bash
bun run typecheck && bun run lint && bun run test && bun run build
```

Use `bun run test`, **not** `bun test` (see issue 12).

Manual smoke, against a scratch database — never one holding real content:

```bash
bun run db:migrate && bun run db:seed
```

then check: a viewer cannot reach `/dashboard/users`; `/login?next=%2F%0D%0A%2Fevil.com`
stays on-origin; `POST /api/auth/login` with `{}` returns 400; a seeded page scrolls and
drags correctly in the editor; Preview on a published page shows the **draft**; editing a
layout block does not change the live site until publish; a public page at 360px has no
horizontal overflow.
