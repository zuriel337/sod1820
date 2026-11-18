-- POSTS_ID_SEQUENCE_SYNC_V1 (ZURIEL 18.11.2026)
-- Problem: public.posts.id is GENERATED ALWAYS AS IDENTITY, but the canonical writers
-- (public.sys_save_post, public.admin_save_post) allocate id as max(id)+1 with
-- OVERRIDING SYSTEM VALUE and never advance public.posts_id_seq. The sequence was left at
-- 5124 while max(id) was 5141, so any plain INSERT failed with a duplicate key.
-- Fix (safety net only — the writers are unchanged and remain the only way to create a post):
--   1. one-time: move posts_id_seq to max(id);
--   2. after every INSERT statement on posts, move the sequence forward to max(id) if it lags.
-- The sequence never moves backwards. No table, column, writer, RLS or grant changes.

create or replace function public.posts_id_sequence_sync()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_max bigint; v_seq bigint;
begin
  select coalesce(max(id), 0) into v_max from public.posts;
  select last_value into v_seq from public.posts_id_seq;
  if v_max > v_seq then
    perform setval('public.posts_id_seq', v_max, true);
  end if;
  return null;
end; $function$;

revoke all on function public.posts_id_sequence_sync() from public, anon, authenticated;

drop trigger if exists trg_posts_id_sequence_sync on public.posts;
create trigger trg_posts_id_sequence_sync
  after insert on public.posts
  for each statement execute function public.posts_id_sequence_sync();

select setval('public.posts_id_seq', greatest((select coalesce(max(id), 0) from public.posts), 1), true);
