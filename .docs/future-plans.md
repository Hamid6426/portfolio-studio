# Future plans

What to build next, in order. For the current state see
[`current-situation.md`](./current-situation.md); for completed reasoning see
[`whats-done.md`](./whats-done.md).

Read `AGENTS.md` first — it is the authority on stack, layering and routes.
Stay inside the **self-hosted, single-site** CMS scope.

---

## Now — operator polish

Operator polish backlog is done (auth matrix, OG image, request-id logging,
UploadThing optional storage, script-src nonces).

**Not product work:** custom domains / Redis. Operators who clone the repo attach
their hostname in Vercel (or similar) and their DNS provider. Rate limits stay
in-process for a single-node self-host — no Redis dependency.

---

## Recently completed

- Editor capability backlog (duplicate, clipboard, block types, autosave,
  history, rich text marks, multi-select).
- Theme follow-ups: site default layout on apply, light/dark pairs, nonce
  `style-src` for public theme/block `<style>` (migration `0017`).
- Operator polish: `signInAs` API matrix, `public/og.png`, request-id →
  `logError`, optional UploadThing, script-src nonces + `strict-dynamic`.

---

## Explicitly not doing

- **Tenant isolation of any kind.**
- **Redis** — not in the stack; single-node in-memory rate limits are enough.
- **Cloud-only media as the only option** — local `upload/` stays the default;
  UploadThing is optional when `UPLOADTHING_TOKEN` is set.
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
