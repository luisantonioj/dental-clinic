"use client";

import { Ban, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { PAYMENT_METHODS } from "@/db/schema";
import { centavosToInput, formatPeso } from "@/lib/format";
import { METHOD_LABELS } from "@/lib/validation/billing";
import { addPaymentAction, voidPaymentAction } from "./actions";

export type WorkplaceChoice = { id: string; name: string; type: "own" | "partner" };

export function AddPaymentDialog({
  patientId,
  balance,
  workplaces,
  defaultWorkplaceId,
  today,
}: {
  patientId: string;
  balance: number;
  workplaces: WorkplaceChoice[];
  defaultWorkplaceId: string | null;
  today: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [workplaceId, setWorkplaceId] = useState(defaultWorkplaceId ?? workplaces[0]?.id ?? "");
  const isPartner = workplaces.find((w) => w.id === workplaceId)?.type === "partner";
  const form = useFormAction(addPaymentAction, {
    onSuccess: ({ paymentId }) => {
      setOpen(false);
      toast.success("Payment recorded.", {
        action: { label: "Print receipt", onClick: () => router.push(`/receipts/${paymentId}`) },
      });
    },
  });
  const e = form.fieldErrors;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) form.reset();
      }}
    >
      <Button onClick={() => setOpen(true)} disabled={workplaces.length === 0}>
        <Wallet aria-hidden="true" /> Add payment
      </Button>
      <DialogContent>
        <form method="post" onSubmit={form.onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Add payment</DialogTitle>
            <DialogDescription>
              Current balance: <b className="tabular text-heading">{formatPeso(balance)}</b>
            </DialogDescription>
          </DialogHeader>
          <FormError message={form.error} />
          <input type="hidden" name="patientId" value={patientId} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount (₱)" htmlFor="pay-amount" error={e.amount}>
              <Input
                id="pay-amount"
                name="amount"
                inputMode="decimal"
                defaultValue={balance > 0 ? centavosToInput(balance) : ""}
                required
                autoFocus
              />
            </Field>
            <Field label="Date" htmlFor="pay-date" error={e.date}>
              <Input id="pay-date" name="date" type="date" defaultValue={today} required />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Method" htmlFor="pay-method" error={e.method}>
              <NativeSelect id="pay-method" name="method" defaultValue="cash">
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {METHOD_LABELS[m]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Reference no." htmlFor="pay-ref" error={e.reference} hint="GCash/Maya/bank ref, if any">
              <Input id="pay-ref" name="reference" />
            </Field>
          </div>
          <Field label="Workplace" htmlFor="pay-workplace" error={e.workplaceId}>
            <NativeSelect id="pay-workplace" name="workplaceId" value={workplaceId} onChange={(ev) => setWorkplaceId(ev.target.value)}>
              {workplaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          {isPartner ? (
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-sm font-medium">Who received the money?</legend>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="collectedBy" value="clinic" defaultChecked className="accent-primary" />
                The clinic&apos;s front desk (they pay you your share later)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="collectedBy" value="me" className="accent-primary" />
                I received it myself
              </label>
            </fieldset>
          ) : (
            <input type="hidden" name="collectedBy" value="me" />
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={form.disabled}>
              {form.pending ? "Saving…" : "Record payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function VoidPaymentButton({ paymentId, receiptNo }: { paymentId: string; receiptNo: string }) {
  const [open, setOpen] = useState(false);
  const form = useFormAction(voidPaymentAction, {
    successMessage: `${receiptNo} voided.`,
    onSuccess: () => setOpen(false),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="icon-sm" aria-label={`Void ${receiptNo}`} onClick={() => setOpen(true)}>
        <Ban aria-hidden="true" />
      </Button>
      <DialogContent>
        <form method="post" onSubmit={form.onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Void {receiptNo}?</DialogTitle>
            <DialogDescription>
              Use this for a mistaken entry. The payment stays in the history, marked void, and no longer counts.
            </DialogDescription>
          </DialogHeader>
          <FormError message={form.error} />
          <input type="hidden" name="paymentId" value={paymentId} />
          <Field label="Reason" htmlFor={`void-${paymentId}`} error={form.fieldErrors.reason}>
            <Input id={`void-${paymentId}`} name="reason" placeholder="e.g. Entered twice" required />
          </Field>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Keep it
              </Button>
            </DialogClose>
            <Button type="submit" variant="destructive" disabled={form.disabled}>
              Void payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
