// Decision 4 — local simulation of 40_/49_ (Corpus Admission approval path) on an in-memory PGlite copy.
// Loads the live definitions (md5-verified) and the 2,894 is_verified=false rows (checksum-verified). Never connects to the live DB.
import { PGlite } from "@electric-sql/pglite";
import { read, md5, one, all, tryExec, check, results } from "./harness.mjs";
import { writeFileSync } from "node:fs";

const MAN = JSON.parse(read("base/fn/corpus/_manifest.json"));
const def = (sig) => read(MAN[sig].file);
const WORDS = JSON.parse(read("base/words/unverified_2894.json"));
const LIVE_CHECKSUM = "09b4e65afbaee2962aea42ca0624df58";
const ADMIN = "aaaaaaaa-0000-4000-8000-000000000001", USER = "bbbbbbbb-0000-4000-8000-000000000002";
const STATE_SQL = "select md5(string_agg(id::text||'|'||is_verified::text||'|'||coalesce(visibility_reason,'')||'|'||coalesce(visibility_tier,-1)::text||'|'||coalesce(is_published,false)::text, ',' order by id)) m from public.gematria_words";
const CALCS = ["ragil_calc", "mistater_calc", "miluy_calc", "kadmi_calc", "gadol_calc", "siduri_calc", "atbash_calc", "albam_calc",
  "miluy_demiluy_calc", "kadmi_gadol_calc", "ribua_calc", "ribua_gadol_calc", "hakpala_calc", "hakpala_gadol_calc", "fn_ragil"];

const SCHEMA = `
create role anon; create role authenticated; create role service_role;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('sim.uid', true), '')::uuid $$;
create table public.users (id uuid primary key, role text);
create table public.gematria_words (id uuid primary key default gen_random_uuid(), phrase text, is_verified boolean default false,
  visibility_reason text, visibility_tier smallint not null default 3 check (visibility_tier in (1,2,3)), is_published boolean not null default false,
  source text default 'excel_import', created_at timestamptz default now(), updated_at timestamptz default now(), visibility_changed_at timestamptz,
  category text, notes text, is_encrypted boolean default false, ragil integer, misratar integer, miluy integer, kadmi integer, gadol integer,
  siduri integer, atbash integer, albam integer, miluy_demiluy bigint, kadmi_gadol bigint, ribua bigint, ribua_gadol bigint, hakpala bigint,
  hakpala_gadol bigint, all_values integer[]);
create table public.posts (id bigint primary key);
create table public.post_gematria_links (id uuid primary key default gen_random_uuid(),
  gematria_id uuid not null references public.gematria_words(id) on delete cascade, post_wp_id bigint not null, created_at timestamptz default now(),
  post_id bigint references public.posts(id) on delete cascade, unique (gematria_id, post_wp_id));
create table public.word_review_queue (id uuid primary key default gen_random_uuid(), original_text text not null, extracted text not null unique,
  reason text, kind text, word_count integer not null default 0, flags jsonb not null default '{}'::jsonb, quality_score integer, confidence integer,
  entity_word_id uuid references public.gematria_words(id) on delete set null, will_create boolean not null default false,
  similar_words jsonb not null default '[]'::jsonb, hits integer not null default 1, source text, status text not null default 'pending'
  check (status in ('pending','approved','rejected','blocked','merged')), decided_by text, decided_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), submitted_by uuid references public.users(id));
create table public.decision_reason_codes (code text primary key);
create table public.decision_ledger (id uuid primary key default gen_random_uuid(), decision_type text not null, subject_type text, subject_ref text,
  candidate jsonb, methods text[], sources jsonb, domain text, created_by_agent text, agents_involved text[], evidence_ref uuid, evidence jsonb,
  ai_model text, ai_reasoning text, ai_score numeric, rules_version jsonb,
  human_decision text check (human_decision in ('approve','reject','merge','modify')), human_reason text, decided_by text, source_event_id bigint,
  result_ref jsonb, provenance jsonb, status text not null default 'pending', created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), reason_code text references public.decision_reason_codes(code), rules_snapshot jsonb, engine_snapshot jsonb,
  constraint decision_ledger_status_governance_vocab check (status is null or status in ('confirmed','rejected','applied','executed')));
create table public.gematria_integrity (id uuid, phrase text, method text, stored bigint, engine integer);
create table public.gematria_blocklist (pattern text);
create table public.contribution_events (id bigserial primary key, user_id uuid, kind text, ref text, value bigint, source text, metadata jsonb, created_at timestamptz default now());
create table public.research_objects (id bigserial primary key);
${CALCS.map(f => `create function public.${f}(t text) returns integer language sql immutable as $$ select length(t) $$;`).join("\n")}
create function public.bidim_sync() returns trigger language plpgsql as $$ begin return null; end $$;
`;
const LIVE_FNS = ["rd_is_admin()", "fn_normalize_for_calc(input text)", "find_similar_words(p_phrase text)", "fn_resolve_word_identity(p_phrase text)",
  "fn_verify_gematria_word_engine(p_word_id uuid)", "fn_corpus_admission_gate(p_phrase text, p_source text, p_source_ref text, p_contributor text, p_claimed_value integer)",
  "_word_is_spam(v text)", "_word_rec(v text, fam integer)", "wa_add_word(p_phrase text, p_source text, p_note text)", "gw_enforce_engine()",
  "enqueue_word_review(p_original text, p_extracted text, p_kind text, p_word_count integer, p_flags jsonb, p_quality integer, p_confidence integer, p_reason text, p_source text, p_safe_to_auto boolean)",
  "resolve_word_review(p_id uuid, p_action text, p_edit text, p_by text)", "wa_word_review(p_id uuid, p_action text)",
  "admin_bulk_triage(p_action text)", "admin_hide_word(p_phrase text)"];
