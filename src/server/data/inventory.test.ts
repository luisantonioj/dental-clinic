import { describe, expect, it } from "vitest";
import { itemSchema, movementSchema } from "@/lib/validation/inventory";
import { NotFoundError } from "@/server/actor";
import { makeActor } from "../../../tests/support/factories";
import { addPartnerClinic, addWorkplace } from "../../../tests/support/fixtures";
import { addMovement, createItem, listItems, listMovements, lowStockItems, updateItem } from "./inventory";

const DAY = "2026-10-29";
const move = (itemId: string, type: string, qty: string) => movementSchema.parse({ itemId, type, qty, date: DAY });

describe("inventory", () => {
  it("tracks stock per workplace from movements", async () => {
    const a = await makeActor();
    const home = await addWorkplace(a);
    const partner = await addPartnerClinic(a);
    const gloves = await createItem(a, itemSchema.parse({ workplaceId: home.id, name: "Gloves (M)", unit: "box", reorderLevel: "2" }), 5, DAY);
    await createItem(a, itemSchema.parse({ workplaceId: partner.id, name: "Composite A2", unit: "pc", reorderLevel: "1" }), 3);

    await addMovement(a, move(gloves, "use", "2"));
    await addMovement(a, move(gloves, "restock", "10"));
    expect((await listItems(a, { workplaceId: home.id })).map((i) => [i.name, i.stock])).toEqual([["Gloves (M)", 13]]);
    expect(await listItems(a, { workplaceId: partner.id })).toHaveLength(1);

    // A count records the difference.
    const counted = await addMovement(a, move(gloves, "count", "11"));
    expect(counted).toEqual({ qty: -2, stock: 11 });
    expect((await listMovements(a, gloves)).map((m) => m.qty)).toEqual([-2, 10, -2, 5]);
  });

  it("refuses to use more than is in stock", async () => {
    const a = await makeActor();
    const w = await addWorkplace(a);
    const item = await createItem(a, itemSchema.parse({ workplaceId: w.id, name: "Bib", unit: "pc", reorderLevel: "0" }), 1);
    await expect(addMovement(a, move(item, "use", "2"))).rejects.toThrow("Only 1 in stock");
  });

  it("flags low stock at or below the reorder level", async () => {
    const a = await makeActor();
    const w = await addWorkplace(a);
    const low = await createItem(a, itemSchema.parse({ workplaceId: w.id, name: "Lidocaine", unit: "box", reorderLevel: "2" }), 2);
    await createItem(a, itemSchema.parse({ workplaceId: w.id, name: "Masks", unit: "box", reorderLevel: "1" }), 5);
    const off = await createItem(a, itemSchema.parse({ workplaceId: w.id, name: "Old item", unit: "pc", reorderLevel: "5" }), 0);
    await updateItem(a, off, itemSchema.parse({ workplaceId: w.id, name: "Old item", unit: "pc", reorderLevel: "5", active: "" }));
    expect((await lowStockItems(a)).map((i) => i.id)).toEqual([low]);
  });

  it("keeps inventory private", async () => {
    const a = await makeActor();
    const b = await makeActor();
    const w = await addWorkplace(a);
    const item = await createItem(a, itemSchema.parse({ workplaceId: w.id, name: "Gauze", unit: "pack", reorderLevel: "1" }), 3);
    expect(await listItems(b)).toEqual([]);
    expect(await lowStockItems(b)).toEqual([]);
    await expect(addMovement(b, move(item, "use", "1"))).rejects.toBeInstanceOf(NotFoundError);
    await expect(listMovements(b, item)).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      createItem(b, itemSchema.parse({ workplaceId: w.id, name: "X", unit: "pc", reorderLevel: "0" })),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
