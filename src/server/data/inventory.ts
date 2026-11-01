import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { inventoryItems, stockMovements, type WorkplaceColor, workplaces } from "@/db/schema";
import { todayManila } from "@/lib/format";
import type { ItemInput, MovementInput } from "@/lib/validation/inventory";
import { type Actor, NotFoundError, ownedBy } from "@/server/actor";
import { audit } from "./audit";
import { assertOwnWorkplace } from "./workplaces";

export type InventoryItem = typeof inventoryItems.$inferSelect & {
  stock: number;
  low: boolean;
  workplaceName: string;
  workplaceColor: WorkplaceColor;
};

const stockExpr = sql<string>`coalesce((select sum(${stockMovements.qty}) from ${stockMovements} where ${stockMovements.itemId} = ${inventoryItems.id}), 0)`;

function itemQuery() {
  return db
    .select({
      item: inventoryItems,
      stock: stockExpr,
      workplaceName: workplaces.name,
      workplaceColor: workplaces.color,
    })
    .from(inventoryItems)
    .innerJoin(workplaces, eq(workplaces.id, inventoryItems.workplaceId));
}

function toItem(r: Awaited<ReturnType<ReturnType<typeof itemQuery>["execute"]>>[number]): InventoryItem {
  const stock = Number(r.stock);
  return {
    ...r.item,
    stock,
    low: r.item.active && stock <= r.item.reorderLevel,
    workplaceName: r.workplaceName,
    workplaceColor: r.workplaceColor,
  };
}

export async function listItems(
  actor: Actor,
  opts: { workplaceId?: string; includeInactive?: boolean } = {},
): Promise<InventoryItem[]> {
  const rows = await itemQuery()
    .where(
      and(
        ownedBy(actor, inventoryItems.dentistId),
        opts.workplaceId ? eq(inventoryItems.workplaceId, opts.workplaceId) : undefined,
        opts.includeInactive ? undefined : eq(inventoryItems.active, true),
      ),
    )
    .orderBy(asc(inventoryItems.name));
  return rows.map(toItem);
}

/** Active items at or below their reorder level, lowest stock first. */
export async function lowStockItems(actor: Actor, limit = 8): Promise<InventoryItem[]> {
  const rows = await itemQuery()
    .where(
      and(
        ownedBy(actor, inventoryItems.dentistId),
        eq(inventoryItems.active, true),
        sql`${stockExpr} <= ${inventoryItems.reorderLevel}`,
      ),
    )
    .orderBy(asc(stockExpr), asc(inventoryItems.name))
    .limit(limit);
  return rows.map(toItem);
}

async function assertOwnItem(actor: Actor, id: string) {
  const [row] = await db
    .select()
    .from(inventoryItems)
    .where(and(eq(inventoryItems.id, id), eq(inventoryItems.dentistId, actor.id)));
  if (!row) throw new NotFoundError("Item");
  return row;
}

export async function currentStock(itemId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${stockMovements.qty}), 0)` })
    .from(stockMovements)
    .where(eq(stockMovements.itemId, itemId));
  return Number(row.total);
}

export async function createItem(actor: Actor, input: ItemInput, openingStock = 0, today?: string) {
  await assertOwnWorkplace(actor, input.workplaceId);
  const id = crypto.randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(inventoryItems).values({
      id,
      dentistId: actor.id,
      workplaceId: input.workplaceId,
      name: input.name,
      category: input.category,
      unit: input.unit,
      reorderLevel: input.reorderLevel,
      unitCost: input.unitCost,
      active: input.active ?? true,
    });
    if (openingStock > 0) {
      await tx.insert(stockMovements).values({
        id: crypto.randomUUID(),
        dentistId: actor.id,
        itemId: id,
        date: today ?? todayManila(),
        qty: openingStock,
        type: "adjust",
        reason: "Opening stock",
      });
    }
  });
  await audit(actor, "create", "inventory_item", id, { name: input.name });
  return id;
}

export async function updateItem(actor: Actor, id: string, input: ItemInput) {
  await assertOwnItem(actor, id);
  await assertOwnWorkplace(actor, input.workplaceId);
  await db
    .update(inventoryItems)
    .set({
      workplaceId: input.workplaceId,
      name: input.name,
      category: input.category ?? null,
      unit: input.unit,
      reorderLevel: input.reorderLevel,
      unitCost: input.unitCost ?? null,
      active: input.active ?? true,
    })
    .where(and(eq(inventoryItems.id, id), eq(inventoryItems.dentistId, actor.id)));
  await audit(actor, "update", "inventory_item", id);
}

/**
 * Records stock in or out. "count" stores the difference between what was
 * counted and what the records say, so history always adds up.
 */
export async function addMovement(actor: Actor, input: MovementInput): Promise<{ qty: number; stock: number }> {
  await assertOwnItem(actor, input.itemId);
  const before = await currentStock(input.itemId);
  let qty: number;
  if (input.type === "restock") qty = input.qty;
  else if (input.type === "use") {
    if (input.qty > before) throw new Error(`Only ${before} in stock`);
    qty = -input.qty;
  } else qty = input.qty - before;

  if (qty === 0 && input.type !== "count") throw new Error("Enter a quantity");
  if (qty !== 0) {
    await db.insert(stockMovements).values({
      id: crypto.randomUUID(),
      dentistId: actor.id,
      itemId: input.itemId,
      date: input.date,
      qty,
      type: input.type === "count" ? "adjust" : input.type,
      reason: input.reason ?? (input.type === "count" ? `Counted ${input.qty}` : undefined),
    });
    await audit(actor, "create", "stock_movement", input.itemId, { qty, type: input.type });
  }
  return { qty, stock: before + qty };
}

export async function listMovements(actor: Actor, itemId: string, limit = 50) {
  await assertOwnItem(actor, itemId);
  return db
    .select()
    .from(stockMovements)
    .where(eq(stockMovements.itemId, itemId))
    .orderBy(desc(stockMovements.date), desc(stockMovements.createdAt))
    .limit(limit);
}
