// SOD1820 · real PostgreSQL suite for the 11b package: the application order 11b → 11c, the system_suggestions_law v7 row under the live
// rule-versioning guard, the rollback order 18c → 18b, and concurrent acceptance of the same recommendation (several sessions at once).
// Needs SOD_PG_URL pointing at a disposable local PostgreSQL (loopback only, see local_pg.mjs). One fresh database per scenario, all dropped
// at the end. Never connects to the live database.
import { readFileSync } from "node:fs";
import { localServer } from "./local_pg.mjs";
import { FILES } from "./gen_sql.mjs";
import { ADMIN, PART_ROLES_AUTH, PART_NODES_LIVE, PART_SUGGESTIONS_WORKLOG, TRIGGERS, SEED_USERS, SEED_SUGGESTIONS, BASE_FNS, NODES_GUARD_TRIGGER } from "./schema.mjs";

const G = new URL("../", import.meta.url).pathname;
const ROOT = new URL("../../../../../../", import.meta.url).pathname;
const read = (p) => readFileSync(G + p, "utf8");
const L = JSON.parse(read("sim/literals.json"));
const LL = JSON.parse(read("sim/law_literals.json"));
const SQL = {
  b11: readFileSync(ROOT + FILES.apply, "utf8"), b18: readFileSync(ROOT + FILES.rollback, "utf8"),
  c11: readFileSync(ROOT + FILES.lawApply, "utf8"), c18: readFileSync(ROOT + FILES.lawRollback, "utf8"),
};
if (!process.env.SOD_PG_URL) { console.log("SKIP: set SOD_PG_URL to a disposable local PostgreSQL 17 (see PROPOSAL.md)"); process.exit(2); }
const SERVER = await localServer(process.env.SOD_PG_URL);

const results = [];
function check(name, cond, detail = "") { results.push({ name, pass: !!cond }); console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); }

const V5 = read("base/rules/system_suggestions_law@v5.txt"), V5M = read("base/rules/system_suggestions_law@v5.meta.json");
const V6 = read("base/rules/system_suggestions_law@v6.txt"), V6M = read("base/rules/system_suggestions_law@v6.meta.json");
const V7 = read("new/rules/system_suggestions_law@v7.txt");
const V5_LABEL = "System Intelligence v5 — Resource-Aware Reliability + Incident Budget";
const V6_LABEL = "System Intelligence v6 — Resource-Aware Reliability + Explicit Release Approval";
const DEPENDS = ["ai_analyze_contract", "deploy_on_request", "inter_agent_coordination_law", "raziel_routing_law", "research_strategy_layer_law", "traffic_intelligence_law"];
const COMPANION_META = JSON.stringify({ g3_disposition_v1: { classification: "KEEP_CANONICAL_OWNER" }, compaction_v1: { canonical_owner: "companion" }, owner_routing: { canonical_owner: "companion" } });
const FNSIG = "'public.admin_suggestion_decide(bigint,text,text)'::regprocedure";
const TASK101 = "AUTO_DEP_UPGRADE_REACT_18_3_2_S101";

