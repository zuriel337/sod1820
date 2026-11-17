-- Post document freshness (ZURIEL 17.11.2026): every writer of posts is logged and asks for a purge; non-document changes are not; a change
-- that cannot be logged does not happen; purges are confirmed, retried once and reported; the edge read returns hashed keys only.
-- Run by tests/sql/run-post-document-freshness.sh after the fixture and the migration. Everything is rolled back at the end.
\set ON_ERROR_STOP on
begin;
insert into public.users (id, role, display_name) values ('00000000-0000-4000-8000-0000000000a1', 'admin', 'מנהל');
insert into vault.secrets_store (name, secret) values ('sod_post_document_purge_key', 'test-key-1');
select set_config('test.uid', '00000000-0000-4000-8000-0000000000a1', true);

create function pg_temp.reset_log() returns void language sql as $$
  delete from public.analytics_cache where cache_key like 'post_documents:%';
  delete from net.calls; delete from net._http_response;
  delete from public.system_suggestions where detector like 'post_document_%';
$$;
create function pg_temp.entries() returns jsonb language sql as $$
  select coalesce((select payload->'entries' from public.analytics_cache where cache_key = 'post_documents:changes'), '[]'::jsonb) $$;
create function pg_temp.last_entry() returns jsonb language sql as $$ select pg_temp.entries()->-1 $$;
create function pg_temp.keys_of(p_slug text) returns jsonb language sql as $$ select to_jsonb(public.fn_post_document_keys(p_slug)) $$;
create function pg_temp.id_of(p_slug text) returns bigint language sql as $$ select id from public.posts where slug = p_slug $$;
-- One assertion: a logged change of exactly these Posts, with these keys, and one purge request for exactly their tags.
create function pg_temp.expect_change(p_label text, p_op text, p_ids bigint[], p_keys jsonb) returns void language plpgsql as $$
declare e jsonb := pg_temp.last_entry(); c record; n int;
begin
  if e is null then raise exception '%: nothing was logged', p_label; end if;
  if e->>'op' <> p_op then raise exception '%: op % (expected %)', p_label, e->>'op', p_op; end if;
  if (select array_agg(x::bigint order by x::bigint) from jsonb_array_elements_text(e->'ids') x) is distinct from (select array_agg(i order by i) from unnest(p_ids) i) then
    raise exception '%: ids % (expected %)', p_label, e->'ids', to_jsonb(p_ids);
  end if;
  if not ((e->'keys') @> p_keys and p_keys @> (e->'keys')) then raise exception '%: keys % (expected %)', p_label, e->'keys', p_keys; end if;
  if e->>'purge' <> 'requested' or (e->>'req') is null then raise exception '%: purge %', p_label, e->>'purge'; end if;
  select count(*) into n from net.calls;
  if n <> 1 then raise exception '%: % purge requests (expected 1)', p_label, n; end if;
  select * into c from net.calls order by id desc limit 1;
  if c.url <> 'https://sod1820.co.il/api/post-document-cache' or c.headers->>'x-sod-purge-key' <> 'test-key-1'
     or c.body->'tags' <> (select to_jsonb(array_agg('post-document-' || i order by 'post-document-' || i)) from unnest(p_ids) i) then
    raise exception '%: purge request % %', p_label, c.url, c.body;
  end if;
end $$;
create function pg_temp.expect_nothing(p_label text) returns void language plpgsql as $$
begin
  if jsonb_array_length(pg_temp.entries()) <> 0 or (select count(*) from net.calls) <> 0 then
    raise exception '%: a change was logged or a purge requested: %', p_label, pg_temp.entries();
  end if;
end $$;

-- ── publishing through plain SQL (three Posts: an imported one stored percent-encoded, a native ASCII one, a Hebrew one) ─────────────
insert into public.posts (title, slug, content, excerpt, tags, categories, date, modified, author, source) values
  ('עלון', '%d7%a2%d7%9c%d7%95%d7%9f-test', '<p>א</p>', 'א', '{}', '{}', now(), now(), 'כותב', 'wp'),
  ('Chosen', 'chosen-one-test', '<p>b</p>', 'b', '{}', '{}', now(), now(), 'כותב', 'ai'),
  ('פוסט', 'פוסט-בדיקה', '<p>c</p>', 'c', '{}', '{}', now(), now(), 'כותב', 'ai');
