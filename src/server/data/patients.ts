import "server-only";
import { and, asc, count, desc, eq, ilike, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { patients } from "@/db/schema";
import type { PatientInput } from "@/lib/validation/patients";
import { type Actor, NotFoundError, ownedBy } from "@/server/actor";
import { audit } from "./audit";

export type Patient = typeof patients.$inferSelect;
export type PatientListItem = Pick<
  Patient,
  "id" | "code" | "firstName" | "middleName" | "lastName" | "birthdate" | "sex" | "phone" | "allergies" | "archivedAt"
>;

export const PAGE_SIZE = 25;

export function fullName(p: Pick<Patient, "firstName" | "middleName" | "lastName">): string {
  return [p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ");
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Fuzzy match on names, code and phone: substring match (uses the trigram index)
 * or trigram word similarity, which forgives typos like "Tumambeng".
 */
function searchCondition(q: string): { where: SQL; rank: SQL<number> } | null {
  const term = q.trim().toLowerCase().replace(/\s+/g, " ");
  if (!term) return null;
  const rank = sql<number>`word_similarity(${term}, ${patients.searchText})`;

  // A patient code ("P-0012", "p12") matches that one patient exactly.
  const code = /^p-?(\d{1,6})$/.exec(term);
  if (code) return { where: eq(patients.code, `P-${code[1].padStart(4, "0")}`), rank };

  const parts: SQL[] = [ilike(patients.searchText, `%${escapeLike(term)}%`)];
  const digits = term.replace(/\D/g, "");
  if (digits.length >= 4 && digits.length === term.replace(/[\s+()-]/g, "").length) {
    // Phone numbers: match the digits whatever the spacing or dashes.
    parts.push(ilike(patients.searchText, `%${digits}%`));
  } else if (/[a-z].*[a-z].*[a-z]/.test(term)) {
    // Names: forgive typos. Only for words, since codes and numbers all look alike.
    parts.push(sql`${rank} >= 0.45`);
  }
  return { where: or(...parts)!, rank };
}

const listColumns = {
  id: patients.id,
  code: patients.code,
  firstName: patients.firstName,
  middleName: patients.middleName,
  lastName: patients.lastName,
  birthdate: patients.birthdate,
  sex: patients.sex,
  phone: patients.phone,
  allergies: patients.allergies,
  archivedAt: patients.archivedAt,
};

export async function listPatients(
  actor: Actor,
  opts: { q?: string; page?: number; archived?: boolean } = {},
): Promise<{ rows: PatientListItem[]; total: number; page: number; pageCount: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const search = searchCondition(opts.q ?? "");
  const where = and(
    ownedBy(actor, patients.dentistId),
    opts.archived ? isNotNull(patients.archivedAt) : isNull(patients.archivedAt),
    search?.where,
  );
  const [{ total }] = await db.select({ total: count() }).from(patients).where(where);
  const rows = await db
    .select(listColumns)
    .from(patients)
    .where(where)
    .orderBy(...(search ? [desc(search.rank)] : []), asc(patients.lastName), asc(patients.firstName))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);
  return { rows, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/** Quick search for the Ctrl+K palette: best matches first, archived excluded. */
export async function searchPatients(actor: Actor, q: string, limit = 8): Promise<PatientListItem[]> {
  const search = searchCondition(q);
  if (!search) return [];
  return db
    .select(listColumns)
    .from(patients)
    .where(and(ownedBy(actor, patients.dentistId), isNull(patients.archivedAt), search.where))
    .orderBy(desc(search.rank), asc(patients.lastName))
    .limit(limit);
}

export async function getPatient(actor: Actor, id: string): Promise<Patient> {
  const [row] = await db
    .select()
    .from(patients)
    .where(and(eq(patients.id, id), ownedBy(actor, patients.dentistId)));
  if (!row) throw new NotFoundError("Patient");
  return row;
}

/** Throws unless the patient exists and belongs to the actor (used before linking rows to it). */
export async function assertOwnPatient(actor: Actor, id: string): Promise<Patient> {
  const [row] = await db
    .select()
    .from(patients)
    .where(and(eq(patients.id, id), eq(patients.dentistId, actor.id)));
  if (!row) throw new NotFoundError("Patient");
  return row;
}

function toColumns(input: PatientInput) {
  return {
    firstName: input.firstName,
    middleName: input.middleName ?? null,
    lastName: input.lastName,
    birthdate: input.birthdate ?? null,
    sex: input.sex ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    address: input.address ?? null,
    occupation: input.occupation ?? null,
    emergencyName: input.emergencyName ?? null,
    emergencyPhone: input.emergencyPhone ?? null,
    emergencyRelation: input.emergencyRelation ?? null,
    allergies: input.allergies ?? null,
    medicalConditions: input.medicalConditions ?? null,
    medications: input.medications ?? null,
    notes: input.notes ?? null,
    remindersOptIn: input.remindersOptIn,
  };
}

export function patientCode(seq: number): string {
  return `P-${String(seq).padStart(4, "0")}`;
}

export async function createPatient(actor: Actor, input: PatientInput): Promise<Patient> {
  // Allocate the next per-dentist number; retry if two saves race for the same one.
  for (let attempt = 0; attempt < 3; attempt++) {
    const [{ next }] = await db
      .select({ next: sql<number>`coalesce(max(${patients.seq}), 0) + 1` })
      .from(patients)
      .where(eq(patients.dentistId, actor.id));
    const seq = Number(next);
    try {
      const [row] = await db
        .insert(patients)
        .values({
          id: crypto.randomUUID(),
          dentistId: actor.id,
          seq,
          code: patientCode(seq),
          ...toColumns(input),
          consentAt: input.consent ? new Date() : null,
        })
        .returning();
      await audit(actor, "create", "patient", row.id, { code: row.code });
      return row;
    } catch (e) {
      if (attempt < 2 && String(e).includes("patients_dentist_id_seq_index")) continue;
      throw e;
    }
  }
  throw new Error("Couldn't allocate a patient number");
}

export async function updatePatient(actor: Actor, id: string, input: PatientInput): Promise<Patient> {
  const existing = await getPatient(actor, id);
  const [row] = await db
    .update(patients)
    .set({
      ...toColumns(input),
      // Keep the original consent date; record it the first time it's ticked.
      consentAt: input.consent ? (existing.consentAt ?? new Date()) : null,
    })
    .where(and(eq(patients.id, id), ownedBy(actor, patients.dentistId)))
    .returning();
  await audit(actor, "update", "patient", id);
  return row;
}

export async function setPatientArchived(actor: Actor, id: string, archived: boolean): Promise<void> {
  await getPatient(actor, id);
  await db
    .update(patients)
    .set({ archivedAt: archived ? new Date() : null })
    .where(and(eq(patients.id, id), ownedBy(actor, patients.dentistId)));
  await audit(actor, archived ? "archive" : "restore", "patient", id);
}

export async function countPatients(actor: Actor): Promise<number> {
  const [{ total }] = await db
    .select({ total: count() })
    .from(patients)
    .where(and(ownedBy(actor, patients.dentistId), isNull(patients.archivedAt)));
  return total;
}

/** Most recently added or edited patients (dashboard). */
export async function recentPatients(actor: Actor, limit = 6): Promise<PatientListItem[]> {
  return db
    .select(listColumns)
    .from(patients)
    .where(and(ownedBy(actor, patients.dentistId), isNull(patients.archivedAt)))
    .orderBy(desc(patients.updatedAt))
    .limit(limit);
}
