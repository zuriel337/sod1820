-- COMPOSITE LIFECYCLE GATE — a composite must not calculate while its own registry row is inactive
--
-- Companion to MF-X2 (20260830150000), which closed the ATOMIC path in fn_dispatch_method.
-- This closes the COMPOSITE path. Same governance rule, same failure semantics, no new contract.
--
-- DEFECT (proven live on main bb2be8172413465815f1be916baba1490cd3a76f)
--   fn_composite_calc gated on: row exists · category='composite' · execution_kind='composite_engine'
--   · fn_method_is_executable(key). It never checked the composite's OWN `active` flag, and
--   fn_method_is_executable's composite branch validates only the COMPONENTS' active
--   (documented behaviour — that predicate means "observed capability NOW", not governance).
--   Consequence: a Human-Gate-DISABLED composite still calculated through three live paths:
--       fn_composite_calc('משולש מילה+משולש הפוך','אמת')                       = 1764
--       fn_method_value('משולש מילה+משולש הפוך','אמת')                          = 1764
--       fn_deep_cross('אמת','משולש מילה+משולש הפוך','אמת','רגיל',true,false)   value_a = 1764
--   Control (active composite 'רגיל+מילוי') = 1048.
--
-- RULE APPLIED (unchanged governance, merely enforced here)
--   Direct governed execution = registered ∧ active ∧ executable.
--   For a composite that means: row exists · category='composite' ·
--   execution_kind='composite_engine' · the composite's OWN active=true ·
--   components still pass their existing execution checks (fn_method_is_executable, which
--   already requires each component to be registered, active, non-composite and resolvable,
--   plus fn_dispatch_method which since MF-X2 also enforces component `active`).
--   scannable / engine_verified / stored / displayed are NOT added — separate axes with their
--   own Human Gates (engine_governance_registry_authority_law HG-E1: ACTIVE != SCANNABLE).
--
-- FAILURE SEMANTICS — existing behaviour preserved, no new exception contract
--   Both functions already signal "not available" with a bare `return;` (zero rows). An inactive
--   composite now joins that same class, exactly as MF-X2 made an inactive atomic method join the
--   existing NULL class. Callers are unaffected: fn_method_value selects `result` from the empty
--   set and yields NULL; fn_deep_cross assigns NULL and its is_match stays false/NULL. Raising
--   would have broken both.
--
-- SCOPE
--   Two functions, one added predicate each. Signatures, return types, volatility (STABLE),
--   security mode (INVOKER) and ACLs unchanged; CREATE OR REPLACE preserves ACLs. No registry
--   row is touched — this migration changes NO lifecycle state and activates nothing.
--
-- NOT DONE HERE: raw component functions untouched; fn_method_is_executable untouched (its
--   "observed capability" semantics are deliberate and load-bearing for
--   fn_method_evidence_class's historical_ungoverned class); fn_metatron_scan, bidim,
--   registry schema, other methods, UI, Raziel all untouched.
--
-- IDEMPOTENT: CREATE OR REPLACE may be replayed safely.

create or replace function public.fn_composite_calc(p_composite_key text, p_phrase text)
returns table(composite_key text, component_methods text[], component_values bigint[], operator text, result numeric, definition_version integer, provenance text)
language plpgsql
stable
set search_path to 'public'
as $function$
declare
  m public.gematria_methods%rowtype;
  v_values bigint[] := '{}'::bigint[];
  k text; v bigint; v_acc numeric;
begin
  select * into m from public.gematria_methods where method_key = p_composite_key;
  if not found then return; end if;
  if m.category is distinct from 'composite' then return; end if;
  if m.execution_kind is distinct from 'composite_engine' then return; end if;
  -- COMPOSITE LIFECYCLE GATE: the composite's OWN Human-Gate flag. fn_method_is_executable
  -- below validates the COMPONENTS only, so without this a disabled composite still computed.
  if m.active is not true then return; end if;
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
$function$;

create or replace function public.fn_composite_calc_all_ops(p_composite_key text, p_phrase text)
returns table(composite_key text, component_methods text[], component_values bigint[], op_sum numeric, op_diff numeric, op_equal boolean, definition_version integer)
language plpgsql
stable
set search_path to 'public'
as $function$
declare
  m public.gematria_methods%rowtype;
  v_values bigint[] := '{}'::bigint[];
  k text; v bigint;
begin
  select * into m from public.gematria_methods
   where method_key = p_composite_key and category = 'composite' and execution_kind = 'composite_engine';
  if not found then return; end if;
  -- COMPOSITE LIFECYCLE GATE (same rule as fn_composite_calc above).
  if m.active is not true then return; end if;
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
$function$;

comment on function public.fn_composite_calc(text, text) is
  'Registry-driven composite engine. Governed execution requires: registered AND category=composite AND execution_kind=composite_engine AND the composite''s OWN active=true AND components executable (fn_method_is_executable + fn_dispatch_method, which enforces component active since MF-X2). Returns zero rows when not available — the existing unavailable signal, no exception contract. scannable/engine_verified are separate axes (HG-E1). Composite lifecycle gate added 30.8.2026.';
