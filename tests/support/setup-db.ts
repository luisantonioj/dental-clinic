import { afterAll, beforeAll } from "vitest";
import { createDb, type DbHandle } from "@/db/client";
import { runMigrations } from "@/db/migrate";

// Every test file gets a fresh in-memory PGlite database with all migrations,
// installed as the app's db singleton (see src/db/index.ts).
const globalForDb = globalThis as unknown as { dentalkeepDb?: DbHandle };

beforeAll(async () => {
  const handle = createDb({ pgliteDir: "memory://" });
  await runMigrations(handle);
  globalForDb.dentalkeepDb = handle;
});

afterAll(async () => {
  await globalForDb.dentalkeepDb?.close();
  globalForDb.dentalkeepDb = undefined;
});
