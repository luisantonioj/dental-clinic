import "server-only";
import { cookies } from "next/headers";
import type { Actor } from "@/server/actor";
import { listWorkplaces, type Workplace } from "@/server/data/workplaces";

export const WORKPLACE_COOKIE = "dk_workplace";

/**
 * The workplace picked in the sidebar switcher. It is the default for new
 * appointments, treatments, payments and stock entries.
 */
export async function getCurrentWorkplace(
  actor: Actor,
  list?: Workplace[],
): Promise<{ current: Workplace | null; workplaces: Workplace[] }> {
  const workplaces = list ?? (await listWorkplaces(actor));
  const id = (await cookies()).get(WORKPLACE_COOKIE)?.value;
  const current = workplaces.find((w) => w.id === id) ?? workplaces[0] ?? null;
  return { current, workplaces };
}
