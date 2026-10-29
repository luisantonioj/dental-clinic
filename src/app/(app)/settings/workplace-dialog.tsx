"use client";

import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { Field, useFormAction } from "@/components/app/form";
import { FormError } from "@/components/app/form-error";
import { workplaceColorVar } from "@/components/app/workplace-tag";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { WORKPLACE_COLORS, type WorkplaceType } from "@/db/schema";
import { cn } from "@/lib/utils";
import type { Workplace } from "@/server/data/workplaces";
import { saveWorkplaceAction } from "./actions";

export function WorkplaceDialog({ workplace }: { workplace?: Workplace }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<WorkplaceType>(workplace?.type ?? "own");
  const form = useFormAction(saveWorkplaceAction, {
    successMessage: workplace ? "Workplace saved." : "Workplace added.",
    onSuccess: () => setOpen(false),
  });
  const p = workplace?.id ?? "new";

  function openDialog() {
    setType(workplace?.type ?? "own");
    setOpen(true);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) form.reset();
      }}
    >
      {workplace ? (
        <Button variant="ghost" size="icon" aria-label={`Edit ${workplace.name}`} onClick={openDialog}>
          <Pencil aria-hidden="true" />
        </Button>
      ) : (
        <Button variant="outline" onClick={openDialog}>
          <Plus aria-hidden="true" /> Add
        </Button>
      )}
      <DialogContent>
        <form onSubmit={form.onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{workplace ? "Edit workplace" : "Add workplace"}</DialogTitle>
            <DialogDescription>Appointments, treatments, payments and stock are tagged with a workplace.</DialogDescription>
          </DialogHeader>
          <FormError message={form.error} />
          {workplace && <input type="hidden" name="id" value={workplace.id} />}
          <Field label="Clinic name" htmlFor={`${p}-name`} error={form.fieldErrors.name}>
            <Input id={`${p}-name`} name="name" defaultValue={workplace?.name} required />
          </Field>

          <fieldset className="grid gap-2">
            <legend className="mb-1.5 text-sm font-medium">Type</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["own", "My own clinic", "You keep 100%"],
                  ["partner", "Partner clinic", "The clinic pays you a share"],
                ] as const
              ).map(([value, label, hint]) => (
                <label
                  key={value}
                  className={cn(
                    "flex cursor-pointer flex-col rounded-lg border px-3 py-2.5 text-sm",
                    type === value && "border-primary bg-primary-soft",
                  )}
                >
                  <span className="flex items-center gap-2 font-medium text-heading">
                    <input
                      type="radio"
                      name="type"
                      value={value}
                      checked={type === value}
                      onChange={() => setType(value)}
                      className="accent-primary"
                    />
                    {label}
                  </span>
                  <span className="pl-5 text-xs text-muted-foreground">{hint}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {type === "partner" && (
            <div className="grid gap-3 rounded-lg bg-surface-2 p-3">
              <Field
                label="Your share"
                htmlFor={`${p}-pct`}
                error={form.fieldErrors.commissionPct}
                hint="The percentage of collected fees that is yours."
              >
                <div className="flex items-center gap-2">
                  <Input
                    id={`${p}-pct`}
                    name="commissionPct"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={workplace?.type === "partner" ? workplace.commissionPct : 40}
                    className="w-24"
                    required
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </Field>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox name="deductLabFees" defaultChecked={workplace?.deductLabFees ?? true} className="mt-0.5" />
                <span>
                  Deduct lab fees before the split
                  <span className="block text-xs text-muted-foreground">
                    e.g. ₱10,000 fee with ₱2,000 lab fee → your 40% is of ₱8,000.
                  </span>
                </span>
              </label>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Address" htmlFor={`${p}-address`} error={form.fieldErrors.address}>
              <Input id={`${p}-address`} name="address" defaultValue={workplace?.address ?? ""} />
            </Field>
            <Field label="Phone" htmlFor={`${p}-phone`} error={form.fieldErrors.phone}>
              <Input id={`${p}-phone`} name="phone" type="tel" defaultValue={workplace?.phone ?? ""} />
            </Field>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">Colour</legend>
            <div className="flex flex-wrap gap-2">
              {WORKPLACE_COLORS.map((c) => (
                <label key={c} className="cursor-pointer" title={c}>
                  <input
                    type="radio"
                    name="color"
                    value={c}
                    defaultChecked={(workplace?.color ?? "indigo") === c}
                    className="peer sr-only"
                  />
                  <span
                    style={workplaceColorVar(c)}
                    className="block size-7 rounded-full bg-(--c) ring-offset-2 ring-offset-card peer-checked:ring-2 peer-checked:ring-(--c) peer-focus-visible:ring-2 peer-focus-visible:ring-ring"
                  />
                  <span className="sr-only">{c}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {workplace && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox name="active" defaultChecked={workplace.active} />
              Active (uncheck if you no longer work here; history is kept)
            </label>
          )}
          {!workplace && <input type="hidden" name="active" value="on" />}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={form.pending}>
              {form.pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
