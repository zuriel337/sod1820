-- Post document freshness (ZURIEL 17.11.2026, POST_DOCUMENT_CDN_CACHE_EXPERIMENT_20261117). BRANCH ONLY: not applied to the canonical database
-- until ZURIEL approves this exact file. It extends existing owners only:
--   * posts (the table every writer uses: the editor's direct update and admin_save_post / admin_restore_post_revision, the agents' sys_save_post,
--     and plain SQL) gets statement-level AFTER triggers, so no writer can skip them;
--   * analytics_cache (existing) keeps one change-log row, 'post_documents:changes';
--   * the existing pg_net and Vault ask the site to delete the changed Posts' CDN copies (layer 1);
--   * a public read of hashed address keys of recently changed Posts lets the existing edge middleware stop serving any kept copy of such a
--     Post for 20 minutes (layer 2: works even when the purge never happens);
--   * the existing 15-minute fn_health_watch confirms every purge through pg_net's own response log, retries a failure once and reports it as a
--     System Suggestion (existing suggest_add); the existing Traffic Intelligence reader shows the result in /2029/control.
-- Nothing here reads or exposes a hidden Post: the public read returns 16-hex SHA-256 prefixes of slugs and counts.

do $guard$
begin
  if md5(pg_get_functiondef('public.admin_2029_analytics(integer,text)'::regprocedure)) <> '5d8fd1385da77fb4de2a43d946a02495' then
    raise exception 'admin_2029_analytics is not the reviewed definition';
  end if;
  if md5(pg_get_functiondef('public.fn_health_watch()'::regprocedure)) <> '7fbad83db7ac2a528f16766185cb9696' then
    raise exception 'fn_health_watch is not the reviewed definition';
  end if;
  if to_regprocedure('public.suggest_add(text,text,text,text,jsonb,integer,integer,text,text)') is null then raise exception 'suggest_add missing'; end if;
  if to_regclass('public.posts') is null or to_regclass('public.analytics_cache') is null then raise exception 'posts or analytics_cache missing'; end if;
  if to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is null or to_regclass('net._http_response') is null then raise exception 'pg_net missing'; end if;
  if to_regclass('vault.decrypted_secrets') is null then raise exception 'vault missing'; end if;
  if to_regprocedure('public.fn_post_document_change()') is not null or to_regprocedure('public.post_document_recent_changes_v1()') is not null
     or exists (select 1 from pg_trigger where tgrelid = 'public.posts'::regclass and tgname like 'trg_post_document_change%') then
    raise exception 'post document freshness is already applied';
  end if;
end $guard$;

-- The address key of a Post: the first 16 hex digits of SHA-256 over the slug as stored and over its lower-case form (an imported Post is
-- stored percent-encoded in lower case; the edge hashes the decoded and the lower-case-encoded spelling of the requested address).
create function public.fn_post_document_keys(p_slug text)
returns text[] language sql immutable set search_path to 'public' as $function$
  select case when p_slug is null or btrim(p_slug) = '' then '{}'::text[]
    else array(select distinct left(encode(sha256(convert_to(s, 'UTF8')), 'hex'), 16) from unnest(array[p_slug, lower(p_slug)]) as u(s) order by 1) end
$function$;

-- One statement, one log entry. The 14 columns are exactly what the public Post document is built from (api/og.js reads id, slug, source,
-- link, wp_id, title, excerpt, content, image_url, date, modified, tags, categories, author); a change to anything else (verification,
-- scores, Facebook fields, home_hidden, theme, axis pin) does not change the document and is not logged. A tag change covers hiding
-- ('טיוטה', 'פורום'). The log append is not wrapped: a change that cannot be recorded does not happen (the writer sees the error).
-- The purge request is best effort: its outcome is confirmed later by fn_post_document_freshness_watch from pg_net's response log.
create function public.fn_post_document_change()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare
  v_ids bigint[] := '{}';
  v_keys text[] := '{}';
  v_all boolean := false;
  v_tags text[];
  v_key text;
  v_req bigint;
  v_purge text := 'not_configured';
  v_at timestamptz := clock_timestamp();
  v_entry jsonb;
