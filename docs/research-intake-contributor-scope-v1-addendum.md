# Research Intake — Contributor Scope & Corpus Completeness (§6 Addendum)

**Status:** APPLIED (DB), Human-Gate ZURIEL pending explicit review, 26.8.2026, `RESEARCH_INTAKE_CONTRIBUTOR_SCOPE_V1`
**Extends:** `research_intake_foundation_contract` (§1–§5, `project_codex.slug='research_intake_foundation_contract'`, Master State §23.6) — this file documents **§6 only**. §1–§5 remain the DB-only canonical body, unchanged verbatim; they are not duplicated here.
**Scope:** documentation/naming-convention only, additive. **0 schema/migration/table/engine/ledger changes.** No historical `research_objects`/`contributors`/`edges` rows touched.
**Derived from:** two independent corpus stress tests already completed — Zvi Corpus Track A (4 extraction passes: WhatsApp corpus, 3D/spatial-geometry crosswalk) and Amit Existing Corpus (2 passes: media-archive, multilingual/writer-method stress test) — run specifically to test whether the §1–§5 contract holds unchanged across a different researcher, corpus structure, and source, without redesign.

**Test posed:** "Will the contract built from Amit's corpus work tomorrow, unchanged, on a different researcher, a different corpus, and a different source?"
**Result:** Yes — conditional on adding the six laws below, all phrased over primitives that already exist (`contributor_id`, `source_ref`, `privacy_scope`, `meta.ext.<domain>.<key>`, the existing §5 `PRIVATE CANONICAL ≠ PUBLIC` principle). Zero new tables, engines, or schema were required to express any of them.

---

## 6. CONTRIBUTOR SCOPE & CORPUS COMPLETENESS

### 6.1 Contributor Scope Separation Law
Every finding touching a contributor is classified first into exactly one of two categories, before any further processing:
- **ABOUT-CONTRIBUTOR** → belongs to the contributor's dossier (`contributors` + `contributors.dossier_settings`) — identity/biographical/meta information about the person themselves.
- **BY-CONTRIBUTOR-ABOUT-WORLD** → a candidate for universal research (`research_objects` with `meta.contributor_id`) — content/claims/findings the contributor produced about the world/gematria/sources, not about themselves.
Both types can sit on the same source row (e.g. one WhatsApp message) — the classification is at the *content* level, not the *row* level. There is no default assumption that an entire row belongs to one type (known gap, see below).

### 6.2 Source-Window / Corpus Completeness Law
A claim that a corpus is "exhausted" is forbidden without explicit evidence, and is graded across three distinct tiers that must not be conflated:
- **SOURCE EXHAUSTED** — all known items from a single, identified source (e.g. one WhatsApp export file, one channel) have been scanned.
- **KNOWN CORPUS EXHAUSTED** — all currently-known sources for a contributor have been scanned (but unknown/unconnected sources may still exist).
- **CONTRIBUTOR CORPUS COMPLETE** — no evidence or indication of any further source exists (the highest tier, rare).
Every exhaustion-status report must name which of the three tiers it refers to.

### 6.3 Representation Collapse Law
Collapsing a source artifact directly into a verified finding is forbidden. The mandatory chain:
**SOURCE ARTIFACT** (message/image/raw file) → **EXTRACTED CONTENT** (text/OCR/transcript extracted from it) → **CORE FINDING / CLAIM** (the claim the writer makes) → **EVIDENCE / REPRESENTATIONS** (different presentations of the same claim: Hebrew gematria, translation, geometric drawing, table).
Each stage is stored separately and linked (`source_ref`, `meta.contributor_id`, `provenance_type`) — never overwritten. Multiple representations of the same CORE FINDING (e.g. the same claim in Hebrew and English, or as text and as a geometric cube) are presentations of one finding, not separate findings and not duplication.

### 6.4 Access Is Orthogonal To Truth/Scope Law
Access level (`privacy_scope`, `dossier_settings.visibility`, `sensitive=true`) is a completely separate axis from the truth axis (CLAIM/VERIFIED/CANONICAL) and from the Scope axis (§6.1). Private/sensitive content can be engine-verified (`engine_verified=true`) without being public (extends §5's `PRIVATE CANONICAL ≠ PUBLIC`). Neither "not public ⇒ less reliable" nor "verified ⇒ publishable" may be inferred. Changing access is always a separate, explicit, human-gated action — never a side effect of verification or classification.

### 6.5 No Contributor-Specific Engine Law
No engine/parser/table/scoring mechanism may be built exclusively for a single contributor (e.g. a dedicated engine for one writer's personal method, or a geometry engine dedicated to one researcher). A contributor's unique writing method (writer-method / `WRITER_DECLARED_PATTERN`) is preserved as documented metadata (`meta.ext.writer_method.<name>`), not as engine logic. Promoting such a method to a canonical method always goes through the normal `agent_onboarding_law`/`method_priority` process (ZURIEL's locked definitions) — never through contributor-specific code as a side door. Extends `els_single_engine_law`/`gematria_engine_law` to every researcher domain.

### 6.6 Exhaustion Before Freeze Law
Declaring a "Universal Research Extraction Contract" Freeze is forbidden before at least **N≥3 corpora that differ in kind** (different researcher, different source structure, different language/method) have completed a full stress test and been documented. As of this writing: **2 of N** are complete (Zvi — Track A; Amit — Existing Corpus). This status is tracked here and in Master State; the contract is **not** frozen in this pass.

---

**Foundation Expansion Gate classification:** all six laws are **EXTENSION POINT NOW** — phrased entirely over existing primitives (`contributor_id`, `source_ref`, `privacy_scope`, `meta.ext.<domain>.<key>`, §5), zero new schema. None are MUST FOUNDATION NOW (they block no existing work) and none are LATER (they are already needed for the next stress-test pass).

**Known gaps (declared honestly, not closed in this pass):**
- No structural field yet marks ABOUT-vs-BY at the individual source-row level (§6.1) — today this is manual interpretive classification only.
- No structural field yet exists for the completeness tier (§6.2) — today this is textual/report-only.
Both gaps are candidates for a future Extension Point (`meta.ext.scope.*` / `meta.ext.corpus.*`), not an immediate structural change.

**Future-Capability Challenge:** Does the evidence from Amit's corpus reveal a plausible future gap that could force a redesign of the universal model? No — §6 is phrased entirely over cross-domain primitives already exercised by two structurally unrelated corpora; a third or fourth corpus (audio, video, an additional language) is expected to fit the same primitives without structural change, subject to re-verification in the next pass.

## Cross-reference
- `research_intake_foundation_contract` (§1–§5) — the base contract this section extends.
- Master State §23.6 — `INTAKE_FOUNDATION_CLOSURE` (base contract closure).
- Master State §23.11 — this addition.
- Zvi Corpus Track A (4 passes) + Amit Existing Corpus (2 passes) — the stress-test evidence base for §6.
- `unified_graph_law` / `reality_graph_law` — the one graph this contract sits above.
