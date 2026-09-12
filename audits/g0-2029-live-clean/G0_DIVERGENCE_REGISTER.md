# SOD1820 — G0 2029 LIVE CLEAN / DIVERGENCE REGISTER

**Gate:** G0 under `foundation_closure_protocol_law v4`  
**Canonical Supabase:** `linswmnnkjxvweumprav`  
**Current main baseline:** `49929b54f197377616362b80a107d919fd4417f6`  
**G0 branch:** `gpt/g0-2029-live-clean-parity-v1`  
**Mode:** object-state parity, not migration-ledger inference  
**Release:** branch-only. No merge/deploy/retirement without explicit ZURIEL `תעלה`.

## 1. Closure rule

G0 closes only when material live↔git divergence is resolved as one of:

- `PORT/REPRESENT` — current live state has reproducible source/config in git;
- `HARDEN+PORT` — risky live state has a bounded replacement candidate and release path;
- `RETIRE` — retirement was explicitly released and verified live;
- `EXPLICIT EXCEPTION` — owner-approved external configuration/provenance with a reproducible rollback path.

Open PRs, migrations and audit notes are evidence, never parity/release authority by themselves.

## 2. Current-main reconciliation

G0 originally branched from an older main. Main later advanced through Convergence Tree closure to `49929b54...`; the G0 branch was reconciled onto that exact baseline and remains ahead-only at the latest reconciliation. No production release was caused by branch reconciliation.

## 3. Already-live security closures

| Object | Live state | Repo state |
|---|---|---|
| `set_lead_rank(text,int,int)` | PUBLIC/anon/auth EXECUTE revoked; admin path preserved | parity migration represented |
| `upload-image` | live v15, `verify_jwt=true`, real user JWT + server-derived admin role before service-role Storage write | same hardened source represented |

Final negative/live replay remains required at the G0 closing rescan.

## 4. Original git-absent Edge census — branch representation COMPLETE

Baseline census found **77 ACTIVE live Edge Functions**, **41 function directories on then-main**, and **37 ACTIVE functions absent from git**.

Original missing set:

`admin-card-upload` · `admin-upload-once` · `email-inbound` · `email-ingest` · `email-open` · `email-reply` · `fb-audit` · `fb-hide-test` · `field-pack` · `ga-il-returning` · `journey-message` · `media-thumb-queue` · `migrate-media` · `notify-page-ready` · `notify-payment` · `notify-reply-email` · `post-ai-edit` · `post-save` · `post-to-storyboard` · `raw-put` · `reality-upload` · `research-nurture` · `send-test-mail` · `send-welcome-test` · `share-to-facebook` · `sign-upload` · `smart-search` · `storage-cleanup-oneoff` · `storage-put-raw` · `system-watchman` · `tmp-pancher-upload` · `tmp-upload` · `upload-image` · `video-migrate` · `wa-avatars` · `wa-christina` · `wa-daily-digest`.

**Current branch fact:** all **37/37** now have `supabase/functions/<slug>/...` representation. This closes branch source representation only; it does not claim live release.

## 5. Function decisions

### RETIRE — branch tombstones only, NOT live-retired

`admin-upload-once → agent-upload` · `reality-upload → agent-upload` · `wa-christina → wa-raziel` · `migrate-media` · `fb-audit` · `fb-hide-test` · `ga-il-returning` · `smart-search` · `wa-daily-digest` · `system-watchman` after DB replacement · `notify-payment` after DB replacement.

Already-live 410 parity represented: `tmp-upload` · `tmp-pancher-upload` · `send-test-mail` · `send-welcome-test` · `storage-cleanup-oneoff` · `admin-card-upload`.

### HARDEN / KEEP

- `post-save`: real JWT → canonical admin check → service-only `sys_save_post`.
- `post-ai-edit`: real JWT → canonical admin check before paid provider call.
- `facebook-publish`: real JWT → `rd_is_admin()` → service-role-only canonical `fb_publish_post` / `fb_publish_photo`; no second Graph/token stack.
- `post-to-storyboard`: mandatory configured run-key; fail closed if absent.
- `email-ingest`: mandatory external secret; no hardcoded fallback.
- `email-inbound`: signed Resend/Svix raw-body verification.
- `research-nurture`, `video-migrate`, `notify-page-ready`, `notify-reply-email`, `share-to-facebook`, media upload workers: existing bounded service root as documented in deploy matrix.
- `wa-avatars`: real JWT + server-derived admin role.
- `journey-message`: current intentionally-free product semantics preserved; server anti-regression/rate protection remains owner P1 debt.
- `email-open`: intentionally public tracking semantics preserved.

