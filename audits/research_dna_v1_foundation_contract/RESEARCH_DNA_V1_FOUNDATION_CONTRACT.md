# SOD1820 — RESEARCH DNA v1 · FOUNDATION CONTRACT
### Architecture/Contract + Roadmap Alignment · actor=CLAUDE · 2026-08-22 · **§4 corrected 22.8 (fifth, final pass)**

**This is the fourth pass in a chain on the same subject; §4 was corrected/replaced by a fifth, final pass the same day.** It is an architecture/contract synthesis — it does not re-research. It closes decisions already reached by: `MASTER_CLASSIFICATION_V3` (schema profile, persistence mapping, final decision pack), the **Legacy → Research DNA Crosswalk**, the **Research DNA v1 Proof-of-Model** (20 real cases, readiness decision: *architecturally ready*), **Methods Expansion Phase 1**, **Hebrew Identity Phase 2**, **Numeric Language Phase 1–5**, and the **Multilingual Corpus Inventory**. Companions: `CORPUS_APPROVAL_LIFECYCLE.md`, `METHOD_LIFECYCLE_ALIGNMENT.md`.

**§4 correction, 22.8 (this pass):** the fourth pass's §4 ("Legacy Access Preservation + Premium Depth Law") used wording Tzuriel judged too rigid (*"an approved method's raw computed value is never Premium"*, *"Premium controls depth and tooling — not truth"*). §4 below **replaces** that section in full with: a new Legacy Baseline Law (§4.1), an explicit Additive Enrichment Law separating Classification/Provenance-Generation/Approval/Access as four orthogonal axes (§4.3), a corrected World Access Law (§4.4), a corrected Method Access Law (§4.6), a corrected Premium Law slogan (§4.7), and a Future Management View requirement (§4.11). §2's dimension table gained an explicit **Approval** dimension and a **Baseline/Enrichment Provenance** sub-field of Provenance. Everything else in this document (§1, §2's other dimensions, §3, §5's original text, §6, §7) is unchanged in substance from the fourth pass — see the inline "added 22.8" markers for exactly what is new.

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

None of these block Research DNA v1's readiness as a *contract* — the Proof-of-Model already confirmed all 20 stress-tested cases pass without needing any of the above resolved first. They are named here so no future pass mistakes silence for resolution.

---

## 7. SCHEMA VERDICT

**NOT YET — same verdict as every prior pass in this chain, reconfirmed, not re-litigated.** Every dimension of Research DNA v1, every stage of the Corpus Approval Lifecycle, and every stage of the Method Lifecycle maps onto a structure that already exists (`gematria_words`, `research_objects`, `research_contributions`, `word_aliases`, `edges`/`nodes`, `gematria_methods`). The one concrete future build item (a `targets` edge-type vocabulary value) is a controlled-vocabulary addition, not a schema change, and is itself gated behind a Zuriel definition that has not yet been given.

**Added 22.8, this pass — one open item, verdict unchanged:** §4.1/§6 item 0 (field-level baseline/enrichment provenance — no `updated_at` on `research_objects`/`edges`/`nodes`, no `is_baseline`/`batch`/`generation` field anywhere) is `IMPLEMENTATION DECISION REQUIRED`, not `SCHEMA CHANGE REQUIRED NOW`. Row-level baseline/enrichment already works today via `created_at` against a fixed cutoff — no schema change needed for that. Whether field-level enrichment eventually needs a new column, an append-only audit row, or a documented jsonb convention is a decision for the future build pass, not this contract. The verdict stays **NOT YET**.

---

*Governance: docs-only pass. 0 DB writes except the single closing `work_log` memo, which covers this document together with `CORPUS_APPROVAL_LIFECYCLE.md`, `METHOD_LIFECYCLE_ALIGNMENT.md`, and the `SOD1820_MASTER_ROADMAP.md` edit. §4 correction pass, 22.8: fifth and final pass in this chain — closes the Foundation/Access/Premium wording question; no further correction pass on this subject is anticipated before Human-Gate.*
