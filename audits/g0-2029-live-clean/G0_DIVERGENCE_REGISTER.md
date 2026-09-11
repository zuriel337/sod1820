# SOD1820 — G0 2029 LIVE CLEAN / DIVERGENCE REGISTER

**Gate:** G0 under `foundation_closure_protocol_law v3`  
**Canonical Supabase:** `linswmnnkjxvweumprav`  
**Baseline main:** `17fe4b9c89768566bc868f69dd0760ace67fda1d`  
**Mode:** object-state parity, not migration-ledger inference  
**Release:** branch-only except explicitly labeled live security closure; this file does not authorize merge/deploy/retirement.

## 1. Closure rule

G0 is not closed until every material live↔git divergence is either:

- `PORT/REPRESENT` — current live state is represented reproducibly in current-main code/migrations;
- `HARDEN+PORT` — insecure/stale live state has a verified replacement candidate and release path;
- `RETIRE` — Human-Gate-approved live retirement completed and verified;
- `EXPLICIT EXCEPTION` — owner-approved reason why a live object may remain external to git, with reproducibility/rollback proof.

An open/stale PR is evidence only. Never raw-merge because it exists.

## 2. Closed / represented or prepared in this G0 scope

| Object | G0 action | Current state |
|---|---|---|
| `foundation_closure_protocol_law` | v3 no-skip gates over W0–W9 | DB-LIVE / ACTIVE |
| `set_lead_rank(text,int,int)` | revoked PUBLIC/anon/auth EXECUTE; current admin path preserved; migration mirrored | DB-LIVE / BRANCH PARITY |
| `gallery_images.primary_value_source` + writers | current live DB semantics mirrored without raw-merging PR201/202 | BRANCH PARITY |
| `ImageEditModal` primary value writer | manual provenance stamp added | BRANCH |
| `upload-image` | unauthenticated service-role Storage writer replaced with JWT + server-derived admin check; source represented | EDGE LIVE HARDENED v15 / BRANCH PARITY; final negative E2E still required |
| `post-to-storyboard` | historical source recovered; optional run-key changed to mandatory fail-closed run key | BRANCH HARDENED |
| `post-save` | embedded shared edit token removed as authority; JWT → canonical `rd_is_admin()` → service-only `sys_save_post` | BRANCH HARDENED |
| `post-ai-edit` | provider call now requires JWT → canonical `rd_is_admin()` before paid AI execution | BRANCH HARDENED |
| `sys_save_post` | verified SECURITY DEFINER but no PUBLIC/anon/auth/service_role EXECUTE grant | LIVE VERIFIED BOUNDARY |
| `email-ingest` | embedded secret removed; external Edge secret required, fail closed, allowed broadcast channels bounded | BRANCH HARDENED |
| `email-inbound` | hardcoded fallback removed; configured `EMAIL_INBOUND_SECRET` required | BRANCH HARDENED |
| `research-nurture` | embedded run secret removed; configured Edge secret mandatory; public unsubscribe token path preserved | BRANCH HARDENED; cron-secret migration still open |
| `video-migrate` | preserved as Source Video capability; optional auth changed to mandatory `OCR_RUN_KEY`, HTTPS/bounds added | BRANCH HARDENED |
| `email-open` | live public tracking-pixel behavior represented | BRANCH KEEP+PORT |
| `email-reply` | live JWT + admin server-check behavior represented | BRANCH KEEP+PORT |
| `field-pack` | live JWT + admin gate + canonical `fn_gematria_pack` wrapper represented | BRANCH KEEP+PORT |
| `share-to-facebook` | live executor represented; `posts.share_to_fb` write RLS verified admin-only | BRANCH KEEP+PORT / flag is authorization state |
| Canonical Owner Index | stale active-version labels refreshed from live rules | BRANCH |

### Proven retire/tombstone candidates prepared on branch — NOT released

`admin-upload-once` · `reality-upload` → superseded by canonical `agent-upload` ticket bridge.  
`fb-audit` · `fb-hide-test` → one-off Meta cleanup/probe utilities.  
`wa-christina` → orphaned after canonical rename/reroute to `wa-raziel`; no live cron caller.  
`migrate-media` → legacy migration completed; live queue has 0 pending.  
`ga-il-returning` → one-off analysis utility.  

