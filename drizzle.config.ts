import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL;

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  casing: "snake_case",
  ...(url
    ? { dbCredentials: { url } }
    : { driver: "pglite", dbCredentials: { url: process.env.PGLITE_DATA_DIR ?? "./.pglite" } }),
});
