# ELS background research — bounded first cut

## Provenance and coordination

- Task: `ELS_BACKGROUND_RESEARCH_20261030`; actor: GPT; recipient: ZURIEL.
- Base: `3ad15f38b881eda2cc0afad79e4fefd4467f18b6`, verified against origin on `gpt/els-research-controls-restore-20261030` before writing.
- Delivery branch: `gpt/els-background-research-20261030`. No old-branch import/cherry-pick, main merge, deployment, paid model call or product DB/RLS change.
- Read AGENTS, linked ownership/design/Frame instructions and live ELS law v9, single-engine v2, canonical UI v11. Read-only coordination found no active overlapping ELS/Frame/Research writer; active World/Topic work excludes these scopes.
- No authorized work-log writer is attached. This is a passive handoff, not a claim that a live BEFORE/AFTER row was written.
- Cloud-runtime instructions were used to check the environment/network; Supabase skill was used only for read-only rules/coordination checks. No infrastructure work.

## What actually works

Research now exposes an explicit **“בדוק את המונחים ברקע · ללא AI”** action. It uses the existing canonical bounded batch planner: 2–4 supplied terms, the chosen corpus/skip range, at most one page per term. The existing spelling transform selected in the form applies to each supplied term. It is **not a local-matrix-only scan**, exhaustive corpus scan, geometric discovery or dictionary research. The UI states these limits.

The action requires a verified origin occurrence and re-verifies it, including corpus identity, before requesting pages. A copied immutable plan/origin prevents later page edits from redirecting the running task. The existing page adapter verifies each selected result before loading it into the canonical matrix.

Execution is now owned by the existing principal-scoped ResearchProvider, not the ELS page. The heavy execution adapter is lazy-loaded only on explicit start. Navigating away does not unmount the operation. The existing “בשבילי” slot becomes “סורק”/“תוצאות”; the existing tool dock slot can open the same activity inside Workspace. The same activity appears inline in Research. No second fixed bar, Provider, external store, engine, chat, AI transport or poller was added.

Raziel/Fable remain unchanged. A non-AI task does not set the conversation's busy state. Classic has no new action and no automatic scan/lexicon load. CanonicalProgress supplies the shared progress presentation; progress counts returned term pages, not exhaustive matrix/corpus coverage.

## Lifecycle and limits

- One transient non-AI operation per current tab/principal. Synchronous reservation prevents duplicate start before lazy import finishes. Completed/failed/cancelled results remain until explicit confirmed clear.
- Leaving a route continues work; **reload, tab close, logout or account switch do not preserve this task**. No hidden persistence, automatic restart or cross-device claim.
- Account changes remount the existing principal owner; cleanup aborts requests and suppresses late results. Cancel stops scheduling further terms; a request already executing remotely may still finish.
- Existing batch budgets: at most four candidates/trials, one page each, 15-second between-call budget. Outer 60-second watchdog aborts the client and marks partial; it does not claim server execution was killed.
- Failed requests remain failures, not zero findings. All failed rows result in FAILED; incomplete/truncated coverage remains PARTIAL. No automatic retry or paid escalation.
- Return uses only an opaque operation ID in router state, resolves it against the current principal's operation and loads the original term/corpus/start/skip/direction. It does not search again or encode personal text in a URL. Missing operation after reload/account change fails closed.
- **Exact origin return is not complete view restoration:** zoom and unsaved manual findings are not restored. The UI says so. Current term-page results stay available while the operation exists.
- The canonical progress widget's elapsed clock is local to that presentation; it is not a durable job-duration record. Backend AI jobs are not migrated to this transient owner.

## Files

- `src/lib/research/elsBackgroundResearch.js`: small adapter over the existing replay/batch APIs, copied plan and origin, bounded progress/cancellation.
- `src/lib/research/useElsResearchOperation.js`: transient lifecycle inside the existing ResearchProvider, duplicate/late-result/principal guards and timeout.
- `src/lib/research/ResearchProvider.jsx`: exposes the operation in its existing context; no research synchronization schema changes.
- `src/components/experience2029/ElsResearchActivity2029.jsx`: shared inline/Workspace presentation and explicit return/clear/results.
- `src/components/experience2029/ElsAdvancedSearch2029.jsx`: explicit start and existing verified result-selection integration.
- `src/pages/Els2029Page.jsx`: passes verified origin and handles opaque exact return.
- `src/components/experience2029/SystemFrame2029.jsx`: existing workspace/tool slots project activity; Raziel orb untouched.
- `test/els-background-research.test.mjs`, `test/els-background-principal.browser.test.mjs`, `test/els-background-research.browser.test.mjs`: new focused regressions.

## Verification

- Focused adapter/scanner/sync/profile/Raziel tests: 63/63 pass (includes five new adapter cases).
- Real ResearchProvider browser harness: pass. Explicit fixture auth/transport; tests duplicate start, principal change, old response after replacement/cancel, and a clock-driven watchdog. No live backend.
- Built-app browser: pass across **320, 390, 1440 × light, parchment, dark**. Real page/Frame/Providers; external IO and engine iframe are explicit fixtures. Proves route-unmount continuity, same origin return, verified result opening, cancellation, no restart on reload, zero AI requests, touch targets and overflow checks. Asserts executor stays out of the eager manifest graph. Screenshots inspected at 320/light and 1440/dark.
- Existing built global Raziel responsive acceptance: pass across four widths and three presets; mixed Hebrew/English, keyboard-space approximation, touch and explicit-call count.
- Existing built account-sync/map acceptance: pass. These are intercepted integration tests, not proof of a live cross-device cloud session.
- Existing Advanced page/manual controls browser tests: 4/4 pass.
- Wider ELS/Raziel source suite: **104/110 pass**. The same six failures, names and counts reproduced on a clean detached worktree at the exact base. Affected files: `els-2029-classic-faithful-port` (3), `els-2029-research-bar`, `els-2029-semantic-surface`, `els-2029-visual-representation`. No expectations weakened or unrelated old tests changed.
- 2029 build passed with real installed dependencies, no stub. Final built graph/lazy gate passed: 417,923 eager gzip bytes (40,819 below reference); 2029 isolation, cheap-hardening and Legacy Production lock passed.
- Full existing Native browser suite: **48/48 pass, no skips**, including real canonical tool/corpus, Classic privacy/save/restore, cross and exact-skip behavior, matrix AI overlay isolation, three themes, 320/390/desktop and stable touch targets.
- Legacy build passed with real installed dependencies. `git diff --check` passed. The clean temporary baseline worktree was removed after the comparison; no user changes were removed.

## Next bounded cut

Extend only after validating this lifecycle: preservation of full canonical matrix snapshot/manual view on return, then selected existing matrix-local research actions using the same owner and progress contract. Durable reload/cross-device non-AI jobs need a separately scoped storage/server design, not optimistic local status. Preserve the existing Fable/Raziel jobs and experiment ledger. No new provider/model integration or paid experiment is included here.
