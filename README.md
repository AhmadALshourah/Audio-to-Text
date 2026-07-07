# Audio-to-Text

[![CI](https://github.com/AhmadALshourah/Audio-to-Text/actions/workflows/ci.yml/badge.svg)](https://github.com/AhmadALshourah/Audio-to-Text/actions/workflows/ci.yml)

A self-contained SaaS that transcribes audio to text using the OpenAI Whisper
API — sign up, upload a file, get a transcript with SRT/VTT subtitles, in
English or Arabic (RTL), all backed by nothing but a local SQLite file and
the filesystem. No cloud database, no external auth provider, no managed
queue.

> **Status:** under active development — see [`phases.md`](./phases.md) for the full roadmap.

## Architecture

A **pnpm + Turborepo monorepo** with a clean split between the user-facing web
app and the background transcription work:

```
Audio-to-Text/
├── apps/
│   ├── web/          Next.js 14 (App Router) — UI, API routes, self-built auth
│   └── worker/       Node service — polls SQLite for jobs, calls Whisper
├── packages/
│   ├── db/           Prisma schema (SQLite) + shared PrismaClient singleton
│   ├── core/         Business logic: auth, quota, uploads, transcription
│   └── shared/       Framework-agnostic types, crypto helpers, env validation
├── legacy/
│   └── python-prototype/  Original single-file Python script (superseded)
├── data/uploads/      Transient local audio storage (gitignored)
├── turbo.json         Turborepo task pipeline
├── pnpm-workspace.yaml
└── tsconfig.base.json Shared strict TypeScript config
```

### Why this shape?

- **SQLite over a hosted database** — one file, zero network dependency, and
  it's more than enough for this project's scale. `packages/db/prisma/schema.prisma`
  is the single source of truth.
- **A polling worker instead of a managed queue** — the worker atomically
  claims the oldest `pending` row (`claimNextTranscription`) instead of relying
  on Redis/BullMQ. Transcribing audio can take a while, which is why this work
  happens outside the request/response cycle at all.
- **Self-built auth** — email + password, hashed with Node's built-in `scrypt`
  (`packages/shared/src/crypto.ts`), sessions are a random token whose SHA-256
  hash is stored server-side (`Session` table) and set as an httpOnly cookie.
  No third-party auth provider. Users can permanently delete their own
  account (and everything derived from it) from the dashboard — see the
  in-app `/privacy` page for exactly what that removes.
- **Local filesystem for audio** — files are written to `data/uploads/` on
  upload, read once by the worker, and deleted immediately after processing
  (success or permanent failure). Only the transcribed text is kept long-term.
- **`packages/core`** — all business logic (auth, quota, validation, storage,
  transcription orchestration) lives here, framework-agnostic, so both the web
  app and the worker import the exact same functions instead of duplicating logic.
- **`packages/shared`** — one source of truth for domain types (transcription
  status, plan limits, audio constraints, upload validation rules) so nothing
  can drift — including between the server and the client-side dropzone.
- **i18n (English + Arabic)** — every route lives under `apps/web/src/app/
  [locale]/` via `next-intl`; `/` redirects to the default locale, `dir="rtl"`
  is set automatically for Arabic, and a locale switcher preserves the
  current path. Legal pages (Privacy/Terms) stay English-only by design.

## Tech stack

| Concern        | Choice                                                   |
| --------------- | --------------------------------------------------------- |
| Frontend        | Next.js 14 + React 18 + TypeScript + Tailwind + framer-motion |
| i18n            | next-intl (English + Arabic, RTL)                          |
| Backend API     | Next.js API routes (web) + a polling worker (heavy work)   |
| Auth            | Self-built — scrypt password hashing + signed session cookie |
| Database        | SQLite + Prisma                                            |
| Job processing  | Custom polling worker (atomic claim, no external queue)    |
| File storage    | Local filesystem, deleted after processing                 |
| Transcription   | OpenAI Whisper (`whisper-1`) — the only external dependency |
| Export          | Plain text, plus SRT/VTT subtitles with real timestamps    |
| Payments        | None — free-only by design (see `phases.md`, Phase 9)       |

## Getting started

```bash
# 1. Install dependencies (from repo root)
pnpm install

# 2. Configure environment
cp .env.example .env
#   ...fill in OPENAI_API_KEY and an absolute UPLOADS_DIR path (see .env.example)

# 3. Create the SQLite database
pnpm --filter @audio-to-text/db db:push
pnpm --filter @audio-to-text/db db:seed   # optional demo user

# 4. Run everything in dev
pnpm dev
```

Per-app dev:

```bash
pnpm --filter @audio-to-text/web dev
pnpm --filter @audio-to-text/worker dev
```

The web app needs the worker running alongside it to actually finish
transcriptions — uploads are accepted immediately (`202 Accepted`, status
`pending`) and processed asynchronously once the worker picks them up.

## Environment variables

Every required key is documented in [`.env.example`](./.env.example). Env vars
are validated with **zod** at startup (`packages/shared/src/env.ts`), so a
missing key fails fast with a clear message. The **only external service** is
OpenAI — everything else runs on your machine.

## Testing

```bash
pnpm test
```

67 tests across three packages (Vitest): unit tests for crypto, validation,
errors, rate limiting, and open-redirect protection; integration tests for
auth (including account deletion), quota, and the full transcription
lifecycle — including SRT/VTT rendering — running against a real, throwaway
SQLite database (created and torn down automatically — see
`packages/core/test/global-setup.ts`). The only mocked dependency is the
OpenAI Whisper call itself, so tests never cost money or need network access.

## Scripts (root)

| Command          | What it does                            |
| ---------------- | ---------------------------------------- |
| `pnpm dev`       | Run all apps in watch mode (Turborepo)   |
| `pnpm build`     | Build all apps/packages                  |
| `pnpm lint`      | Lint everything                          |
| `pnpm typecheck` | Type-check everything                    |
| `pnpm test`      | Run the full test suite                  |
| `pnpm format`    | Format with Prettier                     |

## CI

Every push and pull request to `main` runs lint, typecheck, the full test
suite, and a production build via GitHub Actions (`.github/workflows/ci.yml`).