async function tryExec(db, sql) {
  try { await db.exec(sql); return { ok: true }; } catch (e) { return { ok: false, error: String(e.message || e), code: e.code }; }
}
async function freshDb({ b11 = false, c11 = false } = {}) {
  const db = await SERVER.freshDb();
  await db.exec(PART_ROLES_AUTH + PART_NODES_LIVE + PART_SUGGESTIONS_WORKLOG);
  for (const f of BASE_FNS) await db.exec(read(`base/${f}.sql`));
  await db.exec("revoke all on function public.admin_suggestion_decide(bigint,text,text) from public; grant execute on function public.admin_suggestion_decide(bigint,text,text) to authenticated, service_role;");
  await db.exec(TRIGGERS);
  // rule rows first, then the live guard: the guard governs the operations under test, not this setup
  await db.query(`insert into public.nodes (type,label,description,metadata,is_active,rule_id,rule_version,depends_on,supersedes_version,weight) values
    ('rule',$1,$2,$3::jsonb,false,'system_suggestions_law',5,$7,4,1), ('rule',$4,$5,$6::jsonb,true,'system_suggestions_law',6,$7,5,1)`,
    [V5_LABEL, V5, V5M, V6_LABEL, V6, V6M, DEPENDS]);
  await db.query(`insert into public.nodes (type,label,description,metadata,is_active,rule_id,rule_version,supersedes_version) values
    ('rule','deploy_on_request v3','-',$1::jsonb,false,'deploy_on_request',3,2), ('rule','deploy_on_request v4','-',$1::jsonb,true,'deploy_on_request',4,3),
    ('rule','inter_agent_coordination_law v17','-',$1::jsonb,false,'inter_agent_coordination_law',17,16), ('rule','inter_agent_coordination_law v18','-',$1::jsonb,true,'inter_agent_coordination_law',18,17)`,
    [COMPANION_META]);
  await db.exec(read("base/fn_rule_compaction_integrity_guard_v1.sql"));
  await db.exec(NODES_GUARD_TRIGGER + ";");
  await db.exec(SEED_USERS + SEED_SUGGESTIONS);
  await db.query("select set_config('sim.uid', $1, false)", [ADMIN]);
  if (b11) { const r = await tryExec(db, SQL.b11); if (!r.ok) throw new Error("setup 11b failed: " + r.error); }
  if (c11) { const r = await tryExec(db, SQL.c11); if (!r.ok) throw new Error("setup 11c failed: " + r.error); }
  return db;
}
async function session(db) { const c = await db.connect(); await c.query("select set_config('sim.uid', $1, false)", [ADMIN]); return c; }
const one = async (c, sql, p = []) => (await c.query(sql, p)).rows[0];
const fnMd5 = async (c) => (await one(c, `select md5(pg_get_functiondef(${FNSIG})) m`)).m;
const emitCalls = async (c) => Number((await one(c, "select case when is_called then last_value else 0 end c from public.sim_emit_seq")).c);
const records = async (c, task = TASK101) => (await c.query("select * from public.work_log where task_key=$1", [task])).rows;
const dispatchRows = async (c) => Number((await one(c, "select count(*) c from public.work_log where dispatch_kind is not null or dispatch_state is not null or assignment_mode is not null or to_actor in ('CLAUDE','GPT')")).c);
const ssl = async (c) => (await c.query("select rule_version v, is_active a, supersedes_version s, md5(description) d, md5(metadata::text) m from public.nodes where type='rule' and rule_id='system_suggestions_law' order by rule_version")).rows;
const activeSsl = async (c) => (await ssl(c)).filter((r) => r.a).map((r) => r.v).join(",");
const decideSql = (id, note) => ({ text: "select public.admin_suggestion_decide($1,$2,$3)", values: [id, "accepted", note] });
async function waitForLockWait(db, ms = 8000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const rows = await SERVER.activity(db.name);
    const w = rows.find((r) => r.wait_event_type === "Lock" && /admin_suggestion_decide/.test(r.q));
    if (w) return w;
    await new Promise((r) => setTimeout(r, 25));
  }
  return null;
}

console.log("== SOD1820 · 11b/11c order, law row and concurrency · PostgreSQL", await SERVER.version(), "(local, disposable)");