begin
  if TG_OP = 'TRUNCATE' then
    v_all := true;
  elsif TG_OP = 'INSERT' then
    select coalesce(array_agg(distinct n.id), '{}') into v_ids from new_rows n;
    select coalesce(array_agg(distinct k), '{}') into v_keys from new_rows n, unnest(public.fn_post_document_keys(n.slug)) as u(k);
  elsif TG_OP = 'DELETE' then
    select coalesce(array_agg(distinct o.id), '{}') into v_ids from old_rows o;
    select coalesce(array_agg(distinct k), '{}') into v_keys from old_rows o, unnest(public.fn_post_document_keys(o.slug)) as u(k);
  else
    with changed as (
      select coalesce(n.id, o.id) as id, o.slug as old_slug, n.slug as new_slug
        from old_rows o full join new_rows n on n.id = o.id
       where o.id is null or n.id is null
          or (n.slug, n.source, n.link, n.wp_id, n.title, n.excerpt, n.content, n.image_url, n.date, n.modified, n.tags, n.categories, n.author)
             is distinct from
             (o.slug, o.source, o.link, o.wp_id, o.title, o.excerpt, o.content, o.image_url, o.date, o.modified, o.tags, o.categories, o.author))
    select coalesce((select array_agg(distinct c.id) from changed c), '{}'),
           coalesce((select array_agg(distinct k) from changed c,
                       unnest(public.fn_post_document_keys(c.old_slug) || public.fn_post_document_keys(c.new_slug)) as u(k)), '{}')
      into v_ids, v_keys;
  end if;

  if not v_all and coalesce(array_length(v_ids, 1), 0) = 0 then return null; end if;
  -- More than 16 Posts in one statement (a bulk change): every Post document bypasses the CDN for 20 minutes and the whole tag is purged.
  if coalesce(array_length(v_ids, 1), 0) > 16 then v_all := true; end if;
  if v_all then v_keys := '{}'; end if;
  v_tags := case when v_all then array['post-document'] else array(select 'post-document-' || i::text from unnest(v_ids) as u(i) order by 1) end;

  begin
    select s.decrypted_secret into v_key from vault.decrypted_secrets s where s.name = 'sod_post_document_purge_key' order by s.created_at desc limit 1;
    if coalesce(v_key, '') <> '' then
      v_req := net.http_post(
        url := 'https://sod1820.co.il/api/post-document-cache',
        body := jsonb_build_object('tags', to_jsonb(v_tags)),
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-sod-purge-key', v_key),
        timeout_milliseconds := 5000);
      v_purge := 'requested';
    end if;
  exception when others then
    v_purge := 'request_failed';
    v_req := null;
  end;

  v_entry := jsonb_build_object('at', v_at, 'op', lower(TG_OP), 'ids', to_jsonb(v_ids[1:16]), 'count', coalesce(array_length(v_ids, 1), 0),
    'keys', to_jsonb(v_keys), 'all', v_all, 'tags', to_jsonb(v_tags), 'purge', v_purge, 'req', v_req);

  insert into public.analytics_cache as c (cache_key, payload, computed_at, cache_kind, producer, producer_version, billable_state)
  values ('post_documents:changes',
          jsonb_build_object('entries', jsonb_build_array(v_entry),
                             'all_until', case when v_all then to_jsonb(v_at + interval '20 minutes') else 'null'::jsonb end),
          v_at, 'cdn_freshness', 'fn_post_document_change', 'v1', 'NOT_BILLABLE')
  on conflict (cache_key) do update set
    payload = jsonb_build_object(
      'entries', coalesce((select jsonb_agg(r.e order by (r.e->>'at')::timestamptz)
                             from (select t.e from jsonb_array_elements(coalesce(c.payload->'entries', '[]'::jsonb)) as t(e)
                                    where (t.e->>'at')::timestamptz > v_at - interval '24 hours'
                                    order by (t.e->>'at')::timestamptz desc limit 1999) as r), '[]'::jsonb) || jsonb_build_array(v_entry),
      'all_until', case when v_all then to_jsonb(greatest(coalesce((c.payload->>'all_until')::timestamptz, v_at), v_at + interval '20 minutes'))
                        else coalesce(c.payload->'all_until', 'null'::jsonb) end),
    computed_at = v_at, producer = 'fn_post_document_change', producer_version = 'v1';
  return null;
