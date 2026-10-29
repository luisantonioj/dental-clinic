import "server-only";
import { formatTime, TIME_ZONE } from "@/lib/format";
import type { Actor } from "@/server/actor";
import {
  clearReminderSent,
  dueReminders,
  markReminderSent,
  type ReminderJob,
  reminderFor,
} from "@/server/data/appointments";
import { sendEmail } from "@/server/email/send";
import { appointmentReminderEmail } from "@/server/email/templates";

const longDate = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: TIME_ZONE,
});

function messageFor(job: ReminderJob) {
  return appointmentReminderEmail({
    ...job,
    when: `${longDate.format(job.startsAt)} at ${formatTime(job.startsAt)}`,
  });
}

/**
 * Sends every due reminder once. Each appointment is claimed before sending,
 * so overlapping runs can't double-send; a failed send is released for retry.
 */
export async function runReminders(now = new Date(), slackHours = 0) {
  const jobs = await dueReminders(now, slackHours);
  let sent = 0;
  let failed = 0;
  for (const job of jobs) {
    if (!(await markReminderSent(job.appointmentId, now))) continue;
    const result = await sendEmail(messageFor(job));
    if (result.ok) sent += 1;
    else {
      failed += 1;
      await clearReminderSent(job.appointmentId);
      console.error(`reminder failed for appointment ${job.appointmentId}: ${result.error}`);
    }
  }
  return { due: jobs.length, sent, failed };
}

/** "Send reminder now" from the appointment dialog. */
export async function sendReminderNow(actor: Actor, appointmentId: string) {
  const job = await reminderFor(actor, appointmentId);
  const result = await sendEmail(messageFor(job));
  if (result.ok) {
    await clearReminderSent(appointmentId);
    await markReminderSent(appointmentId, new Date());
  }
  return result;
}
