"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useHydrated } from "@/components/app/form";
import { FormError } from "@/components/app/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function ResetPasswordForm({ token, invalid }: { token: string | null; invalid: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(
    invalid || !token ? "This reset link is invalid or has expired. Request a new one." : null,
  );
  const [pending, setPending] = useState(false);
  const hydrated = useHydrated();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const newPassword = String(form.get("password"));
    if (newPassword !== String(form.get("confirm"))) {
      setError("The passwords don't match.");
      return;
    }
    if (!token) return;
    setPending(true);
    const { error } = await authClient.resetPassword({ newPassword, token });
    setPending(false);
    if (error) setError(error.message ?? "Couldn't reset the password.");
    else router.replace("/login");
  }

  return (
    <form method="post" onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight">Choose a new password</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">At least 8 characters.</p>
      </div>
      <FormError message={error} />
      <div className="grid gap-1.5">
        <Label htmlFor="password">New password</Label>
        <Input id="password" name="password" type="password" minLength={8} autoComplete="new-password" required className="h-10" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input id="confirm" name="confirm" type="password" minLength={8} autoComplete="new-password" required className="h-10" />
      </div>
      <Button type="submit" size="lg" className="h-10 w-full" disabled={pending || !hydrated || !token}>
        {pending ? "Saving…" : "Save password"}
      </Button>
      <Link href="/forgot-password" className="text-center text-sm font-medium text-primary hover:underline">
        Request a new link
      </Link>
    </form>
  );
}
