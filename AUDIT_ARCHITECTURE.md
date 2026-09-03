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

# BAGIAN D — AUDIT REAL-USE CASE (Ronde 3, commit `1b51eef`)

> Lensa berbeda: bukan "apakah kode benar" tapi **"apakah orang nyata bisa
> memakainya"** — HR, kandidat, tim, di HP, di kondisi jaringan buruk,
> hari pertama pakai tanpa training. Setiap temuan punya bukti `file:line`.

## D0. Status baseline audit sebelumnya (semua tertutup)

Round 1 (F1-F8) ✅ · Round 2 (N1-N9, S-1, G-1/G-2, C-5) ✅ · Round UI (U1-U5) ✅
(kecuali U-4 validasi kosong = by-design HTML5 `required`).

## D1. Temuan Real-Use (per dimensi)

### Dimensi 1 — 📱 Mobile / Kandidat di HP (paling kritis: kandidat live streamer hampir pasti akses via HP)

| ID | Sev | Temuan | Bukti |
|----|-----|--------|-------|
| M-1 | **High** | **Sidebar admin fixed 270px tanpa responsive** — di HP lebar layar < 375px, sidebar memakan 70-80% layar; hanya `.hide-mobile` + booking-grid yang responsive (`index.css:408-412`) | `Sidebar.jsx:40`, `index.css:408` |
| M-2 | **High** | **Pipeline Kanban 6 kolom `repeat(6,1fr)` hanya `overflowX:auto`** — di HP, kartu selebar ~100px, drag-drop tak berfungsi di touch (drag event HTML5 tak didukung iOS Safari) | `PipelineView.jsx:83-86` |
| M-3 | Medium | **Tabel CVReview/Bookings `overflowX:auto` tanpa sticky kolom** — HR scroll kiri-kanan untuk lihat aksi per kandidat; tombol aksi di kolom paling kanan, mudah terlewat | `CVReviewView.jsx:93`, `BookingsView.jsx:193` |
| M-4 | Medium | **Halaman kandidat (ApplyForm/ApplicantStatus) tidak diuji di viewport kecil** — form pakai `maxWidth:640` + grid 2 kolom untuk handle TikTok/IG → di 320px kolom sempit | `ApplyForm.jsx` inline styles |
| M-5 | Low | **Tidak ada PWA/manifest** — kandidat yang bookmark tidak dapat splash/home-screen icon; untuk kandidat mobile-first ini menurunkan kesan profesional | no `manifest.json` |

### Dimensi 2 — 🧭 Onboarding & First-Run (HR baru tanpa training)

| ID | Sev | Temuan | Bukti |
|----|-----|--------|-------|
| O-1 | **High** | **Tidak ada setup wizard / status kesiapan.** HR baru harus tahu urutan: set admin token → connect akun → set psychotest URL → pilih model → buat job → jadwalkan. Tidak ada indikator "langkah 1/2/3" — hanya teks kecil tersebar. Jika token belum diset, semua tab menampilkan data kosong TANPA penjelasan kenapa | `PotensiDashboard.jsx`, `HRSettingsView.jsx` |
| O-2 | High | **Empty state tidak menjelaskan next-step.** Contoh: CVReview "Belum ada pelamar — share apply link" ✓ baik; tapi SocialAccounts "Belum ada akun — hubungkan di atas" tanpa penjelasan butuh token admin dulu; OpenRouter "klik Fetch Models" tanpa menyebut key wajib | `SocialAccountsView.jsx`, `OpenRouterSettingsView.jsx` |
| O-3 | Medium | **`ADMIN_TOKEN` via localStorage manual-paste** — HR harus minta token ke dev, buka DevTools-like input di UI. Untuk non-teknis ini hambatan besar; tak ada "login" yang familiar, token tersimpan plaintext, tidak ada logout | `SocialAccountsView.jsx` (input token), semua `adminHeaders()` |
| O-4 | Medium | **Toast hilang 4 detik, tidak ada tempat melihat history** — HR yang melewatkan "Skor 80 — HR tentukan undang/tolak" tidak punya cara membaca ulang hasil analisis selain buka row | `BookingContext.jsx` showToast setTimeout 4000 |
| O-5 | Low | **Label campur ID/EN tanpa pola** — tombol "Terima/Tolak" tapi status badge "invited/booked/interviewed" (EN). Kandidat melihat "Status: invited" di halaman status | `CVReviewView.jsx` badge map, `ApplicantStatusView.jsx` STEPS |

