"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Field, useFormAction } from "@/components/app/form";
import { FormError } from "@/components/app/form-error";
import { SectionCard } from "@/components/app/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { CHART_CONDITIONS, type ChartCondition, SURFACES } from "@/db/schema";
import { type ChartEntryLite, chartState } from "@/lib/chart-state";
import { formatDate } from "@/lib/format";
import {
  ADULT_LOWER,
  ADULT_UPPER,
  CHILD_LOWER,
  CHILD_UPPER,
  CONDITION_COLORS,
  CONDITION_LABELS,
  SURFACE_LABELS,
  toothName,
  WHOLE_TOOTH,
} from "@/lib/teeth";
import { addChartEntryAction, removeChartEntryAction } from "./actions";
import { TOOTH_BOX, ToothSvg } from "./tooth-svg";

const GAP = 42;
const MIDLINE_GAP = 20;

function Arch({
  upper,
  lower,
  width,
  state,
  selected,
  onSelect,
  title,
}: {
  upper: number[];
  lower: number[];
  width: number;
  state: ReturnType<typeof chartState>;
  selected: number | null;
  onSelect: (t: number) => void;
  title: string;
}) {
  const half = upper.length / 2;
  const start = (width - (upper.length * GAP - (GAP - TOOTH_BOX) + MIDLINE_GAP)) / 2;
  const X = (i: number) => start + i * GAP + (i >= half ? MIDLINE_GAP : 0);
  const mid = start + half * GAP - (GAP - TOOTH_BOX) / 2 + MIDLINE_GAP / 2 - 1;

  return (
    <svg viewBox={`0 0 ${width} 214`} role="group" aria-label={title} className="block h-auto w-full min-w-[600px]">
      <text x={start} y={16} className="fill-muted-foreground text-[10.5px] font-semibold tracking-wider uppercase">
        Upper · patient&apos;s right
      </text>
      <text x={width - start} y={16} textAnchor="end" className="fill-muted-foreground text-[10.5px] font-semibold tracking-wider uppercase">
        patient&apos;s left
      </text>
      <line x1={mid} y1={26} x2={mid} y2={190} stroke="var(--border-strong)" strokeDasharray="3 4" />
      <line x1={start - 4} y1={107} x2={width - start + 4} y2={107} stroke="var(--border)" />
      {upper.map((t, i) => (
        <ToothSvg key={t} tooth={t} x={X(i)} y={46} labelY={36} state={state.get(t)} selected={selected === t} onSelect={onSelect} />
      ))}
      {lower.map((t, i) => (
        <ToothSvg key={t} tooth={t} x={X(i)} y={128} labelY={180} state={state.get(t)} selected={selected === t} onSelect={onSelect} />
      ))}
      <text x={start} y={206} className="fill-muted-foreground text-[10.5px] font-semibold tracking-wider uppercase">
        Lower
      </text>
    </svg>
  );
}

export function ToothChart({
  patientId,
  entries,
  today,
}: {
  patientId: string;
  entries: ChartEntryLite[];
  today: string;
}) {
  const state = useMemo(() => chartState(entries), [entries]);
  const [selected, setSelected] = useState<number | null>(null);
  const [showPrimary, setShowPrimary] = useState(() => entries.some((e) => e.tooth >= 50));

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <SectionCard
        title="Dental chart"
        description="FDI numbering · click a tooth to see or add findings"
        action={
          <label className="flex items-center gap-2 text-sm text-secondary-foreground">
            <Switch checked={showPrimary} onCheckedChange={setShowPrimary} aria-label="Show primary teeth" />
            Primary teeth
          </label>
        }
        bodyClassName="px-2 pt-3 pb-4"
      >
        <div className="overflow-x-auto px-2">
          <Arch upper={ADULT_UPPER} lower={ADULT_LOWER} width={720} state={state} selected={selected} onSelect={setSelected} title="Permanent teeth" />
          {showPrimary && (
            <div className="mt-2 border-t pt-2">
              <Arch upper={CHILD_UPPER} lower={CHILD_LOWER} width={720} state={state} selected={selected} onSelect={setSelected} title="Primary teeth" />
            </div>
          )}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 px-3 text-xs text-muted-foreground" aria-label="Legend">
          {(["caries", "filling", "crown", "rct", "missing", "extraction"] as ChartCondition[]).map((c) => (
            <li key={c} className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm border" style={{ background: CONDITION_COLORS[c] }} />
              {CONDITION_LABELS[c]}
            </li>
          ))}
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm border border-dashed border-muted-foreground" />
            Planned (faded / dashed)
          </li>
        </ul>
      </SectionCard>

      <SectionCard
        title={selected ? `Tooth ${selected}` : "Select a tooth"}
        description={selected ? toothName(selected) : "Click any tooth on the chart."}
        className="xl:sticky xl:top-20"
      >
        {selected ? (
          <ToothPanel
            key={selected}
            patientId={patientId}
            tooth={selected}
            entries={entries.filter((e) => e.tooth === selected)}
            today={today}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            {entries.length ? `${entries.length} findings on the chart.` : "No findings on the chart yet."}
          </p>
        )}
      </SectionCard>
    </div>
  );
}

