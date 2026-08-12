# Future plans

What to build next, in order. For the current state see
[`current-situation.md`](./current-situation.md); for completed reasoning see
[`whats-done.md`](./whats-done.md).

Read `AGENTS.md` first — it is the authority on stack, layering and routes.

---

## Now — responsive layout (BlockDocument v2)

The stop-gap (`flexWrap` / `minWidth` / `flex` + seed wrap + device toggle) is in place.
**Breakpoints and hover remain impossible by data model** — `BlockNode.styles` is a flat
`Record<string, string>` rendered as an inline `style` attribute.

This is a deliberate project, not a panel feature. The version guard that refuses newer
documents is already in place, so bumping is safe.

### Design

- `styles` becomes keyed by breakpoint and state:
  `{ base, sm, md, lg, hover }`, each a property map.
- Each node gets a stable generated class; the renderer emits a `<style>` block instead
  of inline `style` attributes.
- Style panel gains breakpoint / state switchers; canvas device toggle already exists.
- Cascade order must be explicit and deterministic so `base` is not silently overridden
  by source order.

### Sequencing

1. Bump `CURRENT_BLOCK_DOCUMENT_VERSION` to **2** and write the v1→v2 transform in
   `src/lib/blocks/document.ts`. Migrate on read only — never rewrite stored rows in a
   SQL migration. Published snapshots carry their own tree and must migrate on read too.
2. Update sanitiser / style panel / public renderer for the nested shape.
3. Moving off inline styles **unlocks a real CSP** without `style-src-attr
   'unsafe-inline'` — do that in the same project while the reasoning is fresh.
4. Add `public/og.png` (or a generated OG route) once visual identity is stable enough
   to put on shared cards.

### Acceptance

- A seeded page can set different padding at `sm` vs `base` and the public HTML shows a
  `<style>` block with a media query — not competing inline attributes.
- An old v1 document still renders after migrate-on-read.
- A build that only understands v1 refuses a v2 document (already guaranteed by the
  version guard).

---

## Next — product surface

Ordered by how much they change the shape of the system. **Do themes after responsive
v2** — otherwise the cascade is solved twice (inline styles currently beat any token
theme on edited nodes).

### Theme engine
One-click theme switching from the spec. Nothing exists today: one fixed `:root` token
block in `globals.css`, no `.dark`, no switcher, no `themes` table. `next-themes` was
removed in `a4e2e87` — check why before reintroducing it.

Under **Blocks only**, a theme restyles design tokens and may swap layout blocks; it
cannot relayout the same content. Decide explicitly how a theme composes with hand-set
node styles once those live as generated classes.

### Media and uploads
The image block is a raw URL field. A real media picker needs storage, an upload route,
an asset table, and a browser UI. Large. Do not assume uploadthing — it is not a
dependency.

### Editor capability
- Inline text editing on canvas (today headings edit via sidebar).
- Rich text with line breaks — seeded lists are one `text` node per bullet with a `•`
  glyph because line breaks are impossible.
- Duplicate / copy-paste / multi-select.
- More block types (list, grid, card, spacer, embed).
- Autosave and version history.

### Operator polish
- Postgres integration suite with `signInAs(role)` (401/403/400 matrix) — unit tests pin
  the matcher and `requireRoutePermission`, but not the full HTTP surface.
- Backup restore dry-run docs against a real dump (README already has `pg_dump` sketch).
- Optional request-id middleware that threads into `logError`.

### Custom domains
Deployment configuration for a single-site self-host. **Do not build tenant-to-domain
mapping.**

---

## Explicitly not doing

- **Tenant isolation of any kind.**
- **Replacing the hand-rolled JWT** — audited, header inside HMAC, `timingSafeEqual`,
  pinned by tests.
- **Keyboard drag-and-drop** — Layers panel moves are the accessible path. (Screen-reader
  instructions already override the stale "press space bar" copy.)
- **Refresh-token reuse detection / families** — races with axios retries and the GET
  bounce; atomic single-use rotation is enough.
- **Pagination** — tens of rows; list projections already dropped trees.
- **Soft-delete rework** — needs a partial unique on `pages.slug WHERE deleted_at IS NULL`
  first. Commit properly or drop the columns; half-implemented is worst. Not urgent —
  layout reads already honour `deletedAt`.
- **Full CSP** until styling moves off inline attributes (see responsive project).
