-- PROPOSED rollback of supabase/migrations/20261117160000_post_document_freshness.sql (not applied anywhere). Reverses the two exact anchor
-- patches, checks that both functions are back to their reviewed definitions, and removes the triggers, functions and log rows it added.
do $rollback$
declare d text; n text;
begin
  if to_regprocedure('public.fn_post_document_change()') is null then raise exception 'post document freshness is not applied'; end if;

  d := pg_get_functiondef('public.admin_2029_analytics(integer,text)'::regprocedure);
  n := replace(d, $new1$        from public.system_suggestions s where (s.detector like 'web_vitals_%' or s.detector like 'post_document_%') and s.status in ('pending', 'later')), '[]'::jsonb),
      'post_document_freshness', (select jsonb_build_object('computed_at', c.computed_at) || c.payload
        from public.analytics_cache c where c.cache_key = 'post_documents:freshness_watch')
    ),
$new1$, $old1$        from public.system_suggestions s where s.detector like 'web_vitals_%' and s.status in ('pending', 'later')), '[]'::jsonb)
    ),
$old1$);
  if n = d then raise exception 'reader anchor not found'; end if;
  execute n;

  d := pg_get_functiondef('public.fn_health_watch()'::regprocedure);
  n := replace(d, $new2$  -- Post document freshness (ZURIEL 17.11.2026): confirm every CDN purge of a changed Post, retry a failure once, report it.
  begin
    perform public.fn_post_document_freshness_watch();
  exception when others then
    null;
  end;

$new2$, '');
  if n = d then raise exception 'health watch anchor not found'; end if;
  execute n;

  if md5(pg_get_functiondef('public.admin_2029_analytics(integer,text)'::regprocedure)) <> '5d8fd1385da77fb4de2a43d946a02495'
     or md5(pg_get_functiondef('public.fn_health_watch()'::regprocedure)) <> '7fbad83db7ac2a528f16766185cb9696' then
    raise exception 'rollback did not restore the reviewed definitions';
  end if;

  drop trigger if exists trg_post_document_change_ins on public.posts;
  drop trigger if exists trg_post_document_change_upd on public.posts;
  drop trigger if exists trg_post_document_change_del on public.posts;
  drop trigger if exists trg_post_document_change_trunc on public.posts;
  drop function public.fn_post_document_freshness_watch();
  drop function public.admin_post_document_bypass_all(integer, text);
  drop function public.post_document_recent_changes_v1();
  drop function public.fn_post_document_change();
  drop function public.fn_post_document_keys(text);
  delete from public.analytics_cache where cache_key in ('post_documents:changes', 'post_documents:freshness_watch');
end $rollback$;
