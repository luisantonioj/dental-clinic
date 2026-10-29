import {
  CalendarDays,
  LayoutDashboard,
  Package,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; short?: string; icon: LucideIcon };

export const mainNav: NavItem[] = [
  { href: "/", label: "Dashboard", short: "Home", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/appointments", label: "Appointments", short: "Calendar", icon: CalendarDays },
  { href: "/earnings", label: "Earnings", icon: Wallet },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/settings", label: "Settings", icon: SlidersHorizontal },
];

export const adminNav: NavItem[] = [{ href: "/admin/users", label: "Accounts", icon: ShieldCheck }];

/** Items in the phone bottom bar (the rest live in the drawer). */
export const bottomNav = mainNav.slice(0, 4);

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
