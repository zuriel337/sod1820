# SOD1820 — NUMERIC LANGUAGE · PHASE 2
Cross-Anchor Network Proof. READ-ONLY — 0 writes anywhere. Base: the 17 cross-anchor hits from `NUMERIC_LANGUAGE_ANCHORS.csv` (Phase 1), re-checked against the live One Tree.

---

## FACT

### 1. Raw paths

**26 raw (source → method → target) paths** exist across the 17 source anchors that produced a cross-anchor hit in Phase 1. After removing mechanical duplicates (see §5): **21 non-mechanical paths**.

### 2. Evidence-class distribution (26 raw rows)

| Class | Count | Meaning |
|---|---|---|
| **E** — multi-evidence (≥2 independent classes) | 11 | |
| **B** — corpus-backed only | 10 | |
| **MECHANICAL_DUPLICATE** | 5 | not counted as independent findings — see §5 |
| A — computed only | 0 | every path that wasn't mechanical found at least corpus backing |
| C — convergence-only (no other class) | 0 | convergence support always co-occurred with corpus/package in this set |
| D — source/package-only (no other class) | 0 | source-note support always co-occurred with corpus in this set |

*(Classes are cumulative in this run — a path is "E" the moment ≥2 of {corpus, graph, convergence, package, source} are independently true; the CSV's boolean columns show exactly which classes applied, so a path can be read as both "package-backed" and "E" at once.)*

### 3. Full path table

See `NUMERIC_CROSS_ANCHOR_NETWORK.csv` (26 rows). Every row preserves the required chain `source_number → generated_expression → generation_type → method → target_number`, plus which of the 5 evidence classes independently support it, live provenance notes, and mechanical-duplicate flags.

### 4. Hubs

**Targets hit by ≥2 independent source anchors** (real hubs, not counting the 566/665 mechanical pair as two sources):

| Target | Independent sources | Note |
|---|---|---|
| **776** | 75, 148 | The strongest hub — see §7 case study |
| **216** | 456, 555 | Both land via different methods (אלבם, אתבש) |
| **474** | 414, 1948 | Both via אלבם; 474 is itself one of the 61 anchors |
| 152 | 50 (566/665 are one mechanical unit, not a second independent source) | |

**Source anchors hitting multiple distinct targets** (fan-out):

| Source | Targets hit | Note |
|---|---|---|
| **148** | 776, 313, 111 | The strongest fan-out — 3 distinct targets from one anchor's two word-forms |
| 50 | 75, 152 | 75 is hit by *both* of 50's forms (cardinal and digit_read), independently, via the same method (סידורי) |
| 456 | 216, 123 | Same digit_read expression, two different methods |
| 414 | 474, 358 | Two different expressions |
| 566 / 665 | 2216, 152 | Mirrored — see §5 |

### 5. Mechanical duplication (explicitly flagged, not counted as independent discoveries)

- **566 ↔ 665, digit_read → 152 (via אלבם)**: 566's digit_read is "חמש שש שש", 665's is "שש שש חמש" — the same three words in different order. All 13 method-values are byte-identical between the two rows (verified). This is a **digit-permutation artifact** (566 and 665 share the digit multiset {5,6,6}), not two independent linguistic findings.
- **566 ↔ 665, cardinal_wording → 2216 (via אותיות אחרי)**: same digit-permutation relationship, same outcome.
- **59, digit_read → 1118, via גדול vs. רגיל**: both rows share the identical source, expression, and target — `גדול` and `רגיל` simply coincide in value here because the phrase ("חמש תשע") contains no final-form (sofit) letter, a mechanical property of those two methods on final-letter-free text (confirmed in Phase 1), not two independent hits.

**Net effect: 5 of the 26 raw rows are mechanical restatements, not new evidence.** The 21 remaining rows are treated as the real findings set throughout this report.

### 6. Chains (A→B→C)

Two-hop chains exist wherever a *target* of one path is itself a *source* in the 17-hit set:

1. **50 → 75 → 776** — 50's word-forms hit 75 (via סידורי); 75's own cardinal-wording independently hits 776 (via רגיל). Two hops, two different methods, two different generated expressions.
2. **414 → 474 → 223** — 414 hits 474 (via אלבם); 474's own digit_read/cardinal independently hits 223 (via אלבם).
3. **1948 → 474 → 223** — same second hop as #2, different first hop; 474 is the convergence point of two independent first-hop sources feeding into the same second hop.

**No 3-hop chain exists** — none of the second-hop targets (776, 223) are themselves sources in the 17-hit set, so the chains stop at two hops.

**No reciprocal path (A→B *and* B→A) was found anywhere in the 17-hit set** — checked explicitly for every target that is also a source (75 and 474); neither one's own outgoing hit points back toward its incoming source or any shared upstream node.

### 7. Special investigation: 75 / 148 / 776

**The generated-language layer:**
```
75  → שבעים וחמש         → cardinal_wording → רגיל → 776
148 → מאה ארבעים ושמונה  → cardinal_wording → רגיל → 776
```
Both computed live via `fn_all_methods_full` in Phase 1; both reproducible, deterministic, registry-driven.

**Independent structure found at 776 (checked before drawing any conclusion):**

- **Words/phrases**: `gematria_words` has **152 rows at ragil=776** — an unusually large, thematically coherent bucket (ביאת המשיח, גאולה, משיח content throughout). Critically, among those 152 rows are **"מאה ארבעים ושמונה"** and **"מאה ארבעים ושמונה (148)"** (two variant entries) and **"שבעים וחמש"** and **"שבעים וחמש = ביום ההוא = 75"** — i.e. both the 148-form and the 75-form of this exact triangle **already existed in the corpus before this experiment**, entered independently (`source='auto:תיעוד אירועים'`, two different legacy WordPress ids, `wp9298` and `wp16571`).
- **Human-authored note**: the 776-bucket phrase "שבעים וחמש" carries a *second*, explicitly-equated variant — "שבעים וחמש = ביום ההוא = 75" — meaning a human researcher had already written an equation naming 75 by number, tying it to a third phrase ("ביום ההוא") that also computes to 776. This is the one path in this whole set with genuine `source_support` (a specific human claim naming the source number), not just generic corpus presence.
- **Nodes/edges**: 776 has a `nodes type='number'` entry. It has **no** `nodes type='convergence'` entry. It **does** have pre-existing `relation_type='cross'` edges to **45, 86, 1202, and 1237** — all four of which are themselves members of the 61-anchor set from Phase 1, and none of which were touched by the generated-language experiment. **No direct edge exists yet between the 75-node or the 148-node and the 776-node** — the corpus link is real, the graph link is not (yet) drawn between these specific three numbers.
- **Convergence cards / topic_cards**: **two** approved/merged topic_cards exist for 776 — `776 — הכל מתחבר כאן` ("everything connects here" — approved) and `776 — שנת יהוה` (merged into the former). Neither card's content was inspected beyond its title/status (out of this pass's scope); their existence is the fact recorded here.
- **Packages / research_objects**: not separately checked beyond topic_cards in this pass (no `research_objects` rows were found referencing 75/148/776 specifically when the earlier Legacy→DNA Crosswalk sampled that table; not re-verified here since it was out of scope to re-audit).
- **Do 75 and/or 148 already connect to any of these same objects independently of this experiment?** — **Yes, both do, via the corpus bucket itself** (both phrases were independently present at ragil=776 before this experiment ran). **No**, neither 75 nor 148 has a direct graph edge to 776, and neither has its own topic_card overlapping 776's (75 has its own separate card, `gapfill-75`; 148 has none).

