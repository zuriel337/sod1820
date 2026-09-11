-- W2.2b · ADDITIVE extension of the EXISTING public.fn_number_lookup(bigint).
-- Owners: canonical_methods_registry_law v4 + engine_governance_registry_authority_law v2 (bidim row
-- identity/provenance) + the existing public Number lookup contract. EXTEND_EXISTING only —
-- there is deliberately NO fn_number_lookup_v2 and no parallel Number lookup RPC.
--
-- WHY: the Number -> Universal Finding adapter (W2.2b) must key a Finding on SOURCE-NATIVE STABLE
-- IDENTITY. Before this migration the lookup contract exposed only method/phrase/value plus a
-- formatted `provenance` STRING, so the only available identity was label+value+prose — exactly the
-- label-keyed identity the Universal Finding contract forbids. public.bidim already carries the real
-- identity and provenance (bid_id unique, word_id, method_version, dependency_version_snapshot,
-- engine_run_id/computed_at, verified_run_id/verified_at/verified_method_version/
-- verified_mismatch_value); the lookup simply never projected them.
--
-- ADDITIVE CONTRACT: all 27 pre-existing output columns keep their names, types and ORDER. Ten new
-- columns are appended at the end, so existing callers (src/lib/supabase.js getNumberLookup(),
-- src/lib/research/numericResearch.js, NumberFamilies) are unaffected — PostgREST returns JSON
-- objects, and extra keys are ignored by every live caller. A return-type change requires
-- DROP + CREATE; both run inside one migration transaction, so there is no window where the
-- function is missing.
--
-- DETERMINISTIC TOTAL ORDER: the existing "Rank, Don't Hide" governed-first ordering is preserved
-- verbatim and only EXTENDED with b.bid_id as a final tiebreaker. Without a total order, bounded
-- output + continuation (W2.2b) could silently skip or repeat rows between pages, because
-- (governed, composite, method, phrase) is NOT unique — one phrase can hold several bidim rows for
-- the same method across provenance/verification generations.
--
-- No data is written. No grant is widened (the same anon/authenticated/service_role execute grant
-- that the function already had is re-applied after the required DROP).

drop function if exists public.fn_number_lookup(bigint);

create function public.fn_number_lookup(p_value bigint)
returns table(
  method text,
  phrase text,
  value bigint,
  source text,
  vip_source text,
  is_verified boolean,
  dna_status text,
  node_id uuid,
  category text,
  tags text[],
  mathematical_family text,
  order_sensitive boolean,
  word_boundary_sensitive boolean,
  final_letter_sensitive boolean,
  atomic_or_composite text,
  component_methods text[],
  component_values bigint[],
  operator text,
  provenance text,
  method_evidence_class text,
  method_governed boolean,
  method_active boolean,
  method_scannable boolean,
  method_executable boolean,
  method_engine_verified boolean,
  row_provenance_state text,
  -- ── W2.2b additive block: canonical bidim row identity + run/dependency/verification provenance ──
  bid_id text,
  word_id uuid,
  method_version integer,
  dependency_version_snapshot jsonb,
  computed_at timestamptz,
  engine_run_id uuid,
  verified_at timestamptz,
  verified_run_id uuid,
  verified_method_version integer,
  verified_mismatch_value bigint
)
language plpgsql
stable
set search_path to 'public'
as $function$
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
         -- governance state, straight from the canonical authority (HG-E4)
         public.fn_method_evidence_class(b.method),
         public.fn_method_is_governed_evidence(b.method),
         gm.active,
         gm.scannable,
         public.fn_method_is_executable(b.method),
         public.fn_method_is_engine_verified(b.method),
         b.provenance_state,
         -- W2.2b: the row's own canonical identity and provenance, projected as-is. These are NOT
         -- recomputed, reinterpreted or defaulted here — an absent value stays honestly null.
         b.bid_id,
         b.word_id,
         b.method_version,
         b.dependency_version_snapshot,
         b.computed_at,
         b.engine_run_id,
         b.verified_at,
         b.verified_run_id,
         b.verified_method_version,
         b.verified_mismatch_value
  from public.bidim b
  join public.gematria_words gw on gw.id = b.word_id
  left join public.gematria_methods gm on gm.method_key = b.method
  where b.value = p_value
    and gw.is_verified = true
  -- governed results first, then historical — Rank, Don't Hide.
  -- b.bid_id closes the order into a TOTAL order so bounded windows/continuation are stable.
  order by (not public.fn_method_is_governed_evidence(b.method)),
           (gm.category = 'composite'), b.method, b.phrase, b.bid_id;
end;
$function$;

comment on function public.fn_number_lookup(bigint) is
  'Canonical public Number lookup. Governed-first "Rank, Don''t Hide" ordering, closed into a TOTAL '
  'order by bid_id so bounded windows and continuation are stable. W2.2b appended the canonical bidim '
  'row identity and provenance (bid_id/word_id/method_version/dependency_version_snapshot/'
  'computed_at/engine_run_id/verified_at/verified_run_id/verified_method_version/'
  'verified_mismatch_value) so a Universal Finding can be keyed on source-native identity rather than '
  'on label+value. Additive only: the 27 original columns are unchanged in name, type and order. '
  'This is the ONLY Number lookup contract — no v2, no parallel RPC.';

grant execute on function public.fn_number_lookup(bigint) to anon, authenticated, service_role;
