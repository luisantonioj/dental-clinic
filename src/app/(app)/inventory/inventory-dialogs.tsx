"use client";

import { History, Minus, Pencil, Plus, ScanLine } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Field, useFormAction } from "@/components/app/form";
import { FormError } from "@/components/app/form-error";
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
import { NativeSelect } from "@/components/ui/native-select";
import { centavosToInput, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ITEM_CATEGORIES, UNITS } from "@/lib/validation/inventory";
import { addMovementAction, type MovementView, movementsAction, saveItemAction } from "./actions";

export type ItemView = {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  reorderLevel: number;
  unitCost: number | null;
  active: boolean;
  workplaceId: string;
  stock: number;
};

type Option = { id: string; name: string };

export function ItemDialog({
  item,
  workplaces,
  defaultWorkplaceId,
}: {
  item?: ItemView;
  workplaces: Option[];
  defaultWorkplaceId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const form = useFormAction(saveItemAction, {
    successMessage: item ? "Item saved." : "Item added.",
    onSuccess: () => setOpen(false),
  });
  const e = form.fieldErrors;
  const p = item?.id ?? "new-item";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) form.reset();
      }}
    >
      {item ? (
        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${item.name}`} onClick={() => setOpen(true)}>
          <Pencil aria-hidden="true" />
        </Button>
      ) : (
        <Button size="lg" onClick={() => setOpen(true)} disabled={workplaces.length === 0}>
          <Plus aria-hidden="true" /> Add item
        </Button>
      )}
      <DialogContent>
        <form onSubmit={form.onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{item ? "Edit item" : "Add item"}</DialogTitle>
            <DialogDescription>Stock is tracked separately for each workplace.</DialogDescription>
          </DialogHeader>
          <FormError message={form.error} />
          {item && <input type="hidden" name="id" value={item.id} />}
          <Field label="Name" htmlFor={`${p}-name`} error={e.name}>
            <Input id={`${p}-name`} name="name" defaultValue={item?.name} placeholder="e.g. Gloves (M), Lidocaine 2%" required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Workplace" htmlFor={`${p}-wp`} error={e.workplaceId}>
              <NativeSelect id={`${p}-wp`} name="workplaceId" defaultValue={item?.workplaceId ?? defaultWorkplaceId ?? ""}>
                {workplaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Category" htmlFor={`${p}-cat`} error={e.category}>
              <Input id={`${p}-cat`} name="category" list="item-categories" defaultValue={item?.category ?? ""} />
              <datalist id="item-categories">
                {ITEM_CATEGORIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Unit" htmlFor={`${p}-unit`} error={e.unit}>
              <Input id={`${p}-unit`} name="unit" list="item-units" defaultValue={item?.unit ?? "pc"} required />
              <datalist id="item-units">
                {UNITS.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </Field>
            <Field label="Reorder at" htmlFor={`${p}-reorder`} error={e.reorderLevel}>
              <Input id={`${p}-reorder`} name="reorderLevel" type="number" min={0} defaultValue={item?.reorderLevel ?? 1} />
            </Field>
            <Field label="Cost/unit (₱)" htmlFor={`${p}-cost`} error={e.unitCost}>
              <Input id={`${p}-cost`} name="unitCost" inputMode="decimal" defaultValue={item?.unitCost ? centavosToInput(item.unitCost) : ""} />
            </Field>
          </div>
          {!item && (
            <Field label="Opening stock" htmlFor={`${p}-opening`} hint="How many you have right now.">
              <Input id={`${p}-opening`} name="openingStock" type="number" min={0} defaultValue={0} className="w-32" />
            </Field>
          )}
          {item ? (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox name="active" defaultChecked={item.active} />
              Active (uncheck to hide an item you no longer stock)
            </label>
          ) : (
            <input type="hidden" name="active" value="on" />
          )}
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

const MOVE_COPY = {
  restock: { title: "Restock", verb: "Add", label: "Quantity received", icon: Plus },
  use: { title: "Record use", verb: "Use", label: "Quantity used", icon: Minus },
  count: { title: "Stock count", verb: "Count", label: "Quantity on the shelf now", icon: ScanLine },
} as const;

export function MovementDialog({ item, type, today }: { item: ItemView; type: keyof typeof MOVE_COPY; today: string }) {
  const [open, setOpen] = useState(false);
  const copy = MOVE_COPY[type];
  const form = useFormAction(addMovementAction, {
    onSuccess: ({ stock }) => {
      setOpen(false);
      toast.success(`${item.name}: ${stock} ${item.unit} in stock.`);
    },
  });
  const Icon = copy.icon;
  const p = `${item.id}-${type}`;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) form.reset();
      }}
    >
      <Button variant="ghost" size="icon-sm" aria-label={`${copy.title}: ${item.name}`} title={copy.title} onClick={() => setOpen(true)}>
        <Icon aria-hidden="true" />
      </Button>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={form.onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>
              {copy.title} · {item.name}
            </DialogTitle>
            <DialogDescription>
              Now in stock: {item.stock} {item.unit}
            </DialogDescription>
          </DialogHeader>
          <FormError message={form.error} />
          <input type="hidden" name="itemId" value={item.id} />
          <input type="hidden" name="type" value={type} />
          <div className="grid grid-cols-2 gap-3">
            <Field label={copy.label} htmlFor={`${p}-qty`} error={form.fieldErrors.qty}>
              <Input
                id={`${p}-qty`}
                name="qty"
                type="number"
                min={0}
                defaultValue={type === "count" ? item.stock : 1}
                required
                autoFocus
              />
            </Field>
            <Field label="Date" htmlFor={`${p}-date`} error={form.fieldErrors.date}>
              <Input id={`${p}-date`} name="date" type="date" defaultValue={today} required />
            </Field>
          </div>
          <Field label="Note" htmlFor={`${p}-reason`} error={form.fieldErrors.reason}>
            <Input id={`${p}-reason`} name="reason" placeholder={type === "restock" ? "e.g. Supplier, invoice no." : ""} />
          </Field>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={form.pending}>
              {copy.verb}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const TYPE_LABELS: Record<string, string> = { restock: "Restock", use: "Used", adjust: "Adjustment" };

export function HistoryDialog({ item }: { item: ItemView }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<MovementView[] | null>(null);

  async function show() {
    setRows(null);
    setOpen(true);
    setRows(await movementsAction(item.id));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="icon-sm" aria-label={`History: ${item.name}`} title="History" onClick={show}>
        <History aria-hidden="true" />
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
          <DialogDescription>
            Stock history · {item.stock} {item.unit} now
          </DialogDescription>
        </DialogHeader>
        {rows === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No stock movements yet.</p>
        ) : (
          <ul className="max-h-80 divide-y overflow-y-auto">
            {rows.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="tabular w-24 text-muted-foreground">{formatDate(m.date)}</span>
                <span className="min-w-0 flex-1 truncate">
                  {TYPE_LABELS[m.type] ?? m.type}
                  {m.reason && <span className="text-muted-foreground"> · {m.reason}</span>}
                </span>
                <span className={cn("tabular font-medium", m.qty > 0 ? "text-success" : "text-destructive")}>
                  {m.qty > 0 ? `+${m.qty}` : m.qty}
                </span>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
