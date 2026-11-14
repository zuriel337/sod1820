#!/usr/bin/env bash
# EVIDENCE + SELF-CHECK: runs the REAL G1 smoke (scripts/test-g1-agent-routing-smoke.mjs) in CI mode against a REAL base, once per
# scenario, in a temporary detached worktree (local commits only, never pushed; removed at the end). Every scenario has an expected
# outcome; a FAIL must fail for the expected reason. ANY unexpected result makes this script exit 1.
# The number of scenarios is fixed (EXPECTED_SCENARIOS), so a scenario that silently did not run fails the script too.
# Moved 13.11.2026 from the M0 directory of PR #1321 into docs/reviews/contracts-enforcement-20261113/; scenario S15 now extends the apply plan of the CL-16 step
# (docs/reviews/g1-rule-guard-cl16-20261112/apply-plan.json), the one apply plan of this package. Runs in CI (live-contracts-2029.yml) whenever the G1 enforcement code or this script changes, on the exact head of the change.
# The snapshot scenarios are built from the dated 12.11.2026 records and write a 20261113 successor: when a newer dated laws snapshot
# lands, update the scenarios in the same change (they then fail for "must be dated after", loudly, not silently).
# The working tree must be COMMITTED: the scenarios start from the base commit, not from uncommitted edits.
# Usage: bash docs/reviews/contracts-enforcement-20261113/enforcement-proof/run-ci-scenarios.sh [base-ref, default HEAD]
set -u
P=$(cd "$(dirname "$0")" && pwd); ROOT=$(git -C "$P" rev-parse --show-toplevel); BASE=$(git -C "$ROOT" rev-parse "${1:-HEAD}")
WT=$(mktemp -d)/wt; git -C "$ROOT" worktree add -q --detach "$WT" "$BASE"
trap 'git -C "$ROOT" worktree remove --force "$WT" >/dev/null 2>&1' EXIT
MISMATCH=0; COUNT=0; EXPECTED_SCENARIOS=53
reset() { git -C "$WT" reset -q --hard "$BASE" && git -C "$WT" clean -qfd; }
commit() { git -C "$WT" add -A && git -C "$WT" -c user.email=proof@local -c user.name=proof commit -q -m "$1"; }
py() { python3 - "$WT" "$@"; }
# expect <id> <PASS|FAIL> <regex for the FAIL reason> <description>
expect() {
  local id="$1" want="$2" why="$3" desc="$4" out rc got
  COUNT=$((COUNT+1))
  out=$(cd "$WT" && G1_BASE_SHA="$BASE" GITHUB_ACTIONS=true node --test scripts/test-g1-agent-routing-smoke.mjs 2>&1); rc=$?
  got=PASS; [ $rc -ne 0 ] && got=FAIL
  if [ "$got" != "$want" ]; then echo "MISMATCH $id: expected $want, got $got — $desc"; MISMATCH=1
  elif [ "$want" = FAIL ] && ! grep -Eq "$why" <<<"$out"; then echo "MISMATCH $id: failed, but not for the expected reason /$why/ — $desc"; MISMATCH=1
  else echo "ok $id $got — $desc"; fi
}
# add_oi appends one row to the first table of the Owner Index (after its first data row; no fixed line text is assumed)
add_oi() { py "$1" <<'PY'
import sys,re; p=sys.argv[1]+'/SOD1820_MASTER_OWNER_INDEX.md'; L=open(p).read().split('\n')
i=next(k for k,l in enumerate(L) if re.match(r'^\s*\|[\s:|-]+\|?\s*$', l) and k+1 < len(L) and L[k+1].lstrip().startswith('|'))
L.insert(i+2, sys.argv[2]); open(p,'w').write('\n'.join(L))
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
    rows=[l for l in t.split('\n') if l.lstrip().startswith('|') and '`SOD1820_DESIGN_CONTRACT_V2.md`' in l and '2029 ACTIVE' in l]
    assert len(rows)==1, rows; a=rows[0]; open(q,'w').write(t.replace(a, a.replace('**2029 ACTIVE**','**2029 ACTIVE** (v2.1, 12.11.2026)')))
PY
}
snap_next() { py "$1" "${2:-20261113}" <<'PY'
import sys; d=sys.argv[1]+'/audits/g1-agent-entry/'; s=open(d+'G1_LAWS_ACTIVE_SNAPSHOT_20261112.txt').read().split('\n'); mode=sys.argv[2]
if mode=='activate':
    s=[l for l in s if not l.startswith('R|ai_quota_law|')]; s.append('L|ai_quota_law|4|platform_tiers_law|ai|0123456789aa')
elif mode=='owner': s=[('L|platform_tiers_law|5|reality_graph_law|'+'|'.join(l.split('|')[4:]) if l.startswith('L|platform_tiers_law|') else l) for l in s]
elif mode=='body': s=[('|'.join(l.split('|')[:5])+'|eeeeeeeeeeee' if l.startswith('L|number_page_law|') else l) for l in s]
elif mode in ('bump-bad-owner','bump-codex-owner','bump-ok','doc-unregistered','doc-new'):
    owner={'bump-bad-owner':'never_existed_law','bump-codex-owner':'project_codex.invented_item','bump-ok':'platform_tiers_law',
           'doc-unregistered':'AGENTS.md','doc-new':'SOD1820_DESIGN_CONTRACT_V2.md'}[mode]
    s=[('L|platform_tiers_law|6|'+owner+'|'+l.split('|')[4]+'|abcdefabcdef' if l.startswith('L|platform_tiers_law|') else l) for l in s]
elif mode in ('cycle','deep-ok','deep-broken'):
    # round 3: the first child of a self-owned root, that root, and another self-owned root (read from the real 12.11 record)
    L=[l.split('|') for l in s if l.startswith('L|')]; own={f[1]:f[3] for f in L}
    child=next(f[1] for f in L if f[3]!=f[1] and own.get(f[3])==f[3]); root=own[child]
    other=next(f[1] for f in L if f[3]==f[1] and f[1]!=root)
    def bump(line, owner):
        f=line.split('|'); return '|'.join([f[0],f[1],str(int(f[2])+1),owner,f[4],'abcdefabcdef'])
    if mode=='cycle': s=[(bump(l,child) if l.startswith('L|'+root+'|') else l) for l in s]            # the root moves under its own child
    else:
        s=[(bump(l,child) if l.startswith('L|'+other+'|') else l) for l in s]                         # other -> child -> root
        if mode=='deep-broken':                                                                        # ... and the child now hangs under a retired law
            s=[(bump(l,'ai_quota_law') if l.startswith('L|'+child+'|') else l) for l in s]
elif mode in ('succ-silent','succ-routed'):
    src='retired_routing_v1:work_log:a3d65374-a73a-4131-a00f-d3a050851064' if mode=='succ-routed' else ''
    assert any(l=='R|agent_onboarding_law|1|-|' for l in s)
    s=[('R|agent_onboarding_law|1|inter_agent_coordination_law|'+src if l=='R|agent_onboarding_law|1|-|' else l) for l in s]
open(d+'G1_LAWS_ACTIVE_SNAPSHOT_'+sys.argv[3]+'.txt','w').write('\n'.join(s))
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
import sys,json; p=sys.argv[1]+'/docs/reviews/g1-rule-guard-cl16-20261112/apply-plan.json'; d=json.load(open(p))
d['steps'].append({'step':'99','file':'supabase/proposed/29991231000000_proof_new_store.sql','rollback':None}); open(p,'w').write(json.dumps(d,indent=1))
open(sys.argv[1]+'/supabase/proposed/29991231000000_proof_new_store.sql','w').write('create unlogged table public.proof_new_store (id int);\n')
PY
commit s15; expect S15 FAIL 'proof_new_store has no "-- OWNER-CHECK:"' "apply package gains a new store without OWNER-CHECK"
# ── Round 2 (Codex on c45dd3740): the same real G1 run, on a real base and head, for each new case and its allowed counterpart ──
codex_next() { py "$1" <<'PY'
import sys; d=sys.argv[1]+'/audits/g1-agent-entry/'; s=open(d+'G1_PROJECT_CODEX_SLUGS_20261112.txt').read().rstrip('\n')
open(d+'G1_PROJECT_CODEX_SLUGS_20261113.txt','w').write(s+'\nC|39|'+sys.argv[2]+'\n')
PY
}
new_doc() { printf '# Indexing duty contract\n\n%s\n' "$1" > "$WT/docs/indexing-duty-contract-v1.md"; }
APPR='work_log:a3d65374-a73a-4131-a00f-d3a050851064'
reset; snap_next bump-bad-owner; commit r1; expect R1 FAIL 'platform_tiers_law: owner never_existed_law does not resolve' "newer snapshot: version bump that points to an owner that does not exist"
reset; snap_next bump-ok; commit r1b; expect R1b PASS '' "newer snapshot: a proper version bump"
reset; snap_next bump-codex-owner; commit r2; expect R2 FAIL 'owner project_codex.invented_item does not resolve' "newer snapshot: owner is a project_codex item that does not exist"
reset; add_oi '| some duty | `project_codex.invented_item` |'; commit r3; expect R3 FAIL 'project_codex.invented_item, which is not a proven codex item' "Owner Index row routes to a codex item that does not exist"
reset; codex_next brand_new_codex_item; commit r3b; expect R3b FAIL 'project_codex.brand_new_codex_item: new codex item without a recorded approval' "newer codex record adds an item without approval"
reset; codex_next brand_new_codex_item; printf 'C|brand_new_codex_item|%s|2026-11-13\n' "$APPR" >> "$WT/audits/g1-agent-entry/G1_LAW_APPROVALS.txt"; commit r3c; expect R3c PASS '' "same, with a well-formed approval line (authenticity: human gate)"
# B5 (13.11.2026, preserved commit 514fc58d9): a NEW master-type project_codex slug is refused; an ordinary C approval does not admit it; only its own CM line does
reset; codex_next sod1820_master_v4; printf 'C|sod1820_master_v4|%s|2026-11-13\n' "$APPR" >> "$WT/audits/g1-agent-entry/G1_LAW_APPROVALS.txt"; commit r3d; expect R3d FAIL 'project_codex.sod1820_master_v4: new master-type codex item is refused' "newer codex record adds a master-type item with an ordinary C approval"
reset; codex_next sod1820_master_v4; printf 'CM|sod1820_master_v4|%s|2026-11-13\n' "$APPR" >> "$WT/audits/g1-agent-entry/G1_LAW_APPROVALS.txt"; commit r3e; expect R3e PASS '' "same, with its own CM approval line (the owner-first decision stays a human gate)"
reset; new_doc 'OWNER-ROUTING: GENUINELY_NEW_DOMAIN'; commit r4; expect R4 FAIL 'GENUINELY_NEW_DOMAIN is a declaration, not an approval' "new contract declares a new domain without an approval"
reset; new_doc "OWNER-ROUTING: GENUINELY_NEW_DOMAIN APPROVAL:$APPR"; commit r4b; expect R4b PASS '' "same, with APPROVAL:work_log:<uuid> (authenticity: human gate)"
reset; new_doc 'Rules.'; add_oi '| indexing duty | `docs/indexing-duty-contract-v1.md` |'; commit r5; expect R5 FAIL 'self-routing' "new contract adds its own Owner Index line"
reset; new_doc 'OWNER-ROUTING: EXTEND_EXISTING experience_governance_foundation_v1_law'; add_oi '| indexing duty | `docs/indexing-duty-contract-v1.md` (EXTEND_EXISTING `experience_governance_foundation_v1_law`) |'; commit r5b; expect R5b PASS '' "same, declared as an extension of an active owner"
reset; add_oi '| Legacy WordPress compatibility adapter | `ai_quota_law` |'; commit r6; expect R6 FAIL 'ai_quota_law, which is a retired law' "a Legacy-labelled Owner Index row routes to a retired owner"
reset; add_oi '| paid AI quota (history) | `ai_quota_law` — RETIRED, successor `platform_tiers_law` |'; commit r6b; expect R6b PASS '' "explicit RETIRED status in the owner cell"
reset; printf "SELECT '--'; CREATE TABLE public.g1_probe (id int);\n" > "$WT/supabase/migrations/29991231000001_g1_probe.sql"; commit r7; expect R7 FAIL 'new table public.g1_probe has no "-- OWNER-CHECK:"' "a table hidden after a '--' inside a string"
reset; printf -- "-- OWNER-CHECK: EXTEND_EXISTING traffic_intelligence_law OPERATIONAL_RUNTIME\ncreate table public.g1_store (id int);\n" > "$WT/supabase/migrations/29991231000002_g1_store.sql"; commit r8; expect R8 FAIL 'permission to create a new store is separate' "new store under an existing owner without a store permission"
reset; printf -- "-- OWNER-CHECK: EXTEND_EXISTING traffic_intelligence_law OPERATIONAL_RUNTIME APPROVAL:%s\ncreate table public.g1_store (id int);\n" "$APPR" > "$WT/supabase/migrations/29991231000002_g1_store.sql"; commit r8b; expect R8b PASS '' "same, with owner, classification and store permission"
reset; snap_next bump-ok 20261101; commit r9; expect R9 FAIL 'must be dated after G1_LAWS_ACTIVE_SNAPSHOT_20261112' "a back-dated snapshot is added"
# ── Round 3 (new main-audit session on b0f471dcd): registered document owners, the owner chain, SELECT ... INTO, successor sources ──
reset; snap_next doc-unregistered; commit r10; expect R10 FAIL 'platform_tiers_law: owner document AGENTS.md exists but is not registered as an owner in the Owner Index' "newer snapshot: owner is an existing file that is not a registered owner"
reset; snap_next doc-new; commit r10b; expect R10b FAIL 'SOD1820_DESIGN_CONTRACT_V2.md: new document owner without a recorded approval' "newer snapshot: a registered document becomes an owner for the first time, no approval"
reset; snap_next doc-new; printf 'D|SOD1820_DESIGN_CONTRACT_V2.md|%s|2026-11-13\n' "$APPR" >> "$WT/audits/g1-agent-entry/G1_LAW_APPROVALS.txt"; commit r10c; expect R10c PASS '' "same, with a well-formed approval line (authenticity: human gate)"
reset; snap_next cycle; commit r11; expect R11 FAIL 'ownership chain is a cycle' "newer snapshot: a root moves under its own child (every link is an active law)"
reset; snap_next deep-ok; commit r11b; expect R11b PASS '' "newer snapshot: a chain of depth 2 that ends at a self-owned root"
reset; snap_next deep-broken; commit r11c; expect R11c FAIL 'ownership chain reaches .*, whose owner ai_quota_law is a retired law' "newer snapshot: a child of a child of a retired owner"
reset; printf "select 1 as id into public.g1_into_store;\n" > "$WT/supabase/migrations/29991231000003_g1_into.sql"; commit r12; expect R12 FAIL 'new table public.g1_into_store has no "-- OWNER-CHECK:"' "a table created by a top-level SELECT ... INTO"
reset; printf -- "-- OWNER-CHECK: EXTEND_EXISTING traffic_intelligence_law OPERATIONAL_RUNTIME APPROVAL:%s\nselect 1 as id into public.g1_into_store;\n" "$APPR" > "$WT/supabase/migrations/29991231000003_g1_into.sql"; commit r12b; expect R12b PASS '' "same, with owner, classification and store permission"
reset; printf 'do $$ declare v int; begin select 1 into v; end $$;\n' > "$WT/supabase/migrations/29991231000004_g1_into_var.sql"; commit r12c; expect R12c PASS '' "SELECT ... INTO a PL/pgSQL variable is not a store"
reset; snap_next succ-silent; commit r13; expect R13 FAIL 'agent_onboarding_law: recorded successor changed .* without a retired_routing_v1 record' "newer snapshot: a successor appears on a retired row without a retired_routing_v1 record"
reset; snap_next succ-routed; commit r13b; expect R13b PASS '' "same, recorded through retired_routing_v1 with an approval reference (authenticity: human gate)"
reset; add_oi '| some duty | `docs/no-such-owner-contract.md` |'; commit r14; expect R14 FAIL 'routes to document docs/no-such-owner-contract.md, which does not exist in the repository' "Owner Index row routes to a document that does not exist"
reset; add_oi '| research workspace duty | `docs/research-studio-v1-contract.md` |'; commit r14b; expect R14b PASS '' "Owner Index row routes to an existing registered document"
# ── Round 4: readers of the rule tree in runtime code (a recorded successor proves nothing until the readers use it) ──
refs_next() { py "$1" <<'PY'
import sys; d=sys.argv[1]+'/audits/g1-agent-entry/'; L=open(d+'G1_RETIRED_LAW_REFERENCES_20261112.txt').read().rstrip('\n').split('\n')
if sys.argv[2]=='add': L.append('F|src/lib/g1ProofReader.js|ai_quota_law|platform_tiers_law')
elif sys.argv[2]=='drop':
    n=len(L); L=[l for l in L if l!='F|src/components/SubscribeGate.jsx|subscribe_gate_law|subscription_funnel_law']; assert len(L)==n-1
    p=sys.argv[1]+'/src/components/SubscribeGate.jsx'; t=open(p).read(); assert 'subscribe_gate_law' in t; open(p,'w').write(t.replace('subscribe_gate_law','subscription_funnel_law'))
open(d+'G1_RETIRED_LAW_REFERENCES_20261113.txt','w').write('\n'.join(L)+'\n')
PY
}
reset; printf 'export const quotaOwner = "ai_quota_law";\n' > "$WT/src/lib/g1ProofReader.js"; commit r15; expect R15 FAIL 'src/lib/g1ProofReader.js: names retired law ai_quota_law; its recorded successor is platform_tiers_law' "new runtime code names a retired law"
reset; printf 'export const quotaOwner = "platform_tiers_law";\n' > "$WT/src/lib/g1ProofReader.js"; commit r15b; expect R15b PASS '' "the same code names the recorded successor"
reset; printf 'export const quotaOwner = "ai_quota_law";\n' > "$WT/src/lib/g1ProofReader.js"; refs_next add; commit r15c; expect R15c FAIL 'src/lib/g1ProofReader.js \| ai_quota_law was added \(the record may only shrink' "the new reference is hidden by adding it to a newer record"
reset; refs_next drop; commit r15d; expect R15d PASS '' "an existing reader is repointed to the successor and a newer, smaller record is published"
[ $COUNT -eq $EXPECTED_SCENARIOS ] || { echo "MISMATCH: $COUNT scenarios ran, $EXPECTED_SCENARIOS expected"; MISMATCH=1; }
[ $MISMATCH -eq 0 ] && echo "RESULT: every scenario behaved as expected ($COUNT)" || echo "RESULT: UNEXPECTED OUTCOME(S) — see MISMATCH lines"
exit $MISMATCH
