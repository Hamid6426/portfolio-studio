# Future plans

What to build next, in order. For the current state see
[`current-situation.md`](./current-situation.md); for completed reasoning see
[`whats-done.md`](./whats-done.md).

Read `AGENTS.md` first — it is the authority on stack, layering and routes.

---

## Now — product surface

BlockDocument v2 (responsive styles + generated classes + public `style-src-attr
'none'`) is done. Next work changes product shape rather than the data model.

Ordered by how much they change the system. **Themes are first** — they can now
compose with generated classes instead of losing to inline attributes.

### Theme engine
One-click theme switching from the spec. Nothing exists today: one fixed `:root`
token block in `globals.css`, no `.dark`, no switcher, no `themes` table.
`next-themes` was removed in `a4e2e87` — check why before reintroducing it.

Under **Blocks only**, a theme restyles design tokens and may swap layout blocks;
it cannot relayout the same content. Decide how theme tokens compose with
hand-set node styles (classes from v2): tokens as CSS variables that node styles
may reference, or a cascade layer below `.ps-*` rules.

### Media and uploads
The image block is a raw URL field. A real media picker needs storage, an upload
route, an asset table, and a browser UI. Large. Do not assume uploadthing — it is
not a dependency.

### Editor capability
- Inline text editing on canvas (today headings edit via sidebar).
- Rich text with line breaks — seeded lists are one `text` node per bullet with a
  `•` glyph because line breaks are impossible.
- Duplicate / copy-paste / multi-select.
- More block types (list, grid, card, spacer, embed).
- Autosave and version history.

### Operator polish
- Postgres integration suite with `signInAs(role)` (401/403/400 matrix).
- Add `public/og.png` (or a generated OG route) for social cards.
- Optional request-id middleware that threads into `logError`.
- Tighten `script-src` with nonces once Next’s nonce story is wired end-to-end
  (today scripts stay `'unsafe-inline'` so the app keeps booting).

### Custom domains
Deployment configuration for a single-site self-host. **Do not build
tenant-to-domain mapping.**

---

## Explicitly not doing

- **Tenant isolation of any kind.**
- **Replacing the hand-rolled JWT** — audited, header inside HMAC, `timingSafeEqual`,
  pinned by tests.
- **Keyboard drag-and-drop** — Layers panel moves are the accessible path.
- **Refresh-token reuse detection / families.**
- **Pagination** — tens of rows; list projections already dropped trees.
- **Soft-delete rework** — needs a partial unique on `pages.slug WHERE deleted_at IS
  NULL` first. Layout reads already honour `deletedAt`.
- **Viewport `@media` instead of `@container`** for block breakpoints — container
  queries are required so the editor device-width toggle and the public wrapper share
  one stylesheet.
