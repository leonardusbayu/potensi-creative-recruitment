# Master Audit Architecture & Prompt — Potensi Creative Recruitment

> Dokumen ini berisi: (A) arsitektur sistem terverifikasi (dengan bukti `file:line`),
> (B) master audit prompt siap-pakai untuk mengaudit aplikasi secara menyeluruh.

---

# BAGIAN A — ARSITEKTUR TERVERIFIKASI

## A1. Topologi Produksi

```
[Kandidat publik]──▶ Pages potensi-hr.pages.dev  (frontend React + Vite build)
                          │
                          ├─ /api/*  ──▶ functions/api/[[path]].js  (proxy, 8 baris)
                          │                   └──▶ Worker calendarjet-hr.edubot-leonardus.workers.dev
                          │                            ├─ Hono router (37 routes)
                          │                            ├─ D1 calendarjet_hr (10 tabel)
                          │                            ├─ R2 cv-store (CV PDF, media)
                          │                            ├─ Queue cv-queue (→ DLQ cv-queue-dlq)
                          │                            ├─ Cron */5 * * * * (publish post)
                          │                            └─ External: Resend, OpenRouter,
                          │                                 Meta Graph v21, TikTok API
                          └─ /admin  ──▶ React SPA (Potensi Creative Hub, 7 tab)
```

**Bukti arsitektur:**
- Proxy: `functions/api/[[path]].js:1-7` — menulis ulang `url.hostname` ke worker `calendarjet-hr.edubot-leonardus.workers.dev`, meneruskan `fetch(new Request(url, request))`
- Worker name/id: `wrangler.jsonc:3,21` — `name: potensi-creative-recruitment`, D1 `calendarjet_hr` = `968fbbb0-...`
- Cron: `wrangler.jsonc:14-16`
- Pages project: `potensi-hr` (ter-deploy dari commit `282d808`, branch `main`)

**Implikasi audit #1 (proxy):** `onRequest` di proxy **tidak men-stripping `Authorization` header**, jadi admin token frontend diteruskan ke worker — bagus. Tapi proxy juga **tidak membatasi origin**; siapa pun yang menemukan URL Pages dapat memanggil API worker. Auth sepenuhnya bergantung pada guard di worker.

## A2. Peta Rute Worker (37 rute, terverifikasi L105–L658)

| Auth | Rute | Fungsi | Tulis ke |
|------|------|--------|----------|
| PUBLIC | GET /api/health | health check | — |
| PUBLIC | GET /api/jobs | daftar lowongan | read jobs |
| ADMIN | POST /api/jobs | buat lowongan | jobs |
| ADMIN | GET/POST/DELETE /api/social/accounts | kelola akun sosmed | social_accounts |
| ADMIN | GET/POST /api/social/posts | daftar/jadwal post | social_posts |
| ADMIN | POST /api/social/posts/:id/cancel | batalkan post | social_posts |
| ADMIN | POST /api/social/posts/:id/publish | terbitkan sekarang | social_posts + external |
| ADMIN | POST /api/social/upload | upload gambar | R2 |
| PUBLIC | GET /api/media/:key | serve gambar R2 | read R2 |
| ADMIN | POST /api/social/publish | publish manual per akun | external |
| PUBLIC | POST /api/apply | **kandidat mendaftar** | applicants + R2 + queue |
| ADMIN | GET /api/applicants | daftar pelamar (PII) | read applicants |
| ADMIN | GET /api/cv/:id | hasil analisis | read cv_analyses |
| ADMIN | GET /api/cv/:id/file | unduh CV | read R2 |
| ADMIN | POST /api/cv/analyze/:id | skor CV | cv_analyses + applicants |
| ADMIN | POST /api/email/:type/:id | invite/reject + **minta JWT** | email_logs + applicants |
| PUBLIC | GET /api/bookings | daftar booking | read bookings |
| PUBLIC | POST /api/bookings/interview | kandidat book slot (JWT) | bookings + applicants |
| PUBLIC | POST /api/bookings/:id/reschedule | ubah jadwal (JWT+ownership) | bookings |
| PUBLIC | POST /api/bookings/:id/cancel | batalkan (JWT+ownership) | bookings + applicants |
| ADMIN | POST /api/email/offer/:id | offer email → hired | email_logs + applicants |
| ADMIN | POST /api/psychotest/send/:id | kirim link psikotes | email_logs + applicants |
| ADMIN | POST /api/psychotest/result/:id | catat hasil psikotes | applicants |
| PUBLIC | POST /api/psychotest/callback | webhook dari sikotes | applicants |
| ADMIN | GET /api/analytics | funnel + post stats | read |
| ADMIN | POST /api/wa/:id | link WhatsApp | read |
| ADMIN | PATCH /api/jobs/:id | edit/tutup lowongan | jobs |
| ADMIN | POST /api/applicants/:id/notes | catatan interview | applicants |
| ADMIN | GET/POST /api/templates/:type | template email | email_templates |
| ADMIN | GET /api/models | daftar model OpenRouter | external |
| ADMIN | GET/POST /api/settings | pengaturan (llm_model, psychotest_url) | settings |
| ADMIN | POST /api/applicants/:id/status | ubah status | applicants |

