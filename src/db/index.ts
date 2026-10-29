import "server-only";
import { env } from "@/lib/env";
import { createDb, type DbHandle } from "./client";

export type { DB, Tx } from "./client";

// Reuse one client across hot reloads in dev.
const globalForDb = globalThis as unknown as { dentalkeepDb?: DbHandle };

export function getDbHandle(): DbHandle {
  if (!globalForDb.dentalkeepDb) {
    const e = env();
    globalForDb.dentalkeepDb = createDb({ databaseUrl: e.DATABASE_URL, pgliteDir: e.PGLITE_DATA_DIR });
  }
  return globalForDb.dentalkeepDb;
}

/** The app's database. Only `src/server/data/*` may import this (see AGENTS.md). */
export const db = new Proxy({} as DbHandle["db"], {
  get(_target, prop) {
    const real = getDbHandle().db;
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
