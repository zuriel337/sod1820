# Books 2029 — Stage 1 Public Admission Decision Pack

Status: `GATE_A_APPROVED · STAGE_2_IMPLEMENTED_BRANCH_ONLY · GATE_B_REQUIRED`
Prepared: 2026-10-21
Repository baseline: `a67245ed95ee3fa6b198d593fdc84c07c9e546fc` (`origin/main`)
Execution boundary: branch-only; read-only production inspection; no live database write; no flag change

## Decision summary

Stage 1 identifies one bounded first-wave cohort for the Books surface:

- Recommend the 33 research objects linked to **יצחק בנטוב — סיור קצר בתודעה גבוהה** for a Books-specific human publication review.
- Do not publish them yet. `privacy_scope = 'public_candidate'` is eligibility for review, not a publication decision.
- Keep the other 59 Book-linked research objects private.
- Keep `lock_books` enabled until a bounded public reader exists, anonymous leakage tests pass, and the final publication gate is recorded.

This is the smallest coherent opening cohort. It preserves the canonical separation between verification, governance, operational status, and publication/access.

## Authority and invariants

This packet follows:

- `SOD1820_MASTER_OWNER_INDEX.md` §K: intake/canonicalization and publication are distinct stages; private-to-public promotion is explicit and human-gated.
- Live `research_intake_foundation_contract`: `engine_verified = true` does not authorize publication; `private` remains private by default.
- Live `truth_axes_foundation_law` v3: `CANONICAL != PUBLISHED`; publication/access is its own axis and is surface-specific.
- Live `research_object_identity_invariant_law` v2: source-native identity remains stable; no merge, deletion, or provenance rewrite is part of this stage.
- Live `site_flags_lock_law` v3: the route lock changes only after capability and permission checks.
- `docs/w0-2027-personal-publication-access-matrix-v1.md`: a public-readable Book does not imply every extracted claim is canonical or public.
- `docs/g4-world-open-cutover-sequence-20261013.md`: Books opens separately after its own capability and permission review.

## Live baseline

The production database was inspected with the read-only Supabase identity on 2026-10-21.

- Active Book nodes: 7
- Book-linked research objects: 92
- `public_candidate`: 33
- `private`: 59
- Research objects currently readable through the existing public/RLS path: 0
- Public Book-research projection/view dedicated to this surface: none detected
- `lock_books`: `enabled = true`, `mode = 'all'`
- Lock message: `אזור הספרים נמצא בהכנה וייפתח לאחר השלמת הבדיקה.`
- Lock last updated: `2026-10-13T08:13:53.282948+00:00`

The application already has a bounded Book index/detail implementation, but `/books` and `/book/:slug` remain behind `lock_books`. The current reader correctly returns a restricted state when RLS denies research-object access.

## Admission matrix

| Book | Slug | Linked research | Publication scope | Integrity notes | Stage 1 disposition |
|---|---|---:|---|---|---|
| אהבת תורה | `ahavat-torah` | 2 | 2 private | Evidence present; engine detail absent | Hold private |
| דעת תבונות | `daat-tevunot` | 1 | 1 private | Evidence present; engine detail absent | Hold private |
| יצחק בנטוב — סיור קצר בתודעה גבוהה | `bentov-brief-tour-higher-consciousness` | 33 | 33 public candidates | Statements, source refs, evidence, engine detail, presentation metadata, and source witness present on all 33; confidence is absent on all 33 and must remain explicitly unknown | Admit exact cohort to human review |
| ספר הבהיר | `sefer-habahir` | 0 | No linked research objects | Book identity exists; no research cohort to publish | Hold research launch |
| ספר הפליאה | `sefer-hapliah` | 42 | 42 private | 13 lack evidence; 4 lack confidence | Hold private; remediate evidence before reconsideration |
| ספר יצירה | `sefer-yetzirah` | 10 | 10 private | 9 canonical and 1 approved operationally; 1 lacks evidence and 1 lacks engine detail | Hold private; canonical/approved is not published |
| ספר רזיאל המלאך | `sefer-raziel-hamalach` | 4 | 4 private | Evidence and engine detail present | Hold private pending an explicit publication decision |

The corpus-coverage audits remain useful context but do not determine publication. Structurally, Ahavat Torah, Daat Tevunot, Sefer HaBahir, and Sefer Yetzirah have complete enumerations; Bentov has a completed high-value whole-book map with four unresolved items; Sefer HaPliah still lacks complete exact-witness coverage; Sefer Raziel is at 89/90 exact close-read pages with four residuals.

## Exact Wave 1 cohort

The proposed cohort is deterministic:

```sql
source_ref LIKE 'book:bentov-brief-tour-higher-consciousness%'
AND privacy_scope = 'public_candidate'
```

Snapshot facts:

