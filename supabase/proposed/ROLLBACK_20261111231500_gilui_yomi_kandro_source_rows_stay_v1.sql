-- ROLLBACK of GILUI_YOMI_KANDRO_SOURCE_ROWS_STAY_V1 — NOT APPLIED. Runs only with ZURIEL's explicit approval (CLAUDE.md 0.4).
-- Restores the exact tg_gilui_shachar_24h read live on 11.11.2026 (md5 bca6a8fbd895c5983a0d801173d909cd): every new row signed קנדרו in
-- «הגילוי היומי» gets 24 hours again. Rows inserted while the change was applied keep expires_at = NULL; giving them an expiry would be a
-- separate data change with its own approval.
begin;

do $$
begin
  if md5(pg_get_functiondef('public.tg_gilui_shachar_24h()'::regprocedure)) <> 'a7d0e58c3c59c548a98c694911064899' then
    raise exception 'KANDRO_SOURCE_ROWS rollback: tg_gilui_shachar_24h is not the applied definition; nothing changed';
  end if;
end $$;

CREATE OR REPLACE FUNCTION public.tg_gilui_shachar_24h()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.channel = 'gilui-yomi'
     and (coalesce(new.credit,'') ilike '%קנדרו%' or coalesce(new.speaker,'') ilike '%קנדרו%')
     and new.expires_at is null
  then
    new.expires_at := coalesce(new.created_at, now()) + interval '24 hours';
  end if;
  return new;
end;
$function$
;

do $$
begin
  if md5(pg_get_functiondef('public.tg_gilui_shachar_24h()'::regprocedure)) <> 'bca6a8fbd895c5983a0d801173d909cd' then
    raise exception 'KANDRO_SOURCE_ROWS rollback postcondition: tg_gilui_shachar_24h was not restored exactly';
  end if;
end $$;

commit;
