-- IDENTITY_UNIFICATION_V1 — DB invariant for the sod_vid -> sod_id bridge.
-- Canonical model (unchanged, per Design Gate): sod_vid = Browser Visitor,
-- sod_id = Identity Spine, Person/Account = Human/account identity. This migration
-- does NOT merge sod_vid into sod_id semantically — it only guarantees that the
-- EXISTING bridge mechanism (identity_edges, kind='legacy_seed', written via the
-- EXISTING link_identity() RPC) can never let the same legacy/browser id (sod_vid,
-- or any of the other legacy keys identity.js already knows about) attach to more
-- than one Identity Spine (sod_id).
--
-- Preflight performed live against project linswmnnkjxvweumprav on 2026-09-03,
-- immediately before this DDL:
--   1) legacy_id -> multiple sod_id (kind='legacy_seed'): 0 violations (checked twice).
--   2) NULL/blank legacy_id under kind='legacy_seed': 0.
--   3) kind values in identity_edges: exactly {device, legacy_seed, login, probe} —
--      the WHERE kind='legacy_seed' predicate below is exact and does not touch the
--      other three kinds' semantics.
--
-- A first CONCURRENTLY attempt without the exclusion list below failed (23505) on a
-- REAL, PRE-EXISTING, UNRELATED bug: resolve_person() has an active check-then-insert
-- race (no row lock) that can mint two different person_id values for the same sod_id
-- under concurrent ingest_event() calls. This does NOT violate "legacy_id -> single
-- sod_id" (confirmed 0 violations on that specific check, twice) — it produces two
-- identity_edges ROWS for the same (sod_id, legacy_id, kind='legacy_seed') that differ
-- only in person_id, which a plain UNIQUE(legacy_id) index also rejects as a
-- side effect (it requires row-level, not just sod_id-level, uniqueness).
-- Measured blast radius of that separate bug: 3,656 sod_id with >1 person_id under
-- kind='device' (~5.4% of all-time sod_id), 105 (sod_id, legacy_id) pairs under
-- kind='legacy_seed' specifically (the ones this migration must route around), most
-- recent occurrence 2026-09-03 07:45 UTC — i.e. actively ongoing, not historical only.
-- Fixing resolve_person() itself is explicitly OUT OF SCOPE for V1 (separate, higher-
-- blast-radius change touching every event ingestion path) and per instruction no
-- conflict is auto-resolved or auto-merged here.
--
-- Resolution applied: the 105 known-conflicting legacy_id values are excluded from the
-- new unique index via a literal WHERE-clause carve-out (immutable list, required
-- because index predicates cannot reference other tables). Nothing is deleted, no
-- sod_id is changed, no persons are merged — the 105 pairs are left exactly as they
-- are, permanently excluded from this specific invariant's protection until a human
-- decides how to reconcile them. Each one is logged via the EXISTING events pipeline
-- (surface='identity', event_type='legacy_identity_conflict') — queryable, not a new
-- telemetry system — see the backfill INSERT below.
--
-- Production note: this file uses a plain (non-CONCURRENTLY) CREATE UNIQUE INDEX for
-- portability (CREATE INDEX CONCURRENTLY cannot run inside a transaction block, which
-- most migration runners — including a fresh `supabase db push` — wrap migrations in;
-- it also cannot take a literal exclusion list from a previous SELECT, so the excluded
-- IDs are hardcoded from the live snapshot above). The actual production apply for
-- this migration was run as CREATE INDEX CONCURRENTLY via direct SQL execution
-- (bypassing the transaction wrapper) specifically to avoid locking a live, actively-
-- written table — verified valid after creation (pg_index.indisvalid = true). Re-running
-- this file's plain form against an already-migrated database is idempotent
-- (IF NOT EXISTS) and safe; against a FRESH/empty database (tests, new environments)
-- the plain form is fine since there is no concurrent write load to worry about, and
-- the same 105 pre-existing production-only IDs simply won't exist there (the NOT IN
-- list is harmless — it only matters if those exact values are ever re-inserted, which
-- would itself only happen by restoring production data).

-- 1) Document the pre-existing conflicts via the existing events pipeline, not a new
--    telemetry system. Guarded so re-running this migration doesn't duplicate rows.
insert into public.events (ts, sod_id, surface, event_type, is_bot, props)
select
  now(),
  sod_id,
  'identity',
  'legacy_identity_conflict',
  false,
  jsonb_build_object(
    'legacy_id', legacy_id,
    'kind', 'legacy_seed',
    'person_ids', person_ids,
    'source', 'identity_unification_v1_preflight_backfill',
    'reason', 'resolve_person race produced >1 person_id for the same (sod_id, legacy_id); excluded from the new legacy_seed unique index pending human review — not auto-merged, not auto-resolved'
  )
