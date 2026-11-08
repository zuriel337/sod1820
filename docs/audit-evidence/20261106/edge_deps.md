# Edge-function dependency check (READ-ONLY) - project linswmnnkjxvweumprav, 2026-11-06

## Coverage (be aware)
- Deployed functions listed: 93. Deployed source actually fetched and read/grepped: 25
  (upload-image, noop, send-push, newsletter-signup, ai-analyze[592KB, grepped], research-run[322KB, grepped], els-live-reading, claude-raziel,
  wa-groups-list, smart-search, journey-message(+_shared/materialGate.js), field-router(+materialGate.js), els-search-bridge, ga-il-returning,
  nl-track, email-open, system-watchman, meta-capi, link-preview, newsletter-unsubscribe, gematria-api, notify-page-ready, notify-reply-email,
  openweb-sso, notify-approval).
- `get_edge_function` returned Bad Gateway when called in parallel (>3) and every payload is inlined into context (~5-15k tokens each), so the other
  68 deployed sources were NOT fetched. For those I grepped the repo copy (supabase/functions/*, 90 dirs, HEAD 881e7760) for all tokens:
  zero hits outside send-push, newsletter-signup, ai-analyze, research-run, _shared/materialGate.js. Repo vs deployed DRIFT is real
  (deployed-only: claude-raziel, els-live-reading, noop, wa-groups-list; repo-only: account-link-confirm), so the repo grep is evidence, not proof.
- Not fetched from deployed (68): gallery-ocr, video-migrate, migrate-media, share-to-facebook, post-to-storyboard, facebook-admin, fb-hide-test, fb-audit,
  storage-put, send-newsletter, wa-webhook, wa-process, wa-poll, wa-ocr, wa-vip-backfill, wa-daily-digest, tmp-upload, wa-channel-ingest, reality-upload,
  admin-card-upload, gsc-sync, email-ingest, wa-avatars, wa-christina, research-nurture, gen-thumb, admin-upload-once, post-ai-edit, post-save, wa-uriel,
  wa-michael, wa-gabriel, wa-hatishbi, lab-teacher, wa-mora, lab-reflect, send-test-mail, send-welcome-test, welcome-backfill, wa-raziel, research-extract,
  tmp-pancher-upload, sign-upload, notify-payment, email-inbound, email-reply, raw-put, number-researcher, media-thumb-queue, storage-put-raw, send-reengage,
  video-transcribe, field-pack, capture-video-thumb, raziel-attention, storage-cleanup-oneoff, expression-extract, ga-sync-server, agent-upload,
  facebook-publish, sg-rate-limit, media-upload-intent, wa-channel-research-intake, live-whatsapp-feed, g3-openweb-import-once, wa-video-enrich,
  wa-system-outbox, send-family-invitation-email.

## Token matches (deployed source actually read)
Tokens searched: resolve_visitor_email, notification_prefs_guest, notification_prefs, push_subscriptions, feedback (from("feedback") and /feedback),
els_records, visitor_id, watch_toggle, push_subscription_.  NONE of resolve_visitor_email, notification_prefs_guest, feedback, els_records,
watch_toggle, push_subscription_ appears in any fetched deployed source or in the repo functions.

| function | verify_jwt | tokens | line(s) | credential at that call |
|---|---|---|---|---|
| send-push | false (own auth: PUSH_ADMIN_KEY or admin JWT checked app-side) | push_subscriptions, notification_prefs, visitor_id | L34 `const supabase = createClient(SUPABASE_URL, SERVICE_KEY);` L52-53 `.from("push_subscriptions").select("endpoint, p256dh, auth, topics, user_id, visitor_id")` L57-58 `.from("notification_prefs").select("user_id, visitor_id, muted_until").not("muted_until","is",null)` L95 `.from("push_subscriptions").delete().eq("endpoint", s.endpoint)` | SERVICE ROLE (SERVICE_KEY = SUPABASE_SERVICE_ROLE_KEY, line 12). Caller JWT is only passed to auth.getUser(token); never used as the client credential. Explicit column lists, no select(*). |
| newsletter-signup | false | visitor_id | L108/L113 reads `visitor_id` from request body/form; L148 `body: JSON.stringify({ visitor_id: visitorId, source, action:"signup", topic:"newsletter" })` POST to `/rest/v1/subscribe_events` | key = SERVICE_ROLE (fallback ANON only if service key unset, L130). Target table is subscribe_events, NOT els_records/notification_prefs. |
| ai-analyze | true | visitor_id | `let vid = String(body?.visitor_id\|\|"")` (identity string `v:<vid>`); `visitor_id: String(visitorId\|\|"")` in an ELS contract payload; `/rest/v1/rpc/fn_raziel_answer` body `p_visitor: String(body?.visitor_id\|\|"")` (svcHeaders()) | Mixed: svcHeaders() = SERVICE ROLE for fn_raziel_*, ai_token_log, users, ai_quota_check; ANON key + caller Authorization only for els_verify_occurrence_v1 / els_matrix_reading_job_*_v1 RPCs. visitor_id is only a value passed along; no table read of visitor_id, no els_records / feedback / push / notification_prefs reference. Rest tables touched: ai_token_log, api_pricing, torah_stream, users, rpc/*. No select=*. |
| research-run | true | visitor_id | `visitor_id: clean17(input.visitor_id) \|\| null` (research-run request object); `safeVisitorId(run.visitor_id)` identity `v:<id>` | Request-object field only. Tables: gematria_words, rpc/fn_method_profile, fn_relation_candidate with ANON_KEY + caller Authorization (rpcTransport(ANON_KEY, authHeader)); SERVICE_KEY used for gate/trace. No watched table. |
| journey-message, field-router (via _shared/materialGate.js) | false | visitor_id | materialGate.js resolveCaller: `const vid = String(body?.visitor_id\|\|"").slice(0,60)` -> identity only; passed as p_visitor to fn_capability_execution_gate_v1 and `visitor` column of ai_token_log | SERVICE ROLE (serviceRpc / logTokens use serviceKey). Not els_records. (Same shared file is imported in repo by lab-teacher, number-researcher, raziel-attention, gallery-ocr - deployed copies not fetched.) |

All other fetched functions (upload-image, noop, els-live-reading, claude-raziel, wa-groups-list, smart-search[tombstone], ga-il-returning[tombstone],
system-watchman[tombstone], nl-track, email-open, meta-capi, link-preview, newsletter-unsubscribe, gematria-api, els-search-bridge, notify-page-ready,
notify-reply-email, openweb-sso, notify-approval): no token match. Credential notes: all use SERVICE ROLE except link-preview (ANON key reading
research_contributions only) and els-search-bridge (SERVICE ROLE calling els_search_page_core_v1 / els_verify_* RPCs; does not touch els_records directly).

## select=* / .select('*') on els_records, feedback, push_subscriptions with a non-service-role credential
None found in any fetched deployed source or in the repo functions (grep for `select=*`, `select('*')`, `select("*")` also returned nothing in ai-analyze/research-run).
Only select on a watched table: send-push, with explicit columns, using service role.

## Indirect risk (not a source hit, worth a DB-side check)
- ai-analyze (ANON/caller JWT) calls els_verify_occurrence_v1 and els_matrix_reading_job_*_v1, and els-search-bridge calls els_search_page_core_v1 /
  els_verify_occurrence_v1 / els_verify_batch_v1 (service role). If any of these RPCs is SECURITY INVOKER and reads els_records.visitor_id, a column
  REVOKE for anon/authenticated would break the anon/user-JWT path (ai-analyze). If SECURITY DEFINER, unaffected. Check pg_proc.prosecdef and body for visitor_id.

## Conclusions per planned change
1. REVOKE EXECUTE resolve_visitor_email from anon/authenticated: SAFE for all 25 fetched deployed functions and for the repo copies of all 90 (no reference).
   Residual: 68 deployed sources unread -> tiny drift risk (UNKNOWN for those only).
2. notification_prefs_guest_get_v1/_save_v1 stop returning email: SAFE - no edge function references them (they are client RPCs, not called here).
3. public.feedback admin-only read: SAFE - no edge function references feedback (from("feedback") or /feedback) in fetched deployed or repo source.
4. els_records column visitor_id revoke for anon/authenticated: SAFE for direct table access (no function reads els_records). AT RISK only conditionally:
   ai-analyze (calls els_* RPCs with ANON+caller JWT) if those RPCs are SECURITY INVOKER and select visitor_id; verify RPC security mode. Service-role paths
   (els-search-bridge) unaffected.
5. anon loses all access to push_subscriptions: SAFE - the only edge consumer, send-push, uses the SERVICE ROLE client for select and delete. Note send-push also
   reads notification_prefs (service role) - unaffected. Client-side push_subscription_* / watch_toggle are DB RPCs; not edge-function dependencies.

UNKNOWN: the 68 deployed functions listed above (deployed source not read; repo copies clean; deployed/repo drift demonstrated for 5 functions).
