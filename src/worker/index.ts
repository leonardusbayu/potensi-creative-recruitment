import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { analyzeCvText } from "./cvAnalyzer";
import { analyzeWithLlm, analyzeWithFallback } from "./llm";
import { buildInviteEmail, buildRejectionEmail, escapeHtml } from "./email";
import { publishToMeta } from "./meta";
import { publishToTikTok } from "./tiktok";
import { encryptToken, decryptToken, inspectMetaToken, exchangeLongLivedToken, inspectTikTok } from "./social";

type Bindings = {
  DB: any;
  CV_BUCKET: any;
  CV_QUEUE: any;
  APP_URL: string;
  MEDIA_URL?: string;
  JWT_SECRET: string;
  ADMIN_TOKEN: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  OPENROUTER_API_KEY?: string;
  LLM_MODEL?: string;
  WEBHOOK_SECRET?: string;
  META_APP_ID?: string;
  META_APP_SECRET?: string;
};

type MessageBatch<T> = { messages: { body: T; ack(): void; retry(): void; attempts: number }[] };

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function requireAdmin(adminToken: string, authorization: string | undefined): boolean {
  return !!adminToken && authorization === `Bearer ${adminToken}`;
}

async function signJwt(payload: object, secret: string): Promise<string> {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })).replace(/=+$/, "");
  const body = btoa(JSON.stringify(payload)).replace(/=+$/, "");
  const data = `${header}.${body}`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${data}.${sigB64}`;
}

async function verifyJwt(token: string, secret: string): Promise<any | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const data = `${header}.${body}`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const sigBytes = Uint8Array.from(atob(sig.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  const valid = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(data));
  if (!valid) return null;
  try {
    const payload = JSON.parse(atob(body));
    if (payload.exp && payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

async function getSetting(env: Bindings, key: string): Promise<string | undefined> {
  try {
    const row = (await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first()) as any;
    return row?.value;
  } catch {
    return undefined;
  }
}

async function getOpenRouterKey(env: Bindings): Promise<string | undefined> {
  const saved = await getSetting(env, "openrouter_key");
  return saved || env.OPENROUTER_API_KEY || undefined;
}

async function sendEmail(env: Bindings, to: string, subject: string, html: string): Promise<boolean> {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) return false;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${env.RESEND_API_KEY}` },
      body: JSON.stringify({ from: env.EMAIL_FROM, to, subject, html }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

const app = new Hono<{ Bindings: Bindings }>();

const ALLOWED_ORIGINS = ["https://potensi-hr.pages.dev", "http://localhost:3000", "http://127.0.0.1:3000"];

app.use("*", cors({
  origin: (origin, c) => {
    const appUrl = c.env.APP_URL;
    if (appUrl && origin === appUrl) return origin;
    if (ALLOWED_ORIGINS.includes(origin)) return origin;
    return appUrl ?? origin;
  },
  credentials: true
}));
app.use("*", logger());

app.get("/api/health", (c) => c.json({ ok: true, service: "calendarjet-hr" }));

app.get("/api/health/detail", async (c) => {
  if (!requireAdmin(c.env.ADMIN_TOKEN, c.req.header("authorization"))) return c.json({ error: "unauthorized" }, 401);
  const checks: Record<string, unknown> = { db: false, r2: false, resend: !!c.env.RESEND_API_KEY, openrouter: false, webhooks: !!c.env.WEBHOOK_SECRET };
  try {
    await c.env.DB.prepare("SELECT 1").first();
    checks.db = true;
  } catch {}
  try {
    await c.env.CV_BUCKET.head(".__probe__");
    checks.r2 = true;
  } catch {
    checks.r2 = "unknown";
  }
  const orKey = await getOpenRouterKey(c.env);
  if (orKey) {
    try {
      const r = await fetch("https://openrouter.ai/api/v1/models", { headers: { authorization: `Bearer ${orKey}` } });
      checks.openrouter = r.ok;
    } catch {
      checks.openrouter = false;
    }
  }
  return c.json({ ok: checks.db === true, checks });
});

app.get("/api/audit-log", async (c) => {
  if (!requireAdmin(c.env.ADMIN_TOKEN, c.req.header("authorization"))) return c.json({ error: "unauthorized" }, 401);
  const { results } = await c.env.DB.prepare(
    "SELECT id, applicant_id, type, to_email, subject, status, sent_at FROM email_logs ORDER BY sent_at DESC LIMIT 100"
  ).all();
  return c.json({ log: results });
});

app.get("/api/export/:table", async (c) => {
  if (!requireAdmin(c.env.ADMIN_TOKEN, c.req.header("authorization"))) return c.json({ error: "unauthorized" }, 401);
  const table = c.req.param("table");
  const queries: Record<string, string> = {
    applicants: "SELECT * FROM applicants LIMIT 5000",
    bookings: "SELECT * FROM bookings LIMIT 5000",
    jobs: "SELECT * FROM jobs LIMIT 5000",
    social_posts: "SELECT * FROM social_posts LIMIT 5000",
  };
  const sql = queries[table];
  if (!sql) return c.json({ error: "invalid table" }, 400);
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ table, rows: results });
});

app.get("/api/jobs", async (c) => {
  const { results } = await c.env.DB.prepare("SELECT id, slug, title, description, status, created_at FROM jobs ORDER BY created_at DESC").all();
  return c.json({ jobs: results });
});

app.get("/api/jobs/slug/:slug", async (c) => {
  const slug = c.req.param("slug");
  const job = (await c.env.DB.prepare("SELECT id, slug, title, description, status FROM jobs WHERE slug = ? AND status = 'published'").bind(slug).first()) as any;
  if (!job) return c.json({ error: "job not found" }, 404);
  return c.json({ job });
});

