import { Skeleton } from "@/components/ui/skeleton";

/** Shown under the patient header and tabs while a tab's data loads. */
export default function PatientTabLoading() {
  return (
    <div role="status" aria-label="Loading" className="rounded-xl border bg-card p-5 shadow-card">
      <Skeleton className="mb-5 h-5 w-40" />
      <div className="space-y-3">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    </div>
  );
}
