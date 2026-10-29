// Drizzle schema. TS keys are camelCase; the client is created with
// `casing: "snake_case"`, so columns are snake_case in Postgres.
// See docs/architecture.md for the full data model.
import { sql } from "drizzle-orm";
import { boolean, date, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

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

// ── Patients ──────────────────────────────────────────────────────────────────

export const SEXES = ["female", "male"] as const;
export type Sex = (typeof SEXES)[number];

export const patients = pgTable(
  "patients",
  {
    id: text().primaryKey(),
    dentistId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Per-dentist running number behind the code (P-0001). */
    seq: integer().notNull(),
    code: text().notNull(),
    firstName: text().notNull(),
    middleName: text(),
    lastName: text().notNull(),
    birthdate: date({ mode: "string" }),
    sex: text().$type<Sex>(),
    phone: text(),
    email: text(),
    address: text(),
    occupation: text(),
    emergencyName: text(),
    emergencyPhone: text(),
    emergencyRelation: text(),
    allergies: text(),
    medicalConditions: text(),
    medications: text(),
    notes: text(),
    /** When the patient agreed to the privacy notice (Data Privacy Act). */
    consentAt: timestamp({ withTimezone: true }),
    remindersOptIn: boolean().notNull().default(false),
    archivedAt: timestamp({ withTimezone: true }),
    /** Lower-cased names, code and phone (also digits only) for fuzzy search. */
    searchText: text().generatedAlwaysAs(
      sql`lower(first_name || ' ' || coalesce(middle_name, '') || ' ' || last_name || ' ' || code || ' ' || coalesce(phone, '') || ' ' || regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'))`,
    ),
    ...timestamps,
  },
  (t) => [
    uniqueIndex().on(t.dentistId, t.seq),
    index().on(t.dentistId, t.lastName, t.firstName),
    index("patients_search_text_trgm_idx").using("gin", sql`${t.searchText} gin_trgm_ops`),
  ],
);

// ── Treatments & dental chart ─────────────────────────────────────────────────

/** Procedures done. The fee adds to the patient balance and to earnings for that workplace. */
export const treatments = pgTable(
  "treatments",
  {
    id: text().primaryKey(),
    dentistId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    patientId: text()
      .notNull()
      .references(() => patients.id),
    workplaceId: text()
      .notNull()
      .references(() => workplaces.id),
    date: date({ mode: "string" }).notNull(),
    /** FDI tooth numbers, e.g. {16, 26}. Empty for whole-mouth work like cleaning. */
    teeth: integer().array().notNull().default(sql`'{}'::integer[]`),
    procedure: text().notNull(),
    notes: text(),
    /** Centavos. */
    fee: integer().notNull().default(0),
    /** Centavos paid to the dental lab (crowns, dentures). */
    labFee: integer().notNull().default(0),
    ...timestamps,
  },
  (t) => [index().on(t.patientId, t.date), index().on(t.dentistId, t.workplaceId, t.date)],
);

export const CHART_CONDITIONS = [
  "caries",
  "filling",
  "crown",
  "rct",
  "missing",
  "extraction",
  "implant",
  "bridge",
  "sealant",
  "other",
] as const;
export type ChartCondition = (typeof CHART_CONDITIONS)[number];
export const CHART_STATUSES = ["existing", "planned", "done"] as const;
export type ChartStatus = (typeof CHART_STATUSES)[number];
export const SURFACES = ["M", "D", "B", "L", "O"] as const;
export type Surface = (typeof SURFACES)[number];

/** Odontogram entries: a condition on a tooth (optionally on specific surfaces). */
export const chartEntries = pgTable(
  "chart_entries",
  {
    id: text().primaryKey(),
    dentistId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    patientId: text()
      .notNull()
      .references(() => patients.id),
    /** FDI number: 11–48 adult, 51–85 primary. */
    tooth: integer().notNull(),
    surfaces: text().array().$type<Surface[]>().notNull().default(sql`'{}'::text[]`),
    condition: text().$type<ChartCondition>().notNull(),
    status: text().$type<ChartStatus>().notNull().default("existing"),
    date: date({ mode: "string" }).notNull(),
    notes: text(),
    /** Set when the entry was removed (kept for history). */
    removedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [index().on(t.patientId, t.tooth)],
);

// ── Appointments ──────────────────────────────────────────────────────────────

export const APPOINTMENT_STATUSES = ["scheduled", "completed", "cancelled", "no_show"] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const appointments = pgTable(
  "appointments",
  {
    id: text().primaryKey(),
    dentistId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    patientId: text()
      .notNull()
      .references(() => patients.id),
    workplaceId: text()
      .notNull()
      .references(() => workplaces.id),
    startsAt: timestamp({ withTimezone: true }).notNull(),
    endsAt: timestamp({ withTimezone: true }).notNull(),
    reason: text(),
    notes: text(),
    status: text().$type<AppointmentStatus>().notNull().default("scheduled"),
    reminderSentAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [index().on(t.dentistId, t.startsAt), index().on(t.patientId, t.startsAt), index().on(t.status, t.startsAt)],
);

// ── Billing ───────────────────────────────────────────────────────────────────

export const PAYMENT_METHODS = ["cash", "gcash", "maya", "card", "bank"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const COLLECTORS = ["me", "clinic"] as const;
export type Collector = (typeof COLLECTORS)[number];

/** Money received from a patient. Corrections void a payment (kept for history). */
export const payments = pgTable(
  "payments",
  {
    id: text().primaryKey(),
    dentistId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    patientId: text()
      .notNull()
      .references(() => patients.id),
    workplaceId: text()
      .notNull()
      .references(() => workplaces.id),
    /** Per-dentist running number for acknowledgment receipts (AR-0001). */
    receiptSeq: integer().notNull(),
    date: date({ mode: "string" }).notNull(),
    /** Centavos. */
    amount: integer().notNull(),
    method: text().$type<PaymentMethod>().notNull(),
    reference: text(),
    /** Who received the money: the dentist herself, or the partner clinic's front desk. */
    collectedBy: text().$type<Collector>().notNull().default("me"),
    notes: text(),
    voidedAt: timestamp({ withTimezone: true }),
    voidReason: text(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex().on(t.dentistId, t.receiptSeq),
    index().on(t.patientId, t.date),
    index().on(t.dentistId, t.workplaceId, t.date),
  ],
);

// ── Earnings ──────────────────────────────────────────────────────────────────

/** Money a partner clinic paid the dentist for her share. */
export const payouts = pgTable(
  "payouts",
  {
    id: text().primaryKey(),
    dentistId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    workplaceId: text()
      .notNull()
      .references(() => workplaces.id),
    date: date({ mode: "string" }).notNull(),
    /** The period the payout covers (optional). */
    periodStart: date({ mode: "string" }),
    periodEnd: date({ mode: "string" }),
    /** Centavos. */
    amount: integer().notNull(),
    notes: text(),
    voidedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [index().on(t.dentistId, t.workplaceId, t.date)],
);

export const EXPENSE_CATEGORIES = ["supplies", "lab", "rent", "utilities", "equipment", "salaries", "other"] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const expenses = pgTable(
  "expenses",
  {
    id: text().primaryKey(),
    dentistId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    workplaceId: text()
      .notNull()
      .references(() => workplaces.id),
    date: date({ mode: "string" }).notNull(),
    category: text().$type<ExpenseCategory>().notNull(),
    /** Centavos. */
    amount: integer().notNull(),
    notes: text(),
    voidedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [index().on(t.dentistId, t.workplaceId, t.date)],
);

// ── Files (X-rays, photos, documents) ─────────────────────────────────────────

export const ATTACHMENT_KINDS = ["xray", "photo", "document"] as const;
export type AttachmentKind = (typeof ATTACHMENT_KINDS)[number];

/** Files live in private storage (R2); only the key and metadata are here. */
export const attachments = pgTable(
  "attachments",
  {
    id: text().primaryKey(),
    dentistId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    patientId: text()
      .notNull()
      .references(() => patients.id),
    kind: text().$type<AttachmentKind>().notNull(),
    /** dentistId/patientId/uuid.ext — never shown to users. */
    storageKey: text().notNull().unique(),
    filename: text().notNull(),
    mime: text().notNull(),
    size: integer().notNull(),
    takenAt: date({ mode: "string" }),
    notes: text(),
    /** False until the browser finishes uploading and the server confirms it. */
    uploaded: boolean().notNull().default(false),
    removedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [index().on(t.patientId, t.createdAt)],
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
