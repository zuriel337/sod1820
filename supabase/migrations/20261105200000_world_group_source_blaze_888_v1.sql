-- world_group_source_blaze_888_v1 — admit ONE more public source group ("blaze-888") to the existing
-- positive group-source provenance path. Nothing new is created: same proof table, same recorder, same reader.
-- Public effect stays bounded by the reader itself: only text from the four approved writers with a verified,
-- unique phone and the editorial feed flag is ever returned, labelled as an unverified source message.
-- Branch-only until ZURIEL approves applying it. Idempotent. Function bodies are patched from the LIVE definition
-- (not re-typed) so any drift between repo and live is preserved; a missing anchor aborts instead of guessing.
-- Rollback: drop 'blaze-888' from the three allow-lists the same way, or set channel_ingest_sources.enabled=false.

do $m$
declare d text; old_c text;
begin
  -- 1) proof table channel check
  select conname into old_c from pg_constraint
   where conrelid = 'public.channel_update_group_proof'::regclass and contype = 'c'
     and pg_get_constraintdef(oid) like '%torat-haremez%' and pg_get_constraintdef(oid) like '%channel%';
  if old_c is null then raise exception 'channel check constraint not found'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conname = old_c
        and conrelid = 'public.channel_update_group_proof'::regclass) not like '%blaze-888%' then
    execute format('alter table public.channel_update_group_proof drop constraint %I', old_c);
    alter table public.channel_update_group_proof
      add constraint channel_update_group_proof_channel_check
      check (channel in ('torat-haremez','gilui-yomi','blaze-888'));
  end if;

  -- 2) recorder: source channel allow-list
  select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'record_channel_update_group_proof_v1';
  if d is null then raise exception 'record_channel_update_group_proof_v1 not found'; end if;
  if d not like '%blaze-888%' then
    d := replace(d, 's.channel not in (''torat-haremez'',''gilui-yomi'')', 's.channel not in (''torat-haremez'',''gilui-yomi'',''blaze-888'')');
    if d not like '%blaze-888%' then raise exception 'recorder allow-list anchor not found'; end if;
    execute d;
  end if;

  -- 3) reader: source channel allow-list
  select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'world_group_source_arrivals_v2';
  if d is null then raise exception 'world_group_source_arrivals_v2 not found'; end if;
  if d not like '%blaze-888%' then
    d := replace(d, 's.channel in (''torat-haremez'',''gilui-yomi'',''ki-la-hamelucha-gematria'')', 's.channel in (''torat-haremez'',''gilui-yomi'',''ki-la-hamelucha-gematria'',''blaze-888'')');
    if d not like '%blaze-888%' then raise exception 'reader allow-list anchor not found'; end if;
    execute d;
  end if;
end
$m$;
