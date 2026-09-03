const enc = new TextEncoder();
const dec = new TextDecoder();

function b64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) out[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  return out;
}

async function deriveKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(secret));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptToken(plain: string, secret: string): Promise<string> {
  const key = await deriveKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12)) as unknown as Uint8Array<ArrayBuffer>;
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as unknown as BufferSource }, key, enc.encode(plain));
  return iv.join("") + ":" + b64(ct);
}

export async function decryptToken(stored: string, secret: string): Promise<string | null> {
  try {
    const sep = stored.indexOf(":");
    if (sep < 0) return stored;
    const iv = hexToBytes(stored.slice(0, sep)) as unknown as Uint8Array<ArrayBuffer>;
    const data = Uint8Array.from(atob(stored.slice(sep + 1)), (c) => c.charCodeAt(0)) as unknown as Uint8Array<ArrayBuffer>;
    const key = await deriveKey(secret);
    return dec.decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data));
  } catch {
    return null;
  }
}

export type MetaProfile = {
  ok: boolean;
  error?: string;
  name?: string;
  pages?: { id: string; name: string; igBusinessId?: string | null }[];
};

export async function inspectMetaToken(token: string): Promise<MetaProfile> {
  const base = "https://graph.facebook.com/v21.0";
  try {
    const me = await graphApi(`${base}/me?fields=id,name&access_token=${encodeURIComponent(token)}`);
    if (me.error) return { ok: false, error: me.error };
    const accounts = await graphApi(`${base}/me/accounts?fields=id,name,instagram_business_account{id,username}&access_token=${encodeURIComponent(token)}`);
    const pages = (accounts.data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      igBusinessId: p.instagram_business_account?.id ?? null,
    }));
    return { ok: true, name: me.name, pages };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

async function graphApi(url: string): Promise<any> {
  const r = await fetch(url);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) return { error: (j?.error?.message || `HTTP ${r.status}`) };
  return j;
}

export async function exchangeLongLivedToken(shortToken: string, appId: string, appSecret: string): Promise<{ token?: string; expires?: string; error?: string }> {
  const url = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&fb_exchange_token=${encodeURIComponent(shortToken)}`;
  const j = await graphApi(url);
  if (j.error) return { error: j.error };
  return { token: j.access_token, expires: j.expires_in ? new Date(Date.now() + j.expires_in * 1000).toISOString() : undefined };
}

export type TikTokProfile = { ok: boolean; error?: string; openId?: string; displayName?: string };

export async function inspectTikTok(token: string): Promise<TikTokProfile> {
  try {
    const r = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name", {
      headers: { authorization: `Bearer ${token}` },
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: (j?.error?.message || `HTTP ${r.status}`) };
    return { ok: true, openId: j?.data?.user?.open_id, displayName: j?.data?.user?.display_name };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}