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

export type ReminderDetails = {
  patientFirstName: string;
  patientEmail: string;
  when: string; // e.g. "Friday, 30 October 2026 at 2:00 PM"
  dentistName: string;
  dentistPhone: string | null;
  workplaceName: string;
  workplaceAddress: string | null;
  workplacePhone: string | null;
};

/** Appointment reminder. Deliberately has no clinical details (Data Privacy Act). */
export function appointmentReminderEmail(r: ReminderDetails): EmailMessage {
  const contact = r.workplacePhone ?? r.dentistPhone;
  const rows = [
    ["When", r.when],
    ["With", r.dentistName],
    ["Where", [r.workplaceName, r.workplaceAddress].filter(Boolean).join(", ")],
  ];
  const table = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#64748b;vertical-align:top">${k}</td><td style="padding:6px 0;font-weight:600">${escapeHtml(v)}</td></tr>`,
    )
    .join("");
  return {
    to: r.patientEmail,
    subject: `Reminder: your dental appointment on ${r.when}`,
    html: emailLayout(
      "Appointment reminder",
      `<p style="margin:0 0 16px;line-height:1.5">Hi ${escapeHtml(r.patientFirstName)}, this is a reminder of your dental appointment.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;font-size:14px">${table}</table>
<p style="margin:0;color:#64748b;font-size:13px;line-height:1.5">${
        contact ? `Need to reschedule? Please call or text ${escapeHtml(contact)}.` : "Need to reschedule? Please contact the clinic."
      }</p>`,
    ),
    text: `Hi ${r.patientFirstName}, this is a reminder of your dental appointment.\nWhen: ${r.when}\nWith: ${r.dentistName}\nWhere: ${[r.workplaceName, r.workplaceAddress].filter(Boolean).join(", ")}\n${contact ? `Need to reschedule? Please call or text ${contact}.` : ""}`,
  };
}
