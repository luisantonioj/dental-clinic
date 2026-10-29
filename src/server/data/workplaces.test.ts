import { describe, expect, it } from "vitest";
import { workplaceSchema } from "@/lib/validation/workplaces";
import { NotFoundError } from "@/server/actor";
import { makeActor } from "../../../tests/support/factories";
import { createWorkplace, getWorkplace, listWorkplaces, updateWorkplace } from "./workplaces";

const partner = workplaceSchema.parse({
  name: "Kave Dental Clinic",
  type: "partner",
  commissionPct: "40",
  deductLabFees: "on",
  color: "indigo",
});
const own = workplaceSchema.parse({ name: "Dental Smiles Clinic", type: "own", commissionPct: "50", color: "sky" });

describe("workplaces", () => {
  it("forces 100% and no lab-fee deduction for her own clinic", () => {
    expect(own.commissionPct).toBe(100);
    expect(own.deductLabFees).toBe(false);
    expect(partner).toMatchObject({ commissionPct: 40, deductLabFees: true });
  });

  it("keeps each dentist's workplaces private", async () => {
    const a = await makeActor();
    const b = await makeActor();
    const wa = await createWorkplace(a, partner);
    await createWorkplace(b, own);

    expect((await listWorkplaces(a)).map((w) => w.name)).toEqual(["Kave Dental Clinic"]);
    await expect(getWorkplace(b, wa.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(updateWorkplace(b, wa.id, own)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("hides inactive workplaces from pickers", async () => {
    const a = await makeActor();
    const w = await createWorkplace(a, partner);
    await updateWorkplace(a, w.id, { ...partner, active: false });
    expect(await listWorkplaces(a)).toHaveLength(0);
    expect(await listWorkplaces(a, { includeInactive: true })).toHaveLength(1);
  });
});
