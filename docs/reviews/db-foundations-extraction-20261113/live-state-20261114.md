# Package P1: live state read on 14.11.2026 (read-only) — the "stamps" of the remaining steps

All values below were read from the canonical project `linswmnnkjxvweumprav` (PostgreSQL 17.6) on 14.11.2026 between 18:20 and 19:05 UTC with catalogue SELECTs only (`execute_sql`, role `postgres`, nothing written, no function executed). They are the preconditions of the apply files, and each apply file re-checks the ones it can (see `apply-plan.json`, field `guard`). **Before each approved step the operator reads them again** (`tests/live/m0_pre_apply_fingerprints.sql`, `tests/live/def005_pre_apply_definitions.sql`) and stops on any difference.

## 1. What is already applied — do not apply again

| Steps | Unit | Applied | Evidence |
|---|---|---|---|
| 1 and 9 | DEF-001b (feedback admin-only read, `els_records.visitor_id` hidden, two push RPCs; anonymous table access to `push_subscriptions` removed) | 14.11.2026 16:41 UTC by the release path, ZURIEL's approval for the exact packet of PR #1339 head `50b72a7e3fef98b2c86a57f325d486bc9b8eea27` (`01-prepare.sql` `471eaecb…`, `02-lockdown.sql` `cc1d0d8d…`) | catalogue `LOCKED cfd6f768976982e51158bf89b4468b64`, API 6/6, public smoke 11/11 (Codex note, journal record `d558163b`); re-read here: the six `P` rows of the verification query are true |

The source files of steps 1 and 9 (`supabase/proposed/20261106121000_def001b_visitor_id_exposure_step1.sql`, `…121500_def001b_push_subscriptions_lockdown.sql`, `ROLLBACK_20261106121000_def001b.sql`) are byte-identical to `main` and are **not** re-applied; the Codex packet files in PR #1339 are the guarded form that was used and carry the exact baseline rollback (it also restores the anonymous `MAINTAIN` privilege on `push_subscriptions` that the plain rollback file drops, Codex finding 2 of 14.11).

## 2. Phase-aware verification of the whole package

`tests/live/m0_post_apply_verification.sql` with `applied = (1, 9)`: **56 rows, 56 as expected, VERDICT true** (14.11.2026 ~19:00 UTC). That is: the steps 1 and 9 rows are in force, every row of the remaining steps still shows the "before" state, every preservation row (public reads, `research_level_of`, cron job `security_spike_hourly`, public gallery read, public research read, no overload carrying a DEF-005 name) is true. The earlier form of the query required every row true after every step, which cannot hold while later steps are unapplied (Codex finding 1).

## 3. Preconditions per remaining step

### Step 2 — DEF-005, twelve functions server-only
All twelve signatures exist, `SECURITY DEFINER`, owner `postgres`, `anon`, `authenticated` and `service_role` can execute, no apply comment, no same-name overload (`A1b`: 0 rows). Definition md5 read now (the apply records exactly these values in the function comments; `ai_quota_check` equals the value read on 12.11.2026, the other eleven have no earlier reference in the repository, so they are compared with this reading):

| Function | `md5(pg_get_functiondef)` |
|---|---|
| `ai_quota_check(text,text,integer)` | `7981f2a5ba9e2b64c2a4b54d82b96bad` |
| `check_security_spike()` | `34103acfaee3893b7bb94e5763d1b58c` |
| `fn_detect_pattern_contradictions()` | `ebcf3f7d221414eff97612be4291c0df` |
| `fn_detect_patterns(integer,text)` | `24c9ecc39d5f28e09d12ff8a90518f48` |
| `fn_edge_grant_audit()` | `bc2212f2c19907ae076afc89b56ec896` |
| `fn_outbox_bump(text)` | `34112f058c2be8d324f1b7f049fd6dd0` |
| `fn_raziel_claim(text)` | `02526a0e45f69cdbbe8d3f7be1ce0f12` |
| `fn_raziel_claims_gc()` | `d2f7fefc8b6214f63963f1bbd8553410` |
| `fn_rls_grant_audit()` | `00b3fb49dc2d4af07bc3bddba4b0d6b3` |
| `fn_scan_reeval(text,text)` | `202430a1156d3d0dace9579874a4ae9f` |
| `router_rate_check(uuid,integer)` | `b21f44863db460d5fa0a20de6edd56d0` |
| `snapshot_seo_wave(integer,integer)` | `01be58699c1185fba04d2e76ea0124f5` |

