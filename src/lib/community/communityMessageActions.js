import { supabase } from "../supabase.js";

// Stateless adapters for the existing Community RPCs. Presentation consumes the
// same server capabilities everywhere; a display name/account hint grants none.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REASONS = new Set(["allowed", "not_owner", "source_requires_review", "message_unavailable"]);
const unavailable = () => ({ state: "unavailable" });
const validId = value => typeof value === "string" && UUID.test(value);

async function scopedRpc(name, args, options, accept) {
  const { principalKey, getCurrentPrincipal, signal, client = supabase } = options || {};
  if (!principalKey) return { state: "login_required" };
  if (!validId(principalKey) || typeof getCurrentPrincipal !== "function") return unavailable();
  const current = () => {
    try { return getCurrentPrincipal() === principalKey && !signal?.aborted; }
    catch { return false; }
  };
  if (!current()) return { state: "stale" };
  if (typeof client?.rpc !== "function") return unavailable();
  try {
    let request = client.rpc(name, args);
    if (signal && typeof request?.abortSignal === "function") request = request.abortSignal(signal);
    const { data, error } = await request;
    if (!current()) return { state: "stale" };
    if (error) {
      if (error.code === "42501") return { state: "denied" };
      if (error.code === "55000" && error.message === "source_requires_review") return { state: "review_required" };
      return unavailable();
    }
    return accept(data);
  } catch {
    return current() ? unavailable() : { state: "stale" };
  }
}

export async function fetchCommunityMessageActions(ids, options) {
  if (!Array.isArray(ids) || ids.some(id => !validId(id))) throw new TypeError("invalid message ids");
  const requested = [...new Set(ids.map(id => id.toLowerCase()))];
  if (requested.length > 100) throw new RangeError("at most 100 messages per page");
  return scopedRpc("community_message_actions_v1", { p_ids: requested }, options, data => {
    if (!Array.isArray(data)) return unavailable();
    const items = Object.fromEntries(requested.map(id => [id, { state: "unavailable", canEdit: false, canDelete: false }]));
    const seen = new Set();
    for (const row of data) {
      const id = typeof row?.id === "string" ? row.id.toLowerCase() : "";
      if (!requested.includes(id) || seen.has(id) || typeof row.can_edit !== "boolean"
          || typeof row.can_delete !== "boolean" || !REASONS.has(row.reason)
          || row.reason !== "allowed" && (row.can_edit || row.can_delete)) return unavailable();
      seen.add(id);
      items[id] = { state: "ready", canEdit: row.can_edit, canDelete: row.can_delete, reason: row.reason };
    }
    return { state: "ready", principalKey: options.principalKey, items };
  });
}

export async function editCommunityMessage(id, body, options) {
  if (!validId(id) || typeof body !== "string") throw new TypeError("invalid message edit");
  const text = body.trim();
  if (!text || Array.from(text).length > 6000) throw new RangeError("body must contain 1 to 6000 characters");
  return scopedRpc("community_edit_message", { p_id: id, p_body: text }, options, data => {
    if (data === null) return { state: "unchanged" };
    if (typeof data !== "string" || !Number.isFinite(Date.parse(data))) return unavailable();
    return { state: "saved", editedAt: data };
  });
}

export async function deleteCommunityMessage(id, options) {
  if (!validId(id)) throw new TypeError("invalid message id");
  return scopedRpc("community_delete_message", { p_id: id }, options, data =>
    data === "deleted" || data === "already_deleted"
      ? { state: "deleted", alreadyDeleted: data === "already_deleted" }
      : unavailable());
}
