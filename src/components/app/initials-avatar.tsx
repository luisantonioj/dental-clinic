import { cn } from "@/lib/utils";

/** Stable hue (0–359) from a name, so each person keeps the same avatar colour. */
export function nameHue(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

export function initials(name: string): string {
  const parts = name
    .replace(/^(dra?\.?|dr\.?)\s+/i, "")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

const sizes = { sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-14 text-lg" } as const;

export function InitialsAvatar({
  name,
  size = "sm",
  className,
}: {
  name: string;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const hue = nameHue(name);
  return (
    <span
      aria-hidden="true"
      style={{ "--h": hue } as React.CSSProperties}
      className={cn(
        "grid flex-none place-items-center rounded-full font-semibold",
        "bg-[hsl(var(--h)_65%_92%)] text-[hsl(var(--h)_65%_32%)]",
        "dark:bg-[hsl(var(--h)_35%_30%)] dark:text-[hsl(var(--h)_35%_85%)]",
        sizes[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
