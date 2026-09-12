# G0 Edge deploy matrix — branch-only

This is release choreography, not release authorization. Canonical Supabase: `linswmnnkjxvweumprav`.

`verify_jwt=false` below is allowed only where the handler has an explicit custom boundary or the endpoint is intentionally public. Service-role remains server-side.

## Harden / keep deployment set

| Function | Candidate gateway mode | Handler/root-of-trust | Release note |
|---|---:|---|---|
| `upload-image` | `verify_jwt=true` | real user JWT + server-derived admin role | already live hardened v15; parity/final negative replay |
| `post-save` | `true` | real JWT + admin role before `sys_save_post` | remove old shared edit-token authority |
| `post-ai-edit` | `true` | real JWT + admin role before paid provider | closes current public-cost P0 |
| `facebook-publish` | `true` | real JWT + canonical `rd_is_admin()` before calling canonical service-role-only FB publish RPCs | repairs current git-only/live-client drift without a second Graph/secret stack; direct one-post/one-image admin action remains distinct from queued `share-to-facebook` |
| `wa-avatars` | `true` | real JWT + admin role | removes embedded static guard |
| `email-reply` | `true` | JWT + admin gate | KEEP+PORT exact owner behavior |
| `field-pack` | `true` | JWT + admin gate | KEEP+PORT canonical pack wrapper |
| `video-migrate` | `false` | existing `x-fb-admin-key` / `FB_ADMIN_KEY` | active Source Video internal service; current live has no effective run-key |
| `wa-raziel` | `false` | existing `x-fb-admin-key` / `FB_ADMIN_KEY` | current canonical Raziel WhatsApp worker; remove embedded static query secret and reschedule cron from Vault; update `agent_identity.raziel.wa_slug` before retiring `wa-christina` |
| `wa-gabriel` | `false` | existing `x-fb-admin-key` / `FB_ADMIN_KEY` | active beta language agent; no active cron observed, preserve capability but eliminate public static credential |
| `wa-michael` | `false` | existing `x-fb-admin-key` / `FB_ADMIN_KEY` | active beta assistant; no active cron observed, preserve capability but eliminate public static credential |
| `wa-uriel` | `false` | existing `x-fb-admin-key` / `FB_ADMIN_KEY` | active beta method agent; cron moved to Vault-backed header |
| `wa-hatishbi` | `false` | existing `x-fb-admin-key` / `FB_ADMIN_KEY` | active beta companion agent; cron moved to Vault-backed header |
| `wa-mora` | `false` | existing `x-fb-admin-key` / `FB_ADMIN_KEY` | lab worker; cron moved to Vault-backed header |
| `lab-reflect` | `false` | existing `x-fb-admin-key` / `FB_ADMIN_KEY` | lab reflection worker; cron moved to Vault-backed header |
| `research-extract` | `false` | existing `x-fb-admin-key` / `FB_ADMIN_KEY` | paid/internal extractor; cron moved to Vault-backed header |
| `wa-channel-ingest` | `false` | existing `x-fb-admin-key` / `FB_ADMIN_KEY` | channel ingest worker; cron moved to Vault-backed header |
| `gen-thumb` | `false` | existing `x-fb-admin-key` / `FB_ADMIN_KEY` | one hardened owner for gallery/posts/channel thumbnail crons |
| `welcome-backfill` | `false` | existing `x-fb-admin-key` / `FB_ADMIN_KEY` | removes static fallback gate; active welcome cron moved to Vault-backed header |
| `wa-ocr` | `false` | existing `x-fb-admin-key` / `FB_ADMIN_KEY` | internal OCR worker; called by hardened `wa-webhook` with header, no query credential |
| `wa-poll` | `false` | existing `x-fb-admin-key` / `FB_ADMIN_KEY` | internal polling bridge; forwards to `wa-webhook` with header; no current active cron observed |
| `wa-process` | `false` | existing `x-fb-admin-key` / `FB_ADMIN_KEY` | internal deep-processing worker; no public static credential |
| `wa-vip-backfill` | `false` | existing `x-fb-admin-key` / `FB_ADMIN_KEY` | manual/internal maintenance path; no public static credential |
| `wa-webhook` | `false` | external GREEN API: `Authorization: Bearer <WA_WEBHOOK_TOKEN>` checked through service-only `wa_webhook_is_authorized`; internal `wa-poll`: `x-fb-admin-key` | dedicated token generated in Vault at release; clean webhook URL + Green `webhookUrlToken`; legacy query credential removed |
| `notify-page-ready` | `false` | existing `x-fb-admin-key` / `FB_ADMIN_KEY` | cron key comes from Vault at execution time |
| `notify-reply-email` | `false` | existing `x-fb-admin-key` / `FB_ADMIN_KEY` | cron key comes from Vault at execution time |
| `share-to-facebook` | `false` | existing `x-fb-admin-key`; content authorization is admin-only `posts.share_to_fb` | cron key comes from Vault |
| `research-nurture` | `false` | public per-lead unsubscribe token; scheduled run requires `x-fb-admin-key` | cannot use gateway JWT because unsubscribe is intentionally public |
| `media-thumb-queue` | `false` | existing `x-fb-admin-key` | proven GitHub Action caller |
| `sign-upload` | `false` | existing `x-fb-admin-key` | proven media-thumb caller |
| `raw-put` | `false` | existing `x-fb-admin-key` | transition/large-media bridge; no current repo caller found |
| `storage-put-raw` | `false` | existing `x-fb-admin-key` | preserved by active Source Video law |
| `post-to-storyboard` | `false` | mandatory configured `STORYBOARD_RUN_KEY` / `x-run-key` | current live has no effective run-key; hardened candidate safely fails closed if secret is absent |
| `email-ingest` | `false` | mandatory `EMAIL_INGEST_SECRET` header | external non-Resend webhook; fail closed if absent; no current email-channel rows observed |
| `email-inbound` | `false` | Resend/Svix HMAC signature over raw request body; signing secret fetched/cached via existing Resend API credential or explicit Edge secret | actively used inbox; no query-string secret in target state |
| `journey-message` | `false` | intentionally public UX under `ai_quota_law` + `journey_ai_guard_law` | PORT current semantics; server anti-regression remains P1 owner debt |
| `email-open` | `false` | intentionally public tracking pixel token semantics | KEEP+PORT |

