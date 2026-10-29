"use client";

import { KeyRound, MoreHorizontal, Plus, UserCheck, UserX } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Field, useFormAction } from "@/components/app/form";
import { FormError } from "@/components/app/form-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { createDentistAction, resetPasswordAction, setDisabledAction } from "./actions";

export function NewDentistButton() {
  const [open, setOpen] = useState(false);
  const form = useFormAction(createDentistAction, {
    successMessage: "Account created. Share the email and temporary password with the dentist.",
    onSuccess: () => setOpen(false),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) form.reset();
      }}
    >
      <Button onClick={() => setOpen(true)} size="lg">
        <Plus aria-hidden="true" /> New dentist
      </Button>
      <DialogContent>
        <form onSubmit={form.onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>New dentist account</DialogTitle>
            <DialogDescription>They sign in with this email and temporary password.</DialogDescription>
          </DialogHeader>
          <FormError message={form.error} />
          <Field label="Full name" htmlFor="name" error={form.fieldErrors.name}>
            <Input id="name" name="name" placeholder="Dra. Maria Santos" required />
          </Field>
          <Field label="Email" htmlFor="email" error={form.fieldErrors.email}>
            <Input id="email" name="email" type="email" required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="PRC license no." htmlFor="prcLicense" error={form.fieldErrors.prcLicense}>
              <Input id="prcLicense" name="prcLicense" />
            </Field>
            <Field label="Phone" htmlFor="phone" error={form.fieldErrors.phone}>
              <Input id="phone" name="phone" type="tel" />
            </Field>
          </div>
          <Field
            label="Temporary password"
            htmlFor="password"
            error={form.fieldErrors.password}
            hint="At least 8 characters. They can change it in Settings."
          >
            <Input id="password" name="password" type="text" minLength={8} autoComplete="off" required />
          </Field>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={form.pending}>
              {form.pending ? "Creating…" : "Create account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AccountActions({ id, name, disabled }: { id: string; name: string; disabled: boolean }) {
  const [resetOpen, setResetOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const reset = useFormAction(resetPasswordAction, {
    successMessage: `Password changed for ${name}. They were signed out everywhere.`,
    onSuccess: () => setResetOpen(false),
  });

  function toggleDisabled() {
    startTransition(async () => {
      const result = await setDisabledAction(id, !disabled);
      if (result.ok) toast.success(disabled ? `${name} can sign in again.` : `${name} is disabled and signed out.`);
      else toast.error(result.error);
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Actions for ${name}`} disabled={pending}>
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setResetOpen(true)}>
            <KeyRound aria-hidden="true" /> Reset password
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={toggleDisabled} variant={disabled ? "default" : "destructive"}>
            {disabled ? <UserCheck aria-hidden="true" /> : <UserX aria-hidden="true" />}
            {disabled ? "Enable account" : "Disable account"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog
        open={resetOpen}
        onOpenChange={(o) => {
          setResetOpen(o);
          if (!o) reset.reset();
        }}
      >
        <DialogContent>
          <form onSubmit={reset.onSubmit} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Reset password</DialogTitle>
              <DialogDescription>Set a new temporary password for {name}. They will be signed out.</DialogDescription>
            </DialogHeader>
            <FormError message={reset.error} />
            <input type="hidden" name="userId" value={id} />
            <Field label="New password" htmlFor={`pw-${id}`} error={reset.fieldErrors.password}>
              <Input id={`pw-${id}`} name="password" type="text" minLength={8} autoComplete="off" required />
            </Field>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={reset.pending}>
                {reset.pending ? "Saving…" : "Set password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
