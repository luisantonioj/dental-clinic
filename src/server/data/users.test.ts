import { verifyPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { account, auditLog, session, user } from "@/db/schema";
import { makeActor } from "../../../tests/support/factories";
import {
  createDentist,
  DuplicateEmailError,
  ForbiddenError,
  getProfile,
  listAccounts,
  setAccountDisabled,
  setAccountPassword,
  updateProfile,
} from "./users";

describe("users data layer", () => {
  it("only lets admins list and create accounts", async () => {
    const dentist = await makeActor("dentist");
    await expect(listAccounts(dentist)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      createDentist(dentist, { name: "X", email: "x@example.com", password: "password123" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("creates a dentist with a hashed credential and an audit entry", async () => {
    const admin = await makeActor("admin");
    const { id } = await createDentist(admin, {
      name: "Dra. Santos",
      email: "santos@example.com",
      password: "password123",
      prcLicense: "0123456",
    });
    const [row] = await db.select().from(user).where(eq(user.id, id));
    expect(row.role).toBe("dentist");
    expect(row.prcLicense).toBe("0123456");
    const [cred] = await db
      .select()
      .from(account)
      .where(and(eq(account.userId, id), eq(account.providerId, "credential")));
    expect(await verifyPassword({ hash: cred.password!, password: "password123" })).toBe(true);
    const logs = await db.select().from(auditLog).where(eq(auditLog.entityId, id));
    expect(logs[0].action).toBe("create");

    await expect(
      createDentist(admin, { name: "Dup", email: "santos@example.com", password: "password123" }),
    ).rejects.toBeInstanceOf(DuplicateEmailError);
  });

  it("disables an account and removes its sessions", async () => {
    const admin = await makeActor("admin");
    const dentist = await makeActor("dentist");
    await db.insert(session).values({
      id: crypto.randomUUID(),
      token: crypto.randomUUID(),
      userId: dentist.id,
      expiresAt: new Date(Date.now() + 3600_000),
    });
    await setAccountDisabled(admin, dentist.id, true);
    const [row] = await db.select().from(user).where(eq(user.id, dentist.id));
    expect(row.banned).toBe(true);
    expect(await db.select().from(session).where(eq(session.userId, dentist.id))).toHaveLength(0);

    await setAccountDisabled(admin, dentist.id, false);
    const [again] = await db.select().from(user).where(eq(user.id, dentist.id));
    expect(again.banned).toBe(false);
    await expect(setAccountDisabled(admin, admin.id, true)).rejects.toThrow();
  });

  it("resets a password", async () => {
    const admin = await makeActor("admin");
    const { id } = await createDentist(admin, { name: "R", email: "r@example.com", password: "password123" });
    await setAccountPassword(admin, id, "new-password-1");
    const [cred] = await db.select().from(account).where(eq(account.userId, id));
    expect(await verifyPassword({ hash: cred.password!, password: "new-password-1" })).toBe(true);
  });

  it("lets anyone update only their own profile", async () => {
    const dentist = await makeActor("dentist");
    await updateProfile(dentist, { name: "Dra. New", prcLicense: "999", phone: "0917 000 0000", reminderHours: 48 });
    const profile = await getProfile(dentist);
    expect(profile).toMatchObject({ name: "Dra. New", prcLicense: "999", reminderHours: 48 });
  });
});
