if (!process.env.NODE_ENV) {
  Object.defineProperty(process.env, "NODE_ENV", {
    value: "test",
    writable: true,
  });
}
// Always pin test credentials so a developer's .env.local cannot point the
// suite at a real database. Integration tests use this URL and skip when the
// database is unreachable — see `src/test/integration/`.
process.env.DATABASE_URL =
  "postgres://localhost:5432/portfolio_studio_test";
process.env.AUTH_SECRET =
  "test-auth-secret-at-least-32-characters-long!!";