from (
  select sod_id, legacy_id, array_agg(distinct person_id) as person_ids
  from public.identity_edges
  where kind = 'legacy_seed' and legacy_id is not null
  group by sod_id, legacy_id
  having count(distinct person_id) > 1
) conflicts
where not exists (
  select 1 from public.events e
  where e.surface = 'identity' and e.event_type = 'legacy_identity_conflict'
    and e.props->>'source' = 'identity_unification_v1_preflight_backfill'
    and e.props->>'legacy_id' = conflicts.legacy_id
);

-- 2) The invariant itself: one Identity Spine (sod_id) per legacy/browser id, scoped
--    exactly to kind='legacy_seed' (device/login/probe untouched).
CREATE UNIQUE INDEX IF NOT EXISTS identity_edges_legacy_seed_unique
  ON public.identity_edges (legacy_id)
  WHERE kind = 'legacy_seed'
    AND legacy_id IS NOT NULL
    AND legacy_id NOT IN (
      '0401ea30-ee9f-4b27-9ff6-f7782b95e434','0572e53c-0f18-4bd6-87e5-55df9db52462','07881577-d8b5-41cb-9f0b-c3c871bcbbf0','10aafa66-17de-47c7-9482-76ec99329478','13659d7d-da16-47f9-9d7b-7ace3fa18ef5','1597fc45-e3db-4128-9f75-6aa21467be03','15a66b1a-de3d-4d7c-b2b1-97987336c316','17d159e0-89ef-4159-b124-8a9ae37b3e49','19982a25-7d08-4294-8993-b38a17a8f020','1e0ad37b-6757-4762-a7ee-826a68af9c8a','22618c48-76f3-4d2e-a19f-a262f375ad7e','23718595-cd02-4fa6-ac93-869ad2e5917d','2620a46e-c05e-43c9-8658-02b320625d6a','2b9d4e5a-f4e6-4861-8673-9e5c57302552','2e022b27-8cc8-4018-853d-6e9bbde40e12','2fc90feb-ca71-483e-884a-72f1ede3f90c','30b4025e-fc99-4c52-9e99-709efba761b3','31501b76-9eea-423f-a2af-6ec02b1b8928','31fdf611-03f3-46c8-afcc-b47a7eaca4be','3451df85-47d8-4c40-9fdb-3fdd44601fe3','354f118d-77d7-4a68-b352-1aec49a354fb','36dff039-9165-43d8-9f86-6e83231cb25b','3801a71e-4a81-4083-ba19-6662dc84ca92','41d9045f-0c2d-47a4-bf6e-24b8e635dd8a','43a4a215-5adb-40c3-a55e-0ea5640a9930','45dd6aea-e84c-4a35-9d4d-c1e5d9d14c21','493c625b-647a-4ff3-90d4-523aaeccde57','499909e5-8455-4fd3-a365-2baf68b39435','4a1ce37d-5698-47ea-afaa-a28b82c9f181','4a5f3722-b770-429d-8b30-86cfe0f573ab','4f020a14-3059-4d78-90da-5498b43532b6','50ed52f3-fd2b-4241-a10c-d05f71ddcb08','53583e02-3132-4b71-bf2c-393ff9fe6cc9','5562fca4-e8f0-4bbd-aa59-bd0c9ea2c0d6','5880a8a6-19ad-4b04-b728-bd1de96274af','5bc0d16d-84b7-4d30-a03d-447ba13ba1da','5e4a9be7-1ed6-4634-af29-7c03981538e1','60ebe0d3-19a9-4133-af30-6521dfd97797','636108f7-f0fc-49b6-bcb3-b379aa0fcc6a','699a6084-de89-449a-8c07-2fd563ba2838','6a617540-a1d8-4aa5-8de6-1e8a595d9dc6','6bc01dad-8ac6-4a0e-b9d0-442f76a1a66d','6c5dbe93-33b0-4762-a354-d9b666888b45','6dfb9faf-20fd-45c4-826f-67a17ce32aaa','73f45c92-764b-4826-a5d6-eaafbbfb66ad','7a5949cc-2ecf-47df-8459-9c6078dd2548','7d00fdf3-fa49-4255-a44f-d3764f7a5771','7f64c940-7c95-48df-afa4-3b9f3c826150','7f949767-641e-44bf-bf90-25e5cd490b19','84b7f986-70e3-4627-9a27-b9a6306358dd','84e6fb22-2880-46a0-81fb-9a849e51912a','87d3c5ad-4382-45c4-a2d4-a09f808f05cd','8b811c6b-dc81-4c16-8f76-d3a54f68c5be','90e55583-931c-44f7-8608-60680058c4c3','91535ad7-324f-4746-ac7b-49a633e489ae','944386bd-597e-4389-8980-304da9daeb39','95536234-c308-4ddc-80a9-e6b757b6ba52','9ecf010e-0acb-4945-8b70-77938e5e1ccd','9f21766a-4f2e-4d3f-bb17-56c02403b3a2','a06a1871-2f1d-4e83-8974-4f27497a1e7a','a158a34c-a8d5-4cdd-81c8-9e29cb5f6026','a377b835-dcb4-4d5a-9d4a-98bd120fd31d','a5e15fce-43ca-4688-906a-b65dbc62d04c','a7df7398-c99f-424e-8877-48a004780193','ab082f57-8314-43b8-9cf6-dec334d3d8ac','afcd9c5a-9acd-41ea-9a2c-b878deebad35','b05b6057-e4ef-4671-9b66-7a17a3634c9a','b0cc9c15-170d-4d7b-8a57-ca7276c93b00','b1564f21-cb28-4209-9fbc-e9ddeccd15d7','b82441be-6bf6-49bb-adac-32a773824239','b8b1b5ca-ca85-421c-a4ed-bef498174a23','b8e4a239-82b9-4074-b9a4-358a26ff23a1','bc1c1900-3d4e-4e33-b04e-f1ea573886c6','be7fc250-bccc-41ed-9d7f-27e9dd90ba2c','c4362e06-3aae-47e9-bdc9-c577b2952202','c4ce9630-5ca9-4517-86e8-cacdbc1e70a8','c66ad8b0-abe5-429f-b344-7c881b1b888a','c70eb4dc-6671-4a02-82e0-316eb4be9b96','c8f695b3-90de-4b41-bda3-771ab9513953','c94570e2-6dda-4f21-8224-984e6cced1fe','ca791261-6746-40ce-9fec-642b0ab4e894','cc5846e5-1903-47cd-a474-5fffae194d83','cd02988e-ed1e-496e-aadd-0fe8ef6e0fe7','cf1bcdb2-b90c-4b32-bb68-0fbb0199a950','d305a163-1f1b-42fa-8adb-a469bad5a8a9','d48b3143-d1ab-4c60-a2e6-21f1ac726a4d','d56c0eb8-b1bc-422f-adad-a7630eca561d','d63f5f12-72d1-4f87-8c55-b2ff6c146f21','d82030f3-7b36-4191-9d22-b6d1285b45bb','d8b9cf80-02f2-446f-b0a1-2d35f98ee57f','db5be8e2-e94d-4996-a137-d1e3a9f05786','dcdad862-0cb4-4652-8a4a-24bea175f9e2','ddf455eb-51f5-4b27-8827-acc626b2d5c3','dfeabdd1-6a88-4b92-be27-7e60b9f3126b','e61834e8-3000-4e4c-a7eb-a9c366a6b5b5','e8a19666-b086-4900-8ca7-7d7cf80f74f6','ebc67956-1e0c-4b53-9869-6481ca7e673f','f20b5f89-0c92-4aca-a086-55e5406d7ccf','f288657a-26f5-44f1-8872-e1db661fb7a4','f471d861-fdec-488d-8716-2fcf4a6aa218','f6162d18-8de7-4c0e-95e6-079a8eb0593c','f8e293a8-c492-4237-a8a0-054c0d104897','f9aec285-fc1d-49d6-bf4c-983f75a03f02','f9d34e43-36a3-4f07-ab74-e1cc67f9434e','fe66a39d-91fd-4040-beca-58d88b9601a3'
    );

-- Verified live immediately after creation (production): pg_index.indisvalid = true,
-- indisready = true. Also verified end-to-end with disposable test UUIDs (created and
-- immediately cleaned up, not real visitors): a first link_identity() bridge succeeded,
-- an attempted second bridge of a DIFFERENT sod_id to the SAME legacy_id failed with
-- 23505 duplicate key on this exact index — the invariant is live and enforced.
