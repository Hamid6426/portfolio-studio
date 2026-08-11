/**
 * Loads `.env.local` (then `.env`) into `process.env`.
 *
 * Must be imported *before* anything that reads env at module scope
 * (`@/config/env`, and therefore `@/db/client`). ES modules evaluate imports in
 * source order, so `import "./load-env";` on the first line of a script is
 * enough — the values are in place by the time the next import runs.
 *
 * Paths are resolved from the repo root (this file's parent directory) so the
 * script works regardless of the shell's working directory. Variables already
 * present in the environment win, matching dotenv's default behaviour.
 */
import { config } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

config({ path: join(repoRoot, ".env.local"), quiet: true });
config({ path: join(repoRoot, ".env"), quiet: true });
