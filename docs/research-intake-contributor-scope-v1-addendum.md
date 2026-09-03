# Research Intake — Contributor Scope & Corpus Completeness (§6 Addendum) + §8 Rule Application Provenance + §9 Source Deep Research Orchestration

> **ONE-CONTRACT / ONE-SYSTEM NOTICE:** This file is a **historical-provenance git-mirror** of sections of the single canonical contract (`project_codex.slug='research_intake_foundation_contract'`, DB-live, `nodes.rule_id='research_intake_foundation_contract_law'`, currently `rule_version=8`). It is **not** a parallel SSOT and **not** an Amit-specific, Zvi-specific, or Peli'ah-specific contract. Zvi, Amit, and future corpora (including ספר הפליאה, HebrewBooks 6355) are stress tests of this one contract; a finding is promoted here only when it is judged universal, not corpus-specific.

**Status:** APPLIED (DB), Human-Gate ZURIEL pending explicit review, 26.8.2026, `RESEARCH_INTAKE_CONTRIBUTOR_SCOPE_V1` (§6) + `RESEARCH_INTAKE_CONTRIBUTOR_SCOPE_V1_DELTA2` (§6.7–§6.11, Closure Delta #2) + `RULE_APPLICATION_PROVENANCE_V1` (§8, 2.9.2026) + `SOURCE_DEEP_RESEARCH_ORCHESTRATION_V1` (§9, 3.9.2026, ZURIEL Human-Gate approved)
**Extends:** `research_intake_foundation_contract` (§1–§5, `project_codex.slug='research_intake_foundation_contract'`, Master State §23.6) — this file documents **§6 (incl. §6.7–§6.11), §8, and §9 only**. §1–§5 remain the DB-only canonical body; they are not duplicated here — read the live row for the current text, not this file.

> **Drift-resolution pointer (2.9.2026, ZURIEL Human-Gate, additive):** §1's `source_refs` bullet previously read "reserved read-only-legacy... new writes must not write here", directly contradicting §2's own "canonical representation from here forward" for the same field. ZURIEL resolved it: **§2 governs new writes** — `source_ref` = primary/first *technical* citation anchor (never a truthfulness/authority/publication ranking), `meta.source_refs[]` = additional citations that independently support the *same* semantic Claim/Finding. Disagreeing sources are never merged into `meta.source_refs[]` — they stay separate Claim/Finding rows linked via `relates`/`parent_id`/`derived_from`. Full text lives in the live `project_codex` row, section `## 1-CORRECTION. §1↔§2 DRIFT RESOLUTION`. `research_intake_foundation_contract_law` (`nodes`, currently v7) never duplicated the contradictory text and needed no synchronization.
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

### 6.10 Mathematical Symbol / Operation Identity Law (wording corrected, Reconciliation Pass 26.8.2026 — see Reconciliation section below)
`gematria_methods.method_key` already expresses exactly the needed principle (a locked identity distinct from `display_label`) — but only for gematria methods. Live evidence: φ(888)=288 (Euler Totient) vs. φ≈1.618 (Golden Ratio) — the same symbol, two entirely different mathematics; the same ambiguity applies to π/MOD/XOR/is_prime/triangular numbers. **Law:** extends the **principle** behind the locked `method_key` (stable identity ≠ display label, rooted in `agent_onboarding_law`/`method_priority`) to **every mathematical operator/symbol**, not just gematria — **not the table itself**: `gematria_methods` **stays dedicated to gematria methods only** (ragil/atbash/miluy/מסתתר, etc.) and never becomes a general registry of all mathematics (prime/MOD/XOR/Euler-totient/Fibonacci/π/binary are not `gematria_methods` rows). Any mathematical operation referenced in a finding requires an explicit, disambiguated `operation_key`, distinct from the displayed glyph/symbol — stored in `meta.ext.numeric_op.<operation_key>` **or** a future dedicated Numeric Operation Registry (`EXTENSION POINT`, not `gematria_methods`) — avoids new schema, reuses the §1 `meta.ext.<domain>.<key>` pattern. Two visually-identical symbols with different meaning are two different `operation_key` values, **never merged**. An actual registry implementation remains an `EXTENSION POINT` — likely inside a future `Sequence Lens`/Numeric Research Router (see Routing Crosswalk below).

### 6.11 Formula Instance ≠ New Law (Derivation Relation) — adds to §3 only, does not override it
§3 (Relation Type Vocabulary) defined two categories (numeric equality `equals*`, entity identity `same_as`/`alias_of`/`variant_of`) — but missed a third category **already live in production**: `edges.relation_type='derived_from'` (4 existing rows, e.g. `"1024 = 512 × 2"`, `"512 = 256 × 2 ; 256=אהרן"`) — an **arithmetic-derivation** relationship, neither equality nor identity. Supporting live evidence: T37−T36=37 is an instance of the general formula T(n)−T(n−1)=n; Amit's common-factor chain (888=296×3, 1480=296×5, 2368=296×8 → coefficients 3,5,8) is the same shape. **Law:** `derived_from` is hereby formally declared a **third category** in §3 (in addition to, not instead of, `equals*`/`same_as*`): for a link between a value and the deterministic function output that produced it (multiplication, a triangular-number formula, a Fibonacci-term coefficient, a digit position in π, etc.). `edges.metadata.operation` (free text, already in use: `"×2"`) carries the description of the operation. **When a finding is an instance of a known general formula, it is documented as a `derived_from` edge with `operation` — never as a new Method/Law** in `gematria_methods`/`nodes(type='rule')`. 0 schema (`relation_type` is already free text with no CHECK constraint — no migration required).

## Routing Crosswalk (Closure Delta #2, 26.8.2026) — pointers only, no duplicated logic
- **π / Fibonacci / prime / MOD / binary / totient** → Numeric Research infrastructure (Master State §23.10, the `sequence:<id>` registry in `sequenceLens.js`/`numericResearch.js`, branch `gpt/numeric-router-integration-v1-clean` / PR #206 — **not yet merged**). `arithmetic_stride`/Number-as-Operator is already documented there as an **Extension Point**, not built — **not duplicated here**.
- **37/73 spatial claims** → the canonical Spatial/3D infrastructure (`src/lib/spatialModels.js` + `Gematria3DPage.jsx` + `GematriaCube.jsx`, `/spatial-gematria` — identified on Zvi Track A). Provenance classification (SOURCE-BACKED/MULTI-SOURCE-COMPOSITE/EDITORIAL-SYNTHESIS/SOURCE-UNKNOWN/RETROSPECTIVE-EVIDENCE) was already defined in Zvi Pass 4 — **ALREADY COVERED**, no parallel classifier built.
- **Multilingual material** → existing primitives only: §3 relation vocabulary (`same_as`/`alias_of`/`variant_of` for cross-language entity identity) + §1 meta registry (`meta.ext.<domain>.<key>`) — Multilingual is already declared an `EXTENSION POINT NOW` in `shared_expression_extraction_contract_v1`. **ALREADY COVERED**, no separate language engine built.
- **ABOUT AMIT / BY AMIT ABOUT WORLD** → §6.1 (Contributor Scope Separation), exactly as already written. **ALREADY COVERED**.
- **Per-member method provenance (finding #4)** → **ALREADY COVERED**: `fn_composite_convergence_candidate`'s Eligibility Gate (domain-agnostic: `engine_verified`+`value`+`status`+`source_ref` required per member, not per group) + the `unified_graph_law`/§9 `group_size` is not a strength metric principle — a converging group never exempts an individual member from its own engine verification. "SOURCE ACCEPTED ≠ ENGINE VERIFIED" is already the behavior the existing gate enforces; no new law added.

**Foundation Expansion Gate — Closure Delta #2 verdict:** 5/7 findings → minimal **CONTRACT DELTA** (§6.7–§6.11, 0 schema, over existing primitives) · 1/7 → **EXTENSION POINT** (already documented in the Numeric Research Router, finding #5) · 1/7 → **ALREADY COVERED** (finding #4). **0 MUST FOUNDATION NOW.** Contract Freeze is **still not closed** (2/N≥3 corpora — this is the same Amit corpus, not a third).

---

## Pre-Integration Cross-Contract Reconciliation (26.8.2026) — vs PR #206 + the existing Research OS family

**Source:** before opening a Controlled Admission pass for Zvi+Amit, ZURIEL/GPT asked for a focused reconciliation against **PR #206** (Numeric Research Router) to prove there is no competing Router/Contract/Truth-Lifecycle. **Key discovery, prior to running the checks:** a full contract family called "Research OS" already existed before any of this — `docs/research-studio-v1-contract.md` (**One Research OS**, APPROVED by ZURIEL 2026-08-24 — Discovery→Universal Findings→Investigation→Judgment, Lens/Dimension taxonomy), `docs/research-universal-finding-contract.md` (**Universal Finding envelope**, APPROVED, merged via PR #187 — `subject/source/identity/verification/evidence/access/provenance/projection/view`, explicitly "a projection, not a storage owner"), and the **Research DNA v1 Foundation Contract** (`audits/research_dna_v1_foundation_contract/`, PR #166, `CONTRACT: CLOSED` — owns the `verification_state` vocabulary: match/mismatch/method_unknown/not_tested). PR #206 itself already writes "existing Research OS / Reality Graph" in its own text — it already positions itself as a Lens *inside* this system, not a competitor to it.

**Ownership map (Check 1), verified against live PR #206 code (`pull_request_read`/`get_file_contents`), not just its description:**
- **Research DNA v1** (existing, CLOSED) — owns Claim/Calculation/Verification vocabulary, World/Method/Premium Access Law.
- **Intake** (`research_intake_foundation_contract`, this document) — owns source identity, extraction, attribution (§6.7), contributor scope (§6.1), privacy/access boundary (§5/§6.4/§6.9), representation collapse (§6.3), procedure decomposition (§6.8). Operates *before* a Finding exists — the `research_objects` row / Discovery-candidate layer.
- **Universal Finding Contract v1** (existing, APPROVED, merged PR #187) — owns the Finding envelope shape itself, a projection, never a storage owner. `makeUniversalFinding()` in `src/lib/research/universalFinding.js` is the one canonical implementation — **PR #206's `numericResearch.js` imports and calls it directly, verified live in the diff — it does not duplicate the envelope.**
- **Research Studio v1** (existing, APPROVED) — owns the overall flow and the Lens/Dimension taxonomy ("ELS, Number, Gematria, Entity/Graph, Sources, AI, **and future adapters**").
- **Numeric Research Router / PR #206** — one Lens family (`sequence:pi`/`sequence:fibonacci`, an extensible registry) inside that existing taxonomy. It adds exactly one small new concept — Derived Numeric Root / bounded depth-2 traversal — a legitimate extension of "Investigation," not a competing stage.
- **Master State §20 Gate #18 / `decision_ledger`** — owns Judgment/Human-Gate.
- **`fn_composite_convergence_candidate`** — owns the Eligibility Gate for admitting a converging group of findings.
- **Spatial Gematria** (`spatialModels.js`, etc.) — an existing capability; PR #206 itself already declares it `EXISTING CAPABILITY — ADAPTER NEEDED`, not a competing Geometry Graph.

**Conflict check:** every pair was checked — **zero contracts claim ownership of the same lifecycle responsibility.** The Router does no extraction/attribution (Intake's domain); Intake does no lens dispatch/derived-subject traversal (the Router's domain); the Router reuses the existing envelope rather than defining a competing Finding shape; every Router response hardcodes `canonical=false`/`published=false`/`automatic_canonical_promotion=false` (it never bypasses Human-Gate/Judgment). **Verdict: NO DRIFT.**

**One wording clarification made (not a new law):** §1 and the Universal Finding Contract both mention "provenance" — for **different objects**. `research_objects.meta` (a persisted DB row, Intake §1) is distinct from `Finding.provenance` (an ephemeral projection, Universal Finding Contract — explicitly "never itself a storage owner"). Clarified: when a `research_objects` row is projected into a Finding, the Finding's `provenance.createdBy`/`source.sourceRef`/`identity.sourceIdentity` are **populated from** Intake's `contributor_id`/`source_ref`/`attribution_type` — never redefined independently. No schema change; this is a mapping-direction clarification only.

**Check 2 — §6.10 Operation Identity:** confirmed the existing wording did **not** turn `gematria_methods` into a general registry — corrected the wording anyway (not a substantive change) to state explicitly: `gematria_methods` stays dedicated to gematria only; `operation_key` for general mathematics lives in `meta.ext.numeric_op.<key>` or a future separate registry — never in `gematria_methods`. `method_key` is a **precedent for the principle** (stable identity ≠ display label), not a universal storage home.

**Check 3 — Fibonacci/Derived-Sequences:** verified the composition, with no new subsystem, for Amit's `[888,1480,2368] → common factor 296 → [3,5,8] → Fibonacci`: (a) common-factor/GCD is **one new `operation_key`** (represented as `derived_from` edges, exactly like the existing live examples `"1024 = 512 × 2"`); (b) 3, 5, 8 are **already checkable today** against the existing `fibonacciSequenceAdapter` in PR #206 (three separate calls, no code change: `first_position` 3→term 4, 5→term 5, 8→term 6); (c) the consecutiveness of the resulting indices (4, 5, 6) is a trivial arithmetic check, not an engine. **Zero new components required beyond one `operation_key`. Verdict: EXTENSION POINT SUFFICIENT, not a Foundation Gap.**

**Check 4 — Spatial:** the existing decision in PR #206 (`EXISTING CAPABILITY — ADAPTER NEEDED`, the four layers Text→Gematria(verified)→Mathematical-Structure→Geometric-Form, `fact != midrash`) matches exactly the routing already written in the Closure Delta #2 Routing Crosswalk above for Amit's 37/73 and Zvi's spatial findings — **the same single Spatial Adapter for both, no second Geometry Engine.** **Verdict: CONFIRMED, no contradiction.**

**Check 5 — Admission Readiness:** Zvi (source/image provenance → Intake §1–2 + Finding.source/identity; numeric/spatial findings → Router + Spatial Adapter [not yet built, but direct `research_objects` insertion already works today exactly as it does for the existing 1020/910/620 rows]; unknown operand provenance [911] → `derived_from` + status; interpretation ≠ fact → the Research Studio core rule + `attribution_type`, **already live in production**) and Amit (convergence families → `fn_composite_convergence_candidate`; 37/73/2701 → numeric + spatial extension points; π/Fibonacci → **already implemented**; prime/MOD/binary/totient → `operation_key` extension points; multilingual → §3 + `shared_expression_extraction_contract_v1`; private derivations → §6.9; source claims not reproduced by the engine → `verification_state = mismatch/method_unknown`, **exactly the right value that already exists**) are **all representable at the contract level**, some via an Extension Point still to be built (Spatial Adapter, GCD/MOD/prime/totient operations) rather than a Foundation Gap.

**Foundation Expansion Gate (Reconciliation Pass):** **0 MUST FOUNDATION NOW.** EXTENSION POINT NOW: building the Spatial Adapter · `operation_key` for GCD/MOD/prime/totient/binary · a separate Numeric Operation Registry (not `gematria_methods`). LATER: a full multilingual tokenizer · automatic recursive traversal beyond Depth 2 · bulk scanning.

**Verdict: `FOUNDATION SUFFICIENT FOR CONTROLLED ZVI+AMIT ADMISSION`** — the contracts together (Intake + Universal Finding + Research Studio v1 + Numeric Router + existing Spatial capability + Composite Convergence) can admit every finding type enumerated above at the contract/vocabulary level; specific Lens/Adapter implementations (Spatial, GCD/MOD/prime/totient) remain on the Numeric Router's own roadmap to complete — they do not block a controlled admission pass (a direct `research_objects` path already exists and is already used for Zvi).

**What was explicitly not done here:** no code in PR #206 was touched; PR #206 was not merged; no data was admitted (0 new `research_objects` rows); Contract Freeze was not closed.

---

## Final Closure (27.8.2026) — Article Corpus Stress Test #3 + Freeze Decision

**Source:** a final, focused Closure Pass — not a new audit, not new construction. §23.13 (previous pass) already established `FOUNDATION SUFFICIENT FOR CONTROLLED ZVI+AMIT ADMISSION`, but left §6.6 (Exhaustion Before Freeze) at 2/N. GPT ran a READ-ONLY Article Corpus Stress Test on `posts.id=145` (`work_log.09ee30cd-86f1-47be-ab6b-f9d7b986afcf`); Claude independently re-verified rather than trusting the handoff.

**Existing-law verification (Part B):** read the full live contract body (26,115 chars at the time) and confirmed all 15 required laws/mechanisms are actually present in the text, not just claimed in prior reports: Contributor Scope Separation (§6.1), Source/Corpus Completeness 3 tiers (§6.2), Representation Collapse (§6.3), Access⟂Truth/Scope (§6.4), No Contributor-Specific Engine (§6.5), Source Authorship≠Analyst Interpretation (§6.7), Research Procedure Extraction (§6.8), Private-Derivation Boundary (§6.9), Mathematical Symbol/Operation Identity (§6.10), Formula Instance≠New Law/`derived_from` (§6.11), per-member convergence verification (Routing Crosswalk), multilingual routing (Routing Crosswalk), Spatial existing-capability routing (Routing Crosswalk), Numeric/Fibonacci/π routing (Routing Crosswalk), and the Research OS/Universal Finding/Intake/Router/Human-Gate ownership boundaries (§6-RECON). Nothing was missing — no STOP was required.

**Article 145 as corpus #3:** independently verified live — `posts.id=145`, `wp_id=31656`, `source='wordpress'`, 50,895 characters, title explicitly referencing the Magen David's geometric structure and the 73/37 hints, matching GPT's description exactly. This is a **materially different** corpus type: a published, publicly-visible editorial article, not a private contributor dossier like Zvi or Amit. Core claims were re-verified directly against the canonical engine (not assumed): Genesis 1:1 = 2701; חכמה = 73; ישראל = 541; ציון = 156; 156+385 = 541; שכינה = 385; גאולה = אדם = 45; הריון = 271; נקודה+קו = 271; אבן in Gadol = 703 (`fn_gadol`); חכמה in Kadmi = 271 (`kadmi_calc`) — all confirmed. The holds were also confirmed correct: מגן דוד = 107 in ragil (not the claimed 108 — an unstated kolel), reproducing GPT's finding exactly.

**Article-derived deltas (Part D), both resolved without a new law:**
- **Text-Position Provenance** (e.g. "the 787th word in the parsha") — **ALREADY COVERED / CLARIFICATION ONLY**. A minor wording clarification was added to §2: tokenizer/version and counting-convention fall under the *same* existing Source/Book/Edition/Textual-Version Extension Point, not a new category. No tokenizer was built.
- **Spatial Counting Semantics** (a point-count claim that depends on geometric-model identity, order, region, boundary/interior/center, overlap policy) — **EXTENSION POINT NOW — ADAPTER CONTRACT**, not a second Geometry Engine. Already documented in the Routing Crosswalk and in PR #206's own Spatial reconciliation section; Article 145 is one more concrete instance of an already-named extension point, not a new discovery.

**§6.6 updated 2/N → 3/N:** the three materially-different corpora are (1) Zvi — Track A (WhatsApp/contributor, spatial); (2) Amit — Existing Corpus (media archive, multilingual/writer-method, private); (3) Article 145 (published editorial content). All three produced 0 MUST FOUNDATION NOW.

**Final Future-Capability Challenge, 13 axes:** Identity, Representations, Relations, Time/Context (`OD-TIME-8` remains sole owner, no conflict), Provenance, Truth Lifecycle, Engines, Extensibility (the `meta.ext.<domain>.<key>` mechanism itself, repeatedly proven), Human Gate, Multilingual, Cross-domain, Privacy, Source/Corpus Completeness (3/3). **0 gaps requiring redesign found on any axis.**

**Required qualification (Freeze is not omniscience — not preserved without this caveat):** declaring the contract frozen does **not** claim "every future form of evidence is known." Freeze means: the primitives and extension mechanism (`meta.ext.<domain>.<key>`, `derived_from`, `attribution_type`/`contributor_id`, `privacy_scope`, `verification_state`) are broad enough to begin ingestion **without an expected redesign**. Discovering a new Lens, Adapter, `operation_key`, representation, or source type in the future does not break the freeze, as long as it can be expressed through the existing contracts without an identity break, schema redesign, truth-lifecycle redesign, or a parallel engine/store/graph.

## Verdict: FOUNDATION SUFFICIENT — RESEARCH INTAKE FOUNDATION CONTRACT FROZEN FOR CONTROLLED UNIVERSAL INGESTION

**What this freeze does and does not authorize:** the canonical flow remains `SOURCE → EXTRACTION → CALCULATION/DISCOVERY → RESEARCH OBJECT/CANDIDATE → VERIFICATION → UNIVERSAL FINDING → HUMAN GATE → CANONICAL → (separately) PUBLISHED/VISIBLE/ACCESSIBLE`. Preserved in full: `HOT≠TRUE`, `VIP≠TRUE`, `CLAIM≠FACT`, `ENGINE VERIFIED≠CANONICAL`, `CANONICAL≠PUBLISHED`, `PRIVATE CANONICAL≠PUBLIC`. The freeze does **not** authorize source→canonical promotion or mass ingestion — any further intake stays Controlled and Human-Gated, exactly as already practiced in the Zvi/Amit Admission pass (Master State §23.11–§23.13, work_log `706f24dd`).

**Explicitly not done here:** no mass ingestion; no fourth corpus scanned "just to be safe"; no reopening of decisions already made; no Spatial Adapter built; no Numeric operations built; no Personal Hints built; no touching PR #206's code (read-only, confirmed unchanged); no promotion of any Finding to canonical; no publication. No second Universal Extraction Contract, Article Contract, Zvi Contract, or Amit Contract was created — the same single `research_intake_foundation_contract` was closed.

## §8. Rule / Method Application Provenance (2.9.2026, ZURIEL Human-Gate, `RULE_APPLICATION_PROVENANCE_V1`)

> **Note on this file's scope:** this addendum otherwise mirrors §6 (Contributor Scope & Corpus Completeness). §7 (Extraction Integrity Patch, ZVI 3060, DB `rule_version` 5→6) is live in `project_codex`/`nodes` but does not yet have its own git mirror in this file — that gap predates this pass and is not backfilled here. §8 below is mirrored because it is the deliverable of this pass (DB `rule_version` 6→7).

**Source:** a Foundation gap surfaced by a read-only audit, using the real live pilot case as calibration: `research_objects` C3a (`b4b40fe6-39d8-494b-9608-1c86f83dd6fc`, "ממשלת משיח בן דוד — הרגיל + המילוי = 4530", `engine_verified=true`) and C3b (`b80437d1-6a69-4eef-9168-fb12ce82fa64`, source-claimed 453, direct engine result 4530, `engine_verified=false`, mismatch). The canonical rule `zero_scale_law` (`nodes`, `rule_version=1`) supports 4530→453 as a rule-mediated derived relationship (operation `÷10`) — not a direct engine match. What SOD1820 *found* is already recorded (`research_objects`/`engine_detail`); *how a canonical rule was used to get there* had no dedicated, reconstructable home.

**Identity Law — Rule Definition ≠ Rule Application:** a rule's definition (`nodes type='rule'`, e.g. `zero_scale_law`) remains the single canonical source of truth, unchanged. *Using* that rule on a specific finding is an **occurrence/application** — not a new rule, not a new `research_objects.kind`, not a graph node, not a new engine method. Rule Application lives **only** as provenance/metadata on the existing `research_objects` row it supports — never a parallel store, engine, or graph.

**Canonical location — verified live before choosing (GPT cross-verification correction: do not assume `methodology`):** all 17 existing `research_objects.meta->'ext'` domains were scanned live (`writer_dossier`, `gematria`, `scope`, `stress_test_pass`, `family`, `procedure`, `note`, `text_position`, `derived_from_family`, `privacy_boundary`, `foundation_ref`, `needs_followup`, `foundation_challenge`, `zero_navigation_case`, `operand_provenance`, `golden_slice_786`, `continues_family`) — none covers "use of a canonical rule with rule_id+rule_version+operation+chain+outcome." `operand_provenance` (§7.1, live — e.g. the 911+909=1820 row) is close in spirit but narrower (a flat operand→origin-note map, no rule_id/version/chain/outcome). `procedure` (§6.8, live, 24 rows — including a live `steps[]` array with per-step `operation`+`status`, from the Sefer HaPeli'ah pass) is close in shape but is built for a multi-step procedure extracted from an external source, not for recording a use of SOD1820's own canonical rule on a single finding. **No duplication — a new domain was chosen, not `methodology` (as the instruction explicitly warned against), but `rule_application`, matching exactly the existing `meta.ext.<domain>.<arrayKey>[]` structural pattern already established by `procedure.steps[]`:**

> **`research_objects.meta.ext.rule_application.applications[]`**

Each array entry (field-level shape, no CHECK constraint, flexible jsonb):
```
{
  application_id,        // local uuid — identity of this occurrence, not the rule's identity
  rule_id,                 // = nodes.rule_id (or gematria_methods.method_key) — free-text reference, same polymorphic pattern as decision_ledger.subject_ref
  rule_version,             // snapshot of rule_version at time of use — never live-joined later
  rule_family,              // "numeric_transform" | "gematria_method" | "els_cipher" | ... — which registry rule_id resolves against
  operation,                 // short canonical text, e.g. "÷10" — the exact idiom already live (zeroScales() in src/lib/supabase.js + edges.metadata.operation)
  inputs: [{ value, role, origin_type, origin_ref }],    // reuses §7.1's shape verbatim (already MUST FOUNDATION NOW) — not a duplicate
  outputs: [{ value, role, target_ref }],                  // the symmetric counterpart to inputs
  application_class,        // closed enum — see below
  application_outcome,      // closed enum — see below (MUST FOUNDATION NOW)
  actor,                     // who/what applied it (agent name, or 'human')
  applied_at,                // timestamptz, distinct from the row's created_at
  chain_position,            // optional: { step, previous_application_id } — links without merging identity
  governance_ref,            // optional: decision_ledger.id — a pointer only, never a duplicated decision
  provenance_note
}
```

**`application_class` — closed vocabulary (does not overload the existing `meta.layer`, confirmed live already inconsistent — 19 ad-hoc values found in the corpus — and not structurally intended for classifying rule usage):**
`DIRECT_CALCULATION` · `TRANSFORM` · `DERIVATION` · `INTERPRETATION` · `RELATION_SUPPORT`

**`application_outcome` — MUST FOUNDATION NOW (checked live before proposing: `verification_state`/Research DNA v1 = direct-engine verification state, not rule usage · `research_objects.status` = the whole Finding's lifecycle, not per-application · `decision_ledger.human_decision` = a governance decision, not a raw mechanical state · `decision_reevaluations.outcome.result` = one observed value, `decision_confirmed_unchanged`, not a closed vocabulary for this axis. None covers "was this specific rule application supported/rejected/superseded" — a small new, closed, non-overlapping vocabulary, 4 values):**
`APPLIED_SUPPORTED` · `UNSUPPORTED` · `SUPERSEDED` · `REJECTED`

**Binding distinctions (Truth Axes are not overloaded):**
- `application_outcome` is **completely separate** from `engine_verified` / `research_objects.status` / `decision_ledger.human_decision` / canonical / publication — its own independent axis, like every other axis in this contract.
- A rule application **never** changes `engine_verified`/`engine_detail` on the row it annotates. (Illustrative only, not written: C3b stays `engine_verified=false`/mismatch against 4530, even after recording that `zero_scale_law v1`, `operation="÷10"` supports 453 as a derivative of C3a's 4530.)
- No source value is rewritten (453→4530) and no row identities are merged — every Rule Application is additive metadata only; it never replaces or changes the direct value/status of any row.
- Governance stays **only** in `decision_ledger` — `governance_ref` is a pointer only, never duplicated into a second decision field inside the Rule Application itself.

**Chaining:** `chain_position:{step,previous_application_id}` within the **same** `applications[]` array, or spread across separate `research_objects` rows via `derived_from`/`contains` — exactly the pattern already established in §6.8. Each step keeps its own distinct identity (`application_id`+`rule_id`+`rule_version`+`operation`), with no information loss and no merging. **No workflow engine is built here** — this only guarantees representability, not execution.

**Research DNA — ready for future queries (not implemented in this pass):** `jsonb_array_elements(meta->'ext'->'rule_application'->'applications')` allows, with no additional schema: every use of `zero_scale_law` · usage frequency per rule · rule co-occurrence (same array) · chains (`chain_position`) · supported vs. unsupported/rejected (`application_outcome`) · source/domain distribution (`inputs[].origin_ref` + the row's existing `source_ref`/`contributor_id`). **No analytics/dashboard/index are built here.**

**0 new schema/table/RPC/engine/graph.** Extends §1 (META REGISTRY, `meta.ext.<domain>.<key>`) and §7.1 (Semantic Operand/Quantity Provenance, already MUST-FOUNDATION-NOW) — replaces neither, duplicates nothing. C3a (`b4b40fe6-39d8-494b-9608-1c86f83dd6fc`) / C3b (`b80437d1-6a69-4eef-9168-fb12ce82fa64`) were **not touched** in this pass — the example above is illustrative text only, not a data change.

---

## Cross-reference
- `research_intake_foundation_contract` (§1–§5) — the base contract this section extends.
- Master State §23.6 — `INTAKE_FOUNDATION_CLOSURE` (base contract closure).
- `docs/research-studio-v1-contract.md` — One Research OS (reconciled in the Pre-Integration Reconciliation above).
- `docs/research-universal-finding-contract.md` — the Universal Finding envelope (reconciled above).
- `audits/research_dna_v1_foundation_contract/` (PR #166, CLOSED) — `verification_state` vocabulary, reused verbatim by both Intake and Universal Finding.
- Master State §23.13 — the pre-integration reconciliation.
- Master State §23.11 — the §6 addition (Contributor Scope & Corpus Completeness).
- Master State §23.12 — the addition (Closure Delta #2).
- Master State §23.15 — this final closure and freeze decision.
- Zvi Corpus Track A (4 passes) + Amit Existing Corpus (2 passes + GPT Exhaustion Pass v2) + Article 145 (published editorial content) — the three-corpus stress-test evidence base for the freeze.
- `unified_graph_law` / `reality_graph_law` — the one graph this contract sits above.
- `shared_expression_extraction_contract_v1` — the single-expression extraction pipeline that §6.8's procedure steps still route through.
- §7.1 (Semantic Operand/Quantity Provenance Law, DB `rule_version` 5→6, ZVI 3060) — the `inputs[]`/operand-provenance shape §8 reuses verbatim; not re-mirrored in full in this file (see the note at the top of §8).
- §8 (Rule / Method Application Provenance, DB `rule_version` 6→7, `RULE_APPLICATION_PROVENANCE_V1`, 2.9.2026) — `research_objects.meta.ext.rule_application.applications[]`; calibration case C3a/C3b + `zero_scale_law`.
- §9 (Universal Source Deep Research Orchestration, DB `rule_version` 7→8, `SOURCE_DEEP_RESEARCH_ORCHESTRATION_V1`, 3.9.2026) — cross-reference index only; see below.

---

## 9. UNIVERSAL SOURCE DEEP RESEARCH ORCHESTRATION — CROSS-REFERENCE INDEX (3.9.2026, ZURIEL Human-Gate, `SOURCE_DEEP_RESEARCH_ORCHESTRATION_V1`)

**Source:** derived from a multi-round stress-test on ספר הפליאה (Sefer HaPeliah, HebrewBooks 6355), coordinated across parallel GPT/Claude sessions per `inter_agent_coordination_law` v3 — **not a new Book Foundation, not a Peli'ah Engine**. This whole section is a cross-reference/pointer index; it duplicates no existing logic. All 10 clauses are phrased over existing primitives only (`gematria_methods`, `research_objects`, `edges`/`nodes`, `meta.ext.<domain>.<key>`, `decision_ledger`).

### 9.1 New Source Family / Operator Admission Law
`NEW SOURCE FAMILY → crosswalk to existing primitives first → extend representation/relation semantics only if needed → no new engine/store by default.` Targeted Witness Adjudication (§9.9, Witness Adjudication + Non-Resolution Provenance) is an orthogonal, Decision-Gated evidence step — never a prerequisite for Research Object/candidate persistence. The existing Intake flow (§1–§8) is unchanged and unblocked by adjudication status.

### 9.2 Identity Tiers ≠ Authority
**Source Work ≠ Book ≠ Edition ≠ Textual Version ≠ Witness ≠ Digital Object ≠ Page/Span/Region** — seven distinct identity tiers, never collapsed into one. A Witness is a provenance-bearing manifestation of a source (a specific PDF/scan/transcription/edition-copy) — identity only. **Witness identity ≠ authority.** **Digital Object/storage URL ≠ Witness authority** — a stored file reference (e.g. a Storage URL) identifies where a copy lives, never that it is authoritative. **Page/Span/Region = locator, not identity** of Source/Book/Edition/Witness — a position within, never a substitute for any tier above.

### 9.3 Source-of-Record Assignment
Authority is assigned question-by-question, as research provenance/role, scoped to the specific claim — **not** persisted via `decision_ledger` by default. `decision_ledger` is invoked **only** when ZURIEL/Human-Gate makes an explicit governance decision about that authority. **Governance ≠ Provenance.**

### 9.4 Digital Discovery-Aid ≠ Authoritative Witness
A digital transcription may locate/reconstruct a candidate reading; it never substitutes for §9.2/§9.3 determination.

### 9.5 Coverage Semantics — three separately-owned concepts
- **Research Map / Research Grammar Coverage** — how much of the source's operator/procedure-grammar space has been identified and family-classified.
- **Exact-Witness Coverage** — how much has been adjudicated against an authoritative witness (§9.2/§9.3).
- **§6.2 Source/Corpus Exhaustion** — the existing 3-tier law, unchanged, not redefined here.
Digital/OCR/transcription sweep coverage is an operational discovery metric only — it is not the Research Map axis and must never be reported as such.

### 9.6 Research-Density Prioritization
Universal principle only: rank unreviewed source regions by expected decision-changing research density, using whatever source/extraction/research evidence is available. No scoring engine, store, or view is authorized by this clause.

### 9.7 Foundation-Primitives-First Crosswalk Order
Every new family/operator crosswalks against Foundation primitives first. Projection/Lens adapters are downstream reuse only — they never dictate Foundation semantics.

### 9.8 Multi-Session Orchestration
Points only to `inter_agent_coordination_law` v3 (10)–(21). Zero restatement.

### 9.9 Witness Adjudication + Non-Resolution Provenance
Every targeted witness-adjudication pass classifies each target as **VERIFIED EXACT / CORRECTED / STILL AMBIGUOUS**. Semantic requirement — **MUST FOUNDATION NOW**: a `STILL AMBIGUOUS` (or any unresolved) state must preserve **why**. Guidance vocabulary (not a DB enum/schema): `witness_unavailable` · `illegible` · `insufficiently_localized` · `conflicting_witnesses` · `genuinely_ambiguous`. Storage representation — **EXTENSION POINT NOW**: not mandatory schema/path, not a DB enum; the requirement is that the reason is preserved somewhere provenance-bearing, not which field holds it.

### 9.10 Cross-Source / Cross-Book Projection
Points to Research DNA v1 §18 and `reality_graph_law`. **`WS-CROSS-ENGINE` Foundation closure is already closed** (contract-level). Future advanced implementation/projection is downstream reuse and is not a §9 dependency.

### Foundation Gate (§9)
**MUST FOUNDATION NOW:** §9.1 · §9.2 · §9.3 · §9.4 · §9.5 · §9.7 · §9.8 · §9.9 (semantic half) · §9.10 (pointer/closure-record half).
**EXTENSION POINT NOW:** §9.6 (principle) · §9.9 (storage-path half).
**LATER:** §9.6 (automated scoring/dashboard/UI) · §9.10 (future advanced projection).

### Provenance (§9)
ספר הפליאה (HebrewBooks 6355) is **stress-test provenance** for §9 — it does not become universal contract semantics. Source-specific research (checkpoints, page loci, family closures) remains in Research OS (`research_objects`) and `work_log` handoffs; `work_log` is not SSOT (see `work_log_authority_law`). Full detail: `nodes.rule_id='research_intake_foundation_contract_law'` metadata key `v8_source_deep_research_orchestration_2026_09_03`.

**0 new schema/table/RPC/engine/store/graph/`research_objects` were created in this pass.**