Already-inert live 410 sources represented on branch: `admin-card-upload` · `storage-cleanup-oneoff` · `tmp-upload` · `tmp-pancher-upload` · `send-test-mail` · `send-welcome-test`.

## 3. Edge inventory / security reconciliation

Baseline census: **77 ACTIVE Edge Functions** vs **41 function directories** on baseline main; **37 live functions were git-absent** at census.

Original missing-at-main census:

`admin-card-upload` · `admin-upload-once` · `email-inbound` · `email-ingest` · `email-open` · `email-reply` · `fb-audit` · `fb-hide-test` · `field-pack` · `ga-il-returning` · `journey-message` · `media-thumb-queue` · `migrate-media` · `notify-page-ready` · `notify-payment` · `notify-reply-email` · `post-ai-edit` · `post-save` · `post-to-storyboard` · `raw-put` · `reality-upload` · `research-nurture` · `send-test-mail` · `send-welcome-test` · `share-to-facebook` · `sign-upload` · `smart-search` · `storage-cleanup-oneoff` · `storage-put-raw` · `system-watchman` · `tmp-pancher-upload` · `tmp-upload` · `upload-image` · `video-migrate` · `wa-avatars` · `wa-christina` · `wa-daily-digest`.

Git-only counterpoint: `facebook-publish` exists on main but is not the live cron executor; current live `share-to-facebook` is flag-gated. Treat git-only `facebook-publish` as stale/evidence pending final publication-owner reconciliation, not as live authority.

### Remaining high-priority open review

Do **not** quote or copy embedded secret/token values into docs/work_log.

| Function / surface | Verified issue | Current classification |
|---|---|---|
| `system-watchman` | embedded static guard + direct outbound email/WhatsApp while `notify_admin` is canonical alert primitive | **P0/P1 OWNER/HARDEN BLOCKER** |
| `notify-page-ready` | service-role scan + outbound mail; fallback/static guard; active cron | **P1 HARDEN + CRON ROOT-OF-TRUST** |
| `notify-reply-email` | service-role scan + outbound mail; fallback/static guard; active cron | **P1 HARDEN + CRON ROOT-OF-TRUST** |
| `notify-payment` | outbound admin mail with fallback guard | **P1 HARDEN** |
| `wa-avatars` | service-role contributor/storage mutation; old static guard | **P0/P1 HARDEN** |
| `wa-daily-digest` | external WhatsApp publication path with static guard; cron currently inactive | **P0/P1 RETIRE/REDESIGN REVIEW** |
| `journey-message` | intentionally public Journey UX but raw paid-model endpoint has no canonical entitlement/rate boundary | **P1 COST/ABUSE REVIEW** |
| `smart-search` | old public service-role read path; no current runtime consumer found; may be superseded by modern Research/Gematria APIs | **P1 ACCESS / RETIRE REVIEW** |
| `raw-put` | reusable admin-key service-role Storage writer | **OWNER-RECONCILE** |
| `storage-put-raw` | reusable admin-key raw Storage writer; named by old Source Video law | **OWNER-RECONCILE / TRANSITION** |
| `sign-upload` | reusable admin-key signed-upload issuer; superseded for agents by `agent-upload` but may have old workflow consumers | **OWNER-RECONCILE / TRANSITION** |
| `media-thumb-queue` | internal video-thumbnail worker, reusable admin-key guard | **KEEP+PORT then least-privilege follow-up** |

### Cron root-of-trust

Live jobs currently include active `research-nurture-daily`, `system-watchman-weekly`, `page-ready-auto`, `reply-email-auto`, and `share-to-facebook`; `wa-daily-digest` is inactive. Historical commands for several jobs contain invocation credentials inline. Do not reproduce those values. G0 must replace/contain the root-of-trust before closure. `share-to-facebook` is a separate case: the execution request does not choose content; admin-only `posts.share_to_fb` is the governed authorization flag.

Claude READ_ONLY full-census challenge assignment: work_log `19208c7e-ced5-4f19-8e1b-3f526df1d587` — AFTER not returned at this checkpoint.

## 4. Open PR triage — preliminary G0 classification

