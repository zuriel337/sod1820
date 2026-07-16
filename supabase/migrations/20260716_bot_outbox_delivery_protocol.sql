-- 16.7.2026 — Store-and-forward outbox for WhatsApp bots (bot_delivery_law).
-- Fixes the "bot fell asleep" incident: a reply was marked done even when the
-- WhatsApp send silently failed, so it was never retried. Now failed sends land
-- here and are re-sent (send-only, no AI regen) until delivered or capped.
-- Server-only table (bots use service_role). RLS on + no policy = anon/authenticated blocked.

create table if not exists public.bot_outbox (
  done_key    text primary key,        -- e.g. 'hatishbi:<idMessage>' — same key used for alreadyDone()
  bot         text not null,           -- 'uriel' | 'hatishbi' | future bots
  chat_id     text not null,
  reply       text not null,           -- already-generated reply (never regenerated on retry)
  msg_in      text,
  attempts    int  not null default 0,
  status      text not null default 'pending',   -- pending | sent | failed
  first_at    timestamptz not null default now(),
  last_at     timestamptz not null default now(),
  sent_msg_id text
);
create index if not exists bot_outbox_pending_idx on public.bot_outbox (bot, status, first_at) where status = 'pending';
alter table public.bot_outbox enable row level security;  -- no policy: service_role only

-- Atomic failure bump. Returns the new attempts count.
create or replace function public.fn_outbox_bump(p_done_key text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare v int;
begin
  update public.bot_outbox
     set attempts = attempts + 1, last_at = now()
   where done_key = p_done_key
  returning attempts into v;
  return coalesce(v, 0);
end $$;

revoke all on function public.fn_outbox_bump(text) from anon, authenticated;
