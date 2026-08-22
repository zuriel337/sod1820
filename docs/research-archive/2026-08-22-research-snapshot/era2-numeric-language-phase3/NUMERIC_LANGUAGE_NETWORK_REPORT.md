# SOD1820 — NUMERIC LANGUAGE · PHASE 3
Full Anchor Validation. READ-ONLY — 0 writes, 0 promotions, 0 new edges, 0 UI. Validates the mechanism across the complete 61-anchor set (no expansion beyond it).

---

## FACT

### 1. Generation

Same verified generator as Phase 1 (`digit_read` + `cardinal_wording`, grammar-checked against 7 known-correct forms including the corpus's own 1820 convention). No new forms. **61 anchors × 2 forms = 122 expressions** — unchanged from Phase 1.

### 2. Full cross-anchor search — already complete from Phase 1/2

Phase 1's original sweep already matched every one of the 122 expressions' 13 live method-values against the **full 61-anchor set** as the target pool (not a subset) — so "the complete directed network for the 61 anchors" was already produced then; Phase 2 extracted it. **No new engine calls were needed or made in Phase 3** — this pass adds broader live-DB evidence-gathering (topic_cards, direct/adjacent graph edges, convergence-nodes) across the *full* 61-anchor set rather than the ~34-number subset Phase 2 had checked, and applies a stricter mechanical filter.

**Result: 26 raw paths, from 17 distinct source anchors, landing on 18 distinct target anchors.** Unchanged from Phase 2 (confirms Phase 2 already had the complete network, not a partial one).

### 3. Mechanical filter (applied before ranking, not after)

**Digit-permutation groups found among all 61 anchors** (same digit multiset, different order — checked across the *entire* 61-anchor set, not just hit-producing sources): `{26,62}`, `{116,611}`, `{123,321}`, `{152,512}`, `{566,665}`, `{1237,2137}` — 6 pairs total. Only when **both** members of a pair are hit-producing sources with the same generation type does this create a mechanical duplicate; checked all 6 pairs against the 17 hit-producing sources — only `{566,665}` has both members as sources, confirming Phase 2's finding was already complete, not incomplete.

**Method-equivalence artifact** (`גדול`≡`רגיל` when the phrase contains no sofit/final-letter): checked systematically across all 26 raw rows — only one pair coincides on a shared anchor target this way: `59`'s digit_read hitting `1118` via both `גדול` and `רגיל`.

**Total: 5 of 26 raw paths (19%) are mechanical restatements** — same as Phase 2, now confirmed complete against the full 61-set rather than a spot-check. **21 real (deduplicated) paths** carried forward.

### 4. Independent evidence — re-checked against the full 61-anchor graph

This pass queried **all 61 anchors' graph nodes and every edge among them** (not a subset), and **all approved/merged topic_cards** matching any of the 61 anchor values by number (not a partial regex) — both broader than Phase 2's checks. Corrections found: **358 and 360 do have approved topic_cards** ("358 — משיח", "360 — צירי הגאולה") that Phase 2's narrower search missed; **123 and 358 are graph-adjacent** (123 has edges to 321/1234; 358 has an edge to 86) which Phase 2 also missed. These are stated as corrections, not new discoveries — the underlying DB facts were unchanged between passes, only the completeness of the search improved.

**Evidence distribution across the 21 real paths:**

| Evidence class | Count | % of 21 real |
|---|---|---|
| **E** (multi-evidence, ≥2 independent classes) | 13 | 62% |
| **B** (single-class, corpus-backed) | 8 | 38% |
| **A** (computed only, zero corroboration) | 0 | 0% |

- **Corpus-backed: 21/21 (100%)** — every one of the 18 distinct targets already has ≥4 existing `gematria_words` phrases (range: 4 at `1024` to 152 at `776`).
- **Graph-direct: 1/21 (5%)** — only `45→1237` sits on an actual pre-existing edge (`cross`, `45→1237`, found directly in `edges`).
- **Graph-adjacent: 6/21 (29%)** — target or source touches an edge to a *different* anchor (776, 1237, 358, 123 and their associated rows).
- **Convergence-node: 5/21 (24%)** — targets 75, 123, 156, 223, 1118.
- **Package (approved/merged topic_card): 13/21 (62%)** — targets 75, 1237, 776, 358, 216, 123, 223, 1118, 360.
- **Source-note (specific human-authored claim naming the source number): 2/21 (10%)** — both legs of the 75/148→776 triangle.

### 5. Network metrics (against all 61 anchors, not just the 17/18 that participate)

| Metric | Value | % of 61 |
|---|---|---|
| Anchors with ≥1 valid outgoing path | 15 | **24.6%** |
| Anchors with ≥1 valid incoming path | 17 | **27.9%** |
| Anchors touched at all (source ∪ target) | 30 | **49.2%** |
| Anchors with **zero** involvement | 31 | **50.8%** |
| Raw paths | 26 | — |
| Deduplicated (real) paths | 21 | — |
| Multi-evidence (E) paths | 13 | 21.3% of 61¹ |
| Corpus-backed paths | 21 | 34.4% of 61¹ |
| Graph-direct paths | 1 | 1.6% of 61¹ |
| Graph-adjacent paths | 6 | 9.8% of 61¹ |
| Isolated computed-only paths | 0 | 0% |

¹ *these path-count percentages are shown against the 61-anchor denominator per instruction, though a "path" involves 2 anchors — read as "X real paths exist per every 61 anchors in the set," not as a per-anchor rate.*

**Hubs** (target hit by >1 *distinct* source anchor): `776` ← {75, 148}; `474` ← {414, 1948}; `216` ← {456, 555}.
**Fan-out sources** (>1 distinct target from one source): `148` → {776, 313, 111} (3 targets — the widest fan-out in the set); `50` → {75, 152}; `414` → {474, 358}; `456` → {216, 123}.
**2-hop chains:** `50→75→776` (×2, both of 50's forms independently land on 75); `414→474→223`; `1948→474→223`.
**3-hop chains: none.** No target of a 2-hop chain is itself a further source.
**Reciprocal paths (A→B and B→A): none**, checked exhaustively across all 21 real paths.
**Connected components (10 total, restricted to real-path edges):**

| Component | Nodes | Size |
|---|---|---|
| 1 | 50, 75, 111, 148, 152, 313, 776 | **7** |
| 2 | 223, 358, 414, 474, 1948 | 5 |
| 3 | 123, 216, 456, 555 | 4 |
| 4–10 | {512,974}, {145,256}, {506,1024}, {73,156}, {45,1237}, {59,1118}, {360,999} | 2 each |

**The network is fragmented, not unified** — 10 separate small clusters, the largest spanning only 7 of the 61 anchors.

**Method frequency among the 21 real hits:** `אלבם` (Albam) 7 (33%), `סידורי` 4, `אטבח` 4, `גדול` 2, `רגיל` 2, `מסתתר` 1, `אתבש` 1. `אלבם` alone accounts for a third of all real hits.

---

## INFERENCE

*(Explicitly separated from fact — these are read-outs, not asserted truths.)*

- **The multi-evidence rate did not weaken under full-set validation — it strengthened (52% → 62%)**, but this increase traces entirely to a more thorough evidence search in this pass (finding 358/360's topic_cards and 123/358's graph-adjacency that Phase 2 missed), not to new anchors or new paths. The underlying network is identical between Phase 2 and Phase 3; only the completeness of *checking* it improved. This should be read as "Phase 2 undercounted," not "the mechanism got stronger."
- **776 remains a genuine hub** — the only target reached by 2 distinct sources *and* sitting in a pre-existing 4-node graph cluster (45, 86, 1202, 1237) *and* holding 2 approved topic_cards *and* the only target with specific source-naming human notes. No other target in the network matches this depth on every axis simultaneously.
- **New hubs did emerge under the full-set view that Phase 2's narrower 17-source lens didn't foreground**: 474 (via 414 and 1948) and 216 (via 456 and 555) are structurally identical in shape to 776 (2 independent sources converging) — they are simply less individually evidenced (474 has no topic_card or convergence-node; 216 has a topic_card but no convergence-node). This suggests 776 is not structurally unique, but it *is* evidentially unique among the three real hubs found.
- **100% corpus-backing among the 21 real paths is likely a property of the anchor set, not the mechanism** — these 61 numbers were deliberately sourced from tables (`number_roots`, `anchor_families`, `metatron_anchors`, `calculator_anchors`) that already curate numerically/thematically significant values; a cross-anchor hit landing on one of them lands, almost by construction, on an already-populated corpus bucket. This is not evidence the generated-language mechanism finds *meaning* — it is evidence that *when* it lands on a pre-selected anchor, that anchor already has depth. A hit against a *non*-anchor random number would not carry this guarantee.
- **`אלבם`'s outsized share (33% of real hits)** may reflect that Albam (a fixed letter-pair substitution cipher) reshuffles values more unpredictably than order-preserving methods like `רגיל`/`גדול`, making incidental anchor-value collisions statistically more likely — offered as a plausible mechanical explanation, not a claim about its interpretive significance.
- **Fragmentation into 10 small components (largest = 7/61 nodes) suggests the network is a set of local pockets, not a web.** A "first-class lens" framing implies broad, general applicability; what exists today are several well-evidenced but disconnected local findings.

## RECOMMENDATION

*(Process only — no schema, DB, or UI change recommended, per instruction.)*

- Treat the 21 real paths as a **curated candidate list for Human-Gate review**, not as a validated corpus addition — each carries a clear DISCOVERED/CORROBORATED/CANONICAL label (below) so a reviewer sees exactly what is established vs. found vs. computed.
- If a Phase 4 is run, prioritize the 3 real hubs (776, 474, 216) and the widest fan-out source (148) first — this is where evidence density is already highest, rather than expanding the anchor set (explicitly out of scope here) or re-running the same 61 anchors again.
- Build the digit-permutation filter (6 known pairs, extendable) and the sofit-dependent method-equivalence filter directly into any future generation step, since both were shown here to be systematic, explainable, and fully filterable rather than random noise — this pass demonstrates they *can* be caught cleanly, which is itself a point in favor of eventually automating the filter rather than hand-checking it each time.
- **Proposed confidence/ranking model (design-only, not implemented — offered because the evidence found here is real and worth structuring, even though the decision below is NOT YET, not YES):**

  A path's displayable confidence could be a simple, transparent sum of the independent evidence booleans already computed in this pass — no ML, no hidden weighting:

  ```
  score = 2×canonical_graph_relation
        + 1×corpus_support
        + 1×(graph_direct OR graph_adjacent)
        + 1×convergence_support
        + 1×package_support
        + 2×source_note_support
  ```
  (source-note and canonical-graph weighted higher because they represent a specific pre-existing human/graph claim, not generic corpus presence.) Under this formula, `75→776` and `148→776` would score highest (source-note + corpus + graph-adjacent + package = 5 each), and `45→1237` would score highest of all (canonical + corpus + package = 5, with the +2 canonical weight making it the only path that could visually read as "established" rather than "candidate"). This is a **proposal only** — no code, table, or UI reads or writes this formula anywhere.

## HUMAN-GATE

None exercised. No edges drawn, no `research_objects` written, no topic_cards touched, no ranking model implemented — this section is design documentation only, pending Zuriel's review.

---

## 6. Stability test — direct answers

- **Does ~52% multi-evidence survive full-set validation?** Yes, and it rose to 62% — but the rise is a measurement-completeness artifact (§ Inference), not new signal. Read the stable figure as "50–62%, depending on how thoroughly the graph/package layer is searched" rather than a precise constant.
- **Were Phase-2 strong results unusually concentrated?** Partially. 776 is still the deepest single finding, but 474 and 216 are structurally comparable hubs Phase 2 didn't emphasize — so Phase 2's focus on 776 somewhat overstated its uniqueness relative to the other two real hubs.
- **Does 776 remain a genuine hub?** Yes — and remains the most *evidenced* of the three hubs, even if not structurally unique.
- **Do new hubs emerge?** Yes — 474 and 216, both already present in Phase 2's raw data but not framed as hubs there.
- **How much of the network disappears after mechanical dedup?** 19% of raw paths (5/26) — unchanged from Phase 2, now confirmed as the complete mechanical-loss rate across the full 61-anchor set, not a partial estimate.
- **Are particular methods disproportionately responsible?** Yes — `אלבם` alone produces a third of all real hits; the other 6 active methods that produced any hit split the remaining two-thirds roughly evenly.
- **Are results distributed enough to support a general feature?** No — only 49% of the 61 anchors are touched at all, only 25% have any outgoing path, and the touched anchors fragment into 10 disconnected components with a maximum size of 7. The evidence is deep in a few places and entirely absent in half the anchor set.

## 7. 75 / 148 / 776 — reference case, not promoted

Kept exactly as in Phase 2, re-scored against the full network: **75→776 and 148→776 are tied for the single highest-scoring paths in the entire 21-path set** under the proposed formula above (score 5 each — corpus + graph-adjacent + package + source-note), alongside `45→1237` (score 5, with the canonical-edge weighting making it the only path with an actual pre-existing direct edge). No other path in the network reaches this combination of evidence classes simultaneously.

**Verdict on the question asked: the triangle is not exceptional in *kind* — 474 and 216 are the same *shape* of finding (2 independent sources converging on one target) — but it remains the single strongest instance *in evidence depth*, tied only by 45→1237's very different kind of strength (a literal pre-existing graph edge rather than corpus/note depth).** It is representative of a small pattern (3 real hubs of this shape exist), not a unique anomaly, and not yet proof of a broad general pattern (10 fragmented components, half the anchor set untouched).

---

## DECISION GATE

Using the required three-state separation instead of "direct edge as prerequisite":

- **DISCOVERED COMPUTATION**: 21/21 real paths (100%) — every path is a live, reproducible, registry-driven engine hit.
- **PRE-EXISTING CORROBORATION**: 21/21 real paths (100%) — every path has at least one independent, pre-existing form of support (corpus phrases at minimum; most have more).
- **CANONICAL GRAPH RELATION**: 1/21 real paths (5%) — only `45→1237` sits on an actual, already-drawn graph edge.

### Answer: **NOT YET — useful research enrichment, insufficient general coverage**

**Why not NO:** Corroboration is not weak or mechanical-only — it is 100% among real paths, with 62% reaching multi-evidence status across independently-verified corpus, graph, convergence, package, and (twice) specific human-authored source claims. The two headline patterns (the 776 hub, and 45↔1237's convergence of a *direct* graph edge with an *independent* generated-language hit) are real, reproducible, and non-trivial.

**Why not YES:** Coverage is narrow and fragmented — only 49% of the 61-anchor set participates at all, only 25% produce any outgoing hit, and the participating anchors split into 10 disconnected clusters with a maximum size of 7 nodes. A "first-class Number Page research lens" implies a feature that shows up meaningfully across most numbers a user would look at; today it would show up richly for a handful of already-well-documented anchors (776, 474, 216, 1237, 1118, 156, 123, 223) and not at all for roughly half the anchor set, with zero data yet on how it performs for the thousands of *non*-anchor numbers on the site.

**What would move this to YES:** (a) validation on a substantially larger and more representative number sample (not just the 61 curated anchors — this pass explicitly could not test that, per its own scope boundary); (b) Human-Gate review of the 13 E-class paths, converting at least some `graph_adjacent`/`package` support into actual `canonical_graph_relation` edges, to test whether corroboration reliably survives a real review pass; (c) the digit-permutation and method-equivalence filters built into the generator itself rather than checked by hand each time.

---
*Stopping here per instruction. No WRITE, no promotion, no implementation — 0 edges drawn, 0 research_objects created, 0 topic_cards touched, 0 ranking model coded, 0 anchor-set expansion.*
