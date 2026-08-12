# Future plans

What to build next, in order. For the current state see
[`current-situation.md`](./current-situation.md); for completed reasoning see
[`whats-done.md`](./whats-done.md).

Read `AGENTS.md` first — it is the authority on stack, layering and routes.

---

## Now — product surface

Inline canvas text editing (heading / text / button) and multiline text blocks
are done. Stay inside the self-hosted single-site CMS scope.

### Editor capability (remaining)
- Richer text (marks: bold/italic/links) — still plain strings in `props.text`.
- Duplicate / copy-paste / multi-select.
- More block types (list, grid, card, spacer, embed).
- Autosave and version history.

### Theme follow-ups (optional)
- Theme-driven layout block swap (registry suggests a layout; applying a theme
  can set a site-wide default layout for pages without `blockId`).
- Per-theme dark/light pair toggled from settings (today each theme is one
  complete token set).
- Nonce-hardened CSP for the theme `<style>` block once Next nonces are wired.

### Operator polish
- Postgres integration suite with `signInAs(role)` (401/403/400 matrix).
- Add `public/og.png` (or a generated OG route) for social cards.
- Optional request-id middleware that threads into `logError`.
- Tighten `script-src` with nonces once Next’s nonce story is wired end-to-end
  (today scripts stay `'unsafe-inline'` so the app keeps booting).
- Optional object storage adapter behind the same `assets` API if a deploy has
  no persistent disk (not required for self-host).

**Not product work:** custom domains / Redis. Operators who clone the repo attach
their hostname in Vercel (or similar) and their DNS provider. Rate limits stay
in-process for a single-node self-host — no Redis dependency.

---

## Explicitly not doing

- **Tenant isolation of any kind.**
- **UploadThing / cloud-only media** — local `upload/` is the storage.
- **Redis** — not in the stack; single-node in-memory rate limits are enough.
- **In-app custom domains** — operator configures DNS + Vercel (or other host).
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