// ---------- F: fidelity with the live definitions ----------
{
  const db = await freshDb();
  const c = db.client;
  check("F1 base admin_suggestion_decide md5 = live 12961a8c…", (await fnMd5(c)) === L.baseMd5);
  const g = await one(c, "select md5(pg_get_functiondef('public.fn_rule_compaction_integrity_guard_v1()'::regprocedure)) m, (select pg_get_triggerdef(t.oid) from pg_trigger t where t.tgrelid='public.nodes'::regclass and not t.tgisinternal) d");
  check("F2 rule-versioning guard function md5 = live 56b90b0a…, trigger definition = live", g.m === "56b90b0ae0f9c5915b730314d13ca7a0" && g.d === NODES_GUARD_TRIGGER, g.m);
  const idx = (await c.query("select string_agg(c.relname||'='||pg_get_indexdef(i.indexrelid), ' || ' order by c.relname) s from pg_index i join pg_class c on c.oid=i.indexrelid where i.indrelid='public.nodes'::regclass and i.indisunique")).rows[0].s;
  check("F3 nodes unique indexes = live (5)", idx.split(" || ").length === 5 && idx.includes("nodes_one_active_rule_per_id_uidx=CREATE UNIQUE INDEX nodes_one_active_rule_per_id_uidx ON public.nodes USING btree (rule_id) WHERE ((type = 'rule'::text) AND (is_active = true) AND (rule_id IS NOT NULL))") && idx.includes("nodes_identity_rule_uidx=CREATE UNIQUE INDEX nodes_identity_rule_uidx ON public.nodes USING btree (rule_id, rule_version) WHERE ((type = 'rule'::text) AND (rule_id IS NOT NULL))"));
  const rows = await ssl(c);
  check("F4 v6 row = live (active, description md5 98d4d88e…, metadata md5 f4e5216a…, 17885 characters)",
    rows.find((r) => r.v === 6 && r.a && r.d === LL.v6Md5 && r.m === LL.v6MetaMd5) && (await one(c, "select char_length(description) n from public.nodes where rule_id='system_suggestions_law' and rule_version=6")).n === 17885);
  check("F5 v5 row = live history (inactive, md5 9b5c19de… / aa247fb2…)", !!rows.find((r) => r.v === 5 && !r.a && r.d === LL.v5Md5 && r.m === LL.v5MetaMd5));
  const wl = await one(c, `select ${"(select string_agg(t.tgname::text||':'||t.tgenabled::text||':'||p.proname::text||':'||md5(pg_get_functiondef(p.oid))||':'||md5(pg_get_triggerdef(t.oid)), ',' order by t.tgname) from pg_trigger t join pg_proc p on p.oid=t.tgfoid where t.tgrelid='public.work_log'::regclass and not t.tgisinternal)"} t`);
  check("F6 work_log trigger set = live (the no-activation proof depends on it)", wl.t === L.wlTriggers);
}

