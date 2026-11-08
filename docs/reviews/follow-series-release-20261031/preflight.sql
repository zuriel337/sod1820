-- READ ONLY. Re-run immediately before any separately authorized live apply.
with expected(name,signature,expected_md5) as (values
    ('canonical_follow_topic','public.canonical_follow_topic(text)','536e29febf235d1bc9f4157b337ac51a'),
    ('follow_topic_aliases','public.follow_topic_aliases(text)','3b207f3b0a2e9e1049ce7487275c76f0'),
    ('canonical_follow_subject','public.canonical_follow_subject(text,text)','a187331b0370bbd97b9985d8320d6fb1'),
    ('notify_on_post_publish','public.notify_on_post_publish()','a680e77bf85a506588de457819b139be'),
    ('resolve_topics','public.resolve_topics(text,text)','2f34eb18e00a050d3931c37b25f8847d'),
    ('dispatch','public.dispatch(text,text,text,text,text,text,text,uuid)','c2bf5b273b5ef4644997786a95835553'),
    ('watch_toggle','public.watch_toggle(text,text,boolean,text)','fa41495b802bbd75155fc1ab74c5cb39')
), functions as (select *,md5(pg_get_functiondef(to_regprocedure(signature))) as actual_md5 from expected)
select jsonb_build_object(
  'function_preimages_match',(select bool_and(coalesce(actual_md5=expected_md5,false)) from functions),
  'functions',(select jsonb_agg(jsonb_build_object('name',name,'expected',expected_md5,'actual',actual_md5)) from functions),
  'trigger_matches',exists(select 1 from pg_trigger where tgrelid='public.posts'::regclass and tgname='trg_posts_notify' and pg_get_triggerdef(oid)='CREATE TRIGGER trg_posts_notify AFTER INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION notify_on_post_publish()'),
  'helper_absent',to_regprocedure('public.post_content_series_keys_v1(text[],text[],text)') is null,
  'series_not_yet_admitted',public.canonical_follow_subject('series','dimension-five')='',
  'migration_history_absent',not exists(select 1 from supabase_migrations.schema_migrations where version='20261031091248'),
  'server_version',current_setting('server_version'),
  'candidate_sha256','fcdc20284b6d824b6b6b20aeaec7a63e517fb3a59dcde2adfda7e87178b7df19'
) as follow_series_preflight;
