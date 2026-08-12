# Audit — 2026-08-12

**Commit `079e718`. Working tree clean.**

Covers the 19 commits since the last review: theme engine, `BlockDocument` v2 + responsive
styling, media uploads (local + UploadThing), content revisions / version history, inline
rich-text editing, multi-select, clipboard, autosave, list blocks, CSP.

Method: three independent read-only audits (data model / migrations, editor, media +
security + tests), each asked to be skeptical and cite `file:line`. The headline findings
were then re-verified by hand against the running code and database.

**Gates:** `tsc` clean · `drizzle-kit check` "Everything's fine" · 23 test files,
119 passed / **8 skipped** · lint 1 warning (`exhaustive-deps`, `editor-shell.tsx:167`).

**Two of those gates are lying to you** — see B1 and A1.

---

## Verdict

The new work is substantially better engineered than the surface area suggests. The media
upload path is the best-hardened new code in the repo (magic-byte sniffing that ignores the
declared type, SVG rejected, server-generated UUID filenames, traversal blocked, `nosniff`).
The rich-text path **cannot inject markup into the public site** — the DOM→span walk
allowlists tags, URLs go through `sanitizeUrl`, and the public renderer emits React children
with no `dangerouslySetInnerHTML`. Every previously-reported editor bug that was marked
fixed is genuinely fixed, several with regression tests.

**Nothing here is exploitable by an unauthenticated visitor.**

What will actually hurt you is data loss and a broken migration chain, not attackers.

---

## A. Critical — data loss and deploy breakage

### A1. Migrations `0014`–`0017` have no snapshots. The next `db:generate` breaks every install.

`drizzle/meta/` contains snapshots `0000`–`0013`; `_journal.json` lists `0000`–`0017`.
Those four migrations were hand-written (each commit touched only `<tag>.sql` +
`_journal.json`, with round `when` values).

drizzle-kit picks the previous snapshot by sorting the meta directory, **not** from the
journal. So the next `bun run db:generate` diffs `src/db/schema.ts` against
`0013_snapshot.json` and emits an `0018` containing full `CREATE TABLE site_settings`,
`assets`, `content_revisions` and the `default_layout_block_id` column — a replay of
`0014`–`0017`. Applying that anywhere those already ran dies with
`42P07 relation "site_settings" already exists`, leaving the migration table mid-way. The
new snapshot would also bake `prevId` pointing at `0013`, permanently corrupting the chain.

**`drizzle-kit check` passes because it only looks for collisions among snapshots that
exist.** The green check is a false negative.

Runtime deploys are fine today — `migrate` reads the journal and SQL only. This breaks the
moment anyone adds a column. **Fix before the next schema change, not after. Effort: M.**

### A2. A flat (v1) style map sent to the API is silently deleted, then stamped v2.

`src/payloads/block-node.ts:15-22` types `styles` as a bare `z.object({base, sm, md, lg,
hover})`. Zod v4 strips unknown keys. Verified against the real schema:

```
input:  { width: "100%", padding: "8px" }
parsed: {}          ← accepted, not rejected
```

`toBlockDocument` then stamps `version: 2`, so `migrateBlockDocument` will never touch it
again. The loss is permanent, silent, and reported as "Page saved."

Two reachable paths:

1. **Clipboard paste** — `editor-clipboard.ts:41` *deliberately* accepts flat maps
   (`!isResponsiveStyles(...) && !isFlatStringMap(...)`). Copy a node from an older tab or
   build, paste, save → every style on it is gone.
2. **A stale browser tab across a deploy** — an editor loaded pre-v2 holds flat styles in
   memory; the first save after the deploy wipes styles on **every node in the document**.

The v1→v2 transform in `document.ts` is correct, but it only runs on the **read** side.
The write side deletes instead of migrating. **This is the worst content-loss path in the
codebase. Effort: S** — run `styles` through `normalizeResponsiveStyles` in the schema.

### A3. The style panel destroys flat styles on the first edit.

`style-panel.tsx:364-382` reads `selected.styles` raw instead of normalising. With a flat
map the panel shows empty fields, then `commitSlice` builds `{...flatMap, base: cleaned}`
and `pruneResponsiveStyles` iterates only the slice keys — dropping every flat property.
The user watches a block's styling vanish after touching one field. **Effort: S.**

### A4. Any editor can OOM the server with one request.

