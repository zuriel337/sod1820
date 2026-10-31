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

## 31 October — current One Tree coverage audit, not a runtime change

Task `WORLD_ONE_TREE_COVERAGE_AUDIT_20261031`, passive BEFORE
`b2ef7395-7823-46a1-9371-fe0d37035046`. User approved the next coverage audit,
not changes to publication, associations, privacy or the gallery design assigned
to Claude. Local base `41cde2e8ee32004b33304c5d460360b8db743ca9` and remote
`71e9cb9061870f5e8124b25eb33fd08a8a2ba5e4` have identical tree
`42f8bb04d7f5ede95620fc6ec9e03fed8b9b62e8`. Main was independently checked as
`2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`.

This extends this existing coverage receipt, not a new contract, master map,
provider, reader or runtime corpus. Plan37 remains planning; canonical18 is not
edited. Previously excluded b30 envelope files remain untouched; absence of an
old record from work_log_current is not interpreted as a release.

### Evidence levels and inventory snapshot

Final anonymous audit started `2026-10-31T04:43:53.274Z`; metadata SQL was read
through the dedicated read-only connector in the same task. Counts are a dated
snapshot, not permanent acceptance criteria.

| Scope | Snapshot | Meaning / limitation |
| --- | ---: | --- |
| Contributor research view, public + approved/canonical, read-only SQL inventory | 5,659 | Not the whole World corpus, not all independently reviewed or renderable findings |
| Same inventory counted through actual anonymous API | 5,566 | Anonymous table/view visibility; additional presentation/source-review gates still apply |
| Public-approved rows whose exact channel source is off | 93 | Accounts for the inventory/anonymous difference; not lost material or a reason to bypass RLS |
| Source-attributed Zvi rows in metadata inventory | 5,647 | Includes more than the earlier967 canonical attachment cohort; source attribution is not necessarily authorship |
| Other/unassigned-source rows | 12 | Ten wa_bot_log/deep-queue references and two gallery references; not covered by the Zvi-only number consumer |
| Governed attachments to active number nodes | 969 | 967 Zvi +2 other;265 distinct number nodes. An attachment is not a new direct finding→Topic edge |
| Rows without promoted_node_id | 4,690 | Unattached inventory; not automatically wrong or candidates approved for promotion |
| Rows sharing structured value with a declared Topic number | 1,973 across113 Topics | Numeric discovery only, never direct Topic attachment |
| Raw tree_matches metadata | 4,622 rows | Search hints/candidates, not4,622 confirmed edges |
| Approved Topics | 204 | All have stored numbers/node IDs;202 linked nodes active, two inactive |
| Topics with image_ids | 15 | Explicit stored media associations, not all gallery content and not all sources for a Topic |
| Anonymous eligible gallery catalog | 87 galleries /2,191 image rows | Strict existing public metadata/catalog filters; partial=false for the bounded overview, not image-by-image pixel/engine verification |

All969 promoted targets exist and are active, and all are number nodes. SQL
also finds118 number↔Topic edges across94 approved Topics, reachable from the
number targets of495 finding rows. These are **indirect paths through a number**,
not495 newly established direct finding-to-Topic relations. Node reuse and
multiple statements from one source must not inflate source independence.

### Actual anonymous existing-reader paths

Run the diagnostic, which permits GET/HEAD/OPTIONS to the canonical backend only:

```sh
node --use-env-proxy scripts/audit-world-one-tree-coverage-20261031.mjs
```

It contains diagnostic case vectors only, not a production routing list. It
calls existing public readers and never prints statements, names, contact
details or credentials. Final run:101 GET/HEAD requests, zero writes/RPC/model
invocations. Full log `/tmp/world-one-tree-coverage-final-20261031.log`.

- Classified Zvi reader: six bounded pages,300 distinct returned rows, hasMore
  true. No withheld flags in this sample. This is **not** a full classified
  corpus scan or proof that only300 exist.
- Exact reviewed reader:13 pages,248 returned entries, exhausted the current
  manifest with no review/source omissions. These are display-reviewed source
  statements, not248 calculations newly verified by this audit. The two checked
  windows union to548 distinct finding identities, not548 independent sources.
