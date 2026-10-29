import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { requireUser } from "@/server/auth";

export const metadata: Metadata = { title: "Dashboard" };

function greeting(now: Date): string {
  const hour = Number(new Intl.DateTimeFormat("en-PH", { hour: "numeric", hour12: false, timeZone: "Asia/Manila" }).format(now));
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const actor = await requireUser();
  return <PageHeader title={`${greeting(new Date())}, ${actor.name}`} description="Here's your practice today." />;
}
