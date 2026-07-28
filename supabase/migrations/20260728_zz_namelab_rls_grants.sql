-- ============================================================
--  NameLab — RLS read-grants for the name-research chain
--  Bug (rls_client_read_protocol): fn_name_multi → fn_name_variants reads
--  public.name_variants, and fn_els_search reads public.torah_stream — both
--  had RLS enabled with NO policy and NO grant, so EVERY client name search
--  failed with "permission denied for table name_variants" and the UI showed
--  "החיפוש לא זמין". These are public research tables (spelling variants +
--  the Torah letter-stream), so: policy + GRANT SELECT to anon, authenticated.
--  Runs last (zz_) — grants sit after the tables exist on a fresh replay.
-- ============================================================
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='name_variants' and policyname='name_variants_read') then
    create policy name_variants_read on public.name_variants for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='torah_stream' and policyname='torah_stream_read') then
    create policy torah_stream_read on public.torah_stream for select using (true);
  end if;
end $$;

grant select on public.name_variants to anon, authenticated;
grant select on public.torah_stream  to anon, authenticated;
