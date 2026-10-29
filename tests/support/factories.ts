import { db } from "@/db";
import { user } from "@/db/schema";
import type { Actor } from "@/server/actor";

let counter = 0;

/** Inserts a user row and returns it as an Actor for data-layer calls. */
export async function makeActor(role: Actor["role"] = "dentist", name?: string): Promise<Actor> {
  counter += 1;
  const id = crypto.randomUUID();
  const actor: Actor = {
    id,
    role,
    name: name ?? `${role === "admin" ? "Admin" : "Dra. Test"} ${counter}`,
    email: `${role}${counter}-${id.slice(0, 6)}@example.com`,
  };
  await db.insert(user).values({ id, name: actor.name, email: actor.email, role, emailVerified: true });
  return actor;
}
