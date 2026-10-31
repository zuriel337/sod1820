-- APPLIED ONCE after explicit ZURIEL approval: 2026-10-31T03:56:34.768416Z.
-- Historical guarded statement; not a migration/runtime input. Do not rerun.
-- AFTER/release: 4af9bc55-1361-477e-b01c-7fef941009f5.
-- ZURIEL explicitly identified the publication as בדרך לנצח on 31.10.2026.
-- A separate, exact authorization was obtained before execution because
-- designated ownership86192c3f and AGENTS.md exclude live product-DB writes.
-- The existing series reader will recognize dimension-five without any ID list.
begin;
do $post_author_correction$
declare affected integer;
begin
  update public.posts
     set author = 'בדרך לנצח', modified = clock_timestamp()
   where id = 5129
     and slug = 'old-timeline-complete-new-self-dim5'
     and author = 'manifestaffirms'
     and modified = '2026-10-30T14:11:23.362233+00:00'::timestamptz
     and md5(content) = 'fc6dfbd4be2ae6daab014826709ad618'
     and home_hidden is not true
     and not exists (select 1 from unnest(coalesce(tags, '{}'::text[])) tag where btrim(tag) in ('טיוטה','פורום'))
     and lower(btrim(coalesce(source,''))) not in ('gpt-draft','web');
  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception 'Post5129 changed or is no longer admitted; reread the source instead of overwriting';
  end if;
end
$post_author_correction$;
commit;
-- Validation after authorized execution: author=בדרך לנצח; body MD5 unchanged;
-- slug/categories/tags/publication date unchanged; existing exact membership
-- includes dimension-five; no taxonomy/series override or new publication event.
