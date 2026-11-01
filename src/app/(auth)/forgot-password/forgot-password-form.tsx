"use client";

import Link from "next/link";
import { useState } from "react";
import { useHydrated } from "@/components/app/form";
import { FormError } from "@/components/app/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const hydrated = useHydrated();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email"));
    setPending(true);
    setError(null);
    const { error } = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
    setPending(false);
    if (error) setError("Couldn't send the email. Try again in a minute.");
    else setSent(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight">Forgot password</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {sent
            ? "If that email has an account, a reset link is on its way. It expires in 1 hour."
            : "Enter your email and we'll send you a link to choose a new password."}
        </p>
      </div>
      {!sent && (
        <form method="post" onSubmit={onSubmit} className="flex flex-col gap-4">
          <FormError message={error} />
          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="username" required className="h-10" />
          </div>
          <Button type="submit" size="lg" className="h-10 w-full" disabled={pending || !hydrated}>
            {pending ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
      <Link href="/login" className="text-center text-sm font-medium text-primary hover:underline">
        Back to sign in
      </Link>
    </div>
  );
}