const REPLACED = { "public.resolve_word_review(uuid,text,text,text)": "resolve_word_review(p_id uuid, p_action text, p_edit text, p_by text)",
  "public.wa_word_review(uuid,text)": "wa_word_review(p_id uuid, p_action text)", "public.admin_bulk_triage(text)": "admin_bulk_triage(p_action text)",
  "public.admin_hide_word(text)": "admin_hide_word(p_phrase text)" };

async function setup() {
  const db = new PGlite();
  await db.exec(SCHEMA);
  for (const sig of LIVE_FNS) await db.exec(def(sig) + ";");
  await db.exec(read("base/fn/corpus/trg_wrq_emit_contribution.sql") + ";");
  await db.exec(`create trigger trg_gw_enforce_engine before insert or update of phrase on public.gematria_words for each row execute function gw_enforce_engine();
    create trigger trg_bidim_sync after insert or delete or update on public.gematria_words for each row execute function bidim_sync();
    create trigger wrq_emit_contribution after update on public.word_review_queue for each row execute function trg_wrq_emit_contribution();`);
  await db.query("insert into public.users values ($1,'admin'),($2,'user')", [ADMIN, USER]);
  await db.query(`insert into public.gematria_words (id, phrase, is_verified, visibility_reason, visibility_tier, is_published, source, created_at)
    select x.id, x.p, x.v, x.r, x.t, coalesce(x.pub,false), x.s, x.c from json_to_recordset($1::json) as x(id uuid, p text, v boolean, r text, t smallint, pub boolean, s text, c timestamptz)`, [JSON.stringify(WORDS)]);
  return db;
}
const asUser = async (db, uid) => db.exec(`set sim.uid = '${uid || ""}'`);
const uchk = async (db) => (await one(db, STATE_SQL.replace("from public.gematria_words", "from public.gematria_words where id = any($1::uuid[])"), [WORDS.map(w => w.id)])).m;
const counts = async (db) => one(db, "select (select count(*) from public.gematria_words)::int w, (select count(*) from public.word_review_queue)::int q, (select count(*) from public.decision_ledger)::int l, (select count(*) from public.post_gematria_links)::int k, (select count(*) from public.contribution_events)::int c");

const db = await setup();
check("[T1] the 2,894 copied rows reproduce the live state checksum", (await uchk(db)) === LIVE_CHECKSUM && WORDS.length === 2894);
for (const [reg, sig] of Object.entries(REPLACED)) {
  const m = (await one(db, `select md5(pg_get_functiondef('${reg}'::regprocedure)) m`)).m;
  check(`[T2] parity: ${reg} pg_get_functiondef md5 = live`, m === MAN[sig].md5, m);
}
// synthetic fixtures (outside the 2,894): a clean Hebrew word, a word with a post link, a verified word
await db.exec(`insert into public.posts values (5003);
  insert into public.gematria_words (id, phrase, is_verified, visibility_reason, source) values
   ('11111111-0000-4000-8000-000000000001','אור גנוז',false,'pending_wa','wa-vip'),
   ('11111111-0000-4000-8000-000000000002','סוד הגאולה',false,null,'excel_import'),
   ('11111111-0000-4000-8000-000000000003','כתר עליון',true,'approved_by_admin','sod1820');
  insert into public.post_gematria_links (gematria_id, post_wp_id, post_id) values ('11111111-0000-4000-8000-000000000002', 36945, 5003);`);
