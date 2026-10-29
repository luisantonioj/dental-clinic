import { describe, expect, it } from "vitest";
import { patientSchema } from "@/lib/validation/patients";
import { NotFoundError } from "@/server/actor";
import { makeActor } from "../../../tests/support/factories";
import { addPatient } from "../../../tests/support/fixtures";
import {
  getPatient,
  listPatients,
  searchPatients,
  setPatientArchived,
  updatePatient,
} from "./patients";

describe("patients", () => {
  it("numbers patients per dentist and records consent", async () => {
    const a = await makeActor();
    const b = await makeActor();
    const p1 = await addPatient(a);
    const p2 = await addPatient(a, { firstName: "Maria", lastName: "Santos" });
    const q1 = await addPatient(b);
    expect([p1.code, p2.code, q1.code]).toEqual(["P-0001", "P-0002", "P-0001"]);
    expect(p1.consentAt).toBeInstanceOf(Date);
    const noConsent = await addPatient(a, { consent: "" });
    expect(noConsent.consentAt).toBeNull();
  });

  it("never shows one dentist's patients to another (tenant isolation)", async () => {
    const a = await makeActor();
    const b = await makeActor();
    const pa = await addPatient(a, { firstName: "Private", lastName: "Patient" });

    expect((await listPatients(b)).rows).toHaveLength(0);
    expect(await searchPatients(b, "private")).toHaveLength(0);
    await expect(getPatient(b, pa.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      updatePatient(b, pa.id, patientSchema.parse({ firstName: "Hacked", lastName: "X" })),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(setPatientArchived(b, pa.id, true)).rejects.toBeInstanceOf(NotFoundError);
    expect((await getPatient(a, pa.id)).firstName).toBe("Private");
  });

  it("lets the admin see every dentist's patients", async () => {
    const a = await makeActor();
    const admin = await makeActor("admin");
    const pa = await addPatient(a, { firstName: "Visible", lastName: "ToAdmin" });
    expect((await getPatient(admin, pa.id)).id).toBe(pa.id);
  });

  it("finds patients by partial name, typo, code and phone", async () => {
    const a = await makeActor();
    await addPatient(a, { firstName: "Jean Ebeth", lastName: "Tumambing", phone: "0917-555-0100" });
    await addPatient(a, { firstName: "Mark", lastName: "Reyes", phone: "0918 222 3333" });
    await addPatient(a, { firstName: "Ana", lastName: "Villanueva" });

    const names = async (q: string) => (await searchPatients(a, q)).map((p) => p.lastName);
    expect(await names("tumam")).toEqual(["Tumambing"]);
    expect(await names("Tumambeng")).toContain("Tumambing"); // typo
    expect(await names("jean tumambing")).toEqual(["Tumambing"]);
    expect(await names("P-0002")).toEqual(["Reyes"]);
    expect(await names("09175550100")).toEqual(["Tumambing"]); // digits only
    expect(await names("0918 222")).toEqual(["Reyes"]);
    expect(await names("villa")).toEqual(["Villanueva"]);
    expect(await names("zzzz")).toEqual([]);
  });

  it("archives and restores instead of deleting", async () => {
    const a = await makeActor();
    const p = await addPatient(a);
    await setPatientArchived(a, p.id, true);
    expect((await listPatients(a)).rows).toHaveLength(0);
    expect((await listPatients(a, { archived: true })).rows).toHaveLength(1);
    expect(await searchPatients(a, "dela")).toHaveLength(0);
    await setPatientArchived(a, p.id, false);
    expect((await listPatients(a)).rows).toHaveLength(1);
  });

  it("keeps the first consent date on later edits", async () => {
    const a = await makeActor();
    const p = await addPatient(a);
    const updated = await updatePatient(
      a,
      p.id,
      patientSchema.parse({ firstName: "Juan", lastName: "Dela Cruz", consent: "on", allergies: "Penicillin" }),
    );
    expect(updated.consentAt?.getTime()).toBe(p.consentAt?.getTime());
    expect(updated.allergies).toBe("Penicillin");
  });

  it("paginates", async () => {
    const a = await makeActor();
    for (let i = 0; i < 27; i++) await addPatient(a, { firstName: `P${i}`, lastName: `Last${String(i).padStart(2, "0")}` });
    const page1 = await listPatients(a);
    const page2 = await listPatients(a, { page: 2 });
    expect(page1).toMatchObject({ total: 27, pageCount: 2 });
    expect(page1.rows).toHaveLength(25);
    expect(page2.rows).toHaveLength(2);
  });
});
