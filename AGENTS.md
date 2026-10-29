# AGENTS.md

Rules for anyone (human or AI agent) changing this repo. Read [docs/context.md](docs/context.md) and [docs/architecture.md](docs/architecture.md) before a non-trivial change, and [docs/design.md](docs/design.md) before UI work.

## Coding standards

- TypeScript `strict`. No `any`, no `@ts-ignore`; use `unknown` and narrow.
- Server components by default. Add `"use client"` only to the smallest component that needs state, effects or browser APIs.
- Server actions stay thin: parse input with Zod → call a data-layer function → `revalidatePath` / `redirect`.
- Return typed results from actions (`{ ok: true, data } | { ok: false, error }`). Don't throw for expected validation errors.
- Keep components small. If a page file passes ~200 lines, split it into components under that route.
- Style with Tailwind utilities that use the design tokens (`bg-surface`, `text-muted`, `border-border`). Never hard-code hex colours in components.
- Don't add a dependency when a few lines will do; ask before adding a large one.

## Naming conventions

| Thing | Convention | Example |
|---|---|---|
| Files and folders | kebab-case | `patient-form.tsx`, `stock-movements.ts` |
| React components | PascalCase | `PatientForm` |
| Functions, variables | camelCase | `listPatients`, `dentistId` |
| Constants | UPPER_SNAKE_CASE | `MAX_UPLOAD_BYTES` |
| DB tables and columns | snake_case in SQL, camelCase in TS (Drizzle maps them) | `chart_entries.tooth_number` ↔ `toothNumber` |
| Zod schemas | `<thing>Schema` | `patientInputSchema` |
| Server actions | verb + noun + `Action` | `createPatientAction` |
| Data-layer functions | verb + noun | `getPatient`, `createPayment` |

## Repo rules (non-negotiable)

1. **All DB access goes through `src/server/data/*`.** Pages, actions and route handlers never import `db` directly.
2. **Every data-layer function scopes by `dentistId`.** It receives the session `Actor` from `requireUser()` and adds `eq(table.dentistId, actor.id)` unless `actor.role === "admin"`. Writes always set `dentistId` from the actor, never from user input.
3. **Validate every server-action and route-handler input with Zod.**
4. **Money is stored as integer centavos** (`bigint`/`integer`), formatted only at the edge with `formatPeso()`.
5. **Dates are stored in UTC** (`timestamptz`) and shown in `Asia/Manila` with the helpers in `src/lib/format.ts`. Pure calendar dates (birthdate, treatment date) use `date` columns.
6. **Files:** R2 objects are private. The only way to reach one is a fresh presigned URL (≤ 5 minutes) created after an ownership check. Never store or log presigned URLs.
7. **No hard deletes from the UI.** Patients are archived (`archivedAt`). Rows that represent money or stock are corrected with a reversing entry, not deleted.
8. **Audit:** create/update/archive of patients, treatments, payments, payouts and stock goes through `audit()` in the same data-layer function.
9. **Privacy:** reminder emails contain no clinical details. Don't put patient data in URLs beyond the patient id.
10. **Secrets** live only in env vars, read through `src/lib/env.ts`. Never commit `.env*` files except `.env.example`.

## How to implement a task

1. Read the relevant docs and the existing code for that domain.
2. Schema change? Edit `src/db/schema.ts`, run `pnpm db:generate`, and review the SQL in `drizzle/`.
3. Add or extend the data-layer function in `src/server/data/<domain>.ts`, with a Vitest test (tenant isolation for anything new that reads or writes rows).
4. Add the Zod schema in `src/lib/validation/` and the server action next to the route that uses it.
5. Build the UI with the design tokens and existing components. Check light and dark mode and phone width.
6. Update docs in the same commit if behaviour, env vars, routes or tables changed.
7. Run `pnpm lint && pnpm typecheck && pnpm test` and fix everything before committing.

## Git

- [Conventional Commits](https://www.conventionalcommits.org): `feat(scope): …`, `fix(scope): …`, `docs: …`, `chore: …`, `test: …`, `refactor: …`.
- One logical change per commit; small PRs.
- `pnpm lint && pnpm typecheck && pnpm test` must pass before committing.
- Never commit secrets, `.env.local`, or real patient data (seed and test data are fictional).
