#!/usr/bin/env bash
# G1 rule guard (CL-16) lifecycle test (tests/sql/g1_rule_guard_cl16_v1.sql) on a throwaway PostgreSQL - never a live project.
# 25 cases: each run of the proposal or of its rollback has an expected outcome (missing function, drifted body or trigger, MISSING
# trigger, DISABLED trigger, missing or disabled TRUNCATE trigger -> refusal for that reason; exact state -> runs; repeat -> no-op).
# After the lifecycle cases it runs NINE CONCURRENCY CASES (CR-F1, Codex review 14.11.2026) on the same throwaway cluster, native PostgreSQL only: a second session B holds an
# open change while the REAL apply or rollback file starts; the order is set by a synchronisation barrier (pg_stat_activity / pg_locks polled until B holds its change and the file
# is seen WAITING for a lock; then B is released through a flag file), never by sleeps. A1/R1: B's ALTER TABLE ... DISABLE TRIGGER must not be overwritten by the apply / rollback
# (the file refuses on the drift); A2/R2: clean runs after waiting; A4/R4: the CREATE OR REPLACE FUNCTION control; A5: readers; A3: writers and an atomic lock timeout; R3: readers
# and an atomic lock timeout of the rollback's DROP TRIGGER. Self-check: G1_RG_CC_APPLY / G1_RG_CC_ROLLBACK point the cases at other files (for example the files before CR-F1,
# where A1 and R1 must FAIL). Same pattern as run-m0b-ai-quota-sql-test.sh. Also checks statically that no OTHER SQL file of the repository that can be applied to
# the live database (supabase/proposed/*.sql and every file named by a docs/reviews/*/apply-plan.json) mentions public.nodes or the rule
# guard, except the files listed and reviewed in docs/reviews/contracts-enforcement-20261113/cl16-rule-tree-writers.json. So the state of
# these objects that the test simulates (the live 12.11.2026 state) is the state any other proposal leaves them in, in any order, and a
# new proposal that touches the rule tree cannot appear without a review of its order against CL-16 (cl16-database-step.md).
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
node -e '
const fs = require("fs"), path = require("path"); const root = process.argv[1];
const own = new Set(["supabase/proposed/20261112200000_g1_rule_guard_cl16.sql", "supabase/proposed/ROLLBACK_20261112200000_g1_rule_guard_cl16.sql"]);
const reviewedDoc = JSON.parse(fs.readFileSync(root + "/docs/reviews/contracts-enforcement-20261113/cl16-rule-tree-writers.json", "utf8"));
const touches = new RegExp(reviewedDoc.pattern, "i");
const files = new Set(fs.readdirSync(root + "/supabase/proposed").filter((f) => f.endsWith(".sql")).map((f) => "supabase/proposed/" + f));
for (const d of fs.readdirSync(root + "/docs/reviews")) {
  const pf = root + "/docs/reviews/" + d + "/apply-plan.json"; if (!fs.existsSync(pf)) continue;
  for (const s of JSON.parse(fs.readFileSync(pf, "utf8")).steps || []) for (const f of [s.file, s.rollback]) if (f && f.endsWith(".sql")) files.add(f);
}
const hits = [...files].filter((f) => !own.has(f) && fs.existsSync(root + "/" + f) && touches.test(fs.readFileSync(root + "/" + f, "utf8"))).sort();
const reviewed = new Set(reviewedDoc.reviewed.map((r) => r.file));
const unreviewed = hits.filter((f) => !reviewed.has(f));
if (unreviewed.length) { console.error("FAIL: SQL files that mention public.nodes or the rule guard and are not in cl16-rule-tree-writers.json (review their order against CL-16 first): " + unreviewed.join(", ")); process.exit(1); }
const stale = [...reviewed].filter((f) => fs.existsSync(root + "/" + f) && !hits.includes(f));
if (stale.length) { console.error("FAIL: cl16-rule-tree-writers.json lists files that no longer mention the rule tree (update the list): " + stale.join(", ")); process.exit(1); }
console.log("rule tree writers: " + files.size + " SQL files scanned, " + hits.length + " mention public.nodes or the guard, all reviewed (" + [...reviewed].filter((f) => !fs.existsSync(root + "/" + f)).length + " reviewed files are no longer in the tree)");
' "$ROOT"
# The CL-16 apply plan names the two files by sha256: a plan whose checksums are not the files is a stale request and fails here.
node -e '
const fs = require("fs"); const crypto = require("crypto"); const root = process.argv[1]; const plan = require(root + "/docs/reviews/g1-rule-guard-cl16-20261112/apply-plan.json");
const sha = (f) => crypto.createHash("sha256").update(fs.readFileSync(root + "/" + f)).digest("hex"); let bad = 0;
for (const s of plan.steps) for (const [f, want] of [[s.file, s.sha256], [s.rollback, s.rollback_sha256]]) if (sha(f) !== want) { console.error("FAIL: apply-plan sha256 of " + f + " is stale"); bad = 1; }
if (bad) process.exit(1); console.log("CL-16 apply plan: sha256 of the proposal and of its rollback match the files");
' "$ROOT"
W=$(mktemp -d)
FILES=(tests/sql/g1_rule_guard_cl16_v1.sql supabase/proposed/20261112200000_g1_rule_guard_cl16.sql
  supabase/proposed/ROLLBACK_20261112200000_g1_rule_guard_cl16.sql tests/sql/fixtures/g1_rule_guard_live_base_20261112/fn_and_trigger.sql)
