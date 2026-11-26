-- Read-only acceptance after an approved apply. Expected: all rows true.
select 'policy_is_initplan' k, position('( SELECT rd_is_admin() AS rd_is_admin)' in pg_get_expr(polqual, polrelid)) > 0 ok from pg_policy where polrelid='public.gematria_words'::regclass and polname='ti_public_word_floor'
union all select 'still_restrictive_select', (not polpermissive and polcmd='r') from pg_policy where polrelid='public.gematria_words'::regclass and polname='ti_public_word_floor'
union all select 'four_policies', (select count(*) from pg_policy where polrelid='public.gematria_words'::regclass) = 4
union all select 'functions_untouched', md5(pg_get_functiondef('public.gematria_public_word_eligible(uuid)'::regprocedure))='37daef8c3d317d509cdfd1afad87d12f' and md5(pg_get_functiondef('public.rd_is_admin()'::regprocedure))='3005d3f9ef5e4e58203452a42899fc9c'
union all select 'sitemap_numbers_untouched', md5(pg_get_functiondef('public.sitemap_numbers()'::regprocedure))='b0c6025830b3feb89d835550af06d504'
union all select 'blocklist_not_readable_by_anon', not has_table_privilege('anon','public.gematria_blocklist','select');
