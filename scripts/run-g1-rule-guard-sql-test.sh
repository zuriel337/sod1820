#!/usr/bin/env bash
# G1 rule guard (CL-16) lifecycle test (tests/sql/g1_rule_guard_cl16_v1.sql) on a throwaway PostgreSQL - never a live project.
# 25 cases: each run of the proposal or of its rollback has an expected outcome (missing function, drifted body or trigger, MISSING
# trigger, DISABLED trigger, missing or disabled TRUNCATE trigger -> refusal for that reason; exact state -> runs; repeat -> no-op).
# Same pattern as run-m0b-ai-quota-sql-test.sh. Also checks statically that no OTHER SQL file of the repository that can be applied to
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
