import "server-only";
import { Resend } from "resend";
import { emailEnv } from "@/lib/env";

export type EmailMessage = { to: string; subject: string; html: string; text: string };

/**
 * Sends an email through Resend. When Resend is not configured (local dev),
 * the message is printed to the server console instead.
 */
export async function sendEmail(message: EmailMessage): Promise<{ ok: true } | { ok: false; error: string }> {
  const config = emailEnv();
  if (!config) {
    console.info(`[email:dev] to=${message.to} subject="${message.subject}"\n${message.text}`);
    return { ok: true };
  }
  const resend = new Resend(config.apiKey);
  const { error } = await resend.emails.send({ from: config.from, ...message });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
