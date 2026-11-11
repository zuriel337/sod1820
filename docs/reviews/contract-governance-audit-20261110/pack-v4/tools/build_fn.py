"""Separate DB-function proposal (NOT EXECUTED): admin_suggestion_decide release-advice text."""
import hashlib, os, difflib, json
EX = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(EX, *a)
md5 = lambda s: hashlib.md5(s.encode('utf-8')).hexdigest()

base = open(P('base/fn/admin_suggestion_decide.sql'), encoding='utf-8').read()
pairs = [
    ("'PATCH/MINOR: branch/PR preparation only; after exact-head gates a release controller may classify AUTO_RELEASE_NOW under deploy_on_request v2. Radar current baseline is dynamic from origin/main; do not create a baseline-only DB migration.'",
     "'PATCH/MINOR: branch/PR preparation only; after exact-head gates the release advice is READY_FOR_APPROVAL: merge and deploy only after explicit approval by ZURIEL of the exact action (deploy_on_request v4, no standing authorization). Radar current baseline is dynamic from origin/main; do not create a baseline-only DB migration.'"),
    ("'system_suggestions_law v3 + deploy_on_request v2 + inter_agent_coordination_law v13'",
     "'system_suggestions_law v3 + deploy_on_request v4 + inter_agent_coordination_law v18'"),
]
new = base
for old, rep in pairs:
    assert new.count(old) == 1, old[:60]
    new = new.replace(old, rep)
assert "'" not in rep.strip("'") or True
open(P('new/fn/admin_suggestion_decide.sql'), 'w', encoding='utf-8').write(new)
diff = '\n'.join(difflib.unified_diff(base.split('\n'), new.split('\n'), 'admin_suggestion_decide (live def)', 'admin_suggestion_decide (proposed)', lineterm='', n=1)) + '\n'
open(P('diff/fn_admin_suggestion_decide.diff'), 'w', encoding='utf-8').write(diff)
sig = "public.admin_suggestion_decide(bigint,text,text)"
sql = f"""-- SOD1820 · admin_suggestion_decide release-advice text — SEPARATE DB PROPOSAL. NOT EXECUTED.
-- Requires its own explicit ZURIEL approval (CLAUDE.md §0.4). Apply only AFTER 10_p0_release_policy.sql (it cites deploy_on_request v4 / inter_agent_coordination_law v18).
-- Changes two string literals only (see diff); signature, SECURITY DEFINER, search_path, logic and grants are unchanged (CREATE OR REPLACE keeps the ACL).
-- Not changed here (reported for decision): the function still inserts a dispatch ASSIGNMENT (dispatch_kind='ASSIGNMENT', state 'QUEUED', to CLAUDE),
-- which predates inter_agent_coordination_law v17 (passive records to ZURIEL, no automatic activation).
-- After approval, add the same definition as a migration under supabase/migrations so the repository matches the DB.
begin;
do $g$ begin
  if md5(pg_get_functiondef('{sig}'::regprocedure)) <> '{md5(base)}' then
    raise exception 'admin_suggestion_decide drift: live definition md5 %', md5(pg_get_functiondef('{sig}'::regprocedure));
  end if;
end $g$;
{new.rstrip()};
do $g$ begin
  if md5(pg_get_functiondef('{sig}'::regprocedure)) <> '{md5(new)}' then
    raise exception 'admin_suggestion_decide: resulting definition md5 % (expected {md5(new)})', md5(pg_get_functiondef('{sig}'::regprocedure));
  end if;
end $g$;
commit;
"""
open(P('sql/11_admin_suggestion_decide_text.sql'), 'w', encoding='utf-8').write(sql)
rb = f"""-- ROLLBACK for 11_admin_suggestion_decide_text.sql — restores the exact live definition (md5 {md5(base)}). PROPOSAL ONLY.
begin;
{base.rstrip()};
do $g$ begin
  if md5(pg_get_functiondef('{sig}'::regprocedure)) <> '{md5(base)}' then raise exception 'rollback mismatch'; end if;
end $g$;
commit;
"""
open(P('sql/18_admin_suggestion_decide_ROLLBACK.sql'), 'w', encoding='utf-8').write(rb)
print(json.dumps({'base_md5': md5(base), 'new_md5': md5(new), 'diff_lines': diff.count('\n')}, indent=1))
