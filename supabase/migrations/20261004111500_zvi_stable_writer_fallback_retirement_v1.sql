-- ZVI_STABLE_WRITER_FALLBACK_RETIREMENT_V1 — retire legacy credit-text fallback in standing approval.
-- Owner: writer_material_home_law v5 (EXTEND_EXISTING). Human Gate: ZURIEL. BRANCH_ONLY: not applied to live DB.
-- Precondition (live evidence, 2026-10-04): 682/682 channel_updates rows with credit 'צבי (OPOC)' have contributor_id bound; 0 NULL.
-- Effect: channel_updates authorize only by stable contributor_id = Zvi; contributor_id NULL stays candidate regardless of credit text.
-- research_contributions stable-ID path and governance-only semantics unchanged. No data writes; historical migrations untouched.

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
          and cu.contributor_id = 'c66f0464-0928-490e-be9b-66d8a87e7fc8'::uuid
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
  'Human-Gate ZURIEL standing governance approval for source-backed canonical Zvi research. channel_updates authorize ONLY by stable contributor_id; legacy credit-text fallback retired (contributor_id NULL stays candidate). Governance only: never changes verification, canonicality, publication/access or Topic admission. writer_material_home_law v5.';
