-- G3_SYSTEM_SELF_MAINTENANCE_V1
-- EXTEND_EXISTING system_suggestions_law + work_log dispatch + deploy_on_request.
-- Human direction: ZURIEL wants upgrade discovery handled proactively and accepted infrastructure
-- upgrades implemented without ZURIEL acting as messenger.
--
-- This is NOT autonomous semantic self-modification:
-- * only an existing admin Human-Gate decision (status=accepted) can start implementation;
-- * implementation is branch-only through the existing Claude dispatch runtime;
-- * release remains governed by deploy_on_request / Foundation gates;
-- * V1 serializes all package/runtime maintenance through one active-writer scope;
-- * research truth, product semantics, pricing, privacy/security weakening, destructive data and
--   capability retirement are explicitly outside this lane.
begin;

update public.nodes
   set is_active=false
 where type='rule'
   and rule_id='system_suggestions_law'
   and rule_version=2
   and is_active=true;

insert into public.nodes (
  id,type,label,description,metadata,is_active,created_at,
  rule_id,rule_version,depends_on,supersedes_version,weight,identity_key
)
select
  gen_random_uuid(),
  'rule',
  'System Intelligence v3 — Proactive Upgrade Radar + Governed Self-Maintenance',
  r.description || E'\n\n' ||
  '[UPDATE v3 · Human-Gate ZURIEL · 19.9.2026 — GOVERNED SELF-MAINTENANCE · EXTEND_EXISTING]' || E'\n' ||
  '15. SEMANTIC SELF-MODIFICATION REMAINS FORBIDDEN. The system does not autonomously rewrite research truth, canonical meaning, owners, pricing/economics, privacy/security posture, destructive data, publication state or preserved capability/history. Infrastructure maintenance is a separate bounded execution class.' || E'\n' ||
  '16. PROACTIVE UPGRADE RADAR. Foundation/runtime dependency drift may be detected automatically from authoritative structured sources and surfaced through the existing system_suggestions flow with current/latest/delta/source evidence. Current-version authority must follow current origin/main/runtime state rather than a stale copied baseline.' || E'\n' ||
  '17. ACCEPT = IMPLEMENTATION HANDOFF FOR UPGRADE RADAR. When ZURIEL accepts a dependency_upgrade_radar suggestion through the existing admin_suggestion_decide Human Gate, the system may automatically create one idempotent branch-only CLAUDE maintenance assignment carrying the exact package/current/latest/delta evidence. ZURIEL is the decision owner, not the messenger.' || E'\n' ||
  '18. PREPARATION IS NOT RELEASE. The maintenance assignment may reverify current main, update only the bounded dependency/runtime files required by the accepted suggestion, regenerate the lockfile, run tests and open a PR. The assignment itself is BRANCH_ONLY_NO_MERGE_NO_DEPLOY and never grants publication/canonicalization or production release.' || E'\n' ||
  '19. RELEASE REUSES deploy_on_request. Patch/minor routine maintenance may be released only after current-main reconciliation, dependency closure, peer-resolution, CI/Golden/security checks and no writer overlap under deploy_on_request v2. Major runtime/framework upgrades remain Foundation changes: they may be prepared after Human acceptance but require Foundation redesign-risk challenge and any applicable Human Gate before release.' || E'\n' ||
  '20. STALE SUGGESTION FAILS CLOSED. The maintenance agent must re-read origin/main and authoritative provider metadata before editing. If current no longer equals the accepted observed.current, or latest is no longer the same stable target, it stops/no-ops rather than upgrading from stale evidence.' || E'\n' ||
  '21. ONE TREE / ONE TRACE. Upgrade work reuses system_suggestions, work_log dispatch, existing GitHub/CI and release owners. No Upgrade Store, Maintenance Queue, second scheduler or second release system. Suggestion id, assignment id, branch/PR/head, tests, rollback and final live verification remain traceable.' || E'\n' ||
  'OWNER CHECK: EXTEND_EXISTING system_suggestions_law + inter_agent_coordination_law + deploy_on_request. No second maintenance system.',
  coalesce(r.metadata,'{}'::jsonb) || jsonb_build_object(
    'v3_self_maintenance_2026_09_19', jsonb_build_object(
      'human_gate','ZURIEL',
      'owner_check','EXTEND_EXISTING',
      'accepted_upgrade_auto_handoff',true,
      'branch_only_agent_execution',true,
      'routine_release_owner','deploy_on_request v2',
      'major_requires_foundation_gate',true,
      'semantic_self_modification',false,
      'no_new_store_queue_registry',true
    )
  ),
  true,
  now(),
  'system_suggestions_law',
  3,
  array_append(array_append(coalesce(r.depends_on,'{}'::text[]),'deploy_on_request'),'inter_agent_coordination_law'),
  2,
  r.weight,
  r.identity_key
from public.nodes r
where r.type='rule'
  and r.rule_id='system_suggestions_law'
  and r.rule_version=2
  and not exists (
    select 1
    from public.nodes existing
    where existing.type='rule'
      and existing.rule_id='system_suggestions_law'
      and existing.rule_version=3
  )
order by r.created_at desc
limit 1;