## 6. Live auth/config probes

No secret values are recorded here.

- `raw-put` and `sign-upload` reject missing credentials, proving the existing Edge service root is configured.
- `post-to-storyboard` and `video-migrate` live empty-body probes reached input validation rather than authorization; their hardened candidates close those current gaps without invoking privileged work.
- `FB_ADMIN_KEY` exists by name in Vault; no service-role key is added to Vault.

## 7. P0 discovered during Claude reconciliation — published legacy WhatsApp run-key

The repository is **public**. A reusable legacy WhatsApp/worker run-key was committed in current main and accepted by multiple active Edge functions. Therefore this is not merely “cron command hygiene”; the credential must be treated as **public/compromised P0**.

Main search found **16 source files** carrying that legacy credential. Candidate coverage is **16/16**:

- HARDEN in-place: `wa-poll`, `wa-ocr`, `gen-thumb`, `wa-vip-backfill`, `lab-reflect`, `wa-mora`, `wa-process`, `wa-michael`, `wa-uriel`, `wa-webhook`, `wa-gabriel`, `wa-hatishbi`, `wa-raziel`, `research-extract`, `wa-channel-ingest`.
- RETIRE: `wa-christina` → explicit 410 replacement `wa-raziel`.

Internal/manual workers now use the existing server-side `FB_ADMIN_KEY` via `x-fb-admin-key`, with no static/query fallback in candidate source. Active beta agents `wa-gabriel` and `wa-michael` were **not retired** merely because no current cron was observed; their capability is preserved and only invocation auth changes.

Release acceptance for this P0: the published legacy query/run-key path must fail against every active deployed target after release.

## 8. GREEN API external webhook root-of-trust

`wa-webhook` is different from internal workers: it is the external Green API inbound endpoint, so it must not expose `FB_ADMIN_KEY` to the provider.

Live verification:

- Green API incoming webhook is enabled.
- Current webhook target uses the canonical Edge URL with the legacy query credential.
- `webhookUrlToken` is currently not configured.

Green API supports a webhook URL token sent in `Authorization` (Bearer when no prefix is supplied). Candidate strategy extends the existing WhatsApp/Green path rather than creating a new auth system:

1. migration creates a random `WA_WEBHOOK_TOKEN` in Vault if absent;
2. service-only `wa_webhook_is_authorized(text)` compares the incoming Bearer value to Vault;
3. external Green API calls are accepted only with that Bearer token;
4. internal `wa-poll → wa-webhook` uses `x-fb-admin-key` and never exposes the Green token;
5. `wa-webhook → wa-ocr` likewise uses the internal service header;
6. during release, update the **same Green instance** to the clean webhook URL plus `webhookUrlToken`, preserving existing webhook-type settings;
7. verify valid Bearer succeeds, missing/wrong Bearer fails, and the old query credential no longer authorizes.

No token value belongs in git or `work_log`.

## 9. Inbound email root-of-trust

The connected Resend account has one enabled `email.received` webhook targeting `email-inbound`. Candidate verifies Svix headers over the raw body, accepts only signed `email.received`, fetches the full message through Resend, and stores it as **untrusted inbox data only** — no instruction execution.

Release choreography: deploy signed handler while current webhook remains → prove signed success + unsigned failure → update the same webhook resource to the clean endpoint without the legacy URL credential.

## 10. Watchman / admin-alert reconciliation

Newer `admin_alert_direct_law` requires admin alerts to end in canonical `public.notify_admin(...)`.

Candidate:

- creates internal `system_watchman_run(boolean)`;
- makes `admin_fire_watchman()` call it directly;
- revokes public/anon/auth execute on internal Watchman primitives;
- rewrites payment trigger delivery to `notify_admin`;
- retires direct `system-watchman` / `notify-payment` sender paths after replacements are live.

G0 intentionally does not invent a parallel generic email sender to hide the current `notify_admin` channel limitation.

## 11. Cron root-of-trust — 17/17 active auth-shaped jobs covered

Live scan found **33 active jobs**, of which **17** had reusable auth/query/JWT shapes inline.

Current release SQL unschedules/reschedules all 17 active targets using Vault-backed runtime lookup or a direct DB runner:

