/**
 * Runs once when the server starts. With the local PGlite database (no
 * DATABASE_URL), migrations are applied automatically so `pnpm dev` just works.
 * Neon is migrated explicitly with `pnpm db:migrate`.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.DATABASE_URL) return;
  const { getDbHandle } = await import("@/db");
  const { runMigrations } = await import("@/db/migrate");
  await runMigrations(getDbHandle());
}
