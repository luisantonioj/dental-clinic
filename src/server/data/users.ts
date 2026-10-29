import "server-only";
import { hashPassword } from "better-auth/crypto";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { account, session, user } from "@/db/schema";
import type { CreateDentistInput, ProfileInput } from "@/lib/validation/users";
import { type Actor, NotFoundError } from "@/server/actor";
import { audit } from "./audit";

export class ForbiddenError extends Error {
  constructor() {
    super("Only the administrator can do that");
    this.name = "ForbiddenError";
  }
}

function assertAdmin(actor: Actor) {
  if (actor.role !== "admin") throw new ForbiddenError();
}

export type AccountRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  prcLicense: string | null;
  phone: string | null;
  banned: boolean;
  createdAt: Date;
};

export async function listAccounts(actor: Actor): Promise<AccountRow[]> {
  assertAdmin(actor);
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      prcLicense: user.prcLicense,
      phone: user.phone,
      banned: user.banned,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(asc(user.role), asc(user.name));
  return rows.map((r) => ({ ...r, banned: Boolean(r.banned) }));
}

export class DuplicateEmailError extends Error {
  constructor() {
    super("An account with that email already exists");
    this.name = "DuplicateEmailError";
  }
}

/** Creates a dentist account with an email + password login. */
export async function createDentist(actor: Actor, input: CreateDentistInput): Promise<{ id: string }> {
  assertAdmin(actor);
  const existing = await db.select({ id: user.id }).from(user).where(eq(user.email, input.email));
  if (existing.length) throw new DuplicateEmailError();

  const id = crypto.randomUUID();
  const password = await hashPassword(input.password);
  await db.transaction(async (tx) => {
    await tx.insert(user).values({
      id,
      name: input.name,
      email: input.email,
      role: "dentist",
      emailVerified: true,
      prcLicense: input.prcLicense,
      phone: input.phone,
    });
    await tx
      .insert(account)
      .values({ id: crypto.randomUUID(), accountId: id, providerId: "credential", userId: id, password });
  });
  await audit(actor, "create", "user", id, { email: input.email });
  return { id };
}

/** Disables (and signs out) or re-enables an account. Admins can't disable themselves. */
export async function setAccountDisabled(actor: Actor, userId: string, disabled: boolean): Promise<void> {
  assertAdmin(actor);
  if (userId === actor.id) throw new Error("You can't disable your own account");
  const updated = await db
    .update(user)
    .set({ banned: disabled, banReason: disabled ? "Disabled by administrator" : null })
    .where(eq(user.id, userId))
    .returning({ id: user.id });
  if (!updated.length) throw new NotFoundError("Account");
  if (disabled) await db.delete(session).where(eq(session.userId, userId));
  await audit(actor, disabled ? "disable" : "enable", "user", userId);
}

/** Sets a new password and signs the account out everywhere. */
export async function setAccountPassword(actor: Actor, userId: string, newPassword: string): Promise<void> {
  assertAdmin(actor);
  const password = await hashPassword(newPassword);
  const updated = await db
    .update(account)
    .set({ password })
    .where(and(eq(account.userId, userId), eq(account.providerId, "credential")))
    .returning({ id: account.id });
  if (!updated.length) throw new NotFoundError("Account");
  await db.delete(session).where(eq(session.userId, userId));
  await audit(actor, "reset-password", "user", userId);
}

export type Profile = {
  id: string;
  name: string;
  email: string;
  role: string;
  prcLicense: string | null;
  phone: string | null;
  reminderHours: number;
};

export async function getProfile(actor: Actor): Promise<Profile> {
  const [row] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      prcLicense: user.prcLicense,
      phone: user.phone,
      reminderHours: user.reminderHours,
    })
    .from(user)
    .where(eq(user.id, actor.id));
  if (!row) throw new NotFoundError("Account");
  return row;
}

export async function updateProfile(actor: Actor, input: ProfileInput): Promise<void> {
  await db
    .update(user)
    .set({
      name: input.name,
      prcLicense: input.prcLicense ?? null,
      phone: input.phone ?? null,
      reminderHours: input.reminderHours,
    })
    .where(eq(user.id, actor.id));
  await audit(actor, "update", "user", actor.id);
}
