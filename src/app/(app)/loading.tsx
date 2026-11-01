import { Skeleton } from "@/components/ui/skeleton";

/** Shown inside the app shell while a page's data loads. */
export default function AppLoading() {
  return (
    <div role="status" aria-label="Loading">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[4.5rem] rounded-xl" />
        ))}
      </div>
      <div className="rounded-xl border bg-card p-5 shadow-card">
        <Skeleton className="mb-5 h-5 w-40" />
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      </div>
    </div>
  );
}
