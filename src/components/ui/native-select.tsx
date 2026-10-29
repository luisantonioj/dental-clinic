import { ChevronDown } from "lucide-react";
import { cn } from "cn";

/** A styled native <select>: works with FormData and mobile pickers. */
function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        data-slot="native-select"
        className={cn(
          "h-9 w-full appearance-none rounded-lg border border-input bg-card py-1 pr-8 pl-2.5 text-base outline-none pointer-coarse:h-11 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50",
          "aria-invalid:border-destructive dark:bg-surface-2",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}

export { NativeSelect };
