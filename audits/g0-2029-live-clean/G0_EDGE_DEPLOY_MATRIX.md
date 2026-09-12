# G0 Edge deploy matrix — branch-only

This is release choreography, not release authorization. Canonical Supabase: `linswmnnkjxvweumprav`.

`verify_jwt=false` below is allowed only where the handler has an explicit custom boundary or the endpoint is intentionally public. Service-role remains server-side.

## Harden / keep deployment set

| Function | Candidate gateway mode | Handler/root-of-trust | Release note |
|---|---:|---|---|
| `upload-image` | `verify_jwt=true` | real user JWT + server-derived admin role | already live hardened v15; parity/final negative replay |
| `post-save` | `true` | real JWT + admin role before `sys_save_post` | remove old shared edit-token authority |
| `post-ai-edit` | `true` | real JWT + admin role before paid provider | closes current public-cost P0 |
| `wa-avatars` | `true` | real JWT + admin role | removes embedded static guard |
| `email-reply` | `true` | JWT + admin gate | KEEP+PORT exact owner behavior |
| `field-pack` | `true` | JWT + admin gate | KEEP+PORT canonical pack wrapper |
| `video-migrate` | `false` | existing `x-fb-admin-key` / `FB_ADMIN_KEY` | active Source Video internal service; current live has no effective run-key |
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
3. Apply `G0_EDGE_RELEASE_SQL_CANDIDATE.sql` through canonical Supabase migration action.
4. Verify DB grants/functions/crons, especially `system_watchman_run`, `notify_payment_request_tg`, `detect_suggestions`, `site_pulse`, and Vault-backed cron headers.
5. Deploy hardened KEEP/HARDEN candidates with the exact gateway modes above.
6. For `email-inbound`: while the existing Resend webhook is still enabled, verify the deployed handler accepts a correctly signed Resend/Svix event and rejects an unsigned/invalid event. Only then update the same Resend webhook resource to the clean endpoint `https://linswmnnkjxvweumprav.supabase.co/functions/v1/email-inbound` (same `email.received` subscription), removing the legacy query credential from the URL without recreating the webhook.
7. Deploy 410 tombstones only after their replacement/DB path is live where applicable.
8. Negative auth replay: unauthenticated privileged/cost/mutation paths must fail; authorized paths must still work.
9. Only then merge the matching git representation on explicit release authorization and run the full G0 closing rescan.
