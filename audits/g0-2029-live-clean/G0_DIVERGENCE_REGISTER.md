# SOD1820 — G0 2029 LIVE CLEAN / DIVERGENCE REGISTER

**Gate:** G0 under `foundation_closure_protocol_law v3`  
**Canonical Supabase:** `linswmnnkjxvweumprav`  
**Current main baseline:** `49929b54f197377616362b80a107d919fd4417f6`  
**G0 branch:** `gpt/g0-2029-live-clean-parity-v1`  
**Mode:** object-state parity, not migration-ledger inference  
**Release:** branch-only unless explicitly labeled already-live security closure. No merge/deploy/retirement without ZURIEL `תעלה`.

## 1. Closure rule

G0 closes only when material live↔git divergence is resolved as one of:

- `PORT/REPRESENT` — current live state has reproducible source/config in git;
- `HARDEN+PORT` — risky live state has a bounded replacement candidate and release path;
- `RETIRE` — retirement was explicitly released and verified live;
- `EXPLICIT EXCEPTION` — owner-approved external configuration/provenance with a reproducible rollback path.

Open PRs and migration ledgers are evidence, never parity or release authority by themselves.

## 2. Current-main reconciliation

G0 originally branched from `17fe4b9c...`. Main later advanced through the Convergence Tree closure to `49929b54...`.
The five changed main files had zero overlap with the G0 change-set; the G0 branch was reconciled with current main in branch-only merge commit `16dbc246...`. No production release was caused by that reconciliation.

## 3. Already live-closed security

| Object | Live state | Repo state |
|---|---|---|
| `set_lead_rank(text,int,int)` | PUBLIC/anon/auth EXECUTE revoked; admin path preserved | parity SQL represented on branch |
| `upload-image` | live v15, `verify_jwt=true`, real user JWT + server-derived admin role required before service-role Storage write | same hardened source represented on branch |

Final negative/live replay is still required at the G0 closing rescan.

## 4. Original git-absent Edge census — branch representation COMPLETE

Baseline census found **77 ACTIVE live Edge Functions**, **41 function directories on then-main**, and **37 ACTIVE functions absent from git**.

Original missing set:

`admin-card-upload` · `admin-upload-once` · `email-inbound` · `email-ingest` · `email-open` · `email-reply` · `fb-audit` · `fb-hide-test` · `field-pack` · `ga-il-returning` · `journey-message` · `media-thumb-queue` · `migrate-media` · `notify-page-ready` · `notify-payment` · `notify-reply-email` · `post-ai-edit` · `post-save` · `post-to-storyboard` · `raw-put` · `reality-upload` · `research-nurture` · `send-test-mail` · `send-welcome-test` · `share-to-facebook` · `sign-upload` · `smart-search` · `storage-cleanup-oneoff` · `storage-put-raw` · `system-watchman` · `tmp-pancher-upload` · `tmp-upload` · `upload-image` · `video-migrate` · `wa-avatars` · `wa-christina` · `wa-daily-digest`.

**Current branch fact:** every one of those 37 slugs now has a `supabase/functions/<slug>/...` representation on the G0 branch. This closes the *branch representation* half of the original missing-source divergence; it does **not** claim the live functions have been released to those versions.

## 5. Function decisions

### RETIRE candidates — branch tombstones only, NOT live-retired

| Function | Decision | Priority / evidence |
|---|---|---|
| `admin-upload-once` | RETIRE → `agent-upload` | P0/P1 legacy reusable writer; canonical agent-media bridge exists |
| `reality-upload` | RETIRE → `agent-upload` | P0/P1 static-guard service-role writer; no second upload system |
| `wa-christina` | RETIRE | P1 orphan after `wa-raziel` rename/reroute; cron already moved |
| `migrate-media` | RETIRE | P2 migration complete; live queue observed 4357 done / 80 missing / 8 giant / 0 pending |
| `fb-audit` / `fb-hide-test` | RETIRE | P2 one-off June Facebook cleanup/probe utilities |
| `ga-il-returning` | RETIRE | P2 one-off GA analysis utility |
| `smart-search` | RETIRE | P1 no current runtime caller; legacy public service-role reader including broad `show_all` path; modern Research/Gematria owns search |
| `wa-daily-digest` | RETIRE | P1 old outbound WhatsApp publisher; cron was already inactive; reopening requires Truth/Human-Gate/auth reconciliation |

