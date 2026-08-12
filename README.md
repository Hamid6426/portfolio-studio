# Portfolio Studio

Self-hosted portfolio CMS: a visual page editor, reusable layout blocks, draft/publish workflow, and a public site — all in one Next.js app. One deployment serves one website.

## Prerequisites

- [Bun](https://bun.sh) (package manager and runtime)
- PostgreSQL 14+

## Quick start

1. Clone the repository and install dependencies:

```bash
bun install
```

2. Copy the environment template and fill in real values:

```bash
cp .env.example .env.local
```

Required variables in `.env.local`:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `AUTH_SECRET` | Session signing secret (≥32 chars; **never** use the placeholder in production) |
| `APP_URL` | Canonical public URL for metadata and sitemap (server-only) |
| `NEXT_PUBLIC_APP_URL` | Same URL for the browser client (axios base URL) |

Generate a secret:

```bash
openssl rand -base64 32
```

3. Run migrations and seed the example portfolio:

```bash
bun run db:migrate
bun run db:seed
```

4. Start the dev server:

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with the admin credentials from your dataset (default: see `scripts/datasets/example.ts`).

## Startup gate

On every request (except `/setup`, `/setup-guide`, and `/error/database`), the root layout checks database connectivity, migration status, and whether an admin user exists:

| State | Redirect |
|---|---|
| Database unreachable | `/error/database` |
| Migrations pending or no admin | `/setup` |
| Ready | Continue |

## Commands

| Command | Description |
|---|---|
| `bun dev` | Development server |
| `bun run typecheck` | TypeScript check |
| `bun run test` | Unit tests (Vitest) |
| `bun run lint` | ESLint |
| `bun run db:generate` | Generate Drizzle migrations after schema changes |
| `bun run db:migrate` | Apply migrations |
| `bun run db:studio` | Drizzle Studio |
| `bun run db:seed` | Seed roles, admin, and portfolio pages |

### Seed datasets

Datasets live in `scripts/datasets/` as pure content specs:

```bash
bun run db:seed                          # default: example (fictional persona)
bun run db:seed -- --dataset=me.private  # gitignored private dataset
bun run db:seed -- --force               # rewrite existing seeded pages
```

Private datasets (`*.private.ts`) are gitignored — put real personal content there, never in `example.ts`.

## Architecture

- **Dashboard** (`/dashboard/*`) — page/block editors, users, roles
- **Public site** (`/` and `/[slug]`) — renders published snapshots; draft preview at `?preview=1` for permitted users
- **Draft/publish** — page body edits stay in `pages.content` until publish; layout blocks have independent publish via `blocks.published_children`
- **Auth** — JWT access + refresh cookies; role-based route permissions (default deny)

See [AGENTS.md](./AGENTS.md) for the full route list, layering conventions, and agent guidance.

## Deployment

1. Set `NODE_ENV=production` and all env vars (especially a unique `AUTH_SECRET`).
2. Run `bun run db:migrate` against your production database.
3. Build and start:

```bash
bun run build
bun start
```

The app refuses to boot in production when `AUTH_SECRET` equals the `.env.example` placeholder.

### Security posture

- Route permissions use **longest declared route wins, default-deny** (`canAccessRoute` in `src/config/permissions.ts`). Undeclared dashboard paths are rejected for every role, including admin. Subtree grants use `route:/path/*`; bare `route:/dashboard` is exact-only.
- Passwords: async scrypt with cost params (`scrypt$N=…$salt$hash`); placeholder `AUTH_SECRET` refused in production.
- Login and setup are rate-limited in-memory per process (IP + email). Terminate TLS at a proxy that overwrites `X-Forwarded-For` / `X-Real-IP`.
- Security headers via `next.config.ts`: `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options: DENY`, CSP `frame-ancestors 'none'`, HSTS in production.
- Block HTML/styles sanitized at render time (`src/lib/block-sanitize.ts`).
- No full CSP yet — block styles are inline; a real policy needs `'unsafe-inline'` on `style-src-attr` until the responsive v2 model moves styling to classes.

### Backup and restore

All content lives in Postgres. Before upgrades:

```bash
pg_dump "$DATABASE_URL" -Fc -f portfolio-studio-$(date +%Y%m%d).dump
# restore:
# pg_restore -d "$DATABASE_URL" --clean --if-exists portfolio-studio-YYYYMMDD.dump
```

Keep dumps off the app host when possible. `db:seed` never deletes rows; it is not a backup tool.

## Development

Read `.docs/roadmap.md` before building beyond the page editor — it lists version-sensitive traps (caching, password format, block-document versioning). Use `bun run test` (Vitest); prefer that over bare `bun test`.
