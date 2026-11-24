-- Traffic Intelligence v12 — the story_2029 event family (ZURIEL 24.11.2026: approved in principle within the existing
-- Traffic Intelligence contract, no new table). NOT APPLIED until ZURIEL approves this exact text and this migration.
--
-- One transaction, guarded:
--   1. the active traffic_intelligence_law must be v11 with the exact text read on 24.11.2026 (md5 525452c0…);
--   2. ingest_event must be the exact live definition read the same day (md5 1b0f1f4b…), with its v_spec anchor exactly once;
--   3. v11 becomes inactive and v12 (v11 text + the update below, v11 metadata + story_2029_v1) becomes the active version,
--      as v10 → v11 was written (nodes.type='rule', supersedes_version, is_active);
--   4. ingest_event's v_spec gains the story_2029 entry — the same entry as readingActionSpec on the client.
-- Nothing else in ingest_event changes; no table, column, index, policy or grant is created.
do $migration$
declare
  v_old public.nodes%rowtype;
  v_fn constant regprocedure := 'public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)'::regprocedure;
  v_def text := pg_get_functiondef(v_fn);
  v_anchor constant text := $a$v_spec jsonb := '{"calculator_2029":$a$;
  v_story constant text := $s$v_spec jsonb := '{"story_2029":{"events":["impression","open","view","next","prev","close","complete"],"fields":{"content_world":"token","entry_surface":"token","item_ref":"token","index":"int","dwell_ms":"int"}},"calculator_2029":$s$;
  v_update constant text := $u$


[UPDATE 24.11.2026 — STORY 2029 EVENT FAMILY v1 · Human-Gate ZURIEL]
OWNER CHECK=EXTEND_EXISTING. The same events table, the same ingest_event intake and the same versioned measurement envelope (props.measurement v2). No table, store, collector or engine is created.

CANONICAL FAMILY. events.surface=story_2029 with event_type in {impression, open, view, next, prev, close, complete}. Bounded props only: content_world (token, e.g. or_geula); entry_surface (token: chat | or_geula | home); item_ref (the public channel_updates id of a live public item); index (int, the item's position in the rail); dwell_ms (int, on view only). No free text, title, caption, search term, account id or other personal content. The client projection (readingActionSpec) and ingest_event v_spec carry the same entry.

STORY VIEW != PAGE VIEW. PAGE_VIEW remains surface=page AND event_type=view only. Opening the story viewer does not change the route and emits no page view. No story_2029 event counts as a PAGE_VIEW, a Human Entrance or a page_engaged/page_bounce input; story_2029/impression is never an interaction.

IMPRESSION != OPEN != VIEW. impression = a rail item at least 50% visible for at least 1s, once per (item_ref, entry_surface, session). open = the person opens the viewer, once per opening. view = an item actually shown in the viewer, once per (item_ref, viewer opening); an automatic advance emits view for the next item, never next. next / prev / close / complete = one event per action. A re-render, a remount or a revisit of the same item inside the same opening emits nothing new.

NO DOUBLE COUNT. One emitter: the canonical 2029 story component. Deduplication is client-side by the keys above; the measurement envelope carries the session. Legacy track() / visitor_events story_* is never emitted by 2029.

PERFORMANCE. The story component and its telemetry load lazily with the story surface (chat, Or HaGeula page, Home when approved). The shell budget (scripts/test-2029-shell-budget.mjs) is unchanged; impressions use one IntersectionObserver per rail, no polling.

LEGACY SEPARATION. visitor_events section=or-geula story_* (Legacy, until 4.11.2026) is historical provenance: not migrated, not merged, not summed with story_2029. Any comparison names both measurement layers and both windows explicitly.

PUBLIC DISPLAY. Story counts are not shown publicly (v10 audience-size defer). A "recommended" rail may be ordered server-side by aggregated story views without exposing numbers.
$u$;
begin
  select * into strict v_old from public.nodes where type = 'rule' and rule_id = 'traffic_intelligence_law' and is_active;
  if v_old.rule_version <> 11 or md5(v_old.description) <> '525452c03d65967626336d65ac95cf83' then
    raise exception 'Unexpected active traffic_intelligence_law v% (%)', v_old.rule_version, md5(v_old.description);
  end if;
  if md5(v_def) <> '1b0f1f4bb05d0424df3a54f28f385fc1' then
    raise exception 'Unexpected ingest_event version %', md5(v_def);
  end if;
  if (length(v_def) - length(replace(v_def, v_anchor, ''))) / length(v_anchor) <> 1 then
    raise exception 'ingest_event v_spec anchor not found exactly once';
  end if;

  update public.nodes set is_active = false where id = v_old.id;
  insert into public.nodes (type, label, description, metadata, is_active, rule_id, rule_version, supersedes_version, weight)
  values ('rule', 'Traffic Intelligence v12 — Story 2029 Event Family', v_old.description || v_update,
    v_old.metadata || jsonb_build_object('story_2029_v1', jsonb_build_object(
      'approved_by', 'ZURIEL', 'approved_at', '2026-11-24', 'owner_check', 'EXTEND_EXISTING',
      'event_surface', 'story_2029', 'event_types', jsonb_build_array('impression', 'open', 'view', 'next', 'prev', 'close', 'complete'),
      'fields', jsonb_build_object('content_world', 'token', 'entry_surface', 'token', 'item_ref', 'token', 'index', 'int', 'dwell_ms', 'int'),
      'page_view_separate', true, 'legacy_excluded', jsonb_build_array('visitor_events section=or-geula story_*'),
      'public_counts_deferred', true, 'private_payload_forbidden', true)),
    true, 'traffic_intelligence_law', 12, 11, v_old.weight);

  execute replace(v_def, v_anchor, v_story);
end;
$migration$;
