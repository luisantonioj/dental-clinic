"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Field, useFormAction } from "@/components/app/form";
import { FormError } from "@/components/app/form-error";
import { SectionCard } from "@/components/app/section-card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";
import type { Patient } from "@/server/data/patients";

export function PatientForm({
  patient,
  action,
  cancelHref,
}: {
  patient?: Patient;
  action: (form: FormData) => Promise<ActionResult>;
  cancelHref: string;
}) {
  const form = useFormAction(action);
  const e = form.fieldErrors;
  const v = (key: keyof Patient) => (patient?.[key] as string | null | undefined) ?? "";

  return (
    <form method="post" onSubmit={form.onSubmit} className="grid gap-6" noValidate>
      <FormError message={form.error} />
      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Personal information">
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="First name" htmlFor="firstName" error={e.firstName}>
                <Input id="firstName" name="firstName" defaultValue={v("firstName")} required autoFocus={!patient} />
              </Field>
              <Field label="Middle name" htmlFor="middleName" error={e.middleName}>
                <Input id="middleName" name="middleName" defaultValue={v("middleName")} />
              </Field>
              <Field label="Last name" htmlFor="lastName" error={e.lastName}>
                <Input id="lastName" name="lastName" defaultValue={v("lastName")} required />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Birthdate" htmlFor="birthdate" error={e.birthdate}>
                <Input id="birthdate" name="birthdate" type="date" defaultValue={v("birthdate")} />
              </Field>
              <Field label="Sex" htmlFor="sex" error={e.sex}>
                <NativeSelect id="sex" name="sex" defaultValue={v("sex")}>
                  <option value="">—</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </NativeSelect>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Mobile" htmlFor="phone" error={e.phone}>
                <Input id="phone" name="phone" type="tel" defaultValue={v("phone")} placeholder="0917 555 0100" />
              </Field>
              <Field label="Email" htmlFor="email" error={e.email} hint="Needed for appointment reminders.">
                <Input id="email" name="email" type="email" defaultValue={v("email")} />
              </Field>
            </div>
            <Field label="Address" htmlFor="address" error={e.address}>
              <Input id="address" name="address" defaultValue={v("address")} />
            </Field>
            <Field label="Occupation" htmlFor="occupation" error={e.occupation}>
              <Input id="occupation" name="occupation" defaultValue={v("occupation")} />
            </Field>
            <fieldset className="grid gap-4 sm:grid-cols-3">
              <legend className="mb-2 text-sm font-medium sm:col-span-3">Emergency contact</legend>
              <Field label="Name" htmlFor="emergencyName" error={e.emergencyName}>
                <Input id="emergencyName" name="emergencyName" defaultValue={v("emergencyName")} />
              </Field>
              <Field label="Relationship" htmlFor="emergencyRelation" error={e.emergencyRelation}>
                <Input id="emergencyRelation" name="emergencyRelation" defaultValue={v("emergencyRelation")} />
              </Field>
              <Field label="Phone" htmlFor="emergencyPhone" error={e.emergencyPhone}>
                <Input id="emergencyPhone" name="emergencyPhone" type="tel" defaultValue={v("emergencyPhone")} />
              </Field>
            </fieldset>
          </div>
        </SectionCard>

        <div className="grid content-start gap-6">
          <SectionCard title="Medical history" description="Allergies and conditions show as an alert on the patient page.">
            <div className="grid gap-4">
              <Field label="Allergies" htmlFor="allergies" error={e.allergies}>
                <Textarea id="allergies" name="allergies" defaultValue={v("allergies")} placeholder="e.g. Penicillin, latex" rows={2} />
              </Field>
              <Field label="Medical conditions" htmlFor="medicalConditions" error={e.medicalConditions}>
                <Textarea
                  id="medicalConditions"
                  name="medicalConditions"
                  defaultValue={v("medicalConditions")}
                  placeholder="e.g. Hypertension, diabetes, pregnancy"
                  rows={2}
                />
              </Field>
              <Field label="Current medications" htmlFor="medications" error={e.medications}>
                <Textarea id="medications" name="medications" defaultValue={v("medications")} rows={2} />
              </Field>
              <Field label="Notes" htmlFor="notes" error={e.notes}>
                <Textarea id="notes" name="notes" defaultValue={v("notes")} rows={3} />
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="Privacy & reminders">
            <div className="grid gap-4">
              <label className="flex items-start gap-3 text-sm">
                <Checkbox name="consent" defaultChecked={patient ? Boolean(patient.consentAt) : false} className="mt-0.5" />
                <span>
                  <b className="font-medium text-heading">Patient agreed to the privacy notice</b>
                  <span className="block text-muted-foreground">
                    Consent to collect and process their personal and health information (Data Privacy Act of 2012).
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 text-sm">
                <Checkbox name="remindersOptIn" defaultChecked={patient?.remindersOptIn ?? false} className="mt-0.5" />
                <span>
                  <b className="font-medium text-heading">Send appointment reminders by email</b>
                  <span className="block text-muted-foreground">Reminders never include clinical details.</span>
                </span>
              </label>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
                Only you can see this patient&apos;s records.
              </p>
            </div>
          </SectionCard>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href={cancelHref}>Cancel</Link>
        </Button>
        <Button type="submit" size="lg" disabled={form.disabled}>
          {form.pending ? "Saving…" : patient ? "Save changes" : "Add patient"}
        </Button>
      </div>
    </form>
  );
}
