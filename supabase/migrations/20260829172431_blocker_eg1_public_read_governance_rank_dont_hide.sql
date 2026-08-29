-- BLOCKER-EG-1 CLOSURE — PUBLIC READ GOVERNANCE · RANK, DON'T HIDE
-- ZURIEL Human-Gate HG-E4: PUBLIC ACCESS != GOVERNED EVIDENCE.
--   SCANNABLE=false != INVISIBLE.  PUBLIC=true != CANONICAL/WEIGHTED EVIDENCE.
-- Proof pass that raised the blocker: work_log 40c7474d-fff1-4001-bdab-394179918276.
-- BEFORE row: work_log 4a092eb3-bcf7-4e2a-b2e4-c0209694ec55.
--
-- The public read path now inherits the SAME canonical gematria_methods law as the
-- write path. NO row is hidden, NO row is deleted, NO second registry is created,
-- NO method name is hardcoded. Historical results stay discoverable — they simply
-- stop being semantically indistinguishable from currently governed results, and
-- stop counting as canonical weighted convergence evidence.
--
-- NOTE: the convergence_meter body created here is superseded later in the same
-- pass by 20260829172529 (temp table -> single CTE query, to keep it truly STABLE).

-- 1. THE GOVERNED-EVIDENCE CONTRACT (one new named primitive, one law underneath)
create or replace function public.fn_method_evidence_class(p_method_key text)
returns text language plpgsql stable set search_path to 'public' as $$
declare m public.gematria_methods%rowtype;
begin
  select * into m from public.gematria_methods where method_key = p_method_key;
  if not found then return 'unregistered'; end if;
  if public.fn_method_is_scannable(p_method_key) then return 'governed'; end if;
  if not public.fn_method_is_executable(p_method_key) then return 'historical_unexecutable'; end if;
  if not m.active then return 'historical_ungoverned'; end if;
  if not public.fn_method_is_engine_verified(p_method_key) then return 'historical_unverified'; end if;
  return 'historical_public';
end;
$$;

comment on function public.fn_method_evidence_class(text) is
  'Canonical PROJECTION classification of a method result (HG-E4). governed = currently governed/scannable. historical_public = active+executable+verified but the Human Gate has not opened corpus scanning. historical_ungoverned = method not admitted by the Human Gate (active=false). historical_unverified / historical_unexecutable = engine cannot currently stand behind it. unregistered = a bidim row for a method the registry does not know. Derived entirely from fn_method_is_scannable / fn_method_is_executable / fn_method_is_engine_verified — NOT a second authority.';

create or replace function public.fn_method_is_governed_evidence(p_method_key text)
returns boolean language sql stable set search_path to 'public' as $$
  select public.fn_method_evidence_class(p_method_key) = 'governed';
$$;

comment on function public.fn_method_is_governed_evidence(text) is
  'Governed-evidence eligibility for canonical weighted convergence. Deliberately identical to fn_method_is_scannable (scannable AND active AND executable AND engine_verified) so the public read path inherits exactly the law that gates future writes. Eligibility for SCORING only — it never controls visibility (HG-E4: Rank, Don''t Hide).';

grant execute on function public.fn_method_evidence_class(text)       to anon, authenticated, service_role;
grant execute on function public.fn_method_is_governed_evidence(text) to anon, authenticated, service_role;

-- 2. PUBLIC LOOKUP CONTRACT — fn_number_lookup projects governance state.
-- Output columns are APPENDED; every pre-existing column keeps its name, type and
-- position, so existing clients are unaffected. Rows are NOT filtered.
drop function if exists public.fn_number_lookup(bigint);
create function public.fn_number_lookup(p_value bigint)
returns table(method text, phrase text, value bigint, source text, vip_source text,
              is_verified boolean, dna_status text, node_id uuid, category text, tags text[],
              mathematical_family text, order_sensitive boolean, word_boundary_sensitive boolean,
              final_letter_sensitive boolean, atomic_or_composite text, component_methods text[],
              component_values bigint[], operator text, provenance text,
              method_evidence_class text, method_governed boolean, method_active boolean,
              method_scannable boolean, method_executable boolean, method_engine_verified boolean,
              row_provenance_state text)
language plpgsql stable set search_path to 'public' as $$
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
         format('bidim(method=%s,value=%s) joined gematria_words(id=%s) joined gematria_methods registry (execution_kind=%s, operator=%s, evidence_class=%s)',
                b.method, b.value, gw.id, gm.execution_kind, coalesce(gm.operator, '-'),
                public.fn_method_evidence_class(b.method)),
         public.fn_method_evidence_class(b.method),
         public.fn_method_is_governed_evidence(b.method),
         gm.active,
         gm.scannable,
         public.fn_method_is_executable(b.method),
         public.fn_method_is_engine_verified(b.method),
         b.provenance_state
  from public.bidim b
  join public.gematria_words gw on gw.id = b.word_id
  left join public.gematria_methods gm on gm.method_key = b.method
  where b.value = p_value
    and gw.is_verified = true
  order by (not public.fn_method_is_governed_evidence(b.method)),
           (gm.category = 'composite'), b.method, b.phrase;
end;
$$;

comment on function public.fn_number_lookup(bigint) is
  'Public number-page projection over bidim. HG-E4: returns governed AND historical results (nothing is hidden or deleted), but every row now carries its canonical governance state — method_evidence_class / method_governed / method_active / method_scannable / method_executable / method_engine_verified / row_provenance_state — so Projection can never mistake a persisted historical result for a currently governed one. Governed rows are ranked first.';

grant execute on function public.fn_number_lookup(bigint) to anon, authenticated, service_role;

-- 3. A GOVERNED PHRASE-LIST PROJECTION (value family / מסע ההתכנסות).
-- Replaces the client's raw `select phrase from bidim where value = X` (no method
-- filter, no governance signal). Superseded later by 20260829172959 (explicit rank).
create or replace function public.fn_value_phrase_list(p_value bigint, p_limit int default 240)
returns table(phrase text, governed boolean, best_evidence_class text,
              governed_methods text[], historical_methods text[])
language sql stable set search_path to 'public' as $$
  select b.phrase,
         bool_or(public.fn_method_is_governed_evidence(b.method))                             as governed,
         case when bool_or(public.fn_method_is_governed_evidence(b.method)) then 'governed'
              else min(public.fn_method_evidence_class(b.method)) end                          as best_evidence_class,
         array_agg(distinct b.method order by b.method)
           filter (where public.fn_method_is_governed_evidence(b.method))                      as governed_methods,
         array_agg(distinct b.method order by b.method)
           filter (where not public.fn_method_is_governed_evidence(b.method))                  as historical_methods
  from public.bidim b
  where b.value = p_value
  group by b.phrase
  order by bool_or(public.fn_method_is_governed_evidence(b.method)) desc, b.phrase
  limit p_limit;
$$;

grant execute on function public.fn_value_phrase_list(bigint, int) to anon, authenticated, service_role;

-- 4. CANONICAL WEIGHTED CONVERGENCE — convergence_meter.
-- Required order enforced: PUBLIC/DISCOVERABLE RESULTS -> GOVERNANCE ELIGIBILITY
-- -> INDEPENDENCE/DEPENDENCY -> CONVERGENCE SCORE.
-- Previously: all bidim rows -> distinct(method) -> score.
-- (This body is replaced by 20260829172529 — see the note at the top of this file.)
