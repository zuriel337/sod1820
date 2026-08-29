-- ENGINE GOVERNANCE FOUNDATION — PART 2/3
-- CANONICAL PREDICATES · REGISTRY-DRIVEN COMPOSITE ENGINE · CONVERGENCE DEPENDENCY LAW
-- Companion to 20260829151130_engine_governance_registry_authority.sql.
-- Closes DRIFT-E1/E4/E5/E6 and task section 7. No activation. No scan. No data rewrite.

-- 1. EXECUTABLE — observed capability NOW
create or replace function public.fn_method_is_executable(p_method_key text)
returns boolean language plpgsql stable as $$
declare m public.gematria_methods%rowtype; bad int;
begin
  select * into m from public.gematria_methods where method_key = p_method_key;
  if not found then return false; end if;

  if m.execution_kind in ('sql_function', 'context_activated') then
    return m."function" is not null and to_regproc('public.' || m."function") is not null;
  end if;

  if m.execution_kind = 'composite_engine' then
    if m.operator is null or m.operator not in ('sum', 'diff') then return false; end if;
    if m.derived_from is null or coalesce(array_length(m.derived_from, 1), 0) < 2 then return false; end if;
    select count(*) into bad
    from unnest(m.derived_from) as c(k)
    left join public.gematria_methods g on g.method_key = c.k
    where g.method_key is null
       or g.category = 'composite'
       or g.active is not true
       or g."function" is null
       or to_regproc('public.' || g."function") is null;
    return bad = 0;
  end if;

  return false;
end;
$$;

comment on function public.fn_method_is_executable(text) is
  'Canonical EXECUTABLE predicate (Engine Governance Foundation). sql_function/context_activated => declared function resolves in pg_proc. composite_engine => operator supported AND every derived_from component is a registered, active, non-composite, executable method (INV-C2/INV-C5). Never uses in_engine.';

-- 2. ENGINE_VERIFIED — version-bound (INV-C3)
create or replace function public.fn_method_is_engine_verified(p_method_key text)
returns boolean language plpgsql stable as $$
declare m public.gematria_methods%rowtype; bad int;
begin
  select * into m from public.gematria_methods where method_key = p_method_key;
  if not found then return false; end if;
  if m.dependency_verified_at is null then return false; end if;
  if m.dependency_version is distinct from m.version then return false; end if;

  if m.category = 'composite' then
    select count(*) into bad
    from unnest(coalesce(m.derived_from, '{}'::text[])) as c(k)
    left join public.gematria_methods g on g.method_key = c.k
    where g.method_key is null
       or (m.dependency_versions ->> c.k) is null
       or (m.dependency_versions ->> c.k)::int is distinct from g.version;
    if bad > 0 then return false; end if;
  end if;

  return true;
end;
$$;

comment on function public.fn_method_is_engine_verified(text) is
  'Canonical ENGINE_VERIFIED predicate. dependency_verified_at present AND dependency_version = version; for composites additionally every component pinned in dependency_versions must still be at that version (INV-C3). All four existing composites return FALSE — dependency_verified_at is NULL for them by Human-Gate decision HG-E2.';

-- 3. SCANNABLE — the single canonical scan/write eligibility predicate
create or replace function public.fn_method_is_scannable(p_method_key text)
returns boolean language sql stable as $$
  select coalesce((
    select gm.scannable
       and gm.active
       and public.fn_method_is_executable(gm.method_key)
       and public.fn_method_is_engine_verified(gm.method_key)
    from public.gematria_methods gm
    where gm.method_key = p_method_key
  ), false);
$$;

comment on function public.fn_method_is_scannable(text) is
  'THE ONLY permitted corpus scan/write eligibility predicate: scannable AND active AND executable AND engine_verified. Category is NOT a gate. in_engine is NOT a gate and must never be substituted for this.';