function ToothPanel({
  patientId,
  tooth,
  entries,
  today,
}: {
  patientId: string;
  tooth: number;
  entries: ChartEntryLite[];
  today: string;
}) {
  const [condition, setCondition] = useState<ChartCondition>("caries");
  const [formKey, setFormKey] = useState(0);
  const [removing, startRemove] = useTransition();
  const form = useFormAction(addChartEntryAction, {
    successMessage: `Saved to tooth ${tooth}.`,
    onSuccess: () => setFormKey((k) => k + 1),
  });
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  function remove(id: string) {
    startRemove(async () => {
      const result = await removeChartEntryAction(id, patientId);
      if (result.ok) toast.success("Finding removed.");
      else toast.error(result.error);
    });
  }

  return (
    <div className="grid gap-5">
      {sorted.length > 0 ? (
        <ul className="grid gap-2">
          {sorted.map((e) => (
            <li key={e.id} className="flex items-start gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">
              <span className="mt-1 size-2.5 flex-none rounded-full" style={{ background: CONDITION_COLORS[e.condition] }} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 font-medium text-heading">
                  {CONDITION_LABELS[e.condition]}
                  {e.surfaces.length > 0 && <span className="text-muted-foreground">({e.surfaces.join("")})</span>}
                  {e.status !== "existing" && (
                    <Badge variant="secondary" className="capitalize">
                      {e.status}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(e.date)}
                  {e.notes && ` · ${e.notes}`}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Remove finding"
                disabled={removing}
                onClick={() => remove(e.id)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No findings for this tooth yet.</p>
      )}

      <form method="post" key={formKey} onSubmit={form.onSubmit} className="grid gap-3 border-t pt-4">
        <FormError message={form.error} />
        <input type="hidden" name="patientId" value={patientId} />
        <input type="hidden" name="tooth" value={tooth} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Finding" htmlFor="chart-condition" error={form.fieldErrors.condition}>
            <NativeSelect
              id="chart-condition"
              name="condition"
              value={condition}
              onChange={(e) => setCondition(e.target.value as ChartCondition)}
            >
              {CHART_CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {CONDITION_LABELS[c]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Status" htmlFor="chart-status">
            <NativeSelect id="chart-status" name="status" defaultValue="existing">
              <option value="existing">Existing</option>
              <option value="planned">Planned</option>
              <option value="done">Done today</option>
            </NativeSelect>
          </Field>
        </div>
        {!WHOLE_TOOTH.has(condition) && (
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">Surfaces</legend>
            <div className="flex flex-wrap gap-1.5">
              {SURFACES.map((s) => (
                <label key={s} title={SURFACE_LABELS[s]} className="cursor-pointer">
                  <input type="checkbox" name="surfaces" value={s} className="peer sr-only" />
                  <span className="grid size-9 place-items-center rounded-lg border text-sm font-semibold text-secondary-foreground peer-checked:border-primary peer-checked:bg-primary-soft peer-checked:text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring pointer-coarse:size-11">
                    {s}
                  </span>
                  <span className="sr-only">{SURFACE_LABELS[s]}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <div className="grid grid-cols-[140px_1fr] gap-3">
          <Field label="Date" htmlFor="chart-date" error={form.fieldErrors.date}>
            <Input id="chart-date" name="date" type="date" defaultValue={today} required />
          </Field>
          <Field label="Note" htmlFor="chart-notes" error={form.fieldErrors.notes}>
            <Input id="chart-notes" name="notes" placeholder="e.g. Class II, advised filling" />
          </Field>
        </div>
        <Button type="submit" disabled={form.disabled}>
          <Plus aria-hidden="true" /> {form.pending ? "Saving…" : "Save to chart"}
        </Button>
      </form>
    </div>
  );
}
