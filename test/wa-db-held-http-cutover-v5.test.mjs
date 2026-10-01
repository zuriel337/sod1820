import assert from "node:assert/strict";
import fs from "node:fs";
import { drain, handle, buildCall, classify } from "../supabase/functions/wa-system-outbox/core.ts";

const mdir = "supabase/migrations/";
const files = fs.readdirSync(mdir).filter((f) => /g3_wa_db_held_http_cutover/.test(f)).sort();
const raw = fs.readFileSync(mdir + "20261001070000_g3_wa_db_held_http_cutover_v5_outbox.sql", "utf8");
const sql = raw.replace(/^--.*$/gm, "");

// ---- SQL contract ----
assert.match(sql, /alter table public\.bot_outbox add column if not exists payload jsonb/);
assert.doesNotMatch(sql, /create table/i);
const claim = sql.slice(sql.indexOf("function public.outbox_claim_system"), sql.indexOf("function public.outbox_mark_system"));
assert.match(claim, /for update skip locked/);
assert.match(claim, /set status = 'sending', attempts = o\.attempts \+ 1/);
assert.match(claim, /bot in \('system','link-code'\)/);
assert.match(claim, /power\(2, b\.attempts\)/); // backoff
assert.match(claim, /'expired'/);
for (const f of ["outbox_claim_system(text, integer)", "outbox_mark_system(text, text, text)", "outbox_ref_status(text)"]) {
  assert.ok(sql.includes(`revoke all on function public.${f} from public, anon, authenticated`));
  assert.ok(sql.includes(`grant execute on function public.${f} to service_role`));
}
assert.match(sql, /revoke all on table public\.bot_outbox from anon, authenticated/);
// no pg_net / provider path in any DB function (everything before the job55 DO block)
const funcs = sql.slice(0, sql.indexOf("do $m$"));
assert.doesNotMatch(funcs, /net\.http|wa_send\s*\(|wa_admin\s*\(|extensions\.http|wa_green_config|green-api/);
// notify_admin: one row per target, image in payload, truthful
const na = sql.slice(sql.indexOf("function public.notify_admin"), sql.indexOf("function public.system_watchman_run"));
assert.match(na, /insert into public\.bot_outbox/);
assert.match(na, /jsonb_build_object\('image_url', p_image_url\)/);
assert.match(na, /'queued',true,'sent',false/);
assert.doesNotMatch(na, /'sent',true/);
assert.match(na, /no_generic_email_edge_yet/);
// watchman: queued != sent
const wm = sql.slice(sql.indexOf("function public.system_watchman_run"));
assert.match(wm.slice(0, wm.indexOf("request_wa_link_code")), /'ok',true,'sent',false,'queued'/);
assert.doesNotMatch(wm.slice(0, wm.indexOf("function public.request_wa_link_code")), /'sent',true/);
// link RPC: no HTTP, never returns the code, derives unguessable ref
const lc = sql.slice(sql.indexOf("function public.request_wa_link_code"), sql.indexOf("end $function$;", sql.indexOf("function public.request_wa_link_code")));
assert.doesNotMatch(lc, /net\.|http|wa_send|wa_admin|wa_green_config/);
assert.match(lc, /gen_random_uuid\(\)/);
assert.match(lc, /'delivery_ref', v_ref/);
const ret = lc.slice(lc.lastIndexOf("return jsonb_build_object('ok',true,'queued'"));
assert.doesNotMatch(ret, /v_code/);
for (const keep of ["auth_required", "bad_phone", "phone_taken", "already_linked", "rate_limited", "interval '10 minutes'"]) assert.ok(lc.includes(keep), keep);
// job55: outbox only
assert.match(raw, /insert into public\.bot_outbox\(done_key,bot,chat_id,reply\) values \('ti-watch:'/);
assert.match(raw, /job 55 still references a DB-held Green\/pg_net path/);
// cron: URL + empty body only
const cron = sql.slice(sql.indexOf("select cron.schedule"));
assert.match(cron, /\*\/2 \* \* \* \*/);
assert.match(cron, /url:='https:\/\/linswmnnkjxvweumprav\.supabase\.co\/functions\/v1\/wa-system-outbox', body:='\{\}'::jsonb\)/);
assert.doesNotMatch(cron, /headers|vault|token|key|Bearer/i);

// ---- cumulative census over ALL branch migrations: no Green token/pg_net path, no cron to wa_admin/wa_send ----
const allSql = files.map((f) => fs.readFileSync(mdir + f, "utf8").replace(/^--.*$/gm, "")).join("\n");
assert.doesNotMatch(allSql, /net\.http_(post|get)\([^)]*wa_green_config|\|\|\s*\(?v?_?cfg(\(|->>)?'?token/);
assert.doesNotMatch(allSql.replace(/\$c\$[\s\S]*?\$c\$/g, ""), /net\.http_(post|get)/, "pg_net only inside cron commands (no function body enqueues provider calls)");
assert.doesNotMatch(allSql, /net\._http_response|http_request_queue/);
const cronCmds = [...allSql.matchAll(/cron\.(?:schedule|alter_job)\([\s\S]*?\$c\$([\s\S]*?)\$c\$/g)].map((m) => m[1]);
assert.ok(cronCmds.length >= 2);
for (const c of cronCmds) assert.doesNotMatch(c, /wa_admin|wa_send|fn_wa_backfill_from_green|green/i);

// ---- Edge behaviour with an in-memory outbox implementing the RPC semantics ----
function makeSb(rows) {
  const t = rows;
  return {
    sentMsgs: [],
    async rpc(name, a) {
      if (name === "outbox_claim_system") {
        const out = [];
        for (const r of t) {
          if (out.length >= (a.p_limit || 5)) break;
          if (["system", "link-code"].includes(r.bot) && r.status === "pending" && (!a.p_ref || r.done_key === a.p_ref)) {
            if (r.attempts > 0 && Date.now() < (r.next_at || 0)) continue;
            r.status = "sending"; r.attempts++; out.push({ ...r });
          }
        }
        return { data: out };
      }
      if (name === "outbox_mark_system") {
        const r = t.find((x) => x.done_key === a.p_key && x.status === "sending");
        if (!r) return { data: "ignored" };
        r.status = a.p_outcome === "sent" ? "sent" : a.p_outcome === "retry" ? (r.attempts >= 5 ? "failed" : "pending") : "failed";
        r.next_at = Date.now() + 60000 * 2 ** r.attempts;
        if (r.status === "sent") r.sent_msg_id = a.p_sent_msg_id;
        if (r.bot === "link-code" && r.status === "sent") { r.reply = "[delivered]"; r.payload = {}; }
        if (r.bot === "link-code" && r.status === "failed") { r.reply = "[failed]"; r.payload = {}; }
        return { data: r.status };
      }
      if (name === "outbox_ref_status") return { data: t.find((x) => x.done_key === a.p_ref)?.status ?? null };
      if (name === "wa_green_config") return { data: { id: "111", token: "SECRETTOKEN", base: "" } };
      throw new Error("unexpected rpc " + name);
    },
    from() { return { insert: async () => { throw new Error("transcript must not be written for link-code"); } }; },
  };
}
const mk = (o) => ({ bot: "system", chat_id: "972500000000@c.us", reply: "hello", payload: {}, attempts: 0, status: "pending", ...o });
const okFetch = (log) => async (url, init) => { log.push({ url, body: JSON.parse(init.body) }); return new Response(JSON.stringify({ idMessage: "MID" + log.length }), { status: 200 }); };

// atomic double claim => exactly one sender
{
  const rows = [mk({ done_key: "na:1" })]; const sb = makeSb(rows); const log = [];
  await Promise.all([drain(sb, null, { fetchImpl: okFetch(log) }), drain(sb, null, { fetchImpl: okFetch(log) })]);
  assert.equal(log.length, 1); assert.equal(rows[0].status, "sent"); assert.equal(rows[0].sent_msg_id, "MID1");
}
// image => sendFileByUrl; text => sendMessage; non-https image ignored
{
  const rows = [mk({ done_key: "na:img", payload: { image_url: "https://x.test/a/p.png" } }), mk({ done_key: "na:txt" }), mk({ done_key: "na:bad", payload: { image_url: "javascript:1" } })];
  const log = []; await drain(makeSb(rows), null, { fetchImpl: okFetch(log) });
  assert.match(log[0].url, /sendFileByUrl/); assert.deepEqual(log[0].body, { chatId: "972500000000@c.us", urlFile: "https://x.test/a/p.png", fileName: "p.png", caption: "hello" });
  assert.match(log[1].url, /sendMessage/); assert.match(log[2].url, /sendMessage/);
}
// retry / backoff / terminal failure
{
  const rows = [mk({ done_key: "na:r" })]; const sb = makeSb(rows); const log = [];
  const f429 = async () => { log.push(1); return new Response("x", { status: 429 }); };
  await drain(sb, null, { fetchImpl: f429 }); assert.equal(rows[0].status, "pending"); assert.equal(rows[0].attempts, 1);
  await drain(sb, null, { fetchImpl: f429 }); assert.equal(log.length, 1, "backoff blocks immediate resend");
  rows[0].next_at = 0; rows[0].attempts = 4; await drain(sb, null, { fetchImpl: f429 }); assert.equal(rows[0].status, "failed");
  const r4 = [mk({ done_key: "na:4" })]; await drain(makeSb(r4), null, { fetchImpl: async () => new Response("{}", { status: 400 }) }); assert.equal(r4[0].status, "failed");
}
// link-code: no transcript, OTP redacted after send, exact-ref truth, no leakage in response
{
  const rows = [mk({ done_key: "lc:abc", bot: "link-code", reply: "code 123456" }), mk({ done_key: "na:other" })];
  const sb = makeSb(rows); const log = [];
  const res = await handle(new Request("https://e/f", { method: "POST", body: JSON.stringify({ ref: "lc:abc" }) }), sb, { fetchImpl: okFetch(log) });
  const txt = await res.text(); const j = JSON.parse(txt);
  assert.equal(j.ref_status, "sent"); assert.equal(log.length, 1); assert.equal(rows[1].status, "pending", "ref drain touches only that row");
  assert.equal(rows[0].reply, "[delivered]");
  for (const bad of ["SECRETTOKEN", "123456", "972500000000", "hello", "waInstance"]) assert.ok(!txt.includes(bad), `response leaks ${bad}`);
  assert.deepEqual(Object.keys(j).sort(), ["ok", "processed", "ref_status", "sent"]);
}
// provider failure: no secret in console output; invalid ref rejected; caller cannot inject content
{
  const logs = []; const orig = console.log; const origE = console.error; console.log = console.error = (...a) => logs.push(a.join(" "));
  const rows = [mk({ done_key: "na:e" })];
  await drain(makeSb(rows), null, { fetchImpl: async (u) => { throw new Error("boom " + u); } });
  console.log = orig; console.error = origE;
  assert.ok(!logs.join("\n").includes("SECRETTOKEN"));
  const bad = await handle(new Request("https://e/f?ref=" + encodeURIComponent("x'; drop")), makeSb([]));
  assert.equal(bad.status, 400);
  const sb = makeSb([]); const log = [];
  await handle(new Request("https://e/f", { method: "POST", body: JSON.stringify({ chatId: "1@c.us", message: "evil", token: "t" }) }), sb, { fetchImpl: okFetch(log) });
  assert.equal(log.length, 0, "body content is ignored; nothing to send");
  assert.equal((await handle(new Request("https://e/f", { method: "DELETE" }), sb)).status, 405);
}
// ---- V5A: CORS preflight (browser supabase.functions.invoke) ----
{
  let rpcs = 0; const sbp = { async rpc() { rpcs++; return { data: [] }; } };
  for (const m of ["OPTIONS"]) {
    const pre = await handle(new Request("https://e/f", { method: m, headers: { Origin: "https://sod1820.co.il", "Access-Control-Request-Method": "POST" } }), sbp);
    assert.ok([200, 204].includes(pre.status));
    assert.equal(rpcs, 0, "OPTIONS must not touch any RPC");
    assert.equal(pre.headers.get("access-control-allow-origin"), "*");
    assert.equal(pre.headers.get("access-control-allow-methods"), "GET, POST, OPTIONS");
    assert.equal(pre.headers.get("access-control-allow-headers"), "authorization, content-type, apikey, x-client-info, x-supabase-api-version");
    assert.equal(pre.headers.get("cache-control"), "no-store");
  }
  for (const m of ["GET", "POST"]) { // cron semantics unchanged, CORS on real responses too
    const r = await handle(new Request("https://e/f", { method: m, ...(m === "POST" ? { body: "{}" } : {}) }), makeSb([]));
    assert.equal(r.status, 200); assert.equal(r.headers.get("access-control-allow-origin"), "*");
  }
  const r405 = await handle(new Request("https://e/f", { method: "DELETE" }), makeSb([]));
  assert.equal(r405.status, 405); assert.equal(r405.headers.get("access-control-allow-origin"), "*");
  assert.equal((await handle(new Request("https://e/f?ref=" + encodeURIComponent("x'; drop")), makeSb([]))).headers.get("access-control-allow-origin"), "*");
}
// ---- V5A: link-code OTP scrubbed on EVERY terminal state, kept while pending/retry ----
{
  const otp = "code 654321";
  const f429 = async () => new Response("x", { status: 429 });
  const f400 = async () => new Response("{}", { status: 400 });
  const retry = [mk({ done_key: "lc:r", bot: "link-code", reply: otp })];
  await drain(makeSb(retry), null, { fetchImpl: f429 });
  assert.equal(retry[0].status, "pending"); assert.equal(retry[0].reply, otp, "pending/retry keeps OTP for delivery");
  const failed = [mk({ done_key: "lc:f", bot: "link-code", reply: otp, payload: { image_url: "https://x.test/a.png" } })];
  await drain(makeSb(failed), null, { fetchImpl: f400 });
  assert.equal(failed[0].status, "failed"); assert.equal(failed[0].reply, "[failed]"); assert.deepEqual(failed[0].payload, {});
  const sysf = [mk({ done_key: "na:f", reply: "alert" })];
  await drain(makeSb(sysf), null, { fetchImpl: f400 });
  assert.equal(sysf[0].reply, "alert", "non link-code rows are not scrubbed");
}
// SQL contract: every terminal transition scrubs bot='link-code' only
{
  const clm = sql.slice(sql.indexOf("function public.outbox_claim_system"), sql.indexOf("return query"));
  const stale = clm.slice(clm.indexOf("set status = 'failed'"), clm.indexOf("-- expired"));
  assert.match(stale, /reply = case when o\.bot = 'link-code' then '\[failed\]' else o\.reply end/);
  assert.match(stale, /payload = case when o\.bot = 'link-code' then '\{\}'::jsonb else o\.payload end/);
  const exp = clm.slice(clm.indexOf("set status = 'expired'"));
  assert.match(exp, /reply = case when o\.bot = 'link-code' then '\[expired\]' else o\.reply end/);
  assert.match(exp, /payload = case when o\.bot = 'link-code' then '\{\}'::jsonb else o\.payload end/);
  const mark = sql.slice(sql.indexOf("function public.outbox_mark_system"), sql.indexOf("function public.outbox_ref_status"));
  assert.match(mark, /bot = 'link-code' and v_new = 'sent' then '\[delivered\]'/);
  assert.match(mark, /bot = 'link-code' and v_new = 'failed' then '\[failed\]' else reply end/);
  assert.match(mark, /payload = case when bot = 'link-code' and v_new in \('sent','failed'\) then '\{\}'::jsonb else payload end/);
  assert.doesNotMatch(mark, /v_new = 'pending'/, "pending retry must keep OTP");
}
assert.equal(classify({ http_status: 200, result: { idMessage: "x" } }), "sent");
assert.equal(classify({ http_status: 200, result: {} }), "failed");
assert.equal(classify({ ok: false, error: "timeout" }), "failed");
assert.equal(classify({ http_status: 429 }), "retry");
for (const st of [500, 502, 503, 504, 0, 400, 401, 403, 404]) assert.equal(classify({ http_status: st }), "failed", "status " + st);
// ---- V6A: ambiguous post-dispatch outcomes fail closed, never a second claim/send ----
for (const bot of ["system", "link-code"]) {
  const cases = {
    abort: async () => { const e = new Error("aborted"); e.name = "AbortError"; throw e; },
    network: async () => { throw new TypeError("network down"); },
    s500: async () => new Response("x", { status: 500 }),
    s503: async () => new Response("x", { status: 503 }),
  };
  for (const [name, f] of Object.entries(cases)) {
    const rows = [mk({ done_key: "amb:" + bot + name, bot })]; const sb = makeSb(rows); let calls = 0;
    const fi = async (...a) => { calls++; return f(...a); };
    await drain(sb, null, { fetchImpl: fi });
    assert.equal(rows[0].status, "failed", bot + " " + name + " => failed");
    rows[0].next_at = 0;
    await drain(sb, null, { fetchImpl: fi });
    assert.equal(calls, 1, bot + " " + name + ": no second claim/send");
  }
}
{ // 429 retries with backoff, then 2xx+idMessage sends
  const rows = [mk({ done_key: "amb:429" })]; const sb = makeSb(rows);
  await drain(sb, null, { fetchImpl: async () => new Response("x", { status: 429 }) });
  assert.equal(rows[0].status, "pending");
  rows[0].next_at = 0; await drain(sb, null, { fetchImpl: async () => new Response(JSON.stringify({ idMessage: "M" }), { status: 200 }) });
  assert.equal(rows[0].status, "sent");
}
// header/comments must not claim retry on ambiguous outcomes
assert.doesNotMatch(fs.readFileSync("supabase/functions/wa-system-outbox/core.ts", "utf8"), /timeout \/ transport/);
assert.equal(buildCall(mk({ payload: {} })).method, "sendMessage");

// ---- client wrapper truth ----
const cc = fs.readFileSync("src/lib/commandCenter.js", "utf8");
assert.match(cc, /functions\.invoke\("wa-system-outbox", \{ body: \{ ref: data\.delivery_ref \} \}\)/);
assert.match(cc, /drain\.ref_status === "sent"\) return \{ \.\.\.data, queued: false, sent: true \}/);
console.log("PASS wa db-held http cutover v5 outbox contract + behaviour");
