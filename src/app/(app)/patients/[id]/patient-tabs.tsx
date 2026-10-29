"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type PatientTab = { segment: string; label: string; count?: number };

export function PatientTabs({ patientId, tabs }: { patientId: string; tabs: PatientTab[] }) {
  const pathname = usePathname();
  const base = `/patients/${patientId}`;

  return (
    <nav aria-label="Patient sections" className="no-print -mx-4 mb-5 overflow-x-auto overflow-y-hidden border-b px-4 md:mx-0 md:px-0">
      <div className="flex min-w-max gap-1">
        {tabs.map((t) => {
          const href = t.segment ? `${base}/${t.segment}` : base;
          const active = t.segment ? pathname.startsWith(href) : pathname === base;
          return (
            <Link
              key={t.segment}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "-mb-px flex h-11 items-center gap-1.5 border-b-2 border-transparent px-3 text-sm font-medium text-muted-foreground hover:text-heading",
                active && "border-primary text-primary hover:text-primary",
              )}
            >
              {t.label}
              {t.count !== undefined && (
                <span className="tabular rounded-full bg-surface-2 px-1.5 text-xs text-muted-foreground">{t.count}</span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
