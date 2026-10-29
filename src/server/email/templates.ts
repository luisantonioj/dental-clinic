import { emailLayout, escapeHtml } from "./layout";
import type { EmailMessage } from "./send";

export function resetPasswordEmail(to: string, name: string, url: string): EmailMessage {
  const safeUrl = escapeHtml(url);
  return {
    to,
    subject: "Reset your DentalKeep password",
    html: emailLayout(
      "Reset your password",
      `<p style="margin:0 0 16px;line-height:1.5">Hi ${escapeHtml(name)}, use the button below to choose a new password. The link expires in 1 hour.</p>
<p style="margin:0 0 16px"><a href="${safeUrl}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600">Reset password</a></p>
<p style="margin:0;color:#64748b;font-size:13px">If you didn't ask for this, you can ignore this email.</p>`,
    ),
    text: `Hi ${name}, reset your DentalKeep password here (expires in 1 hour): ${url}`,
  };
}
