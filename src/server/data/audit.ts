import "server-only";
import { db } from "@/db";
import { auditLog } from "@/db/schema";
import type { Actor } from "@/server/actor";

export type AuditAction = "create" | "update" | "archive" | "restore" | "disable" | "enable" | "reset-password" | "delete";

/** Records who did what to which row. Called from data-layer writes. */
export async function audit(
  actor: Actor,
  action: AuditAction,
  entity: string,
  entityId: string,
  details?: Record<string, unknown>,
): Promise<void> {
  await db.insert(auditLog).values({ id: crypto.randomUUID(), actorId: actor.id, action, entity, entityId, details });
}
