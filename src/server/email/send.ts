import "server-only";
import { Resend } from "resend";
import { emailEnv, env } from "@/lib/env";

export type EmailMessage = { to: string; subject: string; html: string; text: string };

/**
 * Sends an email through Resend. When Resend is not configured in local dev,
 * the message is printed to the server console instead. In production it
 * fails, so reset links and patient emails never end up in hosting logs.
 */
export async function sendEmail(message: EmailMessage): Promise<{ ok: true } | { ok: false; error: string }> {
  const config = emailEnv();
  if (!config) {
    if (env().NODE_ENV === "production") return { ok: false, error: "Email isn't configured (RESEND_API_KEY, EMAIL_FROM)" };
    console.info(`[email:dev] to=${message.to} subject="${message.subject}"\n${message.text}`);
    return { ok: true };
  }
  const resend = new Resend(config.apiKey);
  const { error } = await resend.emails.send({ from: config.from, ...message });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