// ---------- O: application order, the v7 row and the rollback order ----------
{
  const db = await freshDb();
  const c = db.client;
  const r1 = await tryExec(db, SQL.c11);
  check("O1 11c before 11b → refused (run 11b first); the law is unchanged", !r1.ok && /run 11b first/.test(r1.error) && (await activeSsl(c)) === "6", r1.error?.slice(0, 90));
  const r2 = await tryExec(db, SQL.b11), r3 = await tryExec(db, SQL.c11);
  check("O2 11b then 11c → both apply", r2.ok && r3.ok, (r2.error || "") + (r3.error || ""));
  const v7 = await one(c, `select rule_version, is_active, supersedes_version, label, depends_on, weight, md5(description) d, encode(sha256(convert_to(description,'UTF8')),'hex') h,
    char_length(description) n, md5(metadata::text) m, description = $1 same_text, metadata->'human_gate_v7_decision_record_only'->>'decision_text' dt,
    metadata ? 'v3_self_maintenance_2026_09_19' kept_v3, metadata ? 'human_gate_v6_release' kept_v6
    from public.nodes where rule_id='system_suggestions_law' and rule_version=7`, [V7]);
  check("O3 v7 row as reviewed: active, supersedes 6, md5 / SHA-256 / length / metadata md5 = literals, text = v7 file",
    v7 && v7.is_active && v7.supersedes_version === 6 && v7.d === LL.v7Md5 && v7.h === LL.v7Sha256 && v7.n === LL.v7Chars && v7.m === LL.v7MetaMd5 && v7.same_text);
  check("O4 v7 label, depends_on and weight carried over; ZURIEL's decision text recorded; v3 and v6 metadata records kept",
    v7.label === LL.label && JSON.stringify(v7.depends_on) === JSON.stringify(DEPENDS) && v7.weight === 1
    && v7.dt === "קבלת המלצה מתעדת החלטה בלבד. התחלת עבודה דורשת הוראה מפורשת שלי לסוכן מסוים בשיחה." && v7.kept_v3 && v7.kept_v6);
  const rows = await ssl(c);
  check("O5 v6 kept as unchanged inactive history; v5 untouched; exactly one active version",
    rows.find((r) => r.v === 6 && !r.a && r.d === LL.v6Md5 && r.m === LL.v6MetaMd5) && rows.find((r) => r.v === 5 && !r.a && r.d === LL.v5Md5) && (await activeSsl(c)) === "7");
  const r4 = await tryExec(db, SQL.b11), r5 = await tryExec(db, SQL.c11);
  check("O6 a second 11b or 11c refuses and changes nothing", !r4.ok && !r5.ok && (await fnMd5(c)) === L.newMd5 && (await activeSsl(c)) === "7");
  await c.query("select public.admin_suggestion_decide(107,'accepted',null)");
  const rec = (await records(c, "AUTO_DEP_UPGRADE_SUPABASE_SUPABASE_JS_2_45_1_S107"))[0];
  check("O7 after 11b + 11c an accepted suggestion cites the live law versions (v7 / v4 / v18) and dispatches nothing",
    rec?.primary_owner === "system_suggestions_law v7 + deploy_on_request v4 + inter_agent_coordination_law v18" && (await emitCalls(c)) === 0, rec?.primary_owner);
  const r6 = await tryExec(db, SQL.b18);
  check("O8 18b while v7 is active → refused (rollback order: 18c first); function unchanged", !r6.ok && /back at v6 first/.test(r6.error) && (await fnMd5(c)) === L.newMd5, r6.error?.slice(0, 90));
  const r7 = await tryExec(db, SQL.c18);
  const after = await ssl(c);
  check("O9 18c → v6 active again (unchanged), v7 kept as inactive history, one active version",
    r7.ok && after.find((r) => r.v === 6 && r.a && r.d === LL.v6Md5 && r.m === LL.v6MetaMd5) && after.find((r) => r.v === 7 && !r.a && r.d === LL.v7Md5) && (await activeSsl(c)) === "6", r7.error || "");
  const r8 = await tryExec(db, SQL.b18);
  check("O10 18b → the exact base function (md5 12961a8c…); the package is fully rolled back", r8.ok && (await fnMd5(c)) === L.baseMd5, r8.error || "");
  const r9 = await tryExec(db, SQL.c18);
  check("O11 18c a second time refuses (v7 is no longer active)", !r9.ok && /not the v7 written by 11c/.test(r9.error));
}
{
  // refusals of 11c on drift, and statement-level atomicity
  const cases = [
    ["O12 11c refuses on a drifted v6 description", "update public.nodes set description = description || ' ' where rule_id='system_suggestions_law' and rule_version=6", /v6 description drift/],
    ["O13 11c refuses when a companion law moved (deploy_on_request v5)", "update public.nodes set is_active=false where rule_id='deploy_on_request'; insert into public.nodes (type,label,description,metadata,is_active,rule_id,rule_version,supersedes_version) select 'rule','deploy_on_request v5','-',metadata,true,'deploy_on_request',5,4 from public.nodes where rule_id='deploy_on_request' and rule_version=4", /companion law versions changed/],
    ["O14 11c refuses when the v5 history row changed", "update public.nodes set description = description || ' ' where rule_id='system_suggestions_law' and rule_version=5", /v5 history row/],
  ];
  for (const [name, mutate, expect] of cases) {
    const db = await freshDb({ b11: true });
    await db.exec(mutate);
    const before = JSON.stringify(await ssl(db.client));
    const r = await tryExec(db, SQL.c11);
    check(name, !r.ok && expect.test(r.error) && JSON.stringify(await ssl(db.client)) === before, r.ok ? "applied!" : r.error.slice(0, 90));
  }
  const db = await freshDb({ b11: true });
  await db.exec("create function public.sim_fail_v7() returns trigger language plpgsql as $$ begin if new.rule_version = 7 then raise exception 'injected failure after v6 was deactivated'; end if; return new; end $$; create trigger trg_zz_sim_fail after insert on public.nodes for each row execute function public.sim_fail_v7();");
  const r = await tryExec(db, SQL.c11);
  check("O15 a failure after v6 was deactivated rolls the whole statement back (v6 still active, no v7 row)",
    !r.ok && /injected failure/.test(r.error) && (await activeSsl(db.client)) === "6" && (await ssl(db.client)).every((x) => x.v !== 7));
  await db.exec("drop trigger trg_zz_sim_fail on public.nodes");
  const at = SQL.c11.indexOf("ACCEPT RECORDS A DECISION ONLY");
  const flipped = SQL.c11.slice(0, at) + "a" + SQL.c11.slice(at + 1);
  const r2 = await tryExec(db, flipped);
  check("O16 one changed character in the new wording → refused (rebuilt text differs), nothing changes", !r2.ok && /rebuilt v7 text differs/.test(r2.error) && (await activeSsl(db.client)) === "6");
  let cutsOk = true; const seen = [];
  const doAt = SQL.c11.indexOf("do $sod_11c$");
  for (const cut of [doAt - 1, doAt + 30, Math.floor(SQL.c11.length * 0.5), SQL.c11.length - 4]) {
    const r3 = await tryExec(db, SQL.c11.slice(0, cut));
    const fine = (await activeSsl(db.client)) === "6" && (cut < doAt || !r3.ok);
    seen.push(`${cut}:${r3.ok ? "no-op" : "error"}`); if (!fine) cutsOk = false;
  }
  check("O17 a truncated 11c (4 cut points) applies nothing", cutsOk, seen.join(" "));
  const r4 = await tryExec(db, SQL.c11);
  check("O18 the intact 11c still applies afterwards", r4.ok && (await activeSsl(db.client)) === "7", r4.error || "");
  const r5 = await tryExec(db, "update public.nodes set is_active=true where rule_id='system_suggestions_law' and rule_version=6");
  check("O19 the live versioning guard stays in force: a second active version is refused", !r5.ok && /already has an active version/.test(r5.error));
}

