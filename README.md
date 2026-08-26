# Potensi Creative Recruitment

Unified HR recruitment workflow for **Potensi Creative**. Manages the full hiring pipeline: social media campaign → CV AI analysis → interview booking → **psycho test** → final decision → analytics.

## Tech Stack

- **Frontend**: React 19 + Vite (`src/`)
- **Backend**: Cloudflare Workers + Hono (`src/worker/`)
- **Database**: D1 (SQLite) — `schema.sql`
- **Storage**: R2 (CV PDFs, social media images)
- **Queue**: Cloudflare Queues (CV analysis)
- **Email**: Resend (via Worker)
- **AI**: OpenRouter (LLM CV scoring, model selectable in UI)
- **Social**: auto-post to Instagram / Facebook / Threads / TikTok via Meta Graph API + TikTok API

---

## Pipeline / Status Flow

```
pending → analyzed (CV AI) → invited (HR) → booked (candidate picks slot)
→ interviewed (HR marks) → test_sent (HR sends psycho test) → tested (result recorded)
→ hired (HR accepts, offer email)  |  rejected (HR declines)
```

---

## 🧠 Psycho Test Integration (for Arris / `sikotes`)

The app currently sends the candidate a **link** to the psycho test via email, then HR **manually records** the result score. This is the simplest path and needs **zero changes** to `sikotes`.

### How it works today (manual)

1. HR sets the psycho test URL in **Pengaturan HR → Psikotes (sikotes)** → stored as `settings.psychotest_url`.
2. On a candidate with status `interviewed`, HR clicks **"Kirim Psikotes"** in **Review CV**.
3. Worker `POST /api/psychotest/send/:applicantId`:
   - reads `psychotest_url` from settings
   - sends the candidate an email (template `psychotest`) with that link
   - sets candidate `status = 'test_sent'`, `psychotest_sent_at`, `psychotest_link`
4. Candidate takes the test on `sikotes`.
5. HR clicks **"Catat Hasil"** → enters score + notes.
6. Worker `POST /api/psychotest/result/:applicantId`:
   - sets `psychotest_score`, `psychotest_notes`, `status = 'tested'`
7. HR clicks **"Terima"** (→ offer email, `hired`) or **"Tolak"** (`rejected`).

### Option B — Automatic (webhook from `sikotes`) ✅ implemented + integration guide

`sikotes` (`github.com/ArrisBudi/sikotes`) is now **public** — it's a full **Express/TypeScript + PostgreSQL** hiring platform (not just a quiz): applicant funnel, AI screening, 3 test modules (personality DISC/MBTI, OTS, SPV), auth/JWT, and a multi-module orchestrator. Results are stored in PostgreSQL and read via `GET /api/orchestrator/:sessionId/combined` (auth-required).

**Our side is ready.** The Potensi worker already has:

```
POST /api/psychotest/callback
```

Body: `{ applicantId? | email?, score?, notes? }` → sets applicant `psychotest_score`, `psychotest_notes`, `status='tested'`. Verify via `X-Webhook-Secret` header against `WEBHOOK_SECRET`.

**What Arris needs to add in `sikotes`** (a small outbound call when a test finishes):

In `backend/src/routes/orchestratorRoutes.ts`, the `POST /:sessionId/finish` handler already computes the combined result. After `TestOrchestrator.finishMultiModuleSession(...)`, add a call to our callback with the candidate's **email** (which links to our `applicants.email`):

```ts
// inside POST /:sessionId/finish, after result is computed
const sessionRow = await queryOne<{ candidate_id: string }>(
  `SELECT candidate_id FROM sessions WHERE session_id = $1`, [req.params.sessionId]
)
const cand = await queryOne<{ email: string }>(
  `SELECT email FROM candidates WHERE candidate_id = $1`, [sessionRow!.candidate_id]
)
await fetch('https://<your-worker>.workers.dev/api/psychotest/callback', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-webhook-secret': process.env.POTENSI_WEBHOOK_SECRET! },
  body: JSON.stringify({
    email: cand!.email,
    score: result.combinedOverall,   // finishMultiModuleSession returns { combinedOverall, combinedPassed, moduleScores }
    notes: result.combinedPassed ? 'LULUS' : 'TIDAK LULUS'  // optional
  })
}).catch((e) => console.error('Potensi callback failed', e))
```

