# Issues Backlog

Full-project audit, done in one pass (5 parallel review angles: correctness/edge
cases, security, i18n + missing UX flows, test coverage + accessibility,
operational/scalability limits — plus direct manual verification of the
highest-signal claims). Deployment is deliberately out of scope here — see
`phases.md` Phase 14 for that.

Each item is tagged with how confident we are:

- **Confirmed** — read the actual code and reproduced/verified the claim.
- **Plausible** — a reviewing agent's finding that holds up on inspection but
  wasn't independently reproduced.

Two review agents made claims that turned out to be **wrong** on direct
verification; they're listed at the bottom under "Checked, not real issues"
instead of silently dropped, since that's useful information too.

---

## 🔴 Critical

### 1. Free-plan quota never actually renews monthly — it's a lifetime cap
**Files:** `packages/core/src/auth-service.ts:58-59`, `packages/core/src/quota.ts:27`
**Confirmed** (grepped the whole codebase for every write to `currentPeriodStart`/`currentPeriodEnd` — there is exactly one, at signup).

`Subscription.currentPeriodStart` is set once when a user registers and is
**never updated anywhere else in the codebase**. `getQuotaStatus()` sums usage
with `createdAt: { gte: currentPeriodStart }` — since that date never moves,
a free user's "30 minutes per month" is actually **30 minutes total, ever**.
Once used, they're permanently locked out; the quota never resets on a new
calendar month. This breaks the core promise on the pricing page and landing
copy ("Free plan includes 30 minutes of audio every month").

