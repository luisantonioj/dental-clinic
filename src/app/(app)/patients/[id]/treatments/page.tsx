import { ClipboardList } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/app/page-header";
import { SectionCard } from "@/components/app/section-card";
import { WorkplaceTag } from "@/components/app/workplace-tag";
import { formatDate, formatPeso, todayManila } from "@/lib/format";
import { getCurrentWorkplace } from "@/server/current-workplace";
import { listTreatments } from "@/server/data/treatments";
import { loadPatient } from "../../load-patient";
import { TreatmentDialog } from "./treatment-dialog";

export const metadata: Metadata = { title: "Treatments" };

export default async function TreatmentsPage({ params }: PageProps<"/patients/[id]/treatments">) {
  const { id } = await params;
  const { actor, patient } = await loadPatient(id);
  const [rows, { current, workplaces }] = await Promise.all([listTreatments(actor, id), getCurrentWorkplace(actor)]);
  const options = workplaces.map((w) => ({ id: w.id, name: w.name }));
  const today = todayManila();
  const total = rows.reduce((sum, t) => sum + t.fee, 0);

  return (
    <SectionCard
      title="Treatment history"
      description={rows.length ? `${rows.length} treatment${rows.length === 1 ? "" : "s"} · ${formatPeso(total)} total fees` : undefined}
      action={
        <TreatmentDialog patientId={patient.id} workplaces={options} defaultWorkplaceId={current?.id ?? null} today={today} />
      }
      bodyClassName="p-0"
    >
      {workplaces.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Add a workplace in Settings first, so treatments can be tagged with where you did them."
          action={
            <Link href="/settings#workplaces" className="text-sm font-medium text-primary hover:underline">
              Go to Settings
            </Link>
          }
        />
      ) : rows.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No treatments recorded yet." />
      ) : (
        <ul className="divide-y">
          {rows.map((t) => (
            <li key={t.id} className="grid grid-cols-[1fr_auto] items-start gap-x-4 gap-y-1 px-5 py-3.5 sm:grid-cols-[110px_1fr_auto_auto]">
              <span className="tabular text-sm text-muted-foreground">{formatDate(t.date)}</span>
              <div className="col-span-2 min-w-0 sm:col-span-1">
                <div className="font-medium text-heading">
                  {t.procedure}
                  {t.teeth.length > 0 && (
                    <span className="tabular ml-2 text-sm font-normal text-muted-foreground">
                      Tooth {t.teeth.join(", ")}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <WorkplaceTag name={t.workplaceName} color={t.workplaceColor} />
                  {t.labFee > 0 && <span className="tabular">Lab fee {formatPeso(t.labFee)}</span>}
                  {t.notes && <span className="truncate">{t.notes}</span>}
                </div>
              </div>
              <span className="tabular row-start-1 text-right font-medium text-heading sm:row-auto">{formatPeso(t.fee)}</span>
              <span className="row-start-1 sm:row-auto">
                <TreatmentDialog
                  patientId={patient.id}
                  workplaces={options}
                  defaultWorkplaceId={current?.id ?? null}
                  today={today}
                  treatment={t}
                  trigger="icon"
                />
              </span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
