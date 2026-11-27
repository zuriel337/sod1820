-- ROLLBACK for PROPOSAL.sql. Removes only the three families and requires an exact pre-change text. NOT APPLIED.
-- WARNING: after a rollback the client's nav, item and calculator-outcome events are refused again (silently dropped by the public build).
\set ON_ERROR_STOP on
begin;
  do $$
  declare
    v_def text := pg_get_functiondef('public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)'::regprocedure);
    v_old text := $q$"calculator_2029":$q$;
    v_new text := $q$"item_2029":{"events":["view"],"fields":{"kind":"token","item_ref":"token"}},"nav_2029":{"events":["number_link_open","panel_open","panel_close","search_submit","share_bar_open","media_play","gallery_open","study_action"],"fields":{"from_surface":"token","target_surface":"token","panel":"token","section":"token","outcome":"token","provider":"token","count":"int"}},"calc_outcome_2029":{"events":["ai_analysis_result","compute_failed","compute_empty","equals_preview_shown","equals_preview_all_opened"],"fields":{"surface":"token","method":"token","reason":"token","count":"int"}},"calculator_2029":$q$;
  begin
    if position(v_new in v_def) = 0 then return; end if;  -- already rolled back
    v_def := replace(v_def, v_new, v_old);
    if md5(v_def) not in ('3d2fa7cf1aa7513b981d338cab5aebc2','d5a37d261f13c4f910d1bdd6ecf1417c') then raise exception 'the rest of ingest_event changed after the proposal; rollback by hand'; end if;
    execute v_def;
  end $$;
commit;
