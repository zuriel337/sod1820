-- SOD1820 — Claim / Invitation Foundation Contract — PHASE 1
-- ZURIEL Human-Gate: "CLAIM/INVITATION IMPLEMENTATION AUTHORIZED" (work_log actor=CLAUDE BEFORE entry, this session).
-- Applied to the live project via apply_migration.
--
-- Approved parameters (do not change without a new Human-Gate):
--   - ONE dedicated server-only workflow table: family_claims.
--   - Invitation token: default 7 days, HARD MAXIMUM 30 days (enforced both in the RPC and as a
--     table CHECK constraint — defense in depth, not application-logic-only).
--   - Token is high-entropy (32 random bytes via pgcrypto gen_random_bytes), one-time, revocable;
--     the RAW token is NEVER stored — only its sha256 hash (pgcrypto digest).
--   - Claim approval grants ZERO research_objects access and performs ZERO publication. Nothing in
--     this file touches research_objects grants/RLS/policies. A future, separate, explicit
--     ShareGrant contract object is required before any claimant ever reads owner A's private
--     family material — not built here.
--   - Hard separation preserved: this file implements CLAIM IDENTITY only. Confirm-relation,
--     family-share, and public-publish remain future contract objects, not built here.
--   - OD-F8 out of scope: zero writes to nodes/edges anywhere in this file.
--
-- PHASE 1 (this file): the table + fn_create_family_invitation + fn_redeem_family_invitation +
--   fn_submit_family_claim_request ONLY. fn_review_family_claim / fn_revoke_family_claim /
--   fn_reverse_family_claim / fn_get_family_claim_status are PHASE 2 — gated on Phase 1 tests
--   passing, not created by this file.
--
-- Live schema facts re-verified fresh this session before writing this file:
--   no family_claims table exists; none of the 7 proposed function names exist (clean slate).
--   persons.person_id is the PK (confirmed via pg_constraint).
--   pgcrypto extension is installed (gen_random_bytes/digest available).
--   research_objects.kind CHECK / owner_person_id / source_ref conventions (F-1b slice, prior
--   session) are reused for validating target_ref, never mutated by anything here.

create table public.family_claims (
  id                 uuid primary key default gen_random_uuid(),
  flow               text not null check (flow in ('invitation','request')),
  status             text not null default 'pending'
                       check (status in ('pending','approved','rejected','revoked','reversed')),
  target_ref         text not null,
  issuer_owner_id    uuid references public.persons(person_id) on delete set null,
  claimant_person_id uuid references public.persons(person_id) on delete set null,
  token_hash         text,
  token_expires_at   timestamptz,
  attempts           integer not null default 0,
  reviewed_by        uuid references public.persons(person_id) on delete set null,
  reviewed_at        timestamptz,
  consumed_at        timestamptz,
  meta               jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),

  constraint family_claims_invitation_fields check (
    flow <> 'invitation' or (token_hash is not null and token_expires_at is not null)
  ),
  constraint family_claims_request_fields check (
    flow <> 'request' or (token_hash is null and token_expires_at is null)
  ),
  constraint family_claims_token_ttl_check check (
    flow <> 'invitation' or token_expires_at <= created_at + interval '30 days'
  )
);

-- DB-enforced anti-hijack guarantee: at most one active (pending/approved) claim per target_ref.
-- A second concurrent claimant hits a unique-violation, translated by the RPC into an explicit
-- "arbitration required" error — never silent first-come-first-served.
create unique index family_claims_target_active_uq
  on public.family_claims (target_ref) where status in ('pending','approved');

create unique index family_claims_token_hash_uq
  on public.family_claims (token_hash) where token_hash is not null;

create index family_claims_target_ref_idx on public.family_claims (target_ref);

create index family_claims_claimant_idx
  on public.family_claims (claimant_person_id) where claimant_person_id is not null;

alter table public.family_claims enable row level security;
-- Zero policies, zero client grants — identical posture to research_objects/wa_link_codes.
-- Access is only through the SECURITY DEFINER functions below.
revoke all on public.family_claims from public, anon, authenticated;

