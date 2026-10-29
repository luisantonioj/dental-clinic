import { formatDateTime } from "@/lib/format";
import type { AuditEntry } from "@/server/data/audit";

const ENTITY_LABELS: Record<string, string> = {
  patient: "patient",
  treatment: "treatment",
  chart_entry: "chart finding",
  attachment: "file",
  appointment: "appointment",
  payment: "payment",
  payout: "payout",
  expense: "expense",
  inventory_item: "inventory item",
  stock_movement: "stock movement",
  workplace: "workplace",
  user: "account",
};

const ACTION_LABELS: Record<string, string> = {
  create: "added a",
  update: "updated a",
  archive: "archived a",
  restore: "restored a",
  delete: "removed a",
  disable: "disabled an",
  enable: "enabled an",
  "reset-password": "reset the password of an",
};

/** Plain-language audit trail (no clinical details are stored in it). */
export function ActivityList({ entries, showActor }: { entries: AuditEntry[]; showActor: boolean }) {
  if (entries.length === 0) return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  return (
    <ul className="-my-2 divide-y">
      {entries.map((e) => {
        const entity = ENTITY_LABELS[e.entity] ?? e.entity;
        const action = ACTION_LABELS[e.action] ?? `${e.action} a`;
        return (
          <li key={e.id} className="flex items-baseline justify-between gap-3 py-2 text-sm">
            <span className="min-w-0 truncate">
              {showActor ? <b className="font-medium text-heading">{e.actorName}</b> : "You"} {action} {entity}
            </span>
            <span className="tabular flex-none text-xs text-muted-foreground">{formatDateTime(e.at)}</span>
          </li>
        );
      })}
    </ul>
  );
}
