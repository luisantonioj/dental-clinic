import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: { "server-only": path.resolve(import.meta.dirname, "tests/support/empty.ts") },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/unit/**/*.test.ts"],
    setupFiles: ["tests/support/setup-db.ts"],
    env: { BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret", PGLITE_DATA_DIR: "memory://" },
    pool: "forks",
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
