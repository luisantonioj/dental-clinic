"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/utils";

const noopSubscribe = () => () => {};

/**
 * False in the server HTML and during hydration, true once React has taken
 * over the page. Submit buttons stay disabled until then, because a form
 * submitted before hydration would fall back to a native browser submit.
 */
export function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/**
 * Runs a server action from a form submit, tracking pending state and errors.
 * On success it shows `successMessage` (if any) and calls `onSuccess`.
 * Bind the submit button's `disabled` to `disabled`, which also covers the
 * moment before hydration.
 */
export function useFormAction<T>(
  action: (form: FormData) => Promise<ActionResult<T>>,
  opts: { successMessage?: string; onSuccess?: (data: T) => void } = {},
) {
  const [pending, startTransition] = useTransition();
  const hydrated = useHydrated();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await action(form);
      if (result.ok) {
        setError(null);
        setFieldErrors({});
        if (opts.successMessage) toast.success(opts.successMessage);
        opts.onSuccess?.(result.data);
      } else {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
      }
    });
  }

  function reset() {
    setError(null);
    setFieldErrors({});
  }

  return { onSubmit, pending, disabled: pending || !hydrated, error, fieldErrors, reset };
}

/** Label + control + error message. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: {
  label: React.ReactNode;
  htmlFor: string;
  error?: string;
  hint?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