-- 4. v_method_states — read-only canonical runtime projection
drop view if exists public.v_method_states;
create view public.v_method_states
with (security_invoker = on) as
select
  gm.method_key,
  gm.display_label,
  gm.category,
  gm.sort_order,
  true                                               as registered,
  gm.active,
  gm.in_engine                                       as in_engine_declared,
  public.fn_method_is_executable(gm.method_key)      as executable,
  public.fn_method_is_engine_verified(gm.method_key) as engine_verified,
  public.fn_method_is_scannable(gm.method_key)       as scannable,
  gm.scannable                                       as scannable_flag,
  gm.execution_kind,
  gm.operator,
  gm."function",
  gm.derived_from,
  gm.dependency_versions,
  gm.version                                         as method_version,
  gm.dependency_version,
  gm.dependency_verified_at,
  gm.required_entitlement,
  (gm.in_engine is distinct from public.fn_method_is_executable(gm.method_key)) as in_engine_drift,
  case
    when public.fn_method_is_scannable(gm.method_key)          then null
    when not gm.active                                          then 'not_active_human_gate'
    when not gm.scannable                                       then 'scannable_flag_false_human_gate'
    when not public.fn_method_is_executable(gm.method_key)      then 'not_executable'
    when not public.fn_method_is_engine_verified(gm.method_key) then 'not_engine_verified'
    else 'unknown'
  end                                                as not_scannable_reason
from public.gematria_methods gm;

comment on view public.v_method_states is
  'Canonical read-only projection of method lifecycle state (Engine Governance Foundation). REGISTERED / ACTIVE / IN_ENGINE(diagnostic) / EXECUTABLE / ENGINE_VERIFIED / SCANNABLE + execution_kind, operator, version and dependency state. Derives everything from gematria_methods primitives — it is NOT a second authority.';

grant select on public.v_method_states to anon, authenticated, service_role;

-- 5. REGISTRY-DRIVEN COMPOSITE ENGINE (hardcoded CASE removed)
create or replace function public.fn_composite_calc(p_composite_key text, p_phrase text)
returns table(composite_key text, component_methods text[], component_values bigint[],
              operator text, result numeric, definition_version integer, provenance text)
language plpgsql stable as $$
declare
  m public.gematria_methods%rowtype;
  v_values bigint[] := '{}'::bigint[];
  k text; v bigint; v_acc numeric;
begin
  select * into m from public.gematria_methods where method_key = p_composite_key;
  if not found then return; end if;
  if m.category is distinct from 'composite' then return; end if;
  if m.execution_kind is distinct from 'composite_engine' then return; end if;
  if not public.fn_method_is_executable(p_composite_key) then return; end if;

  foreach k in array m.derived_from loop
    v := public.fn_dispatch_method(k, p_phrase);
    if v is null then return; end if;
    v_values := v_values || v;
  end loop;

  if m.operator = 'sum' then
    select sum(x)::numeric into v_acc from unnest(v_values) as t(x);
  elsif m.operator = 'diff' then
    if array_length(v_values, 1) <> 2 then return; end if;
    v_acc := abs(v_values[1] - v_values[2])::numeric;
  else
    return;
  end if;

  return query select
    p_composite_key, m.derived_from, v_values, m.operator, v_acc, m.version,
    format('registry-driven composite engine: gematria_methods(method_key=%s) derived_from=%s operator=%s version=%s dependency_versions=%s; components dispatched via fn_dispatch_method -> %s',
           p_composite_key, m.derived_from::text, m.operator, m.version,
           m.dependency_versions::text, v_values::text);
end;
$$;

comment on function public.fn_composite_calc(text, text) is
  'Canonical composite engine — REGISTRY-DRIVEN (Engine Governance Foundation). Components, operator and version come from gematria_methods; there is no hardcoded composite-name mapping. Supports n components for operator=sum, exactly 2 for operator=diff.';

create or replace function public.fn_composite_calc_all_ops(p_composite_key text, p_phrase text)
returns table(composite_key text, component_methods text[], component_values bigint[],
              op_sum numeric, op_diff numeric, op_equal boolean, definition_version integer)
language plpgsql stable as $$
declare
  m public.gematria_methods%rowtype;
  v_values bigint[] := '{}'::bigint[];
  k text; v bigint;
begin
  select * into m from public.gematria_methods
   where method_key = p_composite_key and category = 'composite' and execution_kind = 'composite_engine';
  if not found then return; end if;
  if coalesce(array_length(m.derived_from, 1), 0) <> 2 then return; end if;
  if not public.fn_method_is_executable(p_composite_key) then return; end if;

  foreach k in array m.derived_from loop
    v := public.fn_dispatch_method(k, p_phrase);
    if v is null then return; end if;
    v_values := v_values || v;
  end loop;

  return query select p_composite_key, m.derived_from, v_values,
    (v_values[1] + v_values[2])::numeric,
    abs(v_values[1] - v_values[2])::numeric,
    (v_values[1] = v_values[2]),
    m.version;
