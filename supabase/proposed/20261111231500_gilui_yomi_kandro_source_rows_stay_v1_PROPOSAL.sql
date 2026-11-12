-- GILUI_YOMI_KANDRO_SOURCE_ROWS_STAY_V1 — PROPOSAL, NOT APPLIED. Runs only with ZURIEL's explicit approval for this exact file (CLAUDE.md 0.4).
-- Rollback: supabase/proposed/ROLLBACK_20261111231500_gilui_yomi_kandro_source_rows_stay_v1.sql · Test: bash scripts/run-gilui-yomi-kandro-sql-test.sh
--
-- ZURIEL 11.11.2026: "כמו צבי: להישאר בזרם" — a verified message of שחר יצחק קנדרו in «הגילוי היומי» is pinned 24 hours in Now and then
-- stays as a regular source message, like Zvi's. Today tg_gilui_shachar_24h (BEFORE INSERT on channel_updates) gives every new gilui-yomi row
-- signed קנדרו expires_at = created_at + 24h, and world_group_source_arrivals_v2 hides expired rows, so his arrivals would disappear.
-- The change: the trigger no longer applies to a group-source intake row (group_source_intake_public = true: an incoming text message of the
-- group, the only kind the public reader can show). Every other row signed קנדרו (outgoing, media, a manual row) keeps the 24 hours.
-- Not changed: the trigger itself (still BEFORE INSERT, same name), every existing row (the 53 rows that already carry expires_at keep it),
-- the public reader, the proof function, the ingest, grants.
begin;

do $$
begin
  if md5(pg_get_functiondef('public.tg_gilui_shachar_24h()'::regprocedure)) <> 'bca6a8fbd895c5983a0d801173d909cd' then
    raise exception 'KANDRO_SOURCE_ROWS precondition: tg_gilui_shachar_24h is not the definition read on 11.11.2026 (already applied or changed); nothing changed';
  end if;
  if not exists (select 1 from pg_trigger t join pg_proc p on p.oid = t.tgfoid
                  where t.tgrelid = 'public.channel_updates'::regclass and t.tgname = 'trg_gilui_shachar_24h' and not t.tgisinternal
                    and p.proname = 'tg_gilui_shachar_24h' and (t.tgtype & 4) = 4 and (t.tgtype & 2) = 2) then
    raise exception 'KANDRO_SOURCE_ROWS precondition: BEFORE INSERT trigger trg_gilui_shachar_24h is missing; nothing changed';
  end if;
end $$;

CREATE OR REPLACE FUNCTION public.tg_gilui_shachar_24h()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  -- ZURIEL 11.11.2026: a verified group-source message of Kandro stays like Zvi's (pinned 24 hours in Now, then a regular source
  -- message). An incoming text row of the group (group_source_intake_public) therefore gets no expiry; every other row signed קנדרו
  -- (outgoing, media, a manual row) keeps the 24 hours.
  if new.channel = 'gilui-yomi'
     and (coalesce(new.credit,'') ilike '%קנדרו%' or coalesce(new.speaker,'') ilike '%קנדרו%')
     and new.expires_at is null
     and new.group_source_intake_public is not true
  then
    new.expires_at := coalesce(new.created_at, now()) + interval '24 hours';
  end if;
  return new;
end;
$function$
;

do $$
begin
  if md5(pg_get_functiondef('public.tg_gilui_shachar_24h()'::regprocedure)) <> 'a7d0e58c3c59c548a98c694911064899' then
    raise exception 'KANDRO_SOURCE_ROWS postcondition: unexpected tg_gilui_shachar_24h definition';
  end if;
end $$;

commit;
