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
| Email | Resend (appointment reminders, password reset); templates are plain TS functions |
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

**No accounts yet?** Leave `DATABASE_URL` empty and the app uses an embedded Postgres ([PGlite](https://pglite.dev)) stored in `./.pglite`. Migrations are applied to it automatically when `pnpm dev` starts (`src/instrumentation.ts`). Tests always use a fresh in-memory PGlite database. Leave the Resend variables empty and emails are printed to the server console instead of sent.

### Environment variables

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Neon dashboard → Connection string (pooled) |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `http://localhost:3000` locally, your domain in production |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | Cloudflare → R2 → Manage API tokens (scope the token to this bucket only) |
| `RESEND_API_KEY`, `EMAIL_FROM` | Resend dashboard; `EMAIL_FROM` like `DentalKeep <reminders@yourdomain.com>` |
| `CRON_SECRET` | Any long random string; Vercel sends it to the cron route |
| `REMINDER_SLACK_HOURS` | `24` with the daily cron on Vercel Hobby; `0` if you switch to an hourly cron on Pro |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME` | Used once by `pnpm db:seed` |

### Cloudflare R2 (X-rays and files)

1. Cloudflare dashboard → R2 → **Create bucket** (e.g. `dentalkeep-files`). Leave public access **off**.
2. R2 → **Manage API tokens** → create a token with **Object Read & Write**, scoped to that bucket only. Copy the access key ID and secret into `.env.local`, and your account ID into `R2_ACCOUNT_ID`.
3. Bucket → Settings → **CORS policy**, so the browser can upload directly:

   ```json
   [
     {
       "AllowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
       "AllowedMethods": ["PUT", "GET"],
       "AllowedHeaders": ["Content-Type"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

Without R2 settings, development stores files in `./.uploads` (gitignored) so you can try the feature. Production refuses to start uploads until R2 is configured.

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
e2e/              Playwright end-to-end test
scripts/          migrate and seed scripts
docs/             context, architecture, design
mockup/           clickable HTML mockup used as the visual reference
```

## Deployment (Vercel + Neon + Resend + R2)

1. **Neon:** create a project (Singapore is the closest region to the Philippines). Copy the **pooled** connection string.
2. **Migrate and seed** from your computer against Neon:

   ```bash
   DATABASE_URL="postgres://…" pnpm db:migrate
   ```

   ```bash
   DATABASE_URL="postgres://…" SEED_ADMIN_EMAIL=you@yourdomain.com SEED_ADMIN_PASSWORD="…" pnpm db:seed
   ```

   Run `pnpm db:migrate` again whenever a new migration is added to `drizzle/`.

   `neon.ts` and the gitignored `.neon` folder come from `neon init` and only describe Neon branch settings (new branches expire after 7 days). The app itself only needs `DATABASE_URL`. `neon deploy` (after `neon login`) is optional.
3. **Resend:** add your domain and create the DNS records it lists (SPF, DKIM, optionally DMARC) at your domain registrar. Once it shows *Verified*, set `EMAIL_FROM` to an address on that domain.
4. **R2:** follow [Cloudflare R2](#cloudflare-r2-x-rays-and-files) above, and add your production domain to the CORS `AllowedOrigins`.
5. **Vercel:** import the Git repository (framework Next.js, install command `pnpm install`). Add every variable from `.env.example` under *Settings → Environment Variables*, with `BETTER_AUTH_URL=https://yourdomain.com`, then deploy.
6. **Domain:** Vercel → *Settings → Domains* → add `yourdomain.com` and follow its DNS instructions. HTTPS is automatic.
7. **Reminders:** `vercel.json` schedules `/api/cron/reminders` daily at 00:00 UTC (8:00 AM Manila), and Vercel sends `CRON_SECRET` with each call. To trigger it by hand:

   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" https://yourdomain.com/api/cron/reminders
   ```

**Plans and limits**

- Vercel **Hobby is for non-commercial use** and only allows **daily** crons. It's fine for the pilot. Before charging any dentist, move to **Pro** ($20/mo). Then you can switch the cron to hourly (`"0 * * * *"`) and set `REMINDER_SLACK_HOURS=0`.
- Neon free tier: 0.5 GB, plenty for text records. Backups come from Neon point-in-time restore, plus *Settings → Export your data* for your own CSV copies.
- R2 free tier: 10 GB of files, with no charge for downloads.

## Testing

- `pnpm test`: unit and data-layer tests. Each test file gets its own in-memory database, so no setup is needed.
- `pnpm test:e2e`: the full browser flow in `e2e/`. It starts its own dev server on port 3100 with a fresh database, so stop `pnpm dev` first. The first time, run `pnpm exec playwright install chromium`. On Windows, run it from PowerShell or cmd, not Git Bash.

## Documentation

- [docs/context.md](docs/context.md): vision, users, features, user flows, constraints
- [docs/architecture.md](docs/architecture.md): system overview, structure, database, APIs and services
- [docs/design.md](docs/design.md): design system and theming
- [AGENTS.md](AGENTS.md): coding standards and repo rules (for people and AI agents)
