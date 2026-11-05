-- Account link offers (consent-based account unification, phase 1) — ZURIEL 5.11.2026.
-- HISTORICAL link only: this never touches auth.users, credentials, sessions, billing or notifications.
-- * An offer exists only because ZURIEL (owner / Human Gate) asserted that two Auth accounts belong to one person.
-- * The offer is shown ONLY to the exact secondary account that is signed in (auth.uid() = secondary_user_id): no enumeration,
--   no lookup by name/photo/IP/device, the primary account is never returned to the secondary before proof.
-- * Proof of control of BOTH accounts is checked by the `account-link-confirm` Edge function (two verified tokens) and a
--   single-use, short-lived, hashed nonce issued to the secondary session. Everything is audited in an append-only ledger.
begin;

create table if not exists public.account_link_offers (
  id uuid primary key default gen_random_uuid(),
  primary_user_id uuid not null references auth.users(id) on delete restrict,
  secondary_user_id uuid not null references auth.users(id) on delete restrict,
  basis text not null check (basis in ('owner_assertion')),
  asserted_by text not null,
  asserted_at timestamptz not null default now(),
  note text,
  state text not null default 'offered' check (state in ('offered','dismissed','verified','revoked')),
  dismissed_at timestamptz,
  verified_at timestamptz,
  nonce_hash text,
  nonce_expires_at timestamptz,
  created_at timestamptz not null default now(),
  check (primary_user_id <> secondary_user_id),
  unique (secondary_user_id)
);
alter table public.account_link_offers enable row level security;
revoke all on public.account_link_offers from public, anon, authenticated;
-- No policies on purpose: fail closed. Access is only through the SECURITY DEFINER functions below.

create table if not exists public.account_link_events (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.account_link_offers(id) on delete restrict,
  actor_user_id uuid,
  event text not null check (event in ('seeded','offered_shown','dismissed','nonce_issued','confirm_rejected','verified','revoked')),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.account_link_events enable row level security;
revoke all on public.account_link_events from public, anon, authenticated;
create or replace function public.account_link_events_append_only() returns trigger language plpgsql as $$
begin raise exception 'account_link_events is append-only'; end $$;
drop trigger if exists account_link_events_no_update on public.account_link_events;
create trigger account_link_events_no_update before update or delete on public.account_link_events
  for each row execute function public.account_link_events_append_only();

-- 1) What the signed-in account may see: only whether an offer for ITSELF exists. Never the other account.
create or replace function public.account_link_offer_v1()
returns table(offer_id uuid, state text)
language sql stable security definer set search_path to 'public', 'pg_temp'
as $$
  select o.id, o.state from public.account_link_offers o
   where o.secondary_user_id = auth.uid() and auth.uid() is not null and o.state = 'offered';
$$;

-- 2) "Not now": recorded once; the offer is not re-shown.
create or replace function public.account_link_dismiss_v1(p_offer uuid)
returns boolean
language plpgsql security definer set search_path to 'public', 'pg_temp'
as $$
declare done int;
begin
  if auth.uid() is null then return false; end if;
  update public.account_link_offers set state = 'dismissed', dismissed_at = now(), nonce_hash = null, nonce_expires_at = null
   where id = p_offer and secondary_user_id = auth.uid() and state = 'offered';
  get diagnostics done = row_count;
  if done = 1 then insert into public.account_link_events(offer_id, actor_user_id, event) values (p_offer, auth.uid(), 'dismissed'); end if;
  return done = 1;
end $$;

-- 3) Nonce for the confirmation, issued to the secondary session only; 10 minutes, single use, stored hashed.
create or replace function public.account_link_begin_v1(p_offer uuid)
returns text
language plpgsql security definer set search_path to 'public', 'pg_temp'
as $$
declare nonce text;
begin
  if auth.uid() is null then return null; end if;
  nonce := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  update public.account_link_offers
     set nonce_hash = encode(sha256(convert_to(nonce, 'utf8')), 'hex'), nonce_expires_at = now() + interval '10 minutes'
   where id = p_offer and secondary_user_id = auth.uid() and state = 'offered';
  if not found then return null; end if;
  insert into public.account_link_events(offer_id, actor_user_id, event) values (p_offer, auth.uid(), 'nonce_issued');
  return nonce;
end $$;

-- 4) Service-only confirmation, called by the Edge function AFTER it verified both Auth tokens.
--    Atomic and idempotent: the nonce is consumed in the same statement that moves the offer to 'verified'.
create or replace function public.account_link_confirm_v1(p_offer uuid, p_secondary uuid, p_primary uuid, p_nonce text)
returns text
language plpgsql security definer set search_path to 'public', 'pg_temp'
as $$
declare o public.account_link_offers%rowtype;
begin
  select * into o from public.account_link_offers where id = p_offer for update;
  if not found or o.secondary_user_id <> p_secondary or o.primary_user_id <> p_primary then
    if found then insert into public.account_link_events(offer_id, actor_user_id, event, detail) values (p_offer, p_secondary, 'confirm_rejected', '{"reason":"pair"}'); end if;
    return 'rejected';
  end if;
  if o.state = 'verified' then return 'already_verified'; end if;                -- idempotent
  if o.state <> 'offered' or o.nonce_hash is null or o.nonce_expires_at < now()
     or o.nonce_hash <> encode(sha256(convert_to(coalesce(p_nonce,''), 'utf8')), 'hex') then
    insert into public.account_link_events(offer_id, actor_user_id, event, detail) values (p_offer, p_secondary, 'confirm_rejected', '{"reason":"state_or_nonce"}');
    return 'rejected';
  end if;
  update public.account_link_offers set state = 'verified', verified_at = now(), nonce_hash = null, nonce_expires_at = null where id = p_offer;
  insert into public.account_link_events(offer_id, actor_user_id, event, detail) values (p_offer, p_secondary, 'verified', jsonb_build_object('primary', p_primary));
  return 'verified';
end $$;

revoke all on function public.account_link_offer_v1() from public, anon;
revoke all on function public.account_link_dismiss_v1(uuid) from public, anon;
revoke all on function public.account_link_begin_v1(uuid) from public, anon;
revoke all on function public.account_link_confirm_v1(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.account_link_offer_v1() to authenticated;
grant execute on function public.account_link_dismiss_v1(uuid) to authenticated;
grant execute on function public.account_link_begin_v1(uuid) to authenticated;
grant execute on function public.account_link_confirm_v1(uuid, uuid, uuid, text) to service_role;

commit;
