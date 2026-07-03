# Programação de Entrega

A daily logistics delivery scheduling app ("Controle Logístico Diário") built in Portuguese.

## Stack

- **Frontend**: React + Vite + Tailwind CSS v4 + shadcn/ui (`artifacts/programacao-entrega`)
- **API**: Express 5 + TypeScript, built with esbuild (`artifacts/api-server`)
- **Database**: PostgreSQL via Drizzle ORM (`lib/db`)
- **Shared libs**: `lib/api-spec` (OpenAPI), `lib/api-zod` (Zod schemas), `lib/api-client-react` (React Query hooks)
- **Package manager**: pnpm workspace

## How to run

All workflows are configured and start automatically:

| Workflow | Command |
|---|---|
| `artifacts/programacao-entrega: web` | `pnpm --filter @workspace/programacao-entrega run dev` |
| `artifacts/api-server: API Server` | `pnpm --filter @workspace/api-server run dev` |

## Database

Uses Replit's built-in PostgreSQL. Schema is managed with Drizzle Kit.

- Push schema changes: `cd lib/db && pnpm run push`
- Tables: `entregas` (deliveries), `motoristas` (drivers)

## Key environment variables

- `DATABASE_URL` — provided automatically by Replit
- `SESSION_SECRET` — set in Replit Secrets
- `PORT` — set per-artifact by Replit

## User preferences

_(none recorded yet)_
