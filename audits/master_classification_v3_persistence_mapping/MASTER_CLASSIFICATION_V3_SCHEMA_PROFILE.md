# MASTER_CLASSIFICATION_v3.csv — Schema Profile

**READ-ONLY analysis. 0 DB writes performed in producing this document.**

Source: `docs/research-archive/2026-08-22-research-snapshot/era1-master-classification/MASTER_CLASSIFICATION_v3.csv`
(extracted read-only from branch `origin/claude/gematria-lists-organization-u39nlj` for this audit; not present on `main` or the working branch).

- **Rows:** 15,433 data rows (confirmed via `wc -l` = 15,434 including header).
- **Columns:** 29.
- **Row identity:** `id` (uuid), one row per `gematria_words.id`. Verified via full set-comparison against the live table (see `MASTER_CLASSIFICATION_V3_RECONCILIATION.csv`): **exact 1:1 match, 0 missing, 0 duplicate, 0 ambiguous joins.**

Classification tags used below: `SOURCE_FACT` · `COMPUTED_FACT` · `CLASSIFICATION` · `INTERPRETATION` · `PROVENANCE` · `CONFIDENCE/REVIEW` · `DISPLAY/ACCESS` · `DERIVED/REDUNDANT`.

---

### 1. `id` — SOURCE_FACT
UUID, 15433/15433 non-null, 15433 distinct (0 dup). Examples: `00022651-c052-4688-bf70-4d6d9eda6228`, `000e29bd-b44b-41f6-bfbf-ac156b861b1a`, `0015d935-c1ef-4e51-ab7e-28c29d603f97`.
Row-identity key. Matches `gematria_words.id` exactly.

### 2. `phrase` — SOURCE_FACT
Text (Hebrew), 15433/15433 non-null, 15431 distinct (2 live duplicate-phrase pairs, pre-existing in `gematria_words`, unrelated to v3). Examples: `אש הגהינם`, `פטריות`, `להלן`, `ברית יסוד`, `פת פלטר`.
100% string-match against live `gematria_words.phrase` for the same `id`.

### 3. `source` — PROVENANCE
Text, 15433/15433 non-null, 162 distinct. Top values: `promoted:raw_docx_v2`(7274), `excel_import`(5883), `sod1820`(416), `wa-vip`(283), `contribution:צבי (OPOC)`(227), `entity_seed_v1`(184), `גיורא בן-יעקוב SMS`(167), `entity_expansion_v1`(112).
100% string-match against live `gematria_words.source` for the same `id` — v3 was built directly from this column.

### 4. `corpus_role` — CLASSIFICATION
Text, 15433/15433 non-null, 11 distinct: `research_vocabulary`(8843), `thematic_corpus`(2858), `research_package`(1713), `public_core`(762), `numeric_word_construct`(704), `archival_raw`(337), `personal_or_restricted`(123), `conversational_noise`(84), `human_review`(6), `duplicate_normalized`(2), `garbage_or_broken`(1).
No live column holds this exact taxonomy; correlates with but does not equal `gematria_words.dna_status` (see reconciliation).

### 5. `primary_confidence` — CONFIDENCE/REVIEW
Text, 15433/15433 non-null, 4 distinct: `high`(9648), `medium`(4460), `low`(995), `reconstructed_step3`(330).
`reconstructed_step3` = the 330 WhatsApp-intake rows.

### 6. `display_recommendation` — DISPLAY/ACCESS
Text, 15433/15433 non-null, 3 distinct: `eligible via existing lens (per corpus_role)`(15217), `hold/restrict`(214), `dedupe-then-display`(2).
An unreviewed recommendation — never applied to the live `visibility_tier`.

### 7. `world_theme` — CLASSIFICATION (dead column)
Text, **0/15433 non-null**. Column exists in the header but was never populated in this research pass.
Live `gematria_words.world` is populated for 1341 rows (5 values) and is NOT reflected here at all.

