# Architecture

## System overview

```
            ┌──────────────────────────── Vercel ────────────────────────────┐
 Browser ──▶│ Next.js (App Router)                                           │
 (phone,    │   Server components ─┐                                         │
  tablet,   │   Server actions ────┼──▶ src/server/data/* ──▶ Drizzle ──▶ Neon Postgres
  laptop)   │   Route handlers ────┘          │                              │
            │     /api/auth/*  (Better Auth)  ├──▶ src/server/storage.ts ──▶ Cloudflare R2 (private)
            │     /api/files/* (presign)      └──▶ src/server/email/*   ──▶ Resend ──▶ patient inbox
            │     /api/cron/reminders ◀── Vercel Cron (daily, CRON_SECRET)  │
            │     /api/export/*  (CSV)                                     │
            └────────────────────────────────────────────────────────────────┘
 Browser ──── presigned PUT/GET (5 min) ─────────────────────────▶ Cloudflare R2
```

There is no separate API server. Next.js renders pages and is the backend.

## Frontend / backend structure

```
src/
  app/
    (auth)/login, forgot-password, reset-password
    (app)/                      authenticated shell: sidebar, topbar, Ctrl+K search
      page.tsx                  dashboard
      patients/                 list, new, [id] (overview, chart, treatments, files, appointments, billing)
      appointments/             day/week calendar
      earnings/                 report, payouts, expenses
      inventory/                items, movements
      receipts/[id]/            printable acknowledgment receipt
      settings/                 profile, workplaces, reminders, password, export, activity log
      admin/users/              accounts (admin only)
    api/
      auth/[...all]/route.ts    Better Auth handler
      files/                    presign upload / view
      cron/reminders/route.ts   reminder job
      export/                   CSV downloads
  components/
    ui/                         shadcn/ui primitives (themed by tokens)
    app/                        shell, search, workplace switcher, tooth chart, etc.
  server/
    auth.ts                     Better Auth instance, requireUser(), requireAdmin()
    data/                       patients, chart, treatments, files, appointments,
                                payments, earnings, inventory, workplaces, users, audit
    email/                      Resend client, templates
    storage.ts                  R2 S3 client, presignPut/presignGet
  db/
    schema.ts, index.ts
  lib/
    env.ts                      Zod-validated env
    format.ts                   formatPeso, formatDate, Manila time helpers
    validation/                 Zod input schemas
drizzle/                        SQL migrations
```

**Request flow for a write:** form → server action (`"use server"`) → `requireUser()` → Zod parse → `data/<domain>.ts` (scoped by `dentistId`, writes audit) → `revalidatePath()`.

**Request flow for a read:** server component → `requireUser()` → `data/<domain>.ts` → render.

## Database design

All IDs are `text` UUIDs (`crypto.randomUUID()`). Every domain table has `dentist_id → user.id` and `created_at`/`updated_at`. Money columns are integer centavos.

| Table | Key columns | Notes |
|---|---|---|
| `user`, `session`, `account`, `verification` | Better Auth tables. `user` adds `role` (`admin`/`dentist`), `prc_license`, `phone`, `reminder_hours` (default 24), `banned` | Admin plugin manages ban/role |
| `workplaces` | `name`, `address`, `phone`, `type` (`own`/`partner`), `commission_pct` (0–100), `deduct_lab_fees`, `color`, `active` | Belongs to a dentist |
| `patients` | `code` (`P-0001`, unique per dentist), names, `birthdate`, `sex`, `phone`, `email`, `address`, `occupation`, emergency contact, `allergies`, `medical_conditions`, `medications`, `notes`, `consent_at`, `reminders_opt_in`, `archived_at` | GIN `pg_trgm` index on `search_text` (generated: names + phone + code) |
| `chart_entries` | `patient_id`, `tooth` (FDI int), `surfaces` (text[] of M/O/D/B/L/I), `condition`, `status` (`existing`/`planned`/`done`), `date`, `notes` | |
| `treatments` | `patient_id`, `workplace_id`, `date`, `teeth` (int[]), `procedure`, `notes`, `fee`, `lab_fee` | Fees add to the balance |
| `attachments` | `patient_id`, `kind` (`xray`/`photo`/`document`), `r2_key`, `filename`, `mime`, `size`, `taken_at`, `notes`, `uploaded` | `uploaded=false` until the client confirms |
| `appointments` | `patient_id`, `workplace_id`, `starts_at`, `ends_at`, `reason`, `status`, `notes`, `reminder_sent_at` | Index on `(dentist_id, starts_at)` |
| `payments` | `patient_id`, `workplace_id`, `date`, `amount`, `method`, `reference`, `collected_by` (`me`/`clinic`), `notes` | |
| `payouts` | `workplace_id`, `period_start`, `period_end`, `amount`, `date`, `notes` | Money received from a partner clinic |
| `expenses` | `workplace_id`, `date`, `category`, `amount`, `notes` | |
| `inventory_items` | `workplace_id`, `name`, `category`, `unit`, `reorder_level`, `unit_cost`, `active` | |
| `stock_movements` | `item_id`, `date`, `qty` (signed), `type` (`restock`/`use`/`adjust`), `reason`, `treatment_id?` | Stock = `sum(qty)` |
| `audit_log` | `actor_id`, `action`, `entity`, `entity_id`, `at`, `details` (jsonb) | |

