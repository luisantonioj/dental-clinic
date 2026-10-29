import { Building2 } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/app/page-header";
import { SectionCard } from "@/components/app/section-card";
import { WorkplaceDot, workplaceTypeLabel } from "@/components/app/workplace-tag";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/server/auth";
import { listAudit } from "@/server/data/audit";
import { getProfile } from "@/server/data/users";
import { listWorkplaces } from "@/server/data/workplaces";
import { ActivityList } from "./activity-list";
import { PasswordForm } from "./password-form";
import { ProfileForm } from "./profile-form";
import { WorkplaceDialog } from "./workplace-dialog";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const actor = await requireUser();
  const [profile, workplaces, activity] = await Promise.all([
    getProfile(actor),
    listWorkplaces(actor, { includeInactive: true }),
    listAudit(actor, 25),
  ]);

  return (
    <>
      <PageHeader title="Settings" description="Your profile, workplaces, reminders and password." />
      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Profile" description="Shown on receipts and reminder emails.">
          <ProfileForm profile={profile} />
        </SectionCard>

        <SectionCard
          id="workplaces"
          title="Workplaces"
          description="Keep earnings, appointments and stock separate per place."
          action={<WorkplaceDialog />}
        >
          {workplaces.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Add the clinics where you work: your own clinic and any partner clinic that pays you a share."
            />
          ) : (
            <ul className="-my-2 divide-y">
              {workplaces.map((w) => (
                <li key={w.id} className="flex items-center gap-3 py-3">
                  <WorkplaceDot color={w.color} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <b className="truncate font-semibold text-heading">{w.name}</b>
                      {!w.active && <Badge variant="secondary">Inactive</Badge>}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {workplaceTypeLabel(w)}
                      {w.deductLabFees && " · lab fees deducted first"}
                      {w.address && ` · ${w.address}`}
                    </p>
                  </div>
                  <WorkplaceDialog workplace={w} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Password" description="Changing it signs you out on your other devices.">
          <PasswordForm />
        </SectionCard>

        <SectionCard
          title="Activity log"
          description={actor.role === "admin" ? "Recent changes across all accounts." : "Recent changes to your records."}
        >
          <ActivityList entries={activity} showActor={actor.role === "admin"} />
        </SectionCard>
      </div>
    </>
  );
}
