-- ROLLBACK for 11_admin_suggestion_decide_text.sql — restores the exact live definition (md5 12961a8c758d5eb86a3d6834bb54ac82). PROPOSAL ONLY.
begin;
CREATE OR REPLACE FUNCTION public.admin_suggestion_decide(p_id bigint, p_status text, p_note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
do $g$ begin
  if md5(pg_get_functiondef('public.admin_suggestion_decide(bigint,text,text)'::regprocedure)) <> '12961a8c758d5eb86a3d6834bb54ac82' then raise exception 'rollback mismatch'; end if;
end $g$;
commit;
