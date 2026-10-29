import { describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { seedAdmin } from "@/db/seed-admin";

vi.mock("next/headers", () => ({ headers: async () => new Headers(), cookies: async () => ({ get: () => undefined }) }));

const { auth } = await import("@/server/auth");

describe("auth", () => {
  it("lets the seeded admin sign in with email and password", async () => {
    await seedAdmin(db, { email: "Admin@Example.com", password: "correct-horse", name: "Admin" });
    const res = await auth.api.signInEmail({ body: { email: "admin@example.com", password: "correct-horse" } });
    expect(res.user.email).toBe("admin@example.com");
    expect((res.user as { role?: string }).role).toBe("admin");
  });

  it("rejects a wrong password", async () => {
    await expect(
      auth.api.signInEmail({ body: { email: "admin@example.com", password: "wrong-password" } }),
    ).rejects.toThrow();
  });

  it("does not allow public sign-up", async () => {
    await expect(
      auth.api.signUpEmail({ body: { email: "stranger@example.com", password: "password123", name: "Stranger" } }),
    ).rejects.toThrow();
  });

  it("creates dentist accounts through the admin API with the dentist role", async () => {
    const res = await auth.api.createUser({
      body: { email: "dentist@example.com", password: "password123", name: "Dra. Test", role: "dentist" },
    });
    expect(res.user.role).toBe("dentist");
    const signIn = await auth.api.signInEmail({ body: { email: "dentist@example.com", password: "password123" } });
    expect(signIn.user.id).toBe(res.user.id);
  });

  it("is idempotent when seeding the same admin twice", async () => {
    const again = await seedAdmin(db, { email: "admin@example.com", password: "correct-horse", name: "Admin" });
    expect(again.created).toBe(false);
  });
});