`src/app/api/assets/route.ts:42` calls `await request.formData()` before the size check at
`:67`, and nothing pre-checks `Content-Length`. App Router handlers have no built-in body
limit, so a user holding `button:media-upload` (the default **editor** role) can POST a
multi-gigabyte body. On a self-host that is the whole site. Legitimate uploads are also
copied three times (`formData` → `arrayBuffer` → `Uint8Array.from`), so peak RSS is ~3× file
size. **Effort: S.**

### A5. Optimistic concurrency is not atomic — silent lost updates.

`repositories/pages.ts:730-802` and `blocks.ts:353-429` read the row, compare
`expectedUpdatedAt` in JS, then `UPDATE ... WHERE id = ?`. Two writers that read the same
`updated_at` both pass and both write; the loser gets a `200`. The new **restore-a-revision**
path makes this likely (restore racing a 5-minute autosave), and no transaction wraps
`loadRevisionDocument` → `update`. **Fix: `UPDATE … WHERE id = ? AND updated_at = ?` with
`.returning()`; zero rows → 409. Effort: S.**

---

## B. High — things that are silently not working

### B1. The route-authorization test never runs in CI.

`src/test/integration/api-auth.integration.test.ts:39` is `describe.skipIf(!dbReady)`, and
`.github/workflows/ci.yml` provisions **no Postgres service and never runs `db:migrate`**.
So `dbReady` is false, the whole matrix skips, and the companion block at `:153` *passes by
asserting the database is absent*. Those are the 8 skipped tests.

The top gap from the last audit was fixed — on a developer's laptop only. CI reports green
while proving nothing about authorization. **Fix: `services: postgres:16` + `db:migrate`
before `bun run test`. Effort: S.**

### B2. Every public page violates the CSP.

`proxy.ts:70` sets `style-src-attr 'none'` for public routes, but `<Toaster>` is mounted in
the **root** layout (`src/app/layout.tsx:59`) and sonner renders a `style` attribute
(`components/ui/sonner.tsx:18`). Every public page load is a violation with dropped custom
properties — which also means nobody has opened the public site with devtools since the CSP
landed. **Fix: move `<Toaster>` into the dashboard layout; toasts are dashboard-only.
Effort: S.**

### B3. Postgres reorders jsonb keys, breaking revision de-duplication and producing false conflicts.

`revisions.ts:66-68` compares `JSON.stringify(nodes)` of a freshly-built tree against one
read back from `jsonb`, which normalises key order. Verified on the live database: the
`section` block's own `defaultStyles` come back as `{width, padding}` instead of
`{padding, width}`, so the guard is effectively always false.

- **Duplicate revisions are written**, evicting genuinely distinct ones from the 50-row
  window. The History dialog's "identical trees are skipped" promise is false.
- The same reordering hits `editor-document-state.ts:132-141`: after a save, `baseline` holds
  client-order and the refetch returns jsonb-order, so a user typing during that window gets
  a spurious "This page was changed elsewhere" dialog. It self-heals when idle, but fires on
  essentially every save for a fast typist.

**One canonical-stringify (or a stored content hash) fixes both. Effort: S.**

### B4. Deleting a user who ever uploaded media or created a revision fails.

`assets.uploaded_by` and `content_revisions.created_by` are both `ON DELETE no action`
(migrations `0015`, `0016`), so `deleteUser` raises `23503`, surfaced as the nonsensical
"That request references data that does not exist." Both columns are already nullable — this
is a pure migration oversight. **Fix: `ON DELETE SET NULL`. Effort: S.**

### B5. Publishing a page whose layout block is unreadable silently publishes it with no layout.

`repositories/pages.ts:516-527` gates the page's own content on an unsupported version (409)
but the layout branch has no `else` — `layoutChildren` stays empty, the page goes live
missing its header/footer/nav, and the operator is told "Page published." This is the one
path that bypasses the version guard the guard exists for. **Effort: S.**

### B6. The version guard only defends the one axis today's format uses.

`lib/blocks/document.ts:91-99` requires `Array.isArray(record.nodes)`. Anything else — a
future `{version: 3, tree: [...]}`, a truncated row — falls through to `ok: true` with an
**empty** document, and `storedDocumentVersion` uses the same predicate so
`refuseWriteIfUnsupported` returns `null`. A v3 row from a newer build reads as an empty page
and is freely overwritten by the next autosave. It works correctly for v3-with-nodes (pinned
by a test) — but the point of the guard is protecting against a format you haven't designed
yet. **Fix: read `version` before shape-checking. Effort: S.**

### B7. Read-only users can edit the canvas; only saving is blocked.