**Implikasi audit #2:** Rute `GET /api/jobs`, `POST /api/apply`, `GET /api/media/:key`,
`POST /api/bookings/interview|reschedule|cancel`, `POST /api/psychotest/callback` adalah **public by design** — masing-masing harus punya guard non-admin sendiri (JWT/secret/rate-limit/validasi).

## A2. Sumber Kebenaran Data (kritis untuk audit)

Dua lapisan state:

| Entitas | Sumber kebenaran | Mirror di browser |
|---------|------------------|-------------------|
| applicants | **D1** | localStorage `calendarjet_applicants` |
| social_posts | **D1** | `calendarjet_social_posts` |
| social_accounts | **D1** | `calendarjet_social_accounts` |
| bookings (interview) | **D1** | `d1Bookings` state (tidak di localStorage) |
| **bookings (kalender lama)** | **localStorage** `calendarjet_bookings` | sama |
| event_types, availability, brand, AI history, theme | **localStorage** | — |
| email_logs, cv_analyses, rate_limits, settings, email_templates, rate_limits | **D1** | tidak dimirror |

**Implikasi audit #3:** `calendarjet_bookings` (kalender lama) dan `d1Bookings` adalah
**dua penyimpanan berbeda** untuk booking. `BookingsView` membaca localStorage; alur interview menulis ke D1. Cek apakah keduanya tampil/sinkron.

## A3. Pemetaan Status Applicant

```
pending → analyzed → invited → booked → interviewed → test_sent → tested → hired
                                                                      ↘ rejected
```
Allowed list di `src/worker/index.ts:642-648` (route status). Frontend memakai string status yang sama — cek konsistensi di setiap view.

## A4. Kredensial & External APIs

| Tujuan | Auth | Dipakai di |
|--------|------|-----------|
| Resend (email) | `Bearer RESEND_API_KEY` | `src/worker/index.ts:87-98` |
| OpenRouter (LLM) | `Bearer OPENROUTER_API_KEY` | `src/worker/llm.ts` |
| Meta Graph v21 | `access_token` akun sosmed | `src/worker/meta.ts` |
| TikTok | `Bearer token` + `open_id` | `src/worker/tiktok.ts` |
| D1/R2/Queue/Cron | binding Cloudflare | `wrangler.jsonc` |

---

# BAGIAN B — MASTER AUDIT PROMPT (siap pakai)

> Gunakan prompt ini terhadap repo Potensi Creative Recruitment. Ganti
> `[DESCRIBE THE FLOW]` dengan flow yang mau diaudit dari daftar §B1.

---

