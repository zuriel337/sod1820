# SOD1820 — RESEARCH DNA v1 · FOUNDATION CONTRACT
### Architecture/Contract + Roadmap Alignment · actor=CLAUDE · 2026-08-22 · **§4 corrected 22.8 (fifth pass); §8–§25 added 22.8 (seventh pass); method-count/status wording corrected 22.8 (ninth pass, ZURIEL Human-Gate decision); §26–§29 (Part III) added 22.8 (tenth pass, ZURIEL Human-Gate decisions on the Methods Unification Human-Gate pack + new Number Coverage / Deep Corpus Research law suite); §28/§29 finalized 22.8 (eleventh, FINAL pass — ZURIEL's final D/E access decision closes both open sub-questions; no longer a proposal)**

**§26–§29 correction, 22.8 (tenth pass):** Tzuriel sent (1) his Human-Gate decisions on the separate Methods Unification implementation pass's 11-item Human-Gate pack (A–K, recorded in `audits/gematria_methods_unification/GEMATRIA_METHODS_HUMAN_GATE.csv`), and (2) a new Number Coverage / Deep Corpus Research law suite. Part III below (§26–§29) brings both into this contract as durable text, extending rather than duplicating Part I/II. **Still docs-only: 0 DB writes except the closing `work_log` memo. F/G/H/I remain HOLD (unresolved cipher definitions / verification gap). Decision K's architecture is approved but not implemented — `gw_enforce_engine`/`bidim_sync` are untouched.** See the companion `audits/research_dna_v1_foundation_contract/RAZIEL_PERSONALIZATION_LAW.md` for Tzuriel's third, separate Research Preference & Raziel Personalization decision — kept as its own file per the same judgment call `CORPUS_APPROVAL_LIFECYCLE.md`/`METHOD_LIFECYCLE_ALIGNMENT.md` already made, since Raziel is a big enough, distinct enough subsystem.

**§28/§29 finalization, 22.8 (eleventh, FINAL pass):** Tzuriel sent his final access decision on D and E, closing both sub-questions the tenth pass's §28 had left as recommendations awaiting approval (D's Full Method Profile/Deep Cross tier: `public` vs. conservative `premium`; E's triangle-pair composite tier: `premium` vs. `deep_research`). §28 and §29 below are rewritten to state these as **decided**, not proposed — see §28 for the verbatim decision text and the closed summary table. Nothing else in this document changes. Still docs-only: 0 DB writes by this pass. `src/lib/research/compositeMethods.js`'s `tierHint` values are **not** touched by this pass — they predate this final decision and are now stale relative to it; flagged in §28.2 as a follow-up for Methods Build, not silently corrected here.

