# DentalKeep

A paperless, private records app for solo dentists in the Philippines. Each dentist gets their own account with patient records, a dental chart, X-rays and files, appointments with email reminders, billing, earnings per workplace (own clinic vs. partner clinic commission) and inventory.

Built first for one pilot dentist who works at a partner clinic and runs her own clinic at home. It is designed so more individual dentists can be added later, each seeing only their own data.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui, Inter font, light / Discord-like dark theme |
| Database | Neon Postgres via Drizzle ORM (`@neondatabase/serverless`) |
| Auth | Better Auth (email + password, admin-created accounts) |
| File storage | Cloudflare R2 (private bucket, presigned URLs) |
| Email | Resend + React Email (appointment reminders, password reset) |
| Scheduler | Vercel Cron (hourly reminder job) |
| Validation | Zod |
| Tests | Vitest (data layer), Playwright (end-to-end) |
| Hosting | Vercel |

## Prerequisites

- Node.js 22 LTS
- pnpm 10 (`npm i -g pnpm`)
- Accounts: [Neon](https://neon.tech), [Cloudflare R2](https://developers.cloudflare.com/r2/), [Resend](https://resend.com) (with your domain verified)

## Setup

```bash
git clone <repo-url> dentalkeep
cd dentalkeep
pnpm install
cp .env.example .env.local      # then fill in the values (see below)
pnpm db:migrate                 # create tables in Neon
pnpm db:seed                    # create the first admin account
pnpm dev                        # http://localhost:3000
```

### Environment variables

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Neon dashboard → Connection string (pooled) |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `http://localhost:3000` locally, your domain in production |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | Cloudflare → R2 → Manage API tokens (scope the token to this bucket only) |
| `RESEND_API_KEY`, `EMAIL_FROM` | Resend dashboard; `EMAIL_FROM` like `DentalKeep <reminders@yourdomain.com>` |
| `CRON_SECRET` | Any long random string; Vercel sends it to the cron route |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME` | Used once by `pnpm db:seed` |

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Start the dev server |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest unit + data-layer tests |
| `pnpm test:e2e` | Playwright end-to-end tests |
| `pnpm db:generate` | Generate a migration from `src/db/schema.ts` |
| `pnpm db:migrate` | Apply migrations to `DATABASE_URL` |
| `pnpm db:seed` | Create the admin account |
| `pnpm db:studio` | Browse the database with Drizzle Studio |

## Project structure

```
src/
  app/            pages, layouts, server actions (thin: validate → call data layer)
  app/api/        auth, uploads, cron, exports
  components/     shared UI (shadcn/ui primitives + app components)
  server/
    auth.ts       Better Auth config + requireUser()/requireAdmin()
    data/         one file per domain; the only code that touches the DB
    email/        Resend client + email templates
    storage.ts    R2 client + presign helpers
  db/
    schema.ts     Drizzle schema
    index.ts      Neon + Drizzle client
  lib/            Zod schemas, money/date formatting (en-PH, Asia/Manila)
drizzle/          SQL migrations
docs/             context, architecture, design
mockup/           clickable HTML mockup used as the visual reference
```

## Documentation

- [docs/context.md](docs/context.md): vision, users, features, user flows, constraints
- [docs/architecture.md](docs/architecture.md): system overview, structure, database, APIs and services
- [docs/design.md](docs/design.md): design system and theming
- [AGENTS.md](AGENTS.md): coding standards and repo rules (for people and AI agents)