```text
# MASTER AUDIT PROMPT — Potensi Creative Recruitment

## PERAN
Kamu adalah senior auditor aplikasi (React + Cloudflare Workers/D1/R2/Queues).
Kerjakan SEMUA perintah di bawah pada repo yang diberikan. BUKTIWA setiap klaim
dengan `file:line` dari kode yang benar-benar dibaca. JANGAN mengubah kode.
JANGAN menebak: kalau tidak ada bukti, tulis "ASSUMPTION" dan jelaskan apa yang
harus diverifikasi manual.

## KONTEKS ARSITEKTUR (gunakan sebagai baseline; verifikasi ulang!)
- Frontend: React 19 + Vite, Pages project `potensi-hr` (potensi-hr.pages.dev)
- API proxy: functions/api/[[path]].js → worker calendarjet-hr.edubot-leonardus.workers.dev
- Backend: src/worker/index.ts (Hono, 37 routes), D1 `calendarjet_hr` (10 tabel:
  jobs, applicants, cv_analyses, email_logs, social_accounts, social_posts,
  bookings, rate_limits, email_templates, settings), R2 `potensi-cv-store`,
  Queue `cv-queue` (+DLQ), cron `*/5 * * * *`
- External: Resend (email), OpenRouter (LLM CV), Meta Graph v21 + TikTok (publish),
  sikotes (psikotes via webhook POST /api/psychotest/callback)
- Auth model: ADMIN routes pakai header Authorization Bearer ADMIN_TOKEN;
  candidate routes pakai JWT HS256 (JWT_SECRET, exp 7d, ownership check di
  bookings reschedule/cancel); public apply di-rate-limit 10/jam/IP (rate_limits)
- Status applicant: pending → analyzed → invited → booked → interviewed →
  test_sent → tested → hired | rejected
- Dua penyimpanan booking: D1 `bookings` (interview) vs localStorage
  `calendarjet_bookings` (kalender lama BookingsView)
- localStorage keys: calendarjet_{admin_token, ai_history, applicants,
  availability, bookings, brand_settings, event_types, jobs, social_accounts,
  social_posts, theme}

## TUGAS 0 — VERIFIKASI BASELINE (wajib sebelum kesimpulan)
Semua angka/klaim di atas adalah snapshot. Verifikasi ulang dengan:
1. `git log --oneline -10` dan `git diff <ref>..HEAD` untuk commit yang berubah
   sejak snapshot ini.
2. Jalankan: daftar SEMUA rute worker dengan auth guard per rute
   (grep `app.(get|post|delete|patch)` + cek `requireAdmin` / `verifyJwt`
   pada 3 baris berikutnya). Laporkan setiap rute PUBLIC yang menulis data.
3. Daftar semua tabel D1 yang disentuh vs schema.sql — tunjukkan tabel yang
   dirujuk di kode tapi TIDAK ada di schema.sql (dan sebaliknya).

## TUGAS 1 — TRACE FLOW KRITIS
Trace flow berikut end-to-end. Untuk SETIAP langkah sebutkan:
(1) file/fungsi bertanggung jawab, (2) input, (3) output, (4) dependensi step
berikut, (5) mode gagal, (6) asumsi keamanan, (7) EVIDENCE (file:line) atau
ASSUMPTION.

Flow A — Kampanye: HR buat job (JobPostComposer) → schedulePost() →
POST /api/social/posts → D1 → cron scheduled() → publishPost() → Meta/TikTok →
status published/failed → UI Kalender Post.
Flow B — Apply: kandidat /?job=slug (ApplyForm) → submitApplication() →
POST /api/apply (rate-limit, dedup, R2, D1, enqueue) → queue consumer →
analyzeWithLlm/analyzeWithFallback → cv_analyses + applicants.analyzed.
Flow C — Keputusan HR: CVReviewView → analyzeApplicant/inviteToInterview/
rejectApplication → POST /api/email/:type/:id (JWT mint + Resend) →
applicants.invited/rejected → UI.
Flow D — Interview: kandidat /?token (PublicBookingView) → POST
/api/bookings/interview (JWT verify + slot conflict) → bookings + applicants.booked
→ reschedule/cancel ownership → ApplicantStatusView.
Flow E — Psikotes: HR "Kirim Psikotes" → POST /api/psychotest/send/:id (link +
applicantId) → kandidat tes di sikotes → sikotes POST /api/psychotest/callback
(WEBHOOK_SECRET) → applicants.tested → HR Terima/Tolak → offer email → hired.
Flow F — Auto-publish: cron scheduled() setiap 5 menit → D1 due posts →
publishPost() per akun → UPDATE social_posts → UI SocialCalendarView.

Untuk setiap flow: tunjukkan titik di mana UI bisa MENYATAKAN sukses sementara
backend gagal (optimistic update, catch{}, toast sukses salah), dan titik di mana
dua sumber data bisa berbeda (localStorage vs D1).

## TUGAS 2 — MATRIKS KEAMANAN
Untuk setiap dari 37 rute: (a) auth guard yang benar?, (b) input divalidasi?,
(c) SQL parameterized?, (d) bisa abuse apa?, (e) skenario serangan konkret
(unauth minta token, IDOR pada :id, rate-limit bypass, webhook secret kosong,
PII leak, token JWT replay setelah reject/cancel). Prioritaskan Critical/Major/Minor.

## TUGAS 3 — KONSISTENSI STATE & DATAFLOW
1. Bandingkan setiap status yang dipakai UI (badge/filter/pipeline) vs allowed
   list worker (index.ts:642-648). Tandai mismatch.
2. Tandai SEMUA optimistic update frontend (setState sebelum await selesai).
3. Petakan hydration D1→localStorage (BookingContext ~155-175): apa yang di-
   merge, apa yang tertimpa, apa yang tidak pernah di-hydrate (bookings?).
4. Cek dual-booking: localStorage calendarjet_bookings vs D1 bookings —
   apakah BookingsView menampilkan keduanya? apakah createBooking masih
   dipanggil di alur interview?
5. Temukan data yang ditulis tapi tidak pernah dibaca, dan dibaca tapi tidak
   pernah ditulis.

## TUGAS 4 — DEPENDENSI & INFRA
1. Semua binding di wrangler.jsonc vs yang benar-benar dipakai di kode
   (AI binding dipakai? POSTIZ_URL masih relevan?). Tandai unused.
2. Semua env/secret yang dibutuhkan vs yang ada di .dev.vars.example/README.
3. Eksternal API: error handling, timeout, retry, cost limit (LLM), fallback.
4. Cron vs queue: apa yang terjadi kalau publishPost gagal di cron? Apakah
   DLQ benar-benar dipakai?
5. Proxy functions/api/[[path]].js: apakah perlu strip header? CORS? Apakah
   URL worker di-hardcode?

## TUGAS 5 — QA EKSEKUSI (bukti nyata, bukan klaim)
1. `npm run build` → laporkan hasil + warning.
2. `npx tsc --noEmit --skipLibCheck src/worker/*.ts` → laporkan.
3. Jalankan dev server; bukti dengan curl/Invoke-WebRequest:
   - GET /api/health
   - POST /api/jobs TANPA auth → harus 401
   - POST /api/apply tanpa file → 400; dengan file >10MB → 413
   - POST /api/bookings/interview dengan token sampah → 401
   - POST /api/psychotest/callback tanpa secret saat WEBHOOK_SECRET diset → 401
4. Untuk setiap rute public: coba payload jahat (XSS di caption/notes via
   ai_summary/innerHTML, SQL di :id, path traversal di media/:key).

## FORMAT OUTPUT
1. Executive summary (max 10 baris)
2. Tabel temuan: [ID, Severity, Area, Temuan, Evidence file:line, Dampak, Rekomendasi]
3. Diagram state machine applicant + social_post (ASCII)
4. Daftar "UI mengklaim X tapi backend Y" — setiap insiden dengan file:line
5. Daftar ASSUMPTION yang perlu diverifikasi manual
6. Skor akhir: Security /10, Data Integrity /10, UX truthfulness /10, Infra /10
```

---

# BAGIAN C — TRACE FLOW KRITIS (contoh hasil dengan bukti)

> Flow B (Apply → AI): bukti `file:line` dari kode yang benar-benar dibaca.

1. **Kandidat buka** `/?job=live-streamer-tiktok-2026` — `PublicBookingView.jsx:34-38`
   → `search.get("job")` → render `<ApplyForm jobSlug>` (`ApplyForm.jsx:7` job lookup).
2. **Submit** — `ApplyForm.jsx:11-36` validasi klien (ukuran 10MB L14, email L15,
   nama L16) → `submitApplication(fd)` (`BookingContext.jsx:386`) → `POST /api/apply`.
3. **Worker** — `index.ts:248` PUBLIC: rate-limit per IP (`index.ts:255-268`,
   10/jam, tabel `rate_limits`), validasi email/size/MIME (`269-276`),
   **dedup** per job (`271-272`) + **cross-job dedup** (`273-274`), cek job ada (`275-276`),
   R2 put (`278-281`), INSERT applicants `pending` (`283-287`), enqueue (`289-291`).
4. **Fallback offline** — jika fetch gagal, kandidat tetap disimpan **localStorage
   saja** (`BookingContext.jsx:393-401`) dengan flag `offline:true` → UI jujur
   ("HR belum menerima"). **Gap:** tidak pernah sync balik ke D1.
5. **AI** — dua jalur: queue consumer (`index.ts:676+`) atau manual ADMIN
   (`index.ts:350`) → `analyzeWithLlm` (`llm.ts`) → fallback heuristik
   (`cvAnalyzer.ts:69`) → `UPDATE applicants SET status='analyzed'` (`index.ts:328-330`).
6. **UI state** — context menandai `analyzed` hanya jika `r.ok`; toast menampilkan
   skor (`BookingContext.jsx:409-411`).

**Kegagalan & silent-failure yang teridentifikasi (belum diperbaiki):**
- Offline apply → data hanya localStorage, tak pernah sampai D1 (Step 4).
- `analyzeApplicant` fallback lokal menskor regex lalu set `analyzed` — skor palsu
  bisa berbeda dari D1 (`BookingContext.jsx:414-421`).
- Hydration hanya jalan jika `calendarjet_admin_token` ada; tanpa token, UI kosong
  padahal D1 berisi data (`BookingContext.jsx:155-156`).

*(Flow A/D/E dijelaskan penuh di §B TUGAS 1 — dieksekusi oleh prompt di atas.)*

---

## Cara memakai dokumen ini
1. Salin blok prompt §B ke agent/pen-audit baru.
2. Sertakan repo + ref commit yang diaudit (`git rev-parse HEAD`).
3. Minta output sesuai FORMAT OUTPUT — setiap temuan wajib ada evidence `file:line`.
4. Jalankan per flow (A–E) satu per satu untuk kedalaman, atau semua sekaligus.