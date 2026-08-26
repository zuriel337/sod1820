# Research Intake — Contributor Scope & Corpus Completeness (§6 Addendum)

> **ONE-CONTRACT / ONE-SYSTEM NOTICE:** This file is a **historical-provenance git-mirror** of one section of the single canonical contract (`project_codex.slug='research_intake_foundation_contract'`, DB-live, `nodes.rule_id='research_intake_foundation_contract_law'`). It is **not** a parallel SSOT and **not** an Amit-specific or Zvi-specific contract. Zvi, Amit, and future corpora are stress tests of this one contract; a finding is promoted here only when it is judged universal, not corpus-specific.

**Status:** APPLIED (DB), Human-Gate ZURIEL pending explicit review, 26.8.2026, `RESEARCH_INTAKE_CONTRIBUTOR_SCOPE_V1` (§6) + `RESEARCH_INTAKE_CONTRIBUTOR_SCOPE_V1_DELTA2` (§6.7–§6.11, Closure Delta #2)
**Extends:** `research_intake_foundation_contract` (§1–§5, `project_codex.slug='research_intake_foundation_contract'`, Master State §23.6) — this file documents **§6 (incl. §6.7–§6.11) only**. §1–§5 remain the DB-only canonical body, unchanged verbatim; they are not duplicated here.
**Scope:** documentation/naming-convention only, additive. **0 schema/migration/table/engine/ledger changes.** No historical `research_objects`/`contributors`/`edges` rows touched.
**Derived from:** two independent corpus stress tests already completed — Zvi Corpus Track A (4 extraction passes: WhatsApp corpus, 3D/spatial-geometry crosswalk) and Amit Existing Corpus (2+1 passes, the third being GPT's "Amit Existing Corpus Exhaustion Pass v2", `work_log.5aa4cb1d-0f6f-4bed-890b-cd24395d7a01`) — run specifically to test whether the §1–§5 contract holds unchanged across a different researcher, corpus structure, and source, without redesign.

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

---

## Closure Delta #2 (26.8.2026) — GPT Amit Exhaustion Pass v2

**Source:** direct continuation of the same corpus stress test (`work_log.5aa4cb1d-0f6f-4bed-890b-cd24395d7a01`, `d9e004f9-5689-40ba-a825-1afde815a82a`). Not a second corpus, not a new contract — seven further evidence shapes surfaced from continued extraction of the same Amit material, checked against the existing contract (§1–§6) before writing anything.

**Qualification to the previous "no foreseeable gap" claim (not preserved unqualified, per instruction):** that claim holds **at the schema level** — none of the seven findings below required a new table, engine, or redesign; five resolved as minimal additive delta, one was already an documented Extension Point elsewhere, one was already covered by an existing gate. But "no schema-breaking gap" is not the same claim as "the contract already names every shape of evidence." Each stress-test round keeps surfacing new *shapes* (an interpretation layer, a procedure, a derivation-chain privacy boundary, a symbol-identity ambiguity) the contract hadn't named before. The correct reading going forward: **no schema-breaking gap found yet**, not **the evidence space is fully enumerated**.

### 6.7 Source Authorship ≠ Analyst Interpretation Law
`attribution_type` (§1) and `contributor_id` already exist and are already used in production (`engine_fact`, `research_interpretation`, `named_rabbi_interpretation`, `mixed_fact_interpretation`, etc.) — but live evidence (a `research_objects` row attributed to "הרב זיגדון", `attribution_type='mixed_fact_interpretation'`, `source='SOD1820 research synthesis'`) shows real ambiguity in practice: it's unclear whether the attribution describes the source's own original claim or a later synthesis/connection layered on by an analyst. **Law:** attribution is per-object, never inherited. Any `research_objects`/`edges` row created by later analysis/linking (GPT/AI/another researcher) over a contributor's claim carries its **own** `attribution_type`/`contributor_id` describing who performed *that* analysis — it never automatically inherits the attribution of the claim it's based on. The original contributor's claim (`source_authorship`) and a later analyst's interpretation/connection (`analyst_interpretation`) are separate rows/attributions, linked via `derived_from`/`source_ref`, never merged into one identity. 0 schema (reuses existing `attribution_type` + `contributor_id` + `meta.source_refs`).

### 6.8 Research Procedure Extraction Law
Live evidence (Amit's "Prime Scan": tokenize a corpus → compute gematria per token → test primality → collect findings) reveals a third evidence shape the contract hadn't named: not a single Claim (Shared Expression Extraction v1, `X=Y`), not a Relation (§3), but a **Procedure** — a sequence of steps run across a whole corpus. **Law:** a procedure is not a new `research_objects.kind` (the existing `observation`/`relation`/`hypothesis`/`fact`/`question` values suffice) and does not justify a dedicated engine (**no Prime Engine, no separate Tokenizer Engine**). Instead, the procedure is documented as `meta.ext.procedure.steps[]` (a list of steps, each pointing at an existing primitive: a tokenizer, a `method_key` from `gematria_methods`, a deterministic math predicate), and every intermediate/final artifact is an ordinary `research_objects` row (`kind='observation'`), linked to the parent procedure via `derived_from`/`contains`. **Crosswalk:** each individual step (e.g. one token's gematria value) still goes through the existing `shared_expression_extraction_contract_v1` pipeline (AST→ENGINE→VERIFICATION) unchanged — the procedure is just the **grouping** of running that pipeline repeatedly over a corpus, not a parallel pipeline.

### 6.9 Private-Derivation Boundary Law (extends §5)
§5 (Privacy Promotion Law) states a private row never auto-promotes to the public graph merely because it's engine-verified — but it doesn't explicitly address what happens when a **derivation chain** (e.g. a `derived_from` chain) passes *through* a private operand (e.g. a contributor's name) and arrives at a value that looks general (e.g. 129). Live evidence: Amit — a private 129-chain through a personal name, versus general 129 expressions that don't depend on the name. **Law:** (a) a `derived_from` chain inherits the **most restrictive** `privacy_scope` along its length — a value derived from a private operand **stays private**, even if the resulting number "sounds general." (b) A separate general finding that can be **independently derived/verified from public-only operands** (without needing the private operand) is a **separate, parallel `research_objects` row** — not the same row — and can proceed on its own `privacy_scope`. 0 schema (extends the semantics of existing `privacy_scope` + `derived_from`; no automatic code-level inheritance flag yet — enforcement stays Human-Gate for now, an Extension Point for automation).

### 6.10 Mathematical Symbol / Operation Identity Law
`gematria_methods.method_key` already expresses exactly the needed principle (a locked identity distinct from `display_label`) — but only for gematria methods. Live evidence: φ(888)=288 (Euler Totient) vs. φ≈1.618 (Golden Ratio) — the same symbol, two entirely different mathematics; the same ambiguity applies to π/MOD/XOR/is_prime/triangular numbers. **Law:** extends the locked-`method_key` principle (rooted in `agent_onboarding_law`/`method_priority`) to **every mathematical operator/symbol**, not just gematria: any mathematical operation referenced in a finding requires an explicit, disambiguated `operation_key`, distinct from the displayed glyph/symbol (`meta.ext.numeric_op.<operation_key>` — avoids new schema, reuses the §1 `meta.ext.<domain>.<key>` pattern). Two visually-identical symbols with different meaning are two different `operation_key` values, **never merged**. An actual registry implementation remains an `EXTENSION POINT` — likely inside a future `Sequence Lens`/Numeric Research Router (see Routing Crosswalk below).

### 6.11 Formula Instance ≠ New Law (Derivation Relation) — adds to §3 only, does not override it
§3 (Relation Type Vocabulary) defined two categories (numeric equality `equals*`, entity identity `same_as`/`alias_of`/`variant_of`) — but missed a third category **already live in production**: `edges.relation_type='derived_from'` (4 existing rows, e.g. `"1024 = 512 × 2"`, `"512 = 256 × 2 ; 256=אהרן"`) — an **arithmetic-derivation** relationship, neither equality nor identity. Supporting live evidence: T37−T36=37 is an instance of the general formula T(n)−T(n−1)=n; Amit's common-factor chain (888=296×3, 1480=296×5, 2368=296×8 → coefficients 3,5,8) is the same shape. **Law:** `derived_from` is hereby formally declared a **third category** in §3 (in addition to, not instead of, `equals*`/`same_as*`): for a link between a value and the deterministic function output that produced it (multiplication, a triangular-number formula, a Fibonacci-term coefficient, a digit position in π, etc.). `edges.metadata.operation` (free text, already in use: `"×2"`) carries the description of the operation. **When a finding is an instance of a known general formula, it is documented as a `derived_from` edge with `operation` — never as a new Method/Law** in `gematria_methods`/`nodes(type='rule')`. 0 schema (`relation_type` is already free text with no CHECK constraint — no migration required).

## Routing Crosswalk (Closure Delta #2, 26.8.2026) — pointers only, no duplicated logic
- **π / Fibonacci / prime / MOD / binary / totient** → Numeric Research infrastructure (Master State §23.10, the `sequence:<id>` registry in `sequenceLens.js`/`numericResearch.js`, branch `gpt/numeric-router-integration-v1-clean` / PR #206 — **not yet merged**). `arithmetic_stride`/Number-as-Operator is already documented there as an **Extension Point**, not built — **not duplicated here**.
- **37/73 spatial claims** → the canonical Spatial/3D infrastructure (`src/lib/spatialModels.js` + `Gematria3DPage.jsx` + `GematriaCube.jsx`, `/spatial-gematria` — identified on Zvi Track A). Provenance classification (SOURCE-BACKED/MULTI-SOURCE-COMPOSITE/EDITORIAL-SYNTHESIS/SOURCE-UNKNOWN/RETROSPECTIVE-EVIDENCE) was already defined in Zvi Pass 4 — **ALREADY COVERED**, no parallel classifier built.
- **Multilingual material** → existing primitives only: §3 relation vocabulary (`same_as`/`alias_of`/`variant_of` for cross-language entity identity) + §1 meta registry (`meta.ext.<domain>.<key>`) — Multilingual is already declared an `EXTENSION POINT NOW` in `shared_expression_extraction_contract_v1`. **ALREADY COVERED**, no separate language engine built.
- **ABOUT AMIT / BY AMIT ABOUT WORLD** → §6.1 (Contributor Scope Separation), exactly as already written. **ALREADY COVERED**.
- **Per-member method provenance (finding #4)** → **ALREADY COVERED**: `fn_composite_convergence_candidate`'s Eligibility Gate (domain-agnostic: `engine_verified`+`value`+`status`+`source_ref` required per member, not per group) + the `unified_graph_law`/§9 `group_size` is not a strength metric principle — a converging group never exempts an individual member from its own engine verification. "SOURCE ACCEPTED ≠ ENGINE VERIFIED" is already the behavior the existing gate enforces; no new law added.

**Foundation Expansion Gate — Closure Delta #2 verdict:** 5/7 findings → minimal **CONTRACT DELTA** (§6.7–§6.11, 0 schema, over existing primitives) · 1/7 → **EXTENSION POINT** (already documented in the Numeric Research Router, finding #5) · 1/7 → **ALREADY COVERED** (finding #4). **0 MUST FOUNDATION NOW.** Contract Freeze is **still not closed** (2/N≥3 corpora — this is the same Amit corpus, not a third).

## Cross-reference
- `research_intake_foundation_contract` (§1–§5) — the base contract this section extends.
- Master State §23.6 — `INTAKE_FOUNDATION_CLOSURE` (base contract closure).
- Master State §23.11 — the §6 addition (Contributor Scope & Corpus Completeness).
- Master State §23.12 — this addition (Closure Delta #2).
- Zvi Corpus Track A (4 passes) + Amit Existing Corpus (2 passes + GPT Exhaustion Pass v2) — the stress-test evidence base for §6/§6.7–§6.11.
- `unified_graph_law` / `reality_graph_law` — the one graph this contract sits above.
- `shared_expression_extraction_contract_v1` — the single-expression extraction pipeline that §6.8's procedure steps still route through.
