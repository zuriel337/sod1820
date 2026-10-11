# Life Journey continuation and existing-engine audit — 2026-10-11

Follow-on implementation: [private continuation](life-journey-continuation-20261011.md) adds the completed reflection, events and saved-path interface plus a required migration. This document records the first PR only.

Actor: GPT. Task: `LIFE_JOURNEY_2029_CHAIN_V1`.
Owner: existing Person v6, Workspace v5, Strategy, canonical engines and Experience V2.
Baseline: `origin/main` at `737ee9aa2df4aaa80dd95ea0fa3c4f2bcbc4f12a`.
Branch: `gpt/life-journey-end-to-end-20261011`.

## Implemented behavior

A saved self profile can proceed directly to research. Adding relatives is optional; its form opens, closes and cancels. Existing relatives can be edited. Exact duplicate names require an explicit separate-person choice; no automatic identity merge or deletion occurs. The existing family writer takes a suffix, not a full source reference. A preallocated suffix survives request/relationship/refresh failure so retry updates the same person.

The consumer selects an owned saved person, rereads the private family ledger before each run, then runs selected existing engines independently. Each engine reports ready, unavailable or error; a failed/null response never becomes a successful zero or empty finding. Users can stop a run. Late results after cancellation, profile changes or account change cannot populate the current page.

| Area | Existing authority consumed | Result in this branch |
| --- | --- | --- |
| Name research | `fn_name_research_graded`, existing track classification | Full-name and component groups; all returned tracks inspectable |
| Display normalization | `aggregateFindings` / `nameNormalize.js` | Consolidated view with raw provenance; repeated hits are not independent corroboration |
| Numeric methods | `fn_all_methods` | All returned integer methods, without hardcoding or recalculation; boolean metadata excluded |
| Name/date | existing Hebrew calendar representation, `runPersonalDateResearch`, `fn_cross_research` | Private date representation and traceable numeric results |
| Family comparison | `fn_cross_research` | Explicit selected people, maximum six including subject; raw computation sources retained |
| ELS | `els-search-bridge` page + verify; canonical projection/layers | Bounded skips 2–40 and first 16 hits; server gate applies; only MATCH opens coordinate representation |
| Continuation | existing Research Context and Research Path | Private reference-only save/resume; numeric-only URL and generic return context |
| Context panel | existing surface sections/focus | Intake, research and family navigation with generic private subject label |

Cross-engine meeting points can occur between methods of **one** input. Copy explicitly distinguishes this from a connection between different people or name and date. All numerical output comes from existing engines.

## Privacy and persistence

Raw names, birthdates and results stay in the private Person ledger/component memory. Context, path and return state contain opaque person references, generic labels and engine options. No personal term in a URL, public NameLab finding, browser persistence payload or telemetry event. Resume rereads current saved profiles and runs a new computation; it is not an immutable historical findings snapshot. Numeric continuation exposes only the selected numeric value in its URL.

Independent read-only specialist review found five issues (ELS gate, restored options, refresh retry identity, negative-number navigation, edit reopening label); all were fixed and rechecked with no remaining blocker in that bounded review. No external Claude dispatch is claimed.

## Evidence and limits

- Both legacy and 2029 production builds pass. Existing chunk/dynamic-import warnings remain.
- Focused suite: 26 passing tests, including 574 normalization fixture value checks and existing date/access/classification/ELS contracts.
- Existing Research Path resumability runtime acceptance passes.
- Synthetic Chromium integration uses real journey components and consumer, mocked auth/RPC/path boundaries, and blocks external network. It covers three-relative intake, close/continue-self, five engines, save/resume, numeric roundtrip, partial failure, edit, relationship and refresh retries, duplicate prevention, cancellation, account exit and 390px layout.
- Read-only live canonical-engine probes with synthetic inputs yielded three name groups, 17 track IDs, 63 normalized entries and 16 numeric methods. No live user fixtures or product writes were used.
- No live authenticated browser write, paid model call, production ELS search or production deployment was performed. Browser tests do not prove production RLS, provider persistence or remote uptime; existing provider/runtime tests cover their contracts.

Run the browser test with an externally installed Playwright and Chromium:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node test/life-journey-browser.mjs
```

## Existing capabilities outside this bounded consumer

NameLab reflection runtime, AI and tarot adapters exist in the repository; this branch does not automatically invoke them or turn personal derivations into factual claims. Event timeline authoring is not implemented here. The separate advanced ELS preview/matrix lane remains untouched; this consumer offers bounded first-page search and verified coordinate display, not the full advanced interface. Existing path APIs expose the latest saved path; this branch does not add a personal-path history browser. Family relation editing/deletion and automatic duplicate cleanup are not added.

Status: IMPLEMENTED / TESTED / PR_READY. Not MERGED or LIVE. No engine, schema, RLS, shared Frame or ResearchProvider edits. No main push, merge, production deploy or live product-DB write.
