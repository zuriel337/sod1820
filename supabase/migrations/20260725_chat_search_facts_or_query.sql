-- שיפור chat_search_facts: שאילתת-חיפוש עמידה לשיחה טבעית (מחליף את גרסת ה-AND הראשונה).
-- הבעיה שהתגלתה: websearch_to_tsquery מבצע AND על כל המילים → «מה יש על פרה אדומה» דרש שהפוסט
--   יכיל גם «מה/יש/על» → 0 תוצאות, וה-RAG נכשל בשקט על הודעות-שיחה אמיתיות (החזיר "").
-- הפתרון: מסננים מילות-קישור עבריות, מחברים את המשמעותיות ב-OR (|), ו-ts_rank מדרג את הרלוונטי.
-- 🌳 עץ אחד: תיקון הפונקציה המשותפת הזו שיפר *גם* את הצ'אט באתר *וגם* את רזיאל בוואטסאפ, בלי פריסה.
create or replace function public.chat_search_facts(p_query text, p_limit int default 3)
returns text
language sql
stable
as $$
  with toks as (
    select array(
      select w from (
        select regexp_replace(t, '[^א-ת]', '', 'g') as w
        from regexp_split_to_table(coalesce(p_query, ''), '\s+') t
      ) x
      where char_length(w) >= 3
        and w not in ('מה','יש','על','של','את','זה','זו','לי','לך','לו','גם','כי','לא','כן','אבל',
          'הוא','היא','הם','אני','אתה','עם','או','רק','כל','אם','אז','מי','איך','למה','מתי','האם',
          'אין','הכל','ספר','תספר','רוצה','תגיד','בבקשה','אותי','אותך','שלי','שלך','כמה','איזה',
          'הזה','הזאת','עכשיו','תודה','שלום','היי','אולי','צריך','באמת','ממש')
    ) as ws
  ),
  q as (
    select case when array_length(ws, 1) is null then null
                else to_tsquery('simple', array_to_string(ws, ' | ')) end as tsq
    from toks
  ),
  ranked as (
    select
      p.title,
      left(regexp_replace(coalesce(nullif(p.excerpt, ''), p.content), '<[^>]+>|\s+', ' ', 'g'), 280) as snip,
      ts_rank(to_tsvector('simple', coalesce(p.title,'') || ' ' || coalesce(p.excerpt,'')), q.tsq) as rank
    from public.posts p, q
    where q.tsq is not null
      and q.tsq @@ to_tsvector('simple', coalesce(p.title,'') || ' ' || coalesce(p.excerpt,''))
    order by rank desc
    limit greatest(1, least(coalesce(p_limit, 3), 5))
  )
  select string_agg('• ' || title || ': ' || trim(snip), E'\n')
  from ranked;
$$;

grant execute on function public.chat_search_facts(text, int) to anon, authenticated, service_role;
