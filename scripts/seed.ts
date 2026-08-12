/**
 * `bun run db:seed` — populate a fresh (already-migrated) install from a
 * dataset: the default roles, an admin user, and the dataset's public pages
 * (published, so they render at `/` and `/<slug>` straight away).
 *
 * Datasets live in `scripts/datasets/`. The committed default is `example`
 * (a fictional persona, doubling as the documentation for writing your own);
 * `scripts/datasets/*.private.ts` is gitignored for real content.
 *
 * Safety model:
 * - Never drops, truncates or deletes anything: there is no reset flag.
 * - Idempotent: roles are merged, the user is created once, and a page whose
 *   slug already exists is left alone unless `--force` is passed.
 * - Run it as often as you like; on a second run only the log changes.
 *
 * Usage:
 *   bun run db:seed
 *   bun run db:seed -- --dataset=me.private   # scripts/datasets/me.private.ts
 *   bun run db:seed -- --force                # rewrite + republish the pages
 *   bun run db:seed -- --help
 */
import "./load-env";

import { eq, isNull } from "drizzle-orm";
import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { db } from "@/db/client";
import {
  pagesTable,
  userTable,
  type BlockNode,
  type PublishedPageSnapshot,
} from "@/db/schema";
import { hashPassword } from "@/lib/password";
import { toBlockDocument } from "@/lib/blocks/document";
import { ensureDefaultRoles } from "@/repositories/roles";

import type { PortfolioDataset, SeedPage } from "./datasets/types";
import { buildPageContent } from "./sections";

const DEFAULT_DATASET = "example";
const ADMIN_ROLE = "admin";

const HELP = `bun run db:seed — seed roles, the admin user and the portfolio pages.

Options:
  --dataset=<name>  Which file in scripts/datasets/ to seed, without the .ts
                    extension (default: ${DEFAULT_DATASET}). Private datasets
                    keep their suffix, e.g. --dataset=me.private.
  --force           Rewrite and republish the dataset's pages (title,
                    description, content and published snapshot), restoring
                    them if they were soft-deleted. Without it, existing pages
                    are left untouched.
  --help            Show this message.

The script never deletes data. Run \`bun run db:migrate\` first.`;

function log(message: string): void {
  console.log(message);
}

/** `host/database` for the log line — never the credentials. */
function describeTarget(databaseUrl: string | undefined): string {
  if (!databaseUrl) return "unknown";
  try {
    const url = new URL(databaseUrl);
    return `${url.host}${url.pathname}`;
  } catch {
    return "unknown";
  }
}

/* ── dataset loading ─────────────────────────────────────────────────────── */

const datasetsDir = fileURLToPath(new URL("./datasets/", import.meta.url));

/** Dataset names on disk, private ones included, `types` excluded. */
function availableDatasets(): string[] {
  try {
    return readdirSync(datasetsDir)
      .filter((file) => file.endsWith(".ts") && file !== "types.ts")
      .map((file) => file.slice(0, -3))
      .sort();
  } catch {
    return [];
  }
}

function isDataset(value: unknown): value is PortfolioDataset {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<PortfolioDataset>;
  return (
    typeof candidate.admin === "object" &&
    candidate.admin !== null &&
    Array.isArray(candidate.nav) &&
    Array.isArray(candidate.pages)
  );
}

async function loadDataset(name: string): Promise<PortfolioDataset> {
  // The name lands in a filesystem path, so keep it to a bare file name.
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name) || name.includes("..")) {
    throw new Error(
      `Invalid --dataset name: "${name}". Use a plain file name such as ` +
        `"${DEFAULT_DATASET}" or "me.private".`,
    );
  }

  if (!existsSync(new URL(`./datasets/${name}.ts`, import.meta.url))) {
    const available = availableDatasets();
    throw new Error(
      `No dataset "${name}": scripts/datasets/${name}.ts does not exist.\n` +
        `Pass --dataset=<name> with one of: ${available.join(", ") || "(none found)"}.\n` +
        `Private datasets are gitignored, so a fresh clone only ships "${DEFAULT_DATASET}".`,
    );
  }

  // Not statically analysable on purpose: the path comes from the flag.
  const loaded: unknown = await import(`./datasets/${name}.ts`);
  const exported = (loaded as { dataset?: unknown }).dataset;

  if (!isDataset(exported)) {
    throw new Error(
      `scripts/datasets/${name}.ts must export \`const dataset: PortfolioDataset\` ` +
        `with \`admin\`, \`nav\` and \`pages\`.`,
    );
  }

  return exported;
}

/* ── seeding ─────────────────────────────────────────────────────────────── */