select pg_temp.expect_change('publish (SQL)', 'insert',
  array[pg_temp.id_of('%d7%a2%d7%9c%d7%95%d7%9f-test'), pg_temp.id_of('chosen-one-test'), pg_temp.id_of('פוסט-בדיקה')],
  pg_temp.keys_of('%d7%a2%d7%9c%d7%95%d7%9f-test') || pg_temp.keys_of('chosen-one-test') || pg_temp.keys_of('פוסט-בדיקה'));

-- ── the editor ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
do $t$ declare id1 bigint := pg_temp.id_of('%d7%a2%d7%9c%d7%95%d7%9f-test'); revs int := (select count(*) from public.post_revisions); begin
  perform pg_temp.reset_log();
  perform public.admin_save_post(p_id := id1, p_title := 'עלון', p_slug := '%d7%a2%d7%9c%d7%95%d7%9f-test', p_content := '<p>א חדש</p>', p_excerpt := 'א');
  perform pg_temp.expect_change('editor edit (admin_save_post)', 'update', array[id1], pg_temp.keys_of('%d7%a2%d7%9c%d7%95%d7%9f-test'));
  if (select count(*) from public.post_revisions) <> revs + 1 then raise exception 'the existing revision snapshot did not run beside the new trigger'; end if;

  perform pg_temp.reset_log();
  update public.posts set title = 'עלון מתוקן' where id = id1;        -- the editor's direct update (adminUpdatePost -> PostgREST UPDATE)
  perform pg_temp.expect_change('editor direct update', 'update', array[id1], pg_temp.keys_of('%d7%a2%d7%9c%d7%95%d7%9f-test'));

  perform pg_temp.reset_log();
  perform public.admin_restore_post_revision((select max(id) from public.post_revisions where post_id = id1));
  perform pg_temp.expect_change('editor restore (admin_restore_post_revision)', 'update', array[id1], pg_temp.keys_of('%d7%a2%d7%9c%d7%95%d7%9f-test'));

  update public.posts set modified = date + interval '3 hours' where id = id1;
  perform pg_temp.reset_log();
  perform public.admin_reset_post_position(id1, false);              -- modified := date: part of the document (article:modified_time)
  perform pg_temp.expect_change('editor reset position', 'update', array[id1], pg_temp.keys_of('%d7%a2%d7%9c%d7%95%d7%9f-test'));

  -- hiding: the editor saves the draft tag
  perform pg_temp.reset_log();
  perform public.admin_save_post(p_id := id1, p_title := 'עלון', p_slug := '%d7%a2%d7%9c%d7%95%d7%9f-test', p_content := '<p>א חדש</p>', p_excerpt := 'א',
    p_tags := array['טיוטה']);
  perform pg_temp.expect_change('editor hides (draft tag)', 'update', array[id1], pg_temp.keys_of('%d7%a2%d7%9c%d7%95%d7%9f-test'));
  if not (public.post_document_recent_changes_v1()->'keys' @> pg_temp.keys_of('%d7%a2%d7%9c%d7%95%d7%9f-test')) then
    raise exception 'the edge read does not list the hidden Post';
  end if;

  -- publishing a new Post from the editor
  perform pg_temp.reset_log();
  perform public.admin_save_post(p_title := 'חדש', p_slug := 'new-post-test', p_content := '<p>n</p>', p_excerpt := 'n');
  perform pg_temp.expect_change('editor publishes', 'insert', array[pg_temp.id_of('new-post-test')], pg_temp.keys_of('new-post-test'));
end $t$;

