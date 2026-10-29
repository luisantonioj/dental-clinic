import { describe, expect, it } from "vitest";
import { parseTeeth, toothName } from "@/lib/teeth";
import { chartEntrySchema, treatmentSchema } from "@/lib/validation/clinical";
import { NotFoundError } from "@/server/actor";
import { makeActor } from "../../../tests/support/factories";
import { addPatient, addWorkplace } from "../../../tests/support/fixtures";
import { addChartEntry, listChartEntries, removeChartEntry } from "./chart";
import { createTreatment, listTreatments, updateTreatment } from "./treatments";

describe("teeth helpers", () => {
  it("names and parses FDI teeth", () => {
    expect(toothName(16)).toBe("Upper right first molar");
    expect(toothName(31)).toBe("Lower left central incisor");
    expect(toothName(55)).toBe("Upper right second molar (primary)");
    expect(parseTeeth("16, 26 11")).toEqual([16, 26, 11]);
    expect(parseTeeth("19")).toBeNull();
    expect(parseTeeth("")).toEqual([]);
  });
});

describe("treatments", () => {
  it("records fees in centavos with workplace and teeth", async () => {
    const a = await makeActor();
    const p = await addPatient(a);
    const w = await addWorkplace(a);
    const input = treatmentSchema.parse({
      patientId: p.id,
      workplaceId: w.id,
      date: "2026-10-29",
      teeth: "36",
      procedure: "Root canal treatment",
      fee: "8,000",
      labFee: "",
    });
    const t = await createTreatment(a, input);
    expect(t).toMatchObject({ fee: 800000, labFee: 0, teeth: [36] });
    const rows = await listTreatments(a, p.id);
    expect(rows[0]).toMatchObject({ procedure: "Root canal treatment", workplaceName: "Home Clinic" });

    await updateTreatment(a, t.id, { ...input, fee: 750000 });
    expect((await listTreatments(a, p.id))[0].fee).toBe(750000);
  });

  it("rejects linking to another dentist's patient or workplace", async () => {
    const a = await makeActor();
    const b = await makeActor();
    const pa = await addPatient(a);
    const wa = await addWorkplace(a);
    const wb = await addWorkplace(b);
    const base = { date: "2026-10-29", procedure: "Cleaning", fee: 100000, labFee: 0, teeth: [] };
    await expect(createTreatment(b, { ...base, patientId: pa.id, workplaceId: wb.id })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(createTreatment(a, { ...base, patientId: pa.id, workplaceId: wb.id })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    const t = await createTreatment(a, { ...base, patientId: pa.id, workplaceId: wa.id });
    expect(await listTreatments(b, pa.id)).toHaveLength(0);
    await expect(updateTreatment(b, t.id, { ...base, patientId: pa.id, workplaceId: wb.id })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("validates lab fee against the fee", () => {
    const r = treatmentSchema.safeParse({
      patientId: "x",
      workplaceId: "y",
      date: "2026-10-29",
      procedure: "Crown",
      fee: "5000",
      labFee: "6000",
    });
    expect(r.success).toBe(false);
  });
});

describe("dental chart", () => {
  it("adds, lists and soft-removes entries per patient", async () => {
    const a = await makeActor();
    const b = await makeActor();
    const p = await addPatient(a);
    const caries = await addChartEntry(
      a,
      chartEntrySchema.parse({ patientId: p.id, tooth: "16", surfaces: ["O", "M"], condition: "caries", date: "2026-10-01" }),
    );
    const crown = await addChartEntry(
      a,
      chartEntrySchema.parse({ patientId: p.id, tooth: "21", surfaces: "B", condition: "crown", date: "2026-10-02" }),
    );
    expect(caries.surfaces).toEqual(["O", "M"]);
    expect(crown.surfaces).toEqual([]); // whole-tooth condition

    expect(await listChartEntries(b, p.id)).toHaveLength(0);
    await expect(removeChartEntry(b, caries.id)).rejects.toBeInstanceOf(NotFoundError);

    await removeChartEntry(a, caries.id);
    expect((await listChartEntries(a, p.id)).map((e) => e.tooth)).toEqual([21]);
  });

  it("rejects invalid tooth numbers", () => {
    expect(
      chartEntrySchema.safeParse({ patientId: "x", tooth: "19", condition: "caries", date: "2026-10-01" }).success,
    ).toBe(false);
  });
});