for f in "${FILES[@]}"; do mkdir -p "$W/$(dirname "$f")"; cp "$ROOT/$f" "$W/$f"; done
chmod -R a+rX "$W"
# Every run of one of the two files is a CASE marked in the output (tests/sql/g1_rule_guard_cl16_v1.sql): "@@CASE <id> OK" must run
# without an ERROR, and "@@CASE <id> REFUSE <needle>" must stop with an ERROR that contains the needle (a refusal for another reason
# fails). The number of cases is fixed, so a case that silently did not run fails too. G1_RG_FLIP=<case id> inverts one expectation:
# the self-check of this runner, which must then exit 1.
EXPECTED_CASES=25
check() { tee "$W/out.txt"; grep -q 'g1_rule_guard_cl16_v1: PASS' "$W/out.txt" || { echo "FAIL: G1 rule guard lifecycle did not PASS" >&2; exit 1; }
  node -e '
const lines = require("fs").readFileSync(process.argv[1], "utf8").split("\n"); const want = Number(process.argv[2]); const flip = process.argv[3] || "";
const cases = []; let cur = null;
for (const l of lines) {
  const m = /@@CASE (\S+) (REFUSE|OK)(?: (.*))?$/.exec(l);
  if (m) { cur = { id: m[1], want: m[2], needle: (m[3] || "").trim(), text: [] }; cases.push(cur); continue; }
  if (/@@END/.test(l)) { cur = null; continue; }
  if (cur) cur.text.push(l);
}
let bad = 0;
for (const c of cases) {
  const text = c.text.join("\n"); const err = /ERROR:/.test(text);
  let expect = c.want; if (c.id === flip) expect = expect === "OK" ? "REFUSE" : "OK";
  const ok = expect === "OK" ? !err : (err && text.includes(c.needle) && c.needle.length > 0);
  console.log((ok ? "ok " : "MISMATCH ") + c.id + " " + (err ? "REFUSED" : "RAN") + (c.want === "REFUSE" ? " [" + c.needle.slice(0, 90) + "]" : ""));
  if (!ok) bad = 1;
}
if (cases.length !== want) { console.log("MISMATCH: " + cases.length + " cases ran, " + want + " expected"); bad = 1; }
if (new Set(cases.map((c) => c.id)).size !== cases.length) { console.log("MISMATCH: duplicate case id"); bad = 1; }
console.log(bad ? "RESULT: UNEXPECTED OUTCOME(S)" : "RESULT: all " + cases.length + " lifecycle cases behaved as expected");
process.exit(bad);' "$W/out.txt" "$EXPECTED_CASES" "${G1_RG_FLIP:-}" || { echo "FAIL: a lifecycle case did not behave as expected" >&2; exit 1; }
  grep -q 'G1 rule guard: already applied' "$W/out.txt" || { echo "FAIL: the second apply was not a no-op" >&2; exit 1; }
  grep -q 'G1 rule guard rollback: already the live 12.11.2026 state' "$W/out.txt" || { echo "FAIL: the second rollback was not a no-op" >&2; exit 1; }; }