end $function$;

create trigger trg_post_document_change_ins after insert on public.posts
  referencing new table as new_rows for each statement execute function public.fn_post_document_change();
create trigger trg_post_document_change_upd after update on public.posts
  referencing old table as old_rows new table as new_rows for each statement execute function public.fn_post_document_change();
create trigger trg_post_document_change_del after delete on public.posts
  referencing old table as old_rows for each statement execute function public.fn_post_document_change();
create trigger trg_post_document_change_trunc after truncate on public.posts
  for each statement execute function public.fn_post_document_change();

-- What the edge reads (directly, anonymously, in the background, at most every 2 seconds per edge instance and only while that instance serves
-- a burst of Post requests): the address keys of Posts changed in the last 20 minutes and, after a bulk change, the time until which every
-- Post document must be built fresh. 20 minutes is more than three times the longest life of a kept copy (5 minutes fresh + 1 minute served
-- while refreshing). Hashes and a count only: no id, slug, title or content.
create function public.post_document_recent_changes_v1()
returns jsonb language sql stable security definer set search_path to 'public' as $function$
  with p as (select payload from public.analytics_cache where cache_key = 'post_documents:changes'),
  e as (select t.e from p, jsonb_array_elements(coalesce(p.payload->'entries', '[]'::jsonb)) as t(e)
         where (t.e->>'at')::timestamptz > now() - interval '20 minutes')
  select jsonb_build_object(
    'version', 1,
    'now', now(),
    'window_seconds', 1200,
    'keys', coalesce((select jsonb_agg(distinct k.k order by k.k) from e, jsonb_array_elements_text(coalesce(e.e->'keys', '[]'::jsonb)) as k(k)), '[]'::jsonb),
    'all_until', (select case when (p.payload->>'all_until')::timestamptz > now() then p.payload->'all_until' else 'null'::jsonb end from p),
    'changes', (select count(*) from e))
$function$;

