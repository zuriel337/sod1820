# SOD1820 — NUMBER ↔ LANGUAGE · PHASE 5
Words → Numbers Reconciliation. READ-ONLY throughout — 0 writes, 0 migrations, 0 edges, 0 research_objects, 0 topic_cards, 0 UI, 0 parser production, 0 generator changes, 0 promotion.

> "מספר שמופיע במילים אינו שווה לגימטריה שלו. המספר שהמילים מציינות והמספר שהמנוע מחשב הם שתי עובדות שונות — והמחקר מתחיל בקשר ביניהן." — held to throughout this pass.

---

## 0. GOVERNANCE

Worked entirely from already-existing files, per instruction — no new discovery pass over the corpus:
- `numeric_word_phrases_audit.csv` — **570 rows** (confirmed exact match to the instruction's stated count), columns `phrase, source, verified, ragil, detected_number_words, parsed_numeric_sequence, parsed_numeric_value, corpus_role, world_theme, provenance, confidence, category`. This file already carries `ragil` (GEMATRIA VALUE, pre-computed by the live engine in the prior audit) and, for 81 of the 570 rows, an existing `parsed_numeric_value`/`parsed_numeric_sequence` (PARSED NUMBER, pre-computed) — reused, not recomputed.
- `year_time_audit.csv` (111 rows), `METHOD_MENTIONS_CLASSIFIED.csv` / `METHOD_CLAIMS_PHASE3.csv` (797 rows each) — cross-referenced by **exact phrase-text join** against the 570 (year: 32 exact matches; method-mentions/claims: 61 exact matches each).
- `NUMERIC_LANGUAGE_ANCHORS.csv` (Phase 1), `phase4_rep_expressions.json` + `phase4_ri_expressions.json` (Phase 4), `strong_expressions.json` (Strong Numbers sheet) — the full pool of **437 distinct GENERATED expression texts** across Phases 1–4 + the Strong Numbers sheet, used for the `generated_existing_match` check.
- `mark_reference_sets.json` (anchors/research-interest/hubs/graph-direct/multi-evidence, built in the prior Strong Numbers task) and `strong_numbers_final.json` (the 50-number Strong Numbers set) — reused as-is for cross-research and special-number checks.
- Generator: the identical, unchanged `digit_read`/`cardinal_wording` implementation verified across Phases 1–4 (sanity-reasserted: `cardinal_wording(1820)=="אלף שמונה מאות ועשרים"`, `cardinal_wording(22)=="עשרים ושתיים"`) — used only to run the round-trip test (§5), never modified.

No re-scan of the raw corpus, no new live-engine calls (the `ragil` values were already live-verified in the prior audit and are reused as FACT).

---

## 1. METHODOLOGY NOTE (stated upfront)

The 570 rows arrived pre-bucketed into 4 categories by the prior audit: `numeric_quantity` (54), `numeric_sequence` (27), `mixed_numeric_phrase` (396), `ambiguous` (93). This pass maps those onto the instruction's A–F taxonomy and adds the round-trip/cross-research/special-number layers on top — it does not re-litigate the prior audit's own category assignment.

**Words→number parsing** was applied with three tiers of confidence, disclosed here rather than silently applied:
- **HIGH** (81 rows): the *entire* phrase is a number-word construct with a pre-existing `parsed_numeric_value`/`parsed_numeric_sequence` from the prior audit (categories A/B/D below) — the phrase functions as the number's *name*.
- **MEDIUM** (191 rows): the phrase contains exactly **one** number-word token, drawn from a 44-word lookup table built empirically from the 54 unique tokens actually present in `detected_number_words` across all 570 rows (not invented). This yields a *mentioned* number, never an *identity* — round-trip is by definition `no_roundtrip` for these (see §3).
- **NOT PARSED** (298 rows): either (a) the sole token is one of `{אחד, אחת, שני, שתי, שתיים, שנים, שתים}` — the exact risky-word class the instruction names in §4 — left unparsed on purpose (148 rows); (b) the phrase has **2+** number-word tokens with no safe single reconstruction (140 rows — see the "חמש שנים" case below, which proves why); (c) a bare multiplier word with no standalone value, e.g. `מאות` alone (7 rows); or (d) a known false-positive detection, `שיש` ("there is/marble", not a number, 2 rows) plus 1 unrecognized token.

**Why multi-token phrases were not auto-reconstructed:** tested reconstruction against `חמש שנים` / `אלף שנים` / `שלוש שנים` / `שלש שנים` — all 4 cases where naive residual-stripping suggested a "clean" multi-word number. In every case `שנים` here means **"years"** (plural of שנה), not the number 2. Auto-parsing these would have produced exactly the false-positive class the instruction warns against for `שני`. This is disclosed as a real, tested limitation, not assumed.

---

## FACT

### 2. Parse-type distribution (all 570 rows)

| parse_type | count | definition |
|---|---:|---|
| A. digit_sequence | 27 | phrase reads digit-by-digit (e.g. "שבע שבע שש"→776), sequence pre-parsed by prior audit |
| B. cardinal_number | 48 | phrase is the full cardinal name of a number (e.g. "שבעים וחמש"→75) |
| D. year_expression | 6 | cardinal-form phrase in the 1300–2200 range, corroborated by year-audit overlap or a thousands-opening ("אלף/אלפיים/אלפים…") — **dual-tagged**: numeric_role=cardinal (still counted in the underlying B-style parse) AND temporal_role=year, never collapsed to one (§10) |
| E. mixed_numeric_phrase | 318 | number-word(s) embedded in a longer phrase — the number is *mentioned*, not the phrase's identity |
| F. ambiguous | 171 | no confident numeric-language parse assigned |

Type **C (ordinal/quantity, "identity vs. amount")** was not found to form a clean, separately-identifiable cluster in this data beyond what the existing `numeric_quantity` category already isolated (see INFERENCE below) — disclosed rather than forced.

**Parsed successfully (any parsed_number assigned, high or medium confidence): 266/570 (46.7%)** — 81 high-confidence identity parses (A+B+D) + 185 medium-confidence single-token mentions (of the 191 medium-tier rows, 6 double as D_year identity parses, counted once above).

### 3. Round-trip test (§5) — meaningful only for identity parses (A/B/D, 81 rows)

| roundtrip_status | count | meaning |
|---|---:|---|
| exact_roundtrip | 36 | phrase text == generator's own output for that number, byte-for-byte |
| normalized_roundtrip | 8 | differs only by the ו-conjunction / spacing |
| alternate_valid_form | 27 | a different, still-legitimate Hebrew form (e.g. "אלפים" vs. generator's "אלפיים" for 2000) |
| no_roundtrip | 499 | the phrase only *contains* a number, it is not the number's *name* (all 489 E/F rows, by definition, plus the small out-of-generator-range remainder) |

**36+8+27 = 71 of the 81 identity-parse rows (87.7%) round-trip cleanly or near-cleanly** against the exact same generator verified in Phases 1–4 — the strongest single piece of evidence that the generator's grammar matches how SOD1820's own corpus actually writes numbers in words, independent of anything the generator itself produced.

### 4. Generated-existing-match (§7) — does the corpus already contain a Phase 1–4 GENERATED form?

**10 of 570 phrases (1.75%) are byte-identical to a form the generator itself produced in Phases 1–4 or the Strong Numbers sheet.** All 10 are listed in `NUMBER_WORDS_RECONCILED.csv`'s `generated_existing_match` column with the source number(s). This is a small but genuine overlap — most of the 570 corpus phrases were written independently of the generation exercise (expected: they predate it).

### 5. Gematria cross (§6) — self-hits and cross-research hits

- **Self-hit (parsed_number == ragil): 1 row** — "אחת אחת אפס אפס" (digit-sequence) parses to 1100 *and* its own phrase-gematria (רגיל) is also 1100. A genuine, rare self-referential coincidence — not engineered.
- **cross_research_hits (ragil lands on an anchor/research-interest/hub number): 109/570 rows (19.1%).**
- **special_flags (either the parsed_number itself, or the phrase's ragil, hits one of the 11 seed/50-strong special numbers): 68/570 rows (11.9%).**
- **target_overlap (parsed_number or ragil in the 50-number Strong Numbers set): 51/570 rows (8.9%).**

### 6. The flagship finding — the 75/148/776 triangle rediscovered from raw corpus text

Two rows independently and organically reproduce the *exact* triangle Phase 2–3 established from the *generation* direction:

| id | phrase | parsed_number (words say) | ragil (phrase gematria) |
|---|---|---:|---:|
| 3 | "שבעים וחמש" | **75** | **776** |
| 8 | "מאה ארבעים ושמונה" | **148** | **776** |

These are natural corpus phrases (not system-generated) that (a) round-trip **exactly** against the generator, (b) are byte-identical to the Phase 1 generated forms for 75 and 148, and (c) independently reproduce 75→776 and 148→776 — the same pair Phase 2 found via `graph_support`/`source_support` evidence. This is the single strongest piece of evidence in this pass that the words↔numbers↔gematria loop is a real, pre-existing structure in SOD1820's corpus, not an artifact of the generation exercise.

### 7. Cross-referenced overlaps

- **year_time_audit overlap: 32/570 (5.6%)** — exact phrase match.
- **METHOD_MENTIONS / METHOD_CLAIMS overlap: 61/570 (10.7%)** — exact phrase match. Of these, 21 carry `unresolved_mismatch`, 4 `no_claim_verified`, 4 `candidate_pending`, 2 `engine_verified` (per `METHOD_CLAIMS_PHASE3`'s own existing classification, reused not recomputed) — these 31 rows were **excluded** from the research-findings ranking and the Human-Gate ambiguous list per §9's explicit instruction ("a number attached to a method-instruction is a `claimed_value`, not a numeric-language expression"). 17 are `not_a_method_claim` and 13 `no_claimed_value` — clean to treat as pure numeric-language overlaps.

### 8. Special-number cut (§8) — 111/222/424/45/75/148/216/474/776/1237/1820 + the 50 Strong Numbers

68 rows touch a special number (§0.5 above). Selected pattern breakdown:
- **Type A (words denote the special number directly):** e.g. id 64 "שבע שבע שש"→776 (digit-sequence *literally spelling out anchor 776 itself*, byte-identical to 776's own Phase-1 generated digit-read form).
- **Type B (phrase's own gematria hits a special number, words denote something else):** the 75→776 / 148→776 pair above; also id 1 "אלף"→ragil 111 (word for "1000", whose own gematria is anchor 111); id 30 "מאתיים"→ragil 501 (word for "200", gematria hits research-interest 501).
- **Type C (mixed phrase, number present but not a clean word-form):** id 78 "ארבע עשרה תינוקות" (ragil 1820, no clean parse — "fourteen infants," a real verse fragment, not a number-name); id 101 "את הכבש אחד תעשה בבקר" (Exodus 12:6 fragment, ragil 1820); id 292 "שמע ישראל יה וה אלהינו יה וה אחד" (the Shema, ragil 1118) — see the curated Human-Gate list below.

---

## 12. HUMAN-GATE — curated (per instruction: "don't send hundreds of rows")

**A. HIGH-confidence deterministic (81 rows, closed as a group, no individual review needed):** parse_type A/B/D with a pre-existing high-confidence `parsed_numeric_value`. 71/81 (87.7%) additionally round-trip exactly or near-exactly against the verified generator (§3). Delivered in `NUMBER_WORDS_RECONCILED.csv`.

**B. MEDIUM, rule-based (191 rows, closed as a group):** single safe-token embedded mentions, rule and word-list fully disclosed in §1/`phase5_wordlists.json`. Delivered in `NUMBER_WORDS_RECONCILED.csv`.

**C. TRUE AMBIGUOUS → Human-Gate (22 rows only, `NUMBER_WORDS_AMBIGUOUS.csv`):** risky-word-class rows (אחד/שני-family, per §4) where the phrase's own gematria (ragil) additionally lands on one of the **61 anchors** — a real reason the row matters, not "looked interesting." Excludes anything already explained by a method-claim overlap (§7). This is the list that actually needs a yes/no from Zuriel: *does the theological "one/echad" in this specific verse carry any intended numeric-identity reading, or is the anchor-hit purely a gematria coincidence of the phrase as written?* Examples: id 292 "שמע ישראל...אחד" (ragil 1118, anchor), id 101 "את הכבש אחד תעשה בבקר" (ragil 1820, anchor), id 136 "אמונה באל אחד" (ragil 148, anchor), id 362 "לב אחד" (ragil 45, anchor).

**D. INTERESTING RESEARCH CANDIDATES — NOT a Human-Gate decision, `NUMBER_WORDS_RESEARCH_FINDINGS.csv` (120 rows, ranked):** every row with a self-hit, a generated-existing-match, a special-number flag, or a cross-research hit, excluding rows already explained by method-claim overlap. A findings list for Zuriel to browse, not something requiring approval.

---

## TOP 20 (from `NUMBER_WORDS_RESEARCH_FINDINGS.csv`, ranked by evidence weight: self-hit > generated-existing-match > double special-number hit > single special-number hit > cross-research hit > exact-roundtrip bonus)

| id | phrase | parsed | ragil | type | roundtrip | notes |
|---|---|---:|---:|---|---|---|
| 3 | שבעים וחמש | 75 | 776 | B | exact | **=Phase-1 generated form for 75; reproduces the 75→776 triangle from raw text** |
| 8 | מאה ארבעים ושמונה | 148 | 776 | B | exact | **=Phase-1 generated form for 148; reproduces the 148→776 triangle from raw text** |
| 52 | תשעים | 90 | 820 | B | exact | =Phase-1 generated form for 90 (research-interest number) |
| 64 | שבע שבע שש | 776 | 1344 | A | exact | digit-sequence literally spelling out anchor 776's own Phase-1 digit-read form |
| 67 | שש ארבע ארבע | 644 | 1146 | A | exact | =Phase-1/Strong-Sheet generated digit-read form for 644 (richest corpus number, 80 phrases) |
| 55 | אחת אחת אפס אפס | 1100 | 1100 | A | alt. form | the one true **self-hit** in the whole set: words say 1100, gematria of the phrase is also 1100 |
| 12 | אלפיים וחמש עשרה | 2015 | 1100 | D | exact | =generated Gregorian-year form for 2015 |
| 15 | חמש מאות שלושים ושלוש | 533 | 2123 | B | exact | =generated form for 533 (research-interest) |
| 21 | שלוש מאות חמישים ושמונה | 358 | 1898 | B | exact | =generated form for 358 |
| 24 | ארבע | 4 | 273 | B | exact | =generated form for 4 |
| 29 | מאה | 100 | 46 | B | exact | =generated form for 100 |
| 1 | אלף | 1000 | 111 | B | exact | word "thousand" — its own gematria hits anchor 111 |
| 87 | זמן השבע | 7 (mention) | 474 | E | none | mentions "seven," phrase gematria hits anchor+hub 474 |
| 128 | אלף 12358 | 1000 (mention) | 111 | E | none | phrase gematria hits anchor 111 |
| 2 | עשרים | 20 | 620 | B | exact | phrase gematria hits research-interest 620 |
| 30 | מאתיים | 200 | 501 | B | exact | phrase gematria hits research-interest 501 |
| 70 | אחת ארבע שבע ושתיים | 1472 | 1820 | A | alt. form | digit-sequence reading; phrase gematria hits **1820** |
| 75 | קרית שמונה | 8 (mention) | 1111 | E | none | place-name; phrase gematria hits research-interest 1111 |
| 78 | ארבע עשרה תינוקות | — | 1820 | E | none | no clean word-form parse; phrase gematria hits **1820** |
| 82 | עם אחד | — | 123 | F | none | Human-Gate case (§12.C); phrase gematria hits anchor 123 |

## BOTTOM / NEGATIVE cases (illustrative, not exhaustive)

Most of the 298 "not parsed" rows are unremarkable by design (e.g. id 477 "שני" alone, ragil 360, no special/cross hits — a bare risky-word with no corroborating signal, correctly left unparsed and not flagged for Human-Gate). The clearest negative pattern: the 140 multi-token E/F rows (e.g. "חמש שנים"/"אלף שנים"/"שלוש שנים" = "N years", not a number-sequence) show the mechanism adds nothing when the second token is a unit-noun, not a number-word — exactly the class the instruction's §4 false-positive warning anticipated, now empirically confirmed on real data rather than assumed.

---

## INFERENCE

- The **75/148/776 triangle reappearing independently from raw corpus text** (§6) is the strongest evidence in this whole 5-phase arc that Numeric Language reflects something latent in how SOD1820's own material is written, not only something Phases 1–4's generator manufactured. It is still only 2 rows out of 570 — a striking coincidence-of-independent-discovery, not yet a statistically established pattern.
- **Type C (ordinal/quantity) did not separate cleanly from Type B (cardinal_number)** in this corpus slice. Every row in the prior audit's `numeric_quantity` bucket was a bare number-word phrase functioning as the number's *name* (matching B's own definition), not a quantity-of-something-else phrase without a name reading. Quantity-with-unit phrases (e.g. "שבעים שנה" = "70 years") were already correctly bucketed as `mixed_numeric_phrase` (E) by the prior audit, since the *unit noun makes it a quantity-of-X, not an identity*. This suggests the instruction's A–F taxonomy, applied to *this specific corpus*, effectively collapses B/C into one practical category — disclosed as an inference about this dataset, not a claim that the B/C distinction is meaningless in general.
- The **medium-confidence single-token mentions (191 rows)** are a real, rule-based layer of value (word "denotes X somewhere in this longer phrase"), but by construction they can never be identity-level evidence — their `no_roundtrip` status is not a failure, it is the correct signal that "MENTIONED number" and "PARSED-as-identity number" are genuinely different dimensions, exactly as §3 specifies.
- The 22-row Human-Gate list is dominated by the word **אחד** hitting anchor **1820** repeatedly (5 of 22 rows) — either a real recurring theological-numeric resonance in how SOD1820's canonical texts discuss "אחד" (echad/unity), or simply reflects that 1820 is a common gematria value class that many short phrases land on. This pass cannot distinguish the two without Zuriel's read on the specific verses — hence Human-Gate, not an automatic call.

## RECOMMENDATION (process only — nothing built)

1. If Zuriel confirms any of the 22 Human-Gate rows as intentional numeric-theological readings (not coincidence), that would be new, disclosed `SOURCE_CLAIM` evidence — feeding back into the evidence model used across Phases 2–4, not a reason to build anything yet.
2. A future Phase 6 (not started here) could extend the medium-confidence single-token lookup to handle a *safe* subset of multi-token cases — specifically, phrases where the second token is confirmed (via a small, human-reviewed exception list) to be a genuine second number-word rather than a unit noun — rather than the current blanket "don't parse multi-token" rule, which is safe but conservative (140 rows currently left fully unparsed).
3. If pursued, implementation order for a WORDS→NUMBER parser (not built, not scheduled): (a) formalize the single-token lookup table as a small, versioned, reviewed dictionary (not ad hoc); (b) add a human-reviewed exception list for the small set of genuinely double-number multi-token constructs; (c) keep the risky-word class (אחד/שני-family) permanently un-auto-parsed, always Human-Gate; (d) only after (a)-(c) are stable, consider surfacing parsed_number as a research signal on Number Pages — gated the same way Numeric Language itself was gated in Phase 4 (NOT YET → cleaner sample/control → re-decide).

## HUMAN-GATE (exercised: none — only the 22-row curated list above is *proposed* for Zuriel's review; no promotion, no canonical status assigned to anything in this pass)

---

## 15. FINAL DECISION

**Question:** Is SOD1820 conceptually ready for a bidirectional model — NUMBER ↕ LANGUAGE EXPRESSION ↕ GEMATRIA METHODS ↕ RESEARCH GRAPH?

### Answer: **NOT YET**

**Why not NO:** the evidence is real and non-trivial. 87.7% of high-confidence identity parses round-trip cleanly against the exact same generator verified in Phases 1–4; the corpus independently reproduces the flagship 75/148/776 triangle from raw text; 10 corpus phrases are byte-identical to system-generated forms; 68 rows touch special/anchor numbers; a working, disclosed evidence and confidence model was applied end-to-end across all 570 rows without needing to invent unverifiable claims.

**Why not YES:** parse coverage tops out at 46.7% of the 570 rows (266), and of that, more than two-thirds (191/266) are only medium-confidence *mentions*, not identity parses — by design, these can never round-trip and can never feed a NUMBER→WORDS↔WORDS→NUMBER closed loop with confidence. The risky-word class (אחד/שני-family) accounts for 148 rows left deliberately unparsed, and 140 more rows are multi-token constructs proven — not assumed — unsafe to auto-reconstruct (the "חמש שנים" test case). A bidirectional model needs both directions to be reliable; only the NUMBER→WORDS direction (Phases 1–4) has that reliability today. The WORDS→NUMBER direction, on this pass's evidence, is real but still partial and rule-limited.

### If pursued later: implementation order (recommendation only, not built)
1. Human-review the 22-row Human-Gate list (§12.C) — establishes whether the risky-word/anchor-hit pattern is a real phenomenon worth formalizing.
2. Formalize and version the single-token lookup dictionary (currently ad hoc in this pass's script) as reviewed reference data.
3. Build a small, human-curated exception list for safe multi-token reconstruction (currently 0% attempted, 140 rows sitting unparsed by design).
4. Only then consider a Phase 6 revalidation of round-trip/coverage rates on the expanded parser, using the same disclosed-limitation, evidence-vs-canonicity discipline used throughout Phases 1–5.
5. Any surfacing on Number Pages / "הצלב לי" stays gated behind the same Human-Gate + control-group discipline established in Phase 4 — not assumed to inherit Phase 4's own (NOT YET) verdict automatically, but not assumed to be exempt from it either.

---

## STOP

READ-ONLY throughout. No DB write, no migration, no parser production, no generator change, no edge, no `research_objects`, no `topic_cards`, no UI, no deploy, no Roadmap/Master State change. Closing `work_log` memo (`actor=CLAUDE`, `task=NUMBER_LANGUAGE_PHASE_5`, `status=completed`) logged separately.
