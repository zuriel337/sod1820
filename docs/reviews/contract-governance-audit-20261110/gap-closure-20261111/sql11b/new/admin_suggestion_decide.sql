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
  v_owner text;
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

    -- Accepting a recommendation is not an activation (inter_agent_coordination_law, from v17):
    -- record the decision passively for ZURIEL. No assignment, no dispatch, no release authority.
    select coalesce(
             string_agg(n.rule_id || ' v' || n.rule_version::text, ' + '
               order by array_position(array['system_suggestions_law','deploy_on_request','inter_agent_coordination_law'], n.rule_id)),
             'system_suggestions_law + deploy_on_request + inter_agent_coordination_law')
      into v_owner
      from public.nodes n
     where n.type='rule'
       and n.is_active
       and n.rule_id in ('system_suggestions_law','deploy_on_request','inter_agent_coordination_law');

    if not exists (select 1 from public.work_log w where w.task_key=v_task) then
      begin
        insert into public.work_log(
          session_date,topic,what_we_did,status,open_threads,
          task_key,from_actor,to_actor,
          primary_owner,release_authorization_state,dispatch_context
        ) values (
          current_date,
          format('actor=SYSTEM · Upgrade Radar suggestion %s accepted by ZURIEL · %s · NOT ACTIVATED',p_id,v_task),
          format(
            'ZURIEL accepted Upgrade Radar suggestion %s: package=%s current=%s latest=%s delta=%s. This records a recommendation decision only: no agent was activated and no work was dispatched. Starting the work needs an explicit ZURIEL instruction to a named agent in a session, citing task_key %s. That agent re-verifies origin/main and authoritative stable provider metadata before editing, and stops as stale/no-op if current is no longer %s or the stable latest is no longer %s. It creates one isolated branch, changes only the accepted dependency/runtime files and the required lockfile/peer pair, never uses --force or --legacy-peer-deps, runs npm ci, npm run build and the relevant CI, visual and security gates, and opens a PR. Merge or deployment needs a separate explicit ZURIEL approval of the exact commit and deployment.',
            p_id,v_pkg,v_current,v_latest,v_delta,v_task,v_current,v_latest
          ),
          'SUGGESTION_ACCEPTED_NOT_ACTIVATED',
          case when v_delta='major'
            then 'MAJOR: not activated; starting the work needs an explicit ZURIEL instruction. Release advice stays BLOCKED_BY Foundation redesign-risk challenge/Human Gate.'
            else 'PATCH/MINOR: not activated; starting the work needs an explicit ZURIEL instruction. After exact-head gates the release advice is at most READY_FOR_APPROVAL: presented to ZURIEL for explicit approval of the exact merge and deployment, never an automatic merge or deploy. Radar current baseline is dynamic from origin/main; do not create a baseline-only DB migration.'
          end,
          v_task,
          'ZURIEL',
          'ZURIEL',
          v_owner,
          'NOT_ACTIVATED_NO_MERGE_NO_DEPLOY',
          jsonb_build_object(
            'source','system_suggestions',
            'suggestion_id',p_id,
            'detector','dependency_upgrade_radar',
            'package',v_pkg,
            'current',v_current,
            'latest',v_latest,
            'delta',v_delta,
            'human_decision','accepted',
            'activation','NOT_ACTIVATED',
            'activation_requires','explicit ZURIEL instruction to a named agent',
            'release_requires','explicit ZURIEL approval of the exact merge and deployment',
            'intended_scope',v_scope,
            'auto_maintenance',false
          )
        );
      exception when unique_violation then
        null; -- the same suggestion already has its decision record
      end;
    end if;
  end if;
end;
$function$
