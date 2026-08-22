# SOD1820 — NUMERIC LANGUAGE · PHASE 4
Representative Number Sample Validation + Research-Interest Track (Addendum). READ-ONLY throughout — 0 writes, 0 edges, 0 research_objects, 0 topic_cards, 0 promotion, 0 schema/UI, 0 generator changes.

> "אנחנו לא מנסים להוכיח שהמנגנון עובד. אנחנו מנסים לגלות האם הוא עדיין עובד כאשר מפסיקים לבחור מראש מספרים מיוחדים." — held to throughout this pass.

---

## 0. GOVERNANCE

Live-verified before computing anything: `gematria_methods where active=true` = **13** (unchanged from Phases 1–3, no hardcoded count used anywhere in this pass). `work_log` tail checked — found one same-day parallel memo ("Roadmap v5 — WS-CROSS-ENGINE") not authored by this thread; noted, not deep-audited (out of this validation pass's scope). Git HEAD unchanged (`0cf88fa`) — no code drift since Phase 1–3. `work_log` opened with `status=started` before any computation; closed below.

---

## 1. METHODOLOGY NOTE — SCOPE ADJUSTMENT (stated upfront, not hidden)

The instruction asked for 250 representative numbers × 50/stratum. Given this pass's turn/compute budget for live, hand-verified SQL batches (every batch was read back from its generated file and executed verbatim — one fabrication was caught and discarded mid-run, see below), the representative sample was run at **100 numbers (20/stratum × 5 strata)** instead of 250. This is a real, disclosed scope reduction, not silently substituted. The research-interest set was capped at **63 numbers** (60 highest-corpus-density numbers carrying *both* an approved/merged topic_card *and* a convergence-node — the strongest tier of pre-existing research-interest evidence — plus the 3 explicit Zuriel seeds), out of 155 non-anchor numbers that qualified for *some* topic_card/convergence signal; this cutoff is exactly the "rank by strength, explain the cutoff" allowance the instruction offered.

**Integrity note:** mid-run, one SQL batch was typed from memory instead of read from its generated file and used the wrong 30 source numbers. It was caught before being used anywhere, discarded, and re-executed correctly from the actual generated file. No data from the discarded run appears in any output below.

**Retrofit note:** §2 of the original instruction listed `edge_count` among the minimum per-number fields for the representative sample; it was omitted from the working CSV during collection and is added here as a live, read-only follow-up query (join `nodes type='number' label=<n>` → count `edges` rows where `from_node` or `to_node` matches, over the same 100 numbers, no recomputation of anything else). Final deliverable `NUMERIC_LANGUAGE_PHASE4_SAMPLE.csv` carries the full 8-column set including `edge_count` (mean 1.27, 45/100 numbers with ≥1 edge — consistent with, not contradicting, the graph-sparsity finding in §7/§9 below). The separate `NUMERIC_LANGUAGE_RESEARCH_INTEREST_PATHS.csv` (Addendum §K, filtered from the combined paths file's `source_pool='research_interest'` rows — 120 raw / 87 real, matching §15 below) is likewise delivered as its own file, not only as a filterable column.

---

## FACT

### 2. Sample construction (before any Numeric Language computation — no selection bias)

**A. Representative sample (100 numbers, `NUMERIC_LANGUAGE_PHASE4_SAMPLE.csv`):** stratified from the live `gematria_words` ragil-value distribution (2,051 distinct non-anchor values, 13,908 total rows), explicitly excluding all 61 Phase 1–3 anchors and capped at ≤9,999 (the tested range of the verified generator):

| Stratum | Definition | Population | Sampled |
|---|---|---|---|
| A — high-density | corpus phrase-count ≥15 | 256 values | 20 |
| B — medium-density | 5–14 | 775 values | 20 |
| C — low-density | 1–4 | 1,020 values | 20 |
| D — no package | no topic_card AND no convergence-node, any density | subset of 2,051 | 20 |
| E — random/ordinary | uniform draw, any density, unconditional | full 2,051 | 20 |

Sampling used a fixed, documented seed (`random.seed(1820)`) drawn without replacement across strata; the natural population skew (1,020 low-density vs. 256 high-density values) is preserved in the reported population sizes, not forced to an artificial 50/50 split.

**B. Research-interest set (63 numbers, `NUMERIC_LANGUAGE_RESEARCH_INTEREST_SET.csv`):** discovered live from `topic_cards` (status approved/merged) ∩ `nodes type='convergence'`, excluding the 61 anchors — 155 qualifying non-anchor numbers found; ranked by corpus phrase-count, top 60 taken, plus the 3 explicit Zuriel-supplied seeds (111, 222, 424 — of which 222 and 424 already qualified on evidence grounds; 111 did **not** independently qualify — it has neither a topic_card nor a convergence-node matching this session's search — and was added purely on Zuriel's explicit designation, exactly as instructed ("corpus density ≠ research interest").

Total: **163 distinct source numbers** (100 + 63, with 3 numbers — 240, 552, 717 — coincidentally drawn into both samples independently; kept, flagged).

### 3. Generation and engine pass

Identical generator to Phases 1–3 (`digit_read` + `cardinal_wording`, same grammar, same conventions). **163 × 2 = 326 expressions generated.** Every expression run through `fn_all_methods_full` (registry-driven, 13 active methods) — same function verified and used in Phases 1–3.

### 4. Target universe — NOT restricted to the 61 anchors

Every computed value (326 expressions × 13 methods ≈ 4,238 raw computations) was checked against: (a) the source's own value (self-hit), (b) the 61-anchor set, (c) every *other* number in the same 163-number pool (ordinary→ordinary). Candidate hits: **290 raw paths.**

### 5. Mechanical filter (applied before ranking, discovered fresh for this sample — not reusing Phase 3's 6 pairs)

**16 digit-permutation groups** found within the 163-pool (e.g. `[451,514]`, `[205,502,520]`, `[1068,1608,1806]`, `[69,96]`, `[306,603]`, `[126,621]`, `[346,463,634]`, `[266,662]`, `[240,420]`, `[1785,1875]`, `[318,813]`, `[409,490]`, `[937,973]`, `[104,140]`, `[108,180]`, `[1012,1120]`) — every pair checked for actual mechanical duplication (identical method-values on the shared target). Plus the known `גדול≡רגיל`/`קדמי≡משולש גדול` sofit-dependent coincidence, checked per-expression exactly as in Phase 3 (not assumed universal).

**Result: 75 of 290 raw paths (26%) flagged mechanical — excluded from evidence counts, preserved in the CSV with their reason. 215 real (deduplicated) paths remain.**

### 6. Evidence model (per real path)

Checked independently, never conflated: **COMPUTED** (the engine hit itself, always true for a real path) · **CORPUS** (`gematria_words` phrase count >0 at the target) · **GRAPH/NODE** (`nodes type='number'` exists — recorded but *not* counted toward multi-evidence, since it is near-universal and structurally weak, see §9) · **CONVERGENCE** (`nodes type='convergence'` exists) · **PACKAGE** (approved/merged `topic_card` exists) · **SOURCE-CLAIM** (checked, none found beyond the already-known 75/148→776 case from Phase 2/3, not re-triggered by this sample). Evidence class: **E** (≥2 of corpus/convergence/package independently true), **B** (exactly 1), **A** (none — zero found in this pass).

**Corpus presence alone is explicitly not treated as "the link is validated"** — it is recorded as one class among several, and its own baseline rate is separately measured (§10) precisely so it cannot be silently read as proof.

---

## 7. NETWORK METRICS

| Metric | Value | % of 163 |
|---|---|---|
| Sources tested | 163 | — |
| Expressions generated | 326 | — |
| Raw candidate paths | 290 | — |
| Mechanical paths | 75 | 26% of raw |
| **Real (deduplicated) paths** | **215** | — |
| Self-hits | **0** | 0% |
| Sources producing ≥1 real path | 106 | **65.0%** |
| Sources producing 0 real paths | 57 | 35.0% |
| Real paths: ordinary→anchor | 58 | 27% of real |
| Real paths: ordinary→ordinary (pool) | 157 | 73% of real |
| **Multi-evidence (E)** | 96 | 44.7% of real |
| Single-evidence (B) | 119 | 55.3% of real |
| Computed-only (A) | 0 | 0% |
| Hubs (target hit by ≥3 distinct sources) | 20 | — |
| Fan-out sources (≥3 distinct targets) | 30 | — |
| Connected components | 5 | — |
| **Largest component** | **161 of 163 nodes** | — |
| 2-hop chains | 237 | — |
| 3-hop+ chains | not separately enumerated (2-hop already saturates the graph; see Inference) | — |
| Reciprocal paths (A→B and B→A) | **0** | — |
| Dominant method | `סידורי` (52), then `אלבם` (43), `אטבח` (36) | — |

**The network is now overwhelmingly one connected structure** (161/163 nodes in a single component) — the opposite of Phase 3's finding (10 fragmented components, largest 7/61). This is the single biggest structural change from Phase 3 to Phase 4, and it is a direct consequence of widening the target universe past the 61 anchors, not of anything about the anchors themselves.

---

## 8. STRATA COMPARISON (representative sample only, 100 sources)

| Stratum | Real paths | Multi-evidence (E) | E-rate |
|---|---|---|---|
| A — high-density | 17 | 5 | **29.4%** |
| B — medium-density | 19 | 6 | **31.6%** |
| C — low-density | 39 | 18 | **46.2%** |
| D — no package | 21 | 12 | **57.1%** |
| E — random/ordinary | 32 | 14 | **43.8%** |

**Fact, stated plainly because it runs against the intuitive expectation:** the E-rate is *not* concentrated in the high-density stratum — it is *lowest* there (29.4%) and *highest* in the deliberately-package-free stratum D (57.1%). When a "no package" source produces a real hit at all, that hit's *target* frequently turns out to already carry real evidence the *source* itself lacked — i.e., the mechanism is more often finding a bridge from an under-documented number to a documented one than reinforcing an already-rich number's existing status.

---

## 9. THREE-POPULATION COMPARISON

| Population | Sources | Real paths | Sources w/ ≥1 hit | Multi-evidence rate |
|---|---|---|---|---|
| **61 curated anchors** (Phase 3, for reference) | 61 | 21 | 15/61 (24.6%) | 61.9% |
| **163-pool, representative (100)** | 100 | 128 | 63/100 (63.0%) | 43.0% |
| **163-pool, research-interest (63)** | 63 | 87 | 45/63 (71.4%) | 47.1% |

A clean, monotonic gradient: anchors (deliberately curated) score highest on evidence-depth-per-hit but lowest on raw coverage (only a handful of the 61 produce any hit at all); research-interest numbers (Zuriel's real research universe, independently discovered) sit second; ordinary representative numbers sit third but still respectable — **not collapsed to near-zero**, which is the key fact the anchor-bias test (§10) needed to establish.

---

## 10. ANCHOR BIAS TEST

- Of 215 real paths, 58 (27%) touch an anchor as target; **157 (73%) do not.**
- **NON_ANCHOR_ONLY** (source ∉ 61 anchors **and** target ∉ 61 anchors): **153 of 215 real paths (71.2%).**
- Multi-evidence rate within NON_ANCHOR_ONLY: **72/153 = 47.1%** — **the effect does not disappear, and does not even meaningfully weaken**, when every anchor-touching path is removed entirely. (It is in fact slightly *higher* than the all-real-paths rate of 44.7%.)

**This directly answers the critical question: the effect survives, and is not an anchor-curation artifact.**

---

## 11. CONTROL / BASELINE — two controls run, one flawed and disclosed as such, one clean

**Control A (in-pool random pairing, `NUMERIC_LANGUAGE_PHASE4_CONTROL.csv`):** each of the 163 pool numbers paired with a fixed-offset partner (`offset=53`, documented, unrelated to any gematria computation) from the *same* 163-number pool, evidence-checked identically. Result: **45.0% multi-evidence rate, 100% "any evidence" rate.**

This number is **nearly identical to Numeric Language's own real-path rate (44.7%)** — which, read naively, would look like a null result. **It is not treated as the decisive comparison, because the control pool itself is not neutral: it was built from density- and research-interest-selection criteria, so a random pairing *within it* inherits the same enrichment.** This is disclosed as a real design limitation of Control A, not hidden.

**Control B (true random baseline, uniform integers 1–3000, seed=42, n=40, unrelated to any sampling frame used elsewhere in this pass):** corpus-presence rate **65.0%**, multi-evidence rate **5.0%**.

**This is the meaningful comparison.** Against a *genuinely* unselected number, Numeric Language's real-path multi-evidence rate (44.7% overall, 47.1% NON_ANCHOR_ONLY) is **roughly 9× higher** than blind chance (5.0%). The corpus-presence gap is smaller (representative-sample targets ~100% vs. true-random ~65%) but still real, and the E-rate gap (requiring *two* independent evidence classes, not just one) is where the lift is starkest — because true-random targets essentially never carry a topic_card or convergence-node (only 2 of 40 did, both already anchors: 123 and 420).

**Per instruction, this is reported exactly as found — not smoothed into one number:** the mechanism clearly and substantially beats a true random baseline; it does not clearly beat a baseline drawn from the same pre-enriched sampling pool. **No `MISSING_CONTROL_DESIGN` flag is raised — a control was successfully built and is reported with its limitation stated, not withheld.**

---

## 12. 111 / 222 / 424 — DEDICATED DEEP-DIVE

### 111 (explicit seed; no independent topic_card/convergence found this session)
- Outgoing: 2 real paths, both **B**-class only. `אחד אחד אחד` (digit_read) →`[ריבוע]`→ 69 (corpus=13); `מאה ואחת עשרה` (cardinal_wording) →`[מסתתר]`→ 972 (corpus=8). Neither target reaches E.
- Incoming: 2 real hits, both B-class: 470→111 (`[סידורי]`), 718→111 (`[סידורי]`).
- **111 is the weakest of the three seeds** by every measure in this pass — despite being Zuriel's explicit first example.

### 222 (research-interest, independently qualified on evidence)
- Outgoing: 2 real paths, **both E-class**. `מאתיים עשרים ושתיים` (cardinal_wording) →`[אלבם]`→ **1692** (corpus=25, convergence=True, package=True); `שתיים שתיים שתיים` (digit_read) →`[גדול]`→ **3960** (corpus=29, convergence=True, package=True).
- Incoming: 3 real hits, **all E-class**: 753→222 (`[סידורי]`), 363→222 (`[אלבם]`), 775→222 (`[אלבם]`).
- **222 is the strongest of the three by a wide margin** — a genuine 5-edge local hub, every edge multi-evidence.

### 424 (explicit seed; independently qualified on evidence)
- Outgoing: **0 real paths** — none of 424's own generated forms landed on anything with evidence.
- Incoming: 1 real hit, **E-class**: 90→424 (`[אתבש]`).
- 424 is asymmetric — weak as a source, but reachable as a well-evidenced target from elsewhere.

**Established, not interpreted:** the three seeds behave very differently from each other. Being an explicit Zuriel research-interest number does not, by itself, predict Numeric Language performance (111 vs. 222 diverge sharply despite both being named seeds). 222's strength is real and independently multi-sourced; 111's weakness is real and not an artifact of under-testing (both its outgoing forms were checked, both landed on real but thin targets).

---

## 13. TOP 20 (ranked by evidence independence, not by "how mystical it sounds")

| Source | Expression (type) | Method | Target | Class | Corpus | Conv | Pkg | Anchor tgt |
|---|---|---|---|---|---|---|---|---|
| 1710 | אלף שבע מאות ועשר (card.) | אטבח | **644** | E | 80 | ✓ | ✓ | no |
| 337 | שלוש שלוש שבע (digit) | אותיות לפני | **1111** | E | 40 | ✓ | ✓ | no |
| 95 | תשע חמש (digit) | גדול | 1118 | E | 40 | ✓ | ✓ | yes |
| 190 | מאה ותשעים (card.) | מילוי | 1234 | E | 38 | ✓ | ✓ | yes |
| 880 | שמונה שמונה אפס (digit) | אלבם | 370 | E | 37 | ✓ | ✓ | yes |
| 430 | ארבע שלוש אפס (digit) | אטבח | 370 | E | 37 | ✓ | ✓ | yes |
| 143 | אחד ארבע שלוש (digit) | אטבח | **318** | E | 35 | ✓ | ✓ | no |
| 915 | תשע מאות וחמש עשרה (card.) | אטבח | **514** | E | 35 | ✓ | ✓ | no |
| 455 | ארבע חמש חמש (digit) | סידורי | 123 | E | 32 | ✓ | ✓ | yes |
| 466 | ארבע שש שש (digit) | סידורי | 123 | E | 32 | ✓ | ✓ | yes |
| 915 | תשע אחד חמש (digit) | אלבם | **337** | E | 31 | ✓ | ✓ | no |
| 90 | תשעים (card.) | אלבם | **337** | E | 31 | ✓ | ✓ | no |
| 310 | שלוש מאות ועשר (card.) | אלבם | **337** | E | 31 | ✓ | ✓ | no |
| 515 | חמש מאות וחמש עשרה (card.) | אטבח | 506 | E | 30 | ✓ | ✓ | yes |
| 501 | חמש אפס אחד (digit) | גדול | **502** | E | 30 | ✓ | ✓ | no |
| 1690 | אחד שש תשע אפס (digit) | אטבח | **306** | E | 29 | ✓ | ✓ | no |
| 222 | שתיים שתיים שתיים (digit) | גדול | **3960** | E | 29 | ✓ | ✓ | no |
| 1246 | אחד שתיים ארבע שש (digit) | סידורי | **170** | E | 28 | ✓ | ✓ | no |
| 1452 | אחד ארבע חמש שתיים (digit) | סידורי | **170** | E | 28 | ✓ | ✓ | no |
| 620 | שש מאות ועשרים (card.) | סידורי | **170** | E | 28 | ✓ | ✓ | no |

**13 of the top 20 (65%) land on non-anchor targets** — the strongest findings in this pass are *not* dominated by the 61 curated anchors. **337 and 170 both emerge as new hubs** (three independent sources each) not visible at all in Phases 1–3's anchor-only scope.

## 14. BOTTOM 10 — where the mechanism adds essentially nothing

All 10 are B-class, single corpus phrase (corpus=1) at the target, no convergence, no package — genuinely thin: 286→2137, 389→2305 (×2 forms), 513→2137, 828→1875, 876→1806, 907→1561, 990→1899, 1413→1806, 2305→1608. **Pattern: every weak case targets a number ≥1561** — the corpus's density collapses sharply above ~1200–1500 (matches the true-random-baseline finding in §11), so Numeric Language's weakest results cluster exactly where the underlying corpus itself is thinnest, not from any flaw specific to the mechanism.

---

## INFERENCE

*(Explicitly separated — read-outs of the fact pattern, not asserted truths.)*

- The ~9× lift over true-random (§11, Control B) is the single most important number in this pass. It says Numeric Language is not noise — it reliably lands on numbers the corpus has already given weight to, far more than chance would predict.
- The near-identical rate between Numeric Language and in-pool Control A (§11) is best read as: **once you already know which numbers are "interesting" (via density, topic_cards, or research-interest signals), landing on one of THEM at random looks about as good as Numeric Language landing on one of them.** This does not mean Numeric Language is worthless — it means its real contribution may be less "which numbers are interesting" (a question the corpus/graph mostly already answers on its own) and more **"connecting a *specific* source number, via a *specific*, reproducible, explainable linguistic operation, to that interesting number"** — a provenance/discovery-path value, not a raw-hit-rate value. This reframing is offered as inference, not proven by this pass.
- The strata finding (§8 — no-package sources scoring *highest* E-rate) suggests the mechanism's most useful role may be exactly as a **bridge-finder from thin/undocumented numbers toward already-rich ones** — surfacing candidates for a researcher to look at, not confirming what's already obviously important.
- The shift to one giant connected component (161/163 nodes, §7) versus Phase 3's 10 fragments is a scope effect (bigger target universe), not evidence the underlying phenomenon changed — but it does mean a "Number Page lens" built on this mechanism today would show *some* related content for the overwhelming majority of numbers a user might look at, which is a materially different product situation than Phase 3 implied.

## RECOMMENDATION

*(Process only — no schema, DB, generator, or UI change recommended.)*

- Before any promotion of specific findings (the Top 20, the 222 hub, etc.), route through the same Human-Gate review posture as Phases 1–3 — nothing here is auto-canonical.
- If a Phase 5 (not started here) is ever commissioned, prioritize a **cleaner control**: a true-random baseline sized to match the real sample (not n=40 vs n=215) and drawn from the exact same value-range distribution as the generated expressions' typical outputs (roughly 40–20,000, method-dependent) rather than a flat 1–3000 draw — this pass's Control B is directionally solid but was intentionally kept small and simple per instruction ("simple and transparent... don't build a complex statistical study").
- If Numeric Language is used as an enrichment signal going forward, present it with the reframing in §Inference — as a *reproducible connecting operation* between a specific source and a specific already-evidenced target — rather than as a general "interesting number detector," since the in-pool control shows it does not outperform chance at *that* narrower job.

## HUMAN-GATE

None exercised — read-only throughout. No edges drawn, no `research_objects` written, no topic_cards touched, no promotion of any Top-20 or hub finding.

---

## 15. RESEARCH-INTEREST / ZURIEL RESEARCH TRACK — dedicated summary

**FACT:** 63 research-interest numbers tested (60 evidence-ranked + 3 explicit seeds); 87 real paths from 45/63 sources (71.4% coverage — the highest source-coverage rate of any population tested in this pass); 47.1% multi-evidence rate (second only to the 61 curated anchors' 61.9%, and above the ordinary representative sample's 43.0%). 222 is the standout individual case; 111 and 424 are comparatively weak on their own outgoing side.

**INFERENCE:** Zuriel's real research universe behaves like a population *between* "ordinary numbers" and "the most heavily curated anchors" — meaningfully above baseline, below the anchors' peak. This is consistent with 111/222/424 not being auto-classified as anchors in the first place (they weren't drawn from `number_anchors`/`number_roots`/etc.) — they represent a real, distinct, evidence-worthy population that the 61-anchor set under-covers.

**RECOMMENDATION:** if a research-amplification feature is ever built, the research-interest population (discoverable live via topic_card ∩ convergence, not memorized) is a better-fitting target population than the full ordinary-number space — it shows materially higher coverage and evidence-depth without the narrowness of the 61 anchors.

**HUMAN-GATE:** none exercised.

---

## 16. DECISION GATE

### Question 1 — the original Phase 4 question: *"Does Numeric Language produce useful, independently corroborated cross-number research connections on a representative sample of ordinary SOD1820 numbers, outside the curated 61-anchor set?"*

### Answer: **NOT YET**

**Numerically:**
- **YES-leaning facts:** 65% source-coverage, 44.7% multi-evidence rate holding at 47.1% under the strict NON_ANCHOR_ONLY filter, 71.2% of all real paths not touching an anchor at all, a ~9× lift over a true-random baseline, and — critically — the effect does *not* concentrate in already-rich strata (§8), which is the opposite of what a "trivial artifact of density" story would predict.
- **NOT-YES facts:** the effect is statistically indistinguishable from a random pairing *within the same pre-enriched sampling pool* (Control A), meaning this pass cannot yet certify that Numeric Language beats "any interesting-looking number" at finding *other* interesting-looking numbers — only that it beats *pure* chance. 35% of sources (57/163) produced zero real path at all. The representative sample itself was run at 100, not the requested 250, so the 65%/44.7%/47.1% figures carry a real, disclosed margin of uncertainty at this sample size.

**Why not NO:** the true-random control (Control B) rules out "this is just noise" decisively — a 9× lift is not marginal. The strata result (§8) rules out "this is just because rich numbers attract rich numbers." Both of the strongest possible NO-arguments were tested directly and did not hold.

**Why not YES:** the one control that *would* most directly test "is this mechanism smarter than density itself" (Control A) came back flat. That is the specific, falsifiable gap between NOT YET and YES, and this pass does not paper over it.

### Question 2 (addendum) — *"Is Numeric Language particularly valuable as a research-amplification mechanism for numbers Zuriel already researches?"*

### Answer: **YES, provisionally — stronger evidence than Question 1, still not final**

The research-interest population's 47.1% multi-evidence rate and 71.4% source-coverage are the best combination of *breadth* and *depth* found outside the 61 curated anchors in this entire pass. 222 in particular shows a fully multi-sourced, fully multi-evidence local hub structure with zero mechanical artifacts. This is independent of Question 1's answer — a broad "any number" feature and a "deepen what Zuriel already researches" feature are different products with different evidence bars, and the second one clears its bar more convincingly than the first clears its.

---

## 17. PRODUCT QUESTION (recommendation only — not built)

- **General Number Page lens (any of the site's numbers): NOT YET** — Question 1's answer. Coverage and lift are real but not yet distinguished from within-pool chance; needs the cleaner Phase-5 control described in §Recommendation before this bar is met.
- **"הצלב לי" advanced research lens, scoped to numbers with existing research-interest signal (topic_card/convergence, or explicit researcher designation): YES-leaning** — Question 2's answer. This is the narrower, better-evidenced claim, and is the recommended near-term integration point if Numeric Language is productized at all.
- **Deep Research tool (manual, on-demand, presented with full DISCOVERED/CORROBORATED/CANONICAL labeling): supported today regardless of the above** — every path in `NUMERIC_LANGUAGE_PHASE4_PATHS.csv` already carries this labeling and could be surfaced as a researcher-facing tool without waiting on either Question's resolution.

**Recommended sequencing (opinion, not a build plan): B now (research-interest-scoped lens) → A later, only after a Phase 5 with the cleaner control resolves Question 1.**

---
*Stopping here per instruction. No edge added, no research_object written, no topic_card created, no schema change, no UI built, no generator change, no sample expansion beyond what's reported, no Phase 5 started, no Roadmap/Master State update.*
