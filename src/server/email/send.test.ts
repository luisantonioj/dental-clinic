import { afterEach, describe, expect, it, vi } from "vitest";

const message = { to: "a@example.com", subject: "Reset", html: "<p>x</p>", text: "https://reset-link" };

describe("sendEmail without Resend configured", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("prints to the console in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const { sendEmail } = await import("./send");
    expect(await sendEmail(message)).toEqual({ ok: true });
    expect(log).toHaveBeenCalled();
  });

  it("fails in production instead of logging the email", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const { sendEmail } = await import("./send");
    const result = await sendEmail(message);
    expect(result.ok).toBe(false);
    expect(log).not.toHaveBeenCalled();
  });
});
