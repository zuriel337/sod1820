#!/usr/bin/env bash
# EVIDENCE ONLY (not wired into CI): runs the proposed G1-smoke extension (owner-gate-proto.mjs) against nine scenarios in a
# temporary detached worktree. Commits are made only inside that worktree and are never pushed; the worktree is removed at the end.
# Usage: bash docs/reviews/m0-security-stabilization-20261112/enforcement-proof/run-ci-scenarios.sh [base-ref, default HEAD]
set -u
P=$(cd "$(dirname "$0")" && pwd); ROOT=$(git -C "$P" rev-parse --show-toplevel); BASE=$(git -C "$ROOT" rev-parse "${1:-HEAD}")
WT=$(mktemp -d)/wt; git -C "$ROOT" worktree add -q --detach "$WT" "$BASE"
trap 'git -C "$ROOT" worktree remove --force "$WT" >/dev/null 2>&1' EXIT
reset() { git -C "$WT" reset -q --hard "$BASE" && git -C "$WT" clean -qfd; }
commit() { git -C "$WT" add -A && git -C "$WT" -c user.email=proof@local -c user.name=proof commit -q -m "$1"; }
run() { echo "== $1"; node "$P/owner-gate-proto.mjs" "$WT" "$P/rules-snapshot-20261112.json" "$BASE" "$P/baseline.json" | tail -2; echo "exit=${PIPESTATUS[0]}"; }
edit_oi() { python3 - "$WT" "$1" <<'PY'
import sys; p=sys.argv[1]+'/SOD1820_MASTER_OWNER_INDEX.md'; s=open(p).read()
a='| traffic / analytics measurement truth | `traffic_intelligence_law` **v11 ACTIVE** |'
assert a in s; s=s.replace(a, a+'\n'+sys.argv[2]); open(p,'w').write(s)
PY
}
edit_v2() { python3 - "$WT" "$1" <<'PY'
import sys; p=sys.argv[1]+'/SOD1820_DESIGN_CONTRACT_V2.md'; s=open(p).read(); lines=s.split('\n')
i=next(k for k,l in enumerate(lines) if len(l)>60 and not l.startswith(('#','|','>')))
lines[i]=lines[i]+' (changed)'
if sys.argv[2]=='record': lines.insert(i+1,'\n> **עדכון 12.11.2026 (v2.1, addendum):** the sentence above was changed by an approved decision.\n')
open(p,'w').write('\n'.join(lines))
if sys.argv[2]=='index':
    q=sys.argv[1]+'/SOD1820_MASTER_OWNER_INDEX.md'; t=open(q).read()
    a='| visual language / typography / public naming | `SOD1820_DESIGN_CONTRACT_V2.md` — **2029 ACTIVE**; V1 = preserved Legacy provenance |'
    assert a in t; open(q,'w').write(t.replace(a, a.replace('**2029 ACTIVE**','**2029 ACTIVE** (v2.1, 12.11.2026)')))
PY
}
reset; run "S0 no change (baseline)"
reset; printf '# Search indexing contract v1\n\nRules for indexing.\n' > "$WT/docs/search-indexing-contract-v1.md"; commit s1; run "S1 FORBIDDEN new contract file, no routing"
reset; printf '# Search indexing contract v1\n\nOWNER-ROUTING: EXTEND_EXISTING experience_governance_foundation_v1_law\n' > "$WT/docs/search-indexing-contract-v1.md"; commit s2; run "S2 VALID new file declared EXTEND_EXISTING of an active owner"
reset; printf '# Search indexing contract v1\n\nOWNER-ROUTING: EXTEND_EXISTING research_engine_law\n' > "$WT/docs/search-indexing-contract-v1.md"; commit s3; run "S3 FORBIDDEN new file extends a RETIRED owner"
reset; edit_oi '| paid AI daily quota | `ai_quota_law` |'; commit s4; run "S4 FORBIDDEN Owner Index row routes to a RETIRED owner"
reset; edit_oi '| SEO / sitemap / indexing routing | `experience_governance_foundation_v1_law` **v10 ACTIVE** (EXTEND_EXISTING) |'; commit s5; run "S5 VALID Owner Index row extends an ACTIVE owner"
reset; edit_v2 silent; commit s6; run "S6 FORBIDDEN silent change to a registered contract"
reset; edit_v2 record; commit s7; run "S7 VALID change to a registered contract with a dated change record"
reset; edit_v2 index; commit s8; run "S8 VALID change to a registered contract together with its Owner Index row"
