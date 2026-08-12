# Current situation

**Last verified: 2026-08-12 (operator polish).** Treat this header as an
expiry stamp — re-check against the tree before acting on anything critical.

A snapshot of what actually works, what is known-broken, and the design decisions that
are load-bearing. For what to build next, see [`future-plans.md`](./future-plans.md).
For completed reasoning, see [`whats-done.md`](./whats-done.md).

---

## Status

The core builder loop is complete. The security/correctness remediation and the
follow-up open-issue backlog are closed. The product is usable for day-to-day
authoring; remaining work is product depth (editor capability), not
blocking bugs.

Static gates: `bun run typecheck`, `bun run lint`, `bun run test`, `bun run build`.

---

## What works

### Editing
- Visual page editor at `/dashboard/pages/edit?slug=` — 13 block types (section,
  container, grid, card, heading, text, list, listItem, image, embed, button,
  divider, spacer), nested
  drag-and-drop **with reparenting**, drop indicator, `DragOverlay`.
- Scroll-corrected drop math (`active.rect.current.translated` + live `over.rect`) with
  `MeasuringStrategy.Always`.
- Undo/redo with derived `dirty`, mergeKey coalescing that clears `future`, external
  change detection, `Ctrl+Z` / `Ctrl+Shift+Z` / `Ctrl+Y`, `Delete`/`Backspace`, gated
  `Ctrl+S` (edit permission + dirty + no key-repeat). Dialog-scoped key bail-out.
- Layers Move up / down / Outdent / Indent; sticky 360/768/full canvas toggle; flex
  item `flex`/`minWidth` controls; single Fill background control; colour swatch
  unset/mixed state; section `aria-label`; missing-`<h1>` warning on pages.
- Dirty-nav Dialog covers sidebar, logo, sign-out, and conflict reload.
- Reusable layout blocks at `/dashboard/blocks/edit?id=` with their own publish step.
- Site themes at `/dashboard/themes` — registry tokens on `.ps-site` (light/dark
  pairs), site default layout for pages without `blockId`, live on public pages
  and the editor canvas.
- Local media at `/dashboard/media` and the image-block library picker — files in
  `upload/`, URLs at `/upload/…`.
- Inline canvas editing for heading / text / button / list item (double-click);
  text / list items support line breaks; **bold / italic / link** marks via
  `props.spans` (Ctrl/Cmd+B|I|K while editing).
- Duplicate selected block (Layers, Settings, `Ctrl/Cmd+D`) with remapped ids.
- Copy / cut / paste blocks (shared in-tab clipboard + best-effort system JSON).
- Debounced autosave (2s, quiet) while dirty; manual Save still toasts.
- Version history (History dialog) with restore; migration `0016`.
- Multi-select (Shift range, Ctrl/Cmd toggle) with bulk duplicate/copy/cut/delete.

### Publishing
- `pages.content` draft vs `pages.published_snapshot` public payload.
- Layout blocks publish via `blocks.published_children`; soft-deleted blocks do not
  render; published layout reads are `unstable_cache`'d and invalidated on publish.
- Draft preview at `/<slug>?preview=1` uses the **draft** layout tree.
- Public reads cached per slug with `{ expire: 0 }` tag invalidation.

### Security
- Longest declared route wins, default deny (including for admin).
- `safeRedirectPath` (control chars, origin check, `/api/*` ban).
- Async scrypt with cost params; atomic refresh rotation; transactional password-change
  revoke; login+setup rate limits; advisory-lock setup.
- Security headers; public CSP uses nonce `style-src` plus `style-src-attr 'none'`
  (block trees and themes use generated `<style>` with the request nonce).
  Dashboard keeps `'unsafe-inline'` styles for editor chrome.
- Full script nonce CSP still deferred — see `future-plans.md`.

### Infrastructure
- Vitest: permissions (incl. `requireRoutePermission`), tokens, password, sanitiser,
  depth guard, redirects, document migration, editor reducer; Postgres API matrix
  (`signInAs`) when `portfolio_studio_test` is up (otherwise skipped).
- CI: lint, typecheck, test, build. Prefer `bun run test` over bare `bun test`.
- Error boundaries re-throw `NEXT_*`. Structured `logError` JSON lines with
  correlation `id` and request-scoped `requestId` (`x-request-id` from proxy).
- `sitemap.ts` / `robots.ts` (disallows `/api/`, `/dashboard/`, auth routes).
- `public/og.png` for Open Graph / Twitter cards.

---

## Load-bearing design decisions

- **Single-site, not multi-tenant.**
- **Blocks only** — no structured content entity tables (dropped in `0010`).
- **Block trees are versioned** — `{ version, nodes }`; current version is **2**
  (`styles` as `{ base, sm, md, lg, hover }`, rendered as classes + `<style>` /
  `@container`). Newer-than-current documents are refused, never silently
  downgraded.

---

## Traps — read before writing code

1. **Passwords are scrypt, not bcrypt.** Format
   `scrypt$N=16384,r=8,p=1$<salt>$<hash>`; legacy `scrypt:<salt>:<hash>` still verifies
   and rehashes on login. A bcrypt/argon2 hash is accepted at insert and never logs in.
2. **`revalidateTag` needs `{ expire: 0 }`** for immediate user-triggered invalidation.
   The `"max"` profile is stale-while-revalidate.
3. **Every route is dynamically rendered** — root layout calls `headers()`. Cache *data*
   with `unstable_cache`, not routes.
4. **`cacheComponents` is off** — no `use cache` / `cacheTag` / `cacheLife`. Read the
   bundled Next docs for caching without cache components.
5. **Never pass a function prop from `BlockRenderer` when `editable` is false** — public
   Server Components throw on function props.
6. **Only allowlisted styles survive** (`src/lib/block-sanitize.ts`). Panel control +
   allowlist must land together. Styles are authored per slice (`base`/`sm`/…) and
   emitted as CSS text — unsafe values are stripped before the stylesheet is built.
7. **Cache keys must not use `""`** — landing page uses `"__root__"` for the null slug.
9. **Portfolio themes ≠ dashboard chrome** — `:root` tokens stay for the CMS UI;
   public/editor canvas use `.ps-site` + `--ps-*`. Do not wire `next-themes` for
   site appearance.
10. **Media defaults to disk under `upload/`** — not in `public/`. Deploys need a
    persistent volume (or accept empty media after redeploy) unless
    `UPLOADTHING_TOKEN` is set. Do not commit uploaded binaries.

---

## Known open issues

None from the previous 17-item backlog. Remaining work is planned product depth — see
[`future-plans.md`](./future-plans.md). Operator follow-up on existing installs:

- Run `bun run db:migrate` through **`0017`** if not already applied.
- Re-seed with `bun run db:seed -- --force` if rows predate theme CSS variables
  in section seeds (or the flex-wrap seed fix).
- Ensure the process can write to project-root `upload/` (created on first upload).
- Optional: create `portfolio_studio_test` and migrate it to exercise the
  `signInAs` API matrix (`src/test/integration/`).

---

## Verifying

```bash
bun run typecheck && bun run lint && bun run test && bun run build
```

Manual smoke against a **scratch** database:

```bash
bun run db:migrate && bun run db:seed
```

Viewer cannot reach `/dashboard/users`; open-redirect `next=` stays on-origin; login
`{}` → 400; seeded page scrolls/drags; Preview shows draft; layout publish is required
for live header changes; 360px has no horizontal overflow.
