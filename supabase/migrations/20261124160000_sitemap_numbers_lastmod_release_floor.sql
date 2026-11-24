-- ZURIEL 24.11.2026: the lastmod floor of number pages moves to the release day.
-- Codex left the floor date (2026-07-08) as a release decision (docs/reviews/indexing-audit-20261120/NUMBER_ELIGIBILITY.md):
-- most admitted numbers had no dated change since then, yet their documents did change with the release of 24.11.2026
-- (first words, frame and admission of 828 numbers). Set to the release day, the sitemap tells Google to revisit them.
-- Only the floor date changes (both occurrences in the lastmod expression); a later real change still dates a number later.
-- The guard refuses an unexpected live version; the replacement must apply exactly twice.
do $migration$
declare
  v_sig constant regprocedure := 'public.sitemap_numbers()'::regprocedure;
  v_old constant text := $$timestamptz '2026-07-08'$$;
  v_new constant text := $$timestamptz '2026-11-24'$$;
  v_def text := pg_get_functiondef(v_sig);
begin
  if md5(v_def) <> '57e23e5de69ce3a794b1452cd6c44a6d' then
    raise exception 'Unexpected sitemap_numbers version %', md5(v_def);
  end if;
  if (length(v_def) - length(replace(v_def, v_old, ''))) / length(v_old) <> 2 then
    raise exception 'sitemap_numbers floor date not found exactly twice';
  end if;
  execute replace(v_def, v_old, v_new);
end;
$migration$;