end;
$$;

-- 6. CANONICAL SINGLE EXECUTION ENTRY POINT
create or replace function public.fn_method_value(p_method_key text, p_phrase text)
returns bigint language plpgsql stable as $$
declare v_kind text; v bigint;
begin
  select execution_kind into v_kind from public.gematria_methods where method_key = p_method_key;
  if v_kind is null then return null; end if;
  if v_kind in ('sql_function', 'context_activated') then
    return public.fn_dispatch_method(p_method_key, p_phrase);
  elsif v_kind = 'composite_engine' then
    select c.result::bigint into v from public.fn_composite_calc(p_method_key, p_phrase) c;
    return v;
  end if;
  return null;
end;
$$;

comment on function public.fn_method_value(text, text) is
  'Canonical execution entry point for any registered method identity, atomic or composite, routed by execution_kind. Automated writers call this; they never branch on category or maintain their own method lists.';

-- 7. VERSIONED RESULT IDENTITY (DRIFT-E7) — backward-compatible by construction
create or replace function public.fn_bidim_id(p_word_id uuid, p_method_key text,
                                              p_method_version int, p_operator text)
returns text language sql immutable as $$
  select case
    when coalesce(p_method_version, 1) = 1 and p_operator is null
      then md5(p_word_id::text || ':' || p_method_key)
    else md5(p_word_id::text || ':' || p_method_key
             || '|op=' || coalesce(p_operator, '-')
             || '|v='  || coalesce(p_method_version, 1)::text)
  end;
$$;

comment on function public.fn_bidim_id(uuid, text, int, text) is
  'Canonical bidim row identity. Includes method version and composition operator so results from different governed versions cannot silently collide. Deliberately reproduces the LEGACY key for (version=1, operator=NULL) so historical rows keep their identity and require no destructive re-key.';

-- 8. CONVERGENCE DEPENDENCY LAW (task section 7)
create or replace function public.fn_method_is_derived(p_method_key text)
returns boolean language sql stable as $$
  select coalesce((select category = 'composite' from public.gematria_methods where method_key = p_method_key), false);
$$;

create or replace function public.fn_independent_method_set(p_methods text[])
returns text[] language sql stable as $$
  select coalesce(array_agg(m order by m), '{}'::text[])
  from unnest(coalesce(p_methods, '{}'::text[])) as t(m)
  where not exists (
    select 1 from public.gematria_methods gm
    where gm.method_key = t.m
      and gm.category = 'composite'
      and gm.derived_from is not null
      and gm.derived_from <@ coalesce(p_methods, '{}'::text[])
  );
$$;

comment on function public.fn_independent_method_set(text[]) is
  'Canonical dependency-aware mechanism for convergence counting. Removes any registered composite whose full component set is already present, so the same evidence expressed through A, B and A+B counts once, not three times.';

drop view if exists public.cross_method_strength;
create view public.cross_method_strength
with (security_invoker = on) as
with tagged as (
  select b.value, b.phrase, b.method, b.priority,
         coalesce(gm.category, 'unregistered') as m_category
  from public.bidim b
  left join public.gematria_methods gm on gm.method_key = b.method
)
select
  value,
  count(distinct phrase) filter (where m_category <> 'composite')    as phrase_count,
  count(*) filter (where priority = 1 and m_category <> 'composite') as p1_hits,
  public.fn_independent_method_set(
    array_agg(distinct method order by method) filter (where m_category <> 'composite')
  )                                                                  as methods,
  bool_or(method = 'רגיל'   and m_category <> 'composite')           as in_ragil,
  bool_or(method = 'מסתתר' and m_category <> 'composite')           as in_misratar,
  bool_or(method = 'קדמי'  and m_category <> 'composite')           as in_kadmi,
  case
    when bool_or(method = 'רגיל' and m_category <> 'composite')
     and bool_or(method = 'מסתתר' and m_category <> 'composite')
     and bool_or(method = 'קדמי' and m_category <> 'composite') then 'CORE_AXIS_CANDIDATE'
    when count(*) filter (where priority = 1 and m_category <> 'composite') >= 2 then 'CROSS_METHOD'
    else 'SINGLE'
  end                                                                as signal,
  array_agg(distinct method order by method) filter (where m_category = 'composite')    as dependent_methods,
  count(distinct phrase) filter (where m_category = 'composite')                        as dependent_phrase_count,
  array_agg(distinct method order by method) filter (where m_category = 'unregistered') as unregistered_methods
