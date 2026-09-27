-- SOD1820 — Zvi standing Research approval v1
-- Human Gate: ZURIEL, 2026-09-27
-- Owner: writer_material_home_law v4 -> v5
-- Scope: Governance approval only. Verification, canonicalization, publication and Topic admission remain separate.
-- Root-of-Trust: exact canonical contributor/user ids and source-backed channel_updates identity.
-- No new table/store/graph/engine.

-- 1) Extend the existing Writer / Contributor owner. Do not create a Zvi-specific owner.
insert into public.nodes
  (type, label, description, metadata, is_active, rule_id, rule_version, depends_on, supersedes_version, weight)
select
  'rule',
  'Writer / Contributor Material Home v5 — Standing Research Approval',
  n.description || E'

[UPDATE v5 · Human-Gate ZURIEL · 27.9.2026 — ZVI STANDING RESEARCH APPROVAL · EXTEND_EXISTING]

27. STANDING HUMAN-GATE APPROVAL — ZVI. ZURIEL explicitly grants standing GOVERNANCE approval to research material authored by the canonical contributor identity Zvi (OPOC), contributor_id=c66f0464-0928-490e-be9b-66d8a87e7fc8, user_id=24be4fb3-59f2-4cdf-ad86-47d8a43f274e. New Zvi research may transition automatically from candidate/pending/hidden to approved when provenance resolves through an immutable-to-client canonical identity boundary.

28. ROOT-OF-TRUST REQUIRED. A free-text contributor name is insufficient. Automatic approval is permitted only when the source resolves through (a) channel_updates:<uuid> whose canonical channel_updates.credit is Zvi (OPOC), or (b) a research_contributions row whose author_contributor_id/user_id matches the exact canonical Zvi identity, or (c) direct research_contributions insertion carrying that exact contributor/user identity. Unknown/unresolved authorship remains unapproved.

29. APPROVED != VERIFIED != CANONICAL != PUBLISHED. Standing approval mutates only the Governance axis. It MUST NOT fabricate engine_verified=true or verification_state=match, overwrite mismatch/method_unknown/not_tested, canonicalize a Research Object, publish/access-widen a private source, create a Topic/Convergence, or mint graph truth. Existing engine/source verification and Topic admission contracts remain authoritative.

30. SOURCE FIDELITY PRESERVED. Raw channel/source text and media remain source-of-record. Failed extraction may still produce an approved source observation under this standing authorization; later deterministic/AI extraction adds typed Findings without rewriting the source.

31. SAME SYSTEM, SPECIAL GOVERNANCE DECISION. This does not create a Zvi engine, Zvi graph, Zvi Research OS, writer-specific ontology or parallel lifecycle. It is a named Human-Gate authorization predicate consumed by the existing Research Intake / Research Contributions lifecycle.',
  coalesce(n.metadata,'{}'::jsonb) || jsonb_build_object(
    'change','ZVI_STANDING_RESEARCH_APPROVAL',
    'locked_at','2026-09-27',
    'human_gate','ZURIEL',
    'zvi_contributor_id','c66f0464-0928-490e-be9b-66d8a87e7fc8',
    'zvi_user_id','24be4fb3-59f2-4cdf-ad86-47d8a43f274e',
    'governance_only',true,
    'verification_unchanged',true,
    'canonicalization_unchanged',true,
    'publication_unchanged',true
  ),
  true,
  'writer_material_home_law',
  5,
  n.depends_on,
  4,
  coalesce(n.weight,1)
from public.nodes n
where n.type='rule'
  and n.rule_id='writer_material_home_law'
  and n.rule_version=4
  and not exists (
    select 1 from public.nodes x
    where x.type='rule' and x.rule_id='writer_material_home_law' and x.rule_version=5
  )
limit 1;

-- 2) Research Objects: auto-approve only when source provenance resolves to canonical Zvi identity.
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
          and cu.credit = 'צבי (OPOC)'
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

drop trigger if exists trg_00_zvi_standing_approve_research_object on public.research_objects;
create trigger trg_00_zvi_standing_approve_research_object
before insert or update of status, source_ref
on public.research_objects
for each row
execute function public.fn_zvi_standing_approve_research_object();

-- 3) Research Contributions: exact canonical contributor/user identity only.
create or replace function public.fn_zvi_standing_approve_research_contribution()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  if new.status in ('pending','hidden')
     and (
       new.author_contributor_id = 'c66f0464-0928-490e-be9b-66d8a87e7fc8'::uuid
       or new.author_user_id = '24be4fb3-59f2-4cdf-ad86-47d8a43f274e'::uuid
     )
  then
    new.status := 'approved';
    -- research_state is maturity, not moderation; preserve it exactly.
  end if;
  return new;
end;
$$;

revoke all on function public.fn_zvi_standing_approve_research_contribution() from public;
revoke all on function public.fn_zvi_standing_approve_research_contribution() from anon;
revoke all on function public.fn_zvi_standing_approve_research_contribution() from authenticated;

drop trigger if exists trg_00_zvi_standing_approve_research_contribution on public.research_contributions;
create trigger trg_00_zvi_standing_approve_research_contribution
before insert or update of status, author_contributor_id, author_user_id
on public.research_contributions
for each row
execute function public.fn_zvi_standing_approve_research_contribution();

-- 4) Close race window between the Human-Gate decision and trigger installation.
update public.research_objects ro
set status='approved',
    meta = coalesce(ro.meta,'{}'::jsonb) || jsonb_build_object(
      'governance',
      coalesce(ro.meta->'governance','{}'::jsonb) || jsonb_build_object(
        'standing_approval', true,
        'standing_approval_rule', 'writer_material_home_law v5',
        'standing_approval_subject', 'c66f0464-0928-490e-be9b-66d8a87e7fc8',
        'human_gate', 'ZURIEL',
        'approved_at', now(),
        'verification_preserved', true,
        'canonicalized', false,
        'published', false
      )
    )
where ro.status='candidate'
  and ro.source_ref ~* '^channel_updates:[0-9a-f-]{36}'
  and exists (
    select 1
    from public.channel_updates cu
    where cu.id = substring(ro.source_ref from '^channel_updates:([0-9a-fA-F-]{36})')::uuid
      and cu.credit='צבי (OPOC)'
  );

update public.research_contributions rc
set status='approved',
    updated_at=now()
where rc.status in ('pending','hidden')
  and (
    rc.author_contributor_id='c66f0464-0928-490e-be9b-66d8a87e7fc8'::uuid
    or rc.author_user_id='24be4fb3-59f2-4cdf-ad86-47d8a43f274e'::uuid
  );

comment on function public.fn_zvi_standing_approve_research_object() is
  'Human-Gate ZURIEL standing governance approval for source-backed canonical Zvi research. Governance only: never changes verification, canonicality, publication/access or Topic admission. writer_material_home_law v5.';

comment on function public.fn_zvi_standing_approve_research_contribution() is
  'Human-Gate ZURIEL standing governance approval for exact canonical Zvi contributor/user identity. Preserves research_state maturity and all verification/publication axes. writer_material_home_law v5.';
