import { cn } from "@/lib/utils";

export function ToothIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M7 3C4.5 3 3 5 3 7.5c0 2 .8 3.4 1.5 5 .7 1.7.9 4 1.5 6.5.4 1.6 1 2 1.7 2 1 0 1.3-1.2 1.6-3 .3-1.8.7-3.5 2.7-3.5s2.4 1.7 2.7 3.5c.3 1.8.6 3 1.6 3 .7 0 1.3-.4 1.7-2 .6-2.5.8-4.8 1.5-6.5.7-1.6 1.5-3 1.5-5C21 5 19.5 3 17 3c-2 0-3 1-5 1S9 3 7 3z" />
    </svg>
  );
}

export function Brand({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "grid size-[34px] flex-none place-items-center rounded-[10px]",
          inverted ? "bg-white/15 text-white" : "bg-primary text-primary-foreground",
        )}
      >
        <ToothIcon className="size-5" />
      </span>
      <span className="flex flex-col leading-tight">
        <b className={cn("text-base tracking-tight", inverted ? "text-white" : "text-heading")}>DentalKeep</b>
        <small className={cn("text-xs", inverted ? "text-cyan-50/75" : "text-muted-foreground")}>Dental records</small>
      </span>
    </div>
  );
}