-- ── the agents (service-only writer behind the post-save Edge Function) ────────────────────────────────────────────────────────────────
do $t$ declare id2 bigint := pg_temp.id_of('chosen-one-test'); begin
  perform pg_temp.reset_log();
  perform public.sys_save_post(p_id := id2, p_title := 'Chosen', p_slug := 'chosen-one-test', p_content := '<p>b2</p>', p_excerpt := 'b');
  perform pg_temp.expect_change('agent edit (sys_save_post)', 'update', array[id2], pg_temp.keys_of('chosen-one-test'));

  perform pg_temp.reset_log();
  perform public.sys_save_post(p_title := 'Agent new', p_slug := 'agent-new-test', p_content := '<p>g</p>', p_excerpt := 'g');
  perform pg_temp.expect_change('agent publishes (sys_save_post)', 'insert', array[pg_temp.id_of('agent-new-test')], pg_temp.keys_of('agent-new-test'));
end $t$;

-- ── database changes: delete, slug change, a change that is not part of the document, a change to the same value ──────────────────────
do $t$ declare id2 bigint := pg_temp.id_of('chosen-one-test'); id3 bigint := pg_temp.id_of('פוסט-בדיקה'); begin
  perform pg_temp.reset_log();
  delete from public.posts where id = id2;
  perform pg_temp.expect_change('delete (SQL)', 'delete', array[id2], pg_temp.keys_of('chosen-one-test'));
  if not (public.post_document_recent_changes_v1()->'keys' @> pg_temp.keys_of('chosen-one-test')) then raise exception 'the deleted Post is not listed'; end if;

  perform pg_temp.reset_log();
  update public.posts set slug = 'פוסט-בדיקה-2' where id = id3;
  perform pg_temp.expect_change('slug change', 'update', array[id3], pg_temp.keys_of('פוסט-בדיקה') || pg_temp.keys_of('פוסט-בדיקה-2'));

  perform pg_temp.reset_log();
  perform set_config('test.is_admin', 'true', true);
  perform public.admin_set_post_home_hidden(id3, true);
  update public.posts set verified = true, convergence_score = 3, fb_posted_at = now(), fb_error = 'x', theme = 'dark', axis_pin = 1,
    ai_touched = true, thumb_url = 'https://example.invalid/t.webp' where id = id3;
  update public.posts set title = title where id = id3;
  perform pg_temp.expect_nothing('changes that are not part of the document');
end $t$;

-- ── bulk change: more than 16 Posts in one statement ─────────────────────────────────────────────────────────────────────────────────
do $t$ declare e jsonb; r jsonb; begin
  perform pg_temp.reset_log();
  insert into public.posts (id, title, slug, content, tags, date, modified) select 1000 + g, 'bulk ' || g, 'bulk-' || g, '<p>x</p>', '{}', now(), now() from generate_series(1, 20) g;
  e := pg_temp.last_entry();
  if e->>'all' <> 'true' or e->'tags' <> '["post-document"]'::jsonb or jsonb_array_length(e->'keys') <> 0 or (e->>'count')::int <> 20 then
    raise exception 'bulk change %', e;
  end if;
  r := public.post_document_recent_changes_v1();
  if r->>'all_until' is null or (r->>'all_until')::timestamptz < now() + interval '19 minutes' then raise exception 'bulk change: all_until %', r; end if;
end $t$;

-- ── the purge key is missing / pg_net cannot queue: the change is still logged (layer 2), and the writer is not blocked ──────────────
do $t$ declare id1 bigint := pg_temp.id_of('%d7%a2%d7%9c%d7%95%d7%9f-test'); e jsonb; begin
  perform pg_temp.reset_log();
  delete from vault.secrets_store;
  update public.posts set content = '<p>no key</p>' where id = id1;
  e := pg_temp.last_entry();
  if e->>'purge' <> 'not_configured' or (select count(*) from net.calls) <> 0 then raise exception 'no key: %', e; end if;
  if not (public.post_document_recent_changes_v1()->'keys' @> pg_temp.keys_of('%d7%a2%d7%9c%d7%95%d7%9f-test')) then raise exception 'no key: not listed'; end if;
  insert into vault.secrets_store (name, secret) values ('sod_post_document_purge_key', 'test-key-1');

  perform pg_temp.reset_log();
  perform set_config('test.net_down', 'on', true);
  update public.posts set content = '<p>net down</p>' where id = id1;
  perform set_config('test.net_down', 'off', true);
  e := pg_temp.last_entry();
  if e->>'purge' <> 'request_failed' or (select content from public.posts where id = id1) <> '<p>net down</p>' then raise exception 'net down: %', e; end if;
