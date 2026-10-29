import "server-only";
import { z } from "zod";

const optional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .optional();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  /** Neon connection string. When unset, a local PGlite database in ./.pglite is used. */
  DATABASE_URL: optional,
  /** Directory for the local PGlite database (or "memory://" in tests). */
  PGLITE_DATA_DIR: z.string().default("./.pglite"),
  BETTER_AUTH_SECRET: optional,
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
  R2_ACCOUNT_ID: optional,
  R2_ACCESS_KEY_ID: optional,
  R2_SECRET_ACCESS_KEY: optional,
  R2_BUCKET: optional,
  RESEND_API_KEY: optional,
  EMAIL_FROM: optional,
  CRON_SECRET: optional,
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

export function env(): Env {
  if (!cached) {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`);
    }
    if (parsed.data.NODE_ENV === "production" && !parsed.data.BETTER_AUTH_SECRET) {
      throw new Error("BETTER_AUTH_SECRET is required in production");
    }
    cached = parsed.data;
  }
  return cached;
}

/** R2 settings, or an error naming what is missing. Only called when files are used. */
export function r2Env() {
  const e = env();
  const missing = (["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"] as const).filter(
    (k) => !e[k],
  );
  if (missing.length) throw new Error(`File storage is not configured. Missing: ${missing.join(", ")}`);
  return {
    accountId: e.R2_ACCOUNT_ID!,
    accessKeyId: e.R2_ACCESS_KEY_ID!,
    secretAccessKey: e.R2_SECRET_ACCESS_KEY!,
    bucket: e.R2_BUCKET!,
  };
}

/** Resend settings, or undefined when email is not configured (emails are then logged in dev). */
export function emailEnv() {
  const e = env();
  if (!e.RESEND_API_KEY || !e.EMAIL_FROM) return undefined;
  return { apiKey: e.RESEND_API_KEY, from: e.EMAIL_FROM };
}
