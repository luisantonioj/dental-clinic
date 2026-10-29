"use client";

import { Search } from "lucide-react";
import { useShell } from "@/components/app/shell/shell-context";

/** Big "find a patient" box on the dashboard; opens the Ctrl+K palette. */
export function DashboardSearch() {
  const { openSearch } = useShell();
  return (
    <button
      type="button"
      onClick={openSearch}
      className="mb-6 flex h-14 w-full items-center gap-3 rounded-xl border bg-card px-4 text-left text-muted-foreground shadow-card hover:border-border-strong"
    >
      <Search className="size-5 text-primary" aria-hidden="true" />
      <span className="flex-1 text-[15px]">Find a patient by name, phone or patient code</span>
      <kbd className="hidden rounded border bg-surface-2 px-1.5 py-0.5 text-xs sm:inline">Ctrl K</kbd>
    </button>
  );
}
