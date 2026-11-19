# Saved ELS discovery — 19 November 2026

Branch `ccr-06bc2910-pgarr4`, PR #1397. Implementation base: `c4bbba92bb6abf933ab22d9c2a3d4b9b4f1366b4`.
Actor GPT; handoff to ZURIEL. Owner: existing Research Workspace / ELS contracts; task key `ELS_SAVED_DISCOVERY_20261119`.
Status: branch implementation; no merge, deployment, shared flags, secrets, SQL writes or engine-limit changes.

## Existing owners and scope

This follows the [continuity audit](../els-research-continuity-20261119/HANDOFF.md) and its document-37/owner-index mapping.
The bounded read-only journal check before implementation found the ELS review delivered, with no overlapping active writer.
The global frame/dock remains owned by the speed session; none of its files changed.
No journal write was performed. This handoff is documentation for ZURIEL, not a delivered agent-to-agent message.

## Implemented

- Each local word/language operation captures immutable source context **at start**, before any response: canonical occurrence and corpus version, original skip/direction/position, scanned box and separate row gap, plus the existing supported return snapshot (view, selected findings/source marks, search-window settings).
- Completed segments keep their operation id and start/end timestamps. Continuations retain the original id/source and accumulate the returned candidates. A response with mismatched origin or box is rejected; navigation/cancellation invalidates late responses.
- Explicit save writes an `els_discovery` entity with contract `els_discovery_v1` via the existing `ResearchProvider.saveItem` library/history operations. No new storage, RPC, provider, global activity registry or UniversalFinding truth owner.
- The closed projection preserves every returned candidate in that run, its exact proposed segmentation, positions, plan, coverage/stop reason, lexicon provenance/fingerprint, and supported return context. Candidates remain candidates. It neither computes a quality score nor imports AI authority.
- Persisted entities are capped at 180,000 UTF-8 bytes, fitting library + history in the existing sync budget. Oversize/invalid saves fail visibly and leave current results intact; there is **no silent truncation** and no engine-limit change.
- Research tools expose saved runs and the current completed word/language runs for explicit save. Local storage is labelled separately from server-confirmed sync. Account ownership and retry remain with ResearchProvider.
- Generic “My Research” navigation opens `/code?mode=research&discovery=<private-library-id>`. Only the current principal's library can resolve it. No source data is put in the URL, no sharing endpoint is introduced, and unknown/malformed entries do not trigger a scan.
- Reopening displays historical candidates/coverage, without requesting the engine or AI. “Return to the scan's matrix · engine verification” is a separate explicit canonical load. “Show in discovery without scanning” reuses the existing list/group tools only when occurrence, corpus version and exact scanned bounds match the current matrix; additions still require existing canonical verification.
- The current view or a newly typed query never changes ownership of the saved result.

## Deliberate boundaries / next slices

- Saving is explicit. Unfinished local scans do not become durable jobs and do not resume after navigation, reload or tab closure. A failed/cancelled operation does not overwrite a previously completed segment. Cancellation copy distinguishes stopping tracking/requesting cancellation from receiving a cancellation acknowledgement.
- Language coverage remains a bounded sample; completed word work covers only its declared plan/window. Neither implies exhaustive corpus coverage or statistical significance.
- Raw language rays/boundary experiments and the engine's ephemeral continuation cursor are **not persisted** in this version; the saved UI states this. Returned word/phrase candidates and their segmentation proposals are preserved. Raw tools remain available for an explicit fresh run.
- Each saved item represents one word/language run, including its returned continuation segments. “Both” offers two explicit saves. Structural groups still derive from the selected/latest run; cumulative cross-run groups are the next feature slice.
- Row-spacing return restores supported projection bounds. Native-window return restores the occurrence, window sizing, zoom and selections but does **not guarantee the original pan/scroll position**. Saved scan bounds remain visible; results cannot be reattached unless bounds match. Damaged optional return metadata falls back to occurrence-only, visibly, while origin/data mismatches reject the record.
- Fable, background term research, Heichal and 3D were not expanded. Fable still does not read the folded projection. Saved discovery supplies an existing-library reference for later Raziel/Heichal integration; it does not claim that integration is already implemented.

## Connection for the frame session

No additional toolbar is needed. Continue using `SystemToolDock2029` and the existing ELS progress seam.

| Data/action | Available now | Qualification |
|---|---|---|
| operation id / name | `scan.id`, word/language mode | local engine scan, not Fable/job id |
| source context | `scan.source.origin`, `box`, `rowGap`, `returnSnapshot` | immutable capture; row gap differs from skip |
| start / end | `startedAt`, `endedAt` | browser-observed timestamps |
| progress / coverage | engine `coverage` and `stop` | no invented percentage; sampled coverage remains partial |
| persisted outcome | complete or partial from engine coverage | historical snapshot, never a resumed running job |
| cancellation | existing active request's cancel/pause | tracking stopped/request sent does not prove server acknowledgement |
| open historical result | entity `link` | resolves current principal's existing library only |
| return to matrix | `elsSavedDiscoveryReturn(scan)` | explicit canonical replay; supported/limited return disclosed |

A dock projection may read these fields through the existing research owners. It must not write a parallel result registry, present this scan as a continuing background/Fable job, or start AI when opening the link.

## Verification

- New unit coverage: library round trip, canonical identity, immutable A/B source, corpus/window mismatch, separate skip/row gap, partial coverage, provenance, no tokens/raw rays/resume cursor, rejected failed/pending/invalid/oversize saves, optional-return recovery.
- New browser fixture uses the real research panel and existing library reducer with isolated fake persistence/engine transport: A→B and late response, origin mismatch, failure, cancel, reload, tab closure/later return, pending user switch, no automatic scan, explicit return, and 320/390/1440 px.
- Native browser tests additionally serialize the actual canonical word/language scanner results against the real corpus, preserving every returned candidate. Existing lazy/cancel/pause/resume behavior remains covered.
- Built-app “My Research” test uses real routing/ResearchProvider and mocked cloud/engine transport: saved library navigation, direct URL/reload without replay, and one explicit return with original occurrence, scope, row gap and zoom.
- The ELS gate now runs the new unit and panel browser tests. The expanded built-app test is also run locally; its cloud transport is a fixture, not live DB verification.
- Unit group: 65/65 passed. Four focused native scanner browser cases passed (word/language persistence, lazy discovery, language cancellation, word pause/resume). Final panel and built-app browser tests: 2/2 passed in a serial run after the final build; six focused browser cases in total.
- Final `npm run build`: PASS, including unchanged shell limits; 203,306 / 203,493 eager gzip bytes, 18 eager files. `git diff --check`: PASS.
- An earlier parallel test invocation timed out during harness startup **before the language test callback**; the native cases passed serially. Adding the tab-closure regression exposed a test-fixture use of Playwright's single-page context; the fixture now uses an explicit browser context and the regression passes. Neither failure was hidden by a skip or increased timeout.
- Exact review SHA and new-head CI state are reported separately in PR #1397 and the delivery message; the nine green workflows on base `c4bbba92b` are not proof of this new slice.

No live AI request or production write was used for verification. No new Preview is approved by this change.
