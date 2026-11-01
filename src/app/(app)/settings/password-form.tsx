"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Field, useHydrated } from "@/components/app/form";
import { FormError } from "@/components/app/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

export function PasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const hydrated = useHydrated();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const newPassword = String(form.get("newPassword"));
    if (newPassword !== String(form.get("confirm"))) {
      setError("The new passwords don't match.");
      return;
    }
    setPending(true);
    setError(null);
    const { error } = await authClient.changePassword({
      currentPassword: String(form.get("currentPassword")),
      newPassword,
      revokeOtherSessions: true,
    });
    setPending(false);
    if (error) {
      setError(error.code === "INVALID_PASSWORD" ? "Your current password is wrong." : (error.message ?? "Couldn't change the password."));
      return;
    }
    formEl.reset();
    toast.success("Password changed.");
  }

  return (
    <form method="post" onSubmit={onSubmit} className="grid gap-4">
      <FormError message={error} />
      <Field label="Current password" htmlFor="currentPassword">
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="New password" htmlFor="newPassword" hint="At least 8 characters.">
          <Input id="newPassword" name="newPassword" type="password" minLength={8} autoComplete="new-password" required />
        </Field>
        <Field label="Confirm new password" htmlFor="confirm">
          <Input id="confirm" name="confirm" type="password" minLength={8} autoComplete="new-password" required />
        </Field>
      </div>
      <div>
        <Button type="submit" disabled={pending || !hydrated}>
          {pending ? "Saving…" : "Change password"}
        </Button>
      </div>
    </form>
  );
}