**This is the seventh pass in a chain on the same subject** (an eighth, reconciliation-only pass and this ninth, correction pass followed). **§9 correction, 22.8 (this pass):** `CANONICAL_RULES_RECONCILIATION.md` (eighth pass) surfaced two conflicts against the live rule book. ZURIEL resolved both by explicit Human-Gate decision: (1) **no single fixed method-count exists** — `gematria_methods` is the count SSOT, any count must be capability/state-qualified (registered/active/dispatchable/stored/displayed), historical counts (13/14/20/24) are preserved as provenance/snapshots but not treated as canonical law, and implementation is not modified merely to make historical counts agree — every "13 active/current methods" reference below is corrected accordingly (§8, §14's summary line, §15, §16); (2) **the method-lifecycle stage order** is corrected in `METHOD_LIFECYCLE_ALIGNMENT.md` §1 to `discovered/unresolved → definition reconstructed/defined → candidate → engine-tested/reproducible → Human-Gate approved → active`, and §14 below reclassifies רגיל ישר והפוך from `candidate` to `discovered/unresolved` accordingly (it has no defined formula, unlike ר"ת/ס"ת). **No live rule was written or changed; no method activated; PR #166 not merged** — see `METHOD_LIFECYCLE_ALIGNMENT.md` §7 for the full correction record.

**Original seventh-pass framing, unchanged below:** intended by Tzuriel as the FINAL contract consolidation before his Human-Gate decision on PR #166. It is an architecture/contract synthesis — it does not re-research and it does not implement. It closes decisions already reached by: `MASTER_CLASSIFICATION_V3` (schema profile, persistence mapping, final decision pack), the **Legacy → Research DNA Crosswalk**, the **Research DNA v1 Proof-of-Model** (20 real cases, readiness decision: *architecturally ready*), **Methods Expansion Phase 1**, **Hebrew Identity Phase 2**, **Numeric Language Phase 1–5**, the **Multilingual Corpus Inventory**, and the live DB rule `gematria_methods_catalog` (Zuriel, decided 2026-08-21). Companions: `CORPUS_APPROVAL_LIFECYCLE.md`, `METHOD_LIFECYCLE_ALIGNMENT.md`, and the new `RESEARCH_DNA_V1_FINAL_CONTRACT_COVERAGE.md` checklist.

**§4 correction, 22.8 (fifth pass):** the fourth pass's §4 ("Legacy Access Preservation + Premium Depth Law") used wording Tzuriel judged too rigid (*"an approved method's raw computed value is never Premium"*, *"Premium controls depth and tooling — not truth"*). §4 below **replaces** that section in full with: a new Legacy Baseline Law (§4.1), an explicit Additive Enrichment Law separating Classification/Provenance-Generation/Approval/Access as four orthogonal axes (§4.3), a corrected World Access Law (§4.4), a corrected Method Access Law (§4.6), a corrected Premium Law slogan (§4.7), and a Future Management View requirement (§4.11). §2's dimension table gained an explicit **Approval** dimension and a **Baseline/Enrichment Provenance** sub-field of Provenance. §1–§7 are unchanged in substance from the fourth/fifth pass — see the inline "added 22.8" markers for exactly what is new there.

**§8–§25, added 22.8 (this, seventh pass — FINAL CONTRACT CONSOLIDATION):** brings in every architecture decision reached *after* the fifth pass, per Tzuriel's own verbatim instruction: a formal **Unified Gematria Method Law** (§8, grounding the already-live `gematria_methods_catalog` DB rule as the method registry SSOT), the **Technical Identity ≠ Display Label** principle (§9), **Full Method Profile** for approved words (§10) and its **Method Profile Contract** (§11), **Method Versioning** (§12), **Method Families** (§13), explicit **status-only** documentation of the specific candidate methods Zuriel named — איק בכר, אחס בטע, משולש מילה, משולש מילה הפוך (§14), the **Atomic ≠ Composite** law (§15), **Method Baseline** provenance (§16), a restated **no-25-method-target** reminder (§17, cross-reference only), the **Multi-Method Cross** contract requirement (§18), **Method Consensus/Convergence** (§19), bringing the already-completed **Numeric Language** research into the durable contract (§20–§22), a **Bidim/`gematria_words`** cross-reference confirmation (§23), an extended **Future Human-Gate/Admin** and **Future Management View** requirement (§24), and a **Canonical Rule/Codex candidacy recommendation** (§25) — Human-Gate required before any of it becomes a live DB rule.

**Explicitly NOT performed by this contract, in any pass including this one:** persistence of the 32 rows, aliases, method activation, composite implementation, Numeric Language implementation, schema changes, application build, deploy, merge. **0 DB writes** except the single closing `work_log` memo.

---

## 1. CLAIM / CALCULATION / VERIFICATION CONTRACT

### Why this section exists — the 32-row finding, restated as the governing precedent

The Final Persistence Decision Pack re-ran the live canonical engine (`fn_ragil`) against all 32 rows the prior v3 pass had labeled `method_claim_status='engine_verified'`: **31/32 mismatched**, and **`gematria_words.is_verified=FALSE` for all 32/32**, live, no exceptions. The label `engine_verified` was assigned by the CSV-build pipeline's own text-pattern recognition (spotting a `"<subject> <value> <method-name>"` shape in raw text), **not by a genuine, isolated re-run of the engine.** This is the exact trap this contract closes: **a general label like `engine_verified` must never be used again unless the specific method/engine run and its result are persisted alongside it.**

### The mandatory field separation

Every claim about a phrase's gematria value — anywhere in the system, present or future — must carry these fields as **separate, never-merged** facts:

| Field | What it records | Who/what sets it |
|---|---|---|
| `claimed_expression` | The exact text the claim is about (e.g. the isolated subject, not the whole messy raw phrase it was embedded in) | Whoever/whatever extracted the claim — human or parser |
| `claimed_method` | Which method name was claimed (e.g. "רגיל", "ר\"ת", or `null` if unstated) | Same |
| `claimed_value` | The number the claim asserts | Same |
| `source`/`provenance` | Where this claim came from — contributor, import batch, post, WhatsApp thread | Intake |
| `engine_method_tested` | Which method the live engine was **actually run** with, to check this claim (may differ from `claimed_method` — e.g. testing the *standard* definition of a candidate method) | The verifying pass, disclosed explicitly |
| `engine_result` | The number the live engine produced for `claimed_expression` under `engine_method_tested`, run **fresh, right now** — never a cached/stored value assumed still correct | Live engine call only, per `gematria_engine_law` |
| `verification_state` | The relationship between `claimed_value` and `engine_result` (see below) | Derived mechanically from the above two, never asserted independently |

### `verification_state` — minimum required vocabulary

- **`match`** — `engine_result == claimed_value` for the tested method, run fresh, on the isolated expression. (This is what the 1-of-6 ר"ת hit and the 337/590/genuine-match rows in this session's work actually demonstrate — a real, disclosed match, not a label.)
- **`mismatch`** — the engine was run and produced a different number. This is **not** a rejection of the row — it routes to Human-Gate for review (per `CORPUS_APPROVAL_LIFECYCLE.md` §2), exactly as the 31/32 mismatched rows do.
- **`method_unknown`** — no `claimed_method` was stated, or the stated method is not a registered/testable method (e.g. it names a `candidate` method with no confirmed definition yet — per `METHOD_LIFECYCLE_ALIGNMENT.md`, the engine cannot be run at all until a definition exists).
- **`not_tested`** — a claim exists but no engine run has been performed against it yet (the honest default state for anything not yet reviewed — this is what the 764 remaining `method_mention_type` rows should carry, not `engine_verified` and not `unresolved_mismatch` conflated together).

**Hard rule, stated once for reuse everywhere:** a label of `engine_verified=true` (or `verification_state='match'`) is only ever written when `engine_method_tested` and `engine_result` are persisted alongside it, from a fresh run against the row **as it actually sits today** — never inferred from an import-pipeline heuristic, never carried forward from a stale prior computation, and never applied to a whole messy phrase when only a substring was actually tested. **Claim ≠ Fact.** This is the same discipline `gematria_engine_law` and `verified_value_is_system_data` already establish for ordinary gematria display — this section extends it explicitly to *claim verification*, where the 32-row incident showed it was not yet being honored.

### 1.1 NEGATIVE RESULTS PRESERVATION LAW — new, added 22.8 (seventh pass)

**A `mismatch` (or `no_fit`) verification result is itself research evidence, not a failed row to discard.** This is not a new principle invented here — it is the explicit, literal behavior already demonstrated by `METHODS_EXPANSION_PHASE_1` (ר"ת's standard reading tested against 6 rows: 1/6 fit, explicitly disclosed and *kept*, not deleted; ס"ת's standard reading: 1/13, likewise kept) and by the 31/32 mismatched rows from the Final Persistence Decision Pack, which route to Human-Gate rather than being dropped (`CORPUS_APPROVAL_LIFECYCLE.md` §2). This pass makes the rule explicit and general, for every future claim/method/transform verification, anywhere in the system:

- **A `tested → mismatch` (or `tested → no_fit`) result is never deleted.** It is a disclosed, negative finding — proof that a specific hypothesis was actually checked and did not hold, which is strictly more valuable than silence (`not_tested`).
- **A claim/method/transform that has already been tested and decided `mismatch`/`no_fit` is not silently re-tested again** without a new reason to do so (a new candidate definition, new corpus evidence, an explicit Zuriel instruction) — re-running an already-decided negative result without cause wastes effort and risks a future pass "discovering" the same non-fit as if it were new, exactly the kind of duplicate-reconstruction `method_lifecycle`'s own provenance requirement (`discovered_vs_reproduced`, keyed claim+value tracking) already guards against.
- **Where this lives:** the same `research_objects.engine_detail` jsonb convention as §1's `verification_state` — a `mismatch`/`no_fit` value is a first-class, permanent state, not a placeholder pending deletion. No new table or column is required.

### Where this lives (no new table)

`research_objects.engine_verified` (boolean, already live) + `research_objects.engine_detail` (jsonb, already live) already have exactly the shape needed — `engine_detail` can hold `{claimed_expression, claimed_method, claimed_value, engine_method_tested, engine_result, verification_state}` as sibling keys, precisely as the Proof-of-Model's Case 8/9/10 already demonstrated (*"claimed vs. computed vs. delta... jsonb's existing sibling-key capacity"*). **No new column, no new table.**

---

## 2. RESEARCH DNA v1 — THE CONTRACT

**Research DNA v1 is a projection/contract over existing structures. It is not a table, not a parallel corpus, not a new engine.** This is the explicit, re-confirmed conclusion of the Research DNA Proof-of-Model (Part 6, "Readiness Decision"): all 20 stress-test cases — spanning public/private/WhatsApp/attribution/method/multi-method/numeric-word/year/multi-theme/messianic-package/multilingual/landmark content — passed without requiring a new table, tree, or taxonomy.

### The eleven dimensions and their live home

| Dimension | Home | Status |
|---|---|---|
| **Identity** | `gematria_words.id` + `phrase` (unchanged), optional `node_id` when promoted | LIVE, unchanged |
| **Provenance** | `source` (100% populated, ACTIVE) + `vip_source` (sparse but ACTIVE-when-present) + `research_objects.contributor`/`owner_person_id` for claim-level provenance. **Sub-field, added 22.8:** Baseline/Enrichment Provenance — row-level via `created_at` against a fixed baseline-cutoff (sufficient today); field-level (a fact added onto an already-existing row) is `IMPLEMENTATION DECISION REQUIRED`, per §4.1 | LIVE, reused; baseline/enrichment sub-field partially open (§4.1) |
| **Verification** | `research_objects.engine_verified`/`engine_detail`, per the Claim/Calculation/Verification Contract (§1 above) | Contract now closed; implementation not started |
| **Approval** (new dimension, added 22.8) | `research_objects.status` transition off `candidate` / `research_contributions.research_state` reaching `canonical` — Human-Gate only, per `CORPUS_APPROVAL_LIFECYCLE.md` §1 and `METHOD_LIFECYCLE_ALIGNMENT.md` §1. Explicitly a **separate axis from Verification** (engine-tested ≠ Human-Gate-approved) and from Access (§4.4–§4.7) | LIVE mechanism, reused — not a new table |
| **Semantic** (worlds/themes) | `gematria_words.world` (5 values, live world-source — see §2.2) + edge-to-`nodes type='theme'` for future N-many tags | LIVE for the single-axis case; N-axis is a future, non-blocking scope decision |
| **Research** (packages/clusters) | The proven `topic_cards → nodes type='convergence'` promotion pipeline (204 approved, count-consistent) | LIVE pipeline, reused — not duplicated |
| **Method** | `research_objects.engine_detail` (mention/claim/engine-result/historical-claim/candidate-framing as sibling jsonb keys) + `gematria_methods` once a method is `canonical` | Per `METHOD_LIFECYCLE_ALIGNMENT.md` |
| **Numeric** (Numeric Language) | A generation/parsing **transform-slot** inside the same `engine_detail` convention — see §2.3 | Design confirmed by Zuriel's own recorded constraint; not built |
| **Temporal** | Edges to existing `nodes type='year'` (12)/`type='event'` (120) — never a new timeline table | LIVE mechanism, data-completeness gap only |
| **Access** | Reconcile the **three** already-live tier signals (`visibility_tier`, `space`, `nodes.metadata.tier`) — reconciliation itself explicitly **not** resolved here (Crosswalk Open-Question #3, still open). **Governing law, added 22.8:** whichever mechanism the reconciliation lands on, per-item tier assignment follows §4.4/§4.6 (World Access Law, Method Access Law) and §4.7 (Premium Law) — access is never inherited automatically from a world/method's legacy tier, and Premium never governs mathematical truth or canonical status | OPEN (reconciliation) / LAW SET (assignment principles, §4) — carried forward |
| **Quality** | `dna_status` (real, well-shaped, code-confirmed currently unread by app code) — reviving it as a read signal is a cheap future option, not decided here | OPEN — recommendation only |
| **Interpretation** | Extend the existing `tags` `כיוון:*` direction-lens pattern (already renders live on `EntityPage.jsx`) — never a new claim/inference field | LIVE precedent, reused |

**Central rule carried through every dimension:** Claim≠Fact, Parsed≠Verified, HOT≠TRUE — Verification and Interpretation are always separate axes from Identity and Semantic, exactly as `research_objects.engine_verified` vs. `research_objects.statement` already separates them today.

### 2.1 `corpus_role` and `dna_status` stay separate dimensions

Confirmed non-collapsing by the Final Persistence Decision Pack §3, reused not re-derived: `dna_status='promoted'` (7,274 rows) maps to three different `corpus_role` values. **Research DNA v1 renders both as two independently-labeled facets on the same record — never merged, never one overwriting the other, never a UI that lets a viewer mistake one for the other.** This is not a new rule; it is the same "no flattening" principle already governing `world` vs. `category` vs. `dna_status` throughout the Crosswalk.

### 2.2 Worlds — `gematria_words.world` stays the live source; `world_theme` (v3) is archive-only

- **`gematria_words.world`** (5 real values, 1,341 populated rows, driven by the live admin "World Tagger" tool) **remains the sole live world-taxonomy source.** Nothing in v3 or this contract replaces or improves on it.
- **`world_theme`** (the v3 CSV column) is **0/15,433 populated** — a placeholder that was never filled during the pass that produced it. **Archive-only. Not a competing source. Not to be resurrected as a write target** until/unless a future, separate pass decides otherwise.
- The richer, separate `nodes.metadata.world` (44 values) vs. `gematria_words.world` (5 values) reconciliation remains **open** (Crosswalk Open-Question #2) — not decided or touched by this contract.

### 2.3 Numeric Language — a transform/slot inside DNA, not a parallel number system

Per Zuriel's own already-recorded constraint (the "Gate #1" memo the Proof-of-Model built on): NUMERIC-DNA needs a **generation-slot** — an engine-callable transform (number→word-form, word→number) — living in the same `method`/`engine_detail` jsonb convention already used for every other cross-domain transform, **not a fixed text column and not a second numbers table.**

Numeric Language Phase 5 (already completed, this session) found this is currently a **real but partial** capability: NUMBER→WORDS generation (Phases 1–4) is reliable; WORDS→NUMBER parsing is only 46.7% coverage on the 570-row corpus sample, and the Phase 5 Final Decision was explicitly **NOT YET** ready for a full bidirectional model. **This contract does not change that verdict.** It confirms only the *architectural slot* Numeric Language will occupy once/if a future pass revisits readiness: `engine_detail={method:'number_to_word'|'word_to_number', direction, form, lang}` — a value in the existing convention, never a competing structure. The flagship finding worth carrying forward (75/148/776 reproducing independently from raw corpus text, Numeric Language Phase 5 §6) stays exactly where that report left it — a strong, disclosed signal, not yet promoted to canonical fact.

### 2.4 Multilingual identity — lang-tagged identity, not a parallel corpus

Per the same Zuriel constraint: IDENTITY-DNA must be **lang-tagged** (`{phrase, lang}`, not bare `phrase`), aligned with `content_translation_law`'s 8-language set (he·en·ar·es·fr·ru·pt·de). The live precedent is `word_aliases` (FK'd to `gematria_words.id`, `alias`+`lang` columns, full admin console, auto-populated by `wa-process`) — confirmed by the Multilingual Corpus Inventory (§6 of that report) as sufficient for the actual multilingual material found (47 real findings across 25 sources), **with one disclosed gap**: the phonetic/sound-pattern layer (ד/ס/ט/ר-root clusters, 12 findings, "explicitly distinguished from gematria by its own author") has **no structured-table representation today** — not in `word_aliases` (no `phonetic_root` field), not in `language_bridge` (`relationship_type` doesn't cover it). **This contract does not resolve that gap** — it is named here as a real, disclosed OPEN item for a future Human-Gate decision (possibly an enum extension on `language_bridge.relationship_type`, per the Multilingual Corpus Inventory's own suggestion), not built or decided now. **A new word/name entering the system in any language goes through the same intake as any `gematria_words` row, then acquires `word_aliases` rows per language variant — never a second corpus per language.**

### 2.5 One concrete build item this contract confirms (not started)

The Proof-of-Model's Part 4 identified exactly one genuine missing capability across all 20 stress-tested cases: a `--targets-->` edge-type/relation-vocabulary entry, distinct from `--computed_value_of-->`/`--relates_to-->`, needed to represent a phrase *pointing at* a landmark number (e.g. the 5 `landmark_target_flag` rows naming 1820/1237) rather than *computing to* it. **Confirmed live this pass: `edges.relation_type`'s current 29-value vocabulary has no `targets` entry.** This remains **`NEEDS_HUMAN_DEFINITION`** — the Final Persistence Decision Pack §5 already found the plausible reading (a prior AI's interpretation of Case 15) is not yet Zuriel-confirmed. **Not created by this contract.**

---

## 3. PRESERVE & EXPAND LAW

**Research DNA, Corpus Persistence, Worlds, and the Cross Engine extend the existing number-page experience. They do not replace or shrink it.**

- Every capability the number page (`EntityPage.jsx`) already has today stays exactly as it is — nothing in this contract removes a field, a section, or a display behavior.
- New depth is exposed only through **ranking, facets, modes, and progressive disclosure** — never by hiding or deleting existing content to fit a new taxonomy. This is a direct, literal restatement of the site's own `Rank, Don't Hide` principle (`command_center_law`), extended here explicitly to cover corpus/DNA/worlds/cross content specifically, not only Command Center discoveries.
- **No "cleanup" of existing content is ever performed just to make it fit a new classification.** A row that doesn't cleanly match a new taxonomy value is disclosed as unclassified/ambiguous (exactly as `world_theme`'s emptiness and `corpus_role`'s non-collapse with `dna_status` were disclosed, not silently forced) — never deleted or edited to comply.
- **The principle, stated for the Roadmap:** more control for the researcher/reader, never more visual or cognitive load by default. Depth is opt-in (a mode, a facet, an expand) — the default view a reader sees today does not change because Research DNA exists underneath it.

This is not a new law invented for this contract — it is the direct extension of `unified_graph_law`'s "מציירים פעם אחת, מפנים מכל מקום" and `command_center_law`'s `Rank, Don't Hide`, applied specifically to the corpus/DNA/worlds/cross surfaces this contract governs. Recorded in the Roadmap edit (§7 below) as a named, citable principle for every future pass touching these surfaces.

---

## 4. LEGACY BASELINE · ADDITIVE ACCESS · PREMIUM DEPTH LAW

**§4 corrected/replaced in full, 22.8 — fifth and final pass in this chain.** Tzuriel's 22.8 instruction explicitly names the prior §4 wording ("*an approved method's raw computed value is never Premium*", "*Premium controls depth and tooling — not truth*") as **too rigid** and orders it replaced, not appended to. This section is the sole authority on legacy-baseline/access/premium wording in this contract; nothing in the version this replaces should be quoted or relied on going forward. It remains a direct corollary of §3 (Preserve & Expand Law) — **access-tier and provenance scope, not content scope.**

### 4.1 LEGACY BASELINE LAW — knowing what "today" is, before enrichment starts

Before Research DNA v1 enriches anything, the system must be able to identify **the baseline** — the state of the live system *right now*: which worlds exist, which methods exist, which number-page capabilities exist, which DNA/convergence capabilities exist, which content/data is already available, and which access levels already apply to each. This is not a proposal to copy the whole system into a new table — it is a requirement that **provenance/metadata be sufficient to later answer, for any item: was this here at baseline, or did it arrive after?**

**Live-schema check performed this pass (verification, not new research):** `gematria_words` and `research_contributions` carry both `created_at` and `updated_at`; `research_objects`, `edges`, and `nodes` carry `created_at` only, no `updated_at`. None of the five tables (`gematria_words`, `research_objects`, `research_contributions`, `edges`, `nodes`) carries a dedicated `is_baseline`/`baseline_cutoff`/`import_batch`/`generation` field. This gives two different levels of answer:
- **Row-level baseline/enrichment (whole new rows):** sufficient today. A row's own `created_at` (compared against a single fixed baseline-cutoff date, e.g. this PR's merge date) already tells you whether that row is legacy or newly-added — no schema change needed to answer "is this whole `gematria_words` row / `edges` row / `nodes` row baseline or enrichment."
- **Field-level baseline/enrichment (new facts added onto an *existing*, already-baseline row — e.g. a pre-existing word in a pre-existing world gaining a new DNA-dimension fact, a new tier tag, or a new method result via `research_objects.engine_detail`'s jsonb):** **`IMPLEMENTATION DECISION REQUIRED`.** `research_objects`/`edges`/`nodes` have no `updated_at` at all, so a fact silently added to an existing row's jsonb or an existing node's metadata leaves no live trace of *when* it was added or that it postdates the row's own `created_at`. This contract does not invent a fix (no new column, no audit table) — it names the gap so a future build pass makes the call deliberately (options might include: an `updated_at` column where missing, an append-only provenance/audit row per enrichment event, or a documented convention that jsonb enrichment always carries its own `{added_at}` sibling key inside `engine_detail`/`metadata` — **not decided here**).

### 4.2 PRESERVE & EXPAND — cross-reference, not restated

§3 above already governs this fully: every capability/world/method/DNA-surface/convergence/number-page capability available at baseline stays available; Research DNA is an enrichment layer, never a `Replace → Simplify → Lose` redesign. §4 builds on §3 without repeating it — read §3 for the content-preservation rule; §4 below is the **access**-preservation rule that sits on top of it.

### 4.3 ADDITIVE ENRICHMENT LAW — the central correction of this pass

**A new addition to an existing world/method/surface does not automatically become part of that surface's legacy baseline just because it lands inside a container that already existed.** Concrete example: if World X exists today with 300 items, and Research DNA later adds 200 more items into the same World X, the system must be able to tell the 300 baseline items apart from the 200 later-enrichment items — even though all 500 now share the same `world` value.

This requires holding **four axes as genuinely separate, never-merged concepts** — none of them implies another:

| Axis | Question it answers | Lives on |
|---|---|---|
| **Classification** | Which world/category/method/facet does this belong to? | `gematria_words.world`, `edges`/`nodes type='theme'`, `gematria_methods` (per §2 dimension table) |
| **Provenance-Generation** | Where did it come from, when did it enter, is it legacy-baseline or a later enrichment? | `source`/`vip_source`/`created_at` today; field-level enrichment provenance is the §4.1 `IMPLEMENTATION DECISION REQUIRED` gap |
| **Approval** | What stage of Human-Gate has it cleared — candidate / engine-tested / Human-Gate-reviewed / approved? | `research_objects.status`, `research_contributions.research_state`, per `CORPUS_APPROVAL_LIFECYCLE.md` §1 and `METHOD_LIFECYCLE_ALIGNMENT.md` §1 |
| **Access** | Who is allowed to see/use it, at what tier? | `visibility_tier`/`space`/`nodes.metadata.tier` (three-way reconciliation still open, §6 item 1) — governed going forward by §4.4–§4.7 below |

Classification, Provenance-Generation, Approval and Access are **orthogonal**. A row's world-membership never decides its access tier; its baseline/enrichment status never decides its approval stage; its approval stage never decides its access tier. Each is set independently, by the mechanism that actually governs it.

### 4.4 WORLD ACCESS LAW

Existing worlds are preserved (§4.2). But **membership in an existing world does not automatically inherit that world's legacy access level.** Content newly added, in the future, to an already-existing world can receive its own access tier by a fresh Human-Gate decision, independent of what tier the rest of the world carries.

**Worked example (Kabbalah, per Tzuriel's instruction):** the Kabbalah world exists today; everything already in it keeps its baseline access level, unchanged. If Research DNA later discovers 500 new relationships inside the Kabbalah world, the fact that they classify as "Kabbalah" does **not** obligate all 500 to be Free just because pre-existing Kabbalah content is Free. Tzuriel decides — Free / Premium / Research / Private / any other tier already live in the model. **This contract does not invent a new tier** — it only names that the decision is per-addition, not inherited from the container.

### 4.5 NEW WORLDS / FACETS

Worlds/facets that are genuinely new — born from Research DNA itself (emotional families, semantic families, identity families, multilingual relationships, temporal/research facets, or any other future-approved world) — may be assigned an access tier from the moment Human-Gate approves them. A brand-new world is not automatically Premium and not automatically Free by virtue of being new — **Tzuriel decides**, per-world, at creation.

### 4.6 METHOD ACCESS LAW — the corrected wording (replaces "an approved method's raw computed value is never Premium")

That prior sentence was too rigid; it conflated mathematical correctness with access. The corrected law separates them:

- **Mathematical Truth (invariant):** the same approved method, run through the one canonical engine, always returns the same result, regardless of the viewer's access tier. **Premium never changes the mathematics.** This part of the old wording was right and is kept.
- **Method Access (tier-assignable):** methods already visible at baseline keep their existing baseline access level — no retroactive lockout. But **a method newly approved in the future can be assigned its own access tier by Human-Gate**, and its *results' exposure* can follow that tier — the old blanket claim that a method's raw value is "never Premium" is exactly what this section retracts.

**What Premium can govern**, once a method exists in the engine: exposure of newly-approved methods' results, additional method results beyond a free baseline set, multi-method exploration, method comparison matrices, consensus views, advanced filtering, the Cross Engine (`WS-CROSS-ENGINE`), graph-path traversal, advanced provenance detail, and Raziel-driven research.

**Two governing one-liners, stated for reuse:** **Access tier ≠ mathematical truth.** And: **Method Approved ≠ Free automatically.**

### 4.7 PREMIUM LAW — corrected slogan

The prior one-sentence rule — *"Premium controls depth and tooling — not truth"* — is replaced with the more precise:

> **Premium controls access, depth and tooling — never mathematical truth or canonical status.**

Meaning: Premium can decide *what a user can see and explore* (access to a world/method/facet, depth of tooling, breadth of exploration). Premium can never decide *whether a calculation is correct, whether a source is genuine, whether a claim has been verified, or whether something is canonical* — those are exclusively engine / evidence / governance / Human-Gate questions (§1, §4.9, §4.10 below), untouched by tier.

### 4.8 Composition with `platform_tiers_law`

§4.4–§4.7 govern how Research DNA-born and newly-classified content **slots into** the existing 6-tier access model (`platform_tiers_law`, CLAUDE.md) — they do not replace it, add a tier, or renumber it. `platform_tiers_law`'s tier ladder (guest → registered → temple-student → temple-son → temple-researcher → temple-partner) and its existing gate order (tier≥4 → ELS, tier≥3 → hint upload, tier≥2 → journeys) stay exactly as documented; nothing here is in conflict with it. Every "Human-Gate assigns a tier" decision above assigns one of the tiers already defined there — never an invented one.

### 4.9 CORPUS APPROVAL stays separate — cross-reference only

Unchanged, not re-litigated: `Engine Verified ≠ Corpus Approved`, `Trusted ≠ Canonical`, the six-stage SOURCE→ENGINE-CALC→VERIFICATION→RESEARCH→HUMAN-GATE→APPROVED lifecycle — all per `CORPUS_APPROVAL_LIFECYCLE.md`, untouched by this pass. §4.3's "Approval" axis points here.

### 4.10 METHOD LIFECYCLE stays separate — cross-reference only

Unchanged, not re-litigated: `discovered → candidate → definition/reconstruction tested → engine reproducible → Human-Gate (Zuriel) → approved/active`, per `METHOD_LIFECYCLE_ALIGNMENT.md`, untouched by this pass. **Verification ≠ Approval ≠ Access remain three separate axes** — a method can be engine-reproducible (verification) without yet being Human-Gate-approved (approval), and once approved, its access tier (§4.6) is a further, separate decision — never bundled into the same step.

### 4.11 FUTURE MANAGEMENT VIEW — requirement only, nothing built

A future (not this PR) admin view should let Tzuriel see, per world/method/corpus-addition/DNA-enrichment, a breakdown such as: *World: Kabbalah / Baseline content: X / Added since baseline: Y / Legacy Free: X / New Free: Y / Premium enrichment: Z / Candidate pending Human-Gate: N.* The goal is that it is always answerable: what did we have, what did we add, who approved it, where did it come from, and what access level does it carry. **This is a requirement statement only — no dashboard, no UI, no query is built in PR #166.** It depends on the §4.1 baseline/enrichment provenance decision being made first.

**Not yet decided by this section (left open, same as §5/§6 below):** the exact tier cutline for each specific future facet/mode (e.g. is Graph-Path traversal tier 3 or tier 4?) — that is a per-feature Human-Gate call when each surface is actually built, not something this contract pre-assigns. Nor does this section resolve the three-way `visibility_tier`/`space`/`nodes.metadata.tier` reconciliation (§6, item 1) — Access-axis assignment per §4.3 above composes with whichever mechanism that future reconciliation lands on.

---

## 5. NUMBER PAGE / ENTITY HUB COMPATIBILITY — documented only, nothing built

- **The existing number page remains the experiential base.** Research DNA v1 is designed to *feed* it (additional facts becoming available to render), never to replace its layout, its existing sections, or its current read path.
- **Future-possible, not scoped or built here:** exposing **modes** (Reader / Research / DNA / Cross) and **facets** (by world / method / verification-state / source / researcher) as optional lenses over the same entity. This is explicitly named as a future direction per this task's instruction, with no screen map, no component, and no redesign performed in this pass — consistent with `research_workspace_law`'s own hard rule (*"מפה-קודם, מסך-קודם, לא-בונים-מאחור"*) and `command_center_law`'s identical execution-order rule.
- No `EntityPage.jsx` code was read, modified, or redesigned as part of producing this contract.
- **Added 22.8, per §4:** the number page's future modes/facets must be able to carry the same four orthogonal axes as everything else in this contract — classification, provenance-generation (baseline vs. enrichment), approval, access — so that "more information + more depth + more control, without more default load" (this section's own principle) can eventually distinguish, per fact shown, whether it was here at baseline or added later, and at what access tier. This is a compatibility note for a future design pass, not a build performed here.

---

## 6. WHAT THIS CONTRACT LEAVES EXPLICITLY OPEN

Carried forward, not decided, not newly opened by this pass:

0. **Field-level baseline/enrichment provenance for facts added onto an already-existing row** (`research_objects`/`edges`/`nodes` have no `updated_at`; no `is_baseline`/`batch`/`generation` field anywhere) — `IMPLEMENTATION DECISION REQUIRED`, named in §4.1, added 22.8. Not a schema change performed by this contract — a decision left for the future build pass.
1. **Three-way tier reconciliation** (`visibility_tier` / `space` / `nodes.metadata.tier`) — Crosswalk Open-Question #3, still open.
2. **44 vs. 5 world-vocabulary reconciliation** (`nodes.metadata.world` vs. `gematria_words.world`) — Crosswalk Open-Question #2, still open.
3. **`landmark_target_flag` meaning / `targets` edge-type** — `NEEDS_HUMAN_DEFINITION`, per §2.5 above.
4. **The phonetic/sound-pattern multilingual layer's structured home** — disclosed gap, per §2.4 above, no mechanism proposed.
5. **Whether to finally wire `dna_status` into app code as an active QUALITY-DNA read signal** — real, well-shaped, currently unread; a recommendation, not a decision, in the Crosswalk.
6. **N-many arbitrary theme-edges per record** (beyond the current 2-axis world+category) — architecturally available, not the active write-path; a scope/UI decision for later.
7. **Method Versioning** (§12, added 22.8 seventh pass) — no confirmed definition/version-history mechanism exists for `gematria_methods` rows; `IMPLEMENTATION DECISION REQUIRED`, same disposition as item 0 above, generalized from content-rows to methods.
8. **Method Baseline provenance** (§16, added 22.8 seventh pass) — whether `gematria_methods` carries the same row-level `created_at`-against-cutoff answerability that `gematria_words`/`edges`/`nodes` do (item 0) is unconfirmed (no schema inspection performed this pass); `IMPLEMENTATION DECISION REQUIRED`.

None of these block Research DNA v1's readiness as a *contract* — the Proof-of-Model already confirmed all 20 stress-tested cases pass without needing any of the above resolved first. They are named here so no future pass mistakes silence for resolution.

---

## 7. SCHEMA VERDICT

**NOT YET — same verdict as every prior pass in this chain, reconfirmed, not re-litigated.** Every dimension of Research DNA v1, every stage of the Corpus Approval Lifecycle, and every stage of the Method Lifecycle maps onto a structure that already exists (`gematria_words`, `research_objects`, `research_contributions`, `word_aliases`, `edges`/`nodes`, `gematria_methods`). The one concrete future build item (a `targets` edge-type vocabulary value) is a controlled-vocabulary addition, not a schema change, and is itself gated behind a Zuriel definition that has not yet been given.

**Added 22.8, fifth pass — one open item, verdict unchanged:** §4.1/§6 item 0 (field-level baseline/enrichment provenance — no `updated_at` on `research_objects`/`edges`/`nodes`, no `is_baseline`/`batch`/`generation` field anywhere) is `IMPLEMENTATION DECISION REQUIRED`, not `SCHEMA CHANGE REQUIRED NOW`. Row-level baseline/enrichment already works today via `created_at` against a fixed cutoff — no schema change needed for that. Whether field-level enrichment eventually needs a new column, an append-only audit row, or a documented jsonb convention is a decision for the future build pass, not this contract. The verdict stays **NOT YET**.

**Added 22.8, seventh/FINAL pass — two more open items, verdict still unchanged:** §12 (Method Versioning) and §16 (Method Baseline) are the method-registry-layer analogs of the same gap, both `IMPLEMENTATION DECISION REQUIRED`, both explicitly **not** schema changes performed by this contract. Every dimension of Research DNA v1, every stage of both lifecycles (Corpus Approval, Method), and every new §8–§25 principle this pass adds (Unified Method Law, Full Method Profile, Method Profile Contract, Method Families, Atomic/Composite, Numeric Language Transform Contract) maps onto structures that already exist or are explicitly named as future `IMPLEMENTATION DECISION REQUIRED` gaps — none of them requires schema **now**. **The verdict, reconfirmed a third time in this chain: NOT YET.**

---

# PART II — GEMATRIA METHODS · NUMERIC LANGUAGE · CROSS · PREMIUM (§8–§25, added 22.8, seventh/FINAL pass)

**Everything below is contract text, not build.** It closes the architecture decisions Tzuriel reached after the fifth pass, so that Methods Build implementation can start from PR #166 alone, without depending on this chat. It grounds itself in the already-live DB rule `gematria_methods_catalog` (Zuriel, decided 2026-08-21, re-read live this pass) wherever that rule already states the same thing — cross-referenced, not restated with different wording, per this pass's own governing instruction (§0: "search result ≠ SSOT... don't re-litigate").

## 8. UNIFIED GEMATRIA METHOD LAW — new, named explicitly

**One engine · one registry · one source of truth for methods.** This is not a new invention — it is the formal naming of what `gematria_methods_catalog` (live DB rule, §1: *"מקור-האמת לשיטות הוא public.gematria_methods... אין לקבע בחוק מספר קבוע של שיטות"*) already establishes. This section states it as a standing law for every future pass and every future agent touching methods:

- **`public.gematria_methods` is the intended real SSOT registry for methods** — not a CSV, not a hardcoded array in a JS/SQL file, not a second "candidate methods" table. A future goal (not performed by this contract) is to end the current situation where a new/candidate method can be informally referenced in multiple lists/engines without a single registry entry governing all of them.
- **Definition of Done for a method, future state:** `Method Definition → Deterministic Engine Function → Registry Entry (`gematria_methods`) → Tests (real-sample match-rate, per `method_lifecycle` §2 discipline) → Human-Gate (Zuriel) → Active`. Only once `active=true` and `function` is wired does a method become available to: Research DNA (as a normal METHOD-dimension fact, §2 above), the approved-word auto-calc profile (§10 below), the number page, the Cross Engine (§18 below), and Raziel/Deep Research — on the same terms as every other already-active method, per `METHOD_LIFECYCLE_ALIGNMENT.md` §4 (cross-referenced here). **Method-count note, corrected 22.8 (ZURIEL Human-Gate decision):** `gematria_methods` is the count SSOT; there is no single fixed canonical method-count — any count cited must be qualified by capability/state (registered/active/dispatchable/stored/displayed), never a bare historical number. See `CANONICAL_RULES_RECONCILIATION.md`'s resolved Conflict #1.
- **No parallel registry, no parallel engine.** This is the same discipline `METHOD_LIFECYCLE_ALIGNMENT.md` §1 already states ("No parallel registry, no separate 'candidate methods' table is created anywhere in this alignment") — §8 here elevates it from an implementation detail of that document to a named, standalone law so future passes cite it directly without having to re-derive it from the lifecycle document.

## 9. METHOD DISPLAY NAME — Technical Identity ≠ Display Label (new, named explicitly)

`gematria_methods_catalog` §2 already decided this precisely: the internal method קדמי/`kadmi`/`kadmi_calc` is shown to users as **"משולש"** (קדמי גדול → משולש גדול). This section names the general principle behind that specific decision, for reuse on every future method:

> **Technical identity ≠ Display label.** A method's `method_key`, DB column names, SQL function names, registry keys, and historical provenance/discovery record **never change** to match a friendlier UI word. The UI label is a presentation-layer fact only. `gematria_methods_catalog` §7 already states this for קדמי specifically ("אין לשנות שמות פנימיים/עמודות/פונקציות כדי להתאים לשפת-הפרונט") — §9 here generalizes it as a standing rule for every future display-name decision, so it does not need to be re-litigated method-by-method.

## 10. FULL METHOD PROFILE FOR APPROVED WORDS

Once a word/phrase is `corpus_approved` (per `CORPUS_APPROVAL_LIFECYCLE.md` Stage 6), it should be able to expose a **Full Method Profile** — a computed value under every approved/active/dispatchable method, not only the methods that happen to have a dedicated `gematria_words` column today. This is a natural extension of the already-live `gw_enforce_engine` trigger behavior (`gematria_auto_registry_law`: *"הטריגר gw_enforce_engine מחשב את כל השיטות אוטומטית"*) and `gematria_methods_catalog` §4 (*"כל מילה/ביטוי... יחושבו אוטומטית בכל השיטות הקנוניות... יישמרו/יוקרנו כך שהמערכת תקרא את הערכים במקום לחשב מחדש"*) — §10 states explicitly that **no requirement exists that every method be its own physical `gematria_words` column** for this to work; a method's result can be dispatched/computed on demand from the registry-driven engine and cached/projected as convenient, not necessarily stored as a dedicated column per method.

**This introduces a second, narrower four-way split — distinct from §4.3's Classification/Provenance-Generation/Approval/Access axes, which govern content/enrichment provenance.** §10's split governs the lifecycle of one computed *method result*, a different layer entirely:

| Concern | Question it answers |
|---|---|
| **Dispatchable** | Can the engine compute this method for this expression right now, given a registered, active, wired function? |
| **Auto-calculated** | Is this method actually run automatically (e.g. on every new approved word, per `gw_enforce_engine`/§4-style triggers) rather than only on manual request? |
| **Stored-Cached** | Is the computed result persisted (a `gematria_words` column, a cache row, `research_objects.engine_detail`) so surfaces read it instead of recomputing? |
| **Displayed** | Is the result actually shown on a given surface (number page, calculator, DNA panel) — a presentation decision, independent of whether it was computed/stored? |
| **Access** | Which tier can see this method's result on this surface — a `gematria_methods_catalog` §3 access-layer decision (public/premium/deep_research), the same Access axis §4.6/§4.7 already govern for methods generally |

**Calculation ≠ Storage ≠ Display ≠ Access — stated once, for reuse.** None of the four implies another: a method can be Dispatchable and Auto-calculated without being Stored (recomputed on read); Stored without being Displayed everywhere (available for DNA/Cross even if hidden on the plain number page); Displayed to one tier and not another (Access); and none of this changes the Mathematical Truth invariant already locked by §4.6.

## 11. METHOD PROFILE CONTRACT

A method result, wherever it is consumed (Number Page, Cross Engine, Raziel, Deep Research), must be able to return **at least** the following fields — no new table required, the same `research_objects.engine_detail`/`gematria_methods` convention already used throughout this contract:

| Field | What it records |
|---|---|
| Method identity/key | The registry `method_key` (e.g. `kadmi`) — the technical identity, never the display label (§9) |
| Display label | The UI-facing name (e.g. "משולש") — presentation only |
| Family/category | Optional grouping (§13) — metadata, not a formula fork |
| Lifecycle state | Where the method sits in `method_lifecycle`'s own vocabulary (`known → reconstructed → candidate → verified → canonical`) |
| Computed value | The engine's fresh result for the given expression |
| Verification source | Which engine run/pass produced this value, per §1's Claim/Calculation/Verification field set |
| Definition/version provenance | Which method definition/version computed this result (§12) |
| Stored vs. derived | Whether this value is cached/persisted or computed on demand (§10) |
| Access state/tier | Public / Premium / Deep Research, per `gematria_methods_catalog` §3 and §4.6/§4.7 |
| Atomic vs. composite | Whether this is an independent formula or a Composite Research Operator over other methods' outputs (§15) |

**No independent method list per surface.** Number Page, Cross Engine, Raziel, and Deep Research all consume the same Method Profile shape — this is the direct method-layer analog of Research DNA's own "one projection, many lenses" principle (§2's opening line) and of `unified_graph_law`'s "מציירים פעם אחת, מפנים מכל מקום."

## 12. METHOD VERSIONING — new

Every method definition needs a **provenance/version concept**, so that if a formula is later corrected or redefined, the system can still say which definition/version produced a historical result. This mirrors, at the method layer, exactly the same gap §4.1 already named at the world/content layer (field-level baseline/enrichment provenance) — and inherits the same disposition: **`IMPLEMENTATION DECISION REQUIRED`.** No migration, no new column, no versioning table is invented by this contract. `gematria_methods` today has no visible version/definition-history column (not verified schema-live this pass, since no schema inspection was performed — this is a documented gap, not a confirmed absence). A future build pass should decide, deliberately, among options such as: a `definition_version` column on `gematria_methods`, an append-only `method_definition_history` table, or a documented convention that a method's `engine_detail`/registry metadata always carries a `{defined_at, definition_hash}` sibling key. **Not decided here.**

## 13. METHOD FAMILIES — new

Research DNA must be able to **group methods into research families as metadata/research organization, without changing their technical identifiers.** Example, directly per Tzuriel's instruction: a "משולש" family could group משולש (קדמי) / משולש מילה / משולש מילה הפוך under their approved definitions, once/if the latter two clear Human-Gate (§14). Family membership:

- Is a labeling/grouping fact layered over the registry (e.g. a `family` tag on a `gematria_methods` row, or an edge in the graph), never a formula change.
- Does not imply shared access tier, shared lifecycle state, or shared verification status — each family member's Method Profile (§11) fields are still independent per §10's four-way split.
- Is the method-layer counterpart of §2's `Semantic (worlds/themes)` dimension — grouping without merging, exactly as `world` vs. `category` never collapse (§2.1).

## 14. SPECIFIC METHODS — status only, from prior research, not new investigation

Per Tzuriel's explicit instruction: document current status and readiness for the next Methods Build. **Nothing below is activated, tested afresh, or promoted by this contract.**

| Method | Current status | Evidence this pass reused (not re-derived) |
|---|---|---|
| **ר"ת (רת)** | `candidate` — unchanged | `METHODS_EXPANSION_PHASE_1`: standard reading (first letter of each word, run through all 13 live methods) explains 1/6 testable rows (id `18207155`→337, via רגיל/גדול) but explicitly **fails** the strongest anchor cluster (644, "צמח דוד"/"צמח דויד", 6 occurrences, spelling-invariant). Not elevated. Cross-ref `METHOD_LIFECYCLE_ALIGNMENT.md` §3. |
| **ס"ת (סת)** | `candidate` — unchanged | Same source: standard reading explains 1/13 testable rows (590, "יהוה יפיל את בראק חוסיין אובאמה"). Positive evidence the recurring claimed value 1335 is a Scripture citation (Daniel 12:12), not a computed value. Weaker than ר"ת. Not elevated. |
| **רגיל ישר והפוך** | **`discovered/unresolved`, reclassified 22.8** (was mislabeled `candidate`; corrected per ZURIEL's Human-Gate decision — see `METHOD_LIFECYCLE_ALIGNMENT.md` §1/§3) | Zero worked examples exist anywhere in the corpus (3 bare category-tag mentions only) — per `method_lifecycle`'s own rule ("לא-שוחזר → עצור → אדם"), no reconstruction was attempted, and no defined deterministic formula exists to test. Same status class as איק בכר/אחס בטע below, not a step ahead of them. Cannot advance without Zuriel supplying a worked example or explicit definition. |
| **איק בכר (איק בכ"ר)** | `discovered`/`known` — **not yet a tested candidate** | Named as a future-approved-to-expand candidate in the live `gematria_methods_catalog` §5 (`future_method_candidates`). In the raw corpus (`METHOD_MENTIONS_CLASSIFIED.csv`/`METHOD_CLAIMS_PHASE3.csv`, era1-method-mentions), the label appears **5 times**, but every occurrence was classified `lexical_use`/`research_instruction`/`not_a_method_claim` or folded into a ס"ת candidate row's source text (`72c33f16...`) — **no row exists where "איק בכר" was itself run as its own tested hypothesis** in `METHODS_EXPANSION_PHASE_1`, which explicitly scoped itself to only ר"ת/ס"ת/רגיל-ישר-והפוך. **Readiness for next Methods Build: needs a reconstruction attempt first** (definition-testing stage), exactly like ר"ת/ס"ת were tested — not ready for Human-Gate yet, no algorithm has been proposed or tested against real rows. |
| **אחס בטע (אח"ס בט"ע)** | `discovered`/`known` — **not yet a tested candidate** | Same live-rule candidacy (`gematria_methods_catalog` §5). Appears **1 time** in the corpus (`91f90c74...`, "644 זרע לוט-אחרי - 1118 -אחס בטע"), classified `lexical_use`/`not_a_method_claim` — a single occurrence, no recurring anchor, no worked definition. **Readiness: not testable yet** (parallel to `רגיל ישר והפוך`'s status — one occurrence is too thin to reconstruct without guessing, which `method_lifecycle`/§3/§5 forbid). Needs Zuriel to supply a worked example or definition before any reconstruction attempt is possible. |
| **משולש מילה** | `candidate`/pre-registry, prior-mapped | Named in the live `gematria_methods_catalog` §5 `future_method_candidates` and §13 above (family grouping). Per Tzuriel's instruction: he wants it wired into the approved-word auto-calc profile (§10) in the next Methods Build, **contingent on confirming its existing definition is unambiguous and deterministic** — that confirmation step is not performed by this contract (no engine/schema touched). |
| **משולש מילה הפוך** | `candidate`/pre-registry, prior-mapped | Same status and same condition as משולש מילה — Zuriel's instruction pairs them (§15's composite list also names their combination). Confirmation of an unambiguous, deterministic existing definition is the next Methods Build's first task for this pair, not performed here. |

**Net for Methods Build #1 (see final chat answer, §30), corrected 22.8:** ר"ת/ס"ת are disciplined dead-ends at `candidate` (a defined formula was tested and under-performed) unless Zuriel supplies new provenance — not blocking work. רגיל-ישר-והפוך/איק-בכר/אחס-בטע are all `discovered/unresolved` (no defined formula exists yet for any of the three) and need a first reconstruction attempt before they can even become a testable `candidate`. משולש מילה / משולש מילה הפוך are the closest to ready — they need only a **definition-confirmation** pass (deterministic? unambiguous?) before Human-Gate, not a from-scratch reconstruction.

## 15. ATOMIC ≠ COMPOSITE

Restated here as **contract text**, independent of and prior to any separate implementation pass (including the concurrently-running, not-yet-reviewed Methods Unification build — this section is what that build should conform to, not the reverse):

- **Atomic methods** are independent formulas, each computed directly from a phrase's letters: רגיל, מילוי, מסתתר, משולש (=קדמי), משולש מילה, משולש מילה הפוך (once each clears Human-Gate), and the rest of the registry's already-active methods. **Corrected 22.8 (ZURIEL Human-Gate decision):** no fixed count ("13") is cited here — see the Method-count note in §8 above.
- **Composite Research Methods/Transforms** compose the *canonical outputs* of atomic methods — they are not independent mathematical implementations and require no new DB column per combination. Per Tzuriel's instruction and the live `gematria_methods_catalog` §6 (`composite_research_operators`, currently listing רגיל+מילוי / רגיל+מסתתר / רגיל+משולש), the target composite set is:
  - רגיל+מילוי
  - רגיל+מסתתר
  - רגיל+משולש
  - **משולש מילה+משולש מילה הפוך** — new to this pass; not yet in the live DB rule's `composite_research_operators` list. Recommended for addition to that rule after Human-Gate (§25 below), not written by this contract.
- **Composite methods:** use the canonical, already-computed outputs of their atomic components (never re-derive the math independently), preserve each component's own provenance (so a composite result can always be traced back to which atomic values produced it), and can be assigned a **separate** access tier from their components (§4.6's "Method Approved ≠ Free automatically" applies to composites too — a composite's tier is its own Human-Gate decision, not inherited from its atomic parts). Composites target Research DNA (as a METHOD-dimension fact, §2), the Cross Engine (§18), and Deep Research — not the plain baseline number-page display by default.
- **No new atomic math is invented by treating a composite as a "new method"** — this is the same distinction `gematria_methods_catalog` §6 and `METHOD_LIFECYCLE_ALIGNMENT.md` §4 already draw for the acronym-extraction-composed-with-canonical-method pattern found in Methods Expansion Phase 1's §6 collision check.

## 16. METHOD BASELINE — new

Like Worlds (§4.1), **Methods need baseline/enrichment provenance too** — the future ability to know which methods existed at baseline (a specific, dated snapshot from `gematria_methods` — not a fixed number cited from memory, per ZURIEL's 22.8 method-count correction, §8 above) vs. which were added later, alongside each method's lifecycle state, approval, access tier, and definition/version (§12). This is not a new problem distinct from §4.1 — it is the **same gap, generalized from content-rows to method-registry-rows**: `gematria_methods` was not schema-inspected for a `created_at`/version-history column in this pass, so whether row-level baseline/enrichment already works for methods the way it does for `gematria_words` rows (§4.1) is itself unconfirmed. **`IMPLEMENTATION DECISION REQUIRED`** — no schema created by this contract. A future pass should explicitly check `gematria_methods`'s actual columns before deciding whether this needs a new field or already has one.

## 17. NO ARTIFICIAL 25-METHOD TARGET — cross-reference only, not re-litigated

Confirmed already stated in this chain (prior passes, `gematria_methods_catalog` §1's own "אין לקבע בחוק מספר קבוע של שיטות"): **~25 is a product/research target, not a truth-dictating count.** No method is invented to reach it; no genuine method is discarded to stay under it. Nothing new to add here — named so the Coverage Matrix (§29 of the task, `RESEARCH_DNA_V1_FINAL_CONTRACT_COVERAGE.md`) has an explicit anchor point.

## 18. MULTI-METHOD CROSS — contract requirement only, no build

**The future Cross Engine (`WS-CROSS-ENGINE`) must be able to use the same Method Profile (§11) to search across *different* methods, not only `A.ragil = B.ragil`.** Concretely, the contract requires the eventual engine to support queries of the shape:

- `A.method_X = B.method_Y` for any two registered methods X, Y (e.g. `A.ragil = B.milui`, `A.triangle = B.mistater`)
- `composite_of(A) = other_method_of(B)` (a Composite Research Method's result on A matching an atomic or composite method's result on B)

**This is a contract requirement for a future build, not performed in PR #166.** It composes directly with §4.6/§4.7 (Access) — a multi-method cross query's *results* can be tiered, but the underlying Method Profile shape (§11) that makes the query possible must already treat every method uniformly, atomic or composite, exactly as §10/§11 specify. `RESEARCH_DNA_V1_FOUNDATION_CONTRACT.md` §2's own dimension table (`Access`) and §5 (Number Page compatibility) already name `WS-CROSS-ENGINE` as a future consumer of the same Research DNA projection — §18 makes the *method-crossing* requirement explicit within that.

## 19. METHOD CONSENSUS / CONVERGENCE — new

Research DNA must be able to **recognize when the same number or relationship appears through several independent methods** — e.g. two different methods on two different phrases both landing on 776, or a composite and an atomic method independently agreeing on a value. This is a **research signal**, exactly the same epistemic category as the Numeric Language Phase 5 "flagship finding" (§20 below) — it may, in the future, influence ranking or research-relevance surfacing (per `command_center_law`'s `Rank, Don't Hide`), but:

> **Convergence ≠ Fact.** Multiple independent methods landing on the same value is evidence worth surfacing, never proof of a canonical relationship. It routes through the same Claim/Calculation/Verification discipline (§1) and Approval axis (§4.3) as any other finding — it does not bypass Human-Gate, and it is not itself a `verification_state='match'` event.

No new table is required — a convergence is a *derived, computed observation* over already-stored Method Profile results (§11), not a stored fact in its own right, exactly as `dna_status`/`corpus_role` stay derived-and-displayed rather than merged (§2.1).

## 20. NUMERIC LANGUAGE — bringing the completed research into the contract

§2.3 above already named Numeric Language's architectural slot (a `method`/`engine_detail`-shaped transform, not a parallel numbers table) and confirmed Phase 5's verdict (**NOT YET** ready for a full bidirectional model, 46.7% words→number coverage). §20 makes explicit, as durable contract text, the specific finding Tzuriel's instruction calls out:

> **Research DNA must support deterministic Number → Language representations, including digit-to-word representation** — the canonical example, reproduced independently from raw corpus text (not only generated): **776 → "שבע שבע שש"** (digit-read form). Per `NUMERIC_LANGUAGE_STRONG_NUMBERS_METHOD_SHEET.md` (era2-strong-numbers) and `NUMBER_LANGUAGE_BIDIRECTIONAL_REPORT.md` §6/§8 (era2-numeric-language-phase5): this exact digit-sequence appears in the raw corpus (row id 64, `NUMBER_WORDS_RECONCILED.csv`) as a byte-identical match to the system's own Phase-1-generated digit-read form for 776 — one of only two rows in the entire 570-row corpus sample independently reproducing the "75/148/776 triangle" the Phase 2–3 *generation* direction had already established (75→776, 148→776, both via רגיל on their cardinal-word forms, both `↔GRAPH-DIRECT` confirmed). This is the single strongest piece of evidence in the whole 5-phase Numeric Language arc that the representation reflects something latent in the corpus, not only a generator artifact — still disclosed as "a striking coincidence-of-independent-discovery, not yet a statistically established pattern" (Phase 5's own words), not elevated further by this contract.

- **The original number stays the numeric identity.** A generated/parsed language representation is a **derived representation of** that number — never a competing identity.
- **Number ≠ Generated Language Representation.** 776 and "שבע שבע שש" are not interchangeable identities; the representation is a fact *about* 776, layered on top of it, exactly as `word_aliases` layers language variants on top of `gematria_words.id` (§2.4) rather than forking identity.
- **A generated representation does not automatically become an approved `gematria_words` entry.** It stays in the Numeric Language transform layer (§21 below) until/unless a separate, explicit Human-Gate decision promotes it into the approved corpus — the same Stage 5/6 discipline as any other claim (`CORPUS_APPROVAL_LIFECYCLE.md` §1).
- **No parallel numeric/language corpus.** Everything above composes with the existing `gematria_words`/`research_objects`/`word_aliases` structures per §2.3/§2.4 — nothing new is created by this section.

## 21. NUMERIC LANGUAGE TRANSFORM CONTRACT

Every approved Numeric Language transform must be able to store/return **at least**:

| Field | What it records |
|---|---|
| Input number | The originating numeric identity |
| Transform type | e.g. `digit_read`, `cardinal_wording`, `number_to_word`, `word_to_number` (per Phase 1–5's own `parse_type` vocabulary: `digit_sequence`, `cardinal_number`, `year_expression`, `mixed_numeric_phrase`) |
| Generated representation | The resulting Hebrew (or, per `content_translation_law`, future-multilingual) text |
| Language | Per the 8-language canonical set (he·en·ar·es·fr·ru·pt·de), `content_translation_law` |
| Transform definition/version | Which generator/parser version produced this — the Numeric Language analog of §12's Method Versioning, same `IMPLEMENTATION DECISION REQUIRED` disposition until a future pass decides the mechanism |
| Provenance | Which pass/engine run produced it, per §1's field-set discipline |
| Deterministic/reproducible state | Whether the same input reliably reproduces the same representation — Phase 1–4's NUMBER→WORDS generation direction is confirmed reliable; WORDS→NUMBER parsing is confirmed only 46.7% reliable (Phase 5) |

**Reuse the already-researched rules — do not reinvent.** The Numeric Language artifacts already establish these transform rules across `era2-numeric-language-phase1` through `phase5` (anchor generation, cross-anchor network, full anchor validation, representative sample validation, words→numbers reconciliation) and `era2-strong-numbers` (the 13-method × cardinal/digit-read sheet for the 11 seed numbers + 24 additional TOP20/hub/fan-out numbers). **Undecided transforms route to Human-Gate**, exactly like any other candidate claim — no transform is auto-promoted to canonical.

## 22. NUMBER → LANGUAGE → METHOD → NUMBER — contract requirement only, no build

A derived language representation must be **passable through approved gematria methods** in a future pipeline: `NUMBER → LANGUAGE REPRESENTATION → METHOD → RESULT NUMBER`, then fed into cross/convergence search (§18/§19) from there. Conceptual example, grounded in already-completed research (not invented): **776 → "שבע שבע שש" → רגיל → 1344** (per `NUMERIC_LANGUAGE_STRONG_NUMBERS_METHOD_SHEET.md`'s own live-engine table for 776's digit-read form — רגיל=1344, גדול=1344, משולש גדול=5036, etc., all 13 methods already computed and disclosed in that sheet). **This is a Research DNA/Cross contract requirement for a future pass — the engine that runs this pipeline automatically is not built in PR #166.** It composes §11 (Method Profile, consuming a Numeric Language representation exactly as it would consume any other expression), §18 (Multi-Method Cross), and §19 (Consensus) without requiring any new primitive beyond what those sections already define.

## 23. BIDIM / `GEMATRIA_WORDS` — cross-reference, confirmed, not re-litigated

Already established in this chain (per a prior pass's §12, re-confirmed live this pass): **`gematria_words` is the canonical/wide word storage; `bidim` is the long/reverse index for search by method+value.** They are not merged. The forward-looking requirement this contract adds no new text to (already covered): a future Methods Build must align `bidim`'s reverse index generation with the `gematria_methods` registry (§8) rather than a hardcoded method list, so that a newly-approved method automatically gains reverse-index coverage without a bespoke code change. **`gematria_words.all_values` is a derived convenience representation, not a Method SSOT** — the SSOT for what methods exist and how they compute is exclusively `gematria_methods` (§8), and `all_values` is downstream of it, never the other way around.

## 24. FUTURE HUMAN-GATE / ADMIN — document only, no UI, extending §4.11

**Two concrete future Human-Gate flow examples** (documentation only, per Tzuriel's instruction — no admin screen built):

1. **Method path:** Method "אחס בטע" → Candidate (a worked definition is proposed, per §14's current `discovered` status) → Definition verified (deterministic, letter-value-based, per `method_lifecycle`'s reconstruction-permission rule) → Test vectors passed (a real-sample match-rate, not one coincidental hit, per `METHOD_LIFECYCLE_ALIGNMENT.md` §2's discipline) → Engine reproducible → Suggested access tier (§4.6) → **[Human Gate — Zuriel]** → active/canonical, entering `gematria_methods` (§8).
2. **Expression path:** Expression X → source/researcher identified (Stage 1, `CORPUS_APPROVAL_LIFECYCLE.md`) → method calculations run fresh (Stage 2) → verification checked (Stage 3, §1's field set) → candidate (Stage 4, research/provenance attached) → **[Approve to corpus — Zuriel]** → Stage 6, approved corpus.

**Extending §4.11's Future Management View to explicitly cover Methods and Corpus, not only Worlds** (§4.11 already specifies the World breakdown; this section adds the other two legs of the same future view, same "requirement only, nothing built" status):

- **Methods breakdown:** *Method: משולש מילה / Baseline: no (not yet approved) / Lifecycle state: candidate / Free-exposure: TBD / Premium-exposure: TBD / Pending Human-Gate: yes.* Per method, the same shape §4.11 already specifies per world.
- **Corpus breakdown:** *Existing rows: N / New submissions: N / Engine-tested: N / Pending Human-Gate: N / Approved: N* — the same six-stage `CORPUS_APPROVAL_LIFECYCLE.md` funnel, rendered as counts.
- Both depend on the same §4.1/§16 baseline-provenance decisions being made first, exactly as §4.11 already notes for the World breakdown — **not built, not scheduled, requirement only.**

## 25. CANONICAL RULE / CODEX CANDIDACY — recommendation only, no DB rule written

**No `nodes type='rule'` row and no `project_codex` entry is written by this pass.** Per Tzuriel's explicit instruction, this section returns a recommendation of which principles above are strong candidates to become live DB rules/codex entries **after Human-Gate** — locking any of them remains Zuriel's decision, not this contract's:

| Principle | Candidacy | Why |
|---|---|---|
| **Unified Gematria Method Law (§8)** | **Strong candidate** | Names, as a standing law, what `gematria_methods_catalog` §1 already half-states — worth its own citable `rule_id` so future passes don't have to re-derive "one registry" from a longer catalog rule. |
| **Engine Verified ≠ Corpus Approved (`CORPUS_APPROVAL_LIFECYCLE.md` §2)** | **Strong candidate** | Already phrased as a hard, quotable rule; grounded in a real, disclosed incident (31/32 mismatch); exactly the shape of SOD1820's other locked one-liner rules (`verified_value_is_system_data`, `gematria_engine_law`). |
| **Atomic ≠ Composite (§15)** | **Candidate, after the composite set is confirmed** | Conceptually ready, but recommend waiting for Human-Gate confirmation of the exact composite list (including the new משולש מילה+משולש מילה הפוך pairing) before locking wording, so the rule doesn't need a version bump immediately after creation. |
| **Calculation ≠ Storage ≠ Display ≠ Access (§10)** | **Candidate** | A genuinely new, reusable four-way separation not previously named anywhere in the DB rules; useful the moment Methods Build #1 starts touching auto-calc/caching decisions. |
| **Number ≠ Language Representation (§20)** | **Candidate, lower priority** | Correct and useful, but Numeric Language itself is still `NOT YET` per Phase 5's own verdict — recommend locking this rule only once/if a future pass revisits Numeric Language readiness, to avoid a codex entry that outlives its own generating research's open status. |

**Human-Gate required before locking any of the above as a live rule** — this table is a recommendation for Tzuriel's review, not a proposal awaiting silent approval.

---

# PART III — NUMBER COVERAGE & DEEP CORPUS RESEARCH (§26–§29, added 22.8, tenth pass)

**Everything below is contract text, not build — same discipline as Part II.** This Part closes two things Tzuriel sent together: (1) his Human-Gate decisions on the Methods Unification implementation pass's 11-item pack (A–K), now recorded verbatim in `audits/gematria_methods_unification/GEMATRIA_METHODS_HUMAN_GATE.csv`, including two new laws he named explicitly under Decision K (§26 below); and (2) a new, freestanding Number Coverage / Deep Corpus Research law suite extending the Number Page/Cross/Access architecture Part I/II already established (§27 below). **No live rule written. No `gematria_methods` row changed. No migration applied. `gw_enforce_engine`/`bidim_sync` untouched — Decision K's registry-driven direction is approved architecturally but explicitly deferred to Methods Build.**

## 26. METHOD STORAGE LAW & DEEP CROSS LAW — the two laws named in Decision K

Per Tzuriel's explicit instruction under Human-Gate Decision K (`GEMATRIA_METHODS_HUMAN_GATE.csv`, decision_id=K): *"Add the two approved laws to the contract."* Both are elevated here from a Human-Gate decision note to standing contract text, grounded in — not replacing — §10's existing split.

### 26.1 METHOD STORAGE LAW

> **Existing method columns are Legacy Baseline. New methods do not automatically create columns. Full Method Profile can grow independently of `gematria_words` width.**

This is the direct contract-text form of Decision J's resolution (`GEMATRIA_METHODS_HUMAN_GATE.csv` J, verbatim): *"Preserve the existing 14 method columns as Legacy Baseline. New approved methods do not automatically receive physical columns. משולש מילה / משולש מילה הפוך must still be capable of automatic calculation, Full Method Profile, searchable/indexable representation, Deep Cross and Research Trace without requiring new `gematria_words` columns."* Concretely: the 14 existing stored columns (`ragil, misratar, miluy, kadmi, gadol, siduri, atbash, albam, miluy_demiluy, kadmi_gadol, ribua, ribua_gadol, hakpala, hakpala_gadol`) are **Legacy Baseline storage** — preserved exactly as-is (§3 Preserve & Expand Law), never removed, never treated as the ceiling of what the system can research. משולש מילה / משולש מילה הפוך (Human-Gate Decision D, approved) and every future approved method reach dispatch, Full Method Profile (§10/§11), Deep Cross (§26.2 below) and Research Trace **without** requiring `gematria_words` to grow a physical column for each of them. **Storage location must never limit research capability** — Decision J's own governing sentence, restated here as a standing law rather than a one-off resolution note.

### 26.2 DEEP CROSS LAW

> **Every approved method may participate in Reverse Lookup / Multi-Method Cross / Consensus / Research DNA / Numeric Language / Composite Research regardless of physical storage representation. Large-scale Cross methods must have an appropriate searchable/indexable representation.**

This is the direct contract-text form of Decision K's second named law. It composes with, and does not re-open, §18 (Multi-Method Cross) and §19 (Method Consensus/Convergence) above: those sections already require the Cross Engine to treat every registered method uniformly via the Method Profile (§11); §26.2 adds the explicit corollary that **participation in Cross is never gated on whether a method happens to have a dedicated `gematria_words` column** — a dispatch-on-demand method (§10's "Dispatchable" concern) is exactly as eligible for Deep Cross as a stored one, *provided* it has "an appropriate searchable/indexable representation" for the scale at which it is being queried. That qualifier is deliberate: a method computed fresh per-request is fine for a single-word lookup; a method used as one side of a large reverse-index Cross query (e.g. "find every phrase where `X`'s Method-Y result equals a target value") needs *some* indexable form — which the Method Storage Law (§26.1) confirms does **not** have to be a `gematria_words` column. It could be a cache table, a materialized view, or an extension of `bidim`'s reverse index (§23) keyed off the registry (§8) rather than a hardcoded method list — the exact mechanism is `IMPLEMENTATION DECISION REQUIRED`, not decided here, consistent with §23's own forward-looking note that a future Methods Build should align `bidim`'s generation with `gematria_methods` (§8) so a newly-approved method gains reverse-index coverage automatically.

### 26.3 Reconciling the four-way split (§10) with the five-way split (Decision J)

Decision J's own wording states the principle as a **five**-way split: *"Calculation ≠ Storage ≠ Indexing ≠ Display ≠ Access."* §10 above already established a **four**-way split for one computed method result: **Dispatchable / Auto-calculated / Stored-Cached / Displayed / Access** — which, read carefully, is already five concerns, not four; §10's own prose undercounted its own table by folding "Dispatchable" and "Auto-calculated" together in its one-line summary sentence (*"Calculation ≠ Storage ≠ Display ≠ Access"*) while the table beside it lists five rows. **§26.3 resolves this explicitly, not by contradiction but by precise correspondence:**

| Decision J's term | §10's matching concern |
|---|---|
| **Calculation** | §10's **Dispatchable** (can the engine compute this right now) *and* **Auto-calculated** (is it actually run automatically) — Decision J's "Calculation" collapses these two into one plain-language word; §10's table keeps them separately named because they answer different questions (capability vs. actual trigger behavior) |
| **Storage** | §10's **Stored-Cached** — identical concept, same name in different words |
| **Indexing** | **New, named explicitly by Decision J** — not a separate §10 row, but a refinement *within* Stored-Cached: a value can be stored/cached without being indexed for reverse/Cross lookup (§26.2's "appropriate searchable/indexable representation" qualifier is precisely this distinction). §10 is corrected here, not by adding a sixth axis, but by naming that **Stored-Cached has two sub-states** — stored-for-direct-read vs. stored-and-indexed-for-Cross — going forward. |
| **Display** | §10's **Displayed** — identical |
| **Access** | §10's **Access** — identical |

**The governing one-liner, updated for reuse:** **Calculation ≠ Storage ≠ Indexing ≠ Display ≠ Access** (Decision J's five-word form) is the correct, complete statement going forward — it does not replace §10's table, it **names the sub-distinction between Storage and Indexing that §10's table already implied** (via its own "Stored-Cached" row's parenthetical: *"a `gematria_words` column, a cache row, `research_objects.engine_detail`"* — three different storage shapes, only some of which are indexable at Cross scale) but had not yet named as its own concern. No prior sentence in this contract is contradicted; §10's prose sentence is superseded by Decision J's more precise five-term form, and this §26.3 is the record of that supersession, per the same non-silent-correction discipline `METHOD_LIFECYCLE_ALIGNMENT.md` §1/§7 already modeled for the method-count and lifecycle-order corrections.

## 27. NUMBER COVERAGE & DEEP CORPUS RESEARCH LAW SUITE

Tzuriel's new law suite, restated here as durable contract text, each law cross-referenced to the existing section it extends rather than duplicated.

### 27.1 NUMBER COVERAGE LAW

> Number Page / Number Research Coverage must not be limited to ragil, legacy `gematria_words` columns, or legacy corpus matches. Any approved method result that is appropriately searchable/indexable may contribute to Number Coverage regardless of its physical storage representation. The intended outcome is that numbers with little or no legacy information — including large numbers — can gain meaningful research coverage from approved deep methods, composites, Numeric Language and Cross results.

Extends §5 (Number Page/Entity Hub Compatibility) and §26.1 (Method Storage Law) directly: the number page's *existing* capabilities are preserved exactly as-is (§3/§5), and this law is the corpus-coverage half of the same idea — a number's page is no longer capped by which legacy columns happen to have a row for it. A number with zero legacy `gematria_words` matches can still surface real research content once approved deep methods/composites/Numeric Language/Cross results exist for it, **once those are actually built** (nothing here is built by this contract — see §27.2).

### 27.2 DEEP CORPUS SCAN LAW

> SOD1820 must support a deterministic research pipeline conceptually equivalent to: **APPROVED CORPUS × APPROVED METHODS → METHOD RESULTS → SEARCHABLE/INDEXABLE RESEARCH COVERAGE.** This is not permission to perform the scan during contract closure. It is an architectural requirement for Methods Build / Research DNA implementation.

This is the batch/pipeline-shaped counterpart of §10's per-word Full Method Profile and §26.2's Deep Cross Law — the same "every approved method, every approved word" computation, stated as a systemic requirement rather than a per-record contract. **Not performed by this pass or any prior pass in this chain** — no scan was run, no corpus×method cross-product was materialized.

### 27.3 CORPUS GROWTH LAW

> Newly Human-Gate-approved corpus expressions must be capable of entering the same Full Method Profile / indexing pipeline incrementally, without requiring redesign or a complete manual corpus rescan.

Extends `CORPUS_APPROVAL_LIFECYCLE.md`'s six-stage funnel (Stage 6, Approved Corpus) forward: once a new expression clears Human-Gate, it must be able to join the Deep Corpus Scan Law's (§27.2) pipeline the same way every prior approved expression did — an incremental append, not a full-corpus re-run. This is a design requirement on whatever mechanism eventually implements §27.2, not a new mechanism itself.

### 27.4 COMPOSITE COVERAGE LAW

> Composite Research Transforms do not require `gematria_words` columns. However, composites that materially contribute to Number Coverage / Cross may receive an appropriate searchable/indexable or precomputed representation when justified by query/performance needs.

Directly extends §15 (Atomic ≠ Composite) and §26.1/§26.2: composites (Human-Gate Decision E, approved for existence) stay column-free by default, exactly as `GEMATRIA_METHODS_COMPOSITE_CONTRACT.md` §2 already states (*"It does not get its own `db_column` or SQL calc function"*) — but §27.4 clarifies this is a default, not an absolute prohibition. If a specific composite turns out to be heavily queried at Cross scale, the same §26.2 "appropriate searchable/indexable representation when justified by query/performance needs" applies to it as to any atomic method — a future, evidence-driven decision, not a default assumption.

### 27.5 COMPUTED MATCH ≠ CANONICAL FINDING

> A deterministic method match proves the mathematical result only. **Computed Match ≠ Interpretation ≠ Research Finding ≠ Canonical Finding.** AI/system discovery may surface and rank a match but cannot promote its interpretation to canonical status without the existing Human-Gate.

This is the Number-Coverage-layer restatement of two already-locked chains: §1's `verification_state` vocabulary (a `match` is a mechanical fact about `engine_result == claimed_value`, never itself an interpretation) and `CORPUS_APPROVAL_LIFECYCLE.md` §2's `Engine Verified ≠ Corpus Approved` (the 31/32-mismatch incident that motivated the whole Claim/Calculation/Verification Contract in the first place). §27.5 extends the same discipline explicitly to the *coverage* context this Part III opens up: as Number Coverage grows to include deep methods/composites/Numeric Language results a number never had before, the temptation to treat "the engine found a match" as "this is a real, meaningful finding about this number" grows with it. **The law forecloses that shortcut explicitly** — every one of §27.1's newly-surfaced results is a Computed Match until a human (Zuriel, via Human-Gate) reviews and promotes an interpretation of it, exactly as any other claim in the system.

### 27.6 NUMBER PAGE RANKING LAW

> Increased Research DNA coverage must not turn Number Page into an unranked dump of method results. Preserve the existing Number Page experience and apply: **Rank, Don't Hide.** Core/legacy information remains clear; additional method findings are organized/ranked and deeper layers may be progressively disclosed through Research / Deep Research surfaces.

This is §3's (Preserve & Expand Law) own `Rank, Don't Hide` principle — already stated there as inherited from `command_center_law` — applied specifically to the *consequence* of §27.1's coverage expansion: more coverage is not itself a UI mandate to show more by default. §5's existing "modes and facets" future-direction (Reader / Research / DNA / Cross) is the natural home for the progressive disclosure this law requires — not built here, named as the compatible destination.

### 27.7 NUMBER CONVERGENCE SIGNAL

> Independent methods/paths converging on the same number may increase research relevance/ranking. Convergence is a research signal only: **Convergence ≠ Fact ≠ Canonical Interpretation.**

This is §19 (Method Consensus/Convergence) restated at the Number Coverage layer rather than the Method Profile layer — §19 already established, word for word, *"Convergence ≠ Fact"* and that convergence "may, in the future, influence ranking or research-relevance surfacing... but... does not bypass Human-Gate." §27.7 confirms the identical rule applies once convergence is observed *across numbers* (independent methods/paths landing on the same number), not only across methods on the same expression — no new epistemic category is introduced, the same derived-observation-not-stored-fact treatment (§19's closing paragraph) applies here too.

### 27.8 METHOD VERSION / RECOMPUTATION LAW

> Indexed/precomputed method results must retain enough method-definition/version provenance to determine when results became stale after a method-definition change. Future implementation must support safe recomputation/invalidation without destroying historical provenance.

This is the Numeric-Language-and-general-method analog of §12 (Method Versioning) — §12 already named the identical gap (*"a provenance/version concept, so that if a formula is later corrected or redefined, the system can still say which definition/version produced a historical result"*) and gave it the same disposition this law inherits: **`IMPLEMENTATION DECISION REQUIRED`**, no migration/column/table invented here. §27.8 adds one concrete requirement §12 did not yet spell out: whatever mechanism is eventually chosen must support **recomputation/invalidation** (not just labeling staleness) — so that when a method's definition is corrected (the exact scenario Decision F's אטבח drift represents today, unresolved), previously-indexed results can be safely recomputed **without silently destroying the historical record of what the old definition had produced** (per §1.1's Negative Results Preservation Law — a superseded value is disclosed history, not deleted).

### 27.9 TRACE ≠ SEARCH INDEX

> Rich Research Trace/Structure (e.g. מילוי decomposition, משולש מילה construction, reverse triangle structure) is separate from the minimal searchable/indexable method result. Do not require the reverse index to store the full visualization/trace merely to support Cross.

This is a scope-limiting corollary of §26.2 (Deep Cross Law): the "appropriate searchable/indexable representation" §26.2 requires for Cross participation is deliberately **minimal** — a value (and enough provenance to trace it back, per §11's Method Profile Contract fields) — not the full explanatory/visualization structure a number page or a dossier might render for a human reader (e.g. showing the letter-by-letter מילוי expansion, or the row-by-row משולש מילה triangle construction). Keeping these separate means the reverse-index/Cross layer stays cheap and fast at scale, while the richer Trace layer is computed/rendered only where and when a human is actually looking at it — consistent with §10's own "Stored vs. Displayed are independent" principle, refined further by §26.3's Storage/Indexing split.

### 27.10 DISCOVERY ACCESS ≠ USER DISPLAY ACCESS

> Internal deterministic research availability and user-visible entitlement are separate concerns. Premium/Deep Research gating must not change mathematical results or canonical status, while user-facing exposure must continue to respect the approved access/tier policy.

Extends §4.6 (Method Access Law) and §4.7 (Premium Law) directly: those sections already separate **Mathematical Truth (invariant)** from **Method Access (tier-assignable)** and state that *"Premium controls access, depth and tooling — never mathematical truth or canonical status."* §27.10 names the specific consequence for the internal engine/index layer this Part III concerns: a method/composite/Numeric-Language result can be **internally available** — computed, indexed, feeding Cross/Consensus/Research DNA (§26.2, §27.7) — for a tier or surface the average reader never sees, without that availability by itself deciding what any given user is shown. Discovery/computation happening "in the background" for Research DNA purposes is not the same event as a user's browser rendering it — exactly the same "one projection, many lenses, tier decided per-lens" pattern §2's dimension table and §10's "Displayed" row already establish, now stated as its own named law because Part III's coverage expansion makes the distinction load-bearing in a way it wasn't before (more internally-available data increases the chance of accidentally conflating "the engine can see it" with "the user can see it").

### 27.11 NUMBER PAGE AS RESEARCH HUB

> Research DNA should allow Number Page to evolve additively from a legacy lookup surface into a unified Number Research Hub drawing, where appropriate, from: legacy corpus + approved methods + composites + Cross + Numeric Language + convergence + worlds + research objects/findings + provenance. This is additive. Do not remove or retroactively lock existing Number Page capabilities. The DNA may become deeper while the default UX remains controlled and readable.

This is the summary destination §5, §27.1 and §27.6 already point toward, named explicitly as its own forward-looking law: every dimension this contract has separately established (Research DNA's eleven dimensions, §2; Method Profile, §11; Composite, §15; Numeric Language, §20–§22; Convergence, §19/§27.7) are all, eventually, facets the same one Number Page can additively draw from — never a rebuild, never a parallel "research view" page competing with the existing one. **Nothing in §27 is built by this pass.**

## 28. ACCESS/TIER DECISION FOR D AND E — ZURIEL Human-Gate FINAL, closed

Per Tzuriel's final access decision (Human-Gate, 22.8, eleventh/FINAL pass), this section is now **closed contract text, not a proposal.** It replaces the tenth pass's "orchestrator's reasoned proposal... not a decision" framing in full — both sub-questions that section left open (D's Full Method Profile tier, E's triangle-pair composite tier) are decided below. Also recorded, in shorter form, in `GEMATRIA_METHODS_HUMAN_GATE.csv` rows D and E.

### 28.1 D — משולש מילה / משולש מילה הפוך dispatch/Full-Method-Profile access — DECIDED: public

**Decision: both the calculator/number-drawer display (unchanged from today) and the new Full Method Profile / basic Deep Cross participation stay `public`.** Tzuriel confirmed the orchestrator's own "public" default (§28.1 of the tenth pass) over the conservative "premium" fallback that section had also offered as defensible. Advanced research layers built *on top of* the method — rich Research Trace, structural visualization, multi-method comparison matrices, advanced Cross, convergence analysis, Raziel research assistance, advanced provenance/navigation — remain separately assignable as Premium/Deep Research, per the already-locked access rules (§4.6/§4.7, §26.2, §27.9's Trace≠Search-Index split, §27.10's Discovery-Access≠User-Display-Access split); §4.6's *"Method Approved ≠ Free automatically"* governs those deeper layers specifically and is not reopened by this section's public-access decision for the basic surfaces.

Zuriel's own reasoning, verbatim: *"משולש מילה + משולש מילה הפוך — APPROVED. שמור את היכולת/תוצאה הבסיסית שכבר קיימת ונגישה היום כ-Public / Legacy-preserved access. אין לבצע retroactive lockout של יכולת קיימת. עצם האמת המתמטית אינה משתנה לפי tier. שכבות מחקר מתקדמות מעל השיטות... יכולות להיות Premium/Deep Research בהתאם לחוקי הגישה הקנוניים."* This confirms, rather than supersedes, the tenth pass's own reasoning (§4.1 Legacy Baseline, §4.6 no-retroactive-lockout) — nothing in that reasoning changes; it is simply the answer now, not a lean.

**What this decides, concretely:**
- Calculator/number-drawer display: `public`, unchanged from today (Legacy Baseline, §4.1/§4.4).
- Full Method Profile (§10/§11) / basic Deep Cross / Cross-Engine participation (§26.2) for these two methods specifically: `public`.
- Everything *above* basic participation — Research Trace (§27.9), structural visualization, multi-method matrices, advanced Cross, convergence analysis (§19/§27.7), Raziel research assistance (§6, `RAZIEL_PERSONALIZATION_LAW.md`), advanced provenance/navigation — is **not** decided `public` by this section; each stays its own future, separately-assignable Premium/Deep-Research surface, per the general rule (unchanged) that a method's baseline access does not automatically extend to every deeper tool built on it.

### 28.2 E — the 4 composites' tier — DECIDED: premium, all four, no exceptions

**Decision: all four approved Composite Research Transforms — רגיל+מילוי, רגיל+מסתתר, רגיל+משולש, and משולש מילה+משולש מילה הפוך — default to `premium` display access, uniformly. There is no `deep_research` tier for the triangle-pair composite.** This closes §28.2's one genuinely open sub-question from the tenth pass (whether the triangle pair should move to `premium` alongside its siblings, or stay at the stricter `deep_research`) — Tzuriel resolved it toward `premium`, explicitly rejecting the `deep_research` holdover.

Zuriel's own reasoning, verbatim: *"ארבעת ה-Composite Research Transforms מאושרים: רגיל+מילוי, רגיל+מסתתר, רגיל+משולש, משולש מילה+משולש מילה הפוך. Default access = PREMIUM לכל ארבעת ה-composites. אין סיבה כרגע להחזיק את composite #4 ב-deep_research רק בגלל שה-atomic methods שלו היו בעבר candidate. Deep Research הוא מצב/שכבת מחקר עמוקה ולא רמת אמת מתמטית אחרת."* — i.e. `GEMATRIA_METHODS_COMPOSITE_CONTRACT.md` §6's original rationale for a stricter tier on the triangle-pair composite (its atoms were still `candidate` when that contract was written) no longer applies now that Decision D approves those same atoms — exactly the dependency the tenth pass's own §28.2 had already flagged as the reason to revisit.

Zuriel also closed the standing implementation-location caveat §15/§26 carried throughout this contract: *"Composite חייב להיגזר מה-canonical outputs של ה-atomic methods שלו. אל תקבע client-side JS כמקור מתמטי קנוני ל-composites. Execution location הוא implementation detail."* This reaffirms — not introduces — §15's own existing text (*"use the canonical, already-computed outputs of their atomic components... never re-derive the math independently"*) and Decision E's own wording in `GEMATRIA_METHODS_HUMAN_GATE.csv` (*"Do not canonically bind composite computation to client-side JS... execution location remains an implementation decision"*). **`src/lib/research/compositeMethods.js`'s current `tierHint` values are not updated by this docs-only pass** — its existing `premium`/`deep_research` split predates this final decision and is now stale relative to it (the triangle pair is still coded `deep_research` there); this is flagged here as a concrete follow-up item for Methods Build to reconcile, not silently corrected in the code by this documentation-only pass.

**What this decides, concretely:**
- רגיל+מילוי, רגיל+מסתתר, רגיל+משולש (display): `premium` — unchanged from the tenth pass's proposal, now confirmed.
- משולש מילה+משולש מילה הפוך (display): `premium` — **changed** from the tenth pass's open "premium (revisit) or deep_research (keep as-is)" framing to a closed `premium`.
- All 4 composites, internal Cross/DNA availability: available regardless of display tier, per §27.10 (Discovery Access ≠ User Display Access) — unchanged, was never in question.
- Composite computation's mathematical source of truth: the canonical, already-computed atomic outputs, never client-side JS as an independent source — execution location (server/client) is an implementation detail, not a canonical-truth decision.

### 28.3 Summary table

| Item | Decision | Status |
|---|---|---|
| D — calculator/number-drawer display | `public` | **DECIDED** |
| D — Full Method Profile / basic Deep Cross participation | `public` | **DECIDED** — closes the tenth pass's one open D sub-question |
| D — advanced research layers (Trace/visualization/multi-method matrices/advanced Cross/convergence/Raziel assistance/advanced provenance) | Premium/Deep Research, per-surface, separately assignable | Not itself decided here — governed by existing §4.6/§26.2/§27.9/§27.10, unchanged |
| E — רגיל+מילוי / רגיל+מסתתר / רגיל+משולש (display) | `premium` | **DECIDED**, re-affirms existing `compositeMethods.js` default |
| E — משולש מילה+משולש מילה הפוך (display) | `premium` | **DECIDED** — closes the tenth pass's one open E sub-question; `deep_research` explicitly rejected |
| E — all 4 composites, internal Cross/DNA availability | Available regardless of display tier, per §27.10 | Unchanged, not in question |

**Not decided by this section, and not newly opened by it either:** the exact mechanism/timeline for updating `compositeMethods.js`'s `tierHint` values and any server-side entitlement check to match the table above — that is Methods Build implementation work, flagged, not performed by this docs-only pass.

## 29. WHAT PART III LEAVES OPEN

Carried forward, not decided, not newly opened beyond what is already named above:

1. **F, G, H, I remain HOLD** (`GEMATRIA_METHODS_HUMAN_GATE.csv`) — אטבח's competing definitions (F), אי״ק בכ״ר's and אח״ס בט״ע's missing cipher definitions (G, H), and מילוי גדול's missing worked example (I). None of these block Part III's contract text — §26/§27's laws apply to whichever methods eventually clear Human-Gate, whenever that happens.
2. **§26.2's "appropriate searchable/indexable representation" mechanism** — not chosen here (cache table / materialized view / `bidim` extension / other). `IMPLEMENTATION DECISION REQUIRED`, same disposition as §12/§16/§27.8.
3. **Research Preference & Raziel Personalization** — Tzuriel's third decision in this same message is deliberately **not** folded into Part III; it is its own document, `RAZIEL_PERSONALIZATION_LAW.md`, per the size/distinctness judgment call explained at its own top. Cross-referenced, not restated, here.

**§28's D/E tier questions — RESOLVED, eleventh/FINAL pass:** both sub-questions this list previously carried here (D's Full Method Profile tier, E's triangle-pair composite tier) were closed by Tzuriel's final Human-Gate decision — see §28. No longer an open item; removed from the numbered list above accordingly. The one follow-up this resolution surfaces (`compositeMethods.js`'s `tierHint` values are now stale relative to §28.2's closed decision) is Methods Build implementation work, not a contract-level open question — noted in §28.2, not re-listed here.

## 30. HYBRID ACCESS LAW — Payment-Mechanism Independence (new, 26.8.2026, PR-reconciliation salvage of PR #169)

Per Tzuriel's instruction delivered after this contract's eleventh/FINAL pass closed: SOD1820 supports both subscription-based entitlements and one-time token/credit unlocks through **one unified access-control layer**. Feature truth/status remains independent of payment mechanism.

This unifies two structures that already exist separately, without inventing new schema: `platform_tiers_law`'s 6-tier ladder (guest → registered → hall-student → hall-member → hall-researcher → hall-partner) and the existing Sod Credits price list (CLAUDE.md — ELS search=10 · AI report=25 · cross=5 · AI journey=30). Both are unlock **mechanisms** into the same access surfaces this contract already governs (§4.6/§4.7/§26.2/§27.9/§27.10) — neither changes what §4.6 already locked: *"Method Approved ≠ Free automatically"*, and Mathematical Truth stays tier-invariant regardless of which mechanism (subscription vs. credit) unlocked the view.

**Concrete existing precedent this law names, not invents:** `els_credits_law` already runs a live instance of exactly this principle for one feature — guest gets a small free-taste allowance, registration unlocks more, paid membership unlocks unlimited — subscription and one-time-unlock coexisting for the same capability. `unified_credit_system`'s existing principle ("one currency, burned uniformly across all tools") is the credit-side half; `platform_tiers_law`'s ladder is the subscription-side half. §30 states, for the first time as general architecture, that these two halves are **one** access-control layer, not two competing ones — a feature's entitlement check should accept either path, and a feature's *truth* (its computed value, its canonical status) is not itself gated by either.

**Left explicitly undecided by this section** (per the original instruction): the concrete unified entitlement-check implementation, and per-feature credit/tier equivalence tables (i.e., exactly how many credits equal one tier-month of access, if that mapping is even needed). `IMPLEMENTATION DECISION REQUIRED`, same disposition as §12/§16/§27.8/§29's other flagged gaps — not built by this docs-only pass.

Provenance: PR #169 (`f72d2d26`, opened 22.8.2026, not merged — content salvaged fresh against current contract text in this pass, not raw-merged from the stale branch) + Tzuriel's original instruction (22.8.2026, cited in PR #169's own description).

---

*Governance: docs-only pass. 0 DB writes except the single closing `work_log` memo, which covers this document together with `CORPUS_APPROVAL_LIFECYCLE.md`, `METHOD_LIFECYCLE_ALIGNMENT.md`, `RESEARCH_DNA_V1_FINAL_CONTRACT_COVERAGE.md`, `RAZIEL_PERSONALIZATION_LAW.md`, `GEMATRIA_METHODS_HUMAN_GATE.csv`, and the `SOD1820_MASTER_ROADMAP.md` edit. §4 correction, 22.8: fifth pass in this chain. §8–§25, 22.8: seventh and FINAL pass in this chain. §26–§29 (Part III), 22.8: tenth pass — applies ZURIEL's Human-Gate decisions on the Methods Unification pack and adds the Number Coverage/Deep Corpus Research law suite. §28/§29, 22.8: eleventh and FINAL pass — Tzuriel's final access decision closes both of §28's open D/E sub-questions; §28 is now decided contract text, not a proposal. §30, 26.8: twelfth pass, PR-reconciliation — salvages PR #169's Hybrid Access Law content fresh against current contract text (the stale PR branch itself is not merged). No further contract-consolidation pass on Part I/II or Part III is anticipated beyond this additive §30; nothing in this chain is left pending a Human-Gate round-trip on D/E access.*