if ! compgen -G '/usr/lib/postgresql/*/bin' >/dev/null; then
  CONTAINER="sod-g1-rule-guard-$$"
  docker run --rm -d --network none --name "$CONTAINER" -e POSTGRES_HOST_AUTH_METHOD=trust -v "$W:/w:ro" -w /w postgres:17-alpine >/dev/null
  trap 'docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; rm -rf "$W"' EXIT
  for i in $(seq 1 30); do
    if docker exec "$CONTAINER" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then break; fi
    sleep 1
  done
  docker exec -w /w "$CONTAINER" psql -X -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 -q -f tests/sql/g1_rule_guard_cl16_v1.sql 2>&1 | check
  echo "NOTE: the nine concurrency cases (CR-F1) need a local PostgreSQL (/usr/lib/postgresql/*/bin) and were NOT run in this container branch; CI runs them" >&2
  exit
fi

BIN=${G1_PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin | tail -1)}; echo "PostgreSQL: $("$BIN/postgres" --version)"
D=$(mktemp -d)
run() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
if [ "$(id -u)" = 0 ]; then chown postgres "$D"; fi
run "$BIN/initdb -D $D/data -A trust >/dev/null"
run "$BIN/pg_ctl -D $D/data -o '-p 55443 -k $D' -l $D/log -w start >/dev/null"
trap 'run "$BIN/pg_ctl -D '"$D"'/data -m immediate stop >/dev/null" || true; rm -rf "$D" "$W"' EXIT
run "$BIN/createdb -h $D -p 55443 t"
run "cd $W && $BIN/psql -X -h $D -p 55443 -d t -v ON_ERROR_STOP=1 -q -f tests/sql/g1_rule_guard_cl16_v1.sql" 2>&1 | check

# --- CR-F1: concurrency cases (native PostgreSQL) ------------------------------------------------------------------------------------------------
set +e
PORT=55443
CC_APPLY=${G1_RG_CC_APPLY:-$W/supabase/proposed/20261112200000_g1_rule_guard_cl16.sql}
CC_ROLLBACK=${G1_RG_CC_ROLLBACK:-$W/supabase/proposed/ROLLBACK_20261112200000_g1_rule_guard_cl16.sql}
STATIC_TEST=$W/tests/sql/g1_rule_guard_cl16_v1.sql
FN_FIXTURE=$W/tests/sql/fixtures/g1_rule_guard_live_base_20261112/fn_and_trigger.sql
EXPECTED_CONCURRENCY=9
CC_BAD=0
cc_fail() { echo "FAIL: $*" >&2; CC_BAD=1; }
cc_psql() { run "cd $W && $BIN/psql -X -h $D -p $PORT -d $1 -v ON_ERROR_STOP=1 -q -At -f $2" 2>&1; }
cc_val() { local f; f=$(mktemp "$W/qv.XXXXXX"); printf '%s\n' "$2" > "$f"; chmod a+r "$f"; cc_psql "$1" "$f"; }
cc_bg() { # db sqlfile outfile: background psql; the exit code lands in <outfile>.rc and the elapsed milliseconds in <outfile>.ms
  ( s=$(date +%s%N); cc_psql "$1" "$2" > "$3" 2>&1; echo $? > "$3.rc"; echo $(( ($(date +%s%N) - s) / 1000000 )) > "$3.ms" ) &
  CC_PID=$!; }
