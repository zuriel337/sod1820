# SOD1820 — G0 2029 LIVE RELEASE VERIFICATION · 2026-09-12

Canonical Supabase: `linswmnnkjxvweumprav`  
Foundation owner: `foundation_closure_protocol_law v4`  
Coordination owner: `inter_agent_coordination_law v9`  
Release authority: explicit ZURIEL `תעלה`  
G1: **NOT STARTED**

This file is the post-release evidence layer. The earlier divergence register remains the pre-release reasoning/audit history.

## Git baseline

- release branch: `gpt/g0-2029-live-clean-parity-v1`
- release-start main: `49929b54f197377616362b80a107d919fd4417f6`
- release-time Facebook executor correction: `6f21594ac74c8b42c939fefaf14f867e64ec5eac`
- branch remained ahead-only at release preflight; final head is determined after this verification artifact and live-migration mirrors.

## Live migrations — applied and mirrored

The canonical migration ledger contains and git now mirrors:

- `20260912050511_g0_watchman_payment_raziel_release_v1.sql`
- `20260912050532_g0_green_api_webhook_root_v1.sql`
- `20260912050604_g0_cron_root_of_trust_rewrite_v1.sql`

Verified live effects:

- active Raziel registry points to `wa-raziel`;
- `system_watchman_run(boolean)` exists;
- `wa_webhook_is_authorized(text)` exists;
- `WA_WEBHOOK_TOKEN` exists in Vault (existence only; value is never recorded);
- anon/auth cannot execute `set_lead_rank(text,integer,integer)`;
- anon cannot execute `detect_suggestions()`;
- authenticated cannot execute `site_pulse(integer)`;
- payment alerts terminate in canonical `notify_admin` path.

## Cron root-of-trust — LIVE VERIFIED

- release cron set: **17 active / 17 expected**;
- reusable inline/query/JWT credentials: **0** after adjudicating one regex false-positive on `research-extract-scan`; it uses Vault and contains no literal `?s=`, JWT or API key;
- `wa-daily-digest`: no active cron row;
- Watchman weekly uses direct DB runner.

Latest post-cutover runs were `succeeded` for every cadence that had already become due: channel/gallery/post thumbnails, GSC, lab-reflect, page-ready, reply-email, research-extract, share-to-facebook, wa-channel-ingest, wa-hatishbi, wa-mora, wa-raziel, wa-uriel, welcome-backfill. `research-nurture-daily` and weekly Watchman had not reached their next scheduled cadence at verification time; absence of a post-cutover run is not a failure.

## Published legacy worker credential — LIVE CLOSED

All 16 previously affected source holders are represented by hardened or retired live versions.

A query-shaped legacy probe is rejected on all 16 targets: 15 hardened handlers return 403 without the required current service boundary; `wa-christina` returns 410. Live deployed sources use owner-appropriate current boundaries rather than the published static/query credential.

Key live versions include:

- `wa-raziel` v14 · `wa-webhook` v27 · `wa-process` v17
- `wa-uriel` v17 · `wa-hatishbi` v7 · `wa-mora` v5
- `wa-gabriel` v15 · `wa-michael` v6
- `wa-channel-ingest` v23 · `wa-ocr` v8 · `wa-poll` v10 · `wa-vip-backfill` v8
- `gen-thumb` v10 · `lab-reflect` v3 · `research-extract` v3 · `welcome-backfill` v7

## GREEN API — LIVE VERIFIED

- same Green instance preserved;
- webhook URL is clean canonical `.../functions/v1/wa-webhook`;
- `webhookUrlToken` configured;
- incoming webhook remains enabled;
- valid Bearer probe succeeded;
- missing/wrong Bearer failed;
- legacy query-only authorization failed.

No external provider receives `FB_ADMIN_KEY`.

## Resend inbound email — LIVE VERIFIED

- same Resend webhook resource preserved;
- status: enabled;
- subscription: `email.received`;
- endpoint: clean canonical `.../functions/v1/email-inbound`;
- signed Svix probe succeeded without creating inbox content;
- unsigned probe failed;
- inbound body remains untrusted stored data only; no inbound email instruction directly triggers actions.

No signing-secret value is stored in git/work_log/audit.

## Admin / paid / mutation boundaries — NEGATIVE VERIFIED

Unauthenticated invocation returns JWT-gateway 401 for:

`post-save` · `post-ai-edit` · `facebook-publish` · `wa-avatars` · `email-reply` · `field-pack` · `upload-image`.

Additional fail-closed evidence:

- `post-to-storyboard`: no configured run-key -> 503 before paid-model work;
- `email-ingest`: no configured ingest secret -> 503;
- `video-migrate`: missing service header -> 401;
- service media bridges reject missing service auth.

## Intentional public paths

- `journey-message`: malformed/bad input -> 400 before AI invocation; public product semantics preserved under its existing owner law.
- `email-open`: 200 with `Content-Type: image/gif`; intentionally public tracking-pixel semantics preserved.

## Facebook publication — release-time reconciliation

The initial candidate depended on Edge-local Facebook credentials which are not configured. Release verification caught this before cron restoration.

Resolution extends the existing canonical owner instead of introducing a parallel provider stack:

- `share-to-facebook` now authenticates with the existing service header;
- actual publishing delegates to service-role-only `fb_publish_post` / `fb_publish_photo` -> `social_admin` -> Vault;
- authorized live probe returned 200 with an empty queue (`picked: 0`), so no test post was published;
- direct `facebook-publish` remains a JWT/admin UI adapter over the same canonical RPCs.

## 410 retirements — 11/11 LIVE VERIFIED

Each endpoint below returns HTTP 410 live:

`admin-upload-once` · `reality-upload` · `wa-christina` · `migrate-media` · `fb-audit` · `fb-hide-test` · `ga-il-returning` · `smart-search` · `wa-daily-digest` · `system-watchman` · `notify-payment`.

Replacement-sensitive retirement ordering was respected: `wa-raziel` + registry, Watchman DB runner, and payment `notify_admin` routing were live first.

## Reproducibility / parity

- original missing Edge source set: **37/37 represented**;
- three release migrations are mirrored from the canonical live migration ledger;
- external webhook resources are reconciled in place rather than duplicated;
- no G1 adapter/context cleanup was performed.

## Remaining gate before declaring G0 CLOSED

1. freeze exact branch head after release evidence updates;
2. recheck current `main` and work_log overlap;
3. require exact-head Build Gate + Release Visual Gate + Vercel success;
4. merge PR445 only if still mergeable/current-main clean;
5. verify merged `origin/main` and rerun final live parity/security checks;
6. write final work_log AFTER.

State at this artifact: **LIVE RELEASE IMPLEMENTED + SECURITY VERIFIED · NOT YET MERGED · G0 NOT YET DECLARED CLOSED · G1 NOT STARTED.**
