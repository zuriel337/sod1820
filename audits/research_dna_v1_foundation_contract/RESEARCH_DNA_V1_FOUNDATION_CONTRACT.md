# SOD1820 — RESEARCH DNA v1 · FOUNDATION CONTRACT
### Architecture/Contract + Roadmap Alignment · actor=CLAUDE · 2026-08-22

**This is the fourth pass in a chain on the same subject. It is an architecture/contract synthesis — it does not re-research. It closes decisions already reached by:** `MASTER_CLASSIFICATION_V3` (schema profile, persistence mapping, final decision pack), the **Legacy → Research DNA Crosswalk**, the **Research DNA v1 Proof-of-Model** (20 real cases, readiness decision: *architecturally ready*), **Methods Expansion Phase 1**, **Hebrew Identity Phase 2**, **Numeric Language Phase 1–5**, and the **Multilingual Corpus Inventory**. Companions: `CORPUS_APPROVAL_LIFECYCLE.md`, `METHOD_LIFECYCLE_ALIGNMENT.md`.

**Explicitly NOT performed by this contract:** persistence of the 32 rows, aliases, method activation, schema changes, application build. **0 DB writes** except the single closing `work_log` memo.

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

### Where this lives (no new table)

`research_objects.engine_verified` (boolean, already live) + `research_objects.engine_detail` (jsonb, already live) already have exactly the shape needed — `engine_detail` can hold `{claimed_expression, claimed_method, claimed_value, engine_method_tested, engine_result, verification_state}` as sibling keys, precisely as the Proof-of-Model's Case 8/9/10 already demonstrated (*"claimed vs. computed vs. delta... jsonb's existing sibling-key capacity"*). **No new column, no new table.**

---

## 2. RESEARCH DNA v1 — THE CONTRACT

**Research DNA v1 is a projection/contract over existing structures. It is not a table, not a parallel corpus, not a new engine.** This is the explicit, re-confirmed conclusion of the Research DNA Proof-of-Model (Part 6, "Readiness Decision"): all 20 stress-test cases — spanning public/private/WhatsApp/attribution/method/multi-method/numeric-word/year/multi-theme/messianic-package/multilingual/landmark content — passed without requiring a new table, tree, or taxonomy.

### The eleven dimensions and their live home

| Dimension | Home | Status |
|---|---|---|
| **Identity** | `gematria_words.id` + `phrase` (unchanged), optional `node_id` when promoted | LIVE, unchanged |
| **Provenance** | `source` (100% populated, ACTIVE) + `vip_source` (sparse but ACTIVE-when-present) + `research_objects.contributor`/`owner_person_id` for claim-level provenance | LIVE, reused |
| **Verification** | `research_objects.engine_verified`/`engine_detail`, per the Claim/Calculation/Verification Contract (§1 above) | Contract now closed; implementation not started |
| **Semantic** (worlds/themes) | `gematria_words.world` (5 values, live world-source — see §2.2) + edge-to-`nodes type='theme'` for future N-many tags | LIVE for the single-axis case; N-axis is a future, non-blocking scope decision |
| **Research** (packages/clusters) | The proven `topic_cards → nodes type='convergence'` promotion pipeline (204 approved, count-consistent) | LIVE pipeline, reused — not duplicated |
| **Method** | `research_objects.engine_detail` (mention/claim/engine-result/historical-claim/candidate-framing as sibling jsonb keys) + `gematria_methods` once a method is `canonical` | Per `METHOD_LIFECYCLE_ALIGNMENT.md` |
| **Numeric** (Numeric Language) | A generation/parsing **transform-slot** inside the same `engine_detail` convention — see §2.3 | Design confirmed by Zuriel's own recorded constraint; not built |
| **Temporal** | Edges to existing `nodes type='year'` (12)/`type='event'` (120) — never a new timeline table | LIVE mechanism, data-completeness gap only |
| **Access** | Reconcile the **three** already-live tier signals (`visibility_tier`, `space`, `nodes.metadata.tier`) — explicitly **not** resolved here (Crosswalk Open-Question #3, still open) | OPEN — carried forward, not decided by this contract |
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

## 4. NUMBER PAGE / ENTITY HUB COMPATIBILITY — documented only, nothing built

- **The existing number page remains the experiential base.** Research DNA v1 is designed to *feed* it (additional facts becoming available to render), never to replace its layout, its existing sections, or its current read path.
- **Future-possible, not scoped or built here:** exposing **modes** (Reader / Research / DNA / Cross) and **facets** (by world / method / verification-state / source / researcher) as optional lenses over the same entity. This is explicitly named as a future direction per this task's instruction, with no screen map, no component, and no redesign performed in this pass — consistent with `research_workspace_law`'s own hard rule (*"מפה-קודם, מסך-קודם, לא-בונים-מאחור"*) and `command_center_law`'s identical execution-order rule.
- No `EntityPage.jsx` code was read, modified, or redesigned as part of producing this contract.

---

## 5. WHAT THIS CONTRACT LEAVES EXPLICITLY OPEN

Carried forward, not decided, not newly opened by this pass:

1. **Three-way tier reconciliation** (`visibility_tier` / `space` / `nodes.metadata.tier`) — Crosswalk Open-Question #3, still open.
2. **44 vs. 5 world-vocabulary reconciliation** (`nodes.metadata.world` vs. `gematria_words.world`) — Crosswalk Open-Question #2, still open.
3. **`landmark_target_flag` meaning / `targets` edge-type** — `NEEDS_HUMAN_DEFINITION`, per §2.5 above.
4. **The phonetic/sound-pattern multilingual layer's structured home** — disclosed gap, per §2.4 above, no mechanism proposed.
5. **Whether to finally wire `dna_status` into app code as an active QUALITY-DNA read signal** — real, well-shaped, currently unread; a recommendation, not a decision, in the Crosswalk.
6. **N-many arbitrary theme-edges per record** (beyond the current 2-axis world+category) — architecturally available, not the active write-path; a scope/UI decision for later.

None of these block Research DNA v1's readiness as a *contract* — the Proof-of-Model already confirmed all 20 stress-tested cases pass without needing any of the above resolved first. They are named here so no future pass mistakes silence for resolution.

---

## 6. SCHEMA VERDICT

**NOT YET — same verdict as every prior pass in this chain, reconfirmed, not re-litigated.** Every dimension of Research DNA v1, every stage of the Corpus Approval Lifecycle, and every stage of the Method Lifecycle maps onto a structure that already exists (`gematria_words`, `research_objects`, `research_contributions`, `word_aliases`, `edges`/`nodes`, `gematria_methods`). The one concrete future build item (a `targets` edge-type vocabulary value) is a controlled-vocabulary addition, not a schema change, and is itself gated behind a Zuriel definition that has not yet been given.

---

*Governance: docs-only pass. 0 DB writes except the single closing `work_log` memo, which covers this document together with `CORPUS_APPROVAL_LIFECYCLE.md`, `METHOD_LIFECYCLE_ALIGNMENT.md`, and the `SOD1820_MASTER_ROADMAP.md` edit.*
