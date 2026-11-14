-- DRAFT — NOT APPLIED. Task MAIL_INTAKE_ZION_20261105. Branch ccr-a1575114-bitmx4.
-- Lives in scripts/sql/ (not supabase/migrations/) on purpose: it must not be picked up by any migration runner.
-- Applying it requires explicit ZURIEL approval of the exact commit. See docs/reviews/mail-intake-zion-20261105/README.md.
--
-- Scope: ADDITIVE ONLY.
--   * two new private tables: mail_source_approvals (server-owned approval list) and channel_update_mail_proof
--   * one new service-role-only RPC: admit_mail_source_held_v1
--   * does NOT touch channel_updates DDL/policies (cu_public_read stays status='live' only), the WhatsApp group-proof table
--     or its RPC, world readers, inbound_emails, or any grant of an existing object.
-- Held semantics: a mail update is inserted with status 'private' and group_source_intake_public=false. Nothing here can
-- publish; releasing a held row is a separate, later, human-gated step that is intentionally not defined in this draft.

begin;

-- 1) Server-owned approval list. First stage: Zion Siboni only. Expansion rows are planned, inactive, and commented out.
create table if not exists public.mail_source_approvals (
  contributor_id  uuid primary key references public.contributors(id) on delete restrict,
  mailbox_lc      text not null unique check (mailbox_lc = lower(mailbox_lc) and mailbox_lc ~ '^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$'),
  author_key      text not null,
  author_display  text not null,
  active          boolean not null default false,
  approved_by_ref text not null,
  approved_at     timestamptz not null default now(),
  note            text
);
alter table public.mail_source_approvals enable row level security;
revoke all on public.mail_source_approvals from public, anon, authenticated;

-- Seed reads the mailbox from contributors.email at apply time, so no address is stored in the repository.
insert into public.mail_source_approvals (contributor_id, mailbox_lc, author_key, author_display, active, approved_by_ref, note)
select c.id, lower(c.email), 'zion-siboni', 'ציון דוד סיבוני', true,
       'ZURIEL:2026-11-05:mail-intake-zion-first-stage', 'first stage only; held-only intake'
  from public.contributors c
 where c.slug = 'zion-siboni' and c.email is not null
on conflict (contributor_id) do nothing;

-- Future expansion (ZURIEL 2026-10-11 list). DO NOT ENABLE without a new explicit approval; rows would be inserted with active=false:
--   insert into public.mail_source_approvals (...) select ... from public.contributors c where c.slug in (...);
--   -- active stays false until a separate approval flips it.

-- 2) Mail proof: separate from the WhatsApp group proof, linked to channel_updates, contributors and the private inbox row.
create table if not exists public.channel_update_mail_proof (
  update_id               uuid primary key references public.channel_updates(id) on delete cascade,
  inbound_email_id        bigint not null unique references public.inbound_emails(id) on delete restrict,
  message_id              text not null unique,
  parent_ext_msg_id       text,
  parent_update_id        uuid references public.channel_updates(id) on delete set null,
  parent_basis            text check (parent_basis in ('in_reply_to', 'references')),
  thread_key              text not null,
  thread_state            text not null check (thread_state in ('root', 'parent_present', 'parent_missing')),
  identity_contributor_id uuid not null references public.contributors(id) on delete restrict,
  identity_basis          text not null check (identity_basis = 'verified_email_unique'),
  provider                text not null check (provider = 'resend'),
  provider_id             text not null,
  dkim                    text not null check (dkim = 'pass'),
  dmarc                   text not null check (dmarc = 'pass'),
  sender_mailbox_sha256   text not null check (length(sender_mailbox_sha256) = 64),
  original_text_sha256    text not null check (length(original_text_sha256) = 64),
  text_kind               text not null check (text_kind = 'original_cleaned'),
  quoted_omitted          boolean not null,
  text_truncated          boolean not null default false,
  sanitizer_version       text not null,
  image_refs              integer not null default 0 check (image_refs >= 0),
  intake_version          text not null,
  held_at                 timestamptz not null default now(),
  check (parent_basis is null or thread_state <> 'root')
);
alter table public.channel_update_mail_proof enable row level security;
revoke all on public.channel_update_mail_proof from public, anon, authenticated;

-- Guard: a mail proof may only point at a non-live, non-public email update owned by the same contributor.
create or replace function public.channel_update_mail_proof_guard_v1() returns trigger
language plpgsql security invoker set search_path = public, pg_temp as $$
declare u record;
begin
  select source, status, group_source_intake_public, contributor_id into u from public.channel_updates where id = new.update_id;
  if not found or u.source is distinct from 'email' or u.status <> 'private'
     or u.group_source_intake_public is not false or u.contributor_id is distinct from new.identity_contributor_id then
    raise exception 'mail_proof_requires_held_email_update';
  end if;
  return new;