Already-live 410 sources now represented in git: `tmp-upload`, `tmp-pancher-upload`, `send-test-mail`, `send-welcome-test`, `storage-cleanup-oneoff`, `admin-card-upload`.

### HARDEN + PORT

| Function / object | Candidate boundary | State |
|---|---|---|
| `post-save` | real JWT → server admin check → service-only `sys_save_post` | branch candidate; current static-token path remains live until release |
| `post-ai-edit` | real JWT → server admin check before paid provider call | branch candidate; current public paid endpoint remains live until release |
| `post-to-storyboard` | mandatory configured `STORYBOARD_RUN_KEY`; no public-cost fallback | **live probe proved current endpoint has no effective run-key**; candidate fails closed (503) if secret remains absent |
| `email-ingest` | mandatory external Edge secret; no hardcoded fallback; bounded channel allowlist | branch candidate; live corpus currently has 0 `channel_updates.source=email` rows |
| `email-inbound` | Resend/Svix signature verification over raw webhook body; no URL/shared fallback secret | branch candidate; inbox is active data-wise (49 stored inbound emails; latest observed 2026-09-08) |
| `research-nurture` | scheduled path requires existing `FB_ADMIN_KEY` header; public unsubscribe remains per-lead token-bound | branch candidate |
| `video-migrate` | existing `FB_ADMIN_KEY` service header, HTTPS-only, bounded batch/size | **live probe proved current endpoint has no effective OCR/run-key**; active Source Video capability therefore uses existing proven service root rather than an unconfigured new secret |
| `notify-page-ready` | existing `FB_ADMIN_KEY` service header; no query/static fallback | branch candidate |
| `notify-reply-email` | existing `FB_ADMIN_KEY` service header; no query/static fallback | branch candidate |
| `wa-avatars` | real JWT + server-derived admin role; embedded static guard removed | branch candidate; no active cron caller found |

### KEEP + PORT

`email-open` · `email-reply` · `field-pack` · `share-to-facebook` · `media-thumb-queue` · `raw-put` · `storage-put-raw` · `sign-upload` · `journey-message`.

Important distinctions:

- `share-to-facebook` is an executor, not Human-Gate. `posts.share_to_fb=true` is admin-only under live RLS. Candidate invocation now uses the existing service key header, not inline cron credentials.
- `media-thumb-queue` + `sign-upload` have a proven GitHub Action caller (`scripts/media-thumbs.mjs`).
- `storage-put-raw` is still explicitly named by active `source_video_publish_law`; do not retire it until Source Video/poster capability has a proven replacement.
- `raw-put` has no current repo/DB caller found, but it remains represented during the large-media lineage reconciliation rather than being deleted by inference.
- `agent-upload` remains canonical for **agent media in its supported image/path/mime scope**. It does not silently supersede every large-video/document path.
- `journey-message` is intentionally free under `ai_quota_law v3`; `journey_ai_guard_law` owns the one-message-per-journey/session guard. G0 therefore PORTS current behavior and records the missing server-side anti-regression/rate boundary as **P1 owner debt**, not a reason to invent a generic 30/200 quota that would change product semantics.

## 6. Live auth/config probes — no secret values recorded

Non-mutating requests were sent with **no credential** only to determine whether existing Edge guards are actually configured:

- `raw-put` → `401 unauthorized`.
- `sign-upload` → `401 unauthorized`.

Because those live sources distinguish `not configured` from `wrong/missing credential`, this proves the existing Edge environment has `FB_ADMIN_KEY` configured.