### Dimensi 3 — 🔁 Error Recovery & Ketahanan (nyata: internet lambat, token expire, salah input)

| ID | Sev | Temuan | Bukti |
|----|-----|--------|-------|
| E-1 | **High** | **Admin token salah/tidak ada → semua fetch gagal diam-diam.** Setiap view punya `catch {}` kosong; tabel tampil kosong tanpa pesan "token salah" vs "belum ada data" — HR tidak bisa membedakan | `AnalyticsView.jsx:14-17`, `OpenRouterSettingsView.jsx:20-24`, `HRSettingsView.jsx` |
| E-2 | High | **Tidak ada loading state konsisten** — AnalyticsView punya "Memuat analytics…", tapi CVReview/Bookings/Pipeline tidak; saat hydration jalan, HR melihat data lama localStorage yang mungkin stale tanpa indikator sinkronisasi | per-view |
| E-3 | Medium | **`alert()` di alur booking kandidat** (`PublicBookingView.jsx:96`) — error token invalid ditampilkan via native alert, jarring di mobile, tidak bisa retry tanpa kehilangan pilihan slot | `PublicBookingView.jsx:96` |
| E-4 | Medium | **Composer draft hilang saat reload** — `JobPostComposer` semua state `useState` lokal (title/description/caption/media/scheduledAt); HR kehilangan caption panjang yang sudah diketik jika accidentally refresh | `JobPostComposer.jsx:7-13` |
| E-5 | Medium | **Upload gambar post tanpa progress/error retry** — `handleFile` langsung FileReader; jaringan drop di tengah = silent | `JobPostComposer.jsx` |
| E-6 | Low | **Tidak ada konfirmasi saat reset demo data?** — ada (`window.confirm` Header.jsx), tapi reset juga menghapus applicants/posts yang belum sync ke D1 | `Header.jsx` resetToDemoData |

### Dimensi 4 — 🧭 Workflow HR Harian (efisiensi operasional)

| ID | Sev | Temuan | Bukti |
|----|-----|--------|-------|
| W-1 | **High** | **Tidak ada sorting tabel** — CVReview/Bookings tidak bisa sort by score/status/tanggal. Dengan 100+ pelamar per kampanye, HR scroll manual | grep `sortBy|orderBy` = 0 hit |
| W-2 | High | **Tidak ada pagination admin** — `GET /api/applicants` support limit/offset tapi frontend tidak memakainya; semua dimuat (100 baris max worker) | `BookingsView.jsx`, `CVReviewView.jsx` |
| W-3 | High | **Delete akun sosmed tanpa konfirmasi** (`removeSocialAccount` langsung hapus; token akun hilang permanen; tidak ada undo) | `SocialAccountsView.jsx` (0 `confirm`) |
| W-4 | Medium | **Bulk actions terbatas** — ada bulk invite/reject, tapi tidak ada bulk "Kirim Psikotes" / bulk "Terima" untuk kandidat yang lulus interview massal | `CVReviewView.jsx` |
| W-5 | Medium | **Tidak ada notifikasi ke HR** saat kandidat baru apply/book/cancel — HR harus refresh manual; tidak ada badge realtime (queue consumer bekerja di belakang) | tidak ada polling/websocket untuk admin |
| W-6 | Medium | **Tidak ada pencarian applicant global** — search hanya di CVReview; tidak bisa cari "semua pelamar bernama X lintas job" | `CVReviewView.jsx` filter lokal saja |
| W-7 | Low | **Export CVReview tidak ada** — Bookings punya CSV export, pelamar tidak (HR biasanya butuh rekap pelamar untuk meeting) | `CVReviewView.jsx` |

### Dimensi 5 — 📱 Kandidat Experience (dari sudut pandang kandidat live streamer)

| ID | Sev | Temuan | Bukti |
|----|-----|--------|-------|
| K-1 | **High** | **Nol atribut aria/alt di semua halaman publik** — screen reader tidak berfungsi; upload CV hanya label text tanpa indikator drag-drop; aksesibilitas hukum di beberapa yurisdiksi | grep `aria-` public = 0 |
| K-2 | High | **Dark mode tidak diterapkan di halaman publik** — tema hanya toggle admin; kandidat malam (jam kerja live streamer 19:00-23:00!) melihat form putih menyala | `ApplyForm.jsx` 0 hits theme |
| K-3 | Medium | **Bahasa status kandidat campuran EN** — timeline "Lamaran Diterima" tapi step "Psikotes", badge status EN (`test_sent`, `tested`); kandidat awam tidak paham | `ApplicantStatusView.jsx` STEPS |
| K-4 | Medium | **Tidak ada konfirmasi visual setelah cancel/reschedule** — hanya `setMsg` inline yang mudah terlewat; tidak ada email konfirmasi perubahan jadwal ke kandidat | `ApplicantStatusView.jsx:46,60` |
| K-5 | Low | **Progress upload CV tidak ada** (ukuran file besar di jaringan lambat) + tidak ada client-side preview CV | `ApplyForm.jsx` |

