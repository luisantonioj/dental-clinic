import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import type { DB } from "./client";
import { account, user } from "./schema";

/**
 * Creates the first admin account (email + password) if that email doesn't exist.
 * Used by `pnpm db:seed`; writes the same rows Better Auth's admin createUser does.
 */
export async function seedAdmin(db: DB, input: { email: string; password: string; name: string }) {
  const email = input.email.trim().toLowerCase();
  const existing = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
  if (existing.length) return { created: false as const, id: existing[0].id };

  if (input.password.length < 8) throw new Error("SEED_ADMIN_PASSWORD must be at least 8 characters");

  const id = crypto.randomUUID();
  const password = await hashPassword(input.password);
  await db.transaction(async (tx) => {
    await tx.insert(user).values({ id, email, name: input.name, role: "admin", emailVerified: true });
    await tx.insert(account).values({
      id: crypto.randomUUID(),
      accountId: id,
      providerId: "credential",
      userId: id,
      password,
    });
  });
  return { created: true as const, id };
}
