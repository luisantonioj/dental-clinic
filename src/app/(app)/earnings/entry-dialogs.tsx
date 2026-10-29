"use client";

import { Plus, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { EXPENSE_CATEGORIES } from "@/db/schema";
import { EXPENSE_LABELS } from "@/lib/validation/earnings";
import { addExpenseAction, addPayoutAction, voidEntryAction } from "./actions";

type Option = { id: string; name: string };

function EntryDialog({
  kind,
  workplaces,
  defaultWorkplaceId,
  today,
  periodStart,
  periodEnd,
}: {
  kind: "payout" | "expense";
  workplaces: Option[];
  defaultWorkplaceId: string | null;
  today: string;
  periodStart?: string;
  periodEnd?: string;
}) {
  const [open, setOpen] = useState(false);
  const form = useFormAction(kind === "payout" ? addPayoutAction : addExpenseAction, {
    successMessage: kind === "payout" ? "Payout recorded." : "Expense recorded.",
    onSuccess: () => setOpen(false),
  });
  const e = form.fieldErrors;
  const p = `${kind}-new`;
  const defaultId = workplaces.some((w) => w.id === defaultWorkplaceId) ? defaultWorkplaceId! : (workplaces[0]?.id ?? "");

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) form.reset();
      }}
    >
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} disabled={workplaces.length === 0}>
        <Plus aria-hidden="true" /> {kind === "payout" ? "Record payout" : "Add expense"}
      </Button>
      <DialogContent>
        <form onSubmit={form.onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{kind === "payout" ? "Record payout" : "Add expense"}</DialogTitle>
            <DialogDescription>
              {kind === "payout"
                ? "Money a partner clinic paid you for your share."
                : "Supplies, lab, rent or other costs for a workplace."}
            </DialogDescription>
          </DialogHeader>
          <FormError message={form.error} />
          <Field label="Workplace" htmlFor={`${p}-wp`} error={e.workplaceId}>
            <NativeSelect id={`${p}-wp`} name="workplaceId" defaultValue={defaultId}>
              {workplaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount (₱)" htmlFor={`${p}-amount`} error={e.amount}>
              <Input id={`${p}-amount`} name="amount" inputMode="decimal" required />
            </Field>
            <Field label={kind === "payout" ? "Date received" : "Date"} htmlFor={`${p}-date`} error={e.date}>
              <Input id={`${p}-date`} name="date" type="date" defaultValue={today} required />
            </Field>
          </div>
          {kind === "payout" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Covers from" htmlFor={`${p}-from`} error={e.periodStart}>
                <Input id={`${p}-from`} name="periodStart" type="date" defaultValue={periodStart} />
              </Field>
              <Field label="to" htmlFor={`${p}-to`} error={e.periodEnd}>
                <Input id={`${p}-to`} name="periodEnd" type="date" defaultValue={periodEnd} />
              </Field>
            </div>
          ) : (
            <Field label="Category" htmlFor={`${p}-cat`} error={e.category}>
              <NativeSelect id={`${p}-cat`} name="category" defaultValue="supplies">
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {EXPENSE_LABELS[c]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          )}
          <Field label="Note" htmlFor={`${p}-notes`} error={e.notes}>
            <Input id={`${p}-notes`} name="notes" />
          </Field>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={form.pending}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PayoutDialog(props: Omit<Parameters<typeof EntryDialog>[0], "kind">) {
  return <EntryDialog kind="payout" {...props} />;
}

export function ExpenseDialog(props: Omit<Parameters<typeof EntryDialog>[0], "kind">) {
  return <EntryDialog kind="expense" {...props} />;
}

export function VoidEntryButton({ kind, id, label }: { kind: "payout" | "expense"; id: string; label: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Remove ${label}`}
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Remove this ${kind}? It's kept in the history as void.`)) return;
        startTransition(async () => {
          const result = await voidEntryAction(kind, id);
          if (result.ok) toast.success("Removed.");
          else toast.error(result.error);
        });
      }}
    >
      <Trash2 aria-hidden="true" />
    </Button>
  );
}