-- For maintenance that writes posts with triggers off (session_replication_role = replica) or outside SQL: every Post document is built fresh
-- for the given minutes. Administrators, service_role and a database owner session only.
create function public.admin_post_document_bypass_all(p_minutes integer default 20, p_reason text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_at timestamptz := clock_timestamp();
  v_until timestamptz := clock_timestamp() + make_interval(mins => greatest(1, least(coalesce(p_minutes, 20), 240)));
  v_entry jsonb;
begin
  if not (session_user in ('postgres', 'supabase_admin') or coalesce(auth.role(), '') = 'service_role' or public.rd_is_admin()) then
    raise exception 'not authorized';
  end if;
  v_entry := jsonb_build_object('at', v_at, 'op', 'bypass_all', 'ids', '[]'::jsonb, 'count', 0, 'keys', '[]'::jsonb, 'all', true,
    'tags', '[]'::jsonb, 'purge', 'not_requested', 'req', null, 'reason', left(coalesce(p_reason, ''), 200), 'until', v_until);
  insert into public.analytics_cache as c (cache_key, payload, computed_at, cache_kind, producer, producer_version, billable_state)
  values ('post_documents:changes', jsonb_build_object('entries', jsonb_build_array(v_entry), 'all_until', to_jsonb(v_until)),
          v_at, 'cdn_freshness', 'admin_post_document_bypass_all', 'v1', 'NOT_BILLABLE')
  on conflict (cache_key) do update set
    payload = jsonb_set(coalesce(c.payload, '{}'::jsonb), '{entries}', coalesce(c.payload->'entries', '[]'::jsonb) || jsonb_build_array(v_entry))
              || jsonb_build_object('all_until', to_jsonb(greatest(coalesce((c.payload->>'all_until')::timestamptz, v_until), v_until))),
    computed_at = v_at;
  return jsonb_build_object('all_until', v_until);
end $function$;

-- The confirmation watch (System Suggestions / Health). For every logged purge request of the last 5 hours (pg_net keeps responses 6 hours)
-- it reads the response: 2xx = confirmed; an error, a timeout, a non-2xx answer or no answer after 10 minutes = failed. A first failure is
-- retried once with the same tags; a failure after the retry is final. Failures become one de-duplicated suggestion (high); a database
-- without the purge key gets one notice (medium) while Posts change. Heartbeat: analytics_cache 'post_documents:freshness_watch'.
create function public.fn_post_document_freshness_watch()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_now timestamptz := clock_timestamp();
  v_key text;
  v_configured boolean;
  v_entries jsonb;
  v_out jsonb := '[]'::jsonb;
  v_e jsonb;
  v_req bigint;
  v_state text;
  v_resp record;
  v_new_req bigint;
  v_changes int := 0; v_ok int := 0; v_failed int := 0; v_pending int := 0; v_retried int := 0; v_unpurged int := 0;
  v_last timestamptz;
  v_failed_ids jsonb := '[]'::jsonb;
  v_status text;
  v_result jsonb;
begin
  select s.decrypted_secret into v_key from vault.decrypted_secrets s where s.name = 'sod_post_document_purge_key' order by s.created_at desc limit 1;
  v_configured := coalesce(v_key, '') <> '';
  select c.payload->'entries' into v_entries from public.analytics_cache c where c.cache_key = 'post_documents:changes' for update;

  for v_e in select t.e from jsonb_array_elements(coalesce(v_entries, '[]'::jsonb)) as t(e) loop
    if (v_e->>'at')::timestamptz > v_now - interval '24 hours' and v_e->>'op' <> 'bypass_all' then
      v_changes := v_changes + 1;
      v_last := greatest(v_last, (v_e->>'at')::timestamptz);
      if v_e->>'purge' in ('not_configured', 'request_failed') then v_unpurged := v_unpurged + 1; end if;
      if v_e->>'purge' = 'request_failed' then
        v_failed := v_failed + 1; v_failed_ids := v_failed_ids || coalesce(v_e->'ids', '[]'::jsonb);
      end if;
    end if;
    v_req := coalesce(v_e->>'retry_req', v_e->>'req')::bigint;
    if v_req is not null and (v_e->>'at')::timestamptz > v_now - interval '5 hours' and coalesce(v_e->>'check', '') not in ('ok', 'failed') then
      select r.status_code, r.timed_out, r.error_msg into v_resp from net._http_response r where r.id = v_req;
      v_state := case
        when not found then case when (v_e->>'at')::timestamptz < v_now - interval '10 minutes' then 'failed' else 'pending' end
        when coalesce(v_resp.timed_out, false) or v_resp.error_msg is not null or v_resp.status_code is null
             or v_resp.status_code not between 200 and 299 then 'failed'
        else 'ok' end;
      if v_state = 'ok' then
        v_e := v_e || jsonb_build_object('check', 'ok', 'checked_at', v_now);
      elsif v_state = 'failed' then
        if v_e->>'retry_req' is null and v_configured then
          begin
            v_new_req := net.http_post(
              url := 'https://sod1820.co.il/api/post-document-cache',
              body := jsonb_build_object('tags', coalesce(v_e->'tags', '[]'::jsonb)),
              headers := jsonb_build_object('Content-Type', 'application/json', 'x-sod-purge-key', v_key),
              timeout_milliseconds := 5000);
            v_e := v_e || jsonb_build_object('check', 'retried', 'checked_at', v_now, 'retry_req', v_new_req);
            v_retried := v_retried + 1;
          exception when others then
            v_e := v_e || jsonb_build_object('check', 'failed', 'checked_at', v_now);
          end;
        else
          v_e := v_e || jsonb_build_object('check', 'failed', 'checked_at', v_now);
        end if;
      end if;
    end if;
    if (v_e->>'at')::timestamptz > v_now - interval '24 hours' then
      if v_e->>'check' = 'ok' then v_ok := v_ok + 1;
      elsif v_e->>'check' in ('failed', 'retried') then
        v_failed := v_failed + 1; v_failed_ids := v_failed_ids || coalesce(v_e->'ids', '[]'::jsonb);
      elsif v_e->>'req' is not null and v_e->>'check' is null then v_pending := v_pending + 1;
      end if;
    end if;
    v_out := v_out || jsonb_build_array(v_e);
  end loop;

  if v_entries is not null then
    update public.analytics_cache c set payload = jsonb_set(c.payload, '{entries}', v_out) where c.cache_key = 'post_documents:changes';
  end if;

  if v_failed > 0 then
    perform public.suggest_add('performance', 'post_document_purge_failed',
      'ניקוי ה־CDN לא אושר ל־' || v_failed || ' שינויים בפוסטים',
      'הבקשה למחוק את העותקים של פוסט שהשתנה נכשלה או לא נענתה. שכבת הקצה ממשיכה להגיש את הפוסט טרי 20 דקות אחרי כל שינוי, כך שגולשים אינם מקבלים עותק ישן; ניסיון חוזר אחד נעשה אוטומטית. יש לבדוק את המפתח ואת כתובת הניקוי.',
      jsonb_build_object('failed', v_failed, 'post_ids', v_failed_ids, 'retried', v_retried, 'checked_at', v_now),
      90, v_failed, 'high', 'post_document_purge_failed');
  end if;
  if not v_configured and v_changes > 0 then
    perform public.suggest_add('performance', 'post_document_purge_not_configured',
      'ניקוי ה־CDN בשינוי פוסט אינו מוגדר',
      'אין מפתח ניקוי במסד הנתונים, ולכן עותקים של פוסט שהשתנה אינם נמחקים מיד. הגולשים עדיין מוגנים בשכבת הקצה (פוסט שהשתנה לא מוגש מעותק במשך 20 דקות) ובתפוגה (6 דקות).',
      jsonb_build_object('changes_24h', v_changes, 'checked_at', v_now), 70, v_changes, 'medium', 'post_document_purge_not_configured');
  end if;

  v_status := case when v_failed > 0 then 'purge_failed' when not v_configured and v_changes > 0 then 'not_configured'
                   when v_changes = 0 then 'idle' else 'ok' end;
  v_result := jsonb_build_object('status', v_status, 'purge_configured', v_configured, 'changes_24h', v_changes, 'purges_ok', v_ok,
    'purges_failed', v_failed, 'purges_pending', v_pending, 'purges_retried', v_retried, 'unpurged_24h', v_unpurged,
    'last_change_at', v_last, 'edge_window_seconds', 1200, 'copy_life_seconds', 360);
  insert into public.analytics_cache (cache_key, payload, computed_at, cache_kind, producer, producer_version, billable_state)
  values ('post_documents:freshness_watch', v_result, v_now, 'watch_result', 'fn_post_document_freshness_watch', 'v1', 'NOT_BILLABLE')
  on conflict (cache_key) do update set payload = excluded.payload, computed_at = excluded.computed_at,
    cache_kind = excluded.cache_kind, producer = excluded.producer, producer_version = excluded.producer_version, billable_state = excluded.billable_state;
  return v_result;
end $function$;

revoke all on function public.fn_post_document_keys(text) from public, anon, authenticated;
revoke all on function public.fn_post_document_change() from public, anon, authenticated;
revoke all on function public.post_document_recent_changes_v1() from public;
grant execute on function public.post_document_recent_changes_v1() to anon, authenticated, service_role;
revoke all on function public.admin_post_document_bypass_all(integer, text) from public, anon;
grant execute on function public.admin_post_document_bypass_all(integer, text) to authenticated, service_role;
revoke all on function public.fn_post_document_freshness_watch() from public, anon, authenticated;
grant execute on function public.fn_post_document_freshness_watch() to service_role;

-- The existing Traffic Intelligence reader: the speed watch's open findings also list post_document_* findings, and the freshness heartbeat
-- is returned beside the speed watch. Exact anchor, replaced once.
do $patch_reader$
declare d text := pg_get_functiondef('public.admin_2029_analytics(integer,text)'::regprocedure); n text;
begin
  n := replace(d, $old1$        from public.system_suggestions s where s.detector like 'web_vitals_%' and s.status in ('pending', 'later')), '[]'::jsonb)
    ),
