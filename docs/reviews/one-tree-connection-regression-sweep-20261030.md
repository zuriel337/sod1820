# One Tree connection regression sweep — 30 October 2026

Branch: `gpt/elections-world-seed-integration-20261030`.
Base: `671a8c9d60190afb19f48e8ea9d24d295985b162`.
Passive task: `ONE_TREE_CONNECTION_REGRESSION_SWEEP_20261030`, original claim
`564c3e07-2abe-4db1-b136-073781cad870`, acceptance addendum `6ee0bb6e`.
This extends existing projections and consumers, not a new tree, reader or owner.

## Reproduced defects and bounded fixes

1. **Expanded number list collapsed on selection.** After displaying all eight
   numbers in the browser fixture, opening the first reset the visible list to
   six. The existing consumer now retains the visitor's expanded list within the
   same Topic, resets it on a different Topic and still reveals exact deep links.
2. **Previous Topic data could be relabelled as the new Topic.** The Golden
   projection accepted a previous node/source context, media and prominence.
   A failing pure regression reproduced the mismatch. Topic async payloads now
   carry their requested slug and entity ref; only the matching payload is
   consumed. The pure presentation helper also rejects mismatching node/Topic
   context, while retaining the current Topic's own authored attribution.
3. **Late-loaded sources did not update the shared context map.** A real Topic
   browser fixture loaded sources and related Topics after the initial render;
   the content appeared but the Research Context section map never gained those
   entries. The Topic now updates its existing map when its bounded section
   signature changes. Explicit expression focus remains protected. Withheld
   Topic bodies no longer publish navigation entries for sections not rendered.
4. **The graph opener accepted inconsistent evidence and duplicate edges.**
   Failing regressions demonstrated mismatched source/edge IDs, malformed refs,
   unrelated endpoints and repeated edges. The existing normalizer now checks
   exact UUID edge identity, sourceRef, projected edge id, endpoint identity and
   requested anchor; identical copies are deduplicated and conflicting copies
   withheld. Rejected evidence is reported as a partial window, not proof of an
   empty graph. An unavailable anchor is explicitly unavailable. No extra read
   was introduced: the canonical reader already returns the anchor finding.
5. **Topic connection presentation had an unrelated-endpoint fallback.** Its
   pure model displayed a supplied edge even when neither endpoint was the Topic,
   and displayed duplicates. It now consumes the same existing relation normalizer
   as the World opener, preserving source refs and exact endpoints. A positive
   regression uses the unchanged canonical graph adapters, not a parallel shape.

All runtime changes stay in the existing Topic page, Topic number-entry consumer,
Topic Golden projection and World relation opener. Claude CSS and shared Frame,
Providers, Number reader/cards, graph reader and source admission are unchanged.
No data was promoted, published or reclassified, and no inactive node activated.

## Verification

- Red-before/green-after regressions were run for the list reset, wrong Topic
  payload, inconsistent/duplicate/unrelated edges and late section-map update.
- 49 focused regression, canonical-adapter, source-context, map and 1237 tests
  passed. The strengthened browser suite ran three registered tests without
  skips at 320 and 1440. It covers exact Number-sheet return, delayed Topic
  source loading/switching, map updates, withholding, pagination and new rows.
- Both Legacy and 2029 builds, the built dependency graph/lazy boundaries,
  Topic surface, hard isolation, cheap hardening, Legacy lock and diff check
  passed. Existing large-chunk and ineffective-dynamic-import warnings remain.
- The broad read-only unit sweep excludes the optional Docker/SQL write
  harness and covers World, Topic and Gallery tests. Its inherited failure is
  `worldDiscoveryStream.test.js:117`, expecting old Frame title
  `מה חדש בעולם`. Both that test and Frame are unchanged from the base; no
  assertion was removed, weakened or skipped to make this suite green.
