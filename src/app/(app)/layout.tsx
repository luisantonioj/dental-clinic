import { AppShell } from "@/components/app/shell/app-shell";
import { requireUser } from "@/server/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireUser();
  const user = {
    id: actor.id,
    name: actor.name,
    email: actor.email,
    role: actor.role,
    subtitle: actor.role === "admin" ? "Administrator" : "Dentist",
  };
  return <AppShell user={user}>{children}</AppShell>;
}
