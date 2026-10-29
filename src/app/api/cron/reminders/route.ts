import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { runReminders } from "@/server/reminders";

/**
 * Called by Vercel Cron (see vercel.json). Vercel sends
 * `Authorization: Bearer $CRON_SECRET`; anything else is rejected.
 */
export async function GET(request: Request) {
  const secret = env().CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runReminders(new Date(), env().REMINDER_SLACK_HOURS);
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
