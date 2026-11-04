# ELS Research restoration — first bounded cut

## Scope and provenance

- Actor: GPT; task: `ELS_RESEARCH_CONTROLS_RESTORE_20261030`.
- Owner: `els_research_layer_law` v9 / single canonical ELS engine. Design: existing 2029 Design V2 roles, typography and scoped controls; no redesign.
- Current base: `4cf9c8fc40e0ac1ee4a893496827924193190aca`, `gpt/raziel-account-sync-map-20261030`.
- Historical comparison: `248c10ecaceb48c044833c86f9a46c4b7faf5581`, `gpt/els-matrix-discovery-v1-20261025`.
- Both branch tips were verified against origin before editing. New branch: `gpt/els-research-controls-restore-20261030`.
- Read-only live coordination checked before writing: relevant ELS scopes released; active World/Topic scope explicitly excludes ELS. No authorized work-log writer is attached; this document is a handoff, **not** a claim that BEFORE/AFTER was written.

## Capability comparison (source inspection, not a claim of exhaustive live acceptance)

| Historical capability | Current state | Decision |
| --- | --- | --- |
| Clean Classic: manual matrix, findings, source, zoom, save | Present in current Native; shared canonical iframe remains | Preserve; no Native, engine or Classic edit in this cut |
| Separate Research and guided discovery | Present; three profile controls on the same page | Preserve; switching must not launch work |
| Range/paged search, exact skip, reverse spellings, primary/secondary forms | Present in `ElsAdvancedSearch2029` | Keep; no second search adapter |
| Explicit stop, elapsed progress and reduce scope/range | Stop survived; rich progress/reduction removed | Restore only these Research controls |
| Old research story/brief wizard | Removed; current guided discovery owns story planning | Do not re-import the duplicate wizard |
| Old finding-to-primary journey with exact return | Host controls removed; `elsJourney.js` helpers and canonical load support remain | Next restoration candidate; must prove exact return, failure rollback and view preservation before wiring |
| Structural-priority / candidate rails and relationship planner | Old host rails removed; not exposed in current Native | Defer until current canonical lens contracts and duplicate guided outputs are audited; no dead buttons |
| Automatic local discovery / triage effects after ordinary search | Old flow replaced; guided coverage now has its own bounded path | Do not restore old effects, implicit lexicon loading or broad background scan |
| Automatic third-axis research helper | Old helper UI removed; optional third input in explicit crossed search exists | Preserve current explicit search; do not re-add the unwanted helper |
| Fable reading, exact overlays, saved results and global Raziel | Newer current capabilities absent from old base | Preserve byte-for-byte; never overwrite with historical files |

This is manual comparison, not a merge/cherry-pick or wholesale checkout of old files. It does not establish that the entire historical research workspace has been restored.

## Implemented

Research-only advanced search now shows elapsed time, honest indeterminate progress for a range/page request, and counted form outcomes for a forms scan. Failed forms remain distinct from completed forms; form progress does not claim all occurrence pages were searched.

Explicit narrowing aborts/invalidate the old request, clears only this advanced search's old results, changes Tanakh to Torah (or halves a sufficiently large skip range), and waits for another explicit click. It does not change the displayed matrix or start a replacement search/AI request. Stop alone retains already displayed results.

Changing the forms target or exact-skip input now invalidates in-flight advanced work. Late responses cannot attach to the new selection. Exact-skip execution also aborts any old transport instead of merely hiding its busy state.

Only the existing advanced component and four scoped layout rules changed. No Provider, Frame, page, engine, transport, corpus, dictionary, AI prompt, price, persistence or server changes.

## Before/after evidence

Added browser regression against the real page/advanced component with fixture auth/transport/engine: changing the forms target while a page response is held must abort and invalidate it. On the untouched base component, it failed (`0 !== 1` aborted requests). With this fix it passes, including release of the obsolete response and proof that no next page/shape request or matrix load follows.

Additional browser coverage: zero calls on entry; indeterminate progress; explicit narrowing in two stages; no automatic restart; no late results; Classic/Research round trip; one engine mount; zero AI calls; 320/390/1440px overflow. Existing advanced browser acceptance remains unchanged.

## Experiment continuity — no new experiment ledger

Keep `docs/planning/els-guided-discovery-test-ledger-v1.md` as the existing ledger. This cut does not rewrite it or silently import experiment branches. The local ledger last changed in `503c38c85cf9550ac2dd92380c9dc2d2deb2d8e7`; later experiments remain in their isolated branches, so **the current product branch does not contain the complete later journal**.

Live coordination reports the latest released experiment as EXP-24, branch `claude/els-ceiling-lift-rerun-20261030`, HEAD `c336284b8092863e5bb7a943ecfd3c9d6719bed6`. This is a coordination pointer, not a claim that its results were independently validated here. A future documentation-only reconciliation should append missing experiment entries/artifact references to the existing ledger after checking provenance and conflicts, without importing experimental runtime code. No paid/model experiment was launched in this cut.

## Remaining plan

1. Review this narrow Research restoration in the next approved Preview; Classic stays unchanged.
2. Restore exact finding-to-axis exploration and exact return only after current bridge replay tests; do not conflate with AI matrix scanning.
3. Reconcile later experiment documentation into the existing ledger separately from product runtime.
4. Evaluate structural/lens tools individually; keep dictionaries and expensive work behind explicit actions.

## Verification / handoff

| Check | Result |
| --- | --- |
| New `els-research-controls-browser` | 3/3; cancellation before/after proof, narrowing, late-response rejection, retained page, 320/390/1440px, computed 16px text and 44px controls |
| Existing `els-advanced-page-browser` | 1/1, unchanged assertions |
| Full `els-native-ui-browser` | 48/48, zero skipped; Classic/privacy/save/cross/guided/Fable overlays and all presets |
| Focused ELS/context/projection/saved-result/label tests | 26/26 |
| Matrix profiles and reading action/engine/operation/session/transport/resume tests | 58/58 |
| Built global Raziel responsive | PASS, Day/Parchment/Night × 320/390/768/1440, mixed Hebrew/English, touch and keyboard |
| Built account sync/map regression | PASS, 320/390/1440 and three presets; explicit save, failure/retry, account ACK, fresh-browser restore and isolation |
| `npm run build:legacy`, `npm run build:2029` | PASS, real dependencies; no missing-package stub |
| Built graph / lazy budget | PASS, eager gzip 415,602 bytes; 43,140 below gate baseline; Raziel request and research-plan chunks remain lazy |
| 2029 isolation, System Frame, Legacy Production lock, `git diff --check` | PASS |

Browser network/auth fixtures are explicit; these tests are **not** a live AI run or a live cross-device account test. The added control screenshot was inspected at 320px. No external model call, experiment, or product write was made. The new pagination test initially used a fixture hit outside its default skip range; its input range was corrected to include that fixture, without changing runtime behavior, expectations or timeout.

Classic Native, page, shared Frame/Providers, `src/lib`, engine/template/public assets and the experiment ledger are unchanged from the base.

Milestones: PLANNED / IMPLEMENTED / TESTED; branch delivery only. NOT MERGED / NOT LIVE; no new Preview. Handoff to ZURIEL / authorized coordinator for passive recording: scope released after branch push; no live work-log receipt is claimed. Open threads are the four next steps above. No merge, deploy, main, Production or live product DB/RLS mutation is part of this cut.
