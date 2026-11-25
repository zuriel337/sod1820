-- ROLLBACK for supabase/migrations/20261124190000_traffic_intelligence_v12_story_2029.sql. REVIEW ONLY, NOT APPLIED.
-- Running it is a separate ZURIEL approval of this exact file (CLAUDE.md 0.4). One transaction, guarded.
--
-- Forward-only, as the live rule guard (CL-16) requires: re-activating the retired v11 in a later transaction is a REVIVAL and is
-- refused without a new owner verdict and approval reference. So the rollback is a SUPERSESSION in one transaction: v12 becomes
-- inactive and v13 becomes active, with the exact v11 text plus a withdrawal note, and the v11 metadata plus story_2029_withdrawn_v1.
-- v12 stays as history (rule rows are never deleted).
--
-- It refuses unless the live state is exactly what the v12 migration produced:
--   1. the active traffic_intelligence_law is v12, supersedes v11, carries story_2029_v1, and its text begins with the exact v11 text
--      (v11 md5 525452c0…); no later version exists;
--   2. ingest_event carries the story_2029 v_spec entry exactly once and, without it, is byte-for-byte the v11-era definition
--      (md5 1b0f1f4b…).
-- Then ingest_event loses only the story_2029 entry, and it re-checks md5 1b0f1f4b… before committing.
-- Rows already written with surface=story_2029 are measurement history and stay; after the rollback ingest_event refuses new ones.
do $rollback$
declare
  v_new public.nodes%rowtype;
  v_old public.nodes%rowtype;
  v_fn constant regprocedure := 'public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)'::regprocedure;
  v_def text := pg_get_functiondef(v_fn);
  v_anchor constant text := $a$v_spec jsonb := '{"calculator_2029":$a$;
  v_story constant text := $s$v_spec jsonb := '{"story_2029":{"events":["impression","viewer_open","item_view","next","prev","close","complete"],"fields":{"content_world":"token","entry_surface":"token","item_ref":"token","index":"int","dwell_ms":"int"}},"calculator_2029":$s$;
  v_note constant text := $n$


[UPDATE — STORY 2029 EVENT FAMILY WITHDRAWN (rollback of v12) · Human-Gate ZURIEL]
The story_2029 event family of v12 is withdrawn: ingest_event no longer admits events.surface=story_2029. Rows already written are
measurement history: kept, not deleted, not migrated, not summed with any other layer. Everything else is the v11 text above, unchanged.
A future story family is a new version with its own approval.
$n$;
begin
  select * into strict v_new from public.nodes where type = 'rule' and rule_id = 'traffic_intelligence_law' and is_active;
  select * into strict v_old from public.nodes where type = 'rule' and rule_id = 'traffic_intelligence_law' and rule_version = 11;
  if v_new.rule_version <> 12 or v_new.supersedes_version <> 11 or not (v_new.metadata ? 'story_2029_v1')
     or md5(v_old.description) <> '525452c03d65967626336d65ac95cf83'
     or left(v_new.description, length(v_old.description)) <> v_old.description
     or exists (select 1 from public.nodes where type = 'rule' and rule_id = 'traffic_intelligence_law' and rule_version > 12) then
    raise exception 'TI v12 rollback: unexpected law state (active v%, v11 md5 %)', v_new.rule_version, md5(v_old.description);
  end if;
  if (length(v_def) - length(replace(v_def, v_story, ''))) / length(v_story) <> 1
     or md5(replace(v_def, v_story, v_anchor)) <> '1b0f1f4bb05d0424df3a54f28f385fc1' then
    raise exception 'TI v12 rollback: unexpected ingest_event version %', md5(v_def);
  end if;

  update public.nodes set is_active = false where id = v_new.id;
  insert into public.nodes (type, label, description, metadata, is_active, rule_id, rule_version, supersedes_version, weight)
  values ('rule', 'Traffic Intelligence v13 — v11 restored (story 2029 family withdrawn)', v_old.description || v_note,
    (v_old.metadata - 'rule_guard') || jsonb_build_object('story_2029_withdrawn_v1', jsonb_build_object(
      'withdraws', 'story_2029_v1', 'restores_text_of', 11, 'rows_kept', true, 'owner_check', 'EXTEND_EXISTING')),
    true, 'traffic_intelligence_law', 13, 12, v_old.weight);
  execute replace(v_def, v_story, v_anchor);

  if md5(pg_get_functiondef(v_fn)) <> '1b0f1f4bb05d0424df3a54f28f385fc1' then
    raise exception 'TI v12 rollback: ingest_event did not return to the v11-era definition';
  end if;
end;
$rollback$;
