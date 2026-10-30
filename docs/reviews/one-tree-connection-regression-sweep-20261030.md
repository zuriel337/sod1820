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

No product DB/RLS/schema/migration, publication, Edge, main or Production change.
The excluded `b30d0a4d` envelope files/tests/docs remain unchanged. The known `/`
Preview root bootstrap issue and stale shared Frame test remain separate; no
shell redesign or owner takeover is included. Worktrees and the untracked
`node_modules` tooling link are preserved.
