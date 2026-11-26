-- Traffic wave 26.11.2026, proposals P1 + P2 (PROPOSAL, NOT APPLIED). Apply only on an explicit ZURIEL approval of this exact file (CLAUDE.md 0.4:
-- DDL on the shared DB), as ONE transaction (apply_migration). Owner: traffic_intelligence_law v12, EXTEND_EXISTING (ingest_event, log_crawl, crawl_daily).
-- Package and evidence: docs/reviews/traffic-wave-20261126/README.md.
--
-- P1  An ingestion request whose User-Agent DECLARES automation (headless, puppeteer, playwright, selenium, phantomjs, webdriver) is treated exactly like a
--     client-marked bot (the existing first line "if coalesce(p_is_bot,false) then return"): no events row, no person, no lock. It is counted separately in the
--     existing crawl_daily (bot 'automation-declared', bucket 'ingest_event', blocked = true), the complementary bot-observation layer named by the law
--     ("do not re-ingest crawler flood merely to populate Clean BOT"). Forward-only: no existing row is read, changed or deleted.
-- P2  Every stored event gets props._request_evidence = {"ua": browser|unknown, "referer": site|preview|local|external|none}: closed values only, never the raw
--     User-Agent or Referer. It is evidence for the anomaly axis (P3) and is NOT a classification. Absent headers, unparsable headers and a failing log_crawl are
--     all fail-open: the event is ingested as before.
-- A short visit is never classified as a bot by this file. Googlebot and other crawlers do not reach ingest_event (they do not run page scripts); edge and
-- WAF behaviour is untouched.
--
-- The change is an anchored text patch of the LIVE definition (three anchors, each exactly once), not a copy of the function, so it composes with other
-- ingest_event patches. Live fingerprint read 26.11.2026: md5(pg_get_functiondef) 6dd7585345d10a3a323810fd768fcf3b. The second accepted fingerprint,
-- 94d268f7d6d689afe5c04cd478030801, is the same function after the (stale-guarded, unapplied) PR #1528 action-family patch. Anything else RAISES (P0001).
-- Rollback: 20261126190000_ingest_request_evidence_ROLLBACK.sql.
do $migration$
declare
  c_sig constant regprocedure := 'public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)'::regprocedure;
  c_known constant text[] := array['6dd7585345d10a3a323810fd768fcf3b', '94d268f7d6d689afe5c04cd478030801'];
  a_decl constant text := $a1$  v_props jsonb := p_props - '_measurement_account' - '_measurement_verified';
$a1$;
  a_bot constant text := $a2$  if coalesce(p_is_bot,false) then return; end if;
$a2$;
  a_ins constant text := $a3$  insert into public.events(event_id,ts,sod_id,person_id,session_id,surface,event_type,path,ref_host,
$a3$;
  f_decl constant text := $f1$  v_hdr jsonb;
  v_ua text;
  v_ref_host text;
  v_ua_class text;
  v_ref_class text;
$f1$;
  f_bot constant text := $f2$  -- request evidence (traffic wave 26.11.2026, P1/P2). Headers are read like the existing cf-connecting-ip read; every failure is fail-open.
  begin v_hdr := nullif(current_setting('request.headers',true),'')::jsonb; exception when others then v_hdr := null; end;
  v_ua := lower(coalesce(v_hdr->>'user-agent',''));
  if v_ua ~ '(headless|puppeteer|playwright|selenium|phantomjs|webdriver)' then
    begin perform public.log_crawl('automation-declared','ingest_event',true); exception when others then null; end;
    return;
  end if;
  v_ref_host := lower(substring(coalesce(v_hdr->>'referer','') from '^https?://([^/:?#]+)'));
  v_ua_class := case when v_ua ~ '^(mozilla|opera)/' then 'browser' else 'unknown' end;
  v_ref_class := case
    when v_ref_host is null then 'none'
    when v_ref_host in ('sod1820.co.il','www.sod1820.co.il','sod1820.vercel.app') then 'site'
    when v_ref_host ~ '^sod1820(-[a-z0-9]+)*[.]vercel[.]app$' then 'preview'
    when v_ref_host in ('localhost','127.0.0.1') then 'local'
    else 'external' end;
$f2$;
  f_ins constant text := $f3$  if v_props is not null and jsonb_typeof(v_props) = 'object' then
    v_props := v_props || jsonb_build_object('_request_evidence', jsonb_build_object('ua', v_ua_class, 'referer', v_ref_class));
  end if;
$f3$;
  v_def text; v_md5 text; v_new text;
begin
  perform set_config('lock_timeout', '3s', true);
  perform set_config('statement_timeout', '30s', true);
  if to_regprocedure('public.log_crawl(text,text,boolean)') is null then
    raise exception 'log_crawl(text,text,boolean) is missing; the automation counter has nowhere to write' using errcode = 'P0001';
  end if;
  v_def := pg_get_functiondef(c_sig);
  if position('_request_evidence' in v_def) > 0 then
    raise notice 'ingest_event already carries the request-evidence patch; nothing to do';
    return;
  end if;
  v_md5 := md5(v_def);
  if not (v_md5 = any (c_known)) then
    raise exception 'ingest_event drift (md5 %); independent review required, nothing changed', v_md5 using errcode = 'P0001';
  end if;
  if (length(v_def) - length(replace(v_def, a_decl, ''))) / length(a_decl) <> 1
     or (length(v_def) - length(replace(v_def, a_bot, ''))) / length(a_bot) <> 1
     or (length(v_def) - length(replace(v_def, a_ins, ''))) / length(a_ins) <> 1 then
    raise exception 'ingest_event anchors are not exactly once each; refusing, nothing changed' using errcode = 'P0001';
  end if;
  v_new := replace(replace(replace(v_def, a_decl, a_decl || f_decl), a_bot, a_bot || f_bot), a_ins, f_ins || a_ins);
  execute v_new;
  v_def := pg_get_functiondef(c_sig);
  if position('_request_evidence' in v_def) = 0 or position('automation-declared' in v_def) = 0 or md5(v_def) = v_md5 then
    raise exception 'post-check failed: the patched definition is not in place' using errcode = 'P0001';
  end if;
end
$migration$;

-- Check (read-only, after applying): select position('_request_evidence' in pg_get_functiondef('public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)'::regprocedure)) > 0;
-- Expected effect on new traffic: events written by a normal browser carry props._request_evidence; a HeadlessChrome/Playwright/Selenium User-Agent writes no row and
-- increments crawl_daily (bot = 'automation-declared'). Grants of ingest_event are unchanged (CREATE OR REPLACE keeps the ACL).
