#!/usr/bin/env bash
# CL-13 personal-memory pause: the DATABASE half of the acceptance tests (tests/sql/cl13_personal_memory_pause_v1.sql) on a throwaway
# PostgreSQL - never a live project. The proposal and its rollback run against byte-identical copies of the five live functions.
# Two kinds of checks, both counted (a check that did not run fails):
#   "@@CASE <id> OK | REFUSE <needle>"  one run of the proposal or of its rollback: OK must run without an ERROR, REFUSE must stop
#                                        with an ERROR that contains the needle (a refusal for another reason fails);
#   behaviour checks                     pg_temp.ok / pg_temp.refused inside the SQL file; their number is pinned below.
# CL13_FLIP=<case id> inverts one lifecycle expectation: the self-check of this runner, which must then exit 1.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
EXPECTED_CASES=15
EXPECTED_CHECKS=85
# The apply plan names the two files by sha256: a plan whose checksums are not the files is a stale request and fails here.
node -e '
const fs = require("fs"); const crypto = require("crypto"); const root = process.argv[1]; const plan = require(root + "/docs/reviews/cl13-personal-memory-20261112/apply-plan.json");
const sha = (f) => crypto.createHash("sha256").update(fs.readFileSync(root + "/" + f)).digest("hex"); let bad = 0;
for (const s of plan.steps) for (const [f, want] of [[s.file, s.sha256], [s.rollback, s.rollback_sha256]]) if (f && sha(f) !== want) { console.error("FAIL: apply-plan sha256 of " + f + " is stale"); bad = 1; }
if (bad) process.exit(1); console.log("CL-13 apply plan: sha256 of the proposal and of its rollback match the files");
' "$ROOT"
W=$(mktemp -d)
FILES=(tests/sql/cl13_personal_memory_pause_v1.sql supabase/proposed/20261112230000_cl13_personal_memory_pause.sql
  supabase/proposed/ROLLBACK_20261112230000_cl13_personal_memory_pause.sql)
for f in "${FILES[@]}"; do mkdir -p "$W/$(dirname "$f")"; cp "$ROOT/$f" "$W/$f"; done
mkdir -p "$W/tests/sql/fixtures"; cp -r "$ROOT/tests/sql/fixtures/cl13_memory_live_base_20261112" "$W/tests/sql/fixtures/"
chmod -R a+rX "$W"
check() { cat > "$W/out.txt"; grep -q 'cl13_personal_memory_pause_v1: PASS' "$W/out.txt" || { { grep -E 'ERROR|CHECK FAILED' "$W/out.txt" | grep -v 'current transaction is aborted' | tail -12; } || true; echo "FAIL: the CL-13 database test did not PASS" >&2; exit 1; }
  node -e '
const lines = require("fs").readFileSync(process.argv[1], "utf8").split("\n"); const wantCases = Number(process.argv[2]); const wantChecks = Number(process.argv[3]); const flip = process.argv[4] || "";
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
  const ok = expect === "OK" ? !err : (err && c.needle.length > 0 && text.includes(c.needle));
  console.log((ok ? "ok " : "MISMATCH ") + c.id + " " + (err ? "REFUSED" : "RAN") + (c.want === "REFUSE" ? " [" + c.needle.slice(0, 90) + "]" : ""));
  if (!ok) bad = 1;
}
if (cases.length !== wantCases) { console.log("MISMATCH: " + cases.length + " lifecycle cases ran, " + wantCases + " expected"); bad = 1; }
const n = (/cl13_personal_memory_pause_v1: (\d+) behaviour checks passed/.exec(lines.join("\n")) || [])[1];
if (Number(n) !== wantChecks) { console.log("MISMATCH: " + n + " behaviour checks ran, " + wantChecks + " expected"); bad = 1; }
console.log(bad ? "RESULT: UNEXPECTED OUTCOME(S)" : "RESULT: " + cases.length + " lifecycle cases and " + n + " behaviour checks behaved as expected");
process.exit(bad);' "$W/out.txt" "$EXPECTED_CASES" "$EXPECTED_CHECKS" "${CL13_FLIP:-}" || { echo "FAIL: a CL-13 check did not behave as expected" >&2; exit 1; }; }

if [ -z "${G1_PG_BIN:-}" ] && ! compgen -G '/usr/lib/postgresql/*/bin' >/dev/null; then
  CONTAINER="sod-cl13-memory-$$"
  docker run --rm -d --network none --name "$CONTAINER" -e POSTGRES_HOST_AUTH_METHOD=trust -v "$W:/w:ro" -w /w postgres:17-alpine >/dev/null
  trap 'docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; rm -rf "$W"' EXIT
  for i in $(seq 1 30); do
    if docker exec "$CONTAINER" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then break; fi
    sleep 1
  done
  docker exec -w /w "$CONTAINER" psql -X -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 -q -f tests/sql/cl13_personal_memory_pause_v1.sql 2>&1 | check
  exit
fi

BIN=${G1_PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin | tail -1)}; echo "PostgreSQL: $("$BIN/postgres" --version)"
D=$(mktemp -d)
run() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
if [ "$(id -u)" = 0 ]; then chown postgres "$D"; fi
run "$BIN/initdb -D $D/data -A trust >/dev/null"
run "$BIN/pg_ctl -D $D/data -o '-p 55445 -k $D -c listen_addresses=' -l $D/log -w start >/dev/null"
trap 'run "$BIN/pg_ctl -D '"$D"'/data -m immediate stop >/dev/null" || true; rm -rf "$D" "$W"' EXIT
run "$BIN/createdb -h $D -p 55445 t"
run "cd $W && $BIN/psql -X -h $D -p 55445 -d t -v ON_ERROR_STOP=1 -q -f tests/sql/cl13_personal_memory_pause_v1.sql" 2>&1 | check