app.post("/api/jobs", async (c) => {
  if (!requireAdmin(c.env.ADMIN_TOKEN, c.req.header("authorization"))) return c.json({ error: "unauthorized" }, 401);
  const body = await c.req.json<{ title: string; description?: string; criteria?: unknown; slug?: string }>();
  if (!body.title || body.title.trim().length < 3) return c.json({ error: "title min 3 chars" }, 400);
  const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const slug = body.slug ?? body.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now().toString(36).slice(2, 6);
  await c.env.DB.prepare(
    "INSERT INTO jobs (id, slug, title, description, criteria, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  )
    .bind(id, slug, body.title.trim(), (body.description ?? "").slice(0, 2000), JSON.stringify(body.criteria ?? {}), "published", new Date().toISOString())
    .run();
  return c.json({ id, slug });
});

app.get("/api/social/accounts", async (c) => {
  if (!requireAdmin(c.env.ADMIN_TOKEN, c.req.header("authorization"))) return c.json({ error: "unauthorized" }, 401);
  const { results } = await c.env.DB.prepare("SELECT * FROM social_accounts ORDER BY created_at DESC").all();
  return c.json({ accounts: results });
});

app.post("/api/social/validate", async (c) => {
  if (!requireAdmin(c.env.ADMIN_TOKEN, c.req.header("authorization"))) return c.json({ error: "unauthorized" }, 401);
  const { platform, token } = await c.req.json<{ platform: string; token: string }>();
  if (!platform || !token) return c.json({ error: "platform + token required" }, 400);

  if (platform === "tiktok") {
    const p = await inspectTikTok(token);
    if (!p.ok) return c.json({ ok: false, error: p.error });
    return c.json({ ok: true, name: p.displayName, openId: p.openId });
  }
  if (platform === "x") {
    return c.json({ ok: true, name: "X manual mode" });
  }

  const p = await inspectMetaToken(token);
  if (!p.ok) return c.json({ ok: false, error: p.error });

  let longLived: { token: string; expires?: string } | null = null;
  if (c.env.META_APP_ID && c.env.META_APP_SECRET) {
    const ex = await exchangeLongLivedToken(token, c.env.META_APP_ID, c.env.META_APP_SECRET);
    if (ex.token) longLived = { token: ex.token, expires: ex.expires };
  }
  return c.json({ ok: true, name: p.name, pages: p.pages, longLived });
});

app.post("/api/social/accounts/connect", async (c) => {
  if (!requireAdmin(c.env.ADMIN_TOKEN, c.req.header("authorization"))) return c.json({ error: "unauthorized" }, 401);
  const b = await c.req.json<{ platform: string; username: string; displayName?: string; accessToken: string; pageId?: string; openId?: string; tokenExpires?: string }>();
  if (!b.platform || !b.username || !b.accessToken) return c.json({ error: "platform, username, token required" }, 400);

  let encToken = b.accessToken;
  if (c.env.WEBHOOK_SECRET && c.env.JWT_SECRET) {
    encToken = await encryptToken(b.accessToken, c.env.WEBHOOK_SECRET + c.env.JWT_SECRET);
  }
  const id = `acct_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
  await c.env.DB.prepare(
    "INSERT INTO social_accounts (id, platform, username, display_name, access_token, page_id, open_id, status, created_at, token_encrypted, token_expires_at, conn_status, conn_checked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'connected', ?)"
  )
    .bind(id, b.platform, b.username.trim(), b.displayName || b.username.trim(), encToken, b.pageId || "", b.openId || "", b.accessToken ? "connected" : "manual", new Date().toISOString(), b.tokenExpires || null, new Date().toISOString())
    .run();
  return c.json({ id });
});

app.post("/api/social/accounts", async (c) => {
  if (!requireAdmin(c.env.ADMIN_TOKEN, c.req.header("authorization"))) return c.json({ error: "unauthorized" }, 401);
  const b = await c.req.json<{ platform: string; username: string; displayName?: string; accessToken?: string; pageId?: string; openId?: string }>();
  if (!b.platform || !b.username) return c.json({ error: "platform + username required" }, 400);
  const id = `acct_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
  await c.env.DB.prepare(
    "INSERT INTO social_accounts (id, platform, username, display_name, access_token, page_id, open_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  )
    .bind(id, b.platform, b.username.trim(), b.displayName || b.username.trim(), b.accessToken || "", b.pageId || "", b.openId || "", b.accessToken ? "connected" : "manual", new Date().toISOString())
    .run();
  return c.json({ id });
});

app.delete("/api/social/accounts/:id", async (c) => {
  if (!requireAdmin(c.env.ADMIN_TOKEN, c.req.header("authorization"))) return c.json({ error: "unauthorized" }, 401);
  await c.env.DB.prepare("DELETE FROM social_accounts WHERE id = ?").bind(c.req.param("id")).run();
  return c.json({ ok: true });
});

app.get("/api/social/posts", async (c) => {
  if (!requireAdmin(c.env.ADMIN_TOKEN, c.req.header("authorization"))) return c.json({ error: "unauthorized" }, 401);
  const { results } = await c.env.DB.prepare("SELECT * FROM social_posts ORDER BY scheduled_at DESC LIMIT 200").all();
  return c.json({ posts: results });
});

app.post("/api/social/posts", async (c) => {
  if (!requireAdmin(c.env.ADMIN_TOKEN, c.req.header("authorization"))) return c.json({ error: "unauthorized" }, 401);
  const b = await c.req.json<{ caption: string; platforms?: string[]; accountIds?: string[]; scheduledAt?: string; media?: string[]; jobSlug?: string }>();
  if (!b.caption || typeof b.caption !== "string" || b.caption.length > 5000) return c.json({ error: "caption required max 5000" }, 400);
  const id = `sp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const scheduledAt = b.scheduledAt ? new Date(b.scheduledAt).toISOString() : new Date().toISOString();
  await c.env.DB.prepare(
    "INSERT INTO social_posts (id, caption, platforms, account_ids, job_slug, media, scheduled_at, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?)"
  )
    .bind(id, b.caption, JSON.stringify(b.platforms || []), JSON.stringify(b.accountIds || []), b.jobSlug || "", JSON.stringify(b.media || []), scheduledAt, new Date().toISOString())
    .run();
  return c.json({ id });
});

app.post("/api/social/posts/:id/cancel", async (c) => {
  if (!requireAdmin(c.env.ADMIN_TOKEN, c.req.header("authorization"))) return c.json({ error: "unauthorized" }, 401);
  const id = c.req.param("id");
  const row = (await c.env.DB.prepare("SELECT id FROM social_posts WHERE id = ?").bind(id).first()) as any;
  if (!row) return c.json({ error: "not found" }, 404);
  await c.env.DB.prepare("UPDATE social_posts SET status = 'cancelled' WHERE id = ?").bind(id).run();
  return c.json({ ok: true, id, status: "cancelled" });
});

app.post("/api/social/posts/:id/publish", async (c) => {
  if (!requireAdmin(c.env.ADMIN_TOKEN, c.req.header("authorization"))) return c.json({ error: "unauthorized" }, 401);
  const id = c.req.param("id");
  const post = (await c.env.DB.prepare("SELECT * FROM social_posts WHERE id = ?").bind(id).first()) as any;
  if (!post) return c.json({ error: "not found" }, 404);
  const accounts = (await c.env.DB.prepare("SELECT * FROM social_accounts").all()).results as any[];
  const res = await publishPost(c.env, post, accounts);
  const status = res.ok ? "published" : "failed";
  await c.env.DB.prepare("UPDATE social_posts SET status = ?, published_at = ?, error = ?, post_ids = ? WHERE id = ?")
    .bind(status, res.ok ? new Date().toISOString() : null, res.error || null, JSON.stringify(res.postIds || {}), id)
    .run();
  return c.json({ ok: res.ok, status, error: res.error, postIds: res.postIds });
});

app.post("/api/social/upload", async (c) => {
  if (!requireAdmin(c.env.ADMIN_TOKEN, c.req.header("authorization"))) return c.json({ error: "unauthorized" }, 401);
  const form = await c.req.formData();
  const file = form.get("media") as File | null;
  if (!file) return c.json({ error: "media required" }, 400);
  if (file.size > 5 * 1024 * 1024) return c.json({ error: "media max 5MB" }, 413);
  if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) return c.json({ error: "image must be png/jpeg/webp/gif" }, 400);
  const id = `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const r2Key = `media/${id}-${sanitizeFileName(file.name)}`;
  await c.env.CV_BUCKET.put(r2Key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
  const mediaBase = c.env.MEDIA_URL || c.env.APP_URL;
  const url = `${mediaBase}/api/media/${r2Key.split("/")[1]}`;
  return c.json({ url, key: r2Key });
});

app.get("/api/media/:key", async (c) => {
  const key = c.req.param("key");
  const obj = await c.env.CV_BUCKET.get(`media/${key}`);
  if (!obj) return c.json({ error: "not found" }, 404);
  return c.body(obj.body as any, { headers: { "content-type": obj.httpMetadata?.contentType || "image/png" } });
});

async function publishPost(env: Bindings, post: any, accounts: any[]): Promise<{ ok: boolean; error?: string; postIds?: Record<string, string> }> {
  const mediaUrls = JSON.parse(post.media || "[]");
  const accountIds: string[] = JSON.parse(post.account_ids || "[]");
  const targets = accounts.filter((a) => accountIds.includes(a.id) && a.access_token && (["facebook", "instagram", "threads"].includes(a.platform) || (a.platform === "tiktok" && a.open_id)));
  if (targets.length === 0) return { ok: false, error: "no connected account with valid token for this post" };
  const postIds: Record<string, string> = {};
  let firstError: string | undefined;
  for (const acc of targets) {
    let plainToken = acc.access_token;
    if (env.WEBHOOK_SECRET && env.JWT_SECRET) {
      const dec = await decryptToken(plainToken, env.WEBHOOK_SECRET + env.JWT_SECRET);
      if (dec) plainToken = dec;
    }
    let r: any;
    if (acc.platform === "tiktok") {
      r = await publishToTikTok({ token: plainToken, openId: acc.open_id || "" }, post.caption, mediaUrls);
    } else {
      r = await publishToMeta({ token: plainToken, platform: acc.platform, pageId: acc.page_id || "" }, post.caption, mediaUrls);
    }
    if (r.ok) postIds[acc.platform] = r.postId;
    else firstError = firstError || r.error;
  }
  return { ok: Object.keys(postIds).length > 0, error: firstError, postIds };
}

app.post("/api/social/publish", async (c) => {
  if (!requireAdmin(c.env.ADMIN_TOKEN, c.req.header("authorization"))) return c.json({ error: "unauthorized" }, 401);
  const body = await c.req.json<{ caption: string; account: { token: string; platform: string; pageId: string; openId?: string }; mediaUrls: string[] }>();
  if (!body.caption || !body.account?.token) return c.json({ error: "caption + account.token required" }, 400);
  let res;
  if (body.account.platform === "tiktok") {
    res = await publishToTikTok({ token: body.account.token, openId: body.account.openId || "" }, body.caption, body.mediaUrls ?? []);
  } else {
    res = await publishToMeta(body.account, body.caption, body.mediaUrls ?? []);
  }
  return c.json(res, res.ok ? 200 : 400);
});

async function hitRateLimit(db: any, key: string, limit: number): Promise<boolean> {
  const now = new Date().toISOString();
  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const rl = (await db.prepare("SELECT count, window_start FROM rate_limits WHERE key = ?").bind(key).first()) as any;
  if (rl && rl.window_start > windowStart) {
    if (rl.count >= limit) return false;
    await db.prepare("UPDATE rate_limits SET count = count + 1 WHERE key = ?").bind(key).run();
    return true;
  }
  await db.prepare("INSERT INTO rate_limits (key, count, window_start) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = 1, window_start = ?")
    .bind(key, now, now)
    .run();
  return true;
}

app.post("/api/apply", async (c) => {
  const form = await c.req.formData();
  const file = form.get("cv") as File | null;
  const jobId = String(form.get("jobId") ?? "").trim();
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const wa = String(form.get("wa") ?? "").trim().slice(0, 20);
  const tiktok = String(form.get("tiktok") ?? "").trim().slice(0, 50);
  const ig = String(form.get("ig") ?? "").trim().slice(0, 50);

  const ip = c.req.header("cf-connecting-ip") || c.req.header("x-real-ip") || c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "";
  if (ip && !(await hitRateLimit(c.env.DB, `apply:ip:${ip}`, 10))) {
    return c.json({ error: "too many applications, try later" }, 429);
  }

  if (!file || !jobId || !email || !name) return c.json({ error: "cv, jobId, email, name required" }, 400);
  if (!isValidEmail(email)) return c.json({ error: "invalid email" }, 400);
  if (email.length > 120) return c.json({ error: "email too long" }, 400);
  if (name.length > 120) return c.json({ error: "name too long" }, 400);
  if (!(await hitRateLimit(c.env.DB, `apply:email:${email}`, 3))) {
    return c.json({ error: "too many applications from this email, try later" }, 429);
  }
  if (file.size > 10 * 1024 * 1024) return c.json({ error: "CV max 10MB" }, 413);
  if (!/^(application\/pdf|application\/msword|application\/vnd\.openxmlformats)/.test(file.type) && !file.name.match(/\.(pdf|docx?)$/i)) {
    return c.json({ error: "CV must be PDF/DOCX" }, 400);
  }
  if (name.length < 2) return c.json({ error: "name min 2 chars" }, 400);

  const existing = (await c.env.DB.prepare("SELECT id FROM applicants WHERE job_id = ? AND email = ?").bind(jobId, email).first()) as any;
  if (existing) return c.json({ error: "duplicate application for this job", existingId: existing.id }, 409);
  const crossJob = (await c.env.DB.prepare("SELECT id, job_id FROM applicants WHERE email = ? AND status != 'rejected' LIMIT 1").bind(email).first()) as any;
  if (crossJob) return c.json({ error: "already applied to another active job", existingId: crossJob.id, existingJobId: crossJob.job_id }, 409);

  const jobExists = (await c.env.DB.prepare("SELECT id FROM jobs WHERE id = ?").bind(jobId).first()) as any;
  if (!jobExists) return c.json({ error: "job not found" }, 404);

  const extraParts: string[] = [];
  const extraFields: [string, string][] = [
    ["usia", "Usia"],
    ["domisili", "Domisili"],
    ["pendidikan", "Pendidikan"],
    ["pengalaman", "Pengalaman Live"],
    ["portofolio", "Portofolio"],
    ["tema", "Produk/Tema"],
    ["alasan", "Alasan"],
    ["video", "Video Perkenalan"],
  ];
  for (const [field, label] of extraFields) {
    const v = String(form.get(field) ?? "").trim().slice(0, 2000);
    if (v) extraParts.push(`${label}: ${v}`);
  }
  const niches = form.getAll("niche").map((n) => String(n).trim()).filter(Boolean).slice(0, 10);
  if (niches.length) extraParts.push(`Niche: ${niches.join(", ")}`);
  const extraNotes = extraParts.join("\n").slice(0, 4000);

  const applicantId = `app_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const safeName = sanitizeFileName(file.name);
  const r2Key = `cv/${applicantId}-${safeName}`;
  await c.env.CV_BUCKET.put(r2Key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || "application/pdf" },
  });

  const cvText = (await file.text()).slice(0, 20000);

  await c.env.DB.prepare(
    "INSERT INTO applicants (id, job_id, name, email, wa, tiktok, ig, cv_r2_key, cv_text, status, notes, applied_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  )
    .bind(applicantId, jobId, name, email, wa, tiktok, ig, r2Key, cvText, "pending", extraNotes, new Date().toISOString())
    .run();

  try {
    await c.env.CV_QUEUE.send({ applicantId, jobId });
  } catch {}

  return c.json({ applicantId, status: "pending" });
});

app.post("/api/apply/sync", async (c) => {
  const b = await c.req.json<{ id?: string; jobId: string; name: string; email: string; wa?: string; tiktok?: string; ig?: string; appliedAt?: string }>();
  if (!b.jobId || !b.email || !b.name) return c.json({ error: "jobId, email, name required" }, 400);
  const email = String(b.email).trim().toLowerCase();
  if (!isValidEmail(email)) return c.json({ error: "invalid email" }, 400);
  if (!(await hitRateLimit(c.env.DB, `sync:email:${email}`, 5))) {
    return c.json({ error: "too many sync attempts, try later" }, 429);
  }
  const jobExists = (await c.env.DB.prepare("SELECT id FROM jobs WHERE id = ?").bind(b.jobId).first()) as any;
  if (!jobExists) return c.json({ error: "job not found" }, 404);
  const existing = (await c.env.DB.prepare("SELECT id FROM applicants WHERE job_id = ? AND email = ?").bind(b.jobId, email).first()) as any;
  if (existing) {
    await c.env.DB.prepare("UPDATE applicants SET name = ?, wa = ?, tiktok = ?, ig = ? WHERE id = ?")
      .bind(String(b.name).trim().slice(0, 120), (b.wa || "").slice(0, 20), (b.tiktok || "").slice(0, 50), (b.ig || "").slice(0, 50), existing.id)
      .run();
    return c.json({ applicantId: existing.id, merged: true });
  }
  const applicantId = `app_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  await c.env.DB.prepare(
    "INSERT INTO applicants (id, job_id, name, email, wa, tiktok, ig, cv_text, status, applied_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)"
  )
    .bind(applicantId, b.jobId, String(b.name).trim().slice(0, 120), email, (b.wa || "").slice(0, 20), (b.tiktok || "").slice(0, 50), (b.ig || "").slice(0, 50), "[synced offline — CV file tidak tersedia]", b.appliedAt || new Date().toISOString())
    .run();
  return c.json({ applicantId, created: true });
});

app.get("/api/applicants", async (c) => {
  if (!requireAdmin(c.env.ADMIN_TOKEN, c.req.header("authorization"))) return c.json({ error: "unauthorized" }, 401);
  const jobId = c.req.query("jobId");
  const status = c.req.query("status");
  const limit = Math.min(100, Math.max(1, Number(c.req.query("limit") ?? 50)));
  const offset = Math.max(0, Number(c.req.query("offset") ?? 0));
  let q = "SELECT * FROM applicants WHERE 1=1";
  const params: unknown[] = [];
  if (jobId) {
    q += " AND job_id = ?";
    params.push(jobId);
  }
  if (status) {
    q += " AND status = ?";
    params.push(status);
  }
  q += " ORDER BY applied_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);
  const stmt = c.env.DB.prepare(q).bind(...params);
  const { results } = await stmt.all();
  return c.json({ applicants: results, limit, offset });
});

app.get("/api/cv/:applicantId", async (c) => {
  if (!requireAdmin(c.env.ADMIN_TOKEN, c.req.header("authorization"))) return c.json({ error: "unauthorized" }, 401);
  const id = c.req.param("applicantId");
  const { results } = await c.env.DB.prepare("SELECT * FROM cv_analyses WHERE applicant_id = ? ORDER BY created_at DESC").bind(id).all();
  return c.json({ analyses: results });
});

app.get("/api/cv/:applicantId/file", async (c) => {
  if (!requireAdmin(c.env.ADMIN_TOKEN, c.req.header("authorization"))) return c.json({ error: "unauthorized" }, 401);
  const id = c.req.param("applicantId");
  const row = (await c.env.DB.prepare("SELECT cv_r2_key FROM applicants WHERE id = ?").bind(id).first()) as any;
  if (!row?.cv_r2_key) return c.json({ error: "no CV file" }, 404);
  const obj = await c.env.CV_BUCKET.get(row.cv_r2_key);
  if (!obj) return c.json({ error: "CV not found" }, 404);
  return c.body(obj.body as any, { headers: { "content-type": obj.httpMetadata?.contentType || "application/pdf", "content-disposition": `inline; filename="cv-${id}.pdf"` } });
});

app.post("/api/cv/analyze/:applicantId", async (c) => {
  if (!requireAdmin(c.env.ADMIN_TOKEN, c.req.header("authorization"))) return c.json({ error: "unauthorized" }, 401);
  const applicantId = c.req.param("applicantId");
  const row = (await c.env.DB.prepare("SELECT * FROM applicants WHERE id = ?").bind(applicantId).first()) as any;
  if (!row) return c.json({ error: "not found" }, 404);
  const job = (await c.env.DB.prepare("SELECT criteria FROM jobs WHERE id = ?").bind(row.job_id).first()) as any;
  const criteria = job?.criteria ? JSON.parse(job.criteria) : {};
  const start = Date.now();
  const savedModel = await getSetting(c.env, "llm_model");
  const modelName = savedModel || c.env.LLM_MODEL;
  const orKey = await getOpenRouterKey(c.env);
  const llmResult = await analyzeWithLlm({ apiKey: orKey, model: modelName, cvText: row.cv_text ?? "", criteria, tiktok: row.tiktok, ig: row.ig });
  const result = llmResult || analyzeWithFallback(row.cv_text ?? "", { criteria, tiktok: row.tiktok, ig: row.ig });
  const model = llmResult ? (modelName || "openrouter") : "heuristic-fallback";
  const analysisId = `ana_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
  await c.env.DB.prepare(
    "INSERT INTO cv_analyses (id, applicant_id, parsed, score, missing_skills, strengths, decision, model, duration_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  )
    .bind(
      analysisId,
      applicantId,
      JSON.stringify(result.parsed),
      JSON.stringify(result.score),
      JSON.stringify(result.missingSkills),
      JSON.stringify(result.strengths),
      result.decision,
      model,
      Date.now() - start,
      new Date().toISOString()
    )
    .run();
  await c.env.DB.prepare("UPDATE applicants SET status = ?, score = ?, ai_summary = ? WHERE id = ?")
    .bind("analyzed", result.score.overall, result.aiSummary, applicantId)
    .run();
  return c.json({ analysis: result, model });
});

app.post("/api/email/:type/:applicantId", async (c) => {
  const type = c.req.param("type") as "invite" | "reject";
  if (!requireAdmin(c.env.ADMIN_TOKEN, c.req.header("authorization"))) return c.json({ error: "unauthorized" }, 401);
  const applicantId = c.req.param("applicantId");
  const row = (await c.env.DB.prepare("SELECT * FROM applicants WHERE id = ?").bind(applicantId).first()) as any;
  if (!row) return c.json({ error: "not found" }, 404);
  if (type === "reject") {
    const latest = (await c.env.DB.prepare("SELECT missing_skills FROM cv_analyses WHERE applicant_id = ? ORDER BY created_at DESC").bind(applicantId).first()) as any;
    let missingSkills: string[] = [];
    try {
      missingSkills = latest?.missing_skills ? JSON.parse(latest.missing_skills) : [];
    } catch {
      missingSkills = [];
    }
    const rej = buildRejectionEmail(row.name, missingSkills);
    const sent = await sendEmail(c.env, row.email, rej.subject, rej.html);
    await c.env.DB.prepare("INSERT INTO email_logs (id, applicant_id, type, to_email, subject, status, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(`em_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`, applicantId, "rejection", row.email, rej.subject, sent ? "sent" : "queued", new Date().toISOString())
      .run();
    await c.env.DB.prepare("UPDATE applicants SET status = 'rejected' WHERE id = ?").bind(applicantId).run();
    return c.json({ queued: !sent, sent, type: "rejection" });
  }
  const token = await signJwt({ applicantId, jobId: row.job_id, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }, c.env.JWT_SECRET);
  const invite = buildInviteEmail(c.env.APP_URL, token, row.name);
  const sent = await sendEmail(c.env, row.email, invite.subject, invite.html);
  await c.env.DB.prepare("INSERT INTO email_logs (id, applicant_id, type, to_email, subject, status, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(`em_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`, applicantId, "invite", row.email, invite.subject, sent ? "sent" : "queued", new Date().toISOString())
    .run();
  await c.env.DB.prepare("UPDATE applicants SET status = 'invited' WHERE id = ?").bind(applicantId).run();
  return c.json({ queued: !sent, sent, token });
});

app.get("/api/bookings", async (c) => {
  if (!requireAdmin(c.env.ADMIN_TOKEN, c.req.header("authorization"))) return c.json({ error: "unauthorized" }, 401);
  const { results } = await c.env.DB.prepare("SELECT * FROM bookings ORDER BY date DESC, time DESC LIMIT 200").all();
  return c.json({ bookings: results });
});

app.post("/api/bookings/interview", async (c) => {
  const { token, date, time, jobId } = await c.req.json<{ token: string; date: string; time: string; jobId: string }>();
  if (!token || !date || !time) return c.json({ error: "token,date,time required" }, 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return c.json({ error: "invalid date" }, 400);
  if (!/^\d{2}:\d{2}$/.test(time)) return c.json({ error: "invalid time" }, 400);
  const payload = await verifyJwt(token, c.env.JWT_SECRET);
  if (!payload) return c.json({ error: "invalid or expired token" }, 401);
  const applicantId = payload.applicantId;
  const applicant = (await c.env.DB.prepare("SELECT id, name, email FROM applicants WHERE id = ?").bind(applicantId).first()) as any;
  if (!applicant) return c.json({ error: "applicant not found" }, 404);
  const conflict = (await c.env.DB.prepare("SELECT id FROM bookings WHERE date = ? AND time = ? AND status = 'confirmed'").bind(date, time).first()) as any;
  if (conflict) return c.json({ error: "slot already booked, pick another time" }, 409);
  const bid = `bkg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const startMins = Number(time.split(":")[0]) * 60 + Number(time.split(":")[1]);
  const endTime = `${String(Math.floor((startMins + 30) / 60)).padStart(2, "0")}:${String((startMins + 30) % 60).padStart(2, "0")}`;
  const meetingLink = `https://meet.google.com/${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 6)}`;
  await c.env.DB.prepare(
    "INSERT INTO bookings (id, applicant_id, job_id, event_id, event_title, date, time, end_time, timezone, invitee_name, invitee_email, meeting_type, meeting_link, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Asia/Jakarta', ?, ?, ?, ?, 'confirmed', ?)"
  )
    .bind(bid, applicantId, payload.jobId || jobId || "", "evt-potensi-interview", "Interview Live Streamer", date, time, endTime, applicant.name, applicant.email, "google_meet", meetingLink, new Date().toISOString())
    .run();
  await c.env.DB.prepare("UPDATE applicants SET status = 'booked' WHERE id = ?").bind(applicantId).run();
  return c.json({ ok: true, booking: { id: bid, applicantId, jobId: payload.jobId || jobId || "", eventTitle: "Interview Live Streamer", date, time, endTime, timezone: "Asia/Jakarta", inviteeName: applicant.name, inviteeEmail: applicant.email, meetingType: "google_meet", meetingLink, status: "confirmed" } });
});

app.post("/api/bookings/:id/reschedule", async (c) => {
  const { token, date, time } = await c.req.json<{ token: string; date: string; time: string }>();
  if (!token || !date || !time) return c.json({ error: "token,date,time required" }, 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return c.json({ error: "invalid date/time" }, 400);
  const payload = await verifyJwt(token, c.env.JWT_SECRET);
  if (!payload) return c.json({ error: "invalid or expired token" }, 401);
  const id = c.req.param("id");
  const booking = (await c.env.DB.prepare("SELECT id, applicant_id FROM bookings WHERE id = ?").bind(id).first()) as any;
  if (!booking) return c.json({ error: "booking not found" }, 404);
  if (booking.applicant_id !== payload.applicantId) return c.json({ error: "not your booking" }, 403);
  const conflict = (await c.env.DB.prepare("SELECT id FROM bookings WHERE date = ? AND time = ? AND status = 'confirmed' AND id != ?").bind(date, time, id).first()) as any;
  if (conflict) return c.json({ error: "slot already booked" }, 409);
  const startMins = Number(time.split(":")[0]) * 60 + Number(time.split(":")[1]);
  const endTime = `${String(Math.floor((startMins + 30) / 60)).padStart(2, "0")}:${String((startMins + 30) % 60).padStart(2, "0")}`;
  await c.env.DB.prepare("UPDATE bookings SET date = ?, time = ?, end_time = ? WHERE id = ?").bind(date, time, endTime, id).run();
  const appRow = (await c.env.DB.prepare("SELECT name, email FROM applicants WHERE id = ?").bind(booking.applicant_id).first()) as any;
  if (appRow) {
    const html = `<div style="font-family:system-ui;padding:24px"><h2>Hai ${escapeHtml(appRow.name)},</h2><p>Jadwal interview Anda berhasil <b>diubah</b>.</p><p>Jadwal baru: <b>${date}</b> pukul <b>${time} WIB</b></p><p>Jika jadwal ini tidak cocok, ubah lagi atau batalkan dari halaman status lamaran Anda.</p><p>- HR Team</p></div>`;
    await sendEmail(c.env, appRow.email, "Konfirmasi Perubahan Jadwal Interview", html);
    await c.env.DB.prepare("INSERT INTO email_logs (id, applicant_id, type, to_email, subject, status, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(`em_${Date.now()}_rs`, booking.applicant_id, "reschedule", appRow.email, "Konfirmasi Perubahan Jadwal Interview", "sent", new Date().toISOString())
      .run();
  }
  return c.json({ ok: true, id, date, time, endTime });
});

app.post("/api/bookings/:id/cancel", async (c) => {
  const { token } = await c.req.json<{ token: string }>();
  if (!token) return c.json({ error: "token required" }, 400);
  const payload = await verifyJwt(token, c.env.JWT_SECRET);
  if (!payload) return c.json({ error: "invalid or expired token" }, 401);
  const id = c.req.param("id");
  const booking = (await c.env.DB.prepare("SELECT id, applicant_id FROM bookings WHERE id = ?").bind(id).first()) as any;
  if (!booking) return c.json({ error: "booking not found" }, 404);
  if (booking.applicant_id !== payload.applicantId) return c.json({ error: "not your booking" }, 403);
  await c.env.DB.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").bind(id).run();
  await c.env.DB.prepare("UPDATE applicants SET status = 'invited' WHERE id = ?").bind(payload.applicantId).run();
  const appRow = (await c.env.DB.prepare("SELECT name, email FROM applicants WHERE id = ?").bind(payload.applicantId).first()) as any;
  if (appRow) {
    const html = `<div style="font-family:system-ui;padding:24px"><h2>Hai ${escapeHtml(appRow.name)},</h2><p>Jadwal interview Anda pada booking <b>#${id.slice(0, 12)}</b> telah <b>dibatalkan</b>.</p><p>Anda masih diundang untuk interview — silakan pilih jadwal baru dari email undangan Anda (berlaku 7 hari).</p><p>- HR Team</p></div>`;
    await sendEmail(c.env, appRow.email, "Konfirmasi Pembatalan Jadwal Interview", html);
    await c.env.DB.prepare("INSERT INTO email_logs (id, applicant_id, type, to_email, subject, status, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(`em_${Date.now()}_cl`, booking.applicant_id, "cancel", appRow.email, "Konfirmasi Pembatalan Jadwal Interview", "sent", new Date().toISOString())
      .run();
  }
  return c.json({ ok: true, id, status: "cancelled" });
});

app.post("/api/email/offer/:applicantId", async (c) => {
  if (!requireAdmin(c.env.ADMIN_TOKEN, c.req.header("authorization"))) return c.json({ error: "unauthorized" }, 401);
  const applicantId = c.req.param("applicantId");
  const row = (await c.env.DB.prepare("SELECT * FROM applicants WHERE id = ?").bind(applicantId).first()) as any;
  if (!row) return c.json({ error: "not found" }, 404);
  const tpl = (await c.env.DB.prepare("SELECT subject, body FROM email_templates WHERE type = 'offer'").first()) as any;
  const subject = tpl?.subject || "Selamat! Anda Diterima sebagai Live Streamer";
  const body = tpl?.body || `<div style="font-family:system-ui;padding:24px"><h2>Hai ${row.name},</h2><p>Selamat! Anda diterima sebagai <b>Live Streamer</b> di Potensi Creative.</p><p>Tim HR akan menghubungi Anda untuk langkah selanjutnya.</p><p>— HR Team</p></div>`;
  const sent = await sendEmail(c.env, row.email, subject, body);
  await c.env.DB.prepare("INSERT INTO email_logs (id, applicant_id, type, to_email, subject, status, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(`em_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`, applicantId, "offer", row.email, subject, sent ? "sent" : "queued", new Date().toISOString())
    .run();
  await c.env.DB.prepare("UPDATE applicants SET status = 'hired', hired_at = ? WHERE id = ?").bind(new Date().toISOString(), applicantId).run();
  return c.json({ queued: !sent, sent, type: "offer" });
});

app.post("/api/psychotest/send/:applicantId", async (c) => {
  if (!requireAdmin(c.env.ADMIN_TOKEN, c.req.header("authorization"))) return c.json({ error: "unauthorized" }, 401);
  const applicantId = c.req.param("applicantId");
  const row = (await c.env.DB.prepare("SELECT * FROM applicants WHERE id = ?").bind(applicantId).first()) as any;
  if (!row) return c.json({ error: "not found" }, 404);
  const psyUrl = (await getSetting(c.env, "psychotest_url")) || "";
  if (!psyUrl) return c.json({ error: "psychotest URL not configured" }, 400);
  const sep = psyUrl.includes("?") ? "&" : "?";
  const link = `${psyUrl}${sep}applicantId=${encodeURIComponent(applicantId)}`;
  const tpl = (await c.env.DB.prepare("SELECT subject, body FROM email_templates WHERE type = 'psychotest'").first()) as any;
  const safeName = escapeHtml(row.name);
  const subject = tpl?.subject || "Undangan Psikotes - Potensi Creative";
  const body = tpl?.body || `<div style="font-family:system-ui;padding:24px"><h2>Hai ${safeName},</h2><p>Selamat! Anda lolos interview. Silakan ikuti psikotes online berikut:</p><p><a href="${link}" style="background:#4F46E5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Mulai Psikotes</a></p><p>- HR Team</p></div>`;
  const sent = await sendEmail(c.env, row.email, subject, body);
  await c.env.DB.prepare("INSERT INTO email_logs (id, applicant_id, type, to_email, subject, status, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(`em_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`, applicantId, "psychotest", row.email, subject, sent ? "sent" : "queued", new Date().toISOString())
    .run();
  await c.env.DB.prepare("UPDATE applicants SET status = 'test_sent', psychotest_sent_at = ?, psychotest_link = ? WHERE id = ?").bind(new Date().toISOString(), link, applicantId).run();
  return c.json({ queued: !sent, sent, psychotest_url: link });
});

function sanitizeText(s: string): string {
  return String(s ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim();
}

app.post("/api/psychotest/result/:applicantId", async (c) => {
  if (!requireAdmin(c.env.ADMIN_TOKEN, c.req.header("authorization"))) return c.json({ error: "unauthorized" }, 401);
  const applicantId = c.req.param("applicantId");
  const { score, notes } = await c.req.json<{ score?: number; notes?: string }>();
  const row = (await c.env.DB.prepare("SELECT id FROM applicants WHERE id = ?").bind(applicantId).first()) as any;
  if (!row) return c.json({ error: "not found" }, 404);
  const safeNotes = sanitizeText(String(notes ?? "")).slice(0, 2000);
  await c.env.DB.prepare("UPDATE applicants SET psychotest_score = ?, psychotest_notes = ?, status = 'tested' WHERE id = ?").bind(score ?? null, safeNotes, applicantId).run();
  return c.json({ ok: true, id: applicantId, score: score ?? null, notes: safeNotes, status: "tested" });
});

app.post("/api/psychotest/callback", async (c) => {
  const expected = c.env.WEBHOOK_SECRET;
  const provided = c.req.header("x-webhook-secret") || "";
  if (!expected || provided !== expected) return c.json({ error: "unauthorized" }, 401);
  const body = await c.req.json<{ applicantId?: string; email?: string; score?: number; notes?: string }>();
  if (!body.email && !body.applicantId) return c.json({ error: "email or applicantId required" }, 400);
  const safeNotes = sanitizeText(String(body.notes ?? "")).slice(0, 2000);
  let row: any;
  if (body.applicantId) {
    row = (await c.env.DB.prepare("SELECT id, status FROM applicants WHERE id = ?").bind(body.applicantId).first()) as any;
  } else {
    row = (await c.env.DB.prepare("SELECT id, status FROM applicants WHERE email = ?").bind((body.email || "").toLowerCase()).first()) as any;
  }
  if (!row) return c.json({ error: "applicant not found" }, 404);
  if (row.status !== "test_sent") return c.json({ error: `applicant not awaiting psychotest (status: ${row.status})` }, 409);
  await c.env.DB.prepare("UPDATE applicants SET psychotest_score = ?, psychotest_notes = ?, status = 'tested' WHERE id = ?")
    .bind(body.score ?? null, safeNotes, row.id)
    .run();
  return c.json({ ok: true, id: row.id, status: "tested" });
});

app.get("/api/analytics", async (c) => {
  if (!requireAdmin(c.env.ADMIN_TOKEN, c.req.header("authorization"))) return c.json({ error: "unauthorized" }, 401);
  const { results } = await c.env.DB.prepare("SELECT status, COUNT(*) as count FROM applicants GROUP BY status").all() as any;
  const counts: Record<string, number> = { pending: 0, analyzed: 0, invited: 0, booked: 0, interviewed: 0, test_sent: 0, tested: 0, hired: 0, rejected: 0 };
  for (const r of results) if (counts[r.status] !== undefined) counts[r.status] = r.count;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const posts = (await c.env.DB.prepare("SELECT status, COUNT(*) as count FROM social_posts GROUP BY status").all()) as any;
  const postCounts: Record<string, number> = { scheduled: 0, published: 0, failed: 0, cancelled: 0 };
  for (const r of posts.results) if (postCounts[r.status] !== undefined) postCounts[r.status] = r.count;
  return c.json({ applicants: counts, total, posts: postCounts });
});

app.post("/api/wa/:applicantId", async (c) => {
  if (!requireAdmin(c.env.ADMIN_TOKEN, c.req.header("authorization"))) return c.json({ error: "unauthorized" }, 401);
  const applicantId = c.req.param("applicantId");
  const row = (await c.env.DB.prepare("SELECT name, wa, status FROM applicants WHERE id = ?").bind(applicantId).first()) as any;
  if (!row) return c.json({ error: "not found" }, 404);
  if (!row.wa) return c.json({ error: "no WhatsApp number" }, 400);
  const msg = row.status === "invited"
    ? `Halo ${row.name}, selamat! Anda diundang interview Live Streamer di Potensi Creative. Silakan cek email untuk booking jadwal.`
    : row.status === "hired"
    ? `Halo ${row.name}, selamat! Anda diterima sebagai Live Streamer di Potensi Creative.`
    : `Halo ${row.name}, terima kasih telah melamar di Potensi Creative.`;
  const link = `https://wa.me/${row.wa.replace(/[^\d]/g, "")}?text=${encodeURIComponent(msg)}`;
  return c.json({ ok: true, link, message: msg });
});

app.patch("/api/jobs/:id", async (c) => {
  if (!requireAdmin(c.env.ADMIN_TOKEN, c.req.header("authorization"))) return c.json({ error: "unauthorized" }, 401);
  const id = c.req.param("id");
  const { status, title, description } = await c.req.json<{ status?: string; title?: string; description?: string }>();
  const row = (await c.env.DB.prepare("SELECT id FROM jobs WHERE id = ?").bind(id).first()) as any;
  if (!row) return c.json({ error: "not found" }, 404);
  if (status) await c.env.DB.prepare("UPDATE jobs SET status = ? WHERE id = ?").bind(status, id).run();
  if (title) await c.env.DB.prepare("UPDATE jobs SET title = ? WHERE id = ?").bind(title, id).run();
  if (description !== undefined) await c.env.DB.prepare("UPDATE jobs SET description = ? WHERE id = ?").bind(description, id).run();
  return c.json({ ok: true, id });
});

app.post("/api/applicants/:id/notes", async (c) => {
  if (!requireAdmin(c.env.ADMIN_TOKEN, c.req.header("authorization"))) return c.json({ error: "unauthorized" }, 401);
  const id = c.req.param("id");
  const { notes } = await c.req.json<{ notes: string }>();
  const row = (await c.env.DB.prepare("SELECT id FROM applicants WHERE id = ?").bind(id).first()) as any;
  if (!row) return c.json({ error: "not found" }, 404);
  const safeNotes = sanitizeText(String(notes ?? "")).slice(0, 4000);
  await c.env.DB.prepare("UPDATE applicants SET notes = ? WHERE id = ?").bind(safeNotes, id).run();
  return c.json({ ok: true, id, notes: safeNotes });
});

app.get("/api/templates", async (c) => {
  if (!requireAdmin(c.env.ADMIN_TOKEN, c.req.header("authorization"))) return c.json({ error: "unauthorized" }, 401);
  const { results } = await c.env.DB.prepare("SELECT * FROM email_templates").all();
  return c.json({ templates: results });
});

app.post("/api/templates/:type", async (c) => {
  if (!requireAdmin(c.env.ADMIN_TOKEN, c.req.header("authorization"))) return c.json({ error: "unauthorized" }, 401);
  const type = c.req.param("type");
  const { subject, body } = await c.req.json<{ subject: string; body: string }>();
  if (!subject || !body) return c.json({ error: "subject + body required" }, 400);
  await c.env.DB.prepare(
    "INSERT INTO email_templates (id, type, subject, body, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(type) DO UPDATE SET subject = ?, body = ?, updated_at = ?"
  )
    .bind(`tpl_${type}`, type, subject, body, new Date().toISOString(), subject, body, new Date().toISOString())
    .run();
  return c.json({ ok: true, type });
});

app.get("/api/models", async (c) => {
  if (!requireAdmin(c.env.ADMIN_TOKEN, c.req.header("authorization"))) return c.json({ error: "unauthorized" }, 401);
  const key = await getOpenRouterKey(c.env);
  if (!key) return c.json({ error: "OpenRouter key not set — simpan di UI (Pengaturan HR → AI Model) atau set env OPENROUTER_API_KEY" }, 400);
  try {
    const r = await fetch("https://openrouter.ai/api/v1/models", { headers: { authorization: `Bearer ${key}` } });
    if (!r.ok) return c.json({ error: `OpenRouter ${r.status} — pastikan API key valid` }, 502);
    const j = await r.json();
    const models = (j.data || []).map((m: any) => ({ id: m.id, name: m.name, context: m.context_length, pricing: m.pricing }));
    return c.json({ models });
  } catch (e) {
    return c.json({ error: String(e) }, 502);
  }
});

const SECRET_SETTING_KEYS = new Set(["openrouter_key"]);

function maskSecret(value: string): string {
  if (value.length <= 8) return "••••••••";
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

app.get("/api/settings", async (c) => {
  if (!requireAdmin(c.env.ADMIN_TOKEN, c.req.header("authorization"))) return c.json({ error: "unauthorized" }, 401);
  const { results } = await c.env.DB.prepare("SELECT key, value FROM settings").all() as any;
  const map: Record<string, string> = {};
  for (const r of results) map[r.key] = SECRET_SETTING_KEYS.has(r.key) ? maskSecret(r.value) : r.value;
  return c.json({ settings: map });
});

app.post("/api/settings", async (c) => {
  if (!requireAdmin(c.env.ADMIN_TOKEN, c.req.header("authorization"))) return c.json({ error: "unauthorized" }, 401);
  const body = await c.req.json<{ key: string; value: string }>();
  if (!body.key) return c.json({ error: "key required" }, 400);
  const existing = (await c.env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind(body.key).first()) as any;
  if (SECRET_SETTING_KEYS.has(body.key) && typeof body.value === "string" && body.value.includes("••")) {
    return c.json({ error: "masked value cannot be saved - enter a new key" }, 400);
  }
  if (!body.key.match(/^[a-z_]{1,40}$/)) return c.json({ error: "invalid key format" }, 400);
  await c.env.DB.prepare(
    "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?"
  )
    .bind(body.key, body.value, new Date().toISOString(), body.value, new Date().toISOString())
    .run();
  return c.json({ ok: true, key: body.key });
});

app.post("/api/applicants/:id/status", async (c) => {
  if (!requireAdmin(c.env.ADMIN_TOKEN, c.req.header("authorization"))) return c.json({ error: "unauthorized" }, 401);
  const id = c.req.param("id");
  const { status } = await c.req.json<{ status: string }>();
  const allowed = ["pending", "analyzed", "invited", "booked", "interviewed", "test_sent", "tested", "hired", "rejected"];
  if (!allowed.includes(status)) return c.json({ error: "invalid status" }, 400);
  const row = (await c.env.DB.prepare("SELECT id FROM applicants WHERE id = ?").bind(id).first()) as any;
  if (!row) return c.json({ error: "not found" }, 404);
  await c.env.DB.prepare("UPDATE applicants SET status = ? WHERE id = ?").bind(status, id).run();
  return c.json({ ok: true, id, status });
});

export default {
  fetch: app.fetch,
  async scheduled(event: { cron?: string; scheduledTime?: number }, env: Bindings, ctx: { waitUntil(p: Promise<unknown>): void }) {
    const now = new Date().toISOString();
    const accounts = (await env.DB.prepare("SELECT * FROM social_accounts").all()).results as any[];

    const encSecret = env.WEBHOOK_SECRET && env.JWT_SECRET ? env.WEBHOOK_SECRET + env.JWT_SECRET : null;
    for (const acc of accounts) {
      if (!acc.access_token) { await env.DB.prepare("UPDATE social_accounts SET conn_status = 'manual', conn_checked_at = ? WHERE id = ?").bind(now, acc.id).run(); continue; }
      let plain = acc.access_token;
      if (encSecret) { const d = await decryptToken(plain, encSecret); if (d) plain = d; }
      const probe = acc.platform === "tiktok" ? await inspectTikTok(plain) : ["facebook", "instagram", "threads"].includes(acc.platform) ? await inspectMetaToken(plain) : null;
      const st = probe ? (probe.ok ? "connected" : "invalid") : "unknown";
      await env.DB.prepare("UPDATE social_accounts SET conn_status = ?, conn_checked_at = ?, conn_error = ? WHERE id = ?")
        .bind(st, now, probe && !probe.ok ? String(probe.error).slice(0, 300) : null, acc.id)
        .run();
    }

    const { results } = await env.DB.prepare(
      "SELECT * FROM social_posts WHERE status = 'scheduled' AND scheduled_at <= ? ORDER BY scheduled_at ASC LIMIT 20"
    ).bind(now).all() as any;
    for (const post of results) {
      const res = await publishPost(env, post, accounts);
      const status = res.ok ? "published" : "failed";
      await env.DB.prepare(
        "UPDATE social_posts SET status = ?, published_at = ?, error = ?, post_ids = ? WHERE id = ?"
      )
        .bind(status, res.ok ? now : null, res.error || null, JSON.stringify(res.postIds || {}), post.id)
        .run();
      if (!res.ok) {
        const hrEmail = await getSetting(env, "hr_alert_email");
        if (hrEmail) {
          const sent = await sendEmail(env, hrEmail, "[Potensi Creative] Post Gagal Terbit", `<div style="font-family:system-ui;padding:16px"><p>Post <b>${post.id}</b> gagal diterbitkan.</p><p>Alasan: ${String(res.error || "unknown").replace(/</g, "&lt;")}</p><p>Buka dashboard → Kalender Post untuk periksa.</p></div>`);
          if (sent) console.log("[Cron] HR notified of failed post", post.id);
        }
      }
    }

    const queuedEmails = (await env.DB.prepare(
      "SELECT id, applicant_id, type, to_email, subject FROM email_logs WHERE status = 'queued' LIMIT 10"
    ).all()).results as any[];
    for (const em of queuedEmails) {
      const row = (await env.DB.prepare("SELECT email, name FROM applicants WHERE id = ?").bind(em.applicant_id).first()) as any;
      if (!row) {
        await env.DB.prepare("UPDATE email_logs SET status = 'failed' WHERE id = ?").bind(em.id).run();
        continue;
      }
      const tpl = (await env.DB.prepare("SELECT subject, body FROM email_templates WHERE type = ?").bind(em.type).first()) as any;
      let html = tpl?.body || "";
      let subject = tpl?.subject || em.subject;
      if (em.type === "invite") {
        const token = await signJwt({ applicantId: em.applicant_id, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }, env.JWT_SECRET);
        html = buildInviteEmail(env.APP_URL, token, row.name).html;
      } else if (em.type === "rejection") {
        html = buildRejectionEmail(row.name, []).html;
      }
      const ok = html ? await sendEmail(env, row.email, subject, html) : false;
      await env.DB.prepare("UPDATE email_logs SET status = ?, sent_at = ? WHERE id = ?")
        .bind(ok ? "sent" : "failed", new Date().toISOString(), em.id)
        .run();
    }
  },
  async queue(batch: MessageBatch<{ applicantId: string; jobId: string }>, env: Bindings) {
    for (const msg of batch.messages) {
      try {
        const { applicantId } = msg.body;
        const row = (await env.DB.prepare("SELECT cv_text, tiktok, ig, job_id FROM applicants WHERE id = ?").bind(applicantId).first()) as any;
        if (!row) {
          msg.ack();
          continue;
        }
        const job = (await env.DB.prepare("SELECT criteria FROM jobs WHERE id = ?").bind(row.job_id).first()) as any;
        const criteria = job?.criteria ? JSON.parse(job.criteria) : {};
        const savedModel = await getSetting(env, "llm_model");
        const modelName = savedModel || env.LLM_MODEL;
        const orKey = await getOpenRouterKey(env);
        const llmResult = await analyzeWithLlm({ apiKey: orKey, model: modelName, cvText: row.cv_text ?? "", criteria, tiktok: row.tiktok, ig: row.ig });
        const result = llmResult || analyzeWithFallback(row.cv_text ?? "", { criteria, tiktok: row.tiktok, ig: row.ig });
        const model = llmResult ? (modelName || "openrouter") : "heuristic-fallback";
        const analysisId = `ana_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
        await env.DB.prepare(
          "INSERT INTO cv_analyses (id, applicant_id, parsed, score, missing_skills, strengths, decision, model, duration_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
          .bind(
            analysisId,
            applicantId,
            JSON.stringify(result.parsed),
            JSON.stringify(result.score),
            JSON.stringify(result.missingSkills),
            JSON.stringify(result.strengths),
            result.decision,
            model,
            0,
            new Date().toISOString()
          )
          .run();
        await env.DB.prepare("UPDATE applicants SET status = ?, score = ?, ai_summary = ? WHERE id = ?")
          .bind("analyzed", result.score.overall, result.aiSummary, applicantId)
          .run();
        msg.ack();
      } catch (e) {
        try {
          if (msg.attempts >= 3) {
            msg.ack();
            await env.DB.prepare("UPDATE applicants SET status = 'analyzed', ai_summary = ? WHERE id = ? AND status = 'pending'")
              .bind(`[ANALISIS GAGAL] ${(e as Error)?.message?.slice(0, 150) || "unknown error"} — jalankan Analisis ulang manual.`, msg.body.applicantId)
              .run();
            const hrEmail = await getSetting(env, "hr_alert_email");
            if (hrEmail) {
              await sendEmail(env, hrEmail, "[Potensi Creative] Analisis CV Gagal", `<div style="font-family:system-ui;padding:16px"><p>Analisis AI untuk pelamar <b>${msg.body.applicantId}</b> gagal setelah beberapa percobaan.</p><p>Error: ${escapeHtml(String((e as Error)?.message || "unknown")).slice(0, 200)}</p><p>Buka dashboard → Review CV → klik Analisis ulang manual.</p></div>`);
            }
          } else {
            msg.retry();
          }
        } catch {
          msg.ack();
        }
      }
    }
  },
};
