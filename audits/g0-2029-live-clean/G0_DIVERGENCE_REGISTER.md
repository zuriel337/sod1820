# SOD1820 — G0 2029 LIVE CLEAN / DIVERGENCE REGISTER

**Gate:** G0 under `foundation_closure_protocol_law v3`  
**Canonical Supabase:** `linswmnnkjxvweumprav`  
**Baseline main:** `17fe4b9c89768566bc868f69dd0760ace67fda1d`  
**Mode:** object-state parity, not migration-ledger inference  
**Release:** branch-only; this file does not authorize merge/deploy/retirement.

## 1. Closure rule

G0 is not closed until every material live↔git divergence is either:

- `PORT/REPRESENT` — current live state is represented reproducibly in current-main code/migrations;
- `HARDEN+PORT` — insecure/stale live state has a verified replacement candidate and release path;
- `RETIRE` — Human-Gate-approved live retirement completed and verified;
- `EXPLICIT EXCEPTION` — owner-approved reason why a live object may remain external to git, with reproducibility/rollback proof.

An open/stale PR is evidence only. Never raw-merge because it exists.

## 2. Closed / represented in this G0 branch

| Object | Live state | Main before G0 | G0 action | State |
|---|---|---|---|---|
| `foundation_closure_protocol_law` | v3 ACTIVE | v2 | versioned in canonical DB; no-skip gates over W0–W9 | DB-LIVE / RULE ACTIVE |
| `set_lead_rank(text,int,int)` | legacy SECURITY DEFINER | public execute exposure | anon/auth/public EXECUTE revoked; service role retained; migration mirrored | DB-LIVE / BRANCH PARITY |
| `gallery_images.primary_value_source` + writers | live column/functions | live DB not represented by the old PR201/202 migrations | current-state parity migration added; no historical backfill | BRANCH PARITY |
| `ImageEditModal` primary value writer | client manual edit did not stamp provenance | exact old blob still on main | exact bounded PR202-compatible one-line provenance patch ported | BRANCH |
| `post-to-storyboard` Edge | ACTIVE v11 | no function dir on main | exact historical source blob recovered from PR97 and placed under `supabase/functions/post-to-storyboard` | BRANCH PARITY |
| Canonical Owner Index active versions | several stale version labels | stale routing metadata | targeted live version refresh incl. TI v8, methods v4, Person v4, Foundation Closure v3 | BRANCH |

## 3. Active Edge Functions absent from current main

Live census: **77 ACTIVE** Edge Functions vs **41 function directories** on baseline main. **37 live functions were absent from main** at census time. `post-to-storyboard` is already ported on this G0 branch; the other 36 remain in the audit queue until independently classified.

### Missing-at-main census

`admin-card-upload` · `admin-upload-once` · `email-inbound` · `email-ingest` · `email-open` · `email-reply` · `fb-audit` · `fb-hide-test` · `field-pack` · `ga-il-returning` · `journey-message` · `media-thumb-queue` · `migrate-media` · `notify-page-ready` · `notify-payment` · `notify-reply-email` · `post-ai-edit` · `post-save` · `post-to-storyboard` · `raw-put` · `reality-upload` · `research-nurture` · `send-test-mail` · `send-welcome-test` · `share-to-facebook` · `sign-upload` · `smart-search` · `storage-cleanup-oneoff` · `storage-put-raw` · `system-watchman` · `tmp-pancher-upload` · `tmp-upload` · `upload-image` · `video-migrate` · `wa-avatars` · `wa-christina` · `wa-daily-digest`.

Git-only counterpoint: `supabase/functions/facebook-publish` exists on main while the live ACTIVE list exposes `share-to-facebook`; reconciliation must determine whether this is historical/renamed/retired, not assume equivalence.

### P0/P1 spot-audit already verified by GPT

Do **not** quote or copy embedded secret/token values into docs/work_log.

| Function | Verified live shape | Current classification |
|---|---|---|
| `upload-image` | `verify_jwt=false`; service-role Storage write/upsert; no internal auth check | **P0 HARDEN/RETIRE BLOCKER** |
| `admin-upload-once` | `verify_jwt=false`; service-role Storage writer guarded by an embedded static token | **P0 HARDEN/RETIRE BLOCKER** |
| `reality-upload` | `verify_jwt=false`; service-role Storage writer guarded by an embedded static secret | **P0 HARDEN/RETIRE BLOCKER** |
| `post-save` | `verify_jwt=false`; service-role post mutation; real `PostEditorPage` consumer; guarded by embedded static token | **P0 HARDEN BLOCKER** |
| `post-ai-edit` | `verify_jwt=false`; externally callable paid-model execution; real app consumer; no server-side caller authorization | **P0/P1 HARDEN BLOCKER** |
| `smart-search` | `verify_jwt=false`; service-role read of `gematria_words`; publication-safe boundary not equivalent to current canonical lookup; no runtime consumer found in main search | **P0 PUBLICATION/ACCESS REVIEW** |
| `post-to-storyboard` | `verify_jwt=false`; optional run-key only; service-role post reader + paid model; exact source now recovered | **P0/P1 AUTH/PRIVACY/COST REVIEW** |
| `system-watchman` | `verify_jwt=false`; service-role system operations + outbound channels; embedded static guard | **P0/P1 HARDEN REVIEW** |
| `notify-payment` | `verify_jwt=false`; outbound email; static fallback guard exists | **P1 HARDEN REVIEW** |
| `notify-page-ready` | `verify_jwt=false`; service-role scans + outbound email; static fallback guard exists | **P1 HARDEN REVIEW** |
| `raw-put` | service-role Storage writer; guarded by configured admin key | **PORT/OWNER-RECONCILE** — prefer canonical upload owner, no immediate unauthenticated-write proof |
| `storage-put-raw` | service-role Storage writer; guarded by configured admin key | **PORT/OWNER-RECONCILE** |
| `sign-upload` | signed-upload issuer; guarded by configured admin key | **PORT/OWNER-RECONCILE** |
| `journey-message` | public paid-model endpoint; intentionally public Journey UX but server endpoint itself has no per-caller quota/one-session enforcement | **P1 COST/ABUSE REVIEW** |

