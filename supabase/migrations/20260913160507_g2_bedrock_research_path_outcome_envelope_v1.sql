-- G2 Bedrock: first-class Research Attempt/Outcome persistence in the EXISTING Research Path step envelope.
-- Vocabulary mirrors Research Result Bundle; executed_empty remains derived, not a status.

create or replace function public.fn_research_path_steps_valid(p_steps jsonb)
returns boolean
language plpgsql
immutable
parallel safe
set search_path to 'pg_catalog','public'
as $function$
declare
  s jsonb;
  st text;
  k text;
begin
  if p_steps is null or jsonb_typeof(p_steps) <> 'array' then return false; end if;
  for s in select value from jsonb_array_elements(p_steps) loop
    if jsonb_typeof(s) <> 'object' then return false; end if;
    if not (s ? 'step_index') or coalesce(s->>'step_index','') !~ '^[0-9]+$' then return false; end if;

    if s ? 'outcome_status' then
      st := nullif(btrim(s->>'outcome_status'),'');
      if st is null or st not in ('executed','negative_result','skipped','context_required','entitlement_gated','unverified','failed','missing_adapter') then return false; end if;
      if coalesce(btrim(s->>'capability_key'),'') = '' then return false; end if;

      foreach k in array array['finding_refs','source_refs','version_refs'] loop
        if s ? k and jsonb_typeof(s->k) <> 'array' then return false; end if;
      end loop;

      if st = 'negative_result' then
        if coalesce(btrim(s->>'reason'),'') = '' then return false; end if;
        if not (s ? 'negative_scope') or jsonb_typeof(s->'negative_scope') <> 'object' then return false; end if;
        if s ? 'finding_refs' and jsonb_array_length(s->'finding_refs') > 0 then return false; end if;
      elsif st = 'missing_adapter' then
        if coalesce(btrim(s->>'reason'),'') = '' then return false; end if;
      end if;
    end if;
  end loop;
  return true;
end
$function$;

do $do$
begin
  if not exists (
    select 1 from pg_constraint
     where conname='research_path_revisions_steps_outcome_ck'
       and conrelid='public.research_path_revisions'::regclass
  ) then
    alter table public.research_path_revisions
      add constraint research_path_revisions_steps_outcome_ck
      check (public.fn_research_path_steps_valid(steps));
  end if;
end
$do$;

revoke execute on function public.fn_research_path_steps_valid(jsonb) from public, anon, authenticated;
grant execute on function public.fn_research_path_steps_valid(jsonb) to service_role;

comment on function public.fn_research_path_steps_valid(jsonb) is
'Validates existing Research Path step envelopes. Optional outcome_status uses canonical Research Result Bundle capability vocabulary. negative_result requires explicit reason+negative_scope and zero finding_refs; missing_adapter requires reason. executed with zero finding_refs yields derived executed_empty, not a new status.';

comment on column public.research_path_revisions.steps is
'Ordered step envelopes. step_index required. Optional execution outcome: capability_key + outcome_status in executed|negative_result|skipped|context_required|entitlement_gated|unverified|failed|missing_adapter; finding_refs/source_refs/version_refs arrays where present. negative_result requires reason+negative_scope and cannot carry positive finding_refs. executed_empty is derived from executed + zero finding_refs. Planned steps may omit outcome_status.';
