"use client";

import { Menu, MoreHorizontal, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { InitialsAvatar } from "@/components/app/initials-avatar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { bottomNav, isActive } from "./nav-items";
import { SearchPalette } from "./search-palette";
import { ShellContext, type ShellUser } from "./shell-context";
import { SidebarContent } from "./sidebar-content";
import { ThemeToggle } from "./theme-toggle";

export function AppShell({
  user,
  sidebarSlot,
  children,
}: {
  user: ShellUser;
  /** Rendered under the brand in the sidebar (workplace switcher). */
  sidebarSlot?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const ctx = useMemo(() => ({ user, openSearch, openDrawer }), [user, openSearch, openDrawer]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <ShellContext value={ctx}>
      <div className="flex min-h-screen">
        {/* Tablet: icon-only sidebar. Desktop: full sidebar. Phone: drawer. */}
        <aside className="no-print sticky top-0 hidden h-screen w-[72px] flex-none border-r bg-card md:block lg:hidden">
          <SidebarContent compact />
        </aside>
        <aside className="no-print sticky top-0 hidden h-screen w-64 flex-none border-r bg-card lg:block">
          <SidebarContent slot={sidebarSlot} />
        </aside>
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent side="left" className="w-72 bg-card p-0" showCloseButton={false}>
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <SidebarContent slot={sidebarSlot} onNavigate={() => setDrawerOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md backdrop-saturate-150 md:px-7">
            <button
              type="button"
              onClick={openDrawer}
              aria-label="Open menu"
              className="grid size-10 place-items-center rounded-lg text-muted-foreground hover:bg-hover hover:text-heading md:hidden"
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={openSearch}
              aria-label="Search patients"
              className="flex h-10 max-w-[520px] flex-1 items-center gap-2.5 rounded-[10px] border bg-card px-3 text-left text-sm text-muted-foreground hover:border-border-strong dark:bg-surface-2"
            >
              <Search className="size-4 flex-none" aria-hidden="true" />
              <span className="flex-1 truncate">
                <span className="hidden sm:inline">Search patients by name, phone or patient code…</span>
                <span className="sm:hidden">Search patients…</span>
              </span>
              <kbd className="hidden rounded border bg-surface-2 px-1.5 py-0.5 font-sans text-[11px] font-medium sm:inline dark:bg-card">
                Ctrl K
              </kbd>
            </button>
            <div className="ml-auto flex items-center gap-1">
              <ThemeToggle />
              <Link href="/settings" aria-label="Account settings" className="ml-1 rounded-full">
                <InitialsAvatar name={user.name} />
              </Link>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 pt-6 pb-24 md:px-7 md:pt-7 md:pb-10">
            {children}
          </main>
        </div>

        <nav
          aria-label="Quick navigation"
          className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
        >
          {bottomNav.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground",
                  active && "text-primary",
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
                {item.short ?? item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={openDrawer}
            className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground"
          >
            <MoreHorizontal className="size-5" aria-hidden="true" />
            More
          </button>
        </nav>
      </div>
      <SearchPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </ShellContext>
  );
}
