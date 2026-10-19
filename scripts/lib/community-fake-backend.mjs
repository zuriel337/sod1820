// In-memory stand-in for the community_* functions and the few reads the community page makes.
// Mirrors tests/sql/community_edit_delete_threads.sql. Shared by the browser test and the local preview.
export const A = "a0000000-0000-4000-8000-000000000001";
export const B = "b0000000-0000-4000-8000-000000000002";
export const ADMIN = "ad000000-0000-4000-8000-000000000003";
export const profiles = { [A]: { id: A, display_name: "אילנה", username: "ilana", role: "user" }, [B]: { id: B, display_name: "בועז", username: "boaz", role: "user" }, [ADMIN]: { id: ADMIN, display_name: "מנהל", username: "admin", role: "admin" } };
export const id = (n) => `c0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const T0 = Date.parse("2026-10-01T10:00:00Z");

export function makeStore() {
  const rows = [];
  let tick = 0;
  const add = (n, parent, author, body, origin = "community_2029") => rows.push({ id: id(n), parent_id: parent ? id(parent) : null, author_user_id: author, author_contributor_id: null, author_name: author ? profiles[author].display_name : "חבר ותיק", title: null, body, reactions: {}, origin, status: "approved", created_at: new Date(T0 + 60000 * ++tick + 1000000000).toISOString(), edited_at: null, deleted_at: null, thread_hidden_at: null, image_url: null });
  for (let i = 0; i < 45; i++) add(200 + i, null, null, `הודעה ותיקה ${i + 1}`, "openweb"); // older than everything below, so the tested messages sit on page one
  add(1, null, A, "הודעת מקור של אילנה https://example.org/page");
  add(2, 1, B, "תגובה של בועז"); add(3, 2, A, "תגובה מקוננת של אילנה"); add(4, 1, B, "תגובה שנייה של בועז");
  add(5, null, B, "הודעה בלי תגובות של בועז");
  add(6, null, null, "הודעה היסטורית מ-OpenWeb", "openweb");
  for (let i = 0; i < 25; i++) add(100 + i, 6, null, `תגובה ותיקה ${i + 1}`, "openweb");
  return rows;
}

export function semantics(rows) {
  const archive = new Map(); const edits = []; const reports = []; const legacy = new Map([[B, { messages: 3 }]]);
  const live = (r) => r.status === "approved" && !r.deleted_at && !r.thread_hidden_at && ["openweb", "community_2029"].includes(r.origin) && (r.body || "").trim();
  const kids = (pid) => rows.filter((r) => r.parent_id === pid);
  const hasLive = (pid, depth = 0) => depth < 64 && kids(pid).some((c) => live(c) || (c.deleted_at && !c.thread_hidden_at && hasLive(c.id, depth + 1)));
  const visible = (r) => live(r) ? "live" : (r.deleted_at && !r.thread_hidden_at && ["openweb", "community_2029"].includes(r.origin) && hasLive(r.id)) ? "tomb" : null;
  const shape = (r, kind, total) => ({ id: r.id, parent_id: r.parent_id, author_name: kind === "tomb" ? null : r.author_name, author_user_id: kind === "tomb" ? null : r.author_user_id, author_contributor_id: null, title: null, body: kind === "tomb" ? null : r.body, reactions: kind === "tomb" ? {} : r.reactions, origin: r.origin, created_at: r.created_at, edited_at: kind === "tomb" ? null : r.edited_at, is_deleted: kind === "tomb", contributor_id: null, contributor_user_id: null, contributor_display_name: null, contributor_avatar_url: null, total_count: total });
  const page = (list, offset, limit, asc, always) => {
    const sorted = list.sort((x, y) => (asc ? 1 : -1) * (x.r.created_at.localeCompare(y.r.created_at) || x.r.id.localeCompare(y.r.id)));
    return sorted.slice(offset, offset + limit).map(({ r, kind }) => shape(r, kind, offset === 0 || always ? sorted.length : null));
  };
  return {
    feed: ({ p_offset = 0, p_limit = 40, p_sort }) => page(rows.filter((r) => !r.parent_id).map((r) => ({ r, kind: visible(r) })).filter((x) => x.kind), p_offset, p_limit, p_sort === "oldest", false),
    replies: ({ p_parent, p_offset = 0, p_limit = 20 }) => page(kids(p_parent).map((r) => ({ r, kind: visible(r) })).filter((x) => x.kind), p_offset, p_limit, true, true),
    counts: ({ p_ids }) => p_ids.map((pid) => ({ parent_id: pid, reply_count: kids(pid).filter(visible).length })).filter((x) => x.reply_count),
    edit(uid, { p_id, p_body }) {
      if (!uid) throw new Error("auth required");
      const r = rows.find((x) => x.id === p_id); if (!r) throw new Error("not found");
      if (r.origin !== "community_2029" || r.author_user_id !== uid) throw new Error("not authorized");
      if (r.deleted_at || r.status !== "approved") throw new Error("not editable");
      if (!p_body.trim()) throw new Error("empty body");
      edits.push({ id: r.id, body: r.body, by: uid, at: new Date().toISOString() });
      r.body = p_body.trim(); r.edited_at = new Date().toISOString(); return r.edited_at;
    },
    remove(uid, { p_id }) {
      if (!uid) throw new Error("auth required");
      const r = rows.find((x) => x.id === p_id); if (!r) throw new Error("not found");
      const admin = profiles[uid]?.role === "admin";
      if (!admin && !(r.origin === "community_2029" && r.author_user_id === uid)) throw new Error("not authorized");
      if (r.deleted_at) return "already_deleted";
      archive.set(r.id, { body: r.body, status: r.status });
      Object.assign(r, { body: null, deleted_at: new Date().toISOString(), deleted_by: uid, status: "hidden" }); return "deleted";
    },
    hide(uid, { p_root }) {
      if (profiles[uid]?.role !== "admin") throw new Error("not authorized");
      const stack = [p_root]; let n = 0;
      while (stack.length) { const cur = stack.pop(); const r = rows.find((x) => x.id === cur); if (r && !r.thread_hidden_at && (r.status === "approved" || r.deleted_at)) { r.thread_hidden_at = new Date().toISOString(); if (r.status === "approved") r.status = "hidden"; n++; } kids(cur).forEach((k) => stack.push(k.id)); }
      return n;
    },
    claimByEmail(uid) {
      if (!uid) throw new Error("not_authenticated");
      const hit = legacy.get(uid); if (!hit) return { claimed: 0, messages: 0, reason: "account_has_contributor" };
      legacy.delete(uid); return { claimed: 1, messages: hit.messages, reason: null };
    },
    restore(uid, { p_id }) {
      if (!uid) throw new Error("auth required");
      const r = rows.find((x) => x.id === p_id); if (!r) throw new Error("not found");
      const admin = profiles[uid]?.role === "admin";
      if (r.thread_hidden_at) {
        if (!admin) throw new Error("not authorized");
        const stamp = r.thread_hidden_at; rows.filter((x) => x.thread_hidden_at === stamp).forEach((x) => { x.thread_hidden_at = null; if (!x.deleted_at && x.status === "hidden") x.status = "approved"; });
        return "thread_restored";
      }
      if (!r.deleted_at) throw new Error("nothing to restore");
      if (!admin && !(r.author_user_id === uid && r.deleted_by === uid && Date.now() - Date.parse(r.deleted_at) < 5 * 60000)) throw new Error("not authorized");
      const a = archive.get(r.id); if (!a) throw new Error("nothing to restore");
      Object.assign(r, { body: a.body, status: a.status || "approved", deleted_at: null, deleted_by: null }); archive.delete(r.id); return "restored";
    },
    removed(uid) {
      if (profiles[uid]?.role !== "admin") throw new Error("not authorized");
      const out = [];
      rows.forEach((r) => {
        if (r.thread_hidden_at && !rows.some((p) => p.id === r.parent_id && p.thread_hidden_at === r.thread_hidden_at)) out.push({ kind: "thread", id: r.id, parent_id: r.parent_id, author_name: r.author_name, body: r.body ?? archive.get(r.id)?.body ?? null, at: r.thread_hidden_at });
        else if (r.deleted_at && !r.thread_hidden_at && archive.has(r.id)) out.push({ kind: "deleted", id: r.id, parent_id: r.parent_id, author_name: r.author_name, body: archive.get(r.id).body, at: r.deleted_at });
      });
      return out.sort((x, y) => y.at.localeCompare(x.at));
    },
    history(uid, { p_id }) {
      if (profiles[uid]?.role !== "admin") throw new Error("not authorized");
      return edits.filter((e) => e.id === p_id).reverse().map((e) => ({ body: e.body, edited_by_name: profiles[e.by]?.display_name || "חבר הקהילה", edited_at: e.at }));
    },
    chainVisible(r) { let cur = r; for (let d = 0; d < 30 && cur.parent_id; d++) { cur = rows.find((x) => x.id === cur.parent_id); if (!cur || !visible(cur)) return false; } return !cur?.parent_id; },
    context({ p_id }) {
      const target = rows.find((x) => x.id === p_id);
      if (!target || !visible(target) || !this.chainVisible(target)) return [];
      const chain = []; for (let cur = target; cur; cur = rows.find((x) => x.id === cur.parent_id)) { chain.unshift(cur); if (!cur.parent_id) break; }
      return chain.map((r) => shape(r, visible(r), null));
    },
    search({ p_query, p_offset = 0, p_limit = 20 }) {
      const q = (p_query || "").trim().toLowerCase(); if (q.length < 2) return [];
      const hits = rows.filter((r) => live(r) && r.body.toLowerCase().includes(q) && this.chainVisible(r)).sort((x, y) => y.created_at.localeCompare(x.created_at) || y.id.localeCompare(x.id));
      return hits.slice(p_offset, p_offset + p_limit).map((r) => shape(r, false, p_offset === 0 ? hits.length : null));
    },
    report(uid, { p_id, p_reason, p_note }) {
      if (!uid) throw new Error("auth required");
      const r = rows.find((x) => x.id === p_id); if (!r || !live(r)) throw new Error("not found");
      if (r.author_user_id === uid) throw new Error("own message");
      if (reports.some((x) => x.message_id === p_id && x.reporter_id === uid)) return "already_reported";
      reports.push({ id: `r${reports.length + 1}`, message_id: p_id, reporter_id: uid, reason: p_reason, note: p_note, status: "open", created_at: new Date().toISOString() }); return "reported";
    },
    adminReports(uid) {
      if (profiles[uid]?.role !== "admin") throw new Error("not authorized");
      const seen = new Set();
      return reports.filter((x) => x.status === "open" && !seen.has(x.message_id) && seen.add(x.message_id)).map((x) => { const r = rows.find((m) => m.id === x.message_id); return { report_id: x.id, message_id: x.message_id, parent_id: r.parent_id, reason: x.reason, note: x.note, body: r.body ?? archive.get(r.id)?.body, author_name: r.author_name, reporter_name: profiles[x.reporter_id]?.display_name, created_at: x.created_at, report_count: reports.filter((y) => y.message_id === x.message_id && y.status === "open").length }; });
    },
    resolve(uid, { p_report, p_action }) {
      if (profiles[uid]?.role !== "admin") throw new Error("not authorized");
      const rep = reports.find((x) => x.id === p_report); if (!rep) throw new Error("not found");
      if (p_action === "delete") this.remove(uid, { p_id: rep.message_id }); else if (p_action === "hide_thread") this.hide(uid, { p_root: rep.message_id });
      reports.filter((x) => x.message_id === rep.message_id && x.status === "open").forEach((x) => { x.status = p_action === "dismiss" ? "dismissed" : "resolved"; }); return p_action;
    },
  };
}

const b64 = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
export function sessionFor(uid) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const user = { id: uid, aud: "authenticated", role: "authenticated", email: "x@example.invalid", email_confirmed_at: "2026-10-13T00:00:00Z", app_metadata: {}, user_metadata: {}, identities: [], created_at: "2026-01-01T00:00:00Z" };
  return { user, session: { access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: uid, role: "authenticated", exp })}.sig`, refresh_token: "r", token_type: "bearer", expires_in: 3600, expires_at: exp, user } };
}
export const subOf = (header) => { try { return JSON.parse(Buffer.from((header || "").replace(/^Bearer /, "").split(".")[1], "base64url").toString()).sub || null; } catch { return null; } };

