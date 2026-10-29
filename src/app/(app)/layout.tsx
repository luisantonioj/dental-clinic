import { AppShell } from "@/components/app/shell/app-shell";
import { WorkplaceSwitcher } from "@/components/app/shell/workplace-switcher";
import { workplaceTypeLabel } from "@/components/app/workplace-tag";
import { requireUser } from "@/server/auth";
import { getCurrentWorkplace } from "@/server/current-workplace";
import { getProfile } from "@/server/data/users";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireUser();
  const [profile, { current, workplaces }] = await Promise.all([getProfile(actor), getCurrentWorkplace(actor)]);

  const role = actor.role === "admin" ? "Administrator" : "Dentist";
  const user = {
    id: actor.id,
    name: profile.name,
    email: actor.email,
    role: actor.role,
    subtitle: profile.prcLicense ? `${role} · PRC ${profile.prcLicense}` : role,
  };
  const switcher = (
    <WorkplaceSwitcher
      currentId={current?.id ?? null}
      workplaces={workplaces.map((w) => ({ id: w.id, name: w.name, label: workplaceTypeLabel(w), color: w.color }))}
    />
  );

  return (
    <AppShell user={user} sidebarSlot={switcher}>
      {children}
    </AppShell>
  );
}
