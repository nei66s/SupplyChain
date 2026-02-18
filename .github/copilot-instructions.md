# Copilot / AI Coding Instructions — SupplyChain

Short, actionable guidance to get an AI-coding agent productive in this repository.

## Quick start (commands)
- Install & dev: `npm install` then `npm run dev` (app runs on port 9002).
- Typecheck: `npm run typecheck` (runs `tsc --noEmit`).
- Lint: `npm run lint` (project ESLint rules).
- Build: `npm run build` (Next.js build) and `npm run postbuild` runs deploy hooks.
- Useful scripts: `node scripts/run-migrations.js`, `node scripts/seed-legacy-materials.js`, `node scripts/seed-operators.js`, `npm run clear-db`.

## Big-picture architecture
- Frontend: Next.js App Router using the `app/` directory. Pages and layouts live under `app/`.
- Server/API: Route handlers are server-side in `app/api/*` using Next's route functions (see `app/api/orders/route.ts` for an example).
- Data access: server handlers call the DB layer (`src/lib/db.ts`) and repository modules (`src/lib/repository/*`) which contain raw SQL and transformation logic.
- Domain model: canonical types live in `src/lib/domain/types.ts` — use these when returning or asserting API shapes.

## Key patterns and conventions (project-specific)
- SQL-in-repo: Queries are written inline inside repository modules (e.g. `src/lib/repository/orders.ts`). SQL -> rows -> transform -> domain type is the normal flow.
- Row normalization: repository modules commonly implement small normalization helpers (e.g. `normalizeStatus`, `computeReadiness`) — prefer reusing these patterns when adding new endpoints.
- Perf logging: use `process.hrtime.bigint()` and the `logRepoPerf()` pattern in `src/lib/repository/perf.ts` when instrumenting repo queries; `DEBUG_PERF` env enables verbose logs.
- Auth: cookie-based JWT handled in `src/lib/auth.ts`. Cookie name: `sc-session`. For server handlers call `requireAuth(req)` to get `{ userId, role }`.
- Reservation TTL: reservation/time-related constants live in `src/lib/domain/types.ts` (see `RESERVATION_TTL_MS`).

## Environment & infra notes
- DB connection: `src/lib/db.ts` prefers `DATABASE_URL`. If not set, it requires `PGHOST`, `PGUSER`, `PGDATABASE` (and optional `PGPASSWORD`, `PGPORT`).
- Auth secret: `AUTH_SECRET` or `NEXTAUTH_SECRET` is used by `src/lib/auth.ts` (defaults to `dev-secret` in dev).
- Dev server port is pinned in `package.json` (`next dev -p 9002`). Production `next start` uses port 3000 by default.

## Where to look for examples
- API design / serialization: [app/api/orders/route.ts](app/api/orders/route.ts)
- DB pool & query helper: [src/lib/db.ts](src/lib/db.ts)
- Repository conventions: [src/lib/repository](src/lib/repository)
- Domain types & constants: [src/lib/domain/types.ts](src/lib/domain/types.ts)
- Auth helpers: [src/lib/auth.ts](src/lib/auth.ts)
- Migration & seeds: [scripts/run-migrations.js](scripts/run-migrations.js) and `scripts/seed-*.js`

## Scope & responsibilities for AI edits
- Avoid changing SQL semantics silently — modify SQL only when tests or manual validation are possible.
- Keep repository transformation logic explicit: prefer small, well-named helpers and preserve `id` prefixes (e.g. `O-<id>`, `M-<id>`, `AUD-<id>`).
- When adding new API surfaces mirror the `app/api/*/route.ts` structure: validate input, call repository functions, map to domain types, handle errors with a JSON `{ error }` response and appropriate HTTP status.

## Useful tips for PRs
- Run `npm run typecheck` & `npm run lint` before submitting.
- If changing DB schema, add SQL migration under `migrations/` and update seed scripts if necessary.

If anything here is unclear or you want me to expand a section (examples, stricter lint rules, or a checklist for PRs), tell me which part to iterate on.
