import { beforeEach, describe, expect, it, vi } from "vitest";

import { ACCESS_TOKEN_COOKIE } from "@/config/storage-keys";
import {
  ensureIntegrationFixtures,
  getIntegrationAccessToken,
  isIntegrationDbAvailable,
  readJson,
  setupIntegrationSuite,
  signInAs,
  signOut,
} from "@/test/integration/helpers";

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const token = getIntegrationAccessToken();
      if (name === ACCESS_TOKEN_COOKIE && token) {
        return { value: token };
      }
      return undefined;
    },
  }),
  headers: async () =>
    new Headers({
      "x-request-id": "integration-test",
      "x-pathname": "/dashboard/overview",
    }),
}));

const { GET: getUsers, POST: postUsers } = await import("@/app/api/users/route");
const { GET: getPages, POST: postPages } = await import("@/app/api/pages/route");
const { GET: getTheme, PATCH: patchTheme } = await import(
  "@/app/api/site/theme/route"
);

const dbReady = await isIntegrationDbAvailable();

describe.skipIf(!dbReady)("API auth matrix (Postgres)", () => {
  setupIntegrationSuite();

  beforeEach(() => {
    signOut();
  });

  it("returns 401 without a session", async () => {
    const users = await readJson(await getUsers());
    expect(users.status).toBe(401);
    expect(users.body.success).toBe(false);

    const pages = await readJson(await getPages());
    expect(pages.status).toBe(401);
  });

  it("viewer gets 403 on users and pages routes", async () => {
    await ensureIntegrationFixtures();
    await signInAs("viewer");

    const users = await readJson(await getUsers());
    expect(users.status).toBe(403);

    const pages = await readJson(await getPages());
    expect(pages.status).toBe(403);
  });

  it("editor can list pages but not users", async () => {
    await ensureIntegrationFixtures();
    await signInAs("editor");

    const pages = await readJson(await getPages());
    expect(pages.status).toBe(200);
    expect(pages.body.success).toBe(true);

    const users = await readJson(await getUsers());
    expect(users.status).toBe(403);
  });

  it("admin can list users", async () => {
    await ensureIntegrationFixtures();
    await signInAs("admin");

    const users = await readJson(await getUsers());
    expect(users.status).toBe(200);
    expect(users.body.success).toBe(true);
  });

  it("returns 400 on invalid create-page body (editor)", async () => {
    await ensureIntegrationFixtures();
    await signInAs("editor");

    const response = await postPages(
      new Request("http://localhost/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "", slug: "BAD SLUG" }),
      }),
    );
    const { status, body } = await readJson(response);
    expect(status).toBe(400);
    expect(body.success).toBe(false);
  });

  it("returns 403 when viewer tries to create a user", async () => {
    await ensureIntegrationFixtures();
    await signInAs("viewer");

    const response = await postUsers(
      new Request("http://localhost/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Nope",
          email: "nope@example.com",
          password: "Password1!",
          role: "viewer",
        }),
      }),
    );
    const { status } = await readJson(response);
    expect(status).toBe(403);
  });

  it("editor can read theme; viewer cannot", async () => {
    await ensureIntegrationFixtures();

    await signInAs("viewer");
    const denied = await readJson(await getTheme());
    expect(denied.status).toBe(403);

    await signInAs("editor");
    const allowed = await readJson(await getTheme());
    expect(allowed.status).toBe(200);
    expect(allowed.body.success).toBe(true);
  });

  it("returns 400 on unknown theme id (editor)", async () => {
    await ensureIntegrationFixtures();
    await signInAs("editor");

    const response = await patchTheme(
      new Request("http://localhost/api/site/theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeId: "not-a-real-theme" }),
      }),
    );
    const { status, body } = await readJson(response);
    expect(status).toBe(400);
    expect(body.success).toBe(false);
  });
});

describe.skipIf(dbReady)("API auth matrix (Postgres) — skipped", () => {
  it("stays green when portfolio_studio_test is unreachable", () => {
    expect(dbReady).toBe(false);
  });
});
