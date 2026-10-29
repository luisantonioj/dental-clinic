import { createDb } from "../src/db/client";
import { runMigrations } from "../src/db/migrate";

async function main() {
  const handle = createDb({
    databaseUrl: process.env.DATABASE_URL || undefined,
    pgliteDir: process.env.PGLITE_DATA_DIR ?? "./.pglite",
  });
  console.log(`Applying migrations (${handle.driver})…`);
  await runMigrations(handle);
  await handle.close();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