| PR | Preliminary classification | G0 decision |
|---|---|---|
| #445 G0 2029 | `ACTIVE G0 DRAFT` | sole current G0 release candidate; do not merge until blockers and final rescan close |
| #444 Roadmap v5.7 | `AMEND-IN-PLACE / RELEASE-CANDIDATE LATER` | reconcile after G0; do not merge while G0 MUSTs open |
| #431 Entity publishing / SEO | `REBASE-CANDIDATE` | preserve capability; no raw stale-base merge |
| #410 Brand evolution | `EVIDENCE / RECONCILE` | design provenance only until Golden design pass |
| #383 Semantic theme controls | `EVIDENCE / RECONCILE` | fresh-main reconciliation required |
| #381/#379/#378/#194 Spatial / ELS previews | `PRIOR ART / EVIDENCE` | no raw merge before Future-Max ELS foundation |
| #380 Home Cosmic | `RETIRE-SUPERSEDED / PRIOR ART` | explicitly superseded |
| #377 Site chrome offset | `REBASE-CANDIDATE` | bounded capability; fresh-main/mobile verification required |
| #370 Follow v18 slice | `RETIRE RAW / EVIDENCE` | funnel law advanced; preserve findings only |
| #360 old Universal Explorer slice | `EVIDENCE` | Bundle-first projections supersede raw slice |
| #355 Tanakh Verse Identity adapter | `REBASE-CANDIDATE` | fresh-main owner/parity review required |
| #347/#344 Bottom Bar | `PRIOR ART` | adaptive shell supersedes fixed shell assumption |
| #340/#339/#338 Number prototypes | `PRIOR ART` | final Number redesign deliberately later |
| #332 Book integration docs | `EVIDENCE / RECONCILE` | no stale Roadmap/State merge |
| #331 Ahavat Torah data/style | `RECONCILE` | separate source/data from legacy presentation |
| #330/#314/#310 Entity Hub previews | `PRIOR ART` | compatibility/prior-art, not target product |
| #322/#320 old Raziel/Home UI | `PRIOR ART` | rebuild under current owners |
| #316 old Design pointer | `LIKELY ABSORBED` | verify then close |
| #226 old Research Studio extension | `SUPERSEDED BY CURRENT W2` | no raw merge |
| #206 old Numeric Router | `EVIDENCE` | current W2 fabric supersedes runtime code |
| #202/#201 image primary-value lineage | `PORT CURRENT LIVE STATE` | represented via G0 parity; never raw-merge |
| #188/#186 old ELS browser Journey | `PRIOR ART` | Future-Max callable-core supersedes browser-only architecture |
| #169/#168 old Premium/Raziel docs | `SUPERSEDED/ABSORBED` | current tier/Raziel owners govern |
| #164 Gematria normalization | `ABSORBED` | current main already reconciled |
| #160 old ELS load staging | `PERFORMANCE PRIOR ART` | no raw merge |
| #97 post-to-storyboard | `PORT CURRENT LIVE SOURCE` | current source already ported/hardened; no raw PR merge |
| #213 teaser visual | `PRESENTATION PRIOR ART` | not a G0 release item |

## 5. G0 blockers still open

1. Receive/reconcile independent Claude audit of all originally git-absent live Edge functions.
2. Close remaining P0/P1 root-of-trust items, especially system-watchman, cron invocation secrets, wa-avatars, public AI cost surfaces and legacy upload bridges.
3. Verify every function intended to remain active has reproducible repo source/config; every retirement must be released deliberately, never inferred from a tombstone file alone.
4. Replace or explicitly quarantine active cron invocations that depend on inline/static credentials; prove required Edge secrets exist before enabling hardened replacements.
5. Finalize stale PR classifications and only then close/supersede branches whose capability is represented elsewhere.
6. Amend Roadmap v5.7 PR444 with v3 gate↔W crosswalk only after G0 evidence stabilizes.
7. Fresh closing re-scan: main + DB + Edge inventory + cron + grants/RLS + owner index before `G0 FOUNDATION SUFFICIENT`.

**G0 is currently NOT SUFFICIENT. Higher gates may gather read-only evidence but may not be merged/released as closure.**