const before = await counts(db), allBefore = (await one(db, STATE_SQL)).m;
const apply = await tryExec(db, read("sql/40_corpus_admission_approval_path.sql"));
check("[T3] 40_ applies on the reviewed definitions", apply.ok, apply.error || "");
check("[T3] applying 40_ changes no word state and no row count", (await one(db, STATE_SQL)).m === allBefore && JSON.stringify(await counts(db)) === JSON.stringify(before));
check("[T3] the 2,894 checksum is unchanged after 40_", (await uchk(db)) === LIVE_CHECKSUM);
const again = await tryExec(db, read("sql/40_corpus_admission_approval_path.sql"));
check("[T3] a second run of 40_ is refused (definitions are no longer the reviewed base)", !again.ok && /S40/.test(again.error), again.error?.slice(0, 80));

await asUser(db, USER);
check("[T4] state report refuses a non-admin", (await one(db, "select public.admin_corpus_admission_state_v1() r")).r.error === "forbidden");
await asUser(db, ADMIN);
const st = (await one(db, "select public.admin_corpus_admission_state_v1() r")).r;
const EXPECT = { REJECTED_BY_ADMIN: 1388, BULK_HIDDEN_2026_07_03: 115, HUMAN_GATE_AUTHORED: 11, CULTURE_CIPHER_SOURCE: 6, CHANNEL_PENDING: 41 + 1,
  ENGINE_UNVERIFIABLE_FORMAT: 108, EXPOSED_LABEL_UNVERIFIED: 590, NO_REASON_IMPORT: 634 + 1, OTHER_PENDING_REVIEW: 1 };
check("[T4] state report: exact counts per admission state (2,894 + 2 synthetic)", JSON.stringify(Object.fromEntries(Object.entries(st.by_class).sort())) === JSON.stringify(Object.fromEntries(Object.entries(EXPECT).sort())), JSON.stringify(st.by_class));

const pend = WORDS.find(w => w.r === "pending_wa"), rej = WORDS.find(w => w.r === "rejected_by_admin"), fmt = WORDS.find(w => w.r === "pending_review" && /[^א-ת ]/.test(w.p));
const enq = (await one(db, "select public.admin_corpus_enqueue_existing_words_v1($1::uuid[], 'sim') r",
  [[pend.id, rej.id, "11111111-0000-4000-8000-000000000003", "99999999-0000-4000-8000-000000000009", "11111111-0000-4000-8000-000000000002", fmt.id]])).r;
const res = Object.fromEntries(enq.results.map(x => [x.word_id, x.result]));
check("[T5] enqueue: a pending word is queued", res[pend.id] === "queued", JSON.stringify(enq));
check("[T5] enqueue: a rejected_by_admin word is kept as decided (no retroactive change)", res[rej.id] === "already_decided_by_admin:rejected_by_admin");
check("[T5] enqueue: a verified word and an unknown id are refused", res["11111111-0000-4000-8000-000000000003"] === "already_verified" && res["99999999-0000-4000-8000-000000000009"] === "not_found");
const qrow = await one(db, "select * from public.word_review_queue where entity_word_id = $1", [pend.id]);
check("[T5] the queue row keeps the prior state and has no submitted_by (no contribution credit)", qrow && qrow.submitted_by === null && qrow.flags.prior_state.visibility_reason === "pending_wa" && qrow.flags.enqueued_by === ADMIN);
check("[T5] enqueue changed no word state", (await uchk(db)) === LIVE_CHECKSUM);
const enq2 = (await one(db, "select public.admin_corpus_enqueue_existing_words_v1($1::uuid[], 'sim') r", [[pend.id]])).r;
check("[T6] a second enqueue of the same word does not duplicate it", enq2.results[0].result === "already_queued" && (await one(db, "select count(*)::int n from public.word_review_queue where entity_word_id=$1", [pend.id])).n === 1);

const contribBefore = (await counts(db)).c;
const ap = (await one(db, "select public.resolve_word_review($1, 'approve') r", [qrow.id])).r;
const pw = await one(db, "select is_verified, visibility_reason from public.gematria_words where id=$1", [pend.id]);
const led = await all(db, "select * from public.decision_ledger where subject_ref=$1", [pend.id]);
check("[T7] approve (existing word): visibility_reason=approved_by_admin; is_verified set by the engine", /^approved_existing:engine_verified=/.test(ap) && pw.visibility_reason === "approved_by_admin" && String(pw.is_verified) === ap.split("=")[1], ap);
check("[T7] approve writes one ledger row with admin identity, prior and new state", led.length === 1 && led[0].decided_by === ADMIN && led[0].human_decision === "approve" && led[0].provenance.prior_state.visibility_reason === "pending_wa" && led[0].provenance.new_state.visibility_reason === "approved_by_admin" && led[0].status === "applied");
check("[T7] no contribution credit is created for an admin-queued existing word", (await counts(db)).c === contribBefore);
check("[T8] a decided queue row cannot be decided again", (await one(db, "select public.resolve_word_review($1, 'reject') r", [qrow.id])).r === "already_decided:approved");

