-- EDGE_BOT_LOGGING_IO_PASS1 (Zuriel Human-Gate approved) — extend public.log_edge with an
-- optional trailing p_weight param instead of a parallel function. Reproduces exactly what was
-- live-applied via apply_migration in this pass (create-with-new-arity + drop-old-overload +
-- restore-explicit-grants), so `supabase db reset` lands on the same end state.
--
-- Purpose: middleware.js samples kind='browser' log_edge calls ~1-in-10 and passes p_weight=10
-- on the sampled call, instead of one UPSERT per browser request. goodbot/ai/bot traffic keeps
-- calling with 3 args (weight defaults to 1) — full fidelity, byte-identical to before this pass.
-- edge_geo_log.hits / edge_ua_seen.hits after this change already represent the estimated
-- request-equivalent count; no downstream consumer needs a ×N correction (all confirmed
-- consumers — traffic_composition(), admin_crawl_intel(), fn_ti_traffic_layers(),
-- traffic_day_detail() — just sum(hits), never assume hits==row-count).

CREATE OR REPLACE FUNCTION public.log_edge(p_country text, p_kind text, p_ua text, p_weight integer DEFAULT 1)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_ua      text := left(coalesce(nullif(p_ua, ''), '(empty)'), 300);
  v_country text := upper(left(coalesce(nullif(p_country, ''), 'XX'), 2));
  v_kind    text := coalesce(nullif(p_kind, ''), 'all');
  v_weight  integer := greatest(coalesce(p_weight, 1), 1);
begin
  insert into public.edge_geo_log (day, country, kind, hits)
  values (current_date, v_country, v_kind, v_weight)
  on conflict (day, country, kind) do update set hits = edge_geo_log.hits + v_weight;

  insert into public.edge_ua_seen (ua, kind, sample_country, hits)
  values (v_ua, v_kind, v_country, v_weight)
  on conflict (ua) do update
    set hits = edge_ua_seen.hits + v_weight, last_seen = now(), kind = excluded.kind;
end; $function$;

-- The old (text,text,text) signature is a distinct function identity from the one above and
-- would otherwise remain as a redundant, un-weighted twin ("parallel function" — explicitly
-- disallowed for this pass).
DROP FUNCTION IF EXISTS public.log_edge(p_country text, p_kind text, p_ua text);

-- CREATE OR REPLACE on the new arity creates a fresh function object that does not inherit the
-- prior explicit per-role grants (PUBLIC already covers anon/authenticated implicitly, but the
-- pre-change state had explicit grants too — restoring them for an exact match, not relying
-- solely on implicit PUBLIC coverage).
GRANT EXECUTE ON FUNCTION public.log_edge(text, text, text, integer) TO anon, authenticated;
