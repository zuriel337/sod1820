// SOD1820 · local simulation of 11b / 18b (admin_suggestion_decide). PGlite (PostgreSQL 16) in memory by default; with
// SOD_PG_URL set to a disposable local server (127.0.0.1 / localhost only) the same checks run on real PostgreSQL, one fresh database each.
// Never connects to the live DB. The schema, triggers, indexes, constraints and function bodies are the live ones
// (read-only, 11.11.2026); the fidelity checks (F*) prove it by md5 before any behavior test runs.
// agent_dispatch_emit / agent_dispatch_emit_gpt are stubs that only record the call: a call for a CLAUDE row is an activation.
import { PGlite } from "@electric-sql/pglite";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { FILES } from "./gen_sql.mjs";
import { localServer } from "./local_pg.mjs";
import { ADMIN, MEMBER, SCHEMA, TRIGGERS, SEED, BASE_FNS } from "./schema.mjs";

const G = new URL("../", import.meta.url).pathname;
const read = (p) => readFileSync(G + p, "utf8");
const md5 = (s) => createHash("md5").update(s, "utf8").digest("hex");
const sha256 = (s) => createHash("sha256").update(s, "utf8").digest("hex");
const L = JSON.parse(read("sim/literals.json"));
const ROOT = new URL("../../../../../../", import.meta.url).pathname;
const SQL11B = readFileSync(ROOT + FILES.apply, "utf8");
const SQL18B = readFileSync(ROOT + FILES.rollback, "utf8");
// The prior proposal 11_ (kept unchanged, SHA-256 a43b12ca…): in the repository it lives in pack-v4/sql; the local scratch run keeps a copy.
const PRIOR = existsSync(G + "prior/11_admin_suggestion_decide_text.sql") ? "prior/11_admin_suggestion_decide_text.sql" : "../../pack-v4/sql/11_admin_suggestion_decide_text.sql";
const SQL11 = read(PRIOR);
if (sha256(SQL11) !== "a43b12ca9542b74f49488c180ab6cccbaba8794437270c819bea6619c0a47a1a") throw new Error("prior 11_ file is not the reviewed one");
const BASE = read("base/admin_suggestion_decide.sql");
const NEW = read("new/admin_suggestion_decide.sql");
const FNSIG = "'public.admin_suggestion_decide(bigint,text,text)'::regprocedure";