`canEdit` gates Save, `Ctrl+S`, autosave, cut and paste — but not inline text editing, the
Duplicate/Copy/Delete buttons, drag-reorder, or indent/outdent (`editor-shell.tsx:343-377`
passes it to neither the canvas nor the sidebar). A viewer can rearrange and retype a page,
gets "· Unsaved changes" and a `beforeunload` prompt, and cannot save or discard except by
reloading. **Effort: S.**

---

## C. Editor correctness

1. **The canvas does not render container layouts the way the public site does.**
   `canvas.tsx:329-354` renders each block through its own `renderBlockTree`, and
   `SortableTree` wraps children in `flex flex-col`. Grids and horizontal flex rows appear as
   vertical stacks in the editor and only come out right after publish; lists emit invalid
   `ul > div > li`. Worse, `.ps-tree` sets `container-type: inline-size`, so in the canvas the
   nearest container is each block's own wrapper rather than the page root — the `sm/md/lg`
   slices resolve against different widths in the editor than on the live site. **WYSIWYG is
   broken for exactly the feature v2 was built for. Effort: L.**
2. **Exiting inline edit renders the text twice.** While editing, React's children are
   `undefined` and content is installed imperatively via `innerHTML`; on commit React mounts
   into an element it believes is empty and appends rather than replaces
   (`inline-editable-text.tsx:101-124, 192-222`). **Effort: S.**
3. **Ctrl/Shift-click multi-select silently does nothing on text blocks.**
   `InlineEditableText` spreads `domProps` then declares its own `onClick` (`:205`), which
   wins and drops the modifier options — so headings, text, list items and buttons can only
   be multi-selected via the Layers panel. **Effort: S.**
4. **`duplicateSelected` generates ids inside the reducer transform**
   (`use-editor-document.ts:243-263`) and mutates an outer array. Reducers must be pure —
   React re-invokes them. After Ctrl+D the selection can be empty or point at ids that aren't
   in the committed tree. `pasteClipboard` and `insertLibraryBlock` do this correctly; duplicate
   is the outlier. **Effort: S.**
5. **Escape does not cancel an inline edit** — `onInput` commits every keystroke, so there is
   no pre-edit state to restore. **Effort: S.**
6. **Undo is unreachable while inline editing.** The global handler bails on
   `isTypingTarget`, so the browser's native undo takes over — but content was installed via
   `innerHTML`, which doesn't seed the native stack, so native undo can jump to an empty
   buffer and feed that back into the history reducer as a new entry. **Effort: M.**
7. **No `onPaste` handler.** Storage is safe (the span walk sanitises), but pasted markup
   stays in the live DOM until commit while the model holds plain text — the canvas lies about
   what was saved. `normalizeEditableText` (which handles `&nbsp;`) is dead code, referenced
   only by its own test. **Effort: S.**
8. **Autosave can 409 against the user's own previous save.** `expectedUpdatedAt` comes from
   the query prop, which only refreshes when the refetch lands; the mutation response already
   carries the new `updatedAt` and is discarded. **Effort: M.**
9. **The autosave timer restarts on every render, not every edit** — `onSave` is re-created
   each render, so the effect's deps change constantly. It is "2 s with no re-render", not
   "2 s idle", and can be postponed indefinitely while the user clicks around with unsaved
   work. **Effort: S.**
10. **No parent/child type rules** — a `list` accepts a `section`; a `listItem` can sit at the
    root. Invalid HTML reaches the public renderer. **Effort: M.**
11. **`Ctrl+K` can never unlink** — `queryCommandValue("createLink")` isn't supported in
    Chromium/WebKit, so the unlink branch is dead. **Effort: S.**

---

## D. Medium

- **Deleting an UploadThing asset after removing the token silently leaks the remote file.**
  `assets.ts:161-170` picks the cleanup backend from current env, not from the row; the UT key
  fails `isSafeStoredName` and is discarded silently. The row soft-deletes, the CDN object stays
  public forever.
- **Revisions are never deleted with their page or block.** `entity_id` is a bare varchar with
  no FK, and both deletes are hard deletes — up to 50 orphaned full-document rows per deleted
  entity, forever, still readable by id through the revisions route. (Pruning for *live*
  entities is correct, and autosave revisions are genuinely throttled to one per 5 minutes.)
- **Deleting the site-wide default layout block is allowed** and silently strips the shell from
  every page relying on it (`blocks.ts:569-583` guards `pages.blockId` but not
  `site_settings.default_layout_block_id`).
- **Cache is not invalidated** when a block is deleted, nor when the default layout changes
  (`updateSiteTheme` revalidates only the theme tag).