$old1$, $new1$        from public.system_suggestions s where (s.detector like 'web_vitals_%' or s.detector like 'post_document_%') and s.status in ('pending', 'later')), '[]'::jsonb),
      'post_document_freshness', (select jsonb_build_object('computed_at', c.computed_at) || c.payload
        from public.analytics_cache c where c.cache_key = 'post_documents:freshness_watch')
    ),
$new1$);
  if (length(d) - length(replace(d, $old1$        from public.system_suggestions s where s.detector like 'web_vitals_%' and s.status in ('pending', 'later')), '[]'::jsonb)
    ),
$old1$, ''))) <> length($old1$        from public.system_suggestions s where s.detector like 'web_vitals_%' and s.status in ('pending', 'later')), '[]'::jsonb)
    ),
$old1$) or n = d then raise exception 'reader anchor not found exactly once'; end if;
  execute n;
end $patch_reader$;

-- The existing 15-minute health watch runs the confirmation watch on every run.
do $patch_watch$
declare d text := pg_get_functiondef('public.fn_health_watch()'::regprocedure); n text;
begin
  n := replace(d, $old2$  -- G3_RELIABILITY_PRECLOSE: incident + dead-man + heartbeat, on the same 15-minute path.
$old2$, $new2$  -- Post document freshness (ZURIEL 17.11.2026): confirm every CDN purge of a changed Post, retry a failure once, report it.
  begin
    perform public.fn_post_document_freshness_watch();
  exception when others then
    null;
  end;

  -- G3_RELIABILITY_PRECLOSE: incident + dead-man + heartbeat, on the same 15-minute path.
$new2$);
  if (length(d) - length(replace(d, $old2$  -- G3_RELIABILITY_PRECLOSE: incident + dead-man + heartbeat, on the same 15-minute path.
$old2$, ''))) <> length($old2$  -- G3_RELIABILITY_PRECLOSE: incident + dead-man + heartbeat, on the same 15-minute path.
$old2$) or n = d then raise exception 'health watch anchor not found exactly once'; end if;
  execute n;
