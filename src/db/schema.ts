// Drizzle schema. TS keys are camelCase; the client is created with
// `casing: "snake_case"`, so columns are snake_case in Postgres.
// See docs/architecture.md for the full data model.
import { boolean, index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// ── Auth (Better Auth + admin plugin) ─────────────────────────────────────────

export const user = pgTable("user", {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  // admin plugin
  role: text().notNull().default("dentist"),
  banned: boolean().default(false),
  banReason: text(),
  banExpires: timestamp({ withTimezone: true }),
  // DentalKeep profile
  prcLicense: text(),
  phone: text(),
  /** Hours before an appointment to email the reminder. */
  reminderHours: integer().notNull().default(24),
  ...timestamps,
});

export const session = pgTable(
  "session",
  {
    id: text().primaryKey(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    token: text().notNull().unique(),
    ipAddress: text(),
    userAgent: text(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: text(),
    ...timestamps,
  },
  (t) => [index().on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    ...timestamps,
  },
  (t) => [index().on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index().on(t.identifier)],
);

// ── Workplaces ────────────────────────────────────────────────────────────────

export const WORKPLACE_TYPES = ["own", "partner"] as const;
export type WorkplaceType = (typeof WORKPLACE_TYPES)[number];
export const WORKPLACE_COLORS = ["indigo", "sky", "violet", "amber", "rose", "emerald"] as const;
export type WorkplaceColor = (typeof WORKPLACE_COLORS)[number];

/** Where a dentist works: their own clinic, or a partner clinic that pays a commission share. */
export const workplaces = pgTable(
  "workplaces",
  {
    id: text().primaryKey(),
    dentistId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text().notNull(),
    address: text(),
    phone: text(),
    type: text().$type<WorkplaceType>().notNull(),
    /** Her share of collections, 0–100. Always 100 for her own clinic. */
    commissionPct: integer().notNull().default(100),
    /** Partner clinics often take lab fees off the top before the split. */
    deductLabFees: boolean().notNull().default(false),
    color: text().$type<WorkplaceColor>().notNull().default("indigo"),
    active: boolean().notNull().default(true),
    ...timestamps,
  },
  (t) => [index().on(t.dentistId)],
);

// ── Audit ─────────────────────────────────────────────────────────────────────

export const auditLog = pgTable(
  "audit_log",
  {
    id: text().primaryKey(),
    actorId: text()
      .notNull()
      .references(() => user.id),
    action: text().notNull(),
    entity: text().notNull(),
    entityId: text().notNull(),
    details: jsonb().$type<Record<string, unknown>>(),
    at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.actorId, t.at), index().on(t.entity, t.entityId)],
);