- `FB_ADMIN_KEY`: `page-ready-auto`, `reply-email-auto`, `research-nurture-daily`, `share-to-facebook`, `wa-raziel`, `wa-channel-ingest`, `wa-uriel`, `wa-hatishbi`, `wa-mora`, `lab-reflect`, `research-extract-scan`, `welcome-auto-new`, `gallery-thumbs`, `post-thumbs`, `channel-thumbs`.
- owner-specific `GSC_SYNC_KEY`: `gsc-daily-sync`.
- direct DB: `system-watchman-weekly` → `system_watchman_run(false)`.
- `wa-daily-digest` remains unscheduled/retired.

No service-role key is placed in Vault.

### Latest full transactional dry-run

The **current complete** SQL candidate — including Watchman/payment rewrites, Raziel registry update, Green webhook Vault token/helper, and all 17 cron rewrites — was executed against canonical Supabase inside one transaction with assertions, then rolled back.

Assertions passed:

- `WA_WEBHOOK_TOKEN` existed inside the transaction;
- `wa_webhook_is_authorized(text)` existed;
- active Raziel registry pointed to `wa-raziel`;
- exactly 17 target jobs were active after rewrite;
- zero target cron commands contained legacy `?s=` or inline JWT-shaped credentials.

Post-rollback verification:

- token did not persist;
- helper did not persist;
- Raziel registry returned to current live `wa-christina` pointer;
- original cron rows remained.

Therefore the SQL candidate is **syntax/object-compatible and zero-persistent-mutation tested**, but remains branch-only.

## 12. Claude independent audit — CONSUMED

Claude READ_ONLY assignment `19208c7e-ced5-4f19-8e1b-3f526df1d587` returned AFTER `89b919fb-22de-4b41-a54d-176005421c93`.

Reconciliation:

- **B1 Watchman cron:** cleared; atomic SQL replacement already covers it.
- **B2 wa-christina:** resolved candidate; live `wa-raziel` replacement proven, release SQL updates `agent_identity` before tombstone.
- **B3 `CLAUDE.md` active-systems inaccuracies:** substantive G0 owner-accuracy claims corrected for `smart-search`, `migrate-media`, `reality-upload`, `admin-card-upload`. Full bootstrap cleanup remains G1, not started.
- **B4 inline cron credentials:** expanded by GPT into the stronger P0 public-repo run-key finding; current candidate covers 17/17 active auth-shaped cron jobs and 16/16 source holders.
- **B5 Foundation version identity:** live active row/body now aligned to v4.
- `facebook-publish` drift: resolved candidate as a JWT/admin adapter over canonical FB publish RPCs.

Independent specialist requirement for the pre-release matrix is therefore **SATISFIED**. A new Claude audit is not required unless later changes materially alter the release/security decision.

## 13. G1 boundary

`inter_agent_coordination_law v9` and `foundation_closure_protocol_law v4` define **AGENT ENTRY / BOOTSTRAP RECONCILIATION 2029** for G1. It is documented but **NOT STARTED**. G0 remediation does not bulk-clean all adapters or create a context system.

## 14. Remaining blockers / release gate

1. **No release authorization yet.** Current live still has the old deployed security state until ZURIEL says `תעלה`.
2. Final branch-head CI/current-main/no-overlap recheck must be green on the exact release head.
3. On explicit release: apply the canonical migration; deploy exact Edge matrix; rotate Green webhook to Bearer clean URL; verify signed Resend inbound then clean its URL; deploy dependency-sensitive tombstones only after replacements are live.
4. Run negative + authorized replays, including old published WhatsApp run-key rejection, admin-only actions, paid-model endpoints, media mutation paths and scheduled workers.
5. Re-scan all active cron commands and active Edge sources: zero reusable inline credentials and zero active acceptance of the published legacy run-key.
6. Merge only the matching git representation, then run full G0 closing rescan: DB objects/grants/RLS + live Edge versions/auth/hashes + cron state + `origin/main` parity + owner index + open PR state.

**Current state: PRE-RELEASE CANDIDATE PREPARED · G0 NOT SUFFICIENT / NOT LIVE.**  
**Original 37 missing Edge sources: 37/37 represented.**  
**Published legacy worker credential sources: 16/16 candidate-covered.**  
**Active auth-shaped cron jobs: 17/17 candidate-covered.**  
**G1 remains blocked and NOT STARTED.**
