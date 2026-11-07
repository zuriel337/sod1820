# PG2 — the seven orphan consumer tests: mapping to P0-A/B/C and to a CI gate (DRAFT, nothing applied)

> **DRAFT / EVIDENCE — not an owner contract, not an approval, no gate is passed.** Branch-only (`claude/sod1820-ci-failures-diagnosis-6z9ej6`), not in `main`. Contains aggregate numbers only: no personal data, no secrets, no addresses. Index: [README](README.md).

Base: main@394a2ba8 (identical to current main for the files involved). Local run: Node 22; CI uses Node 24 (.nvmrc) — not reproduced locally.
PG2 is NOT marked PASS: wiring tests is not consumer acceptance.

P0 definitions (source: docs/reviews/url-continuity-plan-20261103/source-boundaries-evidence.md):
P0-A legacy published-posts family (1,164 posts at 7.10); P0-B non-Zvi channel/WhatsApp source occurrence + identity; P0-C OpenWeb/community admission
(archive-only; a reply is not research). Shared invariant: no duplicate source authority, no false independence, no wrong attribution on active
Post/Topic/Number/World/Book/Source projections.

| Test (tests) | What it asserts | P0 | Consumer | Confidence | ms |
|---|---|---|---|---|---|
| connection-depth-fidelity (14) | the same marked relation projected twice is ONE witness identity; a wrapper id never substitutes for a missing edge identity; unknown ≠ zero | A/B/C (cross-cutting "no false independence") | Topic, World | high | 142 |
| one-tree-branch-contract-2029 (13) | one finding/source identity across World, Topic, Number; private/personal evidence withheld; unattested access never widens; later input only after recompile | A/B/C (identity) + privacy | World, Topic, Number, Raziel | high | 80 |
| world-people-sources-2029 (12) | findings stay attached to source_ref; source-native records deduplicated; an image/text pair stays two source identities; exact occurrences; old Post addresses kept | B (primary), A | World | high | 166 |
| world-gallery-triage-projection-2029 (4) | exact-URL grouping keeps every source; OCR state separate from publication | B (media occurrence) | World gallery | medium-low | 103 |
| post-content-interest-2029 (6) | exact series membership; no invented series/channel/preference; telemetry has no body/title/author | A | Post, Posts | medium | 122 |
| world-finding-review-api-2029 (10) | admin-validated owner review; contributor counts only documented attachments (not candidates or duplicate occurrences); canonical contributor scope keeps aliases without guessing | B/C (attribution) + S2 ADMIN_ONLY evidence for api/world-finding-review.js | World (admin API) | medium | 240 |
| world-corpus-continuation-2029 (12) | bounded pages over the exact remaining IDs; identical-text groups and identity collisions preserve every occurrence; snapshot checksum fails closed on drift; no attribution of extraction errors to Zvi | outside P0-B's non-Zvi scope; same invariant for the Zvi corpus | audit contract (not a runtime consumer) | medium | 3,712 |

P0-C: none of the seven targets OpenWeb/community admission directly. Existing wired coverage found: `scripts/test-2029-world-surface.mjs`
(imports worldPreviewMaterialScope; 2029 Isolation gate) and `src/lib/community/communityArchive.test.js` (G4 Public Core). Other P0-adjacent
orphans that were NOT requested and NOT run: world-zvi-approved-findings-2029, world-public-finding-reader-2029, world-all-source-findings-2029,
world-pending-batch-safety-2029, world-finding-share-og-2029, src/components/community2029/communityPublicReading2029.test.js,
src/components/contributor2029/loadCommunityPerson2029.test.js, publicContributor2029.test.js.

## Duplicates / obsolete (read-only checks)
- Exact test-title match against every test file under test/, src/**/*.test.* and scripts/test-*.mjs: **no duplicates** for the 71 titles.
  (Semantic overlap between connection-depth-fidelity and one-tree-branch-contract is real but complementary: edge-level vs branch-level identity. Not verified beyond titles.)
- Import targets: all exist (no missing modules). No `skip`/`todo` run state (skipped 0).
- "Legacy" mentions are data concepts (legacy replay, legacy topics), not the retired runtime: not obsolete for that reason.
- Hermetic: no network, no browser, no git history; the corpus test reads one committed doc and one script.
- Snapshot-bound: world-corpus-continuation-2029 fails by design if its snapshot changes; it needs an owner who updates it deliberately. Candidate for removal from the list if the Zvi audit is retired.
- All 7 files: 71 tests, 71 pass, 0 fail, 0 skipped, ~3.9 s total (one process, Node 22).

## Gate choice
Proposed: `2029 Live Contracts` → job `release-contracts-2029` (`.github/workflows/live-contracts-2029.yml`): pull_request to main with NO path filter
(so any change that could alter a projection triggers it), no network/secrets, installs dependencies, 10-minute timeout, and its header says it exists for
static contracts "that ran nowhere". The repo's own `ci-workflow-references-exist.test.mjs` (already in this workflow) validates that the new paths exist —
run against the modified copy: 2/2 pass. Alternatives rejected: G4 Public Core (36 path entries, builds the app, would miss changes outside the filters),
2029 Isolation (browser-heavy), ELS gate (domain-specific).
Limits: (1) ruleset `protect-main` has NO required status checks, so wiring makes the check visible and red-on-failure but does not block a merge until
S-E is decided; (2) CI runs Node 24 — first CI run on a branch (workflow_dispatch) is the proof; (3) this is contract coverage, not PG2 acceptance.

Proposed diff: `workflow_live-contracts-2029.diff` (not applied).
