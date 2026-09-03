# Deploy ke Cloudflare — Panduan Kolaborasi Tim (Git Integration)

Dokumen ini memandu setup **Cloudflare Workers Git Integration** untuk repo
`github.com/leonardusbayu/potensi-creative-recruitment`. Setiap push ke `main`
akan otomatis di-deploy ke Cloudflare.

> ⚠️ Langkah-langkah di bawah **harus dilakukan di dashboard Cloudflare** oleh
> pemilik akun (kamu). Saya tidak bisa mengklik dashboard — ini yang perlu kamu
> lakukan manual. Semua yang bisa saya siapkan dari sisi repo sudah siap.

---

## Prasyarat

- Akun Cloudflare dengan **Workers** diaktifkan
- Repo GitHub sudah ada: `leonardusbayu/potensi-creative-recruitment`
- `wrangler.jsonc` sudah diperbarui (name = `potensi-creative-recruitment`)

---

## Langkah 1 — Upgrade token Cloudflare (dari read-only ke deploy)

Token saat ini hanya `account(read)` + `user(read)` — **tidak bisa deploy**.

1. Buka https://dash.cloudflare.com/profile/api-tokens
2. Klik **Create Token** → pilih template **"Edit Cloudflare Workers"**
3. Set permissions:
   - `Account > Workers Scripts > Edit`
   - `Account > Workers R2 Storage > Edit`
   - `Account > Workers D1 > Edit`
   - `Account > Workers Queues > Edit`
   - `Account > Workers AI > Edit`
4. Scope ke account kamu → **Create**
5. Simpan token (hanya tampil sekali)

---

## Langkah 2 — Buat resource Cloudflare (D1, R2, Queue)

Dari terminal (setelah token di-upgrade), atau via dashboard:

```bash
# D1 database
npx wrangler d1 create potensi_creative_hr
# → catat database_id, isi ke wrangler.jsonc (ganti REPLACE_WITH_REAL_D1_ID)

# R2 bucket
npx wrangler r2 bucket create potensi-cv-store

# Queue
npx wrangler queues create cv-queue
npx wrangler queues create cv-queue-dlq
```

> Setelah D1 dibuat, jalankan schema:
> ```bash
> npx wrangler d1 execute potensi_creative_hr --file=./schema.sql
> ```

---

## Langkah 3 — Set secrets

```bash
npx wrangler secret put JWT_SECRET
npx wrangler secret put ADMIN_TOKEN
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put EMAIL_FROM
npx wrangler secret put OPENROUTER_API_KEY
npx wrangler secret put WEBHOOK_SECRET
```

---

## Langkah 4 — Hubungkan Git integration di Cloudflare

1. Buka https://dash.cloudflare.com → **Workers & Pages**
2. Klik **Create** → **Create Worker** → pilih **"Connect to Git repository"**
3. Pilih repo `potensi-creative-recruitment`
4. Pilih branch `main`
5. Cloudflare akan auto-detect `wrangler.jsonc` → build + deploy otomatis tiap push

---

## Langkah 5 — Kolaborasi tim

- Semua anggota **clone repo**:
  ```bash
  git clone https://github.com/leonardusbayu/potensi-creative-recruitment.git
  ```
- Setiap perubahan → **branch baru** → **Pull Request** → merge ke `main`
- Merge ke `main` → Cloudflare auto-deploy

---

## Catatan penting

- **Secrets tidak pernah di-commit** (ada di `.gitignore`). Set via `wrangler secret put`.
- `database_id` di `wrangler.jsonc` harus diisi ID asli setelah D1 dibuat.
- `APP_URL` di `wrangler.jsonc` masih `http://localhost:3000` — ganti ke URL worker setelah deploy.
