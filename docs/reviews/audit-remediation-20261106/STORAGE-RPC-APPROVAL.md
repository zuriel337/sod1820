> **עדכון M0 · 12.11.2026:** DEF-004 עודכן במקומו לנוסח M0 (נתיבים, סוגי קבצים, תקרת 120 MiB, החרגת מנהל). המקור הנוכחי: `docs/reviews/m0-security-stabilization-20261112/cluster-C-gallery.md`. מסמך זה מתאר את טיוטת 6.11 ונשמר כהיסטוריה.

# DEF-004 (Storage) and DEF-005 (public RPCs) — approval sheet

> **Not applied.** Files: `supabase/proposed/20261106130000_def004_gallery_storage_upload_policies.sql`, `…131000_def005_revoke_internal_rpcs_from_clients.sql`. Tests: `tests/sql/def004_…`, `tests/sql/def005_…`, `test/def005-rpc-grants-contract.test.mjs` (CI job `security-sql-contracts` + `live-contracts-2029`).

## A. Storage — policy diff (bucket `gallery`, table `storage.objects`, command INSERT)

| Policy | Today | Proposed |
|---|---|---|
| `community_anon_upload` (permissive; anon + authenticated) | any object under `community/` | **dropped** |
| `public_upload` (permissive; authenticated) | any path in the bucket | **dropped** |
| `community_authenticated_media_paths_v1` (**restrictive**) | blocks anon video and account paths | **unchanged** (still applies on top) |
| `gallery_flat_image_upload_v1` (new, anon + authenticated) | — | `community/<10-16 digits>-<1-12 alnum>.<jpg|jpeg|png|webp|gif|avif>` (the form `ReportHint.jsx` produces) |
| `gallery_client_upload_scoped_v1` (new, authenticated) | — | admin: anywhere · own `community/<uid>/<uuid>.<jpg|jpeg|png|webp|gif|avif|pdf|txt|docx|mp4|webm|mov>` · own `avatars/<uid>-<ts>.<raster>` · `sod1820/hints/<uid|anon>/<ts>-<n>.<raster>` · `sod1820/ciphers/c-<id>-<id>.png` · `sod1820/<key>-thumbs/<ts>-<n>.jpg` |

SELECT / UPDATE / DELETE policies, buckets, size and MIME limits: **unchanged**. Service-role writers (edge functions, admin tooling) bypass RLS and are unaffected.

**Who is affected:** (1) an anonymous visitor uploading a non-image or an SVG through the report form is now rejected (3 SVGs were uploaded that way on 2026-09-03; the last flat upload of any kind is from the same day); (2) a signed-in user can no longer create an object outside the prefixes above (grep of `src/` finds no such uploader); (3) administrators: no change.
**Proof legitimate flows still work (`tests/sql/def004…`, fixture = the production policy set dumped 2026-11-06):** anon flat jpg/PNG/webp ✓ · signed-in community video/pdf in own folder ✓ · own avatar ✓ · hint image (own folder and the `anon` fallback folder) ✓ · cipher card ✓ · thumbnail ✓ · admin replace-image and editorial paths ✓. **Denied:** anon svg/html/exe/mp4, anon account path, traversal (`community/../`), other buckets, user→editorial path, user→other user's community/avatar/hints folder, svg avatar, restrictive-policy video outside own folder (also for admins, as today).
**Not covered by this proposal (stated, not hidden):** object size — Storage RLS cannot limit it. Options: dedicated bucket with `file_size_limit` for community media, or routing uploads through `media-upload-intent`. Needs a decision.
**Rollback:** the header of the file restores the two dropped policies verbatim.

## B. Public RPCs — what changes

295 SECURITY DEFINER functions in `public` are executable by anon today (default PUBLIC execute). Classification and evidence: `README.md` §5. This proposal changes **25 function names in Set A (26 functions: `log_edge_geo` has two overloads) plus 1 in Set B** and nothing else:

| Set | Change | Functions |
|---|---|---|
| A (25) | revoke PUBLIC/anon/authenticated, grant service_role | `check_security_spike`, `fn_detect_pattern_contradictions`, `fn_detect_patterns`, `fn_raziel_claims_gc`, `fn_rls_grant_audit`, `fn_scan_reeval`, `snapshot_seo_wave`, `refresh_traffic_daily`, `enqueue_word_review`, `trusted_contributor_uids`, `push_sub_count`, `fn_metatron_gaps`, `fn_metatron_status`, `fn_cohort_acceptance`, `fn_decision_reeval_check`, `contrib_unlock`, `record_feedback`, `vote_translit`, `log_translit_query`, `increment_post_share_by_slug`, `log_edge_geo` (2 overloads), `fn_outbox_bump`, `fn_raziel_claim`, `router_rate_check`, `blocked_countries` |
| B (1) | revoke PUBLIC/anon, keep authenticated + service_role | `ai_quota_check` |

**Why these are safe:** no caller in `src/`, `api/`, `public-reading-deploy/`, `server/`, `public/`, `middleware*.js` (`test/def005-rpc-grants-contract.test.mjs` fails if one appears); the only DB dependents are SECURITY DEFINER functions (run as owner), pg_cron jobs (run as postgres) and edge functions that use the service role (`wa-*`, `field-router`: source read); no policy, view or trigger references them. `fn_els_search` is deliberately **not** touched because the anon-callable INVOKER function `fn_els_for_name` calls it (proved in the SQL test).
**Who is affected:** nobody legitimate. Anonymous callers can no longer trigger maintenance jobs, poison feedback/translit votes, probe `contrib_unlock` access codes, or read the trusted-contributor UID list.
**Left public on purpose (needs edge rate-limits, not grants):** telemetry sinks (`ingest_event`, `track_visit`, `log_*`, `recent_number_opens`, `fn_log_name_research`) and community writes (`propose_community_word`, `lang_link_add`, `ai_signal`, `increment_post_share`, `add_wall_word`, `save_wall_word_private`).
**Rollback:** `grant execute on function public.<name>(<args>) to anon, authenticated;` per function (the previous state was PUBLIC execute).
