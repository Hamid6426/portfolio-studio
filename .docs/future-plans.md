# Future plans

What to build next, in order. For the current state see
[`current-situation.md`](./current-situation.md); for completed reasoning see
[`whats-done.md`](./whats-done.md).

Read `AGENTS.md` first — it is the authority on stack, layering and routes.

---

## Now — product surface

Theme engine (registry + `site_settings` + `/dashboard/themes`) is done. Next
work deepens authoring and assets.

### Media and uploads
The image block is a raw URL field. A real media picker needs storage, an upload
route, an asset table, and a browser UI. Large. Do not assume uploadthing — it is
not a dependency.

### Theme follow-ups (optional)
- Theme-driven layout block swap (registry suggests a layout; applying a theme
  can set a site-wide default layout for pages without `blockId`).
- Per-theme dark/light pair toggled from settings (today each theme is one
  complete token set).
- Nonce-hardened CSP for the theme `<style>` block once Next nonces are wired.

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
- **`next-themes` for OS light/dark** — removed in `a4e2e87` as unused. Portfolio
  themes are server-selected site tokens, not a client preference toggle for the
  dashboard chrome.