-- ============================================================================
-- fn_create_family_invitation — owner mints a one-time high-entropy invitation
-- ============================================================================
create or replace function public.fn_create_family_invitation(
  p_owner      uuid,
  p_target_ref text,
  p_ttl_days   integer default 7
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid    uuid := auth.uid();
  v_admin  boolean;
  v_owner  boolean;
  v_exists boolean;
  v_ttl    integer;
  v_raw    text;
  v_hash   text;
  v_id     uuid;
  v_expires timestamptz;
begin
  if p_owner is null then raise exception 'missing owner'; end if;
  if coalesce(nullif(p_target_ref, ''), '') = '' then raise exception 'missing target_ref'; end if;

  v_admin := exists (select 1 from public.users   u  where u.id = v_uid and u.role = 'admin');
  v_owner := exists (select 1 from public.persons pr where pr.person_id = p_owner and pr.account_user_id = v_uid);
  if not (v_admin or v_owner) then
    raise exception 'not authorized: caller must be admin or the profile owner';
  end if;

  -- target_ref must be an existing family-member identity-RO owned by p_owner (never a :self ref —
  -- inviting someone to claim the owner's own self identity is not a meaningful operation).
  v_exists := exists (
    select 1 from public.research_objects
     where owner_person_id = p_owner and kind = 'observation'
       and source_ref = p_target_ref
       and source_ref like 'person:' || p_owner::text || ':p:%'
  );
  if not v_exists then
    raise exception 'unknown or invalid target_ref for this owner (must be an existing family member, not self): %', p_target_ref;
  end if;

  -- hard maximum 30 days, minimum 1 day, default 7 — enforced here AND by the table CHECK.
  v_ttl := least(greatest(coalesce(p_ttl_days, 7), 1), 30);
  v_expires := now() + make_interval(days => v_ttl);

  v_raw  := encode(extensions.gen_random_bytes(32), 'hex');
  v_hash := encode(extensions.digest(v_raw, 'sha256'), 'hex');

  insert into public.family_claims
    (flow, status, target_ref, issuer_owner_id, token_hash, token_expires_at)
  values
    ('invitation', 'pending', p_target_ref, p_owner, v_hash, v_expires)
  returning id into v_id;

  -- the RAW token is returned exactly once, here, and never persisted anywhere.
  return jsonb_build_object('id', v_id, 'token', v_raw, 'target_ref', p_target_ref, 'expires_at', v_expires);
end;
$$;

revoke all on function public.fn_create_family_invitation(uuid, text, integer) from public;
grant execute on function public.fn_create_family_invitation(uuid, text, integer) to authenticated;

-- ============================================================================
-- fn_redeem_family_invitation — authenticated claimant redeems a raw token
-- ============================================================================
create or replace function public.fn_redeem_family_invitation(p_raw_token text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid    uuid := auth.uid();
  v_hash   text;
  v_row    public.family_claims%rowtype;
  v_claimant uuid;
begin
  if v_uid is null then
    raise exception 'not authorized: authenticated claimant required';
  end if;
  if coalesce(nullif(p_raw_token, ''), '') = '' then
    raise exception 'missing token';
  end if;

  v_hash := encode(extensions.digest(p_raw_token, 'sha256'), 'hex');

  select * into v_row from public.family_claims
   where token_hash = v_hash and flow = 'invitation'
   for update;

  if not found then
    raise exception 'invalid token';
  end if;

  update public.family_claims set attempts = attempts + 1 where id = v_row.id;

  if v_row.status = 'revoked' then
    raise exception 'token has been revoked';
  end if;
  if v_row.status <> 'pending' then
    raise exception 'token already used';
  end if;
  if v_row.token_expires_at <= now() then
    raise exception 'token has expired';
  end if;

  select person_id into v_claimant from public.persons where account_user_id = v_uid limit 1;
  if v_claimant is null then
    raise exception 'no linked identity for the authenticated caller';
  end if;

  update public.family_claims
     set status = 'approved',
         claimant_person_id = v_claimant,
         consumed_at = now()
   where id = v_row.id;

  return jsonb_build_object('id', v_row.id, 'target_ref', v_row.target_ref, 'status', 'approved');
end;
$$;

revoke all on function public.fn_redeem_family_invitation(text) from public;
grant execute on function public.fn_redeem_family_invitation(text) to authenticated;

-- ============================================================================
-- fn_submit_family_claim_request — fallback path when no valid invitation exists
-- ============================================================================
create or replace function public.fn_submit_family_claim_request(
  p_target_ref text,
  p_note       text default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid      uuid := auth.uid();
  v_claimant uuid;
  v_issuer   uuid;
  v_id       uuid;
begin
  if v_uid is null then
    raise exception 'not authorized: authenticated claimant required';
  end if;
  if coalesce(nullif(p_target_ref, ''), '') = '' then
    raise exception 'missing target_ref';
  end if;

  select owner_person_id into v_issuer
    from public.research_objects
   where kind = 'observation' and source_ref = p_target_ref
     and source_ref like 'person:%:p:%'
   limit 1;

  if v_issuer is null then
    raise exception 'unknown or invalid target_ref (must be an existing family member, not self): %', p_target_ref;
  end if;

  select person_id into v_claimant from public.persons where account_user_id = v_uid limit 1;
  if v_claimant is null then
    raise exception 'no linked identity for the authenticated caller';
  end if;

  insert into public.family_claims
    (flow, status, target_ref, issuer_owner_id, claimant_person_id, meta)
  values
    ('request', 'pending', p_target_ref, v_issuer, v_claimant,
     case when p_note is not null then jsonb_build_object('note', p_note) else '{}'::jsonb end)
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'target_ref', p_target_ref, 'status', 'pending');
end;
$$;

revoke all on function public.fn_submit_family_claim_request(text, text) from public;
grant execute on function public.fn_submit_family_claim_request(text, text) to authenticated;
