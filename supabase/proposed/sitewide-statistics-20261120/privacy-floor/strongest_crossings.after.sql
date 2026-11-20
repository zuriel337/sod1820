CREATE OR REPLACE FUNCTION public.strongest_crossings(p_self text, p_min integer DEFAULT 2, p_limit integer DEFAULT 5)
 RETURNS TABLE(partner text, n_methods integer, methods_detail text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- #1461 privacy floor
  with legit as (select unnest(array['רגיל','אתבש','קדמי','מילוי','סידורי','אלבם','מסתתר','ריבוע','הכפלה','מילוי דמילוי']) m),
  mine as (select method, value from bidim where phrase = p_self and method in (select m from legit)),
  pairs as (
    select b.phrase partner, b.method, b.value
    from bidim b join mine on mine.method = b.method and mine.value = b.value
    join gematria_words gw on gw.id = b.word_id and gw.is_verified = true and gw.is_published = true and ((select public.rd_is_admin()) or public.gematria_public_word_eligible(gw.id))
    where b.phrase <> p_self and b.phrase !~ '[A-Za-z0-9]'
      and heb_letter_key(b.phrase) <> heb_letter_key(p_self)      -- 🚫 בלי אנגרמות
      and not exists (select 1 from gematria_blocklist bl where position(bl.pattern in b.phrase) > 0)
  )
  select partner, count(distinct method)::int,
         string_agg(distinct method || '=' || value, ' · ')
  from pairs group by partner
  having count(distinct method) >= p_min
  order by count(distinct method) desc, char_length(partner)
  limit p_limit;
$function$
