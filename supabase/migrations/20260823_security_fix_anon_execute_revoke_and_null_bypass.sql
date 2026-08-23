-- Security Fix — approved at Gate #18 closure (WS-JUDGE-UNIFICATION, Master State §20, 23.8.2026):
-- "Security Work (3 anon-writable functions + null-bypass) מאושר-לתיקון, נפרד-ודחוף-לפני-Intake-Build,
--  לא-חלק-מהחלטת-הארכיטקטורה." Flagged live in the Gate #18 decision pack (work_log 18dad622).
--
-- Verified before applying this migration (READ-ONLY checks, no assumptions from memory):
--   - project_contribution_to_graph(uuid), project_language_bridges(), sync_convergence(uuid) all had
--     EXECUTE granted to PUBLIC (Postgres default at CREATE FUNCTION time — proacl showed "=X/postgres",
--     not an anon-specific grant). Every role, including anon, inherits PUBLIC's privileges implicitly,
--     so `revoke execute ... from anon` alone is a no-op here — confirmed live: after revoking only from
--     anon, has_function_privilege('anon', ...) still returned true. The actual fix is to revoke from
--     PUBLIC and grant explicitly to the roles that need it (authenticated, service_role) — this mirrors
--     the exact pattern already used by admin_research_review (proacl:
--     "{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}", no PUBLIC entry).
--   - project_contribution_to_graph and project_language_bridges are SECURITY DEFINER — anon could
--     invoke them directly via PostgREST RPC and force writes into nodes/edges, bypassing every
--     Human-Gate (admin_research_review / ConvergenceWizard / decision_ledger). This was live-exploitable.
--   - sync_convergence is SECURITY INVOKER (no SECURITY DEFINER clause) and anon lacks INSERT/UPDATE
--     grants on nodes/edges/topic_cards, so it was not directly exploitable today via the invoker-rights
--     path — but the PUBLIC EXECUTE grant was still excessive/no defense-in-depth, closed regardless
--     per the approved fix.
--   - grep across src/ and supabase/functions/ found zero client callers of any of the 3 functions
--     (only a comment reference to admin_research_review in src/lib/deepAnalysis.js).
--   - no pg_cron job references any of the 4 functions (checked cron.job.command).
--   - admin_research_review already had anon EXECUTE = false (not itself anon-reachable), but its
--     internal check `if auth.uid() is not null and not coalesce(v_admin,false) then raise exception`
--     silently BYPASSED the admin check whenever auth.uid() is null (e.g. any non-interactive/internal
--     invocation without a valid admin session) — fixed to require v_admin unconditionally.
--
-- This migration only revokes/narrows privilege and tightens one logic check; it does not touch
-- any table schema, does not change any other function's behavior, and does not add new tables/engines.

revoke execute on function public.project_contribution_to_graph(uuid) from public;
revoke execute on function public.project_language_bridges() from public;
revoke execute on function public.sync_convergence(uuid) from public;

grant execute on function public.project_contribution_to_graph(uuid) to authenticated, service_role;
grant execute on function public.project_language_bridges() to authenticated, service_role;
grant execute on function public.sync_convergence(uuid) to authenticated, service_role;

create or replace function public.admin_research_review(p_id uuid, p_decision text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_admin boolean; r public.research_objects; v_num uuid; v_ins uuid;
begin
  select (role='admin') into v_admin from public.users where id = auth.uid();
  if not coalesce(v_admin,false) then raise exception 'admin only'; end if;
  select * into r from public.research_objects where id = p_id;
  if not found then return jsonb_build_object('ok',false,'error','not found'); end if;

  if p_decision = 'reject' then
    update public.research_objects set status='rejected' where id=p_id;
    return jsonb_build_object('ok',true,'status','rejected');
  end if;

  -- approve
  if r.kind in ('fact','relation') then
    if r.value is not null then
      select id into v_num from public.nodes where type='number' and label = r.value::text limit 1;
      if v_num is null then
        insert into public.nodes(type,label,description,metadata,is_active)
        values ('number', r.value::text, 'מספר '||r.value, jsonb_build_object('via','research_extractor'), true)
        returning id into v_num;
      end if;
    end if;
    insert into public.nodes(type,label,description,metadata,is_active)
    values ('insight', left(r.statement,120), r.statement,
            jsonb_build_object('kind',r.kind,'value',r.value,'terms',r.terms,'relates',r.relates,
                               'contributor',r.contributor,'source',r.source,'engine_verified',r.engine_verified),
            true)
    returning id into v_ins;
    if v_num is not null then
      insert into public.edges(from_node,to_node,relation_type,metadata)
      values (v_ins, v_num, 'has_value', jsonb_build_object('via','research_extractor'));
    end if;
    update public.research_objects set status='canonical', promoted_node_id=v_ins where id=p_id;
    return jsonb_build_object('ok',true,'status','canonical','insight_node',v_ins,'number_node',v_num);
  else
    -- observation/hypothesis/question: מאושר כידע-חי (לא צומת עדיין)
    update public.research_objects set status='approved' where id=p_id;
    return jsonb_build_object('ok',true,'status','approved','kind',r.kind);
  end if;
end; $function$;