async function seedRoles(): Promise<void> {
  // `users.role` is a foreign key to `roles.role_name`, so the roles have to
  // land before the admin insert or it fails with a constraint violation.
  await ensureDefaultRoles();
  log("roles      ensured admin / editor / viewer with default permissions");
}

async function seedAdminUser(admin: PortfolioDataset["admin"]): Promise<void> {
  const existing = await db.query.userTable.findFirst({
    where: eq(userTable.email, admin.email),
    columns: { id: true, role: true },
  });

  if (existing) {
    log(
      `user       ${admin.email} already exists (role: ${existing.role}) — left unchanged`,
    );
    return;
  }

  // Same shape the setup flow inserts (`repositories/auth.ts`). Passwords are
  // stored as parameterized scrypt; email is lowercase because `loginUser`
  // lowercases before lookup.
  await db.insert(userTable).values({
    name: admin.name,
    email: admin.email,
    role: ADMIN_ROLE,
    password: await hashPassword(admin.password),
  });

  log(`user       created ${admin.email} (role: ${ADMIN_ROLE})`);
}

function countNodes(nodes: BlockNode[]): number {
  return nodes.reduce(
    (total, node) => total + 1 + countNodes(node.children ?? []),
    0,
  );
}

async function seedPage(
  page: SeedPage,
  content: BlockNode[],
  force: boolean,
): Promise<void> {
  const label = page.slug === null ? "/ (landing)" : `/${page.slug}`;
  const nodes = countNodes(content);

  const document = toBlockDocument(content);

  // The public site serves `published_snapshot` and requires `published_at`
  // to be non-null (`getPublishedPage`), so a seeded page is written the same
  // way `publishPage()` writes one: draft columns, frozen snapshot, timestamp.
  const snapshot: PublishedPageSnapshot = {
    title: page.title,
    description: page.description,
    blockId: null,
    content: document,
  };

  const existing = await db.query.pagesTable.findFirst({
    where:
      page.slug === null
        ? isNull(pagesTable.slug)
        : eq(pagesTable.slug, page.slug),
    columns: { id: true, publishedAt: true, deletedAt: true },
  });

  if (existing && !force) {
    const state = existing.deletedAt ? "exists (soft-deleted)" : "already exists";
    log(`page       ${label} ${state} — skipped (use --force to rewrite)`);
    return;
  }

  if (existing) {
    await db
      .update(pagesTable)
      .set({
        title: page.title,
        description: page.description,
        content: document,
        publishedSnapshot: snapshot,
        // Keep the original publish date if the page was already published.
        publishedAt: existing.publishedAt ?? new Date(),
        // The slug is unique, so a soft-deleted row would otherwise block the
        // seeded page forever; `--force` restores it rather than orphaning it.
        deletedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(pagesTable.id, existing.id));

    const restored = existing.deletedAt ? ", restored" : "";
    log(`page       ${label} rewritten (${nodes} blocks, published${restored})`);
    return;
  }

  await db.insert(pagesTable).values({
    title: page.title,
    slug: page.slug,
    description: page.description,
    content: document,
    publishedSnapshot: snapshot,
    publishedAt: new Date(),
  });

  log(`page       ${label} created (${nodes} blocks, published)`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    log(HELP);
    return;
  }

  const force = args.includes("--force");
  const datasetArg = args.find((arg) => arg.startsWith("--dataset="));
  const datasetName = datasetArg?.slice("--dataset=".length) ?? DEFAULT_DATASET;

  const unknown = args.filter(
    (arg) =>
      !["--force", "-h", "--help"].includes(arg) &&
      !arg.startsWith("--dataset="),
  );

  if (unknown.length > 0) {
    throw new Error(`Unknown option(s): ${unknown.join(", ")}\n\n${HELP}`);
  }

  if (datasetArg && !datasetName) {
    throw new Error(`--dataset needs a name, e.g. --dataset=${DEFAULT_DATASET}`);
  }

  const dataset = await loadDataset(datasetName);

  log(`seed       target: ${describeTarget(process.env.DATABASE_URL)}`);
  log(`seed       dataset: ${datasetName} (${dataset.pages.length} pages)`);
  if (force) log("seed       --force: existing seeded pages will be rewritten");

  await seedRoles();
  await seedAdminUser(dataset.admin);

  for (const page of dataset.pages) {
    await seedPage(page, buildPageContent(page, dataset.nav), force);
  }

  log("seed       done");
  log(
    "seed       public reads are cached per slug — restart `bun dev` if it was running during the seed",
  );
}

main()
  .then(async () => {
    await db.$client.end();
  })
  .catch(async (error) => {
    console.error("seed failed:", error);
    await db.$client.end().catch(() => {});
    process.exitCode = 1;
  });