**Established, not interpreted:** independent structure already exists connecting 75 and 148 to 776 at the *corpus* level (pre-existing phrases, one with an explicit human equation) and 776 sits inside a *pre-existing graph cluster* with three other Phase-1 anchors (45, 86, 1202, 1237) — but none of that graph structure directly touches 75 or 148 yet. The triangle is corpus-corroborated and graph-adjacent, not (yet) graph-direct.

### 8. Bonus network fact found during the same pass (not asked for, reported per Rank-Don't-Hide)

**45 → 1237 (Phase-1 hit, via גדול) is independently corroborated by a pre-existing 2-hop graph path: 45 → 776 → 1237** (both `cross`-type edges, both pre-existing, both untouched by this experiment). The generated-language layer produced a *direct* 1-hop numeric link between 45 and 1237; the graph *already* contained an indirect 2-hop path through 776 between the same two numbers, via a completely different mechanism (curated `cross` edges, not word-form gematria). Both 1237 and 45 also carry approved topic_cards.

### 9. Negative results (stated plainly, not minimized)

- **0 of 61 anchors self-hit** (established in Phase 1, unchanged here).
- **0 reciprocal paths** anywhere in the 17-hit set.
- **No 3-hop chains** — every chain found stops at 2 hops.
- **12 of the 26 raw paths' targets (313, 111, 358, 256, 360, 1024, 974, 2216, 152, 474, 216-partially) have corpus presence but no topic_card and no convergence-node** — i.e. real words already exist at that value, but nothing has promoted that value to a package or graph-convergence object yet. This is the majority state, not the exception — the E-class (multi-evidence) findings are concentrated in a specific subset (776, 75, 1118, 156, 123, 223, 216, 1237, and the 50→75/1948→474/414→474 chain nodes), not spread evenly across all 17 source anchors.
- **No direct graph edge was found connecting any of the 21 non-mechanical source→target pairs directly** (e.g. no edge 75↔776, no edge 148↔776, no edge 414↔474). All graph_support found (776's cluster) is *adjacent* structure, not a direct edge on the exact path being tested. This is the single most important negative fact for the decision question below.

---

## INFERENCE

*(Labeled explicitly as inference, not fact — these are read-outs of what the fact pattern suggests, not claims the system itself asserts.)*

- The 75/148/776 triangle and the 45/776/1237 pair both show the same shape: a **generated-language hit lands on a number that was already independently significant** in the corpus/graph before this experiment touched it. In neither case did the generated-language layer *create* the significance of the target — it *found* numbers that the existing corpus had already converged on by other means.
- The concentration of E-class results around numbers that already have topic_cards (776, 1118, 156, 123, 223, 1237) versus the B-only results around numbers that don't (152, 474, 313, 111, 358, 256, 360, 1024, 974, 2216) suggests that generated-language hits are more likely to be *corroborated* when they land on a number the corpus had already promoted for unrelated reasons — not that the generated-language mechanism itself is more or less reliable in either case.
- 148's fan-out to three independent targets (776, 313, 111) from just two generated forms is a higher hit-density than most other sources in this set (which typically fan out to one or two targets) — worth noting as a pattern, not as evidence that 148 is "special" beyond what the corpus/graph facts above already establish for its one E-class hit (776).

## RECOMMENDATION

*(No schema or UI change recommended, per instruction. These are process recommendations only.)*

- Before any promotion: resolve whether the 75/148/776 triangle should get a direct graph edge (currently absent) given the corpus already supports it — this is a Human-Gate decision, not something this pass should or did perform.
- If a future pass extends this network (Phase 3+), prioritize re-running the search from the 4 anchors already shown to sit inside 776's pre-existing graph cluster (45, 86, 1202, 1237) rather than expanding to new, unrelated anchors — the evidence density in this pass was highest exactly where generated hits landed on already-connected numbers.
- The mechanical-duplication pattern (digit-permutation pairs like 566/665) is worth a one-line filter in any future systematic sweep, so raw-path counts aren't inflated by trivially-related anchors.

## HUMAN-GATE

None exercised in this pass — read-only throughout. Any decision to draw a new edge, create/update a `research_objects` candidate, or promote any of these findings to a topic_card requires Zuriel's explicit approval, not performed here.

---

## DECISION QUESTION

> **"Does the existing SOD1820 corpus/graph provide enough independent evidence that generated numeric-language cross-hits should become a first-class Number Page research lens?"**

### Answer: **NOT YET**

**Evidence for:**
- 11 of 26 raw paths (42%, 11 of 21 non-mechanical = 52%) reached multi-evidence (E) status, corroborated by pre-existing corpus, graph, convergence, or package structure that predates and is independent of this experiment.
- The two headline findings (75/148→776, and 45→1237 corroborated by the pre-existing 45→776→1237 graph path) show the mechanism can surface numerically real, thematically coherent, already-partially-documented connections — not noise.
- Zero fabrication risk observed: every "hit" is a live, reproducible, registry-driven computation: no self-hits, no invented interpretation, and the one direct human-authored note found (the "= 75" equation) was discovered, not created.

**Evidence against (why not YES):**
- **No direct graph edge exists for any of the 21 real paths tested** — including the two strongest ones (75→776, 148→776). The corroborating structure found is consistently *adjacent* (shares a topic_card, shares a corpus bucket, sits in the same graph neighborhood) rather than a *direct* edge on the specific generated-language claim. A "research lens" surfaced on a Number Page would be showing the *possibility* of a link that the graph itself has not yet drawn.
- **Coverage is narrow and uneven**: only 17 of 61 anchors (28%) produced any hit at all in Phase 1, and of those, only a handful (776, 1118, 156, 123, 223, 1237, 216) landed on already-well-supported numbers. A lens built on this mechanism today would surface strong results for a small minority of numbers and weak/no results for most — not yet a general-purpose feature.
- **Mechanical duplication is a real, un-filtered risk** at scale — 5 of 26 (19%) raw paths in this small sample were pure digit-permutation artifacts; a systematic sweep across more anchors would need this filter built in before any UI surfaces raw counts.
- **This pass explicitly did not check `research_objects`/broader package structures exhaustively** (only topic_cards + corpus + graph + convergence-nodes) — the evidence base, while real, is not complete enough to certify "enough independent evidence" as a blanket yes.

**What would move this from NOT YET to YES**: (a) Human-Gate review and, where warranted, explicit graph edges for the E-class paths found here (starting with 75→776, 148→776, 45→1237); (b) a larger Phase-3 sweep across more of the 61 anchors to see whether the ~52% multi-evidence rate holds at scale or was a feature of this particular hand-picked 17; (c) an explicit mechanical-duplication filter built into the generation step itself, not just flagged after the fact.

---
*Stopping here per instruction. No WRITE performed — 0 edges drawn, 0 research_objects created, 0 topic_cards touched, 0 schema/UI changes proposed.*
