import { eq, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

/** Who is making a request. Every data-layer function takes one. */
export type Actor = {
  id: string;
  role: "admin" | "dentist";
  name: string;
  email: string;
};

/**
 * The tenant filter: a dentist only ever sees their own rows; an admin sees all.
 * Returns undefined for admins so it can be dropped into `and(...)`.
 */
export function ownedBy(actor: Actor, dentistIdColumn: PgColumn): SQL | undefined {
  return actor.role === "admin" ? undefined : eq(dentistIdColumn, actor.id);
}

export class NotFoundError extends Error {
  constructor(what: string) {
    super(`${what} not found`);
    this.name = "NotFoundError";
  }
}
