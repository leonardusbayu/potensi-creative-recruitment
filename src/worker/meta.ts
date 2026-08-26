export type MetaAccount = {
  token: string;
  platform: string;
  pageId: string;
};

export type PublishResult = {
  ok: boolean;
  platform: string;
  postId?: string;
  error?: string;
};

async function graphApi(url: string): Promise<any> {
  const r = await fetch(url);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) return { error: (j?.error?.message || `HTTP ${r.status}`) };
  return j;
}

export async function publishToMeta(account: MetaAccount, caption: string, mediaUrls: string[]): Promise<PublishResult> {
  const platform = account.platform;
  const token = account.token;
  const pageId = account.pageId;
  const base = "https://graph.facebook.com/v21.0";

  try {
    if (platform === "facebook") {
      if (!pageId) return { ok: false, platform, error: "pageId required for Facebook page post" };
      const url = `${base}/${pageId}/feed?message=${encodeURIComponent(caption)}&access_token=${encodeURIComponent(token)}`;
      const j = await graphApi(url);
      return j.error ? { ok: false, platform, error: j.error } : { ok: true, platform, postId: j.id };
    }

    if (platform === "instagram") {
      if (!pageId) return { ok: false, platform, error: "ig-user-id required" };
      if (!mediaUrls.length) return { ok: false, platform, error: "Instagram photo/video post needs media URL" };
      const createUrl = `${base}/${pageId}/media?image_url=${encodeURIComponent(mediaUrls[0])}&caption=${encodeURIComponent(caption)}&access_token=${encodeURIComponent(token)}`;
      const container = await graphApi(createUrl);
      if (container.error) return { ok: false, platform, error: container.error };
      const publishUrl = `${base}/${pageId}/media_publish?creation_id=${container.id}&access_token=${encodeURIComponent(token)}`;
      const pub = await graphApi(publishUrl);
      return pub.error ? { ok: false, platform, error: pub.error } : { ok: true, platform, postId: pub.id };
    }

    if (platform === "threads") {
      if (!pageId) return { ok: false, platform, error: "threads-user-id required" };
      const createUrl = `${base}/${pageId}/threads?text=${encodeURIComponent(caption)}&access_token=${encodeURIComponent(token)}`;
      const container = await graphApi(createUrl);
      if (container.error) return { ok: false, platform, error: container.error };
      const publishUrl = `${base}/${pageId}/threads_publish?creation_id=${container.id}&access_token=${encodeURIComponent(token)}`;
      const pub = await graphApi(publishUrl);
      return pub.error ? { ok: false, platform, error: pub.error } : { ok: true, platform, postId: pub.id };
    }

    return { ok: false, platform, error: `unsupported platform ${platform} for Meta publisher` };
  } catch (e) {
    return { ok: false, platform, error: String(e) };
  }
}
