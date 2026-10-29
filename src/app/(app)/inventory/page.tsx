import { Package, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/app/page-header";
import { WorkplaceDot, WorkplaceTag } from "@/components/app/workplace-tag";
import { Badge } from "@/components/ui/badge";
import { todayManila } from "@/lib/format";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/auth";
import { getCurrentWorkplace } from "@/server/current-workplace";
import { listItems } from "@/server/data/inventory";
import { HistoryDialog, ItemDialog, type ItemView, MovementDialog } from "./inventory-dialogs";

export const metadata: Metadata = { title: "Inventory" };

export default async function InventoryPage({ searchParams }: PageProps<"/inventory">) {
  const actor = await requireUser();
  const sp = await searchParams;
  const { current, workplaces } = await getCurrentWorkplace(actor);
  const filter = typeof sp.wp === "string" ? sp.wp : sp.wp === undefined ? (current?.id ?? "all") : "all";
  const showInactive = sp.inactive === "1";
  const items = await listItems(actor, {
    workplaceId: filter === "all" ? undefined : filter,
    includeInactive: showInactive,
  });
  const today = todayManila();
  const lowCount = items.filter((i) => i.low).length;
  const options = workplaces.map((w) => ({ id: w.id, name: w.name }));
  const chip = (active: boolean) =>
    cn(
      "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-hover",
      active && "border-primary bg-primary-soft text-primary hover:bg-primary-soft",
    );

  return (
    <>
      <PageHeader
        title="Inventory"
        description={
          lowCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-warning">
              <TriangleAlert className="size-4" aria-hidden="true" /> {lowCount} item{lowCount === 1 ? "" : "s"} running low
            </span>
          ) : (
            "Supplies per workplace"
          )
        }
        actions={<ItemDialog workplaces={options} defaultWorkplaceId={filter !== "all" ? filter : (current?.id ?? null)} />}
      />
      {workplaces.length > 0 && (
        <nav aria-label="Filter by workplace" className="mb-4 flex flex-wrap gap-2">
          {workplaces.map((w) => (
            <Link key={w.id} href={`/inventory?wp=${w.id}`} className={chip(filter === w.id)}>
              <WorkplaceDot color={w.color} className="size-2" />
              {w.name}
            </Link>
          ))}
          <Link href="/inventory?wp=all" className={chip(filter === "all")}>
            All workplaces
          </Link>
          <Link
            href={`/inventory?wp=${filter}${showInactive ? "" : "&inactive=1"}`}
            className="ml-auto self-center text-sm text-muted-foreground hover:text-heading"
          >
            {showInactive ? "Hide inactive" : "Show inactive"}
          </Link>
        </nav>
      )}
      <section className="rounded-xl border bg-card shadow-card">
        {items.length === 0 ? (
          <EmptyState
            icon={Package}
            title={workplaces.length === 0 ? "Add a workplace in Settings first." : "No items yet. Add the supplies you want to keep track of."}
          />
        ) : (
          <ul className="divide-y">
            <li className="hidden grid-cols-[minmax(0,2fr)_1fr_120px_100px_176px] gap-4 bg-surface-2 px-5 py-2.5 text-xs font-medium text-muted-foreground md:grid">
              <span>Item</span>
              <span>Workplace</span>
              <span className="text-right">In stock</span>
              <span className="text-right">Reorder at</span>
              <span />
            </li>
            {items.map((i) => {
              const view: ItemView = {
                id: i.id,
                name: i.name,
                category: i.category,
                unit: i.unit,
                reorderLevel: i.reorderLevel,
                unitCost: i.unitCost,
                active: i.active,
                workplaceId: i.workplaceId,
                stock: i.stock,
              };
              return (
                <li
                  key={i.id}
                  className={cn(
                    "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-5 py-3 md:grid-cols-[minmax(0,2fr)_1fr_120px_100px_176px]",
                    !i.active && "opacity-60",
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-medium text-heading">
                      <span className="truncate">{i.name}</span>
                      {i.low && <Badge className="bg-warning-soft text-warning">Low</Badge>}
                      {!i.active && <Badge variant="secondary">Inactive</Badge>}
                    </div>
                    {i.category && <div className="text-xs text-muted-foreground">{i.category}</div>}
                  </div>
                  <span className="hidden md:block">
                    <WorkplaceTag name={i.workplaceName} color={i.workplaceColor} />
                  </span>
                  <span className={cn("tabular text-right font-semibold text-heading", i.low && "text-warning")}>
                    {i.stock} <span className="text-xs font-normal text-muted-foreground">{i.unit}</span>
                  </span>
                  <span className="tabular hidden text-right text-sm text-muted-foreground md:block">{i.reorderLevel}</span>
                  <span className="col-span-2 flex justify-end gap-0.5 md:col-span-1">
                    <MovementDialog item={view} type="use" today={today} />
                    <MovementDialog item={view} type="restock" today={today} />
                    <MovementDialog item={view} type="count" today={today} />
                    <HistoryDialog item={view} />
                    <ItemDialog item={view} workplaces={options} defaultWorkplaceId={i.workplaceId} />
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