end $t$;

-- ── a change that cannot be logged does not happen ───────────────────────────────────────────────────────────────────────────────────
do $t$ declare id1 bigint := pg_temp.id_of('%d7%a2%d7%9c%d7%95%d7%9f-test'); before text := (select content from public.posts where id = pg_temp.id_of('%d7%a2%d7%9c%d7%95%d7%9f-test')); begin
  alter table public.analytics_cache add constraint test_refuse_post_log check (cache_key <> 'post_documents:changes') not valid;
  begin
    update public.posts set content = '<p>must not land</p>' where id = id1;
    raise exception 'an unlogged change landed';
  exception when check_violation then null;
  end;
  alter table public.analytics_cache drop constraint test_refuse_post_log;
  if (select content from public.posts where id = id1) <> before then raise exception 'the refused change is visible'; end if;
end $t$;

-- ── the edge read: hashes only, the 20-minute window ─────────────────────────────────────────────────────────────────────────────────
do $t$ declare r jsonb; begin
  perform pg_temp.reset_log();
  update public.posts set content = '<p>w1</p>' where slug = 'new-post-test';
  update public.posts set content = '<p>w2</p>' where slug = 'agent-new-test';
  update public.analytics_cache set payload = jsonb_set(payload, '{entries,0,at}', to_jsonb(now() - interval '25 minutes')) where cache_key = 'post_documents:changes';
  r := public.post_document_recent_changes_v1();
  if r->'keys' @> pg_temp.keys_of('new-post-test') or not (r->'keys' @> pg_temp.keys_of('agent-new-test')) or (r->>'changes')::int <> 1 then
    raise exception 'window %', r;
  end if;
  if r::text ~ 'agent-new-test|new-post-test|<p>' then raise exception 'the edge read exposes slugs or content'; end if;
end $t$;

-- ── confirmation, retry and report (System Suggestions) ──────────────────────────────────────────────────────────────────────────────
do $t$ declare id1 bigint := pg_temp.id_of('%d7%a2%d7%9c%d7%95%d7%9f-test'); e jsonb; h jsonb; req bigint; retry bigint; begin
  -- confirmed
  perform pg_temp.reset_log();
  update public.posts set content = '<p>ok</p>' where id = id1;
  req := (pg_temp.last_entry()->>'req')::bigint;
  insert into net._http_response (id, status_code, timed_out) values (req, 200, false);
  h := public.fn_post_document_freshness_watch();
  if pg_temp.last_entry()->>'check' <> 'ok' or h->>'status' <> 'ok' or (h->>'purges_ok')::int <> 1
     or exists (select 1 from public.system_suggestions where detector like 'post_document_%') then raise exception 'confirmed: % %', pg_temp.last_entry(), h; end if;

  -- failed -> retried once -> failed again: one suggestion, final state
  perform pg_temp.reset_log();
  update public.posts set content = '<p>fail</p>' where id = id1;
  req := (pg_temp.last_entry()->>'req')::bigint;
  insert into net._http_response (id, status_code, timed_out) values (req, 500, false);
  h := public.fn_post_document_freshness_watch();
  e := pg_temp.last_entry(); retry := (e->>'retry_req')::bigint;
  if e->>'check' <> 'retried' or retry is null or (select body->'tags' from net.calls where id = retry) <> e->'tags' or h->>'status' <> 'purge_failed' then
    raise exception 'retry: % %', e, h;
  end if;
  if (select count(*) from public.system_suggestions where detector = 'post_document_purge_failed' and status = 'pending' and estimated_impact = 'high') <> 1 then
    raise exception 'no failure suggestion';
  end if;
  perform public.fn_post_document_freshness_watch();       -- the retry has no answer yet: still pending
  if pg_temp.last_entry()->>'check' <> 'retried' then raise exception 'pending retry changed state: %', pg_temp.last_entry(); end if;
  insert into net._http_response (id, status_code, timed_out, error_msg) values (retry, null, true, 'Timeout');
  perform public.fn_post_document_freshness_watch();
  if pg_temp.last_entry()->>'check' <> 'failed' or (select count(*) from net.calls) <> 2 then raise exception 'final failure: %', pg_temp.last_entry(); end if;
  if (select count(*) from public.system_suggestions where detector = 'post_document_purge_failed') <> 1 then raise exception 'the failure suggestion was duplicated'; end if;

  -- no answer at all for 10 minutes = failed
  perform pg_temp.reset_log();
  update public.posts set content = '<p>silent</p>' where id = id1;
  update public.analytics_cache set payload = jsonb_set(payload, '{entries,0,at}', to_jsonb(now() - interval '11 minutes')) where cache_key = 'post_documents:changes';
  perform public.fn_post_document_freshness_watch();
  if pg_temp.last_entry()->>'check' <> 'retried' then raise exception 'silence not treated as failure: %', pg_temp.last_entry(); end if;

  -- no key: one notice
  perform pg_temp.reset_log();
  delete from vault.secrets_store;
  update public.posts set content = '<p>no key 2</p>' where id = id1;
  h := public.fn_post_document_freshness_watch();
  if h->>'status' <> 'not_configured'
     or not exists (select 1 from public.system_suggestions where detector = 'post_document_purge_not_configured' and estimated_impact = 'medium') then
    raise exception 'not configured: %', h;
  end if;
  insert into vault.secrets_store (name, secret) values ('sod_post_document_purge_key', 'test-key-1');