### 8. `research_package_cluster` — CLASSIFICATION (really a RELATIONSHIP)
Text, 1463/15433 non-null, 16 distinct: `none`(1339), `messianic_claim_linked`(65), `entity_world_geulah`(32), `ysk_1011`(4), `cross_1237`(4), `ysk_1835`(3), `tzvi_786_keter`(3), `sod1820_branch_786`(2), and 8 more singleton/near-singleton cluster names.
Groups multiple rows under a named cluster — a graph edge/relationship candidate, not a per-word attribute.

### 9. `research_package_availability` — DISPLAY/ACCESS
Text, 1463/15433 non-null, 6 distinct: `deep_research`(765), `public_expanded`(565), `internal_only`(47), `public_core`(40), `premium_candidate`(28), `do_not_display`(18).

### 10. `research_package_sensitivity` — DISPLAY/ACCESS
Text, 1463/15433 non-null, 3 distinct: `normal`(1397), `personal_claim`(65), `unverified_community`(1).

### 11. `source_claim_rule` — PROVENANCE
Text, 15433/15433 non-null, 187 distinct. Examples: `short_dictionary_entry`, `short_multiword_dictionary_phrase`, `vip_attributed_wordlist`, `tagged_thematic_animal_world`, `long_verse_maxim_or_list`, `mother_number_convergence_cluster`.
Explains *how* `corpus_role` was derived — audit trail, not an independent fact.

### 12. `method_mention_type` — CLASSIFICATION (research-layer)
Text, 796/15433 non-null, 6 distinct: `research_instruction`(273), `multi_method_instruction`(247), `lexical_use`(137), `method_result_claim`(93), `candidate_method`(37), `method_word_as_subject`(9).

### 13. `method_claim_status` — CONFIDENCE/REVIEW
Text, 796/15433 non-null, 6 distinct: `no_claimed_value`(282), `unresolved_mismatch`(203), `not_a_method_claim`(137), `no_claim_verified`(105), `candidate_pending`(37), `engine_verified`(32).
`engine_verified`=32 maps structurally well onto `research_objects.engine_verified` (existing boolean).

### 14. `method_claim_reason` — INTERPRETATION/PROVENANCE
Text, 796/15433 non-null, 14 distinct. Examples: `research_instruction`(273), `insufficient_context`(166), `lexical_use`(137), `multi_method_instruction`(63), `method_result_claim`(42), `engine_verified_match`(32), `method_alias_issue`(21), `candidate_method:ר"ת (רת)`(16), `candidate_method:ס"ת (סת)`(16).

### 15. `candidate_method_dependency` — CLASSIFICATION (flag)
Text, 796/15433 non-null, 2 distinct: `no`(759), `yes`(37).

### 16. `historical_method_convention` — INTERPRETATION
Text, 32/15433 non-null, 1 distinct value: `value-then-רגיל-suffix convention (control-group grammar)`.

### 17. `numeric_word_category` — CLASSIFICATION
Text, 570/15433 non-null, 4 distinct: `mixed_numeric_phrase`(396), `ambiguous`(93), `numeric_quantity`(54), `numeric_sequence`(27).

### 18. `numeric_word_value` — INTERPRETATION/CLAIM (not COMPUTED_FACT until engine-verified)
Text/int-like, 141/15433 non-null, 67 distinct. Examples: `50`,`12`,`6`,`3`,`2`,`10`,`4`,`200`.
Distinct from `gematria_words.ragil`/`other_value` (engine-computed gematria sums) — this is a parsed "phrase names this number in words" claim, never run through the official engine per `gematria_engine_law`.

### 19. `numeric_instruction_suffix` — CLASSIFICATION (flag)
Text, 51/15433 non-null, 1 distinct value: `yes`.

### 20. `landmark_target_flag` — UNKNOWN
Text, 5/15433 non-null, 1 distinct value: `yes`.
Meaning is not defined anywhere in the snapshot's own docs. All 5 rows are long 1820/1118/1237-anchor phrases. Flagged for Zuriel to clarify — not assigned a destination.