const q2 = (await one(db, "select id from public.word_review_queue where entity_word_id=$1", [fmt.id]));
const rj = (await one(db, "select public.resolve_word_review($1, 'reject') r", [q2.id])).r;
const fw = await one(db, "select visibility_reason from public.gematria_words where id=$1", [fmt.id]);
check("[T9] reject (existing word): rejected_by_admin, row kept, ledger row written", rj === "rejected_existing" && fw.visibility_reason === "rejected_by_admin" && (await all(db, "select 1 from public.decision_ledger where subject_ref=$1 and human_decision='reject'", [fmt.id])).length === 1);

const q3 = (await one(db, "select id from public.word_review_queue where entity_word_id='11111111-0000-4000-8000-000000000002'"));
check("[T10] delete on a queue row is refused and the row stays", (await one(db, "select public.resolve_word_review($1, 'delete') r", [q3.id])).r === "delete_disabled_use_reject" && !!(await one(db, "select 1 x from public.word_review_queue where id=$1", [q3.id])));
check("[T11] wa_word_review delete is refused; the word and its post link stay", (await one(db, "select public.wa_word_review('11111111-0000-4000-8000-000000000002', 'delete') r")).r === "delete_disabled_use_reject"
  && (await one(db, "select count(*)::int n from public.post_gematria_links where gematria_id='11111111-0000-4000-8000-000000000002'")).n === 1);
check("[T12] wa_word_review approve on a rejected word keeps the admin decision", (await one(db, "select public.wa_word_review($1, 'approve') r", [rej.id])).r === "already_decided_by_admin:rejected_by_admin"
  && (await one(db, "select visibility_reason v from public.gematria_words where id=$1", [rej.id])).v === "rejected_by_admin");
const fmt2 = WORDS.find(w => w.r === "pending_review" && /[^א-ת ]/.test(w.p) && w.id !== fmt.id);
const wa = (await one(db, "select public.wa_word_review($1, 'approve') r", [fmt2.id])).r;
const f2 = await one(db, "select is_verified, visibility_reason from public.gematria_words where id=$1", [fmt2.id]);
check("[T13] wa_word_review approve on a non-Hebrew phrase: approved_by_admin but is_verified stays false (engine-owned)", wa === "approved:engine_verified=false" && f2.is_verified === false && f2.visibility_reason === "approved_by_admin", wa);
const preBulk = (await one(db, STATE_SQL)).m;
const bulk = await tryExec(db, "select public.admin_bulk_triage('approve_good')");
check("[T14] admin_bulk_triage is disabled for an admin and changes nothing", !bulk.ok && /disabled/.test(bulk.error) && (await one(db, STATE_SQL)).m === preBulk);
await asUser(db, USER);
check("[T15] non-admins: resolve / wa_word_review raise, bulk returns -1, enqueue forbidden",
  !(await tryExec(db, `select public.resolve_word_review('${q3.id}', 'approve')`)).ok && !(await tryExec(db, `select public.wa_word_review('${pend.id}', 'approve')`)).ok
  && (await one(db, "select public.admin_bulk_triage('approve_good') r")).r === -1
  && (await one(db, "select public.admin_corpus_enqueue_existing_words_v1($1::uuid[]) r", [[pend.id]])).r.error === "forbidden");
await asUser(db, ADMIN);
await db.exec("insert into public.word_review_queue (original_text, extracted, kind, word_count, source) values ('אור חדש','אור חדש','phrase',2,'wa-vip')");
const nq = await one(db, "select id from public.word_review_queue where extracted='אור חדש'");
const na = (await one(db, "select public.resolve_word_review($1, 'approve') r", [nq.id])).r;
check("[T16] original queue path still creates and approves a new word, with a ledger row", /^approved:queued/.test(na) && !!(await one(db, "select 1 x from public.gematria_words where phrase='אור חדש' and visibility_reason='approved_by_admin'"))
  && (await all(db, "select 1 from public.decision_ledger where provenance->>'queue_id'=$1", [nq.id])).length === 1, na);
