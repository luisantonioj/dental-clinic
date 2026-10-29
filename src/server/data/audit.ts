import "server-only";
import { db } from "@/db";
import { desc, eq } from "drizzle-orm";
import { auditLog, user } from "@/db/schema";
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

export type AuditEntry = {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  at: Date;
  actorName: string;
  details: Record<string, unknown> | null;
};

/** Recent activity: a dentist sees their own actions; the admin sees everyone's. */
export async function listAudit(actor: Actor, limit = 50): Promise<AuditEntry[]> {
  return db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      entity: auditLog.entity,
      entityId: auditLog.entityId,
      at: auditLog.at,
      actorName: user.name,
      details: auditLog.details,
    })
    .from(auditLog)
    .innerJoin(user, eq(user.id, auditLog.actorId))
    .where(actor.role === "admin" ? undefined : eq(auditLog.actorId, actor.id))
    .orderBy(desc(auditLog.at))
    .limit(limit);
}
