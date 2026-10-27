# Books 2029 — unified preview integration

BEFORE · 2026-10-27 · base `40382ae21b9ca2d6ca38f58c387542b993d18f69`. The user authorized integrating the Books handoffs and a protected Preview, without main, Legacy, Production or product DB changes. Active ownership was checked read-only and released AFTER records were reconciled. This note is not a live work-log entry. Integrate exact Books branches in an isolated worktree, preserve source states and report unconnected content honestly. The separate contract integration branch has unrelated site ancestry and must not be merged wholesale into Books; read its contract for acceptance and preserve the source branch. Do not silently activate unreviewed source assertions or treat model specifications as implemented 3D.

## Integrated branches

True merges retain the ancestry of `76bf32d7` (Ahavat reader), `821b647c` (Ahavat content and presentation), `640e14f0` (Yetzirah catalog and scenes), `e818f291` (Yetzirah source acceptance), `fdff1051` (Daat Tevunot content and structure), `b767370b` (Bahir content), and `732d4c27` (partial Hapliah content). The 76bf/821 conflicts were resolved by retaining both source-unit/deep-link behavior and new content controls. Bahir and Hapliah commentary changes are read by the existing reader; their new internal-map JSONs are retained but are not wired into it. Yetzirah 33 structures remain specifications, not 33 implemented 3D models. Hapliah is partial and lacks fresh visual PDF source review. The contract is separately integrated at `1549fa60` on site ancestry; it is not merged wholesale here because that would import hundreds of unrelated files. Its requirements guide this preview, but no complete contract acceptance is claimed.

## Integration corrections

Bahir page 24 retains the book's 12+12+12 explanation without displaying an engine-verification label. Hapliah's 17 relations gained the explicit existing `machine_located_pending_visual` status expected by its own acceptance test; source review remains pending. No source numbers, quotes or unknowns were promoted to verified.

## Checks and limitations

328 selected Books non-browser tests passed after the two integration corrections. Language 3/3, Auth Guard 4/4, Legacy Production Lock, normal and Books Preview 2029 builds and their graph/weight gates passed; eager gzip 379,579 / 380,277 bytes. Ahavat source-table and Yetzirah catalog browser stories passed at 320/390/1440 with PDF requests mocked. A concurrent browser run timed out due to contention; the exact-unit return matrix was rerun separately. The browser tests check source URLs, not native PDF viewing; full native PDF and complete model/source interaction acceptance remain pending. Protected Preview must be independently verified at exact HEAD. No live work-log entry was created.