Critical finding:

- `post-to-storyboard` with no run-key proceeded to input validation (`400 missing input`) rather than rejecting authorization.
- `video-migrate` with no run-key proceeded to input validation (`400 no items provided`) rather than rejecting authorization.

Therefore both current live endpoints have **no effective dedicated run-key configured** and remain material live P0/P1 surfaces until the hardened release. No privileged mutation/AI call was triggered by these empty-body probes.

## 7. Inbound email root-of-trust reconciliation

The connected Resend account has one enabled `email.received` webhook targeting the canonical `email-inbound` Edge endpoint. The legacy endpoint URL currently carries a reusable query credential. Do not reproduce its value.

Resend's receiving security model provides a signed webhook event (Svix headers) and requires verification against the raw body. The connected webhook resource also has a signing secret available to the authenticated Resend account; that value is never written to git/work_log.

Branch candidate now:

1. reads `req.text()` before parsing;
2. verifies `svix-id`, `svix-timestamp`, and `svix-signature` with HMAC-SHA256 and bounded timestamp skew;
3. uses an explicit `RESEND_WEBHOOK_SECRET` only if already configured, otherwise retrieves/caches the signing secret through the authenticated Resend Webhooks API using the existing Resend API credential;
4. accepts only signed `email.received` events;
5. fetches the full message through Resend receiving API and stores it as **untrusted inbox data only** — no actions/agent execution;
6. after the deployed signed handler is proven, updates the same Resend webhook resource to the clean endpoint without the legacy query credential.

This removes `EMAIL_INBOUND_SECRET` as a new G0 configuration requirement and avoids creating another secrets store/system.

## 8. Admin-alert / Watchman reconciliation

Live owner facts:

- `system_suggestions_law v1`: system learns/explains/proposes; no self-change.
- `admin_alert_direct_law v1`: admin alerts must end in canonical `public.notify_admin(...)`; no parallel sender.
- `notify_admin` currently delivers WhatsApp and explicitly reports that generic email sending is not yet implemented.

DRIFT found:

- live `system-watchman` carried a static guard and sent Resend/WhatsApp directly;
- live `admin_fire_watchman()` embedded the same old invocation root-of-trust;
- live `notify-payment` + `notify_payment_request_tg()` used a second direct admin-email path;
- `detect_suggestions()` is SECURITY DEFINER and had PUBLIC execute despite mutating `system_suggestions`;
- `site_pulse(integer)` is an internal Watchman analytics primitive and also had PUBLIC execute.

Branch resolution in `G0_EDGE_RELEASE_SQL_CANDIDATE.sql`:

1. create `system_watchman_run(boolean)` under the existing Watchman owner;
2. run `detect_suggestions` + `site_pulse` and end only in `notify_admin`;
3. make `admin_fire_watchman()` call the DB runner directly — no Edge secret round trip;
4. revoke public/anon/auth execution on `detect_suggestions`, `site_pulse`, and the internal runner;
5. rewrite payment trigger delivery to `notify_admin` and retire the parallel `notify-payment` Edge sender.

This intentionally accepts the current canonical limitation that generic admin email is not yet implemented; G0 does not create a parallel email sender to hide that limitation.

## 9. Cron root-of-trust

Live active jobs observed: `share-to-facebook` (5m), `research-nurture-daily`, `system-watchman-weekly`, `page-ready-auto`, `reply-email-auto`. `wa-daily-digest` existed but was inactive.

Problem: several command strings contain invocation credentials directly.

Branch release candidate:

- no service-role key is added to Vault;
- `page-ready-auto`, `reply-email-auto`, `research-nurture-daily`, `share-to-facebook` resolve the already-existing `FB_ADMIN_KEY` from Vault at execution time and pass it only as a request header;
- `system-watchman-weekly` becomes a DB call to `system_watchman_run(false)`;
- `wa-daily-digest` remains unscheduled/retired.