## 410 retirement deployment set

Deploy the branch tombstone source with `verify_jwt=false` so old callers get an explicit 410 rather than an auth-gateway ambiguity:

`admin-upload-once` · `reality-upload` · `wa-christina` · `migrate-media` · `fb-audit` · `fb-hide-test` · `ga-il-returning` · `smart-search` · `wa-daily-digest` · `system-watchman` · `notify-payment`.

Already-live 410 parity only: `tmp-upload` · `tmp-pancher-upload` · `send-test-mail` · `send-welcome-test` · `storage-cleanup-oneoff` · `admin-card-upload`.

## Atomic ordering

1. Verify current main/branch head + no overlapping writer.
2. Verify required secret/config **existence only**; never record values.
3. Apply `G0_EDGE_RELEASE_SQL_CANDIDATE.sql` through canonical Supabase migration action. This updates `agent_identity.raziel.wa_slug` to `wa-raziel`, creates the dedicated `WA_WEBHOOK_TOKEN` in Vault if absent plus service-only `wa_webhook_is_authorized`, replaces the Watchman HTTP cron with the DB runner, and rewrites the full active inline-credential cron set to Vault-backed calls.
4. Verify DB grants/functions/crons: `system_watchman_run`, `notify_payment_request_tg`, `detect_suggestions`, `site_pulse`, `wa_webhook_is_authorized`, Raziel identity, and every rescheduled cron. No active cron command may contain a reusable secret/JWT/query credential after this step.
5. Deploy hardened KEEP/HARDEN candidates with the exact gateway modes above. `wa-raziel` must be live and accept the Vault-backed header path before `wa-christina` is tombstoned. `facebook-publish` must reject unauthenticated/non-admin invocation and succeed only for a real admin session. All workers that previously embedded the published legacy run-key must reject that old query path.
6. GREEN API webhook rotation: deploy the bearer-capable `wa-webhook`; use the existing canonical Green API administration path to set the same instance to clean URL `https://linswmnnkjxvweumprav.supabase.co/functions/v1/wa-webhook` and set `webhookUrlToken` from the new Vault token. Preserve the existing webhook-type settings. Verify Bearer-authenticated incoming webhook succeeds, missing/wrong Bearer fails, and the legacy query credential no longer authorizes. Only then treat the old URL secret as retired.
7. For `email-inbound`: while the existing Resend webhook is still enabled, verify the deployed handler accepts a correctly signed Resend/Svix event and rejects an unsigned/invalid event. Only then update the same Resend webhook resource to the clean endpoint `https://linswmnnkjxvweumprav.supabase.co/functions/v1/email-inbound` (same `email.received` subscription), removing the legacy query credential from the URL without recreating the webhook.
8. Deploy 410 tombstones only after their replacement/DB path is live where applicable. In particular, retire `wa-christina` only after `wa-raziel` + `agent_identity` verification.
9. Negative auth replay: unauthenticated privileged/cost/mutation paths must fail; the published legacy WhatsApp run-key/query path must fail everywhere; authorized paths must still work.
10. Re-scan active cron commands and active Edge sources. Closure requires zero active inline reusable credentials in cron command text and zero active deployed source paths that accept the published legacy static run-key.
11. Only then merge the matching git representation on explicit release authorization and run the full G0 closing rescan.