### Step 4 — M0-A admin and account guards
`admin_resolve_translit(text,text,boolean)` `2aab330cb1f1fc77e51d902dfae5041b`, `admin_ai_cost(integer)` `0487c48ca5e930f132c3b30cceb69ca9`, `link_visitor_identity(text)` `4622faa398b9531275077139de09cc4e`: each equals the reviewed "before" md5 of the file. `wa_msg_count(uuid)` executable by `anon`, `authenticated`, `service_role` (through `PUBLIC`); policy `wall public read` on `gematria_wall` is `USING (true)`. Tail fingerprint `0eb07c1da74babeaf438250b700054fc` (6 lines).

### Step 5 — seven Legacy tables closed to client writes
33 effective client grants (`anon`/`authenticated` × `SELECT`/`INSERT`/`UPDATE`/`DELETE`), row security on, the reviewed policies exist verbatim (`anon_insert_words`, `anon_insert_syncs`, `chat_public_insert`, `chiddush_public_insert`, `beta_feedback_insert`, `lab_notes_insert`, `lab_messages_insert`, `lab_notes_read`, `lab_messages_read`; untouched neighbours `chat_public_read`, `chiddush_admin_read`, `anon_select_*`, `lab_*_admin_update/delete`). Fingerprint `3200137f4b3fe33aa59f0d8436e27dee` (57 lines).

### Step 6 — seven dormant "any signed-in user may write" policies
All seven present and not admin-only (`insights."authenticated write"`, `word_aliases_auth_write`, `hint_sets.admin_all`, `hint_set_members.admin_all`, `trails.admin_all`, `trail_members.admin_all`, `page_content.auth_write`). The live catalogue also holds a RESTRICTIVE `insights_private_space_read` that the step does not touch; the fixture of the tests now carries it so that the fixture fingerprint equals the live one. Fingerprint `4408d4349d306b19e2b6dade0e273e78` (22 lines).

### Step 7 — `add_contribution` guest limit by platform address
Body md5 `a2110027d793b61e461bb62954a4be69` = the reviewed "before".

### Step 8 — gallery Storage uploads (DEF-004), product decision D-1 open
Bucket `gallery`: public, `file_size_limit` NULL, `allowed_mime_types` NULL; 1,386 objects, the largest 114,883,491 bytes (below 120 MiB = 125,829,120). Policies on `storage.objects` (8): `community_anon_upload`, `community_authenticated_media_paths_v1` (RESTRICTIVE), `magar_authorized_delete/insert/update`, `magar_public_read`, `public_read`, `public_upload`. Fingerprint `fc57c5ec4289358741cd622b02d39556` (10 lines). `storage.objects` is owned by `supabase_storage_admin` and `postgres` is not a member of that role; policy DDL on `storage.objects` was nevertheless applied by the migration channel before (`20261013074630_p0_f02_remove_exact_temporary_storage_write_policies`, `community_authenticated_media_paths_v1`): if the platform refused it now, the transaction aborts and nothing changes.

### Step 10 — four inactive cron jobs with a URL secret
Jobs 6 `wa-deep-process`, 7 `wa-poll`, 22 `wa-michael`, 24 `wa-gabriel`: present, inactive, each carries the query secret; no other job carries one; `security_spike_hourly` active (preserved).

## 4. Why these fingerprints can be trusted

For steps 4 (tail), 5, 6 and 8 the fixture of the SQL test produces the **same** fingerprint as the live catalogue (compared on 14.11.2026). Where it did not (step 6: the RESTRICTIVE policy above was missing from the fixture) the fixture was corrected, not the guard. The fingerprints are identical on PostgreSQL 16 and 17 (the live server is 17.6; a newer major version may deparse expressions differently, in which case the guard refuses — fail closed — and the value has to be read again). Each AFTER value is what the apply produces on the fixture; each rollback ends with a postcondition that the catalogue equals the BEFORE value exactly, so a rollback that is not exact fails the test (and would fail live).

## 5. Rollback exactness checked against the live baseline (read 14.11.2026)

| Step | Result |
|---|---|
| 4 | exact: effective execution matrix and the `PUBLIC` entry of `wa_msg_count`, the wall policy text; the three function bodies by md5 |
| 5 | exact: the nine policies the apply drops are re-created with the live text, grants for `anon`/`authenticated` re-granted; no other privilege (`TRUNCATE`, `REFERENCES`, `TRIGGER`, `MAINTAIN`) is touched by the apply or the rollback |
| 6 | exact: seven policies restored with their live text |
| 8 | exact: `community_anon_upload` and `public_upload` re-created verbatim, bucket limit and MIME list back to NULL |
| 10 | by design not exact: the four jobs come back inactive and **without** the old secret (the secret was deliberately never kept) |
| 2 | exact up to the ACL form (`NULL` cannot be re-created by `GRANT`; the tests compare effective permissions), CR-X1 |
