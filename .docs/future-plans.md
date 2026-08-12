# Future plans

What to build next, in order. For the current state and the numbered open issues
referenced below, see [`current-situation.md`](./current-situation.md).

Read `AGENTS.md` first — it is the authority on stack, layering and routes.

---

## Now — close the open issues

Small, contained, no design decisions required. Roughly in value order.

### Correctness first

1. **Fix the undo-history corruption** (issue 1). The merge branch must clear `future`,
   and `undo`/`redo` must reset `lastMergeKey`/`lastMergeAt`. Add a regression test:
   edit → undo → refocus and retype inside the merge window → redo must land on a tree
   that follows from the current one.
2. **Gate `Ctrl+S`** (issue 2). Thread `canEdit` into the document hook, skip when not
   dirty, and add an `event.repeat` guard.
3. **Filter soft-deleted layout blocks and cache the public read** (issue 3). Add a
   `deletedAt` predicate to `getLayoutBlockNodes`, wrap the published read in
   `unstable_cache` with a block tag, and invalidate it on block publish. Today
   `invalidatePagesUsingBlock` invalidates page tags that no longer gate this read.
4. **Make `expectedUpdatedAt` required** for editor saves (issue 4), or accept that the
   409 is advisory and say so in the code. Right now it silently opts out.

### Editor usability

5. **Make the device-width toggle `sticky`** (issue 5) — one line, currently unreachable
   after scrolling.
6. **Expose `flex` / `minWidth` for flex items, not just flex containers** (issue 6).
   This is what makes the responsive stop-gap actually usable: show them when the
   *parent* is a flex container, not the selected node.
7. **Resolve the Fill vs BG collision** (issue 7) — one control that writes one property.
   Prefer keeping `background` and removing the `backgroundColor` control.
8. **Give the colour swatch a "mixed/unset" state** for `rgba()` and 3-digit hex
   (issue 8) instead of silently showing black.
9. **Extend the dirty guard** to the logo link, sign-out, and the conflict dialog's
    reload (issue 9), and use the styled `Dialog` everywhere instead of
    `window.confirm`.
10. **Add the section `aria-label` control** so the renderer support stops being dead
    code, and warn in the editor when a page has no `<h1>` (issue 10). Do not
    auto-inject a heading — the renderer should not invent content.

### Infrastructure

11. **Add the route-level authorization test** (issue 12) — the highest-value missing
    test. `requireRoutePermission` is the real enforcement seam and nothing pins it. A
    DB-backed suite with a `signInAs(role)` helper minting a real cookie, asserting
    401 / 403 / 400 per route, would also have caught the unauthenticated-500 class.
12. **Fix `bun test` or the docs that reference it** (issue 11).
13. **Preserve query strings on the refresh bounce** (issue 13) — have the proxy pass
    search params alongside `x-pathname`.
14. **Remove the latent redirect loops** (issue 14) and point the "no dashboard access"
    panel at sign-out rather than `/login`.
15. **Add a minimal structured logger** (issue 15) — level, request id, and an error id
    echoed to the user so a self-hoster can correlate a report with a log line.
16. `robots.ts` disallow for `/dashboard` and `/api`; an `openGraph.images` default
    (issue 16).
17. **Re-seed existing databases** with `bun run db:seed -- --force` (issue 17).

---

## Next — responsive layout (the real fix)

The current responsive support is a stop-gap: `flexWrap`, `minWidth` and `flex` were
allowlisted and the seed rows wrap. **Breakpoints and hover states remain impossible by
data model** — `BlockNode.styles` is a flat `Record<string, string>` rendered into an
inline `style` attribute, and inline styles cannot hold a media query or `:hover`.

This is a deliberate project, not a panel feature.

### Design

- `styles` becomes keyed by breakpoint and state:
  `{ base, sm, md, lg, hover }`, each a property map.
- Each node gets a stable generated class; the renderer emits a `<style>` block instead
  of inline `style` attributes.
- The style panel gains breakpoint and state switchers; the canvas already has the
  device-width toggle to preview against.
- Cascade order must be explicit and rendered deterministically, so `base` is not
  silently overridden by source order.

### Sequencing

- **Bump `CURRENT_BLOCK_DOCUMENT_VERSION` to 2** and write the v1→v2 transform in
  `src/lib/blocks/document.ts`. The version guard that refuses to read newer documents is
  already in place, so this is now safe to do — that guard was the prerequisite.
- Migrate on read; never rewrite stored rows in a migration. Published snapshots carry
  their own copy of the tree and must migrate on read too.
- Moving off inline styles **unlocks a real CSP** without `style-src-attr
  'unsafe-inline'` — do that in the same project while the reasoning is fresh.

---

## Later — product surface

Ordered by how much they change the shape of the system.

### Theme engine
The spec's one-click theme switching. Nothing exists: one fixed `:root` token block in
`globals.css`, no `.dark`, no switcher, no `themes` table. `next-themes` was deliberately
removed in `a4e2e87` — check why before reintroducing it.

Under **Blocks only**, a theme can restyle design tokens and optionally swap layout
blocks; it cannot relayout the same content, because there is no structured content to
relayout. Decide explicitly how a theme composes with a hand-set block style — inline
per-node styles currently win, so themes will appear not to work on any edited page. The
responsive project above changes this, since styles move to generated classes; **doing
themes first would mean solving the cascade twice.**

### Media and uploads
There is no upload infrastructure at all — the image block is a raw URL text field, and
uploadthing is *not* a dependency despite older notes. A real media picker means a
storage provider, an upload route, an asset table, and a browser UI. Large.

### Editor capability
Inline text editing on canvas (today a heading is edited through a sidebar input);
rich text with line breaks — currently impossible, which is why seeded lists are one
`text` node per bullet with a `•` glyph; duplicate / copy-paste / multi-select; more
block types (list, grid, card, spacer, embed); autosave and version history.

### Custom domains
For a self-hosted single-site app this is deployment configuration, not application
code. **Do not build tenant-to-domain mapping** — that is the multi-tenant design this
product explicitly is not.

---

## Explicitly not doing

- **Tenant isolation of any kind.** Single-site. `users`/`roles` are collaborators.
- **Replacing the hand-rolled JWT.** It was audited and is correct — the header is inside
  the HMAC input, so `alg=none` and algorithm confusion do not apply, and comparison is
  `timingSafeEqual` with a length pre-check. It is pinned by tests. Leave it.
- **Keyboard drag-and-drop.** Expressing reparenting in a nested tree via
  `KeyboardSensor` needs a custom coordinate getter and per-level announcements —
  multi-day, and likely worse than what exists. The Layers panel move buttons are the
  accessible path. (Do override
  `accessibility.screenReaderInstructions`, though: dnd-kit's default "press the space
  bar" text is still in the DOM for a gesture that no longer exists.)
- **Refresh-token reuse detection.** Token families race badly with the axios retry
  interceptor and the GET refresh bounce. Atomic single-use rotation already removes the
  correctness bug.
- **Pagination.** This is one person's portfolio — tens of rows. The list projections
  already dropped the block trees, which was the real cost.
- **Soft-delete rework.** Would need a partial unique index on
  `pages.slug WHERE deleted_at IS NULL` first. Either commit to it properly or drop the
  columns; half-implemented is the worst option, but it is not urgent.
- **Full CSP** until styling moves off inline attributes — see the responsive project.
