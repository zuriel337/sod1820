CREATE OR REPLACE FUNCTION public.add_wall_word(p_phrase text, p_ragil integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_phrase text := btrim(coalesce(p_phrase, ''));
begin
  -- תקינות: אורך סביר, לפחות אות עברית אחת, ערך חיובי
  if char_length(v_phrase) = 0 or char_length(v_phrase) > 40 then return; end if;
  if v_phrase !~ '[א-ת]' then return; end if;
  if p_ragil is null or p_ragil <= 0 or p_ragil > 100000 then return; end if;

  insert into public.gematria_wall (phrase, ragil)
  values (v_phrase, p_ragil)
  on conflict (phrase)
  do update set hits = public.gematria_wall.hits + 1, last_at = now();
end;
$function$

