#!/usr/bin/env bash
# G1 rule guard (CL-16) lifecycle test (tests/sql/g1_rule_guard_cl16_v1.sql) on a throwaway PostgreSQL - never a live project.
# 25 cases: each run of the proposal or of its rollback has an expected outcome (missing function, drifted body or trigger, MISSING
# trigger, DISABLED trigger, missing or disabled TRUNCATE trigger -> refusal for that reason; exact state -> runs; repeat -> no-op).
# Same pattern as run-m0b-ai-quota-sql-test.sh. Also checks statically that no SQL file of the M0 apply plan touches public.nodes or the
# rule guard, so the simulated post-M0 state of these objects is the live 12.11.2026 state.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
node -e '
const fs = require("fs"); const p = require(process.argv[1]);
const files = [...new Set(p.steps.flatMap((s) => [s.file, s.rollback]).filter((f) => f && f.endsWith(".sql")))];
const hits = files.filter((f) => /\bnodes\b|fn_rule_compaction|trg_rule_compaction/i.test(fs.readFileSync(f, "utf8")));
if (!files.length || hits.length) { console.error("FAIL: M0 files touching the rule guard objects: " + hits.join(", ")); process.exit(1); }
console.log("M0 apply plan: " + files.length + " SQL files, none touches public.nodes or the rule guard");
' "$ROOT/docs/reviews/m0-security-stabilization-20261112/apply-plan.json"
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
