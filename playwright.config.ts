import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    locale: "en-PH",
    timezoneId: "Asia/Manila",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Fresh embedded database, then the dev server on its own port.
    command: `pnpm exec tsx e2e/prepare.ts && pnpm exec next dev --port ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: "",
      PGLITE_DATA_DIR: "./.pglite-e2e",
      BETTER_AUTH_URL: `http://localhost:${PORT}`,
      BETTER_AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret-1234",
      RESEND_API_KEY: "",
      EMAIL_FROM: "",
      R2_ACCOUNT_ID: "",
      CRON_SECRET: "e2e-cron",
    },
  },
});