// ---------- C: concurrent acceptance of the same recommendation ----------
async function twoSessions({ c11, isoB = "read committed", rollbackA = false }) {
  const db = await freshDb({ b11: true, c11 });
  const a = await session(db), b = await session(db);
  await a.query("begin"); await a.query(decideSql(101, "A"));
  await b.query(`begin isolation level ${isoB}`);
  const bRun = b.query(decideSql(101, "B")).then(() => ({ ok: true }), (e) => ({ ok: false, code: e.code, error: String(e.message) }));
  const waiting = await waitForLockWait(db);
  await a.query(rollbackA ? "rollback" : "commit");
  const bRes = await bRun;
  await b.query(bRes.ok ? "commit" : "rollback");
  return { db, waiting, bRes };
}
for (const c11 of [false, true]) {
  const tag = c11 ? "11b + 11c" : "11b only";
  const { db, waiting, bRes } = await twoSessions({ c11 });
  const c = db.client;
  const recs = await records(c);
  const s = await one(c, "select status, decision_note from public.system_suggestions where id=101");
  check(`C1 [${tag}] two sessions accept suggestion 101 at once: B waits on the row lock while A's transaction is open`, !!waiting && waiting.wait_event_type === "Lock", waiting ? `${waiting.state} ${waiting.wait_event_type}` : "B never waited");
  check(`C2 [${tag}] both calls succeed; exactly one passive record (to ZURIEL), zero dispatch calls, zero dispatch rows`,
    bRes.ok && recs.length === 1 && recs[0].to_actor === "ZURIEL" && recs[0].dispatch_kind === null && (await emitCalls(c)) === 0 && (await dispatchRows(c)) === 0,
    `records ${recs.length}, emits ${await emitCalls(c)}`);
  check(`C3 [${tag}] the later decision is the one kept on the suggestion (status accepted, note B)`, s.status === "accepted" && s.decision_note === "B");
}
{
  const { db, bRes } = await twoSessions({ c11: true, rollbackA: true });
  const recs = await records(db.client);
  check("C4 A rolls back while B waits → B writes the record: exactly one, zero dispatch calls", bRes.ok && recs.length === 1 && (await emitCalls(db.client)) === 0, `records ${recs.length}`);
}
{
  const { db, bRes } = await twoSessions({ c11: true, isoB: "repeatable read" });
  const c = db.client;
  check("C5 B under REPEATABLE READ gets a serialization failure (40001) instead of a duplicate", !bRes.ok && bRes.code === "40001", bRes.code || "no error");
  const b2 = await session(db);
  await b2.query(decideSql(101, "B retry"));
  check("C6 B's retry is idempotent: still one record, zero dispatch calls", (await records(c)).length === 1 && (await emitCalls(c)) === 0);
}
{
  const db = await freshDb({ b11: true, c11: true });
  const sessions = await Promise.all(Array.from({ length: 8 }, () => session(db)));
  const outcomes = await Promise.all(sessions.map((s, i) => s.query(decideSql(101, "S" + i)).then(() => "ok", (e) => e.code || "error")));
  check("C7 eight sessions accept the same suggestion at the same moment: all succeed, one record, zero dispatch calls",
    outcomes.every((o) => o === "ok") && (await records(db.client)).length === 1 && (await emitCalls(db.client)) === 0, outcomes.join(","));
  const pair = await Promise.all([session(db), session(db)]);
  const both = await Promise.all([pair[0].query(decideSql(102, "x")), pair[1].query(decideSql(107, "y"))].map((p) => p.then(() => "ok", (e) => e.message)));
  const n = Number((await one(db.client, "select count(*) c from public.work_log where task_key in ('AUTO_DEP_UPGRADE_VITE_6_0_0_S102','AUTO_DEP_UPGRADE_SUPABASE_SUPABASE_JS_2_45_1_S107')")).c);
  check("C8 two different suggestions accepted at once: both succeed, one record each, zero dispatch calls (no false overlap block)",
    both.every((x) => x === "ok") && n === 2 && (await emitCalls(db.client)) === 0, both.join(" | "));
}
{
  // contrast: the live base function in the same race
  const db = await SERVER.freshDb();
  await db.exec(PART_ROLES_AUTH + PART_NODES_LIVE + PART_SUGGESTIONS_WORKLOG);
  for (const f of BASE_FNS) await db.exec(read(`base/${f}.sql`));
  await db.exec(TRIGGERS);
  await db.exec(SEED_USERS + SEED_SUGGESTIONS);
  const a = await session(db), b = await session(db);
  await a.query("begin"); await a.query(decideSql(101, "A"));
  await b.query("begin");
  const bRun = b.query(decideSql(101, "B")).then(() => ({ ok: true }), (e) => ({ ok: false, error: String(e.message) }));
  await waitForLockWait(db);
  await a.query("commit");
  const bRes = await bRun; await b.query(bRes.ok ? "commit" : "rollback");
  const rows = (await db.client.query("select to_actor, dispatch_kind, dispatch_state from public.work_log")).rows;
  check("C9 contrast — the live base function in the same race: one QUEUED ASSIGNMENT to CLAUDE and one dispatch call (B refused by the overlap guard)",
    rows.length === 1 && rows[0].to_actor === "CLAUDE" && rows[0].dispatch_kind === "ASSIGNMENT" && (await emitCalls(db.client)) === 1 && !bRes.ok && /already active/.test(bRes.error),
    `rows ${rows.length}, emits ${await emitCalls(db.client)}, B ${bRes.ok ? "ok" : "refused"}`);
}

await SERVER.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
if (failed.length) { console.log("FAILED:", failed.map((f) => f.name).join(" | ")); process.exit(1); }
