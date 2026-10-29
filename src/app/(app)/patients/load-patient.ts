import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { NotFoundError } from "@/server/actor";
import { requireUser } from "@/server/auth";
import { getPatient } from "@/server/data/patients";

/** Loads a patient for the current user (once per request) or shows the 404 page. */
export const loadPatient = cache(async (id: string) => {
  const actor = await requireUser();
  try {
    return { actor, patient: await getPatient(actor, id) };
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
});
