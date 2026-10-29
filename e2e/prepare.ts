// Prepares a fresh database for the end-to-end run, then exits so the dev
// server can open it. Used by playwright.config.ts before `next dev` starts.
import { rm } from "node:fs/promises";
import { createDb } from "../src/db/client";
import { runMigrations } from "../src/db/migrate";
import { seedAdmin } from "../src/db/seed-admin";

export const E2E_DB_DIR = "./.pglite-e2e";
export const E2E_ADMIN = { email: "admin@e2e.test", password: "e2e-admin-password", name: "E2E Admin" };

async function main() {
  await rm(E2E_DB_DIR, { recursive: true, force: true });
  const handle = createDb({ pgliteDir: E2E_DB_DIR });
  await runMigrations(handle);
  await seedAdmin(handle.db, E2E_ADMIN);
  await handle.close();
  console.log("e2e database ready");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