### 21. `year_hebrew` — CLASSIFICATION (really a RELATIONSHIP)
Text, 51/15433 non-null, 17 distinct. Examples: `שנת 2448 (למניין בריאת העולם - AM, לא לועזי)`, `ה'תשע"ו (5776)`, `ה'תשפ"ד (5784, מאוית במילים)`.

### 22. `year_gregorian` — CLASSIFICATION (really a RELATIONSHIP)
Text, 74/15433 non-null, 7 distinct: `2015-2016`,`2015`,`2016`,`2017`,`2023-2024`,`2023`,`2026`.

### 23. `yeartime_category` — CLASSIFICATION
Text, 111/15433 non-null, 5 distinct: `year_in_phrase`(85), `research_year`(10), `date_or_period`(10), `event_year`(4), `ambiguous`(2).

### 24. `temporal_expression_flag` — CLASSIFICATION (flag)
Text, 120/15433 non-null, 1 distinct value: `yes`.

### 25. `normalization_state` — DERIVED/REDUNDANT (build artifact, data-quality bug)
Text, 15433/15433 non-null, **4 distinct values for what should be a single boolean**: `true`(11365), `false`(2618), `True`(1190), `False`(260).
Case-inconsistency across the CSV's multiple build passes — internal pipeline metadata, not project data.

### 26. `duplicate_flag` — CLASSIFICATION (flag, narrow)
Text, 2/15433 non-null, 1 distinct value: `yes`. Rows: `קרח ועדתו`, `בי נשבעתי`.
Does **not** correspond to the 2 real live phrase-duplicate pairs found independently in this reconciliation — v3's notion of "duplicate" is internal to its own multi-batch build merge.

### 27. `garbage_broken_flag` — CLASSIFICATION (flag, closed)
Text, 1/15433 non-null, 1 distinct value: `yes`. Row: `1537 (ן700)`. Consistent with live `is_verified=false` for that row.

### 28. `ambiguity_unresolved_flag` — CLASSIFICATION (flag, closed)
Text, 1/15433 non-null, 1 distinct value: `yes`. Row: `יהוה בעת ההיא` — the single row work_log `491aee81` already named `genuinely_unresolved`.

### 29. `conflict_detail` — PROVENANCE (resolved)
Text, 120/15433 non-null, 2 distinct: ` [RESOLVED: deterministic_rule]`(109), ` [RESOLVED: human_decided]`(11).
Row-level trace of the 120-conflict closure already logged in work_log `ad874cd1`.

---

## Summary by tag

| Tag | Columns |
|---|---|
| SOURCE_FACT | id, phrase |
| PROVENANCE | source, source_claim_rule, method_claim_reason (partial), conflict_detail |
| CLASSIFICATION | corpus_role, world_theme(empty), research_package_cluster, method_mention_type, candidate_method_dependency, numeric_word_category, numeric_instruction_suffix, year_hebrew, year_gregorian, yeartime_category, temporal_expression_flag, duplicate_flag, garbage_broken_flag, ambiguity_unresolved_flag |
| CONFIDENCE/REVIEW | primary_confidence, method_claim_status |
| DISPLAY/ACCESS | display_recommendation, research_package_availability, research_package_sensitivity |
| INTERPRETATION | historical_method_convention, numeric_word_value, method_claim_reason (partial) |
| DERIVED/REDUNDANT | normalization_state (build-artifact, case-inconsistent) |
| UNKNOWN | landmark_target_flag |

No column is a straight duplicate of an existing `gematria_words` column except `phrase` and `source`, which match the live table exactly (proving lineage, not new information). No column should be flattened directly into `gematria_words` as a new value column without a Human-Gate decision — several (`research_package_cluster`, `year_hebrew`/`year_gregorian`) are relationships, not word attributes, and belong in the graph, not a column.
