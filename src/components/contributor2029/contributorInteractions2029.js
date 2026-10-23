import { supabase } from "../../lib/supabase.js";

export async function contributorInteraction(key, { body, signal, fetcher = fetch, auth = supabase.auth, userId = null } = {}) {
  try {
    const headers = { Accept: "application/json" };
    if (userId) {
      const { data, error } = await auth.getSession();
      if (error || data?.session?.user?.id !== userId || !data?.session?.access_token) return { state: "login_required" };
      headers.Authorization = `Bearer ${data.session.access_token}`;
    }
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const response = await fetcher(`/api/contributor-interactions${body === undefined ? `?slug=${encodeURIComponent(key)}` : ""}`, {
      method: body === undefined ? "GET" : "POST", credentials: "omit", signal, headers,
      ...(body === undefined ? {} : { body: JSON.stringify({ slug: key, action: "message", body }) }),
    });
    const value = await response.json();
    if (body !== undefined) return { state: response.ok && value.state === "sent" ? "sent" : value.state === "login_required" ? "login_required" : "error" };
    if (!response.ok || value.state !== "ready") return { state: "unavailable" };
    return { state: "ready", owner: value.owner === true,
      followTopic: typeof value.followTopic === "string" && value.followTopic.startsWith("author:") ? value.followTopic : null,
      message: ["ready", "self", "login_required", "unavailable"].includes(value.message) ? value.message : "unavailable" };
  } catch { return { state: "unavailable" }; }
}