// Routes every request of a browser context: the app origin and OpenWeb are handled here,
// the Supabase host is answered from `rows`, everything else is blocked.
export async function installFakeBackend(context, { base, rows, sem, log, rpc = "on", failDelete = false }) {
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === base) return route.fallback();
    if (url.host === "launcher.spot.im") { log.launcher++; return route.fulfill({ status: 200, contentType: "application/javascript", body: "" }); }
    if (url.host !== "linswmnnkjxvweumprav.supabase.co") return route.abort();
    const req = route.request(); const uid = subOf(req.headers()["authorization"]) || null;
    const json = (data, status = 200, headers = {}) => route.fulfill({ status, contentType: "application/json", headers, body: JSON.stringify(data) });
    const path = url.pathname;
    if (path === "/auth/v1/user") return json(sessionFor(uid || A).user);
    if (path === "/rest/v1/users") { const ids = (url.searchParams.get("id") || "").replace(/^in\.\(|\)$/g, "").split(","); const hit = (uid && profiles[uid] ? [profiles[uid]] : []).concat(ids.filter((x) => profiles[x] && x !== uid).map((x) => profiles[x])); return json(hit); }
    if (path === "/rest/v1/site_flags") return json([]);
    if (path.startsWith("/rest/v1/rpc/community_")) {
      const fn = path.split("/").pop(); const args = req.postDataJSON() || {};
      log.rpcCalls.push(fn);
      if (rpc === "missing") return json({ code: "PGRST202", message: "Could not find the function public." + fn, details: null, hint: null }, 404);
      try {
        if (fn === "community_feed_page") return json(sem.feed(args));
        if (fn === "community_replies_page") return json(sem.replies(args));
        if (fn === "community_reply_counts") return json(sem.counts(args));
        if (fn === "community_edit_message") { log.writes.push(fn); return json(sem.edit(uid, args)); }
        if (fn === "community_delete_message") { log.writes.push(fn); if (failDelete) return json({ code: "XX000", message: "boom", details: null, hint: null }, 500); return json(sem.remove(uid, args)); }
        if (fn === "community_restore") { log.writes.push(fn); return json(sem.restore(uid, args)); }
        if (fn === "community_admin_removed") return json(sem.removed(uid));
        if (fn === "community_edit_history") return json(sem.history(uid, args));
        if (fn === "community_message_context") return json(sem.context(args));
        if (fn === "community_search") return json(sem.search(args));
        if (fn === "community_report_message") { log.writes.push(fn); return json(sem.report(uid, args)); }
        if (fn === "community_admin_reports") return json(sem.adminReports(uid));
        if (fn === "community_resolve_report") { log.writes.push(fn); return json(sem.resolve(uid, args)); }
        if (fn === "community_hide_thread") { log.writes.push(fn); return json(sem.hide(uid, args)); }
      } catch (error) { return json({ code: "P0001", message: error.message, details: null, hint: null }, 400); }
    }
    if (path === "/rest/v1/research_contributions") {
      log.tableReads++;
      const parent = url.searchParams.get("parent_id"); const desc = (url.searchParams.get("order") || "").includes("created_at.desc"); const list = rows.filter((r) => r.status === "approved" && r.body && (parent === "is.null" ? !r.parent_id : parent?.startsWith("eq.") ? r.parent_id === parent.slice(3) : parent?.startsWith("in.") ? parent.slice(4, -1).split(",").includes(r.parent_id) : true)).sort((x, y) => (desc ? -1 : 1) * (x.created_at.localeCompare(y.created_at) || x.id.localeCompare(y.id)));
      const range = req.headers()["range"] || "0-39"; const [a, z] = range.split("-").map(Number);
      return json(list.slice(a, z + 1), 200, { "content-range": `${a}-${a + Math.max(0, Math.min(list.length - a, z - a + 1) - 1)}/${list.length}` });
    }
    if (path === "/rest/v1/contributors") return json([]);
    if (path === "/rest/v1/rpc/contributors_claim_legacy_by_email") {
      log.rpcCalls.push("claim_by_email");
      if (rpc === "missing") return json({ code: "PGRST202", message: "Could not find the function public.contributors_claim_legacy_by_email", details: null, hint: null }, 404);
      try { return json(sem.claimByEmail(uid)); } catch (error) { return json({ code: "P0001", message: error.message, details: null, hint: null }, 400); }
    }
    if (path.startsWith("/rest/v1/rpc/")) return json(null);
    return json([]);
  });
}