**Linking key**: our webhook matches by `applicants.email`. For this to work, the candidate **must register on `sikotes` with the same email they used to apply on Potensi** (this is the natural bridge — `sikotes` requires a UNIQUE email on `candidates`). Alternatively, pass the Potensi `applicantId` through the psychotest URL and echo it back in the webhook.

**Config to add in `sikotes` backend `.env`:**
```
POTENSI_WEBHOOK_SECRET=<same as WEBHOOK_SECRET in Potensi worker>
POTENSI_CALLBACK_URL=https://<your-worker>.workers.dev
```

**Ready-made patch files** (in this repo, `integrations/`):
- `integrations/sikotes-orchestrator.patch` — exact diff to apply to `backend/src/routes/orchestratorRoutes.ts`
- `integrations/sikotes-env.example` — env vars to add to `sikotes/backend/.env`

Apply with:
```bash
cd sikotes
git apply path/to/integrations/sikotes-orchestrator.patch
```

**Security**: always set `WEBHOOK_SECRET` on our worker and mirror it as `POTENSI_WEBHOOK_SECRET` in `sikotes`. If unset on our side, the callback accepts any call (dev only).

---

## Local Development

### 1. Install + run frontend

```bash
npm install
npm run dev        # http://localhost:3000
```

### 2. Worker (Cloudflare) — requires auth

```bash
npx wrangler d1 create calendarjet_hr         # note the database_id
npx wrangler d1 execute calendarjet_hr --file=./schema.sql --local
npx wrangler dev --local
```

### 3. Secrets (set via `.dev.vars` for local, `wrangler secret put` for prod)

```
JWT_SECRET=...
ADMIN_TOKEN=...
RESEND_API_KEY=...          # email delivery
EMAIL_FROM=Potensi Creative <hr@potensi-creative.id>
OPENROUTER_API_KEY=...      # CV AI scoring
LLM_MODEL=deepseek/deepseek-chat
```

Copy `.dev.vars.example` → `.dev.vars` and fill values. Secrets are **never** committed (see `.gitignore`).

### 4. Admin UI setup

Open the app → **Potensi Creative Hub**:
- **Hubungkan Akun** → add social accounts (IG/FB/Threads/TikTok) with OAuth tokens
- **AI Model (OpenRouter)** → set API key + pick model
- **Pengaturan HR** → set **URL Psikotes** + email templates

---

## Key Routes (admin-protected with `ADMIN_TOKEN`)

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/social/posts` | schedule a post |
| POST | `/api/social/posts/:id/publish` | publish now |
| POST | `/api/apply` | candidate applies (public, rate-limited) |
| POST | `/api/cv/analyze/:applicantId` | AI score CV |
| POST | `/api/email/:type/:applicantId` | invite / reject email |
| POST | `/api/email/offer/:applicantId` | offer email (→ hired) |
| POST | `/api/psychotest/send/:applicantId` | send psycho test link |
| POST | `/api/psychotest/result/:applicantId` | record psycho test result |
| POST | `/api/bookings/interview` | candidate books interview (JWT) |
| POST | `/api/bookings/:id/reschedule` | candidate reschedules |
| GET | `/api/analytics` | funnel + post stats |
| GET | `/api/models` | list OpenRouter models |

---

## Project Structure

```
src/
  worker/          # Cloudflare Worker backend (Hono)
    index.ts       # all routes + cron + queue
    cvAnalyzer.ts  # heuristic CV scoring (fallback)
    llm.ts         # OpenRouter LLM CV scoring
    meta.ts        # Meta Graph API publisher
    tiktok.ts      # TikTok publisher
    email.ts       # email builders
  components/
    admin/         # HR dashboard views
    public/        # candidate-facing views (apply, book, status)
  context/         # React state + API calls
  data/            # seed data
  utils/           # calendar helpers
schema.sql         # D1 schema
wrangler.jsonc     # Worker config (cron, D1, R2, Queue, AI)
```
