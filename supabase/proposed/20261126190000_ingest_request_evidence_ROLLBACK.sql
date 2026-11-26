-- Rollback of 20261126190000_ingest_request_evidence_PROPOSAL.sql: removes exactly the three inserted fragments from the CURRENT definition and requires the result
-- to be one of the two accepted pre-patch fingerprints (otherwise RAISES and changes nothing). Rows already written keep their props._request_evidence key (harmless,
-- additive evidence); crawl_daily rows with bot = 'automation-declared' are kept as history.
do $migration$
declare
  c_sig constant regprocedure := 'public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)'::regprocedure;
  c_known constant text[] := array['6dd7585345d10a3a323810fd768fcf3b', '94d268f7d6d689afe5c04cd478030801'];
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
  v_def text; v_new text;
begin
  perform set_config('lock_timeout', '3s', true);
  v_def := pg_get_functiondef(c_sig);
  if position('_request_evidence' in v_def) = 0 then
    raise notice 'the request-evidence patch is not present; nothing to roll back';
    return;
  end if;
  if (length(v_def) - length(replace(v_def, f_decl, ''))) / length(f_decl) <> 1
     or (length(v_def) - length(replace(v_def, f_bot, ''))) / length(f_bot) <> 1
     or (length(v_def) - length(replace(v_def, f_ins, ''))) / length(f_ins) <> 1 then
    raise exception 'the patched fragments are not present exactly once each (the function changed after the patch); refusing' using errcode = 'P0001';
  end if;
  v_new := replace(replace(replace(v_def, f_decl, ''), f_bot, ''), f_ins, '');
  if not (md5(v_new) = any (c_known)) then
    raise exception 'removing the fragments does not give a known pre-patch definition (md5 %); refusing' , md5(v_new) using errcode = 'P0001';
  end if;
  execute v_new;
end
$migration$;
