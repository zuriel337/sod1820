-- PROPOSAL ONLY - NOT APPLIED (S4/S5, 27.11.2026). Needs ZURIEL's explicit approval for this exact file.
-- Owner: traffic_intelligence_law (events / ingest_event). Based on the LIVE definition read 27.11.2026 (md5 3d2fa7cf1aa7513b981d338cab5aebc2).
-- Change (closed, additive, ONE anchor: three new families inserted before "calculator_2029"; no existing family is touched; tokens and bounded integers only; no free text, no identity):
--   * item_2029: view (kind, item_ref): a public cipher opened, named by the first 12 characters of its public id
--   * nav_2029: number_link_open, panel_open, panel_close, search_submit, share_bar_open, media_play, gallery_open
--     (from_surface, target_surface, panel, section, outcome, provider as tokens; count as int)
--   * calc_outcome_2029: ai_analysis_result, compute_failed, compute_empty, equals_preview_shown, equals_preview_all_opened (surface, method, reason tokens; count int)
-- The client registers the same families on first use (src/lib/publicReadingNavSpec2029.js): the code every page loads does not grow (shell budget unchanged).
-- Order-independent with 01-ingest-event-engagement-v2 (measurement-reliability-20261127): the guard accepts either preimage.
-- RELEASE ORDER: this SQL first, then the client. Until it is applied the client's new events are refused by ingest_event (dropped silently).
\set ON_ERROR_STOP on
begin;
  set local lock_timeout = '5s';
  do $$
  declare
    v_def text := pg_get_functiondef('public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)'::regprocedure);
    v_old text := $q$"calculator_2029":$q$;
    v_new text := $q$"item_2029":{"events":["view"],"fields":{"kind":"token","item_ref":"token"}},"nav_2029":{"events":["number_link_open","panel_open","panel_close","search_submit","share_bar_open","media_play","gallery_open"],"fields":{"from_surface":"token","target_surface":"token","panel":"token","section":"token","outcome":"token","provider":"token","count":"int"}},"calc_outcome_2029":{"events":["ai_analysis_result","compute_failed","compute_empty","equals_preview_shown","equals_preview_all_opened"],"fields":{"surface":"token","method":"token","reason":"token","count":"int"}},"calculator_2029":$q$;
  begin
    if position(v_new in v_def) > 0 then
      if md5(v_def) not in ('54b4c76942c8a4ff3553ecdd43341dde','1e2e1366f7178548ae2d325616e2a843') then raise exception 'ingest_event drift (the families are present but the rest differs); re-review'; end if;
      return;  -- already applied
    end if;
    if md5(v_def) not in ('3d2fa7cf1aa7513b981d338cab5aebc2','d5a37d261f13c4f910d1bdd6ecf1417c') then raise exception 'ingest_event changed since the 27.11.2026 read (md5 %); re-read before applying', md5(v_def); end if;
    if (length(v_def) - length(replace(v_def, v_old, ''))) / length(v_old) <> 1 then raise exception 'anchor "calculator_2029": not found exactly once'; end if;
    execute replace(v_def, v_old, v_new);
  end $$;
commit;
