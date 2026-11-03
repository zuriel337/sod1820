// Narrow transport for the EXISTING account, research-state and notebook APIs.
// The canonical Auth server and each endpoint's ownership checks remain authoritative.
export async function readingPersonalResponse(req, { apiKey, clientOrigin, fetchImpl = fetch, verify } = {}) {
  const u = new URL(req.url), db = "https://linswmnnkjxvweumprav.supabase.co";
  const table = u.origin === db ? /^\/rest\/v1\/(users|profiles|user_notes|research_items|user_research|notification_prefs|user_notifications)$/.exec(u.pathname)?.[1] : null;
  const rpc = u.origin === db ? /^\/rest\/v1\/rpc\/(research_state_snapshot_v1|research_state_apply_ops_v1|update_my_page_config|dm_inbox|dm_thread|dm_send)$/.exec(u.pathname)?.[1] : null;
  const selfApi = u.origin === clientOrigin && u.pathname === "/api/contributor-self";
  const avatar = u.origin === db && /^\/storage\/v1\/object\/gallery\/avatars\//.test(u.pathname);
  if (!table && !rpc && !selfApi && !avatar || table === "users" && ["GET","HEAD"].includes(req.method)) return null;
  const denied = () => new Response(JSON.stringify({ error: "personal_operation_denied" }), { status: 403, headers: { "Content-Type":"application/json", "Cache-Control":"no-store" } });
  if (table && !["GET","HEAD"].includes(req.method) && !["users","user_notes"].includes(table)) return denied();
  try {
    if (req.signal.aborted || !apiKey || typeof verify !== "function") return denied();
    const token = /^Bearer ([A-Za-z0-9_.-]+)$/i.exec(req.headers.get("Authorization") || "")?.[1];
    const uid = await verify({ token, apiKey, signal:req.signal, fetchImpl });
    if (!uid || req.signal.aborted) return denied();
    const keys = (x, allowed) => x && typeof x === "object" && !Array.isArray(x) && Object.keys(x).every(k => allowed.includes(k));
    const query = allowed => [...u.searchParams.keys()].every(k => allowed.includes(k)) && [...u.searchParams.keys()].every(k => u.searchParams.getAll(k).length === 1);
    const owner = table === "users" ? "id" : "user_id";
    const owned = () => u.searchParams.getAll(owner).length === 1 && u.searchParams.get(owner) === "eq." + uid;
    const forward = () => req.signal.aborted ? denied() : fetchImpl(new Request(req, { cache:"no-store", credentials:selfApi ? "same-origin" : "omit", redirect:"error" }));
    if (avatar) {
      if (req.method !== "POST" || u.search || req.headers.get("x-upsert") === "true") return denied();
      const path = u.pathname.slice("/storage/v1/object/gallery/avatars/".length);
      if (!new RegExp("^"+uid+"-[0-9]{10,17}\\.(?:jpe?g|png|webp|gif|avif)$", "i").test(path)) return denied();
      const body = await req.clone().formData(), file = body.get("");
      if (!file || typeof file.size !== "number" || file.size > 5*1024*1024 || !/^image\/(?:jpeg|png|webp|gif|avif)$/.test(file.type)) return denied();
      return forward();
    }
    if (["GET","HEAD"].includes(req.method)) {
      if (selfApi) return forward(); // Existing handler independently validates caller and inbox ownership.
      if (rpc) return denied(); // Owned RPCs use their exact JSON contracts below.
      if (!owned() || !query([owner,"select","limit","offset","order","read_at","id"])) return denied();
      return forward();
    }
    const raw = await req.clone().text();
    if (raw.length > 65536) return denied();
    const parsed = JSON.parse(raw), body = Array.isArray(parsed) && parsed.length === 1 ? parsed[0] : parsed;
    if (selfApi) return req.method === "POST" && keys(body,["action","ack","publish","url","name","bio","enabled"])
      && ["create","avatar","portrait"].includes(body.action) && body.ack === true ? forward() : denied();
    if (table === "users") {
      if (req.method !== "PATCH" || !owned() || !query(["id","select"]) || !keys(body,["display_name","username","avatar_url"]) || !Object.keys(body).length) return denied();
      if (Object.values(body).some(x => x !== null && (typeof x !== "string" || x.length > 2048))) return denied();
      if (body.avatar_url && !/^https?:\/\//i.test(body.avatar_url)) return denied();
      return forward();
    }
    if (table === "user_notes") {
      if (req.method !== "POST" || !query(["on_conflict","select","columns"]) || u.searchParams.get("on_conflict") !== "user_id"
        || !keys(body,["user_id","content","updated_at"]) || body.user_id !== uid || typeof body.content !== "string" || body.content.length > 30000
        || typeof body.updated_at !== "string" || !Number.isFinite(Date.parse(body.updated_at))) return denied();
      if (u.searchParams.has("columns") && u.searchParams.get("columns").replaceAll('"', '').split(',').sort().join(',') !== 'content,updated_at,user_id') return denied();
      return forward();
    }
    if (req.method !== "POST" || !rpc || u.search) return denied();
    const uuid = value => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    if (rpc === "dm_inbox") return keys(body,[]) ? forward() : denied();
    if (rpc === "dm_thread") return keys(body,["p_with","p_limit"]) && uuid(body.p_with) && (body.p_limit == null || Number.isInteger(body.p_limit) && body.p_limit >= 1 && body.p_limit <= 200) ? forward() : denied();
    if (rpc === "dm_send") return keys(body,["p_to","p_body"]) && uuid(body.p_to) && body.p_to !== uid && typeof body.p_body === "string" && body.p_body.trim().length > 0 && body.p_body.length <= 4000 ? forward() : denied();
    if (rpc === "research_state_snapshot_v1") return keys(body,["p_expected_user_id"]) && body.p_expected_user_id === uid ? forward() : denied();
    if (rpc === "update_my_page_config") return keys(body,["p_config"]) && keys(body.p_config,["version","display_name","bio","sections","highlights","links","accent","emblem"]) ? forward() : denied();
    const kinds = ["item_upsert","item_delete","item_clear_bucket","history_add","history_clear","context_set","collection_add","collection_update","collection_remove","collection_assign","journey_add","journey_remove","journey_clear"];
    return keys(body,["p_expected_user_id","p_ops","p_batch_id","p_expected_revision"]) && body.p_expected_user_id === uid
      && uuid(body.p_batch_id) && Number.isSafeInteger(body.p_expected_revision) && body.p_expected_revision >= 0
      && Array.isArray(body.p_ops) && body.p_ops.length > 0 && body.p_ops.length <= 100
      && body.p_ops.every(op => op && kinds.includes(op.kind) && uuid(op.op_id)
        && (!op.bucket || ["cart","library","pinned"].includes(op.bucket))) ? forward() : denied();
  } catch { return denied(); }
}
