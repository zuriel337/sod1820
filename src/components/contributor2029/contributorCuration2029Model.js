import { supabase } from "../../lib/supabase.js";

// Existing author-owned studio pins contain references only; no source body/media copy.
export function writerPinEntry(item, { id, enabled = true, sort = -1000 } = {}) {
  return { ...(id ? { id } : {}), kind: "pin", title: item.title, body: null, value: null,
    image_url: null, link_url: item.href, media: [], ref: item.href, ref_type: "source",
    is_public: enabled, is_personal: false, sort };
}
export async function updateWriterCuration(key, action, payload, { userId, auth = supabase.auth, fetcher = fetch } = {}) {
  try {
    const { data, error } = await auth.getSession();
    if (error || !userId || data?.session?.user?.id !== userId || !data.session.access_token) return { state: "login_required" };
    const response = await fetcher("/api/contributor-curation", { method: "POST", credentials: "same-origin", signal: AbortSignal.timeout(15000),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
      body: JSON.stringify({ slug: key, action, ...payload }) });
    const result = await response.json();
    return response.ok && result.state === "saved" ? { state: "saved" }
      : { state: ["login_required", "limit"].includes(result.state) ? result.state : "error" };
  } catch { return { state: "error" }; }
}
