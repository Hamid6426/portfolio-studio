import { config } from "dotenv";

config({ path: ".env.local" });

if (!process.env.NODE_ENV) {
  Object.defineProperty(process.env, "NODE_ENV", {
    value: "test",
    writable: true,
  });
}
process.env.DATABASE_URL ??= "postgres://localhost:5432/portfolio_studio_test";
process.env.AUTH_SECRET ??=
  "test-auth-secret-at-least-32-characters-long!!";
