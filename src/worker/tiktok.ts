export type TikTokAccount = {
  token: string;
  openId: string;
};

export type TikTokResult = {
  ok: boolean;
  postId?: string;
  error?: string;
};

const BASE = "https://open.tiktokapis.com/v2";

async function api(url: string, options: RequestInit, token: string): Promise<any> {
  const r = await fetch(url, {
    ...options,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(options?.headers || {}),
    },
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) return { error: (j?.error?.message || j?.error?.code || `HTTP ${r.status}`) };
  return j;
}

export async function publishToTikTok(account: TikTokAccount, caption: string, mediaUrls: string[]): Promise<TikTokResult> {
  const token = account.token;
  const openId = account.openId;
  if (!token) return { ok: false, error: "TikTok access_token required" };
  if (!openId) return { ok: false, error: "TikTok open_id required" };
  if (!mediaUrls.length) return { ok: false, error: "TikTok post needs a video/image URL" };

  try {
    // Video: POST /post/publish/video/init with source PULL_FROM_URL
    if (/\.(mp4|mov|webm|m4v)(\?|$)/i.test(mediaUrls[0])) {
      const init = await api(`${BASE}/post/publish/video/init/`, {
        method: "POST",
        body: JSON.stringify({
          post_info: { title: caption.slice(0, 2200), description: caption.slice(0, 2200) },
          source_info: { source: "PULL_FROM_URL", video_url: mediaUrls[0], video_cover_timestamp_ms: 0 },
        }),
      }, token);
      if (init.error || !init?.data?.publish_id) return { ok: false, error: init?.error || "TikTok video init failed" };
      return { ok: true, postId: init.data.publish_id };
    }

    // Image: TikTok image upload requires uploading binary parts (not via URL) — not supported here
    return { ok: false, error: "TikTok image posting not supported via PULL_FROM_URL; provide a video (mp4) URL" };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