The full SQL candidate was executed inside a live transaction as a syntax/object compatibility dry-run and rolled back successfully. Post-rollback verification proved `system_watchman_run` did not persist and all six original cron rows remained unchanged.

SQL is stored as **branch-only release candidate**, not a fabricated migration filename. On explicit release, run it through the canonical Supabase migration action and then mirror the generated migration version into git.

## 10. External config release checks

Secret **values** never belong in git/work_log.

Verified now:

- existing `FB_ADMIN_KEY` is configured in the Edge environment (proved through fail-closed 401 probes) and is present by name in Vault;
- no service-role key exists in Vault and G0 does not add one;
- the Resend account has an enabled signed `email.received` webhook for `email-inbound`; the target state reuses that signed resource rather than inventing `EMAIL_INBOUND_SECRET`.

Remaining configuration semantics:

- `EMAIL_INGEST_SECRET` — fail-closed external webhook; currently no live email-channel rows observed, so absence means capability safely remains unavailable rather than reverting to a hardcoded fallback.
- `STORYBOARD_RUN_KEY` — absence intentionally makes the hardened storyboard endpoint 503 rather than public-cost; it is **not** allowed to fall back to public execution.
- `email-inbound` requires the existing Resend API credential to be able to fetch webhook metadata/signing material (or an already-configured `RESEND_WEBHOOK_SECRET`). This must be verified during deployment before the webhook URL is cleaned.

`video-migrate` no longer depends on the absent `OCR_RUN_KEY`; it uses the existing service-to-service root.

## 11. Git-only counterpoint / PR hygiene

`facebook-publish` exists in git but is not the live canonical cron executor. Live authority is `share-to-facebook` plus the admin-only `posts.share_to_fb` state. Do not raw-merge or substitute `facebook-publish`.

Preliminary open-PR decisions remain:

- #445 — ACTIVE G0 DRAFT, sole G0 release candidate;
- #444 Roadmap v5.7 — later reconciliation only; no merge while G0 MUSTs are open;
- #431 — rebase/reconcile candidate;
- #410/#383 and spatial/design previews — evidence/prior art, not G0 authority;
- #202/#201 — current live image-provenance state has been ported forward; never raw-merge;
- #97 — storyboard prior lineage; current source has been ported/hardened instead of raw merging old PR;
- other stale legacy prototype PRs remain EVIDENCE/PRIOR-ART/SUPERSEDED according to the prior triage and require no raw merge.

## 12. Independent specialist state

Claude READ_ONLY Edge census assignment: work_log `19208c7e-ced5-4f19-8e1b-3f526df1d587`.

At the latest live scan there is still **no AFTER**. Because this is a security/release scope, independent specialist review remains **REQUIRED before final G0 release/closure** if it can still change the release matrix. GPT does not block evidence gathering on a sleeping session and has continued live verification independently.

## 13. Current blockers

1. **No release authorization yet.** Current live still includes material unguarded/legacy endpoints, including the proven storyboard/video surfaces; branch candidates are not live until ZURIEL says `תעלה`.
2. Reconcile Claude AFTER if it arrives; if not, perform the required independent pre-release security cross-check by the available specialist path before declaring G0 sufficient.
3. Re-run branch diff/current-main overlap and CI on the final pre-release head.
4. On explicit release: apply the canonical migration, deploy the selected hardened/tombstone Edge versions with the exact modes in `G0_EDGE_DEPLOY_MATRIX.md`, verify signed inbound email before cleaning the Resend webhook URL, verify cron commands contain no inline credentials, and negative-test privileged paths.
5. Perform full closing rescan: current main + DB object state + Edge live versions/hashes/auth + active crons + grants/RLS + owner index + open PR state.

**Current state: G0 NOT SUFFICIENT.**  
**Branch representation of the original 37 missing Edge sources: COMPLETE.**  
**Higher gates remain blocked from merge/release as closure.**