end $patch_watch$;

do $check$
declare r jsonb;
begin
  if (select count(*) from pg_trigger where tgrelid = 'public.posts'::regclass and tgname like 'trg_post_document_change%' and tgenabled = 'O') <> 4 then
    raise exception 'the four post document triggers are not all enabled';
  end if;
  if has_function_privilege('anon', 'public.fn_post_document_freshness_watch()', 'execute')
     or has_function_privilege('anon', 'public.admin_post_document_bypass_all(integer,text)', 'execute')
     or not has_function_privilege('anon', 'public.post_document_recent_changes_v1()', 'execute') then
    raise exception 'post document freshness privileges';
  end if;
  if pg_get_functiondef('public.fn_health_watch()'::regprocedure) not like '%perform public.fn_post_document_freshness_watch();%G3_RELIABILITY_PRECLOSE%' then
    raise exception 'fn_health_watch does not run the freshness watch';
  end if;
  if pg_get_functiondef('public.admin_2029_analytics(integer,text)'::regprocedure) not like '%''post_document_freshness''%' then
    raise exception 'the reader does not return the freshness heartbeat';
  end if;
  r := public.post_document_recent_changes_v1();
  if r->>'version' <> '1' or jsonb_typeof(r->'keys') <> 'array' then raise exception 'recent changes read %', r; end if;
end $check$;
