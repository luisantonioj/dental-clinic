"use client";

import { Check, ChevronDown, Plus } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { selectWorkplaceAction } from "@/app/(app)/actions";
import { WorkplaceDot } from "@/components/app/workplace-tag";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { WorkplaceColor } from "@/db/schema";

export type SwitcherWorkplace = { id: string; name: string; label: string; color: WorkplaceColor };

export function WorkplaceSwitcher({
  workplaces,
  currentId,
}: {
  workplaces: SwitcherWorkplace[];
  currentId: string | null;
}) {
  const [, startTransition] = useTransition();
  const [optimisticId, setOptimisticId] = useOptimistic(currentId);
  const current = workplaces.find((w) => w.id === optimisticId);

  if (!current) {
    return (
      <Link
        href="/settings#workplaces"
        className="mb-2 flex items-center gap-2 rounded-[10px] border border-dashed px-3 py-2.5 text-sm font-medium text-primary hover:bg-hover"
      >
        <Plus className="size-4" aria-hidden="true" /> Add your workplace
      </Link>
    );
  }

  function select(id: string) {
    startTransition(async () => {
      setOptimisticId(id);
      const result = await selectWorkplaceAction(id);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        title="Switch workplace"
        className="mb-2 flex w-full items-center gap-2.5 rounded-[10px] border bg-surface-2 px-2.5 py-2 text-left hover:border-border-strong"
      >
        <WorkplaceDot color={current.color} />
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <small className="text-[11px] text-muted-foreground">Working at</small>
          <b className="truncate text-[13px] font-semibold text-heading">{current.name}</b>
        </span>
        <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        {workplaces.map((w) => (
          <DropdownMenuItem key={w.id} onSelect={() => select(w.id)} className="gap-2.5 py-2">
            <WorkplaceDot color={w.color} />
            <span className="flex min-w-0 flex-1 flex-col leading-tight">
              <b className="truncate text-[13px] font-semibold">{w.name}</b>
              <small className="text-xs text-muted-foreground">{w.label}</small>
            </span>
            {w.id === current.id && <Check className="text-primary" aria-hidden="true" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings#workplaces">
            <Plus aria-hidden="true" /> Manage workplaces
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
