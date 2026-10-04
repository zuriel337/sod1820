-- ZVI_STABLE_WRITER_BINDING_V1 — stable writer identity for channel_updates.
-- Owner: writer_material_home_law v5 (EXTEND_EXISTING). Human Gate: ZURIEL. BRANCH_ONLY until independent review.
-- Scope: additive nullable channel_updates.contributor_id + standing-approval predicate by stable id.
-- Does NOT touch research_objects status/publication/canonicality or any credit text.

-- 1) Additive nullable stable writer id. NULL = unresolved/bot/ambiguous (fail-closed for stable-id paths).
alter table public.channel_updates
  add column if not exists contributor_id uuid null references public.contributors(id);

create index if not exists channel_updates_contributor_id_idx
  on public.channel_updates (contributor_id)
  where contributor_id is not null;

comment on column public.channel_updates.contributor_id is
  'Stable canonical writer identity (contributors.id). Set only on an unambiguous human alias hit by wa-channel-ingest or by the exact-scope backfill; NULL for bot/API, ambiguous or unmatched authors. credit remains historical display text.';

-- 2) Standing approval: stable id authorizes; legacy credit text is a fallback ONLY when contributor_id IS NULL.
--    An explicit other contributor_id with matching credit text cannot gain standing approval.
--    research_contributions stable-ID path is unchanged.
create or replace function public.fn_zvi_standing_approve_research_object()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_ref text;
  v_source_id uuid;
  v_contribution_id uuid;
  v_authorized boolean := false;
begin
  if new.status is distinct from 'candidate' then
    return new;
  end if;

  v_ref := coalesce(new.source_ref,'');

  -- Canonical WhatsApp/channel source.
  if v_ref ~* '^channel_updates:[0-9a-f-]{36}' then
    begin
      v_source_id := substring(v_ref from '^channel_updates:([0-9a-fA-F-]{36})')::uuid;
      select exists(
        select 1
        from public.channel_updates cu
        where cu.id = v_source_id
          and (
            cu.contributor_id = 'c66f0464-0928-490e-be9b-66d8a87e7fc8'::uuid
            or (cu.contributor_id is null and cu.credit = 'צבי (OPOC)')
          )
      ) into v_authorized;
    exception when invalid_text_representation then
      v_authorized := false;
    end;
  end if;

  -- Canonical Research Contribution source, if/when a projection uses this source_ref family.
  if not v_authorized and v_ref ~* '^research_contributions:[0-9a-f-]{36}' then
    begin
      v_contribution_id := substring(v_ref from '^research_contributions:([0-9a-fA-F-]{36})')::uuid;
      select exists(
        select 1
        from public.research_contributions rc
        where rc.id = v_contribution_id
          and (
            rc.author_contributor_id = 'c66f0464-0928-490e-be9b-66d8a87e7fc8'::uuid
            or rc.author_user_id = '24be4fb3-59f2-4cdf-ad86-47d8a43f274e'::uuid
          )
      ) into v_authorized;
    exception when invalid_text_representation then
      v_authorized := false;
    end;
  end if;

  if v_authorized then
    new.status := 'approved';
    new.meta := coalesce(new.meta,'{}'::jsonb) || jsonb_build_object(
      'governance',
      coalesce(new.meta->'governance','{}'::jsonb) || jsonb_build_object(
        'standing_approval', true,
        'standing_approval_rule', 'writer_material_home_law v5',
        'standing_approval_subject', 'c66f0464-0928-490e-be9b-66d8a87e7fc8',
        'human_gate', 'ZURIEL',
        'approved_at', now(),
        'verification_preserved', true,
        'canonicalized', false,
        'published', false
      )
    );
  end if;

  return new;
end;
$$;

revoke all on function public.fn_zvi_standing_approve_research_object() from public;
revoke all on function public.fn_zvi_standing_approve_research_object() from anon;
revoke all on function public.fn_zvi_standing_approve_research_object() from authenticated;

comment on function public.fn_zvi_standing_approve_research_object() is
  'Human-Gate ZURIEL standing governance approval for source-backed canonical Zvi research. channel_updates authorize by stable contributor_id; legacy credit fallback only when contributor_id IS NULL. Governance only: never changes verification, canonicality, publication/access or Topic admission. writer_material_home_law v5.';

-- 3) Backfill ONLY rows already authorized by current semantics (torat-haremez + exact canonical credit).
--    Not bound: 'OPOC1 OPOC1' alias rows, short 'צבי' rows, any other channel/credit.
--    Touches channel_updates.contributor_id only; no research_objects/credit/status change.
update public.channel_updates
set contributor_id = 'c66f0464-0928-490e-be9b-66d8a87e7fc8'::uuid
where channel = 'torat-haremez'
  and credit = 'צבי (OPOC)'
  and contributor_id is null
  and exists (select 1 from public.contributors where id = 'c66f0464-0928-490e-be9b-66d8a87e7fc8'::uuid);
