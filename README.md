# Audio-to-Text

A SaaS that transcribes audio to text using the OpenAI Whisper API.

> **Status:** under active development — see [`phases.md`](./phases.md) for the full roadmap.

## Architecture

A **pnpm + Turborepo monorepo** with a clean split between the user-facing web
app and the heavy background processing:

```
Audio-to-Text/
├── apps/
│   ├── web/          Next.js 14 (App Router) — UI, API routes, auth
│   └── worker/       Node service — consumes the queue, calls Whisper
├── packages/
│   ├── db/           Prisma schema + shared PrismaClient singleton
│   └── shared/       Framework-agnostic types + zod env validation
├── legacy/           Original Python prototype (superseded)
├── turbo.json        Turborepo task pipeline
├── pnpm-workspace.yaml
└── tsconfig.base.json  Shared strict TypeScript config
```

### Why this shape?

- **`apps/web` vs `apps/worker`** — transcribing long audio can take minutes,
  which exceeds serverless function time limits. The web app stays fast and
  just enqueues jobs; the long-running work happens in a separate worker.
- **`packages/shared`** — one source of truth for domain types (transcription
  status, plan limits, audio constraints) and env validation, so web and worker
  can't drift apart.
- **`packages/db`** — a single Prisma client shared by both apps.

## Tech stack

| Concern       | Choice                                        |
| ------------- | --------------------------------------------- |
| Frontend      | Next.js 14 + React 18 + TypeScript + Tailwind |
| Backend API   | Next.js API routes (light) + worker (heavy)   |
| Auth          | Clerk                                         |
| Database      | PostgreSQL (Supabase) + Prisma                |
| Queue         | BullMQ + Redis (Upstash)                      |
| Transcription | OpenAI Whisper (`whisper-1`)                  |
| Payments      | Stripe *(deferred — not wired yet)*           |

## Getting started

```bash
# 1. Install dependencies (from repo root)
pnpm install

# 2. Configure environment
cp .env.example .env
#   ...fill in real values (see .env.example for every key)

# 3. Run everything in dev
pnpm dev
```

Per-app dev:

```bash
pnpm --filter @audio-to-text/web dev
pnpm --filter @audio-to-text/worker dev
```

## Environment variables

Every required key is documented in [`.env.example`](./.env.example). Env vars
are validated with **zod** at startup (`packages/shared/src/env.ts`), so a
missing key fails fast with a clear message.

### ⚠️ Redis note

The web app uses the **Upstash REST** client (`UPSTASH_REDIS_REST_URL` +
`_TOKEN`). BullMQ in the worker needs a **native Redis (TLS)** connection
string instead — a `REDIS_URL` of the form `rediss://...`. Both come from the
same Upstash database; grab the `rediss://` URL from the Upstash console when
wiring the queue in Phase 6.

## Scripts (root)

| Command          | What it does                           |
| ---------------- | -------------------------------------- |
| `pnpm dev`       | Run all apps in watch mode (Turborepo) |
| `pnpm build`     | Build all apps/packages                |
| `pnpm lint`      | Lint everything                        |
| `pnpm typecheck` | Type-check everything                  |
| `pnpm format`    | Format with Prettier                   |
