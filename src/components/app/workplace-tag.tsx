import type { WorkplaceColor } from "@/db/schema";
import { cn } from "@/lib/utils";

export function workplaceColorVar(color: WorkplaceColor): React.CSSProperties {
  return { "--c": `var(--wp-${color})` } as React.CSSProperties;
}

export function WorkplaceDot({ color, className }: { color: WorkplaceColor; className?: string }) {
  return (
    <span
      aria-hidden="true"
      style={workplaceColorVar(color)}
      className={cn(
        "inline-block size-2.5 flex-none rounded-full bg-(--c) shadow-[0_0_0_3px_color-mix(in_srgb,var(--c)_22%,transparent)]",
        className,
      )}
    />
  );
}

/** Small pill: coloured dot + workplace name. */
export function WorkplaceTag({ name, color, className }: { name: string; color: WorkplaceColor; className?: string }) {
  return (
    <span
      style={workplaceColorVar(color)}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--c)_13%,transparent)] px-2 py-0.5 text-xs font-medium text-(--c)",
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 flex-none rounded-full bg-(--c)" />
      <span className="truncate">{name}</span>
    </span>
  );
}

export function workplaceTypeLabel(w: { type: "own" | "partner"; commissionPct: number }): string {
  return w.type === "own" ? "Own clinic · 100%" : `Partner clinic · ${w.commissionPct}% share`;
}