end $t$;

-- ── the existing health watch runs it; the existing reader shows it; privileges ─────────────────────────────────────────────────────────
do $t$ declare before timestamptz := (select computed_at from public.analytics_cache where cache_key = 'post_documents:freshness_watch'); r jsonb; begin
  perform pg_sleep(0.01);
  perform public.fn_health_watch();
  if (select computed_at from public.analytics_cache where cache_key = 'post_documents:freshness_watch') <= before then raise exception 'fn_health_watch did not run the freshness watch'; end if;
  perform set_config('test.is_admin', 'true', true);
  r := public.admin_2029_analytics(24, null);
  if r->'web_vitals'->'post_document_freshness'->>'status' is null then raise exception 'reader: no freshness block %', r->'web_vitals'->'post_document_freshness'; end if;
  if not exists (select 1 from jsonb_array_elements(r->'web_vitals'->'watch_open') x where x->>'detector' like 'post_document_%') then
    raise exception 'reader: post_document findings are not listed';
  end if;
  if r->'identified_traffic' is null or r->'web_vitals'->'watch' is null then raise exception 'reader: an existing part is missing'; end if;

  if not has_function_privilege('anon', 'public.post_document_recent_changes_v1()', 'execute')
     or has_function_privilege('anon', 'public.fn_post_document_freshness_watch()', 'execute')
     or has_function_privilege('authenticated', 'public.fn_post_document_freshness_watch()', 'execute')
     or has_function_privilege('anon', 'public.admin_post_document_bypass_all(integer,text)', 'execute')
     or has_function_privilege('anon', 'public.fn_post_document_change()', 'execute') then
    raise exception 'privileges';
  end if;
  perform public.admin_post_document_bypass_all(15, 'test maintenance');
  if public.post_document_recent_changes_v1()->>'all_until' is null then raise exception 'bypass_all'; end if;
  perform set_config('test.is_admin', 'false', true);
end $t$;

-- ── truncate: every Post document bypasses the CDN ──────────────────────────────────────────────────────────────────────────────────
do $t$ declare e jsonb; begin
  perform pg_temp.reset_log();
  truncate public.posts;
  e := pg_temp.last_entry();
  if e->>'op' <> 'truncate' or e->>'all' <> 'true' or public.post_document_recent_changes_v1()->>'all_until' is null then raise exception 'truncate %', e; end if;
end $t$;
rollback;
\echo post document freshness SQL: PASS