- Rows: 33
- Distinct source references: 18
- Status: 33 `candidate`
- Kinds: 17 observation, 6 hypothesis, 5 fact, 5 relation
- Verification state: 5 `match`, 28 `not_applicable`
- Earliest creation: `2026-09-29T11:34:46.538257+00:00`
- Latest creation: `2026-09-29T11:55:25.444353+00:00`
- Owner-scoped rows detected: 0
- Existing `writer_dossier.visible = true`: 0
- Promoted-node references: 0
- Ordered-set drift checksum: `md5:0cb534ea389cd4dbb7b0a1aac598535d`

The checksum is a drift detector, not a security primitive. It was calculated from the ordered concatenation of `id`, `source_ref`, `status`, `privacy_scope`, and `verification_state`. A count or checksum change invalidates this decision packet and requires re-review.

## Why the cohort is not public now

`public_candidate` is an intake/publication-candidate state. The current RLS path also depends on a Writer-dossier visibility marker, and none of these 33 rows has that marker. Reusing or setting a Writer-specific marker for Books would collapse two separate publication surfaces.

Stage 1 therefore does not:

- grant anonymous access to raw `research_objects`;
- add a blanket RLS policy;
- create a `SECURITY DEFINER` bypass;
- set `writer_dossier.visible`;
- change any Book or research-object row;
- disable or narrow `lock_books`;
- infer confidence, verification, or canonicality from publication eligibility.

## Human Gate A — required next decision

Gate A was recorded from ZURIEL's instruction `המשך` on 2026-10-22. It authorizes the Stage 2 branch-only implementation described below. It does not authorize production publication, migration application, merge, deployment, or the Books unlock.

Recommended decision:

> Approve the exact 33-row Bentov cohort, checksum `0cb534ea389cd4dbb7b0a1aac598535d`, for **Stage 2 implementation and review on an isolated branch only**. This approval does not authorize production publication or unlock Books.

Available outcomes:

1. `APPROVE_STAGE_2_DESIGN` — proceed with the exact cohort.
2. `APPROVE_SUBSET` — provide the exact excluded row IDs or a deterministic exclusion rule; a new checksum is required.
3. `HOLD` — make no access-layer change.

## Stage 2 after Gate A

Stage 2 will design and implement the smallest Books-specific public projection on an isolated branch:

1. Define a surface-specific publication decision owned by the canonical publication/access axis.
2. Project only the display fields required by the Book UI; retain stable research-object identity and provenance.
3. Keep raw/private fields and non-admitted rows inaccessible.
4. Preserve explicit `unknown` confidence where confidence is absent.
5. Add anonymous, authenticated, admin, cross-Book, deep-link, pagination, and no-private-leak tests.
6. Re-run the 33-row count and checksum before review.
7. Keep `lock_books` enabled.

## Later gates

- **Gate B — publication approval:** approve the reviewed projection and exact content cohort for production migration. This is the explicit human publication decision.
- **Gate C — unlock approval:** after production verification shows the intended rows readable and all private rows denied, separately approve the `lock_books` change.

No gate inherits approval from an earlier gate.

## Stage 1 acceptance

- [x] Canonical owners and publication invariants identified.
- [x] Live Book and research inventory captured read-only.
- [x] Candidate cohort bounded and drift-checksummed.
- [x] Private and incomplete cohorts explicitly held.
- [x] No production data, RLS, grants, flags, or routes changed.
- [x] Human Gate A recorded by ZURIEL on 2026-10-22.

## Stage 2 branch result

Stage 2 implements a fail-closed public read boundary without publishing content:

- `book_research_public_v1` is a physical, sanitized projection with RLS and an explicit safe-column grant.
- The projection is empty by default. The migration contains no Bentov rows and no automatic `INSERT ... SELECT`.
- `research_objects` receives no new grant or policy and remains inaccessible to browser roles.
- Raw `meta`, `evidence`, and unrestricted `engine_detail` are not part of the public projection. `meta` is forced empty and `engine_detail` permits only `verification_state`.
- Review rows can exist but RLS exposes only `publication_state = 'published'`.
- The Books 2029 page reads only this projection and has no fallback to raw `research_objects`.
- Exact deep links are constrained by both research-object ID and Book node ID.
- `lock_books` remains enabled and the projection is not live.

Gate B remains required before any cohort materialization or production migration.

Stage 2 verification on 2026-10-22:

- 65/65 focused Book projection and selection tests passed.
- PostgreSQL 17.6 throwaway-schema assertions passed for RLS, safe-column grants, review-row denial, cross-Book filtering, and raw-field rejection.
- 2029 server/crawler SEO + AI metadata parity passed.
- The 2029 production build passed.
- Live read-only recheck: Bentov cohort remains 33 rows with checksum `0cb534ea389cd4dbb7b0a1aac598535d`; `lock_books` remains enabled; the projection is not live.
