-- SOD1820 · 11b · admin_suggestion_decide: accepting a recommendation does not activate an agent. PROPOSAL ONLY. NOT EXECUTED.
-- Task CONTRACT_GOVERNANCE_REVIEW_GAP_CLOSURE_20261111. Replaces 11_admin_suggestion_decide_text.sql: do not run 11_.
-- Needs its own explicit ZURIEL approval of this file's SHA-256, for one run (CLAUDE.md §0.4). Approval of this file is not approval of 18b.
-- One statement (one DO block), so it is all or nothing. Every condition below is checked inside; any mismatch raises and nothing changes.
--   1. The embedded definition is intact: 6286 bytes, md5 f44dc42fafdf4a8ef4ae3db700fbeacf.
--   2. The live definition is the reviewed base: md5 12961a8c758d5eb86a3d6834bb54ac82 (refuses if 11_ ran, if 11b already ran, or on any drift).
--   3. Function metadata: SECURITY DEFINER, search_path=public, owner postgres, EXECUTE for postgres, authenticated and service_role only.
--   4. Active laws: system_suggestions_law v6, deploy_on_request v4, inter_agent_coordination_law v18.
--   5. work_log triggers, unique indexes and check constraints are exactly the ones the no-activation proof was run against.
-- After: md5 f44dc42fafdf4a8ef4ae3db700fbeacf, same metadata and permissions (CREATE OR REPLACE keeps the ACL).
-- What changes: the accepted dependency_upgrade_radar branch writes one passive record to ZURIEL (no dispatch fields, no TO=CLAUDE,
-- no assignment mode) instead of a QUEUED ASSIGNMENT to CLAUDE. Everything before it is unchanged: admin check, status check,
-- row lock, payload validation, overlap guard and the status update. Exact diff: admin_suggestion_decide.diff
-- Rollback: 18b_admin_suggestion_decide_not_activated_ROLLBACK.sql restores the exact base, which turns the automatic assignment back on.
-- After an approved run, add the same definition as a migration under supabase/migrations so the repository matches the DB.
do $sod_11b$
declare
  v_def constant text := $sod_def$CREATE OR REPLACE FUNCTION public.admin_suggestion_decide(p_id bigint, p_status text, p_note text DEFAULT NULL::text)
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
$sod_def$;
  v_got text;
begin
  perform set_config('search_path', 'public', true);
  if octet_length(v_def) <> 6286 or md5(v_def) <> 'f44dc42fafdf4a8ef4ae3db700fbeacf' then
    raise exception '11b refused: embedded definition is not intact (bytes %, md5 %)', octet_length(v_def), md5(v_def);
  end if;
  v_got := md5(pg_get_functiondef('public.admin_suggestion_decide(bigint,text,text)'::regprocedure));
  if v_got <> '12961a8c758d5eb86a3d6834bb54ac82' then
    raise exception '11b refused: live admin_suggestion_decide is not the reviewed base (md5 %)', v_got;
  end if;
  v_got := (select p.prosecdef::text||':'||array_to_string(p.proconfig,';')||':'||array_to_string(p.proacl::text[],',')||':'||p.proowner::regrole::text from pg_proc p where p.oid='public.admin_suggestion_decide(bigint,text,text)'::regprocedure);
  if v_got is distinct from 'true:search_path=public:postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres:postgres' then
    raise exception '11b refused: function metadata or permissions changed: %', v_got;
  end if;
  v_got := (select string_agg(n.rule_id||'@'||n.rule_version::text, ',' order by n.rule_id) from public.nodes n where n.type='rule' and n.is_active and n.rule_id in ('system_suggestions_law','deploy_on_request','inter_agent_coordination_law'));
  if v_got is distinct from 'deploy_on_request@4,inter_agent_coordination_law@18,system_suggestions_law@6' then
    raise exception '11b refused: active law versions changed: %', v_got;
  end if;
  v_got := (select string_agg(t.tgname::text||':'||t.tgenabled::text||':'||p.proname::text||':'||md5(pg_get_functiondef(p.oid))||':'||md5(pg_get_triggerdef(t.oid)), ',' order by t.tgname) from pg_trigger t join pg_proc p on p.oid=t.tgfoid where t.tgrelid='public.work_log'::regclass and not t.tgisinternal);
  if v_got is distinct from 'trg_work_log_dispatch_00_gpt_event:O:work_log_dispatch_gpt_after_write:a00ff986e51296e9e3f13a4f6d9b3dc6:cd6bdf501a101a57b27c33e9f0eeb28f,trg_work_log_dispatch_event:O:work_log_dispatch_after_write:dfac3f0c9cace0993c53ea8e967408ae:4b0735c8ada910e1084f8e09d0cae77b,trg_work_log_dispatch_prepare:O:work_log_dispatch_prepare:bba6f47639772c33d2eb7d774b2562b5:c8656de489529a748f0fed10fa6cd493,trg_work_log_zz_gpt_delivery_stop_v17:O:work_log_gpt_delivery_stop_v17:1492577ec06d4f38631d3ed70bede4a7:9a3ab0c02d17b34aaa700933f3d318f3' then
    raise exception '11b refused: work_log triggers changed: %', v_got;
  end if;
  v_got := (select string_agg(c.relname::text||':'||md5(pg_get_indexdef(i.indexrelid)), ',' order by c.relname) from pg_index i join pg_class c on c.oid=i.indexrelid where i.indrelid='public.work_log'::regclass and i.indisunique);
  if v_got is distinct from 'work_log_assignment_idempotency_uidx:d0ff7092e20754986de6832b2ea35bb7,work_log_one_active_writer_scope_uidx:9b48809210921d799fd96f7611d01ce9,work_log_pkey:7626b73061ca271b8a5bdcf2b18dec08' then
    raise exception '11b refused: work_log unique indexes changed: %', v_got;
  end if;
  v_got := (select string_agg(k.conname::text||':'||md5(pg_get_constraintdef(k.oid)), ',' order by k.conname) from pg_constraint k where k.conrelid='public.work_log'::regclass and k.contype='c');
  if v_got is distinct from 'work_log_assignment_mode_ck:e8946be6403885be8060d5e7df574521,work_log_dispatch_attempts_ck:c33f41675ce5fbcfb6ae1cf292af237f,work_log_dispatch_kind_ck:d1918784965683712fdb60beddee6b5b,work_log_dispatch_state_ck:7135a05432c7ff6927a9036b8188cf9c,work_log_from_actor_ck:968810e0e64aebcbb85078ffb5ada0d2,work_log_no_self_supersede:6ad1bc61808f15cf4144bb9e34a57672,work_log_to_actor_ck:5c8d82bcbd624e6536a26c620296619e' then
    raise exception '11b refused: work_log check constraints changed: %', v_got;
  end if;

  execute v_def;

  v_got := md5(pg_get_functiondef('public.admin_suggestion_decide(bigint,text,text)'::regprocedure));
  if v_got <> 'f44dc42fafdf4a8ef4ae3db700fbeacf' then
    raise exception '11b failed after apply: resulting md5 % (expected f44dc42fafdf4a8ef4ae3db700fbeacf); the statement is rolled back', v_got;
  end if;
  v_got := (select p.prosecdef::text||':'||array_to_string(p.proconfig,';')||':'||array_to_string(p.proacl::text[],',')||':'||p.proowner::regrole::text from pg_proc p where p.oid='public.admin_suggestion_decide(bigint,text,text)'::regprocedure);
  if v_got is distinct from 'true:search_path=public:postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres:postgres' then
    raise exception '11b failed after apply: metadata or permissions changed: %; the statement is rolled back', v_got;
  end if;
end
$sod_11b$;
