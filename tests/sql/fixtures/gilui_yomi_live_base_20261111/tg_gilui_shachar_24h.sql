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