**Tenant rule:** every query in `src/server/data/*` filters `dentist_id = actor.id` unless `actor.role = 'admin'`. Writes set `dentist_id` from the actor. Child rows (e.g. a payment) also check that the referenced patient/workplace belongs to the same dentist.

**Derived values (not stored):**
- Patient balance = `sum(treatments.fee) − sum(payments.amount)`.
- Stock on hand = `sum(stock_movements.qty)` per item.
- Earnings per workplace and period (`src/lib/earnings.ts`, tested in `earnings.test.ts`). Fees and lab fees count by treatment date, collections by payment date:
  - `gross = sum(fee)`, `collected = sum(non-voided payments)`, `labFees = sum(lab_fee)`
  - Partner clinic: `base = max(0, collected − (deduct_lab_fees ? labFees : 0))`, `share = base × commission_pct / 100`, `owedByClinic = share − collectedByMe − payouts` (what she collected herself is already in her hands; negative means she owes the clinic), `net = share − expenses`.
  - Own clinic: `share = collected`, `net = collected − labFees − expenses`.

## APIs and services

### Server actions (by route)
- `patients`: create, update, archive/restore patient. Add/edit chart entry. Add/edit treatment. Add payment. Confirm/delete-pending attachment.
- `appointments`: create, update, change status, send reminder now.
- `earnings`: add payout, add expense.
- `inventory`: add/edit item, add movement.
- `settings`: update profile, add/edit workplace, set reminder hours, change password.
- `admin/users`: create dentist, ban/unban, reset password.

### Route handlers
| Route | Purpose |
|---|---|
| `GET/POST /api/auth/[...all]` | Better Auth (sign in/out, session, password reset) |
| `POST /api/files/upload` | Ownership check + validation → `{ attachmentId, url }` presigned PUT |
| `GET /api/files/[id]` | Ownership check → 302 to a presigned GET |
| `GET /api/cron/reminders` | Requires `Authorization: Bearer $CRON_SECRET`. Sends due reminders |
| `PUT /api/files/[id]/content` | Development only: receives the file body when R2 isn't configured (stored in `./.uploads`) |
| `GET /api/export/patients`, `/api/export/earnings?month=YYYY-MM` | CSV for the session dentist (patient exports are written to the audit log) |

### Services
- **Better Auth**: email/password, Drizzle adapter, `admin` plugin (roles, ban, create user), sign-up disabled for the public. Password reset via Resend.
- **Cloudflare R2** via `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`. Keys are `dentistId/patientId/uuid.ext`. Allowed types: jpg, png, webp, heic, pdf, dcm. Max 20 MB.
- **Resend**: `EMAIL_FROM` on the verified domain. Templates are plain TypeScript functions returning escaped HTML + a text version (`src/server/email/templates.ts`). Without Resend configured, emails are printed to the server console.
- **Reminder cron** (`vercel.json`, daily at 00:00 UTC = 8:00 AM Manila, because Vercel Hobby only allows daily crons): selects `scheduled` appointments with `reminder_sent_at is null` and `starts_at` between now and now + the dentist's `reminder_hours` + `REMINDER_SLACK_HOURS` (default 24, so nothing falls between daily runs), where the patient has an email and `reminders_opt_in`. Each appointment is claimed (`reminder_sent_at` set) before sending and released if the send fails. On Vercel Pro, switch the schedule to hourly (`0 * * * *`) and set `REMINDER_SLACK_HOURS=0`.

## Environment variables

See the table in [README.md](../README.md#environment-variables). All are parsed by `src/lib/env.ts`. A missing variable fails fast at startup, except R2/Resend, which only fail when that feature is used, so the app can run locally before those accounts exist.
