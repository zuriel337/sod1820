-- COMPOSITE FOUNDATION PATCH — part 1/3: provenance vocabulary + commutative composition identity
-- Closes the structural half of BLOCKER-CA-1 and installs the composition-identity
-- extension point required before any future composite registration (e.g. רגיל+אתבש).
-- Read-only pre-activation gate that found these: work_log b80f9e6a-05a8-4a9a-94cf-16fda377b4a0.
-- BEFORE row: work_log f115f276-349a-4dba-8731-f2d5bc3a2978.
-- Additive only. No activation. No new composite registered. No parallel store.

-- 1. PROVENANCE VOCABULARY — additive third state.
-- 'legacy_verified' = a pre-governance row whose value has been VERIFIED identical to the
-- current governed engine AND whose identity has been migrated to the canonical fn_bidim_id
-- law. It is deliberately NOT 'governed': that would fabricate provenance, since the row was
-- not written by a governed engine run. A later real governed run upgrades it in place.
alter table public.bidim drop constraint if exists bidim_provenance_state_chk;
alter table public.bidim
  add constraint bidim_provenance_state_chk
  check (provenance_state in ('governed', 'legacy_unknown', 'legacy_verified')) not valid;
alter table public.bidim validate constraint bidim_provenance_state_chk;

comment on column public.bidim.provenance_state is
  'governed = written by the scannable-gated engine with full provenance. legacy_verified = pre-governance row whose stored value was verified identical to the current governed engine and whose bid_id was migrated to the canonical fn_bidim_id identity (value proven, but NOT produced by a governed run). legacy_unknown = pre-governance row whose producing run cannot be reconstructed; left explicitly unknown rather than back-filled with fabricated metadata.';

-- 2. COMMUTATIVE COMPOSITION IDENTITY — the extension point.
-- One registered composition = one canonical identity. For a commutative operator the
-- component multiset is order-independent, so רגיל+אתבש and אתבש+רגיל are THE SAME
-- composition and must not be registrable as two method_keys. Sorting is collation-stable
-- ("C") so the expression is genuinely IMMUTABLE and safe to index.
create or replace function public.fn_composition_identity(p_operator text, p_derived_from text[])
returns text language sql immutable as $$
  select case
    when p_operator is null or p_derived_from is null then null
    -- commutative operators: normalise the component multiset
    when p_operator in ('sum') then
      p_operator || ':' || array_to_string(
        array(select x from unnest(p_derived_from) as t(x) order by x collate "C"), E'\x1f')
    -- non-commutative operators: component ORDER is load-bearing, keep as declared
    else
      p_operator || ':' || array_to_string(p_derived_from, E'\x1f')
  end;
$$;

comment on function public.fn_composition_identity(text, text[]) is
  'Canonical composition identity for a registered composite. For commutative operators (currently sum) the component multiset is normalised by collation-stable sort, so רגיל+אתבש and אתבש+רגיל resolve to ONE identity and cannot both be registered. For non-commutative operators component order is preserved because it is load-bearing. IMMUTABLE and index-safe. This is an identity rule only — it neither adds operators nor registers anything.';

drop index if exists public.gm_composition_identity_uidx;
create unique index gm_composition_identity_uidx
  on public.gematria_methods (public.fn_composition_identity(operator, derived_from))
  where category = 'composite';

comment on index public.gm_composition_identity_uidx is
  'Structurally prevents duplicate composite identities: two method_keys can never carry the same commutative composition (same operator + same component multiset). Required before any new composite registration, e.g. רגיל+אתבש.';

grant execute on function public.fn_composition_identity(text, text[]) to anon, authenticated, service_role;
