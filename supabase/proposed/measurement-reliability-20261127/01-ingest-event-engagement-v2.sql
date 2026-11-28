-- PROPOSAL ONLY - NOT APPLIED (S1, 27.11.2026). Needs ZURIEL's explicit approval for this exact file.
-- Owner: traffic_intelligence_law (events / ingest_event). Based on the LIVE definition read 27.11.2026 (md5 3d2fa7cf1aa7513b981d338cab5aebc2).
-- Change: the engagement validator accepts engagement_version 1 (stale clients) AND 2 (the new client: no automatic 20 s credit).
-- Nothing else changes: same keys, same bounds, same privileges. NO history is read or rewritten (old rows keep version 1).
-- RELEASE ORDER: this SQL first, then the client that emits version 2. Until it is applied, a version-2 payload is refused by ingest_event.
-- Order-independent with the allow-list package (measurement-allowlist-20261127): the guard accepts either preimage.
begin;
  set local lock_timeout = '5s';
  do $$
  declare
    v_def text := pg_get_functiondef('public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)'::regprocedure);
    v_old text := $q$or v_props->'engagement_version' is distinct from '1'::jsonb$q$;
    v_new text := $q$or (v_props->'engagement_version' is distinct from '1'::jsonb and v_props->'engagement_version' is distinct from '2'::jsonb)$q$;
  begin
    if position(v_new in v_def) > 0 then
      if md5(v_def) not in ('d5a37d261f13c4f910d1bdd6ecf1417c','6efcfc48731fdb0957e6a0b35031c4e8') then raise exception 'ingest_event drift (engagement v2 present but the rest differs); re-review'; end if;
      return;  -- already applied
    end if;
    if md5(v_def) not in ('3d2fa7cf1aa7513b981d338cab5aebc2','2c965ff385fe61e90a02957a43b25ba7') then raise exception 'ingest_event changed since the 27.11.2026 read (md5 %); re-read before applying', md5(v_def); end if;
    if (length(v_def) - length(replace(v_def, v_old, ''))) / length(v_old) <> 1 then raise exception 'anchor (engagement version clause): not found exactly once'; end if;
    execute replace(v_def, v_old, v_new);
  end $$;
commit;