from tagged
group by value;

comment on view public.cross_method_strength is
  'Derived ranking signal over bidim (NOT canonical, NOT a cache, NOT stored). Engine Governance Foundation 29.8.2026: the independence signal is computed over NON-DERIVED methods only — a composite result is deterministically entailed by its components and is not independent corroboration (task section 7). Derived and unregistered methods are reported in their own columns rather than hidden.';

grant select on public.cross_method_strength to service_role;

-- fn_relation_composite_evidence: hardcoded composite array removed; every row
-- now declares whether it is INDEPENDENT evidence.
create or replace function public.fn_relation_composite_evidence(p_a text, p_b text)
returns jsonb language plpgsql stable as $$
declare
  ckey text; ra record; rb record; out_rows jsonb := '[]'::jsonb; atoms_matched boolean;
begin
  for ckey in
    select method_key from public.gematria_methods
     where category = 'composite' and execution_kind = 'composite_engine'
     order by sort_order
  loop
    select * into ra from public.fn_composite_calc_all_ops(ckey, p_a);
    if not found then continue; end if;
    select * into rb from public.fn_composite_calc_all_ops(ckey, p_b);
    if not found then continue; end if;

    atoms_matched := (ra.component_values = rb.component_values);

    if ra.op_sum = rb.op_sum then
      out_rows := out_rows || jsonb_build_object(
        'composite_key', ckey, 'operator', 'sum',
        'component_methods', ra.component_methods,
        'value_a', ra.component_values, 'value_b', rb.component_values,
        'result', ra.op_sum,
        'atomic_components_also_matched', atoms_matched,
        'independent_evidence', not atoms_matched,
        'note', case when atoms_matched
                     then 'derived: entailed by the component methods that already match — do not count as an additional independent method'
                     else 'derived composite match; the component methods do not both match individually' end);
    end if;
    if ra.op_diff = rb.op_diff then
      out_rows := out_rows || jsonb_build_object(
        'composite_key', ckey, 'operator', 'diff',
        'component_methods', ra.component_methods,
        'value_a', ra.component_values, 'value_b', rb.component_values,
        'result', ra.op_diff,
        'atomic_components_also_matched', atoms_matched,
        'independent_evidence', not atoms_matched,
        'note', 'research operator (diff) — never a registered identity, never persisted (INV-C6)');
    end if;
  end loop;
  return out_rows;
end;
$$;

-- 9. fn_number_lookup — stop hardcoding operator='sum' (DRIFT-E6)
create or replace function public.fn_number_lookup(p_value bigint)
returns table(method text, phrase text, value bigint, source text, vip_source text,
              is_verified boolean, dna_status text, node_id uuid, category text, tags text[],
              mathematical_family text, order_sensitive boolean, word_boundary_sensitive boolean,
              final_letter_sensitive boolean, atomic_or_composite text, component_methods text[],
              component_values bigint[], operator text, provenance text)
language plpgsql stable as $$
begin
  return query
  select b.method, b.phrase, b.value, gw.source, gw.vip_source,
         gw.is_verified, gw.dna_status, gw.node_id, gw.category, gw.tags,
         gm.mathematical_family, gm.order_sensitive, gm.word_boundary_sensitive,
         gm.final_letter_sensitive,
         case when gm.category = 'composite' then 'composite' else 'atomic' end,
         case when gm.category = 'composite' then gm.derived_from else null end,
         case when gm.category = 'composite'
              then (select c.component_values from public.fn_composite_calc(b.method, b.phrase) c)
              else null end,
         gm.operator,
         format('bidim(method=%s,value=%s) joined gematria_words(id=%s) joined gematria_methods registry (execution_kind=%s, operator=%s)',
                b.method, b.value, gw.id, gm.execution_kind, coalesce(gm.operator, '-'))
  from public.bidim b
  join public.gematria_words gw on gw.id = b.word_id
  left join public.gematria_methods gm on gm.method_key = b.method
  where b.value = p_value
    and gw.is_verified = true
  order by (gm.category = 'composite'), b.method, b.phrase;
end;
$$;