const results = [];
function check(name, cond, detail = "") {
  results.push({ name, pass: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

// The shared live schema (tables, indexes, constraints, triggers, seed) lives in schema.mjs.

const SERVER = process.env.SOD_PG_URL ? await localServer(process.env.SOD_PG_URL) : null;
async function freshDb() {
  const db = SERVER ? await SERVER.freshDb() : new PGlite();
  await db.exec(SCHEMA);
  for (const f of BASE_FNS) await db.exec(read(`base/${f}.sql`));
  await db.exec("revoke all on function public.admin_suggestion_decide(bigint,text,text) from public; grant execute on function public.admin_suggestion_decide(bigint,text,text) to authenticated, service_role;");
  await db.exec(TRIGGERS);
  await db.exec(SEED);
  await asUser(db, ADMIN);
  return db;
}
async function asUser(db, uid) { await db.query("select set_config('sim.uid', $1, false)", [uid || ""]); }
const one = async (db, sql, p = []) => (await db.query(sql, p)).rows[0];
const all = async (db, sql, p = []) => (await db.query(sql, p)).rows;
async function tryExec(db, sql) {
  try { await db.exec(sql); return { ok: true }; }
  catch (e) { try { await db.exec("rollback"); } catch {} return { ok: false, error: String(e.message || e) }; }
}
async function decide(db, id, status, note = null) {
  try { await db.query("select public.admin_suggestion_decide($1,$2,$3)", [id, status, note]); return { ok: true }; }
  catch (e) { return { ok: false, error: String(e.message || e) }; }
}
const fnMd5 = async (db) => (await one(db, `select md5(pg_get_functiondef(${FNSIG})) m`)).m;
const emits = async (db) => (await one(db, "select count(*)::int c from public.sim_emit_calls")).c;
const wl = async (db) => all(db, "select * from public.work_log order by created_at, id");
const EXPR = {
  META: `(select p.prosecdef::text||':'||array_to_string(p.proconfig,';')||':'||array_to_string(p.proacl::text[],',')||':'||p.proowner::regrole::text from pg_proc p where p.oid=${FNSIG})`,
  RULES: "(select string_agg(n.rule_id||'@'||n.rule_version::text, ',' order by n.rule_id) from public.nodes n where n.type='rule' and n.is_active and n.rule_id in ('system_suggestions_law','deploy_on_request','inter_agent_coordination_law'))",
  TRG: "(select string_agg(t.tgname::text||':'||t.tgenabled::text||':'||p.proname::text||':'||md5(pg_get_functiondef(p.oid))||':'||md5(pg_get_triggerdef(t.oid)), ',' order by t.tgname) from pg_trigger t join pg_proc p on p.oid=t.tgfoid where t.tgrelid='public.work_log'::regclass and not t.tgisinternal)",
  UNQ: "(select string_agg(c.relname::text||':'||md5(pg_get_indexdef(i.indexrelid)), ',' order by c.relname) from pg_index i join pg_class c on c.oid=i.indexrelid where i.indrelid='public.work_log'::regclass and i.indisunique)",
  CHK: "(select string_agg(k.conname::text||':'||md5(pg_get_constraintdef(k.oid)), ',' order by k.conname) from pg_constraint k where k.conrelid='public.work_log'::regclass and k.contype='c')",
};
const val = async (db, e) => (await one(db, `select ${e} v`)).v;
// The discovery scan an agent runs at session start (inter_agent_coordination_law §38) and the dispatch-trigger condition.
const SCAN = `select count(*)::int c from public.work_log w where w.task_key is not null and coalesce(w.status,'') ~* '(QUEUED|ASSIGNED|ACK_REQUIRED|WAITING_SPECIALIST)'
  and (w.to_actor in ('GPT','CLAUDE') or coalesce(w.topic,'') ~ '(^| )TO=(GPT|CLAUDE)( |$)')`;

console.log("== SOD1820 · 11b/18b simulation ·", SERVER ? "PostgreSQL (local, disposable)" : "PGlite", SERVER ? await SERVER.version() : (await (new PGlite()).query("show server_version")).rows[0].server_version);
console.log("sha256 11b", sha256(SQL11B));
console.log("sha256 18b", sha256(SQL18B));

// ---------- F: fidelity with the live schema ----------
{
  const db = await freshDb();
  check("F1 base admin_suggestion_decide md5 = live 12961a8c…", (await fnMd5(db)) === "12961a8c758d5eb86a3d6834bb54ac82");
  check("F2 function metadata and permissions = live", (await val(db, EXPR.META)) === L.meta);
  check("F3 work_log trigger set (names, enabled, function md5, trigger md5) = live", (await val(db, EXPR.TRG)) === L.wlTriggers);
  check("F4 work_log unique indexes = live", (await val(db, EXPR.UNQ)) === L.wlUnique);
  check("F5 work_log check constraints = live", (await val(db, EXPR.CHK)) === L.wlChecks);
  check("F6 active law versions = live (v6 / v4 / v18)", (await val(db, EXPR.RULES)) === L.rules);
  const rd = (await one(db, "select md5(pg_get_functiondef('public.rd_is_admin()'::regprocedure)) m")).m;
  const nh = (await one(db, "select md5(pg_get_functiondef('public.fn_system_suggestion_notify_high()'::regprocedure)) m")).m;
  check("F7 rd_is_admin and fn_system_suggestion_notify_high md5 = live", rd === "3005d3f9ef5e4e58203452a42899fc9c" && nh === "c99975e5af83bf4999bf702f33bab986");
  check("F8 new definition file md5 = literal in 11b", md5(NEW) === L.newMd5 && SQL11B.includes(L.newMd5));
}

// ---------- O: the live base behaviour (the risk being closed) ----------
{
  const db = await freshDb();
  const r = await decide(db, 101, "accepted", "ok");
  const rows = await wl(db);
  const calls = await all(db, "select * from public.sim_emit_calls");
  check("O1 base: accept radar suggestion → ASSIGNMENT to CLAUDE, QUEUED, WRITE", r.ok && rows.length === 1 && rows[0].to_actor === "CLAUDE"
    && rows[0].dispatch_kind === "ASSIGNMENT" && rows[0].dispatch_state === "QUEUED" && rows[0].assignment_mode === "WRITE");
  check("O2 base: agent_dispatch_emit called once for the CLAUDE row (automatic activation)", calls.length === 1
    && calls[0].fn === "agent_dispatch_emit" && calls[0].to_actor === "CLAUDE" && calls[0].dispatch_state === "QUEUED");
  check("O3 base: the row is picked up by the agent discovery scan", (await one(db, SCAN)).c === 1);
  check("O4 base: Legacy build instruction and v2/v3/v13 owners in the row", /Legacy\/2029 build/.test(rows[0].what_we_did)
    && rows[0].primary_owner === "system_suggestions_law v3 + deploy_on_request v2 + inter_agent_coordination_law v13" && /AUTO_RELEASE_NOW/.test(rows[0].open_threads));
}
{
  const db = await freshDb();
  const r = await tryExec(db, SQL11);
  await decide(db, 101, "accepted", "ok");
  check("O5 prior proposal 11_ (text only) still activates: 1 emit to CLAUDE", r.ok && (await emits(db)) === 1 && (await wl(db))[0].dispatch_kind === "ASSIGNMENT");
}

// ---------- A: apply 11b ----------
{
  const db = await freshDb();
  const r = await tryExec(db, SQL11B);
  check("A1 11b applies on the reviewed base", r.ok, r.error || "");
  check("A2 resulting md5 = f44dc42f…, equal to the definition file", (await fnMd5(db)) === L.newMd5);
  check("A3 metadata and permissions unchanged (SECURITY DEFINER, search_path, owner, ACL)", (await val(db, EXPR.META)) === L.meta);
  const def = (await one(db, `select pg_get_functiondef(${FNSIG}) d`)).d;
  check("A4 pg_get_functiondef text = definition file, byte for byte", def === NEW);
}

// ---------- N: behaviour after 11b ----------
{
  const db = await freshDb();
  await tryExec(db, SQL11B);
  const longNote = "n".repeat(400);
  const r = await decide(db, 101, "accepted", longNote);
  const s = await one(db, "select status, decided_at is not null d, length(decision_note) l from public.system_suggestions where id=101");
  const rows = await wl(db);
  const w = rows[0] || {};
  const ctx = w.dispatch_context || {};
  check("N1 accept: suggestion status=accepted, decided_at set, note cut to 300", r.ok && s.status === "accepted" && s.d && s.l === 300, r.error || "");
  check("N2 exactly one record, passive: from ZURIEL to ZURIEL", rows.length === 1 && w.from_actor === "ZURIEL" && w.to_actor === "ZURIEL");
  check("N3 no dispatch fields: kind, state, next attempt and assignment mode all NULL", w.dispatch_kind === null && w.dispatch_state === null
    && w.dispatch_next_attempt_at === null && w.assignment_mode === null);
  check("N4 agent_dispatch_emit and agent_dispatch_emit_gpt not called (no activation)", (await emits(db)) === 0);
  check("N5 not visible to the agent discovery scan (status and topic not claimable)", (await one(db, SCAN)).c === 0);
  check("N6 task_key kept for traceability: AUTO_DEP_UPGRADE_REACT_18_3_2_S101", w.task_key === "AUTO_DEP_UPGRADE_REACT_18_3_2_S101");
  check("N7 status SUGGESTION_ACCEPTED_NOT_ACTIVATED; release state NOT_ACTIVATED_NO_MERGE_NO_DEPLOY",
    w.status === "SUGGESTION_ACCEPTED_NOT_ACTIVATED" && w.release_authorization_state === "NOT_ACTIVATED_NO_MERGE_NO_DEPLOY");
  check("N8 owner resolved from the active laws: v6 + v4 + v18", w.primary_owner === "system_suggestions_law v6 + deploy_on_request v4 + inter_agent_coordination_law v18", w.primary_owner);
  check("N9 evidence kept: suggestion id, package, current, latest, delta, human decision",
    ctx.suggestion_id === 101 && ctx.package === "react" && ctx.current === "18.3.1" && ctx.latest === "18.3.2" && ctx.delta === "patch" && ctx.human_decision === "accepted");
  check("N10 activation recorded as NOT_ACTIVATED, auto_maintenance false, intended scope kept",
    ctx.activation === "NOT_ACTIVATED" && ctx.auto_maintenance === false && ctx.intended_scope === "dependency-maintenance:runtime-packages");
  check("N11 the record does not occupy the writer scope (assignment_scope = task_key, not the maintenance scope)",
    w.assignment_scope === w.task_key && (await one(db, "select count(*)::int c from public.work_log where assignment_mode='WRITE' and dispatch_kind='ASSIGNMENT'")).c === 0);
  check("N12 2029 build only, no Legacy; release advice at most READY_FOR_APPROVAL, no AUTO_RELEASE_NOW",
    /npm run build/.test(w.what_we_did) && !/legacy/i.test((w.what_we_did + w.open_threads + w.topic).replaceAll("--legacy-peer-deps", "")) && /READY_FOR_APPROVAL/.test(w.open_threads)
    && !/AUTO_RELEASE_NOW/.test(w.what_we_did + w.open_threads) && w.open_threads.startsWith("PATCH/MINOR:"));
  check("N13 topic has no TO=/FROM=/task= tokens", !/(^| )(TO|FROM)=/.test(w.topic) && !/task=/.test(w.topic));
  // idempotency and repeated decisions
  await decide(db, 101, "accepted", "again");
  await decide(db, 101, "later");
  await decide(db, 101, "accepted", "third");
  check("N14 re-accept / later / accept again: still one record, still no emit", (await wl(db)).length === 1 && (await emits(db)) === 0);
  // a manual state flip on the passive record still cannot dispatch (to_actor is ZURIEL)
  await db.exec("update public.work_log set dispatch_state='QUEUED', dispatch_next_attempt_at=now()");
  check("N15 even a manual dispatch_state flip on the record does not emit", (await emits(db)) === 0);
  await db.exec("update public.work_log set dispatch_state=null, dispatch_next_attempt_at=null");
  // major delta and a scoped package name
  await decide(db, 102, "accepted");
  await decide(db, 107, "accepted");
  const maj = await one(db, "select * from public.work_log where task_key='AUTO_DEP_UPGRADE_VITE_6_0_0_S102'");
  const sup = await one(db, "select * from public.work_log where task_key='AUTO_DEP_UPGRADE_SUPABASE_SUPABASE_JS_2_45_1_S107'");
  check("N16 major: open_threads MAJOR … BLOCKED_BY Foundation redesign-risk challenge/Human Gate", !!maj && maj.open_threads.startsWith("MAJOR:") && /BLOCKED_BY Foundation redesign-risk/.test(maj.open_threads));
  check("N17 scoped package slug unchanged (SUPABASE_SUPABASE_JS)", !!sup && sup.to_actor === "ZURIEL");
  check("N18 after three accepted suggestions: 0 emits, 0 ASSIGNMENT rows, 0 rows to CLAUDE/GPT",
    (await emits(db)) === 0 && (await one(db, "select count(*)::int c from public.work_log where dispatch_kind is not null or to_actor in ('CLAUDE','GPT')")).c === 0);
}
{
  // decisions that never write a record; validation and permissions
  const db = await freshDb();
  await tryExec(db, SQL11B);
  const rj = await decide(db, 101, "rejected"), lt = await decide(db, 102, "later"), pd = await decide(db, 107, "pending");
  const nr = await decide(db, 106, "accepted");
  check("N19 rejected / later / pending / non-radar accepted → no record, no emit", rj.ok && lt.ok && pd.ok && nr.ok && (await wl(db)).length === 0 && (await emits(db)) === 0);
  const before = await all(db, "select id, status from public.system_suggestions order by id");
  const bad = [await decide(db, 103, "accepted"), await decide(db, 104, "accepted"), await decide(db, 105, "accepted")];
  check("N20 invalid payloads refused (unsupported package / semver / delta)", bad[0].error?.includes("unsupported maintenance package")
    && bad[1].error?.includes("invalid maintenance suggestion payload") && bad[2].error?.includes("invalid maintenance suggestion payload"));
  check("N21 refused decisions change nothing (status, records)", JSON.stringify(before) === JSON.stringify(await all(db, "select id, status from public.system_suggestions order by id")) && (await wl(db)).length === 0);
  const bs = await decide(db, 101, "approved"), nf = await decide(db, 999, "accepted");
  check("N22 bad status and missing suggestion refused", bs.error?.includes("bad status") && nf.error?.includes("suggestion not found"));
  await asUser(db, MEMBER);
  const m = await decide(db, 101, "accepted");
  await asUser(db, "");
  const a = await decide(db, 101, "accepted");
  check("N23 non-admin and anonymous caller refused (admin only)", m.error?.includes("admin only") && a.error?.includes("admin only"));
  await asUser(db, ADMIN);
  await db.exec("set role anon");
  const an = await decide(db, 101, "accepted");
  await db.exec("reset role");
  await db.exec("set role authenticated");
  const au = await decide(db, 101, "accepted");
  await db.exec("reset role");
  check("N24 role anon has no EXECUTE; role authenticated + admin succeeds (SECURITY DEFINER)", an.error?.includes("permission denied") && au.ok, au.error || "");
  check("N25 the authenticated call wrote one passive record and no emit", (await wl(db)).length === 1 && (await wl(db))[0].to_actor === "ZURIEL" && (await emits(db)) === 0);
}
{
  // overlap guard: an explicitly started maintenance assignment blocks new accepts; a completed one does not
  const db = await freshDb();
  await tryExec(db, SQL11B);
  await db.exec(`insert into public.work_log (topic,status,task_key,from_actor,to_actor,assignment_mode,assignment_scope,dispatch_kind,dispatch_state)
    values ('explicitly started maintenance (simulated)','CLAIMED_WRITE','MAINT_EXPLICIT_1','ZURIEL','CLAUDE','WRITE','dependency-maintenance:runtime-packages','ASSIGNMENT','CLAIMED')`);
  await db.exec("delete from public.sim_emit_calls");
  const r = await decide(db, 101, "accepted");
  const st = (await one(db, "select status from public.system_suggestions where id=101")).status;
  check("N26 overlap guard kept: active maintenance → 'dependency maintenance already active', nothing changes", r.error?.includes("dependency maintenance already active") && st === "pending" && (await wl(db)).length === 1);
  await db.exec("update public.work_log set dispatch_state='COMPLETED' where task_key='MAINT_EXPLICIT_1'");
  const r2 = await decide(db, 101, "accepted");
  check("N27 after that maintenance is COMPLETED, accept works and adds one passive record", r2.ok && (await wl(db)).length === 2 && (await emits(db)) === 0);
}
{
  // owner text follows the active laws at decision time; fallback when none is active
  const db = await freshDb();
  await tryExec(db, SQL11B);
  await db.exec("update public.nodes set is_active=false where rule_id='system_suggestions_law'; insert into public.nodes (type,label,rule_id,rule_version,is_active) values ('rule','system_suggestions_law','system_suggestions_law',7,true)");
  await decide(db, 101, "accepted");
  await db.exec("update public.nodes set is_active=false");
  await decide(db, 107, "accepted");
  const o = await all(db, "select primary_owner p from public.work_log order by task_key");
  check("N28 owner text cites the version active at decision time (v7 after a bump), no stale pointer",
    o.some((x) => x.p === "system_suggestions_law v7 + deploy_on_request v4 + inter_agent_coordination_law v18"));
  check("N29 fallback owner text when no law row is active", o.some((x) => x.p === "system_suggestions_law + deploy_on_request + inter_agent_coordination_law"));
}
{
  // notifications for high-severity pending suggestions are unchanged (old vs new)
  const run = async (apply) => {
    const db = await freshDb();
    if (apply) await tryExec(db, SQL11B);
    await decide(db, 106, "pending"); await decide(db, 106, "later"); await decide(db, 106, "pending");
    return (await one(db, "select count(*)::int c from public.user_notifications")).c;
  };
  const a = await run(false), b = await run(true);
  check("N30 admin high-severity notification behaviour identical before and after 11b", a === b && a === 1, `${a} / ${b}`);
}
// source scan of the new definition
{
  const ins = NEW.slice(NEW.indexOf("insert into public.work_log("), NEW.indexOf("exception when unique_violation"));
  check("S1 new definition: no TO=CLAUDE, no Legacy (the only 'legacy' is the forbidden npm flag --legacy-peer-deps), no AUTO_RELEASE_NOW, no v2/v3/v13 owner text",
    !/TO=CLAUDE/.test(NEW) && !/legacy/i.test(NEW.replaceAll("--legacy-peer-deps", "")) && NEW.includes("never uses --force or --legacy-peer-deps")
    && !/AUTO_RELEASE_NOW/.test(NEW) && !/\bv(2|3|13)\b/.test(NEW));
  check("S2 the insert writes no dispatch or assignment columns and no CLAUDE/ASSIGNMENT/QUEUED/WRITE literal",
    ins.length > 500 && !/dispatch_kind|dispatch_state|dispatch_next_attempt_at|assignment_mode|assignment_scope/.test(ins) && !/'(CLAUDE|ASSIGNMENT|QUEUED|WRITE)'/.test(ins));
  const head = (s) => s.slice(0, s.indexOf("  if p_status='accepted' and v_s.detector='dependency_upgrade_radar' then\n    v_slug"));
  check("S3 everything before the record block is byte-identical to the base (except the added v_owner declaration)",
    head(NEW).replace("  v_owner text;\n", "") === head(BASE));
}

// ---------- R: refusals of 11b ----------
async function refuses(name, mutate, sql, expect) {
  const db = await freshDb();
  if (mutate) await db.exec(mutate);
  const before = await fnMd5(db);
  const r = await tryExec(db, sql);
  const after = await fnMd5(db);
  check(name, !r.ok && (!expect || r.error.includes(expect)) && before === after, r.ok ? "applied!" : r.error.slice(0, 110));
}
await refuses("R1 refuses on drift of the base definition", BASE.replace("raise exception 'admin only'", "raise exception 'admin only!'"), SQL11B, "not the reviewed base");
await refuses("R2 refuses when 11_ already ran", SQL11, SQL11B, "not the reviewed base");
await refuses("R3 refuses on a changed law version", "update public.nodes set is_active=false where rule_id='deploy_on_request'; insert into public.nodes (type,rule_id,rule_version,is_active) values ('rule','deploy_on_request',5,true)", SQL11B, "active law versions changed");
await refuses("R4 refuses on a changed work_log trigger function", read("base/work_log_dispatch_prepare.sql").replace("v_claimable boolean;", "v_claimable boolean; -- x"), SQL11B, "work_log triggers changed");
await refuses("R5 refuses on an extra work_log trigger", "create trigger trg_extra after insert on public.work_log for each row execute function work_log_dispatch_after_write()", SQL11B, "work_log triggers changed");
await refuses("R6 refuses on a dropped unique index", "drop index public.work_log_one_active_writer_scope_uidx", SQL11B, "unique indexes changed");
await refuses("R7 refuses on a dropped check constraint", "alter table public.work_log drop constraint work_log_to_actor_ck", SQL11B, "check constraints changed");
await refuses("R8 refuses on changed permissions (EXECUTE granted to anon)", "grant execute on function public.admin_suggestion_decide(bigint,text,text) to anon", SQL11B, "metadata or permissions changed");
{
  const db = await freshDb();
  await tryExec(db, SQL11B);
  const r = await tryExec(db, SQL11B);
  check("R9 a second run refuses (already applied) and changes nothing", !r.ok && r.error.includes("not the reviewed base") && (await fnMd5(db)) === L.newMd5);
}
{
  const at = SQL11B.indexOf("This records a recommendation decision only");
  const flipped = SQL11B.slice(0, at) + "t" + SQL11B.slice(at + 1);
  await refuses("R10 one changed character in the embedded definition → refused", null, flipped, "embedded definition is not intact");
  // Safety property: no cut point applies anything. A cut inside the header comments runs nothing; any cut after the
  // statement starts must raise. Every cut must leave the base definition in place.
  const doAt = SQL11B.indexOf("do $sod_11b$");
  let allOk = true; const seen = [];
  for (const cut of [600, doAt - 1, doAt + 20, Math.floor(SQL11B.length * 0.35), Math.floor(SQL11B.length * 0.5), Math.floor(SQL11B.length * 0.75), Math.floor(SQL11B.length * 0.95), SQL11B.length - 3]) {
    const db = await freshDb();
    const r = await tryExec(db, SQL11B.slice(0, cut));
    const unchanged = (await fnMd5(db)) === L.baseMd5;
    const ok = unchanged && (cut < doAt ? true : !r.ok);
    seen.push(`${cut}:${r.ok ? "no-op" : "error"}${unchanged ? "" : ":CHANGED"}`);
    if (!ok) allOk = false;
  }
  check("R11 truncated file (8 cut points): nothing applied; every cut after the statement start raises", allOk, seen.join(" "));
  const postAt = SQL11B.lastIndexOf(`if v_got <> '${L.newMd5}' then`);
  const badPost = SQL11B.slice(0, postAt) + `if v_got <> '00000000000000000000000000000000' then` + SQL11B.slice(postAt + `if v_got <> '${L.newMd5}' then`.length);
  await refuses("R12 a failing post-check rolls the whole statement back (atomic)", null, badPost, "failed after apply");
}

// ---------- B: rollback 18b ----------
{
  const db = await freshDb();
  await tryExec(db, SQL11B);
  const r = await tryExec(db, SQL18B);
  check("B1 18b after 11b restores the exact base md5 12961a8c…", r.ok && (await fnMd5(db)) === L.baseMd5, r.error || "");
  check("B2 metadata and permissions unchanged after rollback", (await val(db, EXPR.META)) === L.meta);
  await decide(db, 101, "accepted");
  check("B3 after rollback the base behaviour returns (1 emit to CLAUDE) — as the 18b header warns", (await emits(db)) === 1);
}
await refuses("B4 18b refuses on the base (11b not applied)", null, SQL18B, "not the 11b result");
{
  const db = await freshDb();
  await tryExec(db, SQL11B);
  await db.exec(NEW.replace("raise exception 'admin only'", "raise exception 'admin only!'"));
  const r = await tryExec(db, SQL18B);
  check("B5 18b refuses when the 11b result drifted", !r.ok && r.error.includes("not the 11b result"));
  const db2 = await freshDb();
  await tryExec(db2, SQL11B);
  const at = SQL18B.indexOf("AUTO_MAINTENANCE_PREP");
  const r2 = await tryExec(db2, SQL18B.slice(0, at) + "B" + SQL18B.slice(at + 1));
  check("B6 18b with one changed character → refused, 11b result kept", !r2.ok && r2.error.includes("embedded definition is not intact") && (await fnMd5(db2)) === L.newMd5);
  const db3 = await freshDb();
  await tryExec(db3, SQL11B);
  const postAt = SQL18B.lastIndexOf(`if v_got <> '${L.baseMd5}' then`);
  const r3 = await tryExec(db3, SQL18B.slice(0, postAt) + `if v_got <> '00000000000000000000000000000000' then` + SQL18B.slice(postAt + `if v_got <> '${L.baseMd5}' then`.length));
  check("B7 18b failing post-check rolls back (11b result kept)", !r3.ok && r3.error.includes("failed after apply") && (await fnMd5(db3)) === L.newMd5);
  // order: while system_suggestions_law v7 is active, 18b must refuse (the law must not say «decision only» while the function activates)
  const db4 = await freshDb();
  await tryExec(db4, SQL11B);
  await db4.exec("update public.nodes set is_active=false where rule_id='system_suggestions_law'; insert into public.nodes (type,label,rule_id,rule_version,is_active) values ('rule','system_suggestions_law','system_suggestions_law',7,true)");
  const r4 = await tryExec(db4, SQL18B);
  check("B8 18b refuses while system_suggestions_law v7 is active (rollback order: 18c first), 11b result kept",
    !r4.ok && r4.error.includes("must be back at v6 first") && (await fnMd5(db4)) === L.newMd5, r4.ok ? "applied!" : r4.error.slice(0, 100));
}

if (SERVER) await SERVER.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
if (failed.length) { console.log("FAILED:", failed.map((f) => f.name).join(" | ")); process.exit(1); }
