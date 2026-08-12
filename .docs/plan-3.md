Status table
#	Item	Status	Key evidence
1	Route-permission escalation	VERIFIED DONE (different design than planned)	src/config/permissions.ts:13-24, 117-133
2	Data migration for persisted grants	PARTIAL	drizzle/0011_route_permission_exact.sql:1-14
3	ensureDefaultRoles create-if-missing, off render path	VERIFIED DONE	src/repositories/roles.ts:50-66
4	Dashboard redirect loop	VERIFIED DONE	src/app/dashboard/layout.tsx:76-97
5	cookies().delete() in Server Component	VERIFIED DONE (one new regression)	src/app/dashboard/layout.tsx:54-69, src/app/api/auth/session/clear/route.ts:10-19
6	Open redirect ×2	PARTIAL — still exploitable	src/lib/auth/safe-redirect.ts:7-18
7	Unauthenticated 500s	VERIFIED DONE	src/lib/api/parse-body.ts:26-72, src/repositories/auth.ts:107-121
8	Password (async / cost params / legacy / rehash / timing)	VERIFIED DONE	src/lib/password.ts:57-121, src/repositories/auth.ts:133,156-164
9	Login rate limiting	PARTIAL — login only	src/app/api/auth/login/route.ts:13-26; absent in setup/route.ts
10	Session revocation on password change	PARTIAL — not transactional	src/repositories/users.ts:259-284
11	Atomic rotation + expired sweep	VERIFIED DONE	src/repositories/auth.ts:217-236, 78-86, 126
12	Indexes	VERIFIED DONE	src/db/schema.ts:34,47-49,93; drizzle/0012_slim_onslaught.sql
13	Setup race	VERIFIED DONE	src/repositories/auth.ts:325-328
14	Startup gate cost	VERIFIED DONE	src/config/startup.ts:21-26
15	PATCH-as-PUT on blocks	VERIFIED DONE	src/payloads/blocks.ts:15-17, src/repositories/blocks.ts:378-397
16	Optimistic concurrency	VERIFIED DONE	src/repositories/blocks.ts:93-100,339-348; pages.ts:739-747
17	Version guard	VERIFIED DONE	src/lib/blocks/document.ts:54-60,124-126
Detail on the ones that are not clean
1. Route matcher — works, but not the design in the plan
The agent did not implement "longest declared route wins / default deny". It changed the permission token grammar instead: dashboard subtree grants are now route:/dashboard/users/* etc. (src/config/permissions.ts:15-20), and canAccessRoute (:124-132) matches /* suffixes as prefixes and everything else exactly. PERMISSIONS.dashboard was dropped from editor and viewer defaults (:63-85).

Live matrix (run against the real module, serialized default permission strings):


path                            admin  editor viewer
/dashboard                      true   false  false
/dashboard/overview             true   true   true
/dashboard/users                true   false  false
/dashboard/roles                true   false  false
/dashboard/pages                true   true   false
/dashboard/pages/edit           true   true   false
/dashboard/blocks               true   true   false
/dashboard/usersX               true   false  false   <-- plan wanted false for all
/dashboardX                     false  false  false
/dashboard/unknown              true   false  false   <-- plan wanted false for all
Viewer is closed on /dashboard/users, /dashboard/roles, /dashboard/pages. canAccessRoute("route:/dashboard,button:sign-in", "/dashboard/users") === false — the legacy bare token no longer escalates (it is also stripped by parsePermissions since it is no longer a member of PERMISSIONS).

Deviations that remain: undeclared paths are not default-denied for admin (/dashboard/unknown, /dashboard/usersX → true), so a future route added without a permission entry silently becomes admin-reachable; the plan's 1e test cases for /dashboard/usersX and /dashboard/unknown are absent from src/config/permissions.test.ts. /dashboard bare is denied to editor/viewer rather than the planned "allow if they hold any route:/dashboard/*" — harmless because src/app/dashboard/page.tsx only redirects and the layout bounces them to visibleNav[0].

requireRoutePermission (src/lib/auth/permissions.ts:52-53) and canPreviewDrafts (src/lib/pages/draft-preview.ts:23-24) both still work, but only by luck: they now feed the literal string "/dashboard/pages/*" in as a pathname, which happens to prefix-match its own wildcard grant. If anyone ever adds an exact (non-/*) route permission for a subtree, these two call sites silently break. API gating is correct — /api/users (route.ts:14), /api/pages (:14), /api/blocks (:45), and the requireSession+explicit-check variants at api/roles/route.ts:18-31 and api/blocks/route.ts:26-39 all 403 a viewer.

2. Migration 0011 — system roles only, custom roles not handled
drizzle/0011_route_permission_exact.sql contains three UPDATE ... WHERE role_name IN ('admin'|'editor'|'viewer') statements and nothing else. The regexp_replace(',' || permissions || ',', ',route:/dashboard,', ',', 'g') custom-role strip specified at plan line 115 is absent, so leading/middle/trailing positions are untested and unhandled. Journal entry exists (drizzle/meta/_journal.json idx 11), so it will run.

The security consequence is nil — parsePermissions (src/config/permissions.ts:94-99) allowlists against PERMISSIONS, and route:/dashboard is no longer a member, so stale rows are inert at runtime. But there is an unhandled functional regression the plan did not anticipate: the git diff shows all five dashboard tokens changed value, not just the bare one (route:/dashboard/users → route:/dashboard/users/*, same for roles/pages/blocks). Any custom role on an existing install holding the old exact tokens has them silently dropped on read, losing access with no migration to rewrite them.

5. Cookie mutation — closed, but the Sec-Fetch-Site guard causes forced logouts
No cookies().delete() or .set() remains anywhere in a render path — grep finds cookies() only in src/lib/auth/session.ts:11 (read) and src/app/dashboard/layout.tsx:55 (read). /api/auth/session/clear exists.

Full matrix, no loops and no throws:

access	refresh	outcome
valid	either	renders
absent	absent	proxy.ts:20-24 → /login?next=
absent	present	layout :58-61 → refresh route → rotate → back
invalid	present	same as above
invalid	absent	layout :66-68 → /api/auth/session/clear → /login, cookies cleared
any	expired/reused	refresh route :56-62 → /login + clearAuthCookies
valid, role has no route grants	—	in-layout panel, no redirect (:76-89)
The dead branch at layout.tsx:93-95 (pathname === fallback → /login) is unreachable, since fallback is by construction a permitted path.

6. Open redirect — still exploitable via control characters
safeRedirectPath (src/lib/auth/safe-redirect.ts:7-18) rejects //evil.com, /\evil.com, and absolute URLs, and is wired into both required sites (api/auth/session/refresh/route.ts:39, (auth)/login/login-form.tsx:53) plus session/clear. But it does not strip or reject control characters, and it does not do the new URL(value, "http://x.invalid").origin check the plan called "the durable one". The WHATWG URL parser deletes tab/CR/LF before parsing, so:


"/<CR><LF>/evil.com"  accepted: true   new URL(out, "https://victim.test") -> https://evil.com/
"/<TAB>/evil.com"     accepted: true   -> https://evil.com/
"/<LF>/evil.com"      accepted: true   -> https://evil.com/
Reachable two ways: GET /api/auth/session/refresh?next=%2F%0D%0A%2Fevil.com → NextResponse.redirect(new URL(safeNext, request.url)) at route.ts:64 leaves the origin (needs Sec-Fetch-Site: none, i.e. a pasted link — the guard does not block that); and GET /login?next=%2F%0D%0A%2Fevil.com → router.push(safeRedirectPath(...)) at login-form.tsx:53 after a successful sign-in, with no Sec-Fetch constraint at all. safe-redirect.test.ts has no control-character case.

The Sec-Fetch-Site guard exists (refresh/route.ts:12-31) but is stricter than specified in a way that breaks real users, and absent where it also matters — see new bugs below.

9. Rate limiting — login only
checkLoginRateLimit is called once, at src/app/api/auth/login/route.ts:13. src/app/api/auth/setup/route.ts:7-16 has no limiter, so the setup endpoint is unthrottled (it 409s once an admin exists, but each call still takes the advisory lock and a transaction). Also note the limiter is 10 attempts / 60 s with a 5-min lock, not the "10 / 15 min" fixed window in the plan, and it keys on raw x-forwarded-for (route.ts:14) — an attacker-supplied header, trivially rotated to defeat the limit when the app is not behind a header-normalising proxy.

10. Password-change revocation — happens, but not atomically
src/repositories/users.ts:259-269 updates the password, then :280-284 deletes the refresh tokens as a separate statement outside any transaction. If the process dies between the two, or the delete errors, the password is changed and the old sessions survive. The plan explicitly said "same transaction".

What remains outstanding
Control-character open redirect is live. Add a \u0000-\u001F\u007F rejection and the new URL(value, "http://x.invalid").origin === "http://x.invalid" check to safe-redirect.ts, plus a test case. Both call sites are currently bypassable.
No /api/* exclusion in safeRedirectPath. next=/api/auth/session/refresh is accepted, so the refresh route can be made to redirect to itself, rotating (and burning) a refresh token on each hop until the browser's redirect cap.
Migration 0011 does not touch custom roles. Missing the comma-delimited strip for route:/dashboard, and — more consequentially — missing any rewrite of route:/dashboard/{users,roles,pages,blocks} → .../\*, which silently revokes those grants from custom roles on upgrade.
Rate limiting not applied to /api/auth/setup, and the login limiter trusts a client-controlled x-forwarded-for.
Password change + token revocation are not in one transaction (users.ts:259 / :280).
Default-deny for undeclared paths was never implemented. /dashboard/unknown and /dashboard/usersX resolve true for admin. The corresponding plan-1e test cases are missing from permissions.test.ts.
requireRoutePermission / canPreviewDrafts pass "/dashboard/x/*" as a pathname — correct today only because every dashboard grant is a wildcard. Should slice the /* before matching.
Plan's scripts/ curl matrix (1e "verify by hand" script, the Stage 5f spec) does not exist — scripts/ contains only seed.ts, seed-blocks.ts, sections.ts, load-env.ts, datasets/.
New bugs introduced by the changes
Cross-site entry to the dashboard force-logs-you-out. isAllowedRefreshNavigation (refresh/route.ts:12-31) rejects on Sec-Fetch-Site: cross-site and on any cross-origin Referer. Following a link to https://site/dashboard/pages from email/Slack/Google with an expired access token but a valid refresh token hits the layout bounce at layout.tsx:58-61, fails the guard, and takes the clearAuthCookies branch at :41-47 — destroying the refresh cookie and signing the user fully out, rather than just sending them to login. The plan asked for "reject unless same-origin or none"; the added Referer clause makes an ordinary inbound link indistinguishable from CSRF.
/api/auth/session/clear has no Sec-Fetch-Site guard at all (clear/route.ts:10-19), so any cross-site page can log a user out with an <img src=".../api/auth/session/clear">-style GET. Low severity, but it is a new GET-that-mutates added by this work.
Query strings are dropped on the refresh bounce. layout.tsx:51 reads x-pathname, which proxy.ts:33 sets from request.nextUrl.pathname only. A refresh from /dashboard/pages/edit?slug=about returns the user to /dashboard/pages/edit with no slug.
/dashboard/users/page.tsx:22 hardcodes redirect("/dashboard/overview") on permission failure — the exact pattern item 4 removed from the layout. Currently unreachable (the layout redirects first), but it is the same latent loop for a role that can reach /dashboard/users and not /dashboard/overview.
The "No dashboard access" panel's escape hatch is a loop for the user — layout.tsx:84 links to /login, and (auth)/login/page.tsx:10-11 redirects any valid session straight back to /dashboard/overview, i.e. back to the panel. It terminates (the panel renders), but the user cannot sign out from it; it should point at the logout route.
sweepExpiredRefreshTokens runs on every login attempt (auth.ts:126), before the user lookup, as an unindexed DELETE ... WHERE expires_at < now(). Migration 0012 added indexes on token and user_id but not expires_at.
expectedUpdatedAt is optional in both payloads (payloads/blocks.ts:16, payloads/pages.ts:31) and timestampsMatch returns true when it is absent (blocks.ts:97, pages.ts:255), so any client that omits it silently opts out of the 409 — the concurrency guard is advisory, not enforced.
Bash Check sign-out and robots disallow
IN
cat src/app/dashboard/dashboard-sign-out.tsx | head -60; echo "=== robots/api disallow? ==="; grep -rn "disallow" -i src/app/robots.ts

OUT
"use client";

import { useRouter } from "next/navigation";
import { LogOutIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  BUTTON_PERMISSIONS,
  canShowButton,
  type Permission,
} from "@/config/permissions";
import { useLogoutMutation } from "@/queries/auth";

export function DashboardSignOut({
  permissions,
}: {
  permissions: Permission[] | string;
}) {
  const router = useRouter();
  const logoutMutation = useLogoutMutation();

  if (!canShowButton(permissions, BUTTON_PERMISSIONS.signOut)) {
    return null;
  }

  async function handleSignOut() {
    const result = await logoutMutation.mutateAsync();
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success("Signed out.");
    router.replace("/login");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="w-full justify-start gap-2"
      disabled={logoutMutation.isPending}
      onClick={() => void handleSignOut()}
    >
      <LogOutIcon data-icon="inline-start" />
      Sign out
    </Button>
  );
}
=== robots/api disallow? ===
Auth verification is in. Most of it landed correctly — atomic rotation, advisory-lock setup race, password cost params with legacy fallback, version guard, indexes, PATCH semantics, and the cookie-mutation fix all verified. But:

The open redirect is still exploitable. safeRedirectPath rejects //evil.com and /\evil.com, but does not strip control characters and skipped the new URL(...).origin check the plan called the durable one. The WHATWG URL parser deletes tab/CR/LF before parsing, so /%0D%0A/evil.com is accepted and resolves to https://evil.com/. The agent verified this against the real module. It's reachable via /login?next= with no Sec-Fetch constraint at all.

And the Sec-Fetch-Site guard is now too strict in a way that logs people out. It rejects on cross-origin Referer as well as cross-site. Following a link to /dashboard/pages from email or Slack with an expired access token but valid refresh token now hits the clearAuthCookies branch — destroying the refresh cookie and fully signing the user out, instead of just bouncing them to login. That's a new user-visible regression.

Migration 0011 silently revokes permissions from custom roles. All five dashboard tokens changed value (route:/dashboard/users → route:/dashboard/users/*), but the migration only rewrites the three system roles. Any custom role on an existing install loses those grants on upgrade, because parsePermissions allowlists against the new PERMISSIONS map and drops the old tokens.

Also notable: the route matcher was solved by changing the token grammar (route:/dashboard/users/*) rather than longest-match-wins. It closes the escalation — viewer is verified shut out of users/roles/pages — but undeclared paths still resolve true for admin, so a future route added without a permission entry is silently admin-reachable.

Two verifications still running.

Verification complete. All checks run against the working tree at /home/hamid/Desktop/Hamid6426/portfolio-studio.

Important framing: every one of these changes is uncommitted. git log HEAD is f3d6b10 (pre-remediation); git status shows ~70 modified + ~25 untracked files. CI has therefore never run on this work.

Status table
#	Item	Status	Evidence
1	test + typecheck scripts	Landed	package.json: "typecheck": "tsc --noEmit", "test": "vitest run", "test:watch"
1	bun run test runs	Yes — 7 files / 42 tests, all pass in 2.9s	ran it
1	literal bun test runs	NO — 36 pass, 1 fail, 1 error	bun's own runner ignores vitest.setup.ts, so src/config/env.ts throws a raw ZodError on missing DATABASE_URL/AUTH_SECRET
1	permission matrix test	Landed, unit-level only	/src/config/permissions.test.ts — 13-row table incl. viewer→/dashboard/users false
1	token tamper/expiry	Landed, good	/src/lib/auth/tokens.test.ts — sig tamper, payload tamper, alg=none header swap, hand-forged expired token, malformed
1	password legacy-format	Landed, good	/src/lib/password.test.ts — real scryptSync legacy 3-part hash verified + needsRehash true
1	block-sanitize XSS	Landed, good	/src/lib/block-sanitize.test.ts — javascript:/data:///host/vbscript:, \t/\n scheme-hiding, url(, expression(, ; breakout, CSS escapes
1	depth guard 32/33	Landed, exact	/src/payloads/block-node.test.ts asserts both MAX_BLOCK_NODE_DEPTH (=32) and +1
2	CI	Landed	/.github/workflows/ci.yml — push(main/master)+PR, setup-bun@v2 pinned 1.3.14, bun install --frozen-lockfile, then lint, typecheck, test
3	Boundaries exist	All 5 landed	global-error.tsx, error.tsx, dashboard/error.tsx, dashboard/loading.tsx, [slug]/error.tsx under /src/app/
3	"use client" / own html+body	Correct	all 4 error files are "use client"; global-error.tsx renders <html lang="en"><body>; loading.tsx correctly is not a client component
3	Swallows NEXT_REDIRECT?	No — handled correctly	all 4 error boundaries re-throw when error.digest starts with "NEXT_" (covers NEXT_REDIRECT and NEXT_NOT_FOUND); the root-layout startup gate in /src/app/layout.tsx is safe
4	APP_URL in env.ts + example	Landed (optional, .url())	/src/config/env.ts, /.env.example
4	NEXT_PUBLIC_APP_URL in env.ts	NOT in schema	only in .env.example; used as bare literal with ?? "" in /src/lib/axiosInstance.ts:17,36
4	placeholder-secret prod refine	Landed	superRefine in /src/config/env.ts rejects the exact .env.example string when NODE_ENV=production
4	human-readable missing-var error	NOT done	export const env = schema.parse(process.env) — raw ZodError (observed verbatim in the bun test output)
5	poweredByHeader: false	Landed	/next.config.ts
5	headers block	Landed	X-Content-Type-Options, Referrer-Policy, Permissions-Policy, CSP: frame-ancestors 'none', HSTS gated on NODE_ENV==="production"
5	full CSP	Deliberately not added (matches plan) — inline block styles unaffected. No X-Frame-Options legacy fallback	
6	README	Fully rewritten, no boilerplate	prereqs, env table, openssl rand, db:migrate, /setup gate, commands, datasets, architecture, deployment, security posture. No backup section.
7	Docs consistency	Several untrue claims	see below
8	API DRY	Mostly landed	/src/lib/api/parse-body.ts used by all 10 mutating routes; zero remaining request.json() outside the helper. But firstIssueField exists in 3 copies: shared /src/lib/api/first-issue-field.ts + private duplicates at /src/repositories/auth.ts:34 and /src/repositories/users.ts:37 (blocks.ts and pages.ts import the shared one)
9	Migrations	Consistent	0000–0012, journal has 13 entries matching filenames; bunx drizzle-kit check → "Everything's fine". 0011_route_permission_exact.sql is the data migration (role permission rewrite). 0012 snapshot matches /src/db/schema.ts (published_children + 4 indexes) — no drift
10	Logging	Not done	28 console.error in src/, no logger module anywhere
11	Stray files / TODOs	Clean	src/db/schema.types.ts deleted; zero TODO/FIXME/HACK in src, scripts, .docs; no empty files; all new exports referenced except one
Also verified green: bun run typecheck (clean), bun run lint (clean).

WHAT REMAINS OUTSTANDING (ranked by value)
No route-level authorization test — the actual enforcement seam is untested. permissions.test.ts tests the pure matcher only. requireRoutePermission in /src/lib/auth/permissions.ts:50 does route.slice("route:".length) and feeds the literal wildcard string "/dashboard/users/*" into canAccessRoute as if it were a pathname. It happens to work (the grant's startsWith(base + "/") matches), but nothing pins it. Any future tightening of canAccessRoute (e.g. rejecting * in a pathname) silently 403s or, worse, silently opens every API. This is the single highest-value missing test. Plan Stage 5f (integration matrix, signInAs(role)) is entirely unbuilt.
bun test is broken and is what the plan tells the next agent to run. .docs/remediation-plan.md Verification says bun run typecheck && bun run lint && bun test && bun run build. Literal bun test gives 1 fail + 1 error. Either exclude *.test.ts from bun's runner / add a bunfig preload, or fix the doc.
Env failure ergonomics. A missing DATABASE_URL dumps a raw ZodError JSON array. This is the first thing a self-hoster sees, on a product whose premise is "someone else self-hosts this". Also NEXT_PUBLIC_APP_URL is never validated — misconfigure it and axios silently falls back to a relative base with no warning.
Rate limiting is on login only. checkLoginRateLimit is imported solely by /src/app/api/auth/login/route.ts. Plan 2e said login and setup; /api/auth/setup is unthrottled. Also keyed off raw x-forwarded-for (client-spoofable behind a naive proxy) with fallback "local" — all local traffic shares one bucket.
Docs claiming untrue things (detail in the next section) — actively dangerous because AGENTS.md/roadmap.md are the stated first read for the next agent.
No logger. 28 console.error("<fn> failed:", error) across src/repositories/*. No request id, no level, no redaction; errors from a public page render and from an admin mutation are indistinguishable in a self-host's journald.
firstIssueField × 3. Plan 5e said "one shared, replacing four copies". Two private copies survive in /src/repositories/auth.ts and /src/repositories/users.ts.
CI gaps. No bun run build step (the type-gate the plan says was previously the only gate), no bun cache, no concurrency cancel-in-progress, no permissions: block. Single job — fine at this size.
README has no backup/restore section (item 6's last sub-point). For a self-hosted CMS with a single Postgres holding all content, pg_dump guidance is a real omission.
Commit the work. ~95 files of security-relevant change sitting uncommitted; CI cannot have gated any of it.
Minor: PLACEHOLDER_AUTH_SECRET is exported from /src/config/env.ts:32 and imported by nothing (dead export). sanitizeUrl(nonString) and isExternalUrl untested. No X-Frame-Options alongside frame-ancestors.

Landed but LOW QUALITY or MISLEADING
Docs that now claim untrue things (all in /home/hamid/Desktop/Hamid6426/portfolio-studio/):

.docs/roadmap.md:37 — "Passwords are scrypt, not bcrypt. src/lib/password.ts stores scrypt:<salt>:<hash>". The format is now scrypt$N=16384,r=8,p=1$<salt>$<hash>. The old form is only a legacy read path. This is presented as a "critical context, do not rediscover" trap and is wrong.
.docs/roadmap.md:~118 — "ensureDefaultRoles merges the new defaults on next dashboard load". Directly contradicts the Stage 1d fix: it is now create-if-missing only (/src/repositories/roles.ts:50) and is no longer called from dashboard/layout.tsx at all (only scripts/seed.ts and createAdminUser). A reader trusting this will assume permission edits get re-merged.
.docs/roadmap.md:~121 — "layout deletes a stale access cookie before sending to /login". Removed; the layout now redirects to /api/auth/session/clear.
.docs/roadmap.md:57 (trap 6) — "Notably absent: flexWrap, whiteSpace, position, boxShadow, border shorthands". flexWrap, flex, minWidth, lineHeight, textDecoration, border, borderTop, backgroundColor are all now allowlisted in /src/lib/block-sanitize.ts.
README.md security posture — "Route permissions use longest-match, default-deny (undeclared dashboard paths are rejected)". The implemented matcher (canAccessRoute, /src/config/permissions.ts:117) is not longest-match; it is list.some() over exact + /*-suffix grants. And undeclared paths are not universally rejected: admin holds route:/dashboard/*, so any future /dashboard/anything is allowed for admin. The plan's 1a design (longest declared route wins, undeclared → deny) was not implemented as written — a different, simpler design shipped. That's defensible, but the README describes the design that didn't ship.
AGENTS.md (Routes section) repeats the same overstatement: "The matcher is default deny — undeclared paths are rejected."
AGENTS.md Commands list is stale: bun dev · db:generate · db:migrate · db:studio · db:seed — omits the newly added typecheck, test, lint. The Routes list also omits /sitemap.xml and /robots.txt, which now exist (/src/app/sitemap.ts, /src/app/robots.ts), under a heading that says "do not invent".
.docs/remediation-plan.md header says "Most stages are implemented on the working tree", but its body is unedited: Stage 0 specifies "test": "bun test" and "no new dependency" (vitest + @vitejs/plugin-react were added); Stage 2d specifies scrypt:<N>:<r>:<p>:<salt>:<hash> (shipped as $-delimited); the migration map says 0012 = indexes and 0013 = published_children (both landed in 0012). Anyone reconciling plan against tree will chase phantom diffs.
Test quality — not vacuous, with two caveats. All 7 files assert real behavior against real implementations (the token tests hand-forge tokens with createHmac and the real env.AUTH_SECRET; the password test builds a legacy hash with scryptSync; the depth test builds an actual 32/33-deep tree). Caveats: (a) permissions.test.ts omits three cases the plan explicitly specified — /dashboard/../users, /dashboard/usersX, /dashboardX, /dashboard/unknown; only the wildcard-vs-users case is covered, and there is no admin row; (b) safe-redirect.test.ts is 17 lines and skips control characters and the new URL(...).origin durability check that the plan called "the durable one" — the shipped safeRedirectPath uses string prefix checks instead, so the test pins the weaker implementation.

Fragile-but-passing: vitest.setup.ts uses ??= for DATABASE_URL/AUTH_SECRET, so CI (no .env.local) gets the defaults and passes — but a developer with a real .env.local runs the suite against their own secret and DB URL. Harmless today (no test touches the DB); it becomes a live-database footgun the moment Stage 5f integration tests land.

Infra verification in. The tests are genuinely good quality — real HMAC forging, real legacy scrypt hashes, an actual 32/33-deep tree — not vacuous. But three things matter:

The docs now assert things that didn't ship. Both README.md and AGENTS.md claim the route matcher is "longest-match, default-deny (undeclared dashboard paths are rejected)". The design that actually shipped is a list.some() over exact and /*-suffix grants, and undeclared paths resolve true for admin. .docs/roadmap.md also still describes the old password format, claims ensureDefaultRoles merges on every dashboard load (it no longer does), and lists flexWrap/border as absent from the allowlist when they're now present. Since AGENTS.md is the stated first read for the next agent, these are actively misleading.

bun test is broken — and the plan tells the next agent to run exactly that. bun run test (vitest) passes 42/42, but literal bun test gives 1 fail + 1 error because Bun's own runner ignores vitest.setup.ts, so env.ts throws on missing DATABASE_URL.

vitest.setup.ts uses ??= for DATABASE_URL — so a developer with a real .env.local runs the suite against their own database. Harmless today since no test touches the DB; it becomes a live-database footgun the moment integration tests land.

One verification left (editor/public renderer), then I'll consolidate what's actually outstanding.