import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

/** Current scrypt parameters — bump carefully; older hashes rehash on login. */
export const SCRYPT_PARAMS = {
  N: 16384,
  r: 8,
  p: 1,
  keylen: 64,
} as const;

const DUMMY_HASH =
  "scrypt$N=16384,r=8,p=1$0123456789abcdef0123456789abcdef$0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

type ParsedHash =
  | {
      kind: "v2";
      N: number;
      r: number;
      p: number;
      salt: string;
      hash: string;
    }
  | {
      kind: "v1";
      salt: string;
      hash: string;
    };

function parseStored(stored: string): ParsedHash | null {
  if (stored.startsWith("scrypt$")) {
    const parts = stored.split("$");
    if (parts.length !== 4) return null;
    const [, paramStr, salt, hash] = parts;
    if (!paramStr || !salt || !hash) return null;
    const params = Object.fromEntries(
      paramStr.split(",").map((pair) => {
        const [k, v] = pair.split("=");
        return [k, Number(v)];
      }),
    );
    if (!params.N || !params.r || !params.p) return null;
    return {
      kind: "v2",
      N: params.N,
      r: params.r,
      p: params.p,
      salt,
      hash,
    };
  }

  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return null;
  return { kind: "v1", salt, hash };
}

function scryptAsync(
  password: string,
  salt: string,
  keylen: number,
  options: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keylen, options, (error, derived) => {
      if (error) reject(error);
      else resolve(derived as Buffer);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt, SCRYPT_PARAMS.keylen, {
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p,
  });

  return `scrypt$N=${SCRYPT_PARAMS.N},r=${SCRYPT_PARAMS.r},p=${SCRYPT_PARAMS.p}$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parsed = parseStored(stored);
  if (!parsed) return false;

  const N = parsed.kind === "v2" ? parsed.N : SCRYPT_PARAMS.N;
  const r = parsed.kind === "v2" ? parsed.r : SCRYPT_PARAMS.r;
  const p = parsed.kind === "v2" ? parsed.p : SCRYPT_PARAMS.p;

  const candidate = await scryptAsync(
    password,
    parsed.salt,
    SCRYPT_PARAMS.keylen,
    { N, r, p },
  );
  const expected = Buffer.from(parsed.hash, "hex");

  return (
    candidate.length === expected.length && timingSafeEqual(candidate, expected)
  );
}

/** True when the stored hash should be rewritten with current params. */
export function needsRehash(stored: string): boolean {
  const parsed = parseStored(stored);
  if (!parsed) return true;
  if (parsed.kind === "v1") return true;
  return (
    parsed.N !== SCRYPT_PARAMS.N ||
    parsed.r !== SCRYPT_PARAMS.r ||
    parsed.p !== SCRYPT_PARAMS.p
  );
}

/** Constant-time-ish miss path so absent users do not short-circuit verify. */
export async function verifyPasswordDummy(password: string): Promise<void> {
  await verifyPassword(password, DUMMY_HASH);
}
