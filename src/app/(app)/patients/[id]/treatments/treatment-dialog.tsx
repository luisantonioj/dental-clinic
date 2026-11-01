"use client";

import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { centavosToInput } from "@/lib/format";
import { COMMON_PROCEDURES } from "@/lib/teeth";
import type { Treatment } from "@/server/data/treatments";
import { saveTreatmentAction } from "./actions";

export type WorkplaceOption = { id: string; name: string };

export function TreatmentDialog({
  patientId,
  workplaces,
  defaultWorkplaceId,
  today,
  treatment,
  defaultTeeth,
  trigger,
}: {
  patientId: string;
  workplaces: WorkplaceOption[];
  defaultWorkplaceId: string | null;
  today: string;
  treatment?: Treatment;
  defaultTeeth?: string;
  trigger?: "button" | "icon";
}) {
  const [open, setOpen] = useState(false);
  const form = useFormAction(saveTreatmentAction, {
    successMessage: treatment ? "Treatment updated." : "Treatment added.",
    onSuccess: () => setOpen(false),
  });
  const p = treatment?.id ?? "new";
  const e = form.fieldErrors;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) form.reset();
      }}
    >
      {trigger === "icon" ? (
        <Button variant="ghost" size="icon" aria-label="Edit treatment" onClick={() => setOpen(true)}>
          <Pencil aria-hidden="true" />
        </Button>
      ) : (
        <Button onClick={() => setOpen(true)} disabled={workplaces.length === 0}>
          <Plus aria-hidden="true" /> Add treatment
        </Button>
      )}
      <DialogContent className="sm:max-w-lg">
        <form method="post" onSubmit={form.onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{treatment ? "Edit treatment" : "Add treatment"}</DialogTitle>
            <DialogDescription>The fee adds to the patient&apos;s balance.</DialogDescription>
          </DialogHeader>
          <FormError message={form.error} />
          <input type="hidden" name="patientId" value={patientId} />
          {treatment && <input type="hidden" name="id" value={treatment.id} />}
          <Field label="Procedure" htmlFor={`${p}-procedure`} error={e.procedure}>
            <Input
              id={`${p}-procedure`}
              name="procedure"
              list="procedure-options"
              defaultValue={treatment?.procedure}
              autoComplete="off"
              required
            />
            <datalist id="procedure-options">
              {COMMON_PROCEDURES.map((proc) => (
                <option key={proc} value={proc} />
              ))}
            </datalist>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date" htmlFor={`${p}-date`} error={e.date}>
              <Input id={`${p}-date`} name="date" type="date" defaultValue={treatment?.date ?? today} required />
            </Field>
            <Field label="Teeth" htmlFor={`${p}-teeth`} error={e.teeth} hint="FDI numbers, e.g. 16, 26. Blank for whole mouth.">
              <Input
                id={`${p}-teeth`}
                name="teeth"
                defaultValue={treatment ? treatment.teeth.join(", ") : (defaultTeeth ?? "")}
                inputMode="numeric"
              />
            </Field>
          </div>
          <Field label="Workplace" htmlFor={`${p}-workplace`} error={e.workplaceId}>
            <NativeSelect
              id={`${p}-workplace`}
              name="workplaceId"
              defaultValue={treatment?.workplaceId ?? defaultWorkplaceId ?? ""}
              required
            >
              {workplaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fee (₱)" htmlFor={`${p}-fee`} error={e.fee}>
              <Input
                id={`${p}-fee`}
                name="fee"
                inputMode="decimal"
                defaultValue={treatment ? centavosToInput(treatment.fee) : ""}
                placeholder="0.00"
                required
              />
            </Field>
            <Field label="Lab fee (₱)" htmlFor={`${p}-lab`} error={e.labFee} hint="Crowns, dentures, etc.">
              <Input
                id={`${p}-lab`}
                name="labFee"
                inputMode="decimal"
                defaultValue={treatment?.labFee ? centavosToInput(treatment.labFee) : ""}
                placeholder="0.00"
              />
            </Field>
          </div>
          <Field label="Notes" htmlFor={`${p}-notes`} error={e.notes}>
            <Textarea id={`${p}-notes`} name="notes" defaultValue={treatment?.notes ?? ""} rows={2} />
          </Field>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={form.disabled}>
              {form.pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