await db.exec(`insert into public.word_review_queue (original_text, extracted, kind, word_count, source) values ('${rej.p.replace(/'/g, "''")}x','${rej.p.replace(/'/g, "''")}','phrase',1,'wa-vip') on conflict (extracted) do nothing`);
const rq = await one(db, "select id, entity_word_id from public.word_review_queue where extracted=$1", [rej.p]);
if (rq && !rq.entity_word_id) {
  check("[T17] original path never flips a word that an admin rejected", (await one(db, "select public.resolve_word_review($1, 'approve') r", [rq.id])).r === "blocked_by_prior_admin_rejection"
    && (await one(db, "select visibility_reason v from public.gematria_words where id=$1", [rej.id])).v === "rejected_by_admin");
} else check("[T17] original path never flips a word that an admin rejected", false, "fixture not created");
const g = await one(db, `select has_function_privilege('anon','public.admin_corpus_enqueue_existing_words_v1(uuid[],text)','execute') a1,
  has_function_privilege('anon','public.admin_corpus_admission_state_v1()','execute') a2,
  has_function_privilege('anon','public._corpus_word_state_v1(uuid)','execute') a3,
  has_function_privilege('authenticated','public._corpus_admission_ledger_v1(text,text,text,jsonb,jsonb,jsonb)','execute') a4,
  has_function_privilege('authenticated','public.admin_corpus_enqueue_existing_words_v1(uuid[],text)','execute') a5`);
check("[T18] grants: anon cannot run the new functions; helpers are not callable by clients; authenticated reaches the admin-checked entry points", !g.a1 && !g.a2 && !g.a3 && !g.a4 && g.a5, JSON.stringify(g));
const decidedIds = new Set([pend.id, fmt.id, fmt2.id]);
const untouched = WORDS.filter(w => !decidedIds.has(w.id)).map(w => w.id);
const ut = (await one(db, STATE_SQL.replace("from public.gematria_words", "from public.gematria_words where id = any($1::uuid[])"), [untouched])).m;
const expectUt = md5(WORDS.filter(w => !decidedIds.has(w.id)).sort((a, b) => a.id < b.id ? -1 : 1).map(w => `${w.id}|${String(w.v)}|${w.r || ""}|${w.t ?? -1}|${String(!!w.pub)}`).join(","));
check("[T19] only the three explicitly decided rows changed among the 2,894", ut === expectUt);
await db.close();

// rollback on a fresh copy
{
  const d2 = await setup();
  const a = await tryExec(d2, read("sql/40_corpus_admission_approval_path.sql"));
  const r = await tryExec(d2, read("sql/49_corpus_admission_approval_path_ROLLBACK.sql"));
  check("[T20] 49_ rollback runs after 40_", a.ok && r.ok, (a.error || "") + (r.error || ""));
  let same = true;
  for (const [reg, sig] of Object.entries(REPLACED)) same = same && (await one(d2, `select md5(pg_get_functiondef('${reg}'::regprocedure)) m`)).m === MAN[sig].md5;
  const left = (await one(d2, "select count(*)::int n from pg_proc where proname in ('_corpus_word_state_v1','_corpus_admission_ledger_v1','admin_corpus_admission_state_v1','admin_corpus_enqueue_existing_words_v1')")).n;
  check("[T20] after rollback: the 4 live definitions are back byte-exact and the 4 new functions are gone", same && left === 0);
  check("[T20] after rollback: the 2,894 checksum is unchanged", (await uchk(d2)) === LIVE_CHECKSUM);
  const r2 = await tryExec(d2, read("sql/49_corpus_admission_approval_path_ROLLBACK.sql"));
  check("[T20] a rollback without 40_ applied is refused", !r2.ok && /S49/.test(r2.error));
  await d2.close();
}
// static: no data statement outside function bodies
const s40 = read("sql/40_corpus_admission_approval_path.sql").replace(/\$function\$[\s\S]*?\$function\$/g, "").replace(/--.*$/gm, "");
check("[T21] 40_ has no INSERT/UPDATE/DELETE/TRUNCATE/DROP outside function bodies", !/\b(insert\s+into|update\s+public\.|delete\s+from|truncate|drop\s+(table|function))\b/i.test(s40));
writeFileSync(new URL("../out/sim_corpus_results.json", import.meta.url), JSON.stringify(results, null, 1));
const failed = results.filter(r => !r.pass);
for (const r of results) console.log((r.pass ? "OK " : "XX ") + r.name + (r.pass ? "" : " | " + r.detail));
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
