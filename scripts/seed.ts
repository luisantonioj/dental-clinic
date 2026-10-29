import { createDb } from "../src/db/client";
import { seedAdmin } from "../src/db/seed-admin";

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME || "Administrator";
  if (!email || !password) {
    throw new Error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env.local first.");
  }

  const handle = createDb({
    databaseUrl: process.env.DATABASE_URL || undefined,
    pgliteDir: process.env.PGLITE_DATA_DIR ?? "./.pglite",
  });
  const result = await seedAdmin(handle.db, { email, password, name });
  await handle.close();
  console.log(result.created ? `Created admin ${email}.` : `Admin ${email} already exists; nothing to do.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
