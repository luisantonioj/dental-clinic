import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/unit/**/*.test.ts"],
    // Each test file gets its own in-memory PGlite database.
    pool: "forks",
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
