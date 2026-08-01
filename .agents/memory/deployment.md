---
name: Deployment Setup
description: GitHub + Vercel + Render deployment configuration and lessons learned
---

# Deployment Setup

## Frontend — Vercel
- Project name: `programacao-entrega`
- Vercel team: `reinaldoromero2carga-facil` (Hobby)
- Deployed via URL import from `reinaldoromero02/Data-Fill-Tool` (GitHub)
- `VITE_API_URL = https://programa-odeentrega.onrender.com`
- `vercel.json` at repo root handles build command, output dir, SPA rewrites

## Backend — Render
- Service name: `programa-odeentrega`
- URL: `https://programa-odeentrega.onrender.com`
- Build: `pnpm install && pnpm --filter @workspace/api-server run build`
- Start: `node --enable-source-maps artifacts/api-server/dist/index.mjs`
- Requires: `DATABASE_URL` (Render Postgres), `SESSION_SECRET`, `NODE_ENV=production`

## GitHub
- Repo: `https://github.com/reinaldoromero02/Data-Fill-Tool`
- GitHub username: `reinaldoromero02` (with zero)
- Replit gitPush only works to repos the Replit GitHub App is authorized for

**Why:** Deploying via Vercel's "URL import" flow (vercel.com/new paste URL) bypassed
the GitHub App account mismatch issue. Always use this path when Vercel's GitHub
integration shows wrong account.

## Key lesson
Vercel's team name (`reinaldoromero2carga-facil`) ≠ GitHub username (`reinaldoromero02`).
The team's connected GitHub scope can be a different account than the repo owner.
URL-based import works around this by cloning the public repo directly.
