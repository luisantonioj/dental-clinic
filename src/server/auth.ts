import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins/admin";
import { adminAc, userAc } from "better-auth/plugins/admin/access";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { env } from "@/lib/env";
import { sendEmail } from "@/server/email/send";
import { resetPasswordEmail } from "@/server/email/templates";
import type { Actor } from "@/server/actor";

export const auth = betterAuth({
  secret: env().BETTER_AUTH_SECRET ?? "dev-only-secret-change-me-in-production",
  baseURL: env().BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
  }),
  emailAndPassword: {
    enabled: true,
    // Accounts are created by the admin only.
    disableSignUp: true,
    minPasswordLength: 8,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail(resetPasswordEmail(user.email, user.name, url));
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 14,
    updateAge: 60 * 60 * 24,
  },
  user: {
    additionalFields: {
      prcLicense: { type: "string", required: false, input: false },
      phone: { type: "string", required: false, input: false },
      reminderHours: { type: "number", required: false, input: false, defaultValue: 24 },
    },
  },
  plugins: [
    admin({
      // Dentists get no admin permissions; the admin manages accounts.
      roles: { admin: adminAc, dentist: userAc },
      defaultRole: "dentist",
      adminRoles: ["admin"],
    }),
    nextCookies(),
  ],
});

/** The signed-in user for this request, or null. Cached per request. */
export const getActor = cache(async (): Promise<Actor | null> => {
  const result = await auth.api.getSession({ headers: await headers() });
  if (!result) return null;
  const u = result.user;
  return {
    id: u.id,
    role: u.role === "admin" ? "admin" : "dentist",
    name: u.name,
    email: u.email,
  };
});

/** The signed-in user; redirects to /login when there is no session. */
export async function requireUser(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect("/login");
  return actor;
}

/** The signed-in admin; others are sent to the dashboard. */
export async function requireAdmin(): Promise<Actor> {
  const actor = await requireUser();
  if (actor.role !== "admin") redirect("/");
  return actor;
}
