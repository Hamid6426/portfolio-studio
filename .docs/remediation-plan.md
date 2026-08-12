# Portfolio Studio — post-Phase-1 remediation plan

> **In-repo copy** of the sequencing plan. Treat this as historical handoff + trap
> notes, not a live todo list. Follow-up verification and remaining fixes live in
> `.docs/plan-3.md`. Prefer `bun run test` (Vitest); password storage is
> `scrypt$N=…$salt$hash`; indexes + `published_children` both landed in migration
> `0012` (not a separate `0013` for publish). Migration `0013` adds
> `expires_at` index + custom-role permission rewrites.

## Context

Phase 1 (the core builder loop) shipped and is committed. Three independent read-only
audits were then run across the codebase — schema/roadmap claims, editor + public
renderer, and backend/auth/quality — followed by a design pass. They surfaced ~40
findings, several **exploitable today** and several that make the product **unusable on
a real page**.

This is a **handoff for another AI agent**. It names files, states failure modes, and
flags the traps that cost time to discover. Read `AGENTS.md` and `.docs/roadmap.md`
first — this covers only what is broken or missing.

Three claims were re-verified by hand before planning:
- `new URL("//evil.com", base)` → `http://evil.com/` — the open redirect is real
- The editor shell is `h-[calc(100vh-3.5rem)] overflow-hidden`, the canvas has no
  `overflow-y-auto`, and the page surface adds a second `overflow-hidden` — the canvas
  genuinely cannot scroll
- `canAccessRoute(viewerPerms, "/dashboard/users") === true`

### Already correct — do not re-litigate

- The hand-rolled HS256 JWT is **sound**: the header is inside the HMAC input, so
  `alg=none`/algorithm-confusion does not apply; comparison is `timingSafeEqual` with a
  length pre-check.
- `src/lib/block-sanitize.ts` is a well-built XSS boundary.
- The dnd-kit index math in `resolveDrop` is correct in all four move cases; the
  `nativeEvent.dndKit` innermost-activator reasoning is accurate.
- Migration `0010` (blocks-only) is clean — no orphaned FKs, no snapshot drift.
- `BlockDocument` storage is correct on every read and write path.

### Three framing decisions

1. **Tests ship *with* the fix, not before it.** Stage 0 adds the harness and no tests.
   For findings that change the semantics of a pure function (the route matcher, the
   `next=` validator, password format), writing tests first just pins the bug; writing
   them after pins whatever you happened to build. Writing them in the same commit makes
   the test the specification.
2. **Finding 1 cannot be fixed in `permissions.ts` alone.** `ensureDefaultRoles`
   union-merges defaults into existing rows on *every dashboard render*, so removing a
   permission from the defaults leaves it in the database forever. Code + data migration
   + merge-semantics change + redirect fix are **one deploy**.
3. **The responsive data model is specified, not built.** It is blocked on the version
   guard (5d) and is its own project.

---

## Stage 0 — harness and blast shields

Pure additions, conflicts with nothing, parallelisable with Stage 1.

- `"test": "bun test"` and `"typecheck": "tsc --noEmit"` in `package.json`. Bun is
  already the package manager — no new dependency. `next build` is currently the only
  type gate and nothing runs it automatically.
- `.github/workflows/ci.yml` — `setup-bun`, `bun install --frozen-lockfile`, then
  `typecheck`, `lint`, `test`. No DB service needed at this stage.
- Error/loading boundaries (none exist anywhere today): `src/app/global-error.tsx`,
  `src/app/error.tsx`, `src/app/dashboard/error.tsx`, `src/app/dashboard/loading.tsx`,
  `src/app/[slug]/error.tsx`.
  **Trap:** `error.tsx` must be `"use client"`; `global-error.tsx` renders its own
  `<html>`/`<body>`. Do not add one under `(auth)/` yet — the startup gate redirects from
  the root layout and a careless boundary swallows `redirect()`'s `NEXT_REDIRECT` throw.
  Re-throw anything carrying a `digest`.
- `rm src/db/schema.types.ts` — zero-byte, untracked, imported by nothing.