cc_sql() { local f; f=$(mktemp "$W/cs.XXXXXX"); printf '%s\n' "$1" > "$f"; chmod a+r "$f"; echo "$f"; }
cc_until() { # description db sql(t when the barrier holds) seconds
  local i n=$(( $4 * 20 )); for i in $(seq 1 "$n"); do [ "$(cc_val "$2" "$3")" = "t" ] && return 0; sleep 0.05; done
  cc_fail "barrier never held: $1"; return 1; }
cc_state() { cc_val "$1" "select coalesce((select md5(pg_get_functiondef(p.oid)) from pg_proc p where p.oid = to_regprocedure('public.fn_rule_compaction_integrity_guard_v1()')), 'none')
  || '|' || coalesce((select t.tgenabled::text from pg_trigger t where t.tgname = 'trg_rule_compaction_integrity_guard_v1'), 'none')
  || '|' || coalesce((select t.tgenabled::text from pg_trigger t where t.tgname = 'trg_rule_compaction_integrity_guard_v1_truncate'), 'none');"; }
cc_waiting() { echo "select count(*) from pg_stat_activity where datname = current_database() and wait_event_type = 'Lock' and pid <> pg_backend_pid();"; }
cc_new() { run "$BIN/createdb -h $D -p $PORT -T $2 $1"; }
cc_rc() { cat "$1.rc" 2>/dev/null; }   # the caller does `wait <pid>` itself: a subshell cannot wait for its parent's background jobs
BARRIER_B_HOLDS="select exists (select 1 from pg_locks l join pg_stat_activity a on a.pid = l.pid where l.relation = 'public.nodes'::regclass and l.granted and l.mode = '%MODE%' and a.state = 'idle in transaction' and a.pid <> pg_backend_pid());"
CC_BEFORE_MD5=56b90b0ae0f9c5915b730314d13ca7a0
CC_AFTER_MD5=90b5917b1412be02f66d1f805241018c

cc_setup() {
  # fixture = the table DDL of the lifecycle test + the byte-exact live function and trigger
  { sed -n '/^create table public.nodes/,/^insert into public.work_log/p' "$STATIC_TEST"; cat "$FN_FIXTURE"; } > "$W/cc_fixture.sql"
  test "$(grep -c '^create ' "$W/cc_fixture.sql")" -ge 5 && grep -q '^insert into public.work_log' "$W/cc_fixture.sql" || { cc_fail "the fixture extract is incomplete"; return 1; }
  chmod a+r "$W/cc_fixture.sql"
  run "$BIN/createdb -h $D -p $PORT cc_before_tpl"; cc_psql cc_before_tpl "$W/cc_fixture.sql" >/dev/null || { cc_fail "fixture load failed"; return 1; }
  run "$BIN/createdb -h $D -p $PORT -T cc_before_tpl cc_applied_tpl"; cc_psql cc_applied_tpl "$CC_APPLY" >/dev/null || { cc_fail "the clean apply on the fixture failed"; return 1; }
  CC_S_BEFORE=$(cc_state cc_before_tpl); CC_S_AFTER=$(cc_state cc_applied_tpl)
  test "$CC_S_BEFORE" = "$CC_BEFORE_MD5|O|none" || { cc_fail "the BEFORE fixture is not the live state: $CC_S_BEFORE"; return 1; }
  test "$CC_S_AFTER" = "$CC_AFTER_MD5|O|O" || { cc_fail "the AFTER fixture is not the applied state: $CC_S_AFTER"; return 1; }; }
cc_holds_mode() { echo "select exists (select 1 from pg_locks l join pg_stat_activity a on a.pid = l.pid where l.relation = 'public.nodes'::regclass and l.granted and l.mode = '$1' and a.state = 'idle in transaction' and a.pid <> pg_backend_pid());"; }
CC_HOLDS_XID="select exists (select 1 from pg_stat_activity a where a.datname = current_database() and a.state = 'idle in transaction' and a.backend_xid is not null and a.pid <> pg_backend_pid());"
cc_expect() { # label db expected-state
  local got; got=$(cc_state "$2"); if [ "$got" != "$3" ]; then cc_fail "$1: final state is $got, expected $3"; return 1; fi; return 0; }
B_TAIL='\! until [ -e @FLAG@ ]; do sleep 0.05; done'
B_DISABLE="begin;
alter table public.nodes disable trigger trg_rule_compaction_integrity_guard_v1;
$B_TAIL
commit;"
B_LOCK="begin;
lock table public.nodes in share row exclusive mode;
$B_TAIL
commit;"
B_READ="begin;
select count(*) from public.nodes;
$B_TAIL
commit;"
B_WRITE="begin;
insert into public.nodes(type, label) values ('note', 'cc-writer-B');
$B_TAIL
rollback;"
B_FN="begin;
create or replace function public.fn_rule_compaction_integrity_guard_v1() returns trigger language plpgsql set search_path to 'public', 'pg_temp' as \$f\$ begin return new; end \$f\$;
$B_TAIL
commit;"

# cc_race <id> <db> <template> <file> <B-sql> <barrier-sql> <expect: refuse|run> <needle>
cc_race() {
  local id=$1 db=$2 tpl=$3 file=$4 bsql=$5 barrier=$6 expect=$7 needle=$8 flag="$W/go.$1"
  cc_new "$db" "$tpl"
  local bf; bf=$(cc_sql "$(printf '%s\n' "$bsql" | sed "s#@FLAG@#$flag#g")")
  cc_bg "$db" "$bf" "$W/b.$id"; local bpid=$CC_PID
  cc_until "$id: B holds its open change" "$db" "$barrier" 20 || { touch "$flag"; return 1; }
  cc_bg "$db" "$file" "$W/a.$id"; local apid=$CC_PID
  cc_until "$id: the file is waiting for a lock" "$db" "select ($(cc_waiting | tr -d ';')) >= 1;" 20 || { touch "$flag"; return 1; }
  CC_WAITQ=$(cc_val "$db" "select left(regexp_replace(query, '\s+', ' ', 'g'), 64) from pg_stat_activity where datname = current_database() and wait_event_type = 'Lock' and pid <> pg_backend_pid() limit 1;")
  touch "$flag"
  wait "$bpid" 2>/dev/null; wait "$apid" 2>/dev/null; local brc arc; brc=$(cc_rc "$W/b.$id"); arc=$(cc_rc "$W/a.$id")
  CC_AOUT=$(cat "$W/a.$id"); CC_AMS=$(cat "$W/a.$id.ms")
  test "$brc" = "0" || cc_fail "$id: session B did not finish cleanly (rc $brc)"
  if [ "$expect" = refuse ]; then
    test "$arc" != "0" || { cc_fail "$id: the file RAN although B's committed change made the state drift: it overwrote B's change"; return 1; }
    echo "$CC_AOUT" | grep -q "$needle" || { cc_fail "$id: expected the refusal '$needle', got: $(echo "$CC_AOUT" | tail -2)"; return 1; }
  else
    test "$arc" = "0" || { cc_fail "$id: the file did not run after waiting: $(echo "$CC_AOUT" | tail -2)"; return 1; }
  fi; return 0; }

# a timed second session: <id> <db> <sql> -> CC_PID, rc and elapsed ms in $W/<id>.rc/.ms
cc_session() { cc_bg "$2" "$(cc_sql "$3")" "$W/$1"; }
cc_done_within() { # id seconds -> 0 when <id>.rc exists within the time
  local i; for i in $(seq 1 $(( $2 * 20 ))); do [ -e "$W/$1.rc" ] && return 0; sleep 0.05; done; return 1; }

cc_cases() {
  local S
  # ---- A1 / R1: the race of CR-F1 ------------------------------------------------------------------------------------------------------------------
  if cc_race A1 cc_a1 cc_before_tpl "$CC_APPLY" "$B_DISABLE" "$(cc_holds_mode ShareRowExclusiveLock)" refuse "G1 rule guard drift"; then
    cc_expect A1 cc_a1 "$CC_BEFORE_MD5|D|none" && echo "PASS A1 apply vs a concurrent ALTER TABLE ... DISABLE TRIGGER (open when the apply starts, committed while it waits at: $CC_WAITQ): the apply refused on the drift; the trigger stays disabled, the body stays BEFORE, nothing else changed"
  fi
  if cc_race R1 cc_r1 cc_applied_tpl "$CC_ROLLBACK" "$B_DISABLE" "$(cc_holds_mode ShareRowExclusiveLock)" refuse "G1 rule guard rollback drift"; then
    cc_expect R1 cc_r1 "$CC_AFTER_MD5|D|O" && echo "PASS R1 rollback vs a concurrent ALTER TABLE ... DISABLE TRIGGER (waits at: $CC_WAITQ): the rollback refused on the drift; the trigger stays disabled, the applied body and the TRUNCATE trigger stay"
  fi
  # ---- A2 / R2: another session only holds the lock; the file waits, then runs cleanly -----------------------------------------------------------
  if cc_race A2 cc_a2 cc_before_tpl "$CC_APPLY" "$B_LOCK" "$(cc_holds_mode ShareRowExclusiveLock)" run ""; then
    cc_expect A2 cc_a2 "$CC_S_AFTER" && echo "PASS A2 clean apply after waiting for another session's SHARE ROW EXCLUSIVE lock (waited at: $CC_WAITQ; $CC_AMS ms): exactly the applied state"
  fi
  if cc_race R2 cc_r2 cc_applied_tpl "$CC_ROLLBACK" "$B_LOCK" "$(cc_holds_mode ShareRowExclusiveLock)" run ""; then
    cc_expect R2 cc_r2 "$CC_S_BEFORE" && echo "PASS R2 clean rollback after waiting for another session's SHARE ROW EXCLUSIVE lock ($CC_AMS ms): exactly the live 12.11.2026 state"
  fi
  # ---- A4 / R4: control (Codex): a concurrent CREATE OR REPLACE FUNCTION already made the file fail; keep it that way -----------------------------
  if cc_race A4 cc_a4 cc_before_tpl "$CC_APPLY" "$B_FN" "$CC_HOLDS_XID" refuse "tuple concurrently updated"; then
    S=$(cc_state cc_a4); case "$S" in "$CC_BEFORE_MD5|"*|"$CC_AFTER_MD5|"*|none*) cc_fail "A4: B's function body was lost: $S";; *"|O|none") echo "PASS A4 control: a concurrent CREATE OR REPLACE FUNCTION makes the apply fail ('tuple concurrently updated'); B's body is preserved, the triggers are untouched";; *) cc_fail "A4: unexpected final state $S";; esac
  fi
  if cc_race R4 cc_r4 cc_applied_tpl "$CC_ROLLBACK" "$B_FN" "$CC_HOLDS_XID" refuse "tuple concurrently updated"; then
    S=$(cc_state cc_r4); case "$S" in "$CC_BEFORE_MD5|"*|"$CC_AFTER_MD5|"*|none*) cc_fail "R4: B's function body was lost: $S";; *"|O|O") echo "PASS R4 control: a concurrent CREATE OR REPLACE FUNCTION makes the rollback fail ('tuple concurrently updated'); B's body is preserved, the triggers are untouched";; *) cc_fail "R4: unexpected final state $S";; esac
  fi
  # ---- A5: the apply is not blocked by an open READER and blocks no reader ---------------------------------------------------------------------------
  local flag="$W/go.A5" bf
  cc_new cc_a5 cc_before_tpl; bf=$(cc_sql "$(printf '%s\n' "$B_READ" | sed "s#@FLAG@#$flag#g")"); cc_bg cc_a5 "$bf" "$W/b.A5"; local bpid=$CC_PID
  if cc_until "A5: B holds an open read of public.nodes" cc_a5 "$(cc_holds_mode AccessShareLock)" 20; then
    cc_bg cc_a5 "$CC_APPLY" "$W/a.A5"; local apid=$CC_PID
    if cc_done_within a.A5 20; then
      wait "$apid" 2>/dev/null; local arc; arc=$(cc_rc "$W/a.A5"); test "$arc" = "0" || cc_fail "A5: the apply failed: $(tail -2 "$W/a.A5")"
      cc_expect A5 cc_a5 "$CC_S_AFTER" && echo "PASS A5 readers: the apply ran to the end ($(cat "$W/a.A5.ms") ms) while another session still held an open read of public.nodes; that reader finished cleanly afterwards"
    else cc_fail "A5: the apply waited for an open reader"; fi
  fi
  touch "$flag"; wait "$bpid" 2>/dev/null; test "$(cc_rc "$W/b.A5")" = "0" || cc_fail "A5: the open reader did not finish cleanly"
  # ---- A3: an open WRITER holds public.nodes longer than the lock timeout --------------------------------------------------------------------------
  flag="$W/go.A3"; cc_new cc_a3 cc_before_tpl; bf=$(cc_sql "$(printf '%s\n' "$B_WRITE" | sed "s#@FLAG@#$flag#g")"); cc_bg cc_a3 "$bf" "$W/b.A3"; bpid=$CC_PID
  if cc_until "A3: B holds an open write" cc_a3 "$(cc_holds_mode RowExclusiveLock)" 20; then
    cc_bg cc_a3 "$CC_APPLY" "$W/a.A3"; apid=$CC_PID
    if cc_until "A3: the apply waits" cc_a3 "select ($(cc_waiting | tr -d ';')) >= 1;" 20; then
      local wq; wq=$(cc_val cc_a3 "select left(regexp_replace(query, '\s+', ' ', 'g'), 64) from pg_stat_activity where datname = current_database() and wait_event_type = 'Lock' and pid <> pg_backend_pid() limit 1;")
      cc_session A3.reader cc_a3 "select count(*) from public.nodes;"; local rpid=$CC_PID
      cc_session A3.writer cc_a3 "insert into public.nodes(type, label) values ('note', 'cc-writer-D');"; local wpid=$CC_PID
      if cc_done_within A3.reader 5; then :; else cc_fail "A3: a plain reader was blocked by the waiting apply"; fi
      cc_until "A3: the second writer is queued behind the waiting apply" cc_a3 "select ($(cc_waiting | tr -d ';')) >= 2;" 20
      test ! -e "$W/A3.writer.rc" || cc_fail "A3: the second writer was not queued"
      wait "$apid" 2>/dev/null; local arc; arc=$(cc_rc "$W/a.A3"); local aout; aout=$(cat "$W/a.A3")
      test "$arc" != "0" || cc_fail "A3: the apply ran although a writer held the table"
      echo "$aout" | grep -qi "lock timeout" || cc_fail "A3: expected a lock timeout, got: $(echo "$aout" | tail -2)"
      cc_done_within A3.writer 10 || cc_fail "A3: the queued writer never finished"
      wait "$wpid" 2>/dev/null; test "$(cc_rc "$W/A3.writer")" = "0" || cc_fail "A3: the queued writer failed"
      wait "$rpid" 2>/dev/null || true
      cc_expect A3 cc_a3 "$CC_S_BEFORE" && echo "PASS A3 writers: the apply waited at [$wq] and failed on the lock timeout after $(cat "$W/a.A3.ms") ms; nothing changed; a plain reader was answered in $(cat "$W/A3.reader.ms") ms; a second writer queued behind the waiting request for $(cat "$W/A3.writer.ms") ms and then went through"
    fi
  fi
  touch "$flag"; wait "$bpid" 2>/dev/null; test "$(cc_rc "$W/b.A3")" = "0" || cc_fail "A3: the open writer did not finish cleanly"
  # ---- R3: an open READER holds public.nodes while the rollback needs ACCESS EXCLUSIVE for DROP TRIGGER -------------------------------------------
  flag="$W/go.R3"; cc_new cc_r3 cc_applied_tpl; bf=$(cc_sql "$(printf '%s\n' "$B_READ" | sed "s#@FLAG@#$flag#g")"); cc_bg cc_r3 "$bf" "$W/b.R3"; bpid=$CC_PID
  if cc_until "R3: B holds an open read" cc_r3 "$(cc_holds_mode AccessShareLock)" 20; then
    cc_bg cc_r3 "$CC_ROLLBACK" "$W/a.R3"; apid=$CC_PID
    if cc_until "R3: the rollback waits" cc_r3 "select ($(cc_waiting | tr -d ';')) >= 1;" 20; then
      local wq2; wq2=$(cc_val cc_r3 "select left(regexp_replace(query, '\s+', ' ', 'g'), 64) from pg_stat_activity where datname = current_database() and wait_event_type = 'Lock' and pid <> pg_backend_pid() limit 1;")
      cc_session R3.reader cc_r3 "select count(*) from public.nodes;"; local rpid2=$CC_PID
      cc_until "R3: a new reader is queued behind the waiting rollback" cc_r3 "select ($(cc_waiting | tr -d ';')) >= 2;" 20
      test ! -e "$W/R3.reader.rc" || cc_fail "R3: the new reader was not queued"
      wait "$apid" 2>/dev/null; local arc2; arc2=$(cc_rc "$W/a.R3"); local aout2; aout2=$(cat "$W/a.R3")
      test "$arc2" != "0" || cc_fail "R3: the rollback ran although a reader held the table"
      echo "$aout2" | grep -qi "lock timeout" || cc_fail "R3: expected a lock timeout, got: $(echo "$aout2" | tail -2)"
      cc_done_within R3.reader 10 || cc_fail "R3: the queued reader never finished"
      wait "$rpid2" 2>/dev/null || true
      cc_expect R3 cc_r3 "$CC_S_AFTER" && echo "PASS R3 readers: the rollback passed its early lock, then waited at [$wq2] for the ACCESS EXCLUSIVE lock of DROP TRIGGER and failed on the lock timeout after $(cat "$W/a.R3.ms") ms; EVERYTHING it had done (body, trigger) was rolled back; a new reader queued behind it for $(cat "$W/R3.reader.ms") ms and then went through"
    fi
  fi
  touch "$flag"; wait "$bpid" 2>/dev/null; test "$(cc_rc "$W/b.R3")" = "0" || cc_fail "R3: the open reader did not finish cleanly"
}
cc_setup && cc_cases > "$W/cc.txt"
cat "$W/cc.txt"
test "$(grep -c '^PASS [AR][0-9] ' "$W/cc.txt")" = "$EXPECTED_CONCURRENCY" || { echo "FAIL: expected $EXPECTED_CONCURRENCY PASS lines from the concurrency cases" >&2; CC_BAD=1; }
set -e
if [ "$CC_BAD" != 0 ]; then echo "FAIL: a concurrency case did not behave as expected" >&2; exit 1; fi
echo "G1 rule guard concurrency: all $EXPECTED_CONCURRENCY cases behaved as expected"
