"use client";

import { Field, useFormAction } from "@/components/app/form";
import { FormError } from "@/components/app/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Profile } from "@/server/data/users";
import { updateProfileAction } from "./actions";

export function ProfileForm({ profile }: { profile: Profile }) {
  const form = useFormAction(updateProfileAction, { successMessage: "Profile saved." });

  return (
    <form method="post" onSubmit={form.onSubmit} className="grid gap-4">
      <FormError message={form.error} />
      <Field label="Full name" htmlFor="name" error={form.fieldErrors.name} hint="As you want it on receipts, e.g. Dra. Maria Santos">
        <Input id="name" name="name" defaultValue={profile.name} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="PRC license no." htmlFor="prcLicense" error={form.fieldErrors.prcLicense}>
          <Input id="prcLicense" name="prcLicense" defaultValue={profile.prcLicense ?? ""} />
        </Field>
        <Field label="Phone" htmlFor="phone" error={form.fieldErrors.phone}>
          <Input id="phone" name="phone" type="tel" defaultValue={profile.phone ?? ""} />
        </Field>
      </div>
      <Field
        label="Email reminders"
        htmlFor="reminderHours"
        error={form.fieldErrors.reminderHours}
        hint="How many hours before an appointment patients who opted in get an email."
      >
        <div className="flex items-center gap-2">
          <Input
            id="reminderHours"
            name="reminderHours"
            type="number"
            min={1}
            max={168}
            defaultValue={profile.reminderHours}
            className="w-24"
          />
          <span className="text-sm text-muted-foreground">hours before</span>
        </div>
      </Field>
      <p className="text-sm text-muted-foreground">
        Sign-in email: <span className="text-heading">{profile.email}</span>
      </p>
      <div>
        <Button type="submit" disabled={form.disabled}>
          {form.pending ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}