---

## Stage 1 — authorization (the only actively exploitable finding)

**1a + 1b + 1c + 1d must ship together.** Fixing 1a alone replaces "viewer reads every
email" with "viewer hits an infinite redirect"; without 1c it fixes nothing on any
existing install; without 1d an admin who revokes a permission gets it silently restored
on the next page load.

Today a **viewer** can load `/dashboard/users` and `/dashboard/roles`, call
`GET /api/users` (every name, email, role), `GET /api/pages` and `GET /api/blocks` (all
unpublished drafts), and preview drafts.

### 1a. Rewrite the matcher — `src/config/permissions.ts:109-121`

Replace prefix-any-grant with **longest declared route wins, default deny**:
1. Find the longest `R` in `ROUTE_PERMISSIONS` where `pathname === R || pathname.startsWith(R + "/")`
2. No match → `false` (undeclared paths denied; `AGENTS.md` already says "do not invent
   routes", so adding a route now forces adding its permission)
3. `R === "/dashboard"` and `pathname !== "/dashboard"` → `false` — the shell grant can
   never authorise a child
4. Otherwise → `list.includes("route:" + R)`

Then drop `PERMISSIONS.dashboard` from the editor and viewer defaults. `/dashboard`
itself only redirects to overview — special-case it as "allow if the user holds any
`route:/dashboard/*`". `requireRoutePermission` and `canPreviewDrafts` feed declared
paths into this function and keep working, which is what closes all four leaks at once.

### 1b. Fix the redirect target — `src/app/dashboard/layout.tsx:81-83`

`redirect("/dashboard/overview")` fires even when *that* is the unpermitted path. Use the
first entry of the already-computed `visibleNav`; if it is empty, **render an in-layout
"no dashboard access" panel — do not redirect.** Also delete the `jar.delete(...)` at
line 71 (see 2b).

### 1c. Data migration — `drizzle/0011_role_permissions_reset.sql`

Generate with `bunx drizzle-kit generate --custom --name=role_permissions_reset` — a
schema diff produces nothing; this is a data migration and needs the journal entry.
- System roles: full `UPDATE ... SET permissions = '<new literal>'` for
  `admin`/`editor`/`viewer`. Paste serialized literals; do not compute in SQL.
- Custom roles: strip the token as a whole comma-delimited element —
  `trim(both ',' from regexp_replace(',' || permissions || ',', ',route:/dashboard,', ',', 'g'))`

### 1d. Stop the merge resurrecting grants — `src/repositories/roles.ts:49-80`

`ensureDefaultRoles` becomes **create-if-missing only**; delete the merge branch. Move
callers out of the render path (`dashboard/layout.tsx:75`, `pages/edit/page.tsx`,
`blocks/edit/page.tsx`) — it already runs in `createAdminUser` and `scripts/seed.ts`,
which is the right place. Also removes 3 queries from every dashboard render. If you want
a re-apply path, add a `roles:sync` script, not a render side effect.

### 1e. Tests, same commit — `src/config/permissions.test.ts`

Table test over `(role, pathname) → boolean`: viewer gets overview only; editor gets
pages/blocks incl. `/dashboard/pages/edit` but not users; admin gets everything; and all
roles reject `/dashboard/../users`, `/dashboard/usersX`, `/dashboardX`, `/dashboard/unknown`.

**Verify by hand** (no integration suite yet): create a viewer, sign in, keep the cookie,
confirm `/api/users`, `/api/pages`, `/api/blocks` all 403, `/dashboard/users` redirects,
and `/?preview=1` serves the published page not the draft. Keep it as a shell script in
`scripts/` — it becomes the Stage 5f spec.

---

## Stage 2 — auth surface and session integrity

Sequence after Stage 1 (2b edits the block 1b edits).

**2a. Open redirect ×2.** New `src/lib/auth/safe-next.ts` used by
`src/app/api/auth/session/refresh/route.ts:18` and
`src/app/(auth)/login/login-form.tsx:53`. Reject unless: string, starts `/`, not `//` or
`/\`, no control chars, and `new URL(value, "http://x.invalid").origin === "http://x.invalid"`
— that last check is the durable one. Also **harden the GET-that-mutates**: cookies are
`SameSite=Lax`, so a top-level cross-site GET carries them and rotates the refresh token.
Reject unless `Sec-Fetch-Site` is `same-origin` or `none`.

**2b. `cookies().delete()` in a Server Component** — `dashboard/layout.tsx:71` throws
`ReadonlyRequestCookiesError` in Next 16 (render-phase store is sealed). The fix is not
another way to delete: `/api/auth/session/refresh` **already** clears both cookies when
there are no tokens, so delete the branching at lines 60-72 and always redirect there
when there is no valid session. One code path, cookies mutated only in the handler.

**2c. Unauthenticated 500s.** The crash is `payload.email.trim()` *before* `safeParse` in
`repositories/auth.ts:75-78,249-253` and `repositories/users.ts:78-83,170-175`. Move
normalisation into the Zod schemas and change those four signatures from
`payload: LoginPayload` to `payload: unknown` — **the type was lying about runtime
reality, which is how this shipped.** ~20 lines. Defer the 15-route `readJson` dedupe to
5e so it doesn't collide with everything.

**2d. Password — async + cost params.** `scryptSync` → `promisify(scrypt)`; this is the
real DoS lever (50-100 ms of blocked event loop per attempt on the process that also
renders the public site). Format `scrypt:<N>:<r>:<p>:<salt>:<hash>`, accept the legacy
3-part form as `N=16384,r=8,p=1`, rehash opportunistically on login. No migration. Both
functions become async — update the three call sites.

**2e. Login rate limiting.** In-memory fixed window on `ip:email`, ~10 / 15 min, applied
to login and setup. Document that it is per-process. **Do not add Redis.**

**2f. Revoke sessions on password change.** `repositories/users.ts` — delete that user's
refresh tokens in the same transaction. Document the residual 15-minute access-token
window; closing it needs a `tokens_valid_from` column checked on every session verify —
defer.

**2g. Rotation, indexes, setup race.**
- Atomic rotation: replace `findFirst` + `delete` with
  `DELETE ... WHERE token = $1 AND expires_at > now() RETURNING user_id`. The delete *is*
  the claim; zero rows → 401. No locking.
- Sweep expired rows opportunistically on login.
- **Reuse detection: skip.** Token families race badly with the axios 3-retry interceptor
  and the GET bounce. Atomic single-use rotation removes the correctness bug.
- Indexes (migration `0012`): unique on `user_refresh_tokens.token`, plus
  `user_refresh_tokens.user_id`, `users.role`, `blocks.can_be_layout`.
- Setup race: `db.transaction` + `SELECT pg_advisory_xact_lock(hashtext('portfolio-studio:setup'))`.
  **Do not** use a partial unique index on `role='admin'` — this product has
  collaborators and two admins must remain legal.

**2h. Startup gate cost.** `getStartupState` runs 3 uncached queries on *every* request
including public page views. Module-scope `isReady` short-circuit once ready; a redeploy
re-checks. With 1d this takes the public-request floor from ~4 queries to 1.

---

## Stage 3 — make the editor usable

Different files from Stages 1-2 — a second agent can run this in parallel from the start.

**3a. Canvas scrolling + drop math — MUST ship together.** `editor-shell.tsx:137` fixes
the shell height with `overflow-hidden`; `canvas.tsx:336` has no `overflow-y-auto`; the
page surface at `:341-343` adds another. A seeded page is ~10 screens, ~90% unreachable.
They are one change because `resolveDrop` reads `over.rect`, captured once at drag start
under `MeasuringStrategy.WhileDragging` — add scrolling alone and every post-scroll drop
lands wrong, which is worse than not scrolling. Do all of: `overflow-y-auto` on the outer
canvas with a `min-h-0` flex chain; drop `overflow-hidden` from the page surface;
`measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}`; and re-derive
`pointerY` against the scroll container (or use `active.rect.current.translated`) instead
of `activatorEvent.clientY + delta.y`, which drifts by exactly the scroll offset.
*Verify at 50% zoom too.*

**3b. Preview shows the draft.** `editor-shell.tsx:288-290` — always `pagePreviewPath`.
`PublicPageView`'s banner already distinguishes the states; it has just never been
reachable on a published page. Three lines.

**3c. Keyboard.** Add `Backspace` (Mac has no forward-delete, so deletion is currently
impossible on a MacBook), `Ctrl/Cmd+S` → save, and bail out of the global handler when
focus is inside `[role="dialog"]` — today `Delete` destroys a block behind the open
unsaved-changes modal.

**3d. Insertion target.** `use-editor-document.ts:187-207` appends to root when a leaf is
selected. Add `insertAfter(nodes, siblingId, node)` to `tree-ops.ts`: container → inside;
leaf → next sibling; nothing selected → root.

**3e. Undo granularity.** Every `onChange` clones the tree, so typing one word evicts
structural history. Add an optional `mergeKey` to the `apply` action: same key within
~500 ms replaces `present` instead of pushing to `past`. Key on `${nodeId}:${field}`.

**3f. Nav guard — partial, deliberately.** Next 16 `Link` supports `onNavigate` with
`preventDefault()`; lift `dirty` into a context and have `dashboard-nav.tsx` consult it.
**Do not guard browser back/forward** — the App Router has no cancellable navigation
event, and the `history.pushState` sentinel breaks the back button in ways users notice
more than a lost draft. `beforeunload` already covers reload/close. Comment the gap.

**Not doing: keyboard drag-and-drop.** `KeyboardSensor` needs a custom coordinate getter
to express *reparenting* in a nested tree plus per-level announcements — multi-day, high
chance of shipping something worse than nothing. Instead add **Move up / Move down /
Outdent / Indent buttons to the Layers panel**, reusing `moveNode`: fully keyboard- and
screen-reader-accessible and unit-testable. Then remove the `attributes` spread on the
selected block so dnd-kit stops announcing "press the space bar" for a gesture that does
not exist.

---

## Stage 4 — what visitors actually see

**4a. SEO.** `generateMetadata` emits only `{title}`, so the stored `page.description` is
never used and **every public page inherits the CMS's own marketing copy** from the root
layout — a portfolio CMS whose pages all describe the CMS. Add `description`,
`openGraph`, `twitter`, `alternates.canonical` in *both* `[slug]/page.tsx` and
`page.tsx`; add `metadataBase`; add `src/app/sitemap.ts` and `src/app/robots.ts`
(sitemap needs a published-slugs query). Depends on the env work below.
**Trap:** `NEXT_PUBLIC_*` is inlined only where it appears as a literal
`process.env.NEXT_PUBLIC_APP_URL` — keep the literals in `axiosInstance.ts` and add a
server-only `APP_URL` for `metadataBase`.

**4b. Semantics.** `public-page-view.tsx:57-67` — the *content* branch (the one that
actually runs) has no `<main>`; only the empty-page branch does. Add it, plus a skip link
and an optional `aria-label` for sections. **Do not auto-inject an `<h1>`** — warn in the
editor when a page has no level-1 heading; the renderer should not invent content.

**4c. Renderer hygiene.** Default `image.src` from `https://placehold.co/800x450` to `""`
(every new image currently makes a third-party request from the visitor's browser) and
`alt` from `"Image"` to `""`; add `loading="lazy"`/`decoding="async"`. **Stay on `<img>`**
— `next/image` needs `remotePatterns` for author-supplied URLs. The `default:` case must
render `null` publicly and keep `Unknown block: {type}` only when `editable`.

**4d. Responsive stop-gap.**
- Allowlist `flexWrap`, `minWidth`, `flex` in `block-sanitize.ts` — **and add the panel
  controls in the same commit**; a control without its allowlist entry works in the
  editor and vanishes publicly.
- **Remove `scrollbar-none` from `html` (`globals.css:95`).** This is why horizontal
  overflow presents as "content is cut off" instead of "the page scrolls sideways" — it
  is actively hiding the symptom.
- Re-seed `ROW`/`NAV_ROW`/`BUTTON_ROW` in `scripts/sections.ts:66-80` with
  `flexWrap: wrap` and child `minWidth`; update the file header comment that documents
  the four-item workaround; re-run `db:seed -- --force`.
- Add the five allowlisted-but-uncontrollable properties: `lineHeight`,
  `textDecoration`, `border`, `borderTop`, `backgroundColor`. **The Divider block
  currently has no editable visible property at all.**
- Append `px` to unitless numerics on commit; keep colour as text input + swatch so
  `rgba()` alpha and 3-digit hex survive (`<input type=color>` destroys both); add an
  unset state to every `Segmented`; **remove `display: grid`** until grid properties are
  allowlisted.
- Canvas device-width toggle (360/768/full) — *after* 3a, same element.

---

## Stage 5 — correctness debt and the real test suite

**5a. PATCH is not PUT.** `updateBlockPayloadSchema = createBlockPayloadSchema.partial()`,
then build a sparse `updates` object like `updatePage` already does. Today
`PATCH /api/blocks/:id {"name":"x"}` silently wipes the description and un-marks the
block as a layout.

**5b. Optimistic concurrency — server half only.** `staleTime: 60_000` with no
`refetchOnWindowFocus` means the "Changed elsewhere" badge can only appear *after* you
have overwritten someone. Add `expectedUpdatedAt` to the payload, compare in
`updatePage`, return 409, surface a dialog; flip `refetchOnWindowFocus: true` on the
single-page query. **No polling** — wrong trade for a mostly-single-author CMS.

**5c. List payload weight — trim, don't paginate.** `listPages`/`listBlocks` ship full
block trees for tables that render a title and a count. Add list-item response types
without `content`/`children` and compute `childCount` with `jsonb_array_length` in SQL.
Pagination is not warranted at tens of rows.

**5d. Version-clamp guard — gates all future block work.**
`src/lib/blocks/document.ts:86-89` relabels a newer document as v1 and lets an old build
save it back down, destroying data. Return an explicit "unreadable — newer version"
result, render an error rather than content, and refuse writes when the stored version
exceeds `CURRENT_BLOCK_DOCUMENT_VERSION`. **Cannot trigger today** (v1 is the only
version) — which is exactly why it must land before anyone bumps it.

**5e. API DRY — must be last.** `readJsonBody<T>()` replacing ~15 identical try/catch
blocks and one shared `firstIssueField` replacing four copies. Purely mechanical, touches
every route file, so it must not overlap another stage.

**5f. Integration tests.** Now that semantics are settled: test Postgres, a
`signInAs(role)` helper minting a real cookie, and the per-route 401/403/400 matrix from
Stage 1's curl script. Plus `tokens.ts` (tamper, expiry, alg confusion), `block-sanitize`
(`url(`, `javascript:`, `//host`), and the depth guard at exactly 32/33.

---

## Stage 6 — layout blocks and draft/publish (architectural)

The deepest design flaw: `[slug]/page.tsx:61` and `page.tsx:59` load block `children`
**live** via `getBlockById`, and `publishPage` doesn't snapshot them. Saving a layout
block mutates every live page instantly, bypassing the entire draft/publish system.
`blocks.published_at` exists via `baseColumns` and is unused.

- **(a)** Snapshot `layoutChildren` into `PublishedPageSnapshot` — cheap, no migration,
  but editing a shared nav then requires republishing every page, with no UI for it.
- **(b)** Publish blocks independently: `blocks.published_children` (migration `0013`),
  `POST /api/blocks/:id/publish`, a publish button in the block editor, cached+tagged
  public block reads, invalidating `PAGES_CACHE_TAG`.

**Take (b).** A layout block is a shared asset; publishing it *should* update everything
at once — that is what an author expects of a site header, and it is the only model where
"publish" means the same thing at both levels. Draft preview must render the *draft*
layout, which is why 3b lands first. Use `revalidateTag(tag, { expire: 0 })`, never the
`"max"` profile.

---

## Parallel track — ship-readiness

- **Env**: `NEXT_PUBLIC_APP_URL` + server `APP_URL` into `src/config/env.ts` and
  `.env.example`. Add a `.refine()` that **refuses to boot in production when
  `AUTH_SECRET` equals the `.env.example` placeholder** — it is 49 chars and passes
  `min(32)`, and someone will deploy it.
- **Headers**: `poweredByHeader: false` plus `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors 'none'`, HSTS in production.
  **Skip full CSP** — block styles are inline `style` attributes, so a real policy needs
  `style-src-attr 'unsafe-inline'` plus nonce plumbing through `proxy.ts`; a half-CSP that
  breaks the renderer is worse than none. Revisit after the responsive v2 model moves
  styling to classes.
- **README last**, once it can describe the fixed system: prerequisites, `.env.local`,
  `db:migrate`, `db:seed` and the datasets convention, the startup gate, deployment,
  security posture. For a product whose premise is "someone else self-hosts this",
  create-next-app boilerplate is a product defect.
- Update `AGENTS.md` (new route ⇒ new route permission; default-deny) and
  `.docs/roadmap.md` (tick the setup-transaction defect; record the 5d gate on
  BlockDocument v2).

---

## Future project — responsive data model (specified, not built)

`BlockNode.styles` is a flat `Record<string,string>` rendered into an inline `style`
attribute, which cannot express a media query or `:hover` at any layer. Target:

- `styles` keyed by breakpoint and state: `{ base, sm, md, lg, hover }`
- each node gets a stable generated class; the renderer emits a `<style>` block
- breakpoint + state switchers in the style panel, device-width toggle on the canvas
- bumps `CURRENT_BLOCK_DOCUMENT_VERSION` with a v1→v2 transform
- **Blocked on 5d.** Do not bump the version while `migrateNodes` silently relabels a
  newer document as v1.
- Unlocks a real CSP without `'unsafe-inline'`.

---

## Dependency graph

```
Stage 0 ──┬─→ Stage 1 (authz)  ──→ Stage 2 (auth surface)
          │     [1a+1b+1c+1d = ONE deploy] [2b edits the block 1b edits]
          ├─→ Stage 3 (editor) [3a+3b(drop math) one commit; 3f after 3a]
          └─→ Parallel track (env → headers → README last)

Stage 3b ─→ Stage 6 (layout publishing)
Stage 4a needs the env work
Stage 4d ── … ── Stage 5d (version guard) ─→ [future] BlockDocument v2
Stage 5e must be last — touches every route file
```

**Migrations:** `0011` custom/data (role reset) · `0012` generated (indexes) · `0013`
generated (`blocks.published_children`). Password format, block-document version and the
snapshot shape all change **without** migrations — backward-compatible readers.

**Rejected for now:** keyboard drag-and-drop (replaced with Layers-panel move buttons),
full CSP, pagination, refresh-token families, browser back/forward guard, soft-delete
rework, Drizzle `relations()`, themes, `next/image`, tenant isolation of any kind (this
product is single-site).

---

## Verification

`bun run typecheck && bun run lint && bun test && bun run build` green after each stage.
Manual smoke against a **scratch database**, never the Neon instance holding real content:

1. A viewer cannot reach `/dashboard/users` or `GET /api/users` (1a)
2. `GET /api/auth/session/refresh?next=//evil.com` does not leave the origin; same with
   `Sec-Fetch-Site: cross-site` is rejected (2a)
3. `POST /api/auth/login` with `{}`, `{"email":1}`, and no body → 400 each, never 500 (2c)
4. Changing a password 401s the other session's refresh (2f)
5. Two concurrent `POST /api/auth/setup` → exactly one admin (2g)
6. Scroll to the bottom of a seeded page in the editor; drag across containers near the
   scroll edges; repeat at 50% zoom (3a)
7. Edit a published page → Preview shows the **draft** (3b)
8. Edit a layout block → the live site does not change until publish (Stage 6)
9. A public page at 360px has no horizontal overflow (4d)
10. View source: unique `description`, OG tags, `/sitemap.xml`, `/robots.txt` (4a)
```
