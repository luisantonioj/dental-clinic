"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { InitialsAvatar } from "@/components/app/initials-avatar";
import { Brand, ToothIcon } from "@/components/app/logo";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { adminNav, isActive, mainNav, type NavItem } from "./nav-items";
import { useShell } from "./shell-context";

/** Sidebar body, shared by the desktop sidebar and the phone drawer. */
export function SidebarContent({
  compact = false,
  onNavigate,
  slot,
}: {
  /** Icon-only layout used on tablets. */
  compact?: boolean;
  onNavigate?: () => void;
  /** Extra content under the brand (the workplace switcher). */
  slot?: React.ReactNode;
}) {
  const { user } = useShell();
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }

  const link = (item: NavItem) => {
    const active = isActive(pathname, item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        title={compact ? item.label : undefined}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-10 items-center gap-3 rounded-lg px-3 font-medium text-secondary-foreground transition-colors",
          "hover:bg-hover hover:text-heading",
          active && "bg-primary-soft text-primary hover:bg-primary-soft hover:text-primary",
          compact && "justify-center px-0",
        )}
      >
        <Icon className="size-[18px] flex-none" aria-hidden="true" />
        {!compact && <span>{item.label}</span>}
      </Link>
    );
  };

  return (
    <div className="flex h-full flex-col gap-1.5 px-3 py-4">
      {compact ? (
        <span className="mx-auto mb-3 grid size-[34px] place-items-center rounded-[10px] bg-primary text-primary-foreground">
          <ToothIcon className="size-5" />
        </span>
      ) : (
        <Brand className="px-2 pt-1 pb-3" />
      )}
      {!compact && slot}
      <nav aria-label="Main navigation" className="flex flex-1 flex-col gap-0.5">
        {mainNav.map(link)}
        {user.role === "admin" && (
          <>
            {!compact && (
              <div className="px-3 pt-4 pb-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Admin
              </div>
            )}
            {adminNav.map(link)}
          </>
        )}
      </nav>
      <div className={cn("mt-2 flex items-center gap-2.5 border-t pt-3", compact ? "flex-col" : "px-1")}>
        <InitialsAvatar name={user.name} />
        {!compact && (
          <div className="min-w-0 flex-1 leading-tight">
            <b className="block truncate text-[13px] font-semibold text-heading">{user.name}</b>
            <span className="block truncate text-xs text-muted-foreground">{user.subtitle}</span>
          </div>
        )}
        <button
          type="button"
          onClick={signOut}
          aria-label="Sign out"
          title="Sign out"
          className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-hover hover:text-heading"
        >
          <LogOut className="size-[18px]" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
