// Web Push subscription write path (DEF-001b), kept free of env / SDK imports so it can be unit-tested with a stub client.
//
// Normal path: the two SECURITY DEFINER RPCs. They exist only after supabase/proposed/20261106121000_def001b_visitor_id_exposure_step1.sql
// is applied (listed in supabase/proposed/APPLY-BEFORE-DEPLOY.json). Deploy order is therefore a hazard: a frontend that is
// live BEFORE the SQL would otherwise fail every subscribe / unsubscribe with "function not found".
//
// Rollout-order degradation: if (and only if) the RPC answers "function not found" (PostgREST PGRST202 / HTTP 404), that single
// call falls back, once, to the direct table path the previous release used. Once step 1 is applied the RPC exists and the
// fallback is never taken; step 2 (the anon table lockdown) must only be applied after step 1 and this frontend are live.
// Any other failure (permission, validation, network, server error) is reported as is and never retried through the table.
// Nothing is logged: endpoints and push keys are bearer-style secrets.

function errorMessage(error) {
  return String(error?.message || error);
}

// True only for "the function is not deployed (yet)". supabase-js reports a missing function as
// { error: { code: "PGRST202", message: "Could not find the function ... in the schema cache" }, status: 404 }.
export function isRpcMissing(result) {
  const error = result?.error;
  if (!error) return false;
  return error.code === "PGRST202"
    || result.status === 404
    || error.status === 404
    || /could not find the function/i.test(String(error.message || ""));
}

// The previous release's direct write, unchanged apart from checking the result.
async function tableUpsert(client, sub) {
  const { error } = await client.from("push_subscriptions").upsert({
    endpoint: sub.endpoint,
    p256dh: sub.p256dh,
    auth: sub.auth,
    user_id: sub.userId || null,
    visitor_id: sub.visitorId ?? null,
    topics: sub.topics,
    user_agent: sub.userAgent,
    last_seen: new Date().toISOString(),
  }, { onConflict: "endpoint" });
  return error ? { ok: false, error: errorMessage(error) } : { ok: true, via: "table" };
}

async function tableDelete(client, endpoint) {
  const { error } = await client.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return error ? { ok: false, error: errorMessage(error) } : { ok: true, via: "table" };
}

// sub: { endpoint, p256dh, auth, topics, userAgent, userId, visitorId }. The RPC takes the account from the session
// (auth.uid()); visitorId only identifies an anonymous subscription, so callers pass null when a user is signed in.
// Resolves { ok, via: "rpc" | "table" } or { ok: false, error }; rejects only if the client itself throws.
export async function upsertPushSubscription(client, sub) {
  const res = await client.rpc("push_subscription_upsert_v1", {
    p_endpoint: sub.endpoint,
    p_p256dh: sub.p256dh,
    p_auth: sub.auth,
    p_topics: sub.topics,
    p_user_agent: sub.userAgent,
    p_visitor: sub.visitorId ?? null,
  });
  if (!res?.error) return { ok: true, via: "rpc" };
  if (!isRpcMissing(res)) return { ok: false, error: errorMessage(res.error) };
  return tableUpsert(client, sub);
}

export async function deletePushSubscription(client, endpoint) {
  const res = await client.rpc("push_subscription_delete_v1", { p_endpoint: endpoint });
  if (!res?.error) return { ok: true, via: "rpc" };
  if (!isRpcMissing(res)) return { ok: false, error: errorMessage(res.error) };
  return tableDelete(client, endpoint);
}
