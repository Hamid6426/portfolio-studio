# Current situation

**Last verified: 2026-08-12 (post open-issue close-out).** Treat this header as an
expiry stamp — re-check against the tree before acting on anything critical.

A snapshot of what actually works, what is known-broken, and the design decisions that
are load-bearing. For what to build next, see [`future-plans.md`](./future-plans.md).
For completed reasoning, see [`whats-done.md`](./whats-done.md).

---

## Status

The core builder loop is complete. The security/correctness remediation and the
follow-up open-issue backlog are closed. The product is usable for day-to-day
authoring; remaining work is product depth (responsive model, themes, media), not
blocking bugs.

Static gates: `bun run typecheck`, `bun run lint`, `bun run test`, `bun run build`.

---

## What works

### Editing
- Visual page editor at `/dashboard/pages/edit?slug=` — 7 block types, nested
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
- Block sanitiser; security headers; `poweredByHeader` off. Full CSP deferred until
  styles leave inline attributes.

### Infrastructure
- Vitest: permissions (incl. `requireRoutePermission`), tokens, password, sanitiser,
  depth guard, redirects, document migration, editor reducer.
- CI: lint, typecheck, test, build. Prefer `bun run test` over bare `bun test`.
- Error boundaries re-throw `NEXT_*`. Structured `logError` JSON lines with correlation id.
- `sitemap.ts` / `robots.ts` (disallows `/api/`, `/dashboard/`, auth routes).

---

## Load-bearing design decisions

- **Single-site, not multi-tenant.**
- **Blocks only** — no structured content entity tables (dropped in `0010`).
- **Block trees are versioned** — `{ version, nodes }`; newer-than-current documents are
  refused, never silently downgraded. Required before any BlockDocument v2 bump.

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
   allowlist must land together.
7. **Cache keys must not use `""`** — landing page uses `"__root__"` for the null slug.

---

## Known open issues

None from the previous 17-item backlog. Remaining work is planned product depth — see
[`future-plans.md`](./future-plans.md). Operator follow-up on existing installs:

- Run `bun run db:migrate` through `0013` if not already applied.
- Re-seed with `bun run db:seed -- --force` if rows predate the flex-wrap seed fix.
- Optionally add `public/og.png` for social previews (metadata intentionally omits a
  broken image URL until the file exists).

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
