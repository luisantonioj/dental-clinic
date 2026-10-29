import { migrate as migrateNeon } from "drizzle-orm/neon-serverless/migrator";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import path from "node:path";
import type { DbHandle, Schema } from "./client";

const migrationsFolder = path.join(process.cwd(), "drizzle");

/** Applies the SQL migrations in ./drizzle to the given database. */
export async function runMigrations(handle: DbHandle) {
  if (handle.driver === "neon") {
    await migrateNeon(handle.db as unknown as NeonDatabase<Schema>, { migrationsFolder });
  } else {
    await migratePglite(handle.db as unknown as PgliteDatabase<Schema>, { migrationsFolder });
  }
}
