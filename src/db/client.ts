import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { Pool } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import * as schema from "./schema";

export type Schema = typeof schema;
export type DB = PgDatabase<PgQueryResultHKT, Schema>;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

export type DbHandle = { db: DB; driver: "neon" | "pglite"; close: () => Promise<void> };

/**
 * Creates a Drizzle client: Neon when a connection string is given,
 * otherwise an embedded PGlite database (a folder path or "memory://").
 * Kept free of `server-only` so scripts and tests can use it.
 */
export function createDb(opts: { databaseUrl?: string; pgliteDir?: string }): DbHandle {
  if (opts.databaseUrl) {
    const pool = new Pool({ connectionString: opts.databaseUrl });
    const db = drizzleNeon({ client: pool, schema, casing: "snake_case" });
    return { db: db as unknown as DB, driver: "neon", close: () => pool.end() };
  }
  const client = new PGlite(opts.pgliteDir ?? "./.pglite", { extensions: { pg_trgm } });
  const db = drizzlePglite({ client, schema, casing: "snake_case" });
  return { db: db as unknown as DB, driver: "pglite", close: () => client.close() };
}