- The previously failing World surface check expected an obsolete blanket
  `מד החיבור לעץ` label. That expectation is replaced with stronger assertions
  for the already-adopted split measures, explicit Topic-not-finding/truth
  warning, and nullable rating props. The actual review UI is unchanged and the
  complete World surface script passes; its remaining guards are intact.

## Live-public acceptance and release

The existing actual-build browser test now explicitly opens 1237's graph using
the canonical reader, checks exact edge refs/deduplication and records window
status. It also retains Topic 1118 → exact World finding → Back, public Zvi source
entry, responsive checks, and page/model/write monitoring. Live and hosted
outcomes, exact source SHA and deployment are recorded on completion, not assumed
from a READY state or a synthetic browser fixture.

Final acceptance:

- Runtime source: `1d7566e9e390719d67ba99672cdcc1ffe22f0141`.
- Protected static 2029 Preview: `dpl_knyX5YKR4ZwreDBENgLG1QhxwrAp`, READY,
  target `null`; build duration approximately 15 seconds.
- https://sod1820-1dijhl50d-sod1820-s-projects.vercel.app/world
- https://sod1820-1dijhl50d-sod1820-s-projects.vercel.app/topic/1237
- Actual-build browser acceptance passed first locally, then on this exact
  hosted deployment, against live anonymous public data at 390 and 1440.
  The explicit graph window returned `ok`, four distinct existing `edge:` refs.
  Topic 1118 → exact World finding → Back and public Zvi source entry passed.
  Zero page errors, model requests or escaped product writes were observed.
- Local evidence: `/tmp/one-tree-regression-local-live-20261030`; hosted evidence:
  `/tmp/one-tree-regression-hosted-live-20261030`. Protected access uses a
  temporary link in memory and the existing static identity bootstrap; no token
  or browser authentication state is stored or committed. SSO stays enabled.
- Protected identity/worker checks confirm exact SHA, mock-only transport and
  `unifiedReadOnly=true`; no-store/noindex remain. Broad sweep: 532 passed,
  one unchanged Frame-title assertion failed, zero skipped. Focused 49 and three
  registered browser regressions passed; World surface now passes in full.
- Later receipt-only commits do not change the tested runtime source. General
  continuation `ae17201f` remains; this bounded fix scope is released in AFTER.

No product DB/RLS/schema/migration, publication, Edge, main or Production change.
The excluded `b30d0a4d` envelope files/tests/docs remain unchanged. The known `/`
Preview root bootstrap issue and stale shared Frame test remain separate; no
shell redesign or owner takeover is included. Worktrees and the untracked
`node_modules` tooling link are preserved.

## Parallel user screenshot review: Gematria gate is only partly integrated

The user supplied the 1237 method-card screenshot during this sweep and asked
whether it matches the contract. Read-only review confirmed a remaining gap in
`Revelation1237Gate2029`'s local `MethodCard`: raw mathematical-family keys and
`fn_method_profile` appear in the main view; a permanent verified badge is based
on profile value matching, not a fetched/validated step trace; and these two hero
method expressions have no existing Number-sheet/local-depth activation. The
authored equations farther down the Topic do have that activation, so their
completed integration must not be generalized to the hero method cards.

The live canonical `reality_graph_law` / `project_codex.id=18` addendum §ה was
read again and its md5 remained `854e53071f433c344349d841d10c0c44`: one existing
Inspector, exact spelling/method/version/value/checked trace and exact return.
Design V2's Number method-learning section also requires the same Number-page/
drawer trace adapter, engine-supplied steps and honest unavailable fallback.
The older branch-only G3 presentation document is supporting lineage, not a
claim of an additional active law: S1 summary is legitimate; S2/S3 depth is
progressive/on demand, not mandatory eager loading of all letter calculations.

The recommended next integration reuses that existing Number/Method explanation
path for the hero expressions, keeps technical metadata under deeper details,
and distinguishes a returned result from checked trace parity. No new engine,
presentation owner or parallel Gematria component is justified. This screenshot
question did not trigger a new visual redesign, source edit or claim that this
remaining gap has been fixed in the regression batch above.
