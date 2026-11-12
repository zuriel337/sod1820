#!/usr/bin/env bash
# EVIDENCE + SELF-CHECK: runs the REAL G1 smoke (scripts/test-g1-agent-routing-smoke.mjs) in CI mode against a REAL base, once per
# scenario, in a temporary detached worktree (local commits only, never pushed; removed at the end). Every scenario has an expected
# outcome; a FAIL must fail for the expected reason. ANY unexpected result makes this script exit 1.
# Usage: bash docs/reviews/m0-security-stabilization-20261112/enforcement-proof/run-ci-scenarios.sh [base-ref, default HEAD]
set -u
P=$(cd "$(dirname "$0")" && pwd); ROOT=$(git -C "$P" rev-parse --show-toplevel); BASE=$(git -C "$ROOT" rev-parse "${1:-HEAD}")
WT=$(mktemp -d)/wt; git -C "$ROOT" worktree add -q --detach "$WT" "$BASE"
trap 'git -C "$ROOT" worktree remove --force "$WT" >/dev/null 2>&1' EXIT
MISMATCH=0
reset() { git -C "$WT" reset -q --hard "$BASE" && git -C "$WT" clean -qfd; }
commit() { git -C "$WT" add -A && git -C "$WT" -c user.email=proof@local -c user.name=proof commit -q -m "$1"; }
py() { python3 - "$WT" "$@"; }
# expect <id> <PASS|FAIL> <regex for the FAIL reason> <description>
expect() {
  local id="$1" want="$2" why="$3" desc="$4" out rc got
  out=$(cd "$WT" && G1_BASE_SHA="$BASE" GITHUB_ACTIONS=true node --test scripts/test-g1-agent-routing-smoke.mjs 2>&1); rc=$?
  got=PASS; [ $rc -ne 0 ] && got=FAIL
  if [ "$got" != "$want" ]; then echo "MISMATCH $id: expected $want, got $got — $desc"; MISMATCH=1
  elif [ "$want" = FAIL ] && ! grep -Eq "$why" <<<"$out"; then echo "MISMATCH $id: failed, but not for the expected reason /$why/ — $desc"; MISMATCH=1
  else echo "ok $id $got — $desc"; fi
}
OI='| traffic / analytics measurement truth | `traffic_intelligence_law` **v11 ACTIVE** |'
add_oi() { py "$OI" "$1" <<'PY'
import sys; p=sys.argv[1]+'/SOD1820_MASTER_OWNER_INDEX.md'; s=open(p).read(); assert sys.argv[2] in s; open(p,'w').write(s.replace(sys.argv[2], sys.argv[2]+'\n'+sys.argv[3]))
PY
}
edit_v2() { py "$1" <<'PY'
import sys; p=sys.argv[1]+'/SOD1820_DESIGN_CONTRACT_V2.md'; s=open(p).read(); lines=s.split('\n')
i=next(k for k,l in enumerate(lines) if len(l)>60 and not l.startswith(('#','|','>')))
lines[i]=lines[i]+' (changed)'
if sys.argv[2]=='record': lines.insert(i+1,'\n> CHANGE-RECORD: 12.11.2026 v2.1 addendum (approved decision).\n')
open(p,'w').write('\n'.join(lines))
if sys.argv[2]=='index':
    q=sys.argv[1]+'/SOD1820_MASTER_OWNER_INDEX.md'; t=open(q).read()
    a='| visual language / typography / public naming | `SOD1820_DESIGN_CONTRACT_V2.md` — **2029 ACTIVE**; V1 = preserved Legacy provenance |'
    assert a in t; open(q,'w').write(t.replace(a, a.replace('**2029 ACTIVE**','**2029 ACTIVE** (v2.1, 12.11.2026)')))
PY
}
snap_next() { py "$1" <<'PY'
import sys; d=sys.argv[1]+'/audits/g1-agent-entry/'; s=open(d+'G1_LAWS_ACTIVE_SNAPSHOT_20261112.txt').read().split('\n'); mode=sys.argv[2]
if mode=='activate':
    s=[l for l in s if not l.startswith('R|ai_quota_law|')]; s.append('L|ai_quota_law|4|platform_tiers_law|ai|0123456789aa')
elif mode=='owner': s=[('L|platform_tiers_law|5|reality_graph_law|'+'|'.join(l.split('|')[4:]) if l.startswith('L|platform_tiers_law|') else l) for l in s]
elif mode=='body': s=[('|'.join(l.split('|')[:5])+'|eeeeeeeeeeee' if l.startswith('L|number_page_law|') else l) for l in s]
open(d+'G1_LAWS_ACTIVE_SNAPSHOT_20261113.txt','w').write('\n'.join(s))
PY
}
reset; expect S0 PASS '' "no change"
reset; printf '# Search indexing contract v1\n\nRules.\n' > "$WT/docs/search-indexing-contract-v1.md"; commit s1; expect S1 FAIL 'neither routed' "new contract file without routing"
reset; printf '# Search indexing contract v1\n\nOWNER-ROUTING: EXTEND_EXISTING experience_governance_foundation_v1_law\n' > "$WT/docs/search-indexing-contract-v1.md"; commit s2; expect S2 PASS '' "new file declared EXTEND_EXISTING of an active owner"
reset; printf '# Search indexing contract v1\n\nOWNER-ROUTING: EXTEND_EXISTING ai_quota_law\n' > "$WT/docs/search-indexing-contract-v1.md"; commit s3; expect S3 FAIL 'not an active or routed owner' "new file extends a retired owner"
reset; add_oi '| paid AI daily quota | `ai_quota_law` |'; commit s4; expect S4 FAIL 'ai_quota_law, which is a retired law' "Owner Index row routes to a retired owner"
reset; add_oi '| some duty | `never_existed_law` |'; commit s4b; expect S4b FAIL 'never_existed_law, which is not an active law' "Owner Index row routes to an owner that does not exist"
reset; add_oi '| SEO / sitemap / indexing routing | `experience_governance_foundation_v1_law` **v10 ACTIVE** (EXTEND_EXISTING) |'; commit s5; expect S5 PASS '' "Owner Index row extends an active owner"
reset; edit_v2 silent; commit s6; expect S6 FAIL 'changed without a dated Human Gate' "silent change to a registered contract"
reset; edit_v2 record; commit s7; expect S7 PASS '' "registered contract change with a dated CHANGE-RECORD"
reset; edit_v2 index; commit s8; expect S8 PASS '' "registered contract change with its Owner Index line"
reset; printf 'L|x|1|y|z|0\n' >> "$WT/audits/g1-agent-entry/G1_LAWS_ACTIVE_SNAPSHOT_20261112.txt"; commit s9; expect S9 FAIL 'dated record edited in place' "dated laws snapshot edited in place"
reset; printf 'docs/new-gaming-contract.md\n' >> "$WT/audits/g1-agent-entry/G1_CONTRACT_FILES_BASELINE_20261112.txt"; printf '# x\n' > "$WT/docs/new-gaming-contract.md"; commit s10; expect S10 FAIL 'added to the frozen baseline|edited in place' "a new file hidden by adding it to the frozen baseline"
reset; snap_next activate; commit s11; expect S11 FAIL 'activated again without a recorded approval' "new snapshot activates a retired law without approval"
reset; snap_next activate; printf 'A|ai_quota_law|work_log:a3d65374-a73a-4131-a00f-d3a050851064|2026-11-13\n' >> "$WT/audits/g1-agent-entry/G1_LAW_APPROVALS.txt"; commit s12; expect S12 PASS '' "same, with a well-formed approval (authenticity stays a human gate)"
reset; snap_next activate; printf 'A|ai_quota_law|ZURIEL said yes|2026-11-13\n' >> "$WT/audits/g1-agent-entry/G1_LAW_APPROVALS.txt"; commit s12b; expect S12b FAIL 'not work_log:<uuid>' "same, with an invented approval text"
reset; snap_next owner; commit s13; expect S13 FAIL 'owner changed in place at v5' "new snapshot changes an owner at the same version"
reset; snap_next body; commit s14; expect S14 FAIL 'text changed in place at v1' "new snapshot edits a body without a new version"
reset; py <<'PY'
import sys,json; p=sys.argv[1]+'/docs/reviews/m0-security-stabilization-20261112/apply-plan.json'; d=json.load(open(p))
d['steps'].append({'step':'99','file':'supabase/proposed/29991231000000_proof_new_store.sql','rollback':None}); open(p,'w').write(json.dumps(d,indent=1))
open(sys.argv[1]+'/supabase/proposed/29991231000000_proof_new_store.sql','w').write('create unlogged table public.proof_new_store (id int);\n')
PY
commit s15; expect S15 FAIL 'proof_new_store has no "-- OWNER-CHECK:"' "apply package gains a new store without OWNER-CHECK"
[ $MISMATCH -eq 0 ] && echo "RESULT: every scenario behaved as expected" || echo "RESULT: UNEXPECTED OUTCOME(S) — see MISMATCH lines"
exit $MISMATCH