**Fix direction:** a scheduled job (or lazy check-on-read: "if now >
currentPeriodEnd, roll the period forward and reset") that advances
`currentPeriodStart`/`currentPeriodEnd` by one month when the period lapses.

---

## 🟠 High priority

### 2. A worker crash mid-job leaves the transcription stuck in `processing` forever
**Files:** `packages/core/src/transcription-service.ts:61-75`, `apps/worker/src/index.ts`
**Confirmed** — `claimNextTranscription()` only ever selects `status: 'pending'`
rows. Once a job flips to `processing`, nothing ever looks at it again unless
the *same* worker process finishes its `try/catch` in `processTranscription`.
A graceful shutdown (SIGINT/SIGTERM) is safe (the loop finishes the current
job first), but a hard kill (OOM, `SIGKILL`, VPS restart, crash) leaves the
row — and its audio file, still referenced by `audioPath` — orphaned
indefinitely. The user's dashboard shows "processing" forever with no
recovery path.

**Fix direction:** on worker startup, reclaim any `processing` row whose
`updatedAt` is older than some grace period (e.g. 10 minutes) back to
`pending`; or track a heartbeat and have a periodic sweep.

### 3. HTTP header injection via the original filename in Content-Disposition
**File:** `apps/web/src/app/api/transcriptions/[id]/subtitles/route.ts:31`
**Confirmed** — flagged independently by two different review angles.
`record.fileName` (the user-supplied original filename) is interpolated
directly into `Content-Disposition: attachment; filename="${baseName}.${format}"`
with no sanitization. A filename containing a `"` breaks the header
structure; a filename containing CRLF (`\r\n`) could inject additional
headers depending on how permissive the underlying HTTP stack is.

**Fix direction:** strip/escape `"`, `\r`, `\n` from `baseName` before
building the header, or use the `filename*=UTF-8''...` RFC 5987 form with
proper percent-encoding.

### 4. `UPLOADS_DIR` isn't validated, and its default can silently diverge between processes
**Files:** `packages/shared/src/env.ts` (no schema for it at all), `packages/core/src/storage.ts:10-12`
**Confirmed** — `packages/shared/src/env.ts` has zod schemas for OpenAI, the
database URL, and app config, but none for `UPLOADS_DIR`. `storage.ts` falls
back to `path.resolve(process.cwd(), 'data', 'uploads')` when it's unset. The
web app and worker are separate processes, potentially started from
different working directories (or one has it set and the other doesn't) —
if their resolved upload directories ever differ, the worker can't find
audio the web app wrote, and every transcription fails with a confusing
"file not found" instead of a clear startup error.

**Fix direction:** add `UPLOADS_DIR` to a shared zod schema, required in both
`apps/web` and `apps/worker`'s env composition, so a mismatch/omission fails
fast at boot instead of silently at upload time.

### 5. Backend error messages are hardcoded English — the localization is UI-only
**Files:** `packages/core/src/auth-service.ts`, `validation.ts`, `quota.ts`, `transcription-service.ts` (every `throw new ValidationError(...)` / `UnauthorizedError(...)` / `QuotaExceededError(...)`)
**Confirmed** — `packages/core` is framework-agnostic and has no next-intl
integration, so every thrown error message ("Invalid email or password.",
"File too large...", "You have used your full monthly allowance...") is
plain English regardless of the request's locale. An Arabic user on
`/ar/dashboard` sees a fully-translated UI right up until something goes
wrong, then reads an English error.

**Fix direction:** either (a) have the API return an error *code* (already
partially true — `AppError.code`) and translate on the client using the
existing `messages/*.json`, or (b) thread the locale into `packages/core`
calls and pick a message table there. (a) is less invasive given the current
architecture.

### 6. No password reset / "forgot password" flow
**Files:** none exist — `packages/core/src/auth-service.ts`, `apps/web/src/app/api/auth/*`
A user who forgets their password has no recovery path; the only option is
deleting the account (which requires being logged in) and re-registering
with the same email (blocked, since `registerUser` rejects duplicate
emails) — meaning a forgotten password is a genuine dead end today.

### 7. No way to change email or password after signup
**Files:** none exist — only `DELETE /api/auth/account` exists under `/api/auth/*`
There's no update-profile endpoint or UI. Combined with #6, an account is
essentially "set once at signup, then immutable except for full deletion."

### 8. No email verification on signup
**File:** `packages/core/src/auth-service.ts` (`registerUser`)
A typo'd email is accepted and the account is immediately active; there's no
`emailVerified` flag in the schema and no verification email step. Low risk
for a portfolio demo, but worth knowing before treating this as a real
product.

---

## 🟡 Medium priority

### 9. Expired sessions are only cleaned up lazily, never proactively
**File:** `packages/core/src/auth-service.ts:100-106`
A session row is deleted only when someone tries to *use* an expired token
(`getUserByToken`). A session nobody ever presents again (e.g. an
abandoned browser) lives in the `Session` table forever. No scheduled
cleanup job exists. Slow-burn table growth, not urgent at small scale.

### 10. Transcription history hard-capped at 50 rows, no pagination
**File:** `packages/core/src/transcription-service.ts` (`listTranscriptions`, `take: opts.limit ?? 50`)
The dashboard always requests the default limit with no "load more" / page
control. A user with more than 50 transcriptions can never see the older
ones through the UI (they still exist in the DB, just unreachable).

### 11. No Content-Security-Policy or Strict-Transport-Security headers
**File:** `apps/web/next.config.mjs:6-12`
The existing security headers (`X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy`, `Permissions-Policy`) are good but incomplete. No CSP
(defense-in-depth against any future stored/reflected XSS) and no HSTS
(forces HTTPS once deployed) are configured.

### 12. No session rotation on login/register
**File:** `packages/core/src/auth-service.ts` (`openSession`)
Logging in creates a *new* session but never invalidates the user's other
existing sessions. A leaked session token from an earlier login remains
valid for its full 30-day TTL even after the user logs in again elsewhere.
Standard practice is to consider rotating/invalidating prior sessions on
re-authentication, though this is a judgment call, not a clear bug.

### 13. No upper bound on password/email length
**File:** `packages/core/src/auth-service.ts:32-37`
Only a minimum password length (8) is enforced; there's no maximum. `scrypt`
is deliberately slow/CPU-heavy, so hashing an attacker-supplied
multi-megabyte password on every register/login attempt is a cheap
CPU-exhaustion vector, only partly mitigated by the existing per-IP rate
limits. Email also has no length cap.

### 14. No explicit timeout on the Whisper API call
**File:** `packages/core/src/whisper.ts`
The OpenAI SDK has its own default timeout, but we never tune it for our
use case. If a Whisper request hangs near that default, it can occupy a
worker slot for a long time before failing, delaying every job behind it
in a single-worker setup.

### 15. Dashboard polling silently gives up on auth/network errors
**File:** `apps/web/src/app/[locale]/dashboard/dashboard-client.tsx` (`pollTranscription`)
If a poll request 401s (session expired mid-upload) or otherwise fails,
the code does `if (!res.ok) return;` — polling just stops with no user
feedback. The item is left showing "processing" forever with no indication
that the user was actually logged out or that something went wrong.

### 16. No "this is taking a while" feedback once poll timeout is reached
**File:** `apps/web/src/app/[locale]/dashboard/dashboard-client.tsx` (`POLL_TIMEOUT_MS`)
After 3 minutes of polling with no final status, the client just stops
polling silently — no "still working, check back later" or "something may
be wrong" message is ever shown for that item.

### 17. In-memory rate limiter has no cross-restart/cross-instance memory
**File:** `apps/web/src/lib/rate-limit.ts`
Already documented in the code's own comment as a known, deliberate
trade-off for the single-process model — listed here so it's tracked as a
real thing to revisit if this ever needs to run as more than one instance
(a restart also fully resets everyone's counters today).

### 18. Orphaned audio file if `deleteAudio` silently fails after the DB write succeeds
**File:** `packages/core/src/transcription-service.ts` (success/failure paths call `deleteAudio` after updating the DB)
`deleteAudio()` swallows its own errors by design (a missing file is fine),
but that also means a *real* filesystem error (permissions, AV lock, disk
issue) during cleanup goes unnoticed — the DB row correctly shows
`audioPath: null`, but the actual file can remain on disk forever with
nothing pointing at it anymore.

### 19. No disk-space check before writing an upload
**File:** `packages/core/src/storage.ts` (`saveAudio`)
Files up to 25 MB are written with no free-space pre-check. On a small VPS
this could fail confusingly (a raw `ENOSPC` bubbling up as a generic 500)
rather than a clear "storage full" message.

### 20. SQLite write contention under concurrent load
**File:** `packages/db/src/index.ts` (`PRAGMA busy_timeout = 5000`)
WAL mode + a 5s busy_timeout handles moderate contention, but the web app
(quota checks, transcription creation) and worker (claiming/updating jobs)
all write to the same file. Under enough concurrent load, writes could
still exceed the timeout and surface as a "database is locked" 500. Not a
bug so much as a scaling ceiling worth knowing about.

---

## 🟢 Low priority / polish

### 21. Rate limiter's hard-cap eviction can drop a still-valid (non-expired) key
**File:** `apps/web/src/lib/rate-limit.ts` (`sweep`)
Only matters at extreme scale (20,000+ distinct concurrent keys); the FIFO
eviction added this session prevents unbounded growth but, as a side
effect, could let the *oldest* tracked key's limit reset early under that
kind of load. Reasonable trade-off, just worth knowing the edge case exists.

### 22. README doesn't spell out that `UPLOADS_DIR` must already exist / be creatable
**File:** `README.md`
The setup instructions say to "fill in an absolute UPLOADS_DIR path" but
don't mention the directory needs to exist or be writable — a new
contributor pointing it at a bad path gets a confusing failure on first
upload instead of a clear setup error.

### 23. Test coverage gaps
Everything in `packages/core` and `packages/shared` business logic is well
tested (67 tests), but these layers have **no** automated tests today:
- `apps/web/src/middleware.ts` (auth gate + i18n routing, fairly complex logic).
- The Next.js API route handlers themselves (only the `packages/core`
  functions they call are tested — request parsing, `withErrorHandling`,
  and rate-limit wiring at the route level are untested).
- `apps/worker/src/index.ts`'s loop, shutdown handling, and anomaly-detection
  heuristics.
- Any React component (`UploadDropzone`, `TranscriptionItem`,
  `DashboardClient`, `AuthForm`, `Reveal`) — all manually verified only.
- `packages/core/src/whisper.ts`'s real `OpenAI.APIError` → `TranscriptionError`
  mapping (tests mock `transcribeAudio` entirely, so this path never runs).

### 24. Minor accessibility polish
- `apps/web/src/app/[locale]/dashboard/upload-dropzone.tsx`: the
  `role="button"` div doesn't set `aria-disabled` when `disabled` is true.
- `apps/web/src/components/locale-switcher.tsx` and a few text links rely on
  Tailwind defaults for focus styling — worth an explicit `focus-visible`
  ring pass so keyboard navigation is easy to follow throughout.
- Body text using `text-ink/40` / `text-ink/50` (the lightest opacity
  variants) is worth a contrast-ratio check against the cream background
  for WCAG AA compliance in the few spots it's used for anything more than
  decorative captions.

---

## ✅ Checked, not real issues

Included for transparency — these were raised by a review agent but don't
hold up against the actual code:

- **"Two worker processes can both claim and double-process the same job."**
  Refuted: `claimNextTranscription()`'s `updateMany({ where: { id, status:
  'pending' }, ... })` is a single atomic conditional update. Only one
  concurrent caller can ever match `status: 'pending'` and get `count: 1`;
  every other loses with `count: 0` and returns `null` immediately, without
  ever calling `findUnique`. This already works correctly with multiple
  worker instances.
- **"Auth form inputs are missing `id`/`htmlFor` label association."**
  Refuted: every input in `apps/web/src/app/[locale]/(auth)/auth-form.tsx`
  is nested *inside* its `<label>` element, which is valid, standard
  implicit label association — no explicit `id`/`htmlFor` pair is needed.
- **"SameSite=Lax leaves account deletion open to CSRF via a same-site
  form."** Refuted on two counts: `SameSite=Lax` already withholds the
  cookie from cross-site POST/DELETE requests (that's the entire point of
  `Lax` vs `None`), and even ignoring that, plain HTML forms can only submit
  `GET`/`POST` — they can't trigger a `DELETE` request at all.
- **Turbo's `lint` task depending on `^build`, when `packages/shared` has no
  `build` script.** Not a bug: Turborepo skips tasks a package doesn't
  define as a no-op in the dependency graph; this is normal, documented
  behavior, not a silent failure.
