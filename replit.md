# Sistema de Propostas Comerciais — Rádio 88 FM

A commercial proposals management system for radio station sales teams. Create, edit, and track proposals with A4 PDF preview, category-based templates, and role-based access.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/proposta run dev` — run the frontend (port 21709)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm db:generate` — generate Prisma Client
- `pnpm db:push` — push Prisma schema changes to Postgres (dev only)
- `pnpm seed` — seed the database with initial data
- `docker compose up --build` — run Postgres + API + frontend locally
- Required env: `DATABASE_URL` — Postgres connection string

## Default Credentials

- Admin: `admin@radio88fm.com.br` / `Admin@123`
- Comercial: `carlos@radio88fm.com.br` / `Comercial@123`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Wouter + Zustand + TanStack Query
- API: Express 5
- DB: PostgreSQL + Prisma ORM
- Validation: Zod (zod/v4)
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/db/prisma/schema.prisma` — Prisma ORM schema (users, stations, advertisers, products, categories, templates, proposals)
- `lib/db/src/index.ts` — Prisma Client singleton exported as `prisma`
- `lib/api-client-react/src/` — generated React Query hooks (do not edit directly; run codegen)
- `lib/api-zod/src/` — generated Zod schemas (do not edit directly; run codegen)
- `artifacts/api-server/src/routes/` — all Express route handlers
- `artifacts/proposta/src/pages/` — all frontend pages
- `artifacts/proposta/src/components/` — shared UI components including ProposalPreview (A4 renderer)
- `artifacts/proposta/src/store/auth.ts` — Zustand auth store (persisted to sessionStorage)
- `scripts/src/seed.ts` — database seed script

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → typed hooks and Zod validators
- JWT auth: 15min access token (in-memory via Zustand) + 7d refresh token (httpOnly cookie)
- All API routes under `/api` prefix, frontend served at `/`
- Proposal products and stats stored as JSON/arrays in the proposals table for flexible editing
- Version snapshots saved on every proposal update (max 50 per proposal, oldest pruned)
- DB enums: userRoleEnum (ADMIN/COMERCIAL), productColorEnum (BLUE/YELLOW/RED/GREEN/DARK), proposalStatusEnum (DRAFT/SENT/APPROVED/REJECTED/ARCHIVED)

## Product

- **Dashboard**: Stats overview + recent proposals + Nova Proposta CTA
- **Proposal editor**: Split-panel with live A4 preview, auto-save (2s debounce + 30s interval), PDF export via window.print()
- **Category system**: Proposals organized by category (Veicular, Varejo, Saúde, Alimentação, Construção, Serviços) with templates
- **Advertiser management**: CRUD with logo upload (base64)
- **Admin panel**: Users, station settings, product templates, proposal categories, proposal templates

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec change before editing routes or frontend
- Deep imports from `@workspace/api-client-react/src/...` are NOT supported — always import from `@workspace/api-client-react` (the main export)
- Run `pnpm db:generate && pnpm db:push` after any schema change in `lib/db/prisma/schema.prisma`
- The `build` script in artifact packages requires `PORT` and `BASE_PATH` env vars — use `typecheck` instead for CI-style checks
- Docker local services: Postgres `localhost:5433`, API `http://localhost:8080`, frontend `http://localhost:21709`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- OpenAPI spec: `lib/api-spec/openapi.yaml`
