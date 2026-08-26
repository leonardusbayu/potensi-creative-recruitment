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

### Option B — Automatic (webhook from `sikotes`) ✅ implemented

`sikotes` can push results back automatically (no HR typing). The worker route is **already implemented** in `src/worker/index.ts`:

```
POST /api/psychotest/callback
```

**Request body** (JSON):
```json
{
  "applicantId": "app_...",   // OR
  "email": "candidate@email.com",
  "score": 85,
  "notes": "optional note"
}
```

It updates the applicant to `psychotest_score`, `psychotest_notes`, `status = 'tested'`.

**Security**: send the header `X-Webhook-Secret: <your-secret>`. The Worker compares it against `WEBHOOK_SECRET` (set via `wrangler secret put WEBHOOK_SECRET`). If `WEBHOOK_SECRET` is unset, the endpoint accepts any call (dev mode) — **always set it in production**.

**Example `sikotes` call** (e.g. in its Laravel controller after test completes):
```php
Http::post('https://<your-worker>.workers.dev/api/psychotest/callback', [
    'json' => [
        'email' => $peserta->email,   // or 'applicantId'
        'score' => $hasil->score,
    ],
    'headers' => ['X-Webhook-Secret' => env('WEBHOOK_SECRET')],
]);
```

> **Note on `sikotes`**: the repo `github.com/ArrisBudi/sikotes` is currently **private** so its exact data model is unknown to us. The webhook above accepts **either** `applicantId` (which we send to the candidate in the psychotest URL) **or** the candidate's `email`, so `sikotes` can call it with whichever identifier it has. If it exposes a results endpoint instead (e.g. `GET /api/peserta/hasil-tes/{id}`), we can also make the Worker poll that endpoint — just share the API doc.

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
