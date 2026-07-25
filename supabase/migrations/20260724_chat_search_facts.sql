-- 🔎 chat_search_facts — RAG קל לצ'אט: מחזיר קטעים רלוונטיים מהפוסטים של האתר, כדי שהצ'אט
--    (Gemini/Claude, וגם רזיאל בוואטסאפ) יישען על החומר האמיתי שכתבנו ולא על ידע כללי.
-- קריאה-בלבד. אינדקס full-text (simple — טוקניזציה מתאימה לעברית, בלי stemming) על כותרת+תקציר.
-- פוסטים ציבוריים (אין דגל-טיוטה; anon כבר קורא posts) → הפונקציה לא חושפת דבר חדש.
create index if not exists posts_fts_simple_idx
  on public.posts using gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(excerpt,'')));

create or replace function public.chat_search_facts(p_query text, p_limit int default 3)
returns text
language sql
stable
as $$
  with q as (
    select websearch_to_tsquery('simple', coalesce(p_query, '')) as tsq
  ),
  ranked as (
    select
      p.title,
      left(regexp_replace(coalesce(nullif(p.excerpt, ''), p.content), '<[^>]+>|\s+', ' ', 'g'), 280) as snip,
      ts_rank(to_tsvector('simple', coalesce(p.title,'') || ' ' || coalesce(p.excerpt,'')), q.tsq) as rank
    from public.posts p, q
    where q.tsq @@ to_tsvector('simple', coalesce(p.title,'') || ' ' || coalesce(p.excerpt,''))
    order by rank desc
    limit greatest(1, least(coalesce(p_limit, 3), 5))
  )
  select string_agg('• ' || title || ': ' || trim(snip), E'\n')
  from ranked;
$$;

revoke all on function public.chat_search_facts(text, int) from public;
grant execute on function public.chat_search_facts(text, int) to anon, authenticated, service_role;

comment on function public.chat_search_facts(text, int) is
  'RAG לצ''אט: קטעים רלוונטיים מהפוסטים (title+excerpt, FTS simple). משרת את הצ''אט באתר + רזיאל בוואטסאפ.';