- One exact source occurrence returned14 findings and omittedForReview=true.
  Its page being exhausted does not make the source completely reviewed.
- Four sampled exact World finding entries were available, including two
  wa_bot_log-referenced public findings outside the source-attributed Zvi
  group. Opening such a finding is not proof that the underlying bot-log source
  has an equivalent public source-opening/number consumer.

| Structured number | Returned by the existing Zvi number reader | Coverage meaning |
| --- | ---: | --- |
| 14 | 1 | Exact structured-value path, not all textual/gallery references to14 |
| 45 | 0 | Empty in this reader, not absence from the World or galleries |
| 456 | 0 | Same boundary; no automatic1456 derivation or text/OCR fallback |
| 1118 | 10 | Existing through-number route works without per-Topic finding lists |
| 1237 | 0 | Zvi number path empty; the1237 Topic/media/graph paths below still work |
| 1820 | 13 | Existing structured-value route works; not a direct Topic relation |

Topic source-context reads re-admitted six source objects for1237 and three for
2701-bereshit. Both Topics are approved while their stored graph anchors remain
inactive. The explicit graph reader returned respectively four and three exact
edge refs: an inactive requested anchor is intentionally retained by that reader,
so successful graph opening is **not** evidence of an active node. No node was
activated. Topic gapfill-1118 has an active anchor, no declared gallery images
and one returned graph edge; the independent numeric findings path is populated.

Flight root `78fe15e1-6fc5-4641-b1cd-831a75c5bab7` returned ready with source
`posts:5112`, one examined story and no current-window omission. The existing
carousel is connected; it does not manufacture additional stories merely to
make a carousel longer. This audit is reader-level, not a new browser acceptance.

### Reproduced cross-surface field-loss defect — not fixed here

`fetchWorldAllResearchProjection()` selects research objects without
`promoted_node_id`, although its own `documentedTreeAttachment()` requires that
field to corroborate the stored governance target. The exact World finding
reader selects it correctly. Current consumer tracing found the former in
`BeitMidrash2029Page`, **not** the default current World source list.

The anonymous audit replays an actual public canonical record
`0084ddda-7a5e-467e-9422-2f31378ec3a4` through the unchanged pure projection:
complete fields yield documentedTreeConnected=true; omitting the field yields
false. No metadata, source or relationship was edited. This is a real
cross-surface consistency defect, but not a claim that all World links fail.
The runtime/consumer owner check and bounded regression fix are a separate slice.

### Prioritized continuation — extend existing owners only

1. **Shared discovery coverage:** design the next bounded extension of the
   existing consumer/readers to cover eligible non-Zvi research and already
   public media sources, while keeping findings, tagged source images, exact
   source occurrences and direct/via-number relations distinct. Do not simply
   remove the Zvi filter, admit every approved row or turn OCR/tag matches into
   findings/edges. Preserve manifests and fail-closed live-source checks.
2. **Cross-surface consistency:** fix the reproduced missing-field seam under
   its owner with exact-source/identity/negative regressions, without changing
   DB or granting a direct Topic attachment.
3. **Inactive-anchor review:** keep1237/2701 source/media access separate from
   graph activation. Review intended lifecycle with Human Gate; no automatic
   activation from approved Topic status or successful edge reads.
4. **Novelty, viewed/resume and explained research measures:** still follow-up
   under the existing contracts, not completed by this inventory, an engine
   flag, a count of mentions or the gallery's transient scroll progress.
5. **Intake/destination:** existing source arrival is not automatic eligibility,
   source→finding extraction or candidate promotion. Preserve review queues and
   private material. No product data or publication change is authorized here.

### Verification and handoff boundary

43 existing public-finding/Zvi/number/content/story tests passed without skips;
diagnostic syntax check, live anonymous run, Legacy Production lock and diff
check passed. The initial non-Zvi sample predicate was corrected to include
NULL contributor IDs; final four-entry result above includes those rows.
No runtime/UI/CSS changed, no Preview rebuilt/deployed, no Post/Claude gallery/
Frame/provider/engine or b30 scope acquired. Source data, graph, publication,
RLS, canonical contract, main and Production are unchanged. Final branch/HEAD
and scoped release belong to the passive task AFTER.