- **`deleteAsset` soft-deletes the row but hard-deletes the bytes** — the row survives pointing
  at nothing, and there is no reference check, so a published page's image just breaks.
- **Upload directory is unconfigurable** (`path.join(process.cwd(), "upload")`), has no
  `UPLOAD_DIR` env, no writability check, and fails on a read-only FS as a generic 500. It sits
  *inside* the deploy artifact, so a redeploy that replaces the directory loses all media —
  and the README's deployment section never mentions a volume.
- **`assets` is indexed on `uploaded_by`, which nothing queries**; the actual list path
  (`deleted_at IS NULL ORDER BY created_at DESC`) has no index.
- **`pages.block_id` has no index** despite three query sites.
- **Values are validated at render but not at write** — `url(/upload/hero.png)` in the Fill
  field persists to the database and is dropped at every render, so the stored document holds a
  declaration that can never appear.
- **Restore is not transactional** and overwrites the current draft, which is only recoverable
  if a revision happened to be recorded — up to 5 minutes of work, with no undo. (Restoring a
  *too-new* revision is correctly refused with a 409.)
- **`x-request-id` is client-controllable** on `/api/*` — the proxy matcher excludes `api`, so
  it is never overwritten. Log noise, not injection.
- **README drift**: `README.md:117` still claims "No full CSP yet — block styles are inline",
  false since `48bcf6a`. The deployment section omits both the CSP and the media volume.

---

## E. Verified correct — do not re-litigate

- **Route matcher**: longest-declared-wins / default-deny still correct, including admin
  denied on `/dashboard/unknown`, `/dashboard/usersX`, `/dashboard/../users`. 22-case table test.
- **`safeRedirectPath`**: control chars, `//`, backslash, `/api/*`, `new URL(...).origin` — intact.
- **`parse-body`** on every JSON-body mutating route, including the new theme and restore routes.
- **Password format**, **atomic refresh rotation**, **rate limiting on login and setup** — intact.
- **Media hardening**: magic-byte sniffing ignoring the declared type, SVG/XML rejected,
  UUID filenames, traversal rejected, `nosniff` globally and on the serve route.
- **Rich text cannot inject into the public renderer** — allowlisted tags, `sanitizeUrl` on
  hrefs, React children on the public path.
- **The inline-style path is gone.** `sanitizeStyles` is deprecated with no callers outside its
  test; public `<style>` tags carry the nonce. The dashboard's `'unsafe-inline'` is genuinely
  required by dnd-kit transforms.
- **Style property coverage is clean** — all 25 panel-writable properties are allowlisted;
  `scripts/seed-blocks.ts` has a `styleGuard` that throws on anything outside it.
- **`migrateBlockDocument` runs on every read path** — drafts, list, published snapshot,
  block children, published children, revisions. No gaps.
- **Generated style classes are stable** across renders and servers, and container queries are
  live (`.ps-tree { container-type: inline-size }` exists).
- **Revision pruning and autosave throttling** are correct for live entities.
- **Theme deletion degrades gracefully** — themes live in code, unknown ids fall back to the
  default.
- **Migrations `0014`/`0015` data migrations are idempotent**, including the `permissions = ''`
  edge case.
- **All eight previously-reported editor bugs are fixed**, most with regression tests —
  including the undo-history corruption, which now has `future: []` on merge and merge-state
  reset on both undo and redo.

---

## Suggested fix order

1. **A2 + A3** — silent style loss. Fix before anyone pastes across a deploy.
2. **A1** — regenerate the missing snapshots *before* the next schema change.
3. **A4, A5** — one-line-ish each, both prevent real damage.
4. **B1** — a green CI that proves nothing about authorization is worse than no CI.
5. **B2, B4, B5, B6** — small, each closes a hole.
6. **B3** — one canonical-stringify fixes both symptoms.
7. **B7**, then the C list; **C1 (canvas layout) is the big one** and deserves its own project.
8. **D** as capacity allows.

## Highest-value missing test

A **route authorization matrix that actually runs in CI** — every handler under
`src/app/api/**` × {anonymous, viewer, editor, admin}, asserting `401 / 403 / 2xx`, with the
table derived from the route file listing so that *adding a route without a permission check
fails the suite*. That single test covers B1 and the untested upload, asset-delete, revision
and publish routes.

Runner-up: an upload test posting an SVG, a `GIF89a`+HTML polyglot, a 6 MB file, and a
`../../etc/passwd` filename, asserting 400 / 400 / 400 / server-generated UUID.