### Dimensi 5b — 🔌 Kesiapan Operasional (nyala 24/7)

| ID | Sev | Temuan | Bukti |
|----|-----|--------|-------|
| R-1 | **High** | **Tidak ada halaman status/health untuk tim** — `/api/health` ada tapi tidak dipakai UI; HR tidak tahu apakah worker/email/AI sedang down; tidak ada monitoring alert | `index.ts:105` tak dikonsumsi |
| R-2 | High | **Email `queued` tidak pernah di-retry** — jika Resend gagal (key salah, limit), email_logs tetap `queued` selamanya; tidak ada retry job; kandidat tidak pernah terima undangan | `email.ts`, worker email route |
| R-3 | Medium | **Cron publish gagal tidak meng-alert HR** — post `failed` hanya terlihat di Kalender Post; tidak ada email/notif ke HR | `scheduled()` |
| R-4 | Medium | **Tidak ada audit log admin** — siapa mengundang/menolak/hire tidak terekam (ada `email_logs` tapi bukan log aksi) | hanya email_logs |
| R-5 | Low | **Tidak ada backup/export data HR** — D1 data (applicants/bookings) hanya bisa diekspor via BookingsView CSV (lokal saja) | BookingsView CSV |

## D2. Skor Real-Use (multi-dimensi)

| Dimensi | Skor | Kata kunci |
|---------|------|-----------|
| Mobile kandidat | 6/10 | Form OK di HP, tapi halaman admin tak responsif; K-1 a11y nol |
| Onboarding HR | 3/10 | Tak ada wizard/status kesiapan; token manual |
| Error recovery | 5/10 | Fallback offline jujur ✓, tapi catch{} kosong menyebar |
| Workflow HR harian | 5/10 | Fitur inti lengkap, tapi tanpa sort/pagination/notifikasi |
| Kandidat experience | 5/10 | Funnel jalan, tapi a11y nol + bahasa campur |
| Operasional 24/7 | 4/10 | Email tanpa retry, tak ada monitoring/alert |

## D3. Roadmap prioritas Real-Use (10 item, urut dampak/usaha)

1. **O-1 Setup Wizard** — banner kesiapan di dashboard: [Token ✓/✗] [Akun ✓/✗] [Model ✓/✗] [Psikotes URL ✓/✗] dengan CTA ke tab masing-masing. (usaha kecil, dampak besar)
2. **U-1 sisa: E-1** — pesan eksplisit "Token admin belum diset / salah" di setiap view admin saat fetch 401. (kecil)
3. **K-3/O-5** — terjemahkan badge/status ke ID konsisten ("Diundang", "Psikotes Terkirim"). (kecil)
4. **M-1/M-2** — sidebar collapsible di mobile + pipeline jadi list dropdown di <960px. (sedang)
5. **W-1/W-2** — sorting kolom + pagination tabel admin. (sedang)
6. **K-2** — dark mode untuk halaman publik (vars sudah ada). (kecil)
7. **E-1** — error boundary + pesan global "Server tidak terjangkau" banner. (kecil)
8. **W-5** — polling ringan (30s) di dashboard HR untuk applicant/bookings baru + badge count. (sedang)
9. **R-2/R-3** — retry email queued via cron + notif HR saat post failed. (sedang)
10. **W-3** — hapus konfirmasi double untuk delete akun + undo toast 5 detik. (kecil)

---

## Cara memakai dokumen ini
1. Salin blok prompt §B ke agent/pen-audit baru.
2. Sertakan repo + ref commit yang diaudit (`git rev-parse HEAD`).
3. Minta output sesuai FORMAT OUTPUT — setiap temuan wajib ada evidence `file:line`.
4. Jalankan per flow (A–E) satu per satu untuk kedalaman, atau semua sekaligus.
5. **Baru:** jalankan §D sebagai checklist real-use sebelum rilis ke HR/kandidat asli.