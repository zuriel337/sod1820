# אהבת תורה — Research Intake Manifest

Status: **IMPLEMENTED · TESTED · BRANCH-ONLY · NO LIVE WRITE**
Snapshot: 2026-10-22  
Source: `book:hebrewbooks:5635`  
Book identity: `book:ahavat-torah`

## Outcome

The material-discovery phase is complete. The next phase is selective intake into the existing Research OS, not another scan and not a new book-specific database.

This manifest does not canonicalize or publish any claim. It records the exact intake boundary so an authorized writer can reconcile the live system without duplicates.

## How to view the complete material

1. Open `/book/ahavat-torah` for the human-facing 2029 projection.
2. Use **מפת החומר → מה יש בספר** for the eight sections and their page ranges.
3. Continue through **מבנה וכיסוי**, **ממצאים ומאגרי נתונים**, **שיטות**, **קשרים**, **נסגר מול המקור** and **המשך מחקר — לא חוסם**.
4. Open the linked PDF whenever an exact page witness is required.
5. Use **הוסף למחקר** to place the book identity in the existing personal Research Workspace. This save action is not truth promotion.
6. Use **הוסף חבילת מחקר · 14 פריטים** inside the intake section to add one source anchor, eight closed-dataset candidates and five witness observations. Repeating the action is idempotent; it does not add the extraction backlog, withdrawn readings or source-native open questions as findings.

The tracked source-of-record for the projection is `public/book-data/ahavat-torah.tables.json`; the expanded scholarly map is `AHAVAT_TORAH_FULL_SOURCE_MAP.md`.

The Workspace pack is generated deterministically by `buildBookMaterialWorkspacePack`. Every entry carries `workspaceOnly=true` and `createsResearchObject=false`; the action uses the existing `ResearchProvider` and creates no new storage or promotion path.

## Live reconciliation observed on 2026-10-22

- One active `nodes(type='book')` row already exists with identity `book:ahavat-torah` and route `/book/ahavat-torah`.
- The node already points to the HebrewBooks 5635 witness and the stored PDF, but its `coverage_2029.targeted_completion` metadata still reflects the older 2026-09-14 residual list.
- Two existing `research_objects` checkpoints reference `book:hebrewbooks:5635`. They are historical resume/checkpoint observations, not the current complete material map.
- No overlapping active writer assignment for this book was found in `work_log_current` during the bounded coordination check.

Therefore the correct operation is **reconcile and extend**, never create a second book node or delete the historical checkpoints.

## Intake classification

| Class | Material | Target treatment |
|---|---|---|
| Source anchor | Book node, HebrewBooks witness, PDF, 99-page register | Reuse the existing identity; refresh coverage metadata only through the authorized owner/writer |
| Workspace item | The book as a research subject | Save through existing `research_items`; local-first/cloud-sync behavior remains owned by Research Workspace |
| Candidate findings | DS-01, DS-03, DS-04, DS-06, DS-09, DS-10, DS-12, DS-13 | Prepare explicit source-linked candidates; keep source claim, corpus result, calculation and interpretation separate |
| Witness closures | CP5-WG-01 through CP5-WG-05 | Preserve as source/verification observations with exact `source_ref`; CP5-WG-02 retains its contradiction |
| Evidence/extraction only | 303 blocks; DS-02, DS-05, DS-11 | Reference as evidence and future extraction units; do not bulk-create Research Objects |
| Source-native open | CP5-WG-02; 1983 editor's צ״ע | Preserve as open questions; no invented answer and no canonical promotion |
| Withdrawn provenance | DS-07, DS-08 | Retain the corrected history as withdrawn; never surface the former misread as a finding |

## Authorized write sequence

1. Merge and deploy the public projection through the normal release owner so `/book/ahavat-torah` exposes the completed phase and intake route.
2. Reconcile the existing book node's stale coverage metadata with the 2026-10-22 snapshot; do not create another source/book identity.
3. Preserve the two old checkpoint Research Objects and link or supersede them through normal revision/provenance semantics; do not overwrite history.
4. Prepare source-linked candidate findings only for the closed datasets and witness closures listed above. Every candidate must include the exact dataset/claim identity and `book:hebrewbooks:5635#...` locator.
5. Route DS-02, DS-05 and DS-11 into a bounded extraction backlog. Completion of those tasks may create later candidates, but their current partial state is evidence, not a closed assertion.
6. Present candidate truth changes to ZURIEL as Human Gate. Saving to Workspace, having high confidence or passing a corpus calculation never auto-canonicalizes or auto-publishes.
7. After authorized writes, replay `/book/ahavat-torah → /research → exact return`, verify deduplication and provenance, and then record the release evidence in the existing coordination lane.

## Alignment with the master plans

- The active program is in the G3→G4 transition lane: Book/Source navigation belongs to the minimum coherent 2029 slice, while Golden acceptance and public cutover remain separate gates.
- Research material routes to one Research OS. Universal Finding is a projection envelope, not a new store.
- `research_items` owns personal Workspace membership. `research_objects` or another owner-governed research pipeline owns durable candidate assertions only after explicit promotion.
- Missing or ambiguous source evidence remains a Contextual Source Gap/research task. It is never silently converted into a fact.
- Deep extraction of this long-tail source can remain selective until a Golden or public capability materially depends on it.

## Not authorized by this manifest

- no live database write;
- no automatic bulk ingestion;
- no new table, store, graph or book-specific Research OS;
- no deletion of historical checkpoints;
- no canonicalization or publication;
- no merge, deployment or 2029 public cutover.
