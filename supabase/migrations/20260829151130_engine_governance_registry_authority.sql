-- ENGINE GOVERNANCE FOUNDATION — PART 1/3: REGISTRY AUTHORITY
-- Human-Gate: ZURIEL HG-E1 (ACTIVE != SCANNABLE) + HG-E2 (4 composites stay
-- REGISTERED but INACTIVE + NON-SCANNABLE; historical bidim rows untouched).
-- HG-E3 NOT executed here: רגיל+אתבש is NOT registered.
-- Evidence pass: work_log 712562fe-45c2-4a55-8587-cfaf2a58f605.
-- BEFORE row:    work_log 96954d8d-caea-416f-bb7c-8f4eae018065.
-- Additive only. No activation. No scan. No data deletion.

-- 1. MINIMAL ADDITIVE PRIMITIVES
alter table public.gematria_methods
  add column if not exists scannable           boolean not null default false,
  add column if not exists execution_kind      text,
  add column if not exists operator            text,
  add column if not exists dependency_versions jsonb not null default '{}'::jsonb;

comment on column public.gematria_methods.scannable is
  'HG-E1 Human-Gate corpus-scan gate. ACTIVE != SCANNABLE. A method may be registered, active, executable and engine-verified and still deliberately not scannable (context-activated, prohibitively expensive, or research-only). Never derive this — it is set explicitly by the Human Gate.';
comment on column public.gematria_methods.execution_kind is
  'sql_function = executed via the declared pg function; composite_engine = executed by the generic registry-driven composite engine (function IS NULL by design, INV-C1); context_activated = has a function but must never be auto-scanned (input is not a pure function of the phrase); unimplemented = registered identity with no execution path yet.';
comment on column public.gematria_methods.operator is
  'Composition operator for category=composite. Exactly one operator per method_key (INV-C6): multi-operator exploration is a research surface, never a registered identity. A non-commutative operator requires its own distinct method_key.';
comment on column public.gematria_methods.dependency_versions is
  'Per-component version pin, {"<component method_key>": <version>}. ENGINE_VERIFIED is version-bound: if a component version moves past its pin, every composite referencing it drops out of SCANNABLE (INV-C3).';
comment on column public.gematria_methods.in_engine is
  'DIAGNOSTIC / COMPATIBILITY ONLY (Engine Governance Foundation, 29.8.2026). Preserved as historical declared intent per everything_additive_law. It is factually wrong for 5 live methods and MUST NOT be used as a scan or execution gate — use v_method_states.scannable / .executable instead.';

-- 2. CONSTRAINED VOCABULARY
alter table public.gematria_methods
  drop constraint if exists gm_execution_kind_chk,
  drop constraint if exists gm_operator_chk;

alter table public.gematria_methods
  add constraint gm_execution_kind_chk
    check (execution_kind is null or execution_kind in
           ('sql_function','composite_engine','context_activated','unimplemented')),
  add constraint gm_operator_chk
    check (operator is null or operator in ('sum','diff'));

-- 3. BACKFILL execution_kind (declares the truth, changes no capability)
update public.gematria_methods
   set execution_kind = case
         when category = 'composite'  then 'composite_engine'
         when method_key = 'אות רבתי' then 'context_activated'
         when "function" is not null  then 'sql_function'
         else 'unimplemented'
       end
 where execution_kind is null;

-- 4. THE FOUR EXISTING COMPOSITES — EXPLICIT DEPENDENCY CONTRACTS
--    Source of truth = CURRENT CANONICAL BEHAVIOUR of public.fn_composite_calc
--    (the plpgsql CASE body), NOT the display labels. 'רגיל+משולש' is labelled
--    משולש but composes קדמי (meshulash_kadmi_law alias) — INV-C2.
with contract(method_key, components, op) as (
  values
    ('רגיל+מילוי',              array['רגיל','מילוי'],              'sum'),
    ('רגיל+מסתתר',              array['רגיל','מסתתר'],              'sum'),
    ('רגיל+משולש',              array['רגיל','קדמי'],               'sum'),
    ('משולש מילה+משולש הפוך',   array['משולש מילה','משולש הפוך'],   'sum')
)
update public.gematria_methods gm
   set derived_from        = c.components,
       operator            = c.op,
       execution_kind      = 'composite_engine',
       "function"          = null,
       dependency_versions = (
         select coalesce(jsonb_object_agg(comp.method_key, comp.version), '{}'::jsonb)
         from public.gematria_methods comp
         where comp.method_key = any (c.components)
       ),
       dependency_rules    = jsonb_build_array(jsonb_build_object(
         'type',                  'composition',
         'operator',              c.op,
         'components',            to_jsonb(c.components),
         'order_is_load_bearing', false,
         'component_source',      'public.fn_composite_calc canonical body (not display_label)',
         'depth',                 1
       )),
       order_sensitive         = (select bool_or(comp.order_sensitive)         from public.gematria_methods comp where comp.method_key = any (c.components)),
       word_boundary_sensitive = (select bool_or(comp.word_boundary_sensitive) from public.gematria_methods comp where comp.method_key = any (c.components)),
       final_letter_sensitive  = (select bool_or(comp.final_letter_sensitive)  from public.gematria_methods comp where comp.method_key = any (c.components)),
       whitespace_normalization = coalesce(
         (select min(comp.whitespace_normalization) from public.gematria_methods comp
           where comp.method_key = any (c.components) and comp.whitespace_normalization <> 'irrelevant_pure_sum'),
         'irrelevant_pure_sum'),
       punctuation_normalization = coalesce(
         (select min(comp.punctuation_normalization) from public.gematria_methods comp
           where comp.method_key = any (c.components) and comp.punctuation_normalization <> 'irrelevant_pure_sum'),
         'irrelevant_pure_sum'),
       active    = false,
       scannable = false
  from contract c
 where gm.method_key = c.method_key
   and gm.category   = 'composite';

-- 5. SCANNABLE BACKFILL — records CURRENT live scanning behaviour, adds nothing.
--    18 of the 19 methods the old bidim_sync predicate selected. אות רבתי is
--    deliberately excluded (context_activated, 0 bidim rows — the old trigger
--    would have manufactured false rows for it on the next word insert).
--    The 5 active/in_engine=false methods stay scannable=false: that PRESERVES
--    today's behaviour exactly. Widening is a separate Human-Gate decision.
update public.gematria_methods
   set scannable = true
 where active = true
   and in_engine = true
   and "function" is not null
   and category <> 'composite'
   and execution_kind = 'sql_function';

-- 6. COMPOSITE INTEGRITY CONSTRAINT
alter table public.gematria_methods drop constraint if exists gm_composite_contract_chk;
alter table public.gematria_methods
  add constraint gm_composite_contract_chk check (
    category <> 'composite'
    or (
      operator is not null
      and execution_kind = 'composite_engine'
      and derived_from is not null
      and coalesce(array_length(derived_from, 1), 0) >= 2
      and jsonb_typeof(dependency_rules) = 'array'
      and jsonb_array_length(dependency_rules) >= 1
    )
  );

-- 7. GRANTS — rls_client_read_protocol v2 (gematria_methods uses COLUMN grants).
grant select (scannable, execution_kind, operator, dependency_versions)
  on public.gematria_methods to anon, authenticated, service_role;
