import { ChevronLeft, ChevronRight, ChevronRightIcon, Search, TriangleAlert, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { InitialsAvatar } from "@/components/app/initials-avatar";
import { EmptyState, PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { ageOn, todayManila } from "@/lib/format";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/auth";
import { fullName, listPatients } from "@/server/data/patients";
import { PatientSearchInput } from "./patient-search-input";

export const metadata: Metadata = { title: "Patients" };

export default async function PatientsPage({ searchParams }: PageProps<"/patients">) {
  const actor = await requireUser();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const archived = sp.archived === "1";
  const page = Number(typeof sp.page === "string" ? sp.page : 1) || 1;
  const { rows, total, pageCount } = await listPatients(actor, { q, page, archived });
  const today = todayManila();

  const href = (params: Record<string, string | number | undefined>) => {
    const u = new URLSearchParams();
    const merged = { q: q || undefined, archived: archived ? "1" : undefined, page: undefined, ...params };
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "") u.set(k, String(v));
    const s = u.toString();
    return s ? `/patients?${s}` : "/patients";
  };

  return (
    <>
      <PageHeader
        title="Patients"
        description={`${total} ${archived ? "archived" : ""} patient${total === 1 ? "" : "s"} · private to your account`}
        actions={
          <Button size="lg" asChild>
            <Link href="/patients/new">
              <UserPlus aria-hidden="true" /> New patient
            </Link>
          </Button>
        }
      />
      <section className="rounded-xl border bg-card shadow-card">
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <PatientSearchInput defaultValue={q} />
          <div className="flex gap-1 rounded-lg bg-surface-2 p-1 text-sm">
            <Link
              href={href({ archived: undefined })}
              className={cn("rounded-md px-3 py-1.5 font-medium text-muted-foreground", !archived && "bg-card text-heading shadow-sm")}
            >
              Active
            </Link>
            <Link
              href={href({ archived: "1" })}
              className={cn("rounded-md px-3 py-1.5 font-medium text-muted-foreground", archived && "bg-card text-heading shadow-sm")}
            >
              Archived
            </Link>
          </div>
        </div>

        {rows.length === 0 ? (
          q ? (
            <EmptyState
              icon={Search}
              title={`No patients match “${q}”.`}
              action={
                <Button variant="outline" size="sm" asChild>
                  <Link href="/patients/new">
                    <UserPlus aria-hidden="true" /> Add new patient
                  </Link>
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={UserPlus}
              title={archived ? "No archived patients." : "No patients yet. Add your first patient to get started."}
              action={
                archived ? undefined : (
                  <Button size="sm" asChild>
                    <Link href="/patients/new">Add patient</Link>
                  </Button>
                )
              }
            />
          )
        ) : (
          <ul className="divide-y">
            <li className="hidden grid-cols-[minmax(0,2.2fr)_1fr_1.2fr_24px] gap-4 bg-surface-2 px-5 py-2.5 text-xs font-medium text-muted-foreground md:grid">
              <span>Patient</span>
              <span>Age · Sex</span>
              <span>Mobile</span>
              <span />
            </li>
            {rows.map((p) => {
              const name = fullName(p);
              const age = p.birthdate ? ageOn(p.birthdate, today) : null;
              const ageSex = [age !== null ? `${age}` : null, p.sex ? (p.sex === "female" ? "F" : "M") : null]
                .filter(Boolean)
                .join(" · ");
              return (
                <li key={p.id}>
                  <Link
                    href={`/patients/${p.id}`}
                    className="grid grid-cols-[minmax(0,1fr)_24px] items-center gap-4 px-5 py-3 hover:bg-hover md:grid-cols-[minmax(0,2.2fr)_1fr_1.2fr_24px]"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <InitialsAvatar name={name} />
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 font-medium text-heading">
                          <span className="truncate">{name}</span>
                          {p.allergies && (
                            <TriangleAlert className="size-3.5 flex-none text-destructive" aria-label="Has allergies" />
                          )}
                        </span>
                        <span className="tabular block truncate text-xs text-muted-foreground">
                          {p.code}
                          <span className="md:hidden">
                            {ageSex && ` · ${ageSex}`}
                            {p.phone && ` · ${p.phone}`}
                          </span>
                        </span>
                      </span>
                    </span>
                    <span className="tabular hidden text-sm text-secondary-foreground md:block">{ageSex || "—"}</span>
                    <span className="tabular hidden text-sm text-secondary-foreground md:block">{p.phone ?? "—"}</span>
                    <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {pageCount > 1 && (
          <div className="flex items-center justify-between border-t px-5 py-3 text-sm text-muted-foreground">
            <span>
              Page {page} of {pageCount}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild disabled={page <= 1}>
                <Link href={href({ page: page - 1 })} aria-disabled={page <= 1} className={cn(page <= 1 && "pointer-events-none opacity-50")}>
                  <ChevronLeft aria-hidden="true" /> Previous
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={href({ page: page + 1 })}
                  aria-disabled={page >= pageCount}
                  className={cn(page >= pageCount && "pointer-events-none opacity-50")}
                >
                  Next <ChevronRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