end $$;
drop trigger if exists channel_update_mail_proof_guard on public.channel_update_mail_proof;
create trigger channel_update_mail_proof_guard before insert on public.channel_update_mail_proof
  for each row execute function public.channel_update_mail_proof_guard_v1();

-- 3) Atomic, idempotent admission. Service role only. One transaction: update row + proof row, or neither.
create or replace function public.admit_mail_source_held_v1(p_inbound_email_id bigint, p_update jsonb, p_proof jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare a record; ie record; v_id uuid; v_parent uuid;
begin
  select * into a from public.mail_source_approvals
   where contributor_id = (p_proof->>'identity_contributor_id')::uuid and active is true;
  if not found then return jsonb_build_object('ok', false, 'error', 'sender_not_approved'); end if;

  select id, from_email, message_id into ie from public.inbound_emails where id = p_inbound_email_id;
  if not found or lower(coalesce(ie.from_email, '')) is distinct from a.mailbox_lc
     or ie.message_id is distinct from (p_proof->>'message_id') then
    return jsonb_build_object('ok', false, 'error', 'inbox_mismatch');
  end if;

  if (p_update->>'source') is distinct from 'email' or (p_update->>'status') is distinct from 'private'
     or coalesce((p_update->>'group_source_intake_public')::boolean, true) is not false
     or (p_update->>'contributor_id')::uuid is distinct from a.contributor_id then
    return jsonb_build_object('ok', false, 'error', 'not_held_shape');
  end if;

  if exists (select 1 from public.channel_update_mail_proof where inbound_email_id = p_inbound_email_id or message_id = p_proof->>'message_id')
     or exists (select 1 from public.channel_updates where ext_msg_id = p_update->>'ext_msg_id') then
    return jsonb_build_object('ok', true, 'dup', true);
  end if;

  insert into public.channel_updates (channel, text, credit, contributor_id, source, status, priority, ext_msg_id, group_source_intake_public, created_at)
  values (p_update->>'channel', p_update->>'text', a.author_display, a.contributor_id, 'email', 'private',
          coalesce((p_update->>'priority')::int, 50), p_update->>'ext_msg_id', false,
          coalesce((p_update->>'created_at')::timestamptz, now()))
  returning id into v_id;

  select id into v_parent from public.channel_updates where ext_msg_id = p_proof->>'parent_ext_msg_id' and source = 'email';

  insert into public.channel_update_mail_proof (update_id, inbound_email_id, message_id, parent_ext_msg_id, parent_update_id, parent_basis,
         thread_key, thread_state, identity_contributor_id, identity_basis, provider, provider_id, dkim, dmarc,
         sender_mailbox_sha256, original_text_sha256, text_kind, quoted_omitted, text_truncated, sanitizer_version, image_refs, intake_version)
  values (v_id, p_inbound_email_id, p_proof->>'message_id', p_proof->>'parent_ext_msg_id', v_parent, p_proof->>'parent_basis',
         p_proof->>'thread_key',
         case when p_proof->>'parent_ext_msg_id' is null then 'root' when v_parent is not null then 'parent_present' else 'parent_missing' end,
         a.contributor_id, 'verified_email_unique', 'resend', p_proof->>'provider_id', p_proof->>'dkim', p_proof->>'dmarc',
         p_proof->>'sender_mailbox_sha256', p_proof->>'original_text_sha256', 'original_cleaned',
         coalesce((p_proof->>'quoted_omitted')::boolean, false), coalesce((p_proof->>'text_truncated')::boolean, false),
         p_proof->>'sanitizer_version', coalesce((p_proof->>'image_refs')::int, 0), p_proof->>'intake_version');

  return jsonb_build_object('ok', true, 'update_id', v_id, 'held', true);
end $$;
revoke all on function public.admit_mail_source_held_v1(bigint, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.admit_mail_source_held_v1(bigint, jsonb, jsonb) to service_role;

commit;

-- ROLLBACK (draft): drop function public.admit_mail_source_held_v1(bigint, jsonb, jsonb);
--   drop trigger channel_update_mail_proof_guard on public.channel_update_mail_proof;
--   drop function public.channel_update_mail_proof_guard_v1();
--   -- before dropping the proof table, confirm with ZURIEL whether held email updates (source='email') are kept or removed:
--   drop table public.channel_update_mail_proof; drop table public.mail_source_approvals;
