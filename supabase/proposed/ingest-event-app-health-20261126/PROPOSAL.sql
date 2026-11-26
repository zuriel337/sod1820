-- PROPOSAL ONLY - NOT APPLIED. Consolidated ingest_event allowlist package (26.11.2026). Needs ZURIEL's explicit approval for this exact file.
-- Owner: traffic_intelligence_law (events / ingest_event). One writer, one change, based on the LIVE definition read 26.11.2026 (md5 6dd7585345d10a3a323810fd768fcf3b).
-- It replaces the ingest_event parts of three earlier proposals:
--   * 20261118210000_analytics_followups (els search/cross_search): ALREADY LIVE; its other two parts (fn_raziel_activity_notify, traffic_history notes) are live too.
--   * 20261119190000_els_action_telemetry (els ui_action ... count): ALREADY LIVE (the live "els" entry equals its v_new text).
--   * #1528 ingest_event-apply.sql (app_health): the ONLY remaining delta. Its guard (4006c823) matches the 20.11 text, not the live one, so it could not run as written.
-- Change: two closed families, "app_health" (#1528) and "video_2029" (video measurement, client on branch claude/video-measurement-20261126), added to the v_spec allowlist, inserted before "calculator_2029". app_health: six event names, two token fields (reason, stage). video_2029: four event names (play_requested, player_ready, embed_refused, watch_opened), fields provider (token), code (int), wait_s (int).
-- Privacy: tokens only (^[a-zA-Z0-9][a-zA-Z0-9_:.-]{0,47}$), no free text, no term, no identity; the existing envelope still requires version 2, a known path, no ref/via/device/journey/utm.
-- Not changed: privileges, owner, search_path, every other family, the activity_2029 rate limit, history (no row is read or rewritten).
begin;
  set local lock_timeout = '5s';
  do $$
  declare
    v_def text := pg_get_functiondef('public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)'::regprocedure);
    v_old text := '"calculator_2029":';
    v_new text := '"app_health":{"events":["save_started","save_confirmed","save_failed","auth_failed","load_failed","runtime_error"],"fields":{"reason":"token","stage":"token"}},"video_2029":{"events":["play_requested","player_ready","embed_refused","watch_opened"],"fields":{"provider":"token","code":"int","wait_s":"int"}},';
  begin
    if position(v_new in v_def) > 0 then
      if md5(replace(v_def, v_new, '')) <> '6dd7585345d10a3a323810fd768fcf3b' then raise exception 'ingest_event drift (app_health present but the rest differs); re-review'; end if;
      return;  -- already applied, nothing to do
    end if;
    if md5(v_def) <> '6dd7585345d10a3a323810fd768fcf3b' then raise exception 'ingest_event changed since the 26.11.2026 read (md5 %); re-read before applying', md5(v_def); end if;
    if (length(v_def) - length(replace(v_def, v_old, ''))) / length(v_old) <> 1 then raise exception 'anchor "calculator_2029": not found exactly once'; end if;
    execute replace(v_def, v_old, v_new || v_old);
  end $$;
commit;