Claude READ_ONLY full-census challenge assignment: work_log `19208c7e-ced5-4f19-8e1b-3f526df1d587`.

## 4. Open PR triage — preliminary G0 classification

| PR | Preliminary classification | G0 decision |
|---|---|---|
| #444 Roadmap v5.7 | `AMEND-IN-PLACE / RELEASE-CANDIDATE LATER` | add v3 gate↔W crosswalk after G0 evidence stabilizes; do not merge while G0 MUSTs open |
| #431 Entity publishing / SEO | `REBASE-CANDIDATE` | preserve capability; no raw stale-base merge |
| #410 Brand evolution | `EVIDENCE / RECONCILE` | design provenance only until W0.5/Golden design pass |
| #383 Semantic theme controls | `EVIDENCE / RECONCILE` | useful Design Foundation material; fresh-main reconciliation required |
| #381/#379/#378/#194 Spatial / ELS previews | `PRIOR ART / EVIDENCE` | no raw merge before Future-Max ELS foundation |
| #380 Home Cosmic | `RETIRE-SUPERSEDED / PRIOR ART` | explicitly superseded in its own PR body |
| #377 Site chrome offset | `REBASE-CANDIDATE` | bounded capability; fresh-main/mobile verification required |
| #370 Follow v18 slice | `RETIRE RAW / EVIDENCE` | active funnel law has advanced to v19; preserve findings, do not merge branch |
| #360 old Universal Explorer slice | `EVIDENCE` | future projections are Bundle-first/greenfield; no raw merge |
| #355 Tanakh Verse Identity adapter | `REBASE-CANDIDATE` | requires fresh-main owner/parity review |
| #347/#344 Bottom Bar | `PRIOR ART` | adaptive shell supersedes fixed shell assumption |
| #340/#339/#338 Number prototypes | `PRIOR ART` | visual evidence only; final Number redesign deliberately later |
| #332 Book integration docs | `EVIDENCE / RECONCILE` | required amendments remain; do not merge stale Roadmap/State pointers raw |
| #331 Ahavat Torah data/style | `RECONCILE` | separate useful source/data from legacy presentation before any port |
| #330/#314/#310 Entity Hub previews | `PRIOR ART` | Entity Hub is compatibility/prior-art, not target product |
| #322/#320 old Raziel/Home UI | `PRIOR ART` | rebuild under current Raziel/Home owners |
| #316 old Design pointer | `LIKELY ABSORBED` | verify then close, no raw merge |
| #226 old Research Studio extension | `SUPERSEDED BY CURRENT W2` | no raw merge |
| #206 old Numeric Router | `EVIDENCE` | current Numeric/W2 fabric supersedes runtime code; preserve extension ideas only |
| #202/#201 image primary-value lineage | `PORT CURRENT LIVE STATE` | represented via G0 current-state parity; never raw-merge old branch |
| #188/#186 old ELS browser Journey | `PRIOR ART` | Future-Max callable-core boundary supersedes browser-only architecture |
| #169/#168 old Premium/Raziel docs | `SUPERSEDED/ABSORBED` | platform_tiers v2 + current Raziel Roadmap own semantics |
| #164 Gematria normalization | `ABSORBED` | current main already contains normalization reconciliation; no merge |
| #160 old ELS load staging | `PERFORMANCE PRIOR ART` | no raw merge |
| #97 post-to-storyboard | `PORT CURRENT LIVE SOURCE` | exact source already recovered on G0 branch; no raw PR merge |
| #213 teaser visual | `PRESENTATION PRIOR ART` | not a G0 release item |

## 5. G0 blockers still open

1. Complete independent classification/security audit of every live Edge function absent from git.
2. For every P0, produce the smallest current-owner hardening/retirement candidate and verify callsites before any release.
3. Restore reproducible source/config representation for every live Edge function that remains active, or explicitly retire it through Human Gate.
4. Finalize open-PR classifications with evidence and close/supersede stale PRs only after the relevant capability is safely represented.
5. Amend Roadmap v5.7 PR444 with the v3 G↔W gate crosswalk and no-skip semantics on the then-current main.
6. Fresh closing re-scan of main + DB + Edge inventory + owner index before `G0 FOUNDATION SUFFICIENT` may be declared.

**G0 is currently NOT SUFFICIENT. Higher gates may gather read-only evidence but may not be merged/released as closure.**
