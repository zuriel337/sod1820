# Personal replies — integration readiness, 2026-10-26

Status: branch-only candidate; no central merge or live product database changes.

## Proposed central integration

- Target: `gpt/2029-central-current-raziel-life-journey-20261026` at `20bdd98be93f8c7cd6e8dcca628100bded16f460`.
- Follow-up base: `18c658f10fe47a207f8375babfaff7e544525d19`.
- Follow-up branch: `gpt/2029-personal-replies-readiness-20261026`.
- Retained ancestry: `20bdd98b` → `fbf0d888` (RTL contracts) → `75f64384` (personal-area layout) → `18c658f1` (community replies) → readiness fix.
- The separate guest-value slice `9bc75b2d` is excluded. Do not cherry-pick the retained commits again after integrating this candidate.
- Current remote main checked read-only: `2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`; no merge from or push to main.

## Fixed before integration

The un-applied replies migration excluded native replies when `author_contributor_id` was NULL and the caller owned at least one Contributor. SQL `NOT(false OR NULL)` evaluates to NULL, which fails the WHERE filter. Source and mocked-browser tests had not executed this predicate.

The Contributor self-reply predicate now uses `coalesce(..., false)`, matching the existing account predicate. The same disposable PostgreSQL 17 fixture failed on the previous revision with `native reply remains visible to contributor-owning account`, then passed after the fix.

The test applies the actual committed migration to minimal synthetic tables. Eleven assertions cover caller-owned native replies with NULL Contributor, direct Contributor ownership, reviewed Person ownership, deep thread path, self replies through all three ownership paths, unclaimed same-name profiles, hidden/rejected/pending community rows, page limit/cursor, account switching, unrelated account, absent principal and execute grants. No live DSN is accepted by the runner; its PostgreSQL container has no network and is removed afterward.

Run: `bash scripts/run-personal-replies-community-sql-test.sh`.

## Read-only historical identity audit

Existing owners: Person Foundation v6; existing `contributors_claim_legacy`; existing admin-gated `admin_person_materialize_contributor_history_v1`. Verdict: EXTEND_EXISTING. No new identity owner or matching engine.

Live coverage at audit time:

| Measure | Count |
| --- | ---: |
| Distinct Contributors with OpenWeb messages | 2,289 |
| Already linked through contributors.user_id | 0 |
| Already linked to an account through reviewed Contributor Person edges | 0 |
| Have an email recorded on the Contributor | 127 |
| Match exactly one currently email-confirmed account | 6 |
| Of those six, have matching source-verified email evidence | 6 |

Emails, auth identifiers and private account details are deliberately absent from this report. A matching email is not applied as ownership by the audit. Each of these six candidates has one exact OpenWeb source identity and matching verified-email evidence in `g3_openweb_import_stage`, reached through the original message provenance links.

| Public source name | Contributor | Imported messages | Roots | Replies | Source-verified email rows |
| --- | --- | ---: | ---: | ---: | ---: |
| Jasha8 | `b8c49719-6fd4-4027-ada1-1a986466eaf9` | 186 | 33 | 153 | 186 |
| Sod1820 | `4cd9c034-0464-4600-a35d-7156f0584d9b` | 78 | 23 | 55 | 78 |
| eli | `4a6ae4d2-5372-4b7b-8e3b-3a230dc1a291` | 8 | 5 | 3 | 8 |
| Adi Ifrach | `8894bec6-b252-4405-bcd9-3773488e2a91` | 7 | 1 | 6 | 7 |
| Yosi Viner | `19936860-6b35-4386-bc44-113289858ff0` | 3 | 0 | 3 | 3 |
| Johel TV | `2b189295-f30d-4061-a1a0-b26afb313863` | 1 | 1 | 0 | 1 |

These are message authorship counts, not counts of replies received. They must not be presented as incoming notifications.

An additional read-only descendant-tree count, excluding the candidate's own messages, found potential public incoming replies: Jasha8 87, Sod1820 24, eli 4, and zero for the other three candidates. These are conditional counts for the exact identity candidate; they do not assert an ownership claim has occurred. Zero incoming replies does not erase the authored messages listed above.

## Next authorized workflow after central acceptance

1. Central owner reviews and integrates this candidate once; rechecks its exact HEAD and the existing migration dependencies.
2. Database owner reviews and tests the migration in a development database before a separately authorized live apply. This slice did not apply it.
3. Start with self-service claims for the six evidence-backed candidates. Existing entry: `/2029?preview=community&data=live&claim=<Contributor UUID>`. The authenticated holder of the matching verified email must explicitly invoke the existing claim operation.
4. If Person history materialization is needed, use the existing admin-gated reader/writer after the ownership claim and a scoped Human-Gate decision. That function reuses the Contributor's current account ownership; it is not an arbitrary account reassignment operation.
5. Verify real incoming replies per account, exact old thread, Reload, return, and account switching. Keep all six accounts distinct.
6. Remaining 2,283 historical identities stay unclaimed until self-service or reviewed evidence establishes ownership. The previously ambiguous `yanivhe` alias is not assigned to Yaniv Levi by this task.

The two owner-approved display pairs in `communityArchive.js` are presentation evidence only. They were not promoted to server-side ownership. No claim or materialization function was executed during this audit.

## Validation

- Disposable PostgreSQL 17 migration/ownership tests: 11 assertions pass; pre-fix regression reproduced.
- Focused Node tests for community/replies: 11 pass.
- Existing personal-area browser coverage and exact-thread screenshots remain in the parent slice; this follow-up does not alter UI or runtime frontend code.
- Full `npm run build` (Legacy and 2029), built dependency graph, hard isolation, cheap hardening, My Workspace, System Frame, Legacy Production Lock and `git diff --check`: pass.

## Remaining acceptance

PR review, central integration, separately authorized DB apply, actual user self-claims and authenticated hosted end-to-end verification remain open. Local SQL fixtures prove the migration logic; they do not claim these live actions happened.