create or replace function public.admin_suggestion_decide(
  p_id bigint,
  p_status text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_s public.system_suggestions%rowtype;
  v_pkg text;
  v_current text;
  v_latest text;
  v_delta text;
  v_slug text;
  v_task text;
  v_scope text;
begin
  if not public.rd_is_admin() then raise exception 'admin only'; end if;
  if p_status not in ('accepted','rejected','later','pending') then raise exception 'bad status'; end if;

  select * into v_s
  from public.system_suggestions
  where id=p_id
  for update;

  if not found then raise exception 'suggestion not found'; end if;

  if p_status='accepted' and v_s.detector='dependency_upgrade_radar' then
    v_pkg := btrim(coalesce(v_s.observed->>'package',''));
    v_current := btrim(coalesce(v_s.observed->>'current',''));
    v_latest := btrim(coalesce(v_s.observed->>'latest',''));
    v_delta := lower(btrim(coalesce(v_s.observed->>'delta','')));

    if v_pkg <> all(array[
      'react','react-dom','react-router-dom','vite','@vitejs/plugin-react',
      '@supabase/supabase-js','@vercel/edge','@vercel/og','@hebcal/core','node'
    ]) then
      raise exception 'unsupported maintenance package';
    end if;
    if v_current !~ '^[0-9]+[.][0-9]+[.][0-9]+$'
       or v_latest !~ '^[0-9]+[.][0-9]+[.][0-9]+$'
       or v_delta not in ('patch','minor','major') then
      raise exception 'invalid maintenance suggestion payload';
    end if;
  end if;

  if p_status='accepted' and v_s.detector='dependency_upgrade_radar'
     and exists (
       select 1
       from public.work_log w
       where w.archived=false
         and w.superseded_by_id is null
         and w.assignment_mode='WRITE'
         and w.dispatch_kind='ASSIGNMENT'
         and lower(coalesce(w.assignment_scope,''))='dependency-maintenance:runtime-packages'
         and coalesce(w.dispatch_state,'QUEUED') not in ('FAILED','CANCELLED','COMPLETED')
     ) then
    raise exception 'dependency maintenance already active';
  end if;

  update public.system_suggestions
     set status=p_status,
         decided_at=now(),
         decision_note=left(p_note,300)
   where id=p_id;

  if p_status='accepted' and v_s.detector='dependency_upgrade_radar' then
    v_slug := trim(both '_' from regexp_replace(lower(v_pkg),'[^a-z0-9]+','_','g'));
    v_task := 'AUTO_DEP_UPGRADE_' || upper(v_slug) || '_' || replace(v_latest,'.','_') || '_S' || p_id::text;
    v_scope := 'dependency-maintenance:runtime-packages';

    begin
      insert into public.work_log(
        session_date,topic,what_we_did,status,open_threads,
        task_key,from_actor,to_actor,assignment_mode,assignment_scope,
        primary_owner,release_authorization_state,
        dispatch_kind,dispatch_state,dispatch_next_attempt_at,dispatch_context
      ) values (
        current_date,
        format('actor=SYSTEM FROM=ZURIEL TO=CLAUDE task=%s — AUTO_MAINTENANCE_PREP',v_task),
        format(
          'Accepted Upgrade Radar suggestion %s. Reverify origin/main and authoritative stable provider metadata before editing. Expected package=%s current=%s latest=%s delta=%s. If origin/main current no longer equals %s, or provider stable latest no longer equals %s, STOP as stale/no-op. Create one isolated branch, change only the accepted dependency/runtime files and required lockfile/peer pair, never use --force or --legacy-peer-deps, run npm ci + full Legacy/2029 build + relevant isolation/visual/security gates, and open a PR. Do not merge/deploy from this assignment.',
          p_id,v_pkg,v_current,v_latest,v_delta,v_current,v_latest
        ),
        'QUEUED_ACCEPTED_UPGRADE_MAINTENANCE',
        case when v_delta='major'
          then 'MAJOR: branch/PR preparation only; release advice must be BLOCKED_BY Foundation redesign-risk challenge/Human Gate.'
          else 'PATCH/MINOR: branch/PR preparation only; after exact-head gates a release controller may classify AUTO_RELEASE_NOW under deploy_on_request v2. Radar current baseline is dynamic from origin/main; do not create a baseline-only DB migration.'
        end,
        v_task,
        'ZURIEL',
        'CLAUDE',
        'WRITE',
        v_scope,
        'system_suggestions_law v3 + deploy_on_request v2 + inter_agent_coordination_law v13',
        'BRANCH_ONLY_NO_MERGE_NO_DEPLOY',
        'ASSIGNMENT',
        'QUEUED',
        now(),
        jsonb_build_object(
          'source','system_suggestions',
          'suggestion_id',p_id,
          'detector','dependency_upgrade_radar',
          'package',v_pkg,
          'current',v_current,
          'latest',v_latest,
          'delta',v_delta,
          'human_decision','accepted',
          'auto_maintenance',true
        )
      );
    exception when unique_violation then
      null; -- same package+target already has one canonical assignment
    end;
  end if;
end;
$function$;

-- This function now has an agent-dispatch side effect after an admin decision. Keep the existing
-- rd_is_admin() fail-closed check, and narrow transport-level EXECUTE to authenticated/server roles.
revoke all on function public.admin_suggestion_decide(bigint,text,text) from public, anon;
grant execute on function public.admin_suggestion_decide(bigint,text,text) to authenticated, service_role;

commit;
