# MANIFEST — Research Snapshot 2026-08-22

Machine-readable version: `MANIFEST.csv` (138 files, 1 row per physical file).
Built by `_build_snapshot.py` from the session scratchpad. Every checksum/row-count below was verified against the scratchpad original at copy time (see `checksum_verified`/`row_count_verified` columns in the CSV — all MATCH, 0 mismatches).

## Status breakdown

- **PARTIALLY_PERSISTED**: 12 files
- **PERSISTED (this snapshot)**: 4 files
- **SCRATCHPAD_ONLY**: 111 files
- **SUPERSEDED**: 11 files

## By directory

### `era1-classification-batches-superseded/` (9 files)

| filename | phase/task | rows | status | canonical/candidate |
|---|---|---|---|---|
| STEP2_ambiguous62_resolved.csv | Master Classification build steps (era 1) | 62 | SUPERSEDED | candidate (intermediate) |
| STEP3_whatsapp_structured.csv | Master Classification build steps (era 1) | 330 | SUPERSEDED | candidate (intermediate) |
| classification_canonical_core.csv | Corpus DNA — component classification batches (era 1) | 783 | SUPERSEDED | candidate (intermediate) |
| classification_contrib_events.csv | Corpus DNA — component classification batches (era 1) | 1120 | SUPERSEDED | candidate (intermediate) |
| classification_excel_import.csv | Corpus DNA — component classification batches (era 1) | 5883 | SUPERSEDED | candidate (intermediate) |
| classification_low_confidence_resolved.csv | Corpus DNA — component classification batches (era 1) | 986 | SUPERSEDED | candidate (intermediate) |
| classification_messianic_cluster.csv | Corpus DNA — component classification batches (era 1) | 192 | SUPERSEDED | candidate (intermediate) |
| classification_raw_docx.csv | Corpus DNA — component classification batches (era 1) | 7317 | SUPERSEDED | candidate (intermediate) |
| method_mentions_enrichment.csv | Method Mentions — Enrichment Audit (era 1) | 796 | SUPERSEDED | candidate (intermediate) |

### `era1-corpus-dna-whatsapp-intake/` (4 files)

| filename | phase/task | rows | status | canonical/candidate |
|---|---|---|---|---|
| gematria_words_high_trust_candidates.csv | Corpus DNA — WhatsApp intake (era 1) | 293 | SCRATCHPAD_ONLY | candidate |
| gematria_words_wa_classified.csv | Corpus DNA — WhatsApp intake (era 1) | 254 | SCRATCHPAD_ONLY | candidate |
| gematria_words_whatsapp_full_audit.csv | Corpus DNA — WhatsApp intake (era 1) | 330 | SCRATCHPAD_ONLY | candidate |
| gematria_words_whatsapp_unconnected.csv | Corpus DNA — WhatsApp intake (era 1) | 254 | SCRATCHPAD_ONLY | candidate |

### `era1-human-gate/` (4 files)

| filename | phase/task | rows | status | canonical/candidate |
|---|---|---|---|---|
| CORPUS_DNA_GAPS.csv | Corpus DNA — Closing Sequence (era 1) | 10 | SCRATCHPAD_ONLY | findings |
| HUMAN_GATE_FINAL.csv | Corpus DNA — Closing Sequence (era 1) | 4 | PARTIALLY_PERSISTED | awaiting Zuriel |
| HUMAN_GATE_ambiguous_enrichment.csv | Corpus DNA — Human-Gate (era 1) | 62 | SCRATCHPAD_ONLY | candidate |
| HUMAN_GATE_conflicts.csv | Corpus DNA — Human-Gate (era 1) | 120 | PARTIALLY_PERSISTED | candidate |

### `era1-master-classification/` (3 files)

| filename | phase/task | rows | status | canonical/candidate |
|---|---|---|---|---|
| MASTER_CLASSIFICATION.csv | Corpus DNA — Master Classification (era 1) | 15433 | SUPERSEDED | candidate |
| MASTER_CLASSIFICATION_v2.csv | Corpus DNA — Master Classification (era 1) | 15433 | SUPERSEDED | candidate |
| MASTER_CLASSIFICATION_v3.csv | Corpus DNA — Master Classification FINAL (era 1) | 15433 | SCRATCHPAD_ONLY | candidate (extensive, unreviewed) |

### `era1-messiah-research-package/` (1 files)

| filename | phase/task | rows | status | canonical/candidate |
|---|---|---|---|---|
| messiah_research_package_full.csv | Corpus DNA — thematic research package (era 1) | 1463 | SCRATCHPAD_ONLY | candidate |

### `era1-method-mentions/` (5 files)

| filename | phase/task | rows | status | canonical/candidate |
|---|---|---|---|---|
| METHOD_CANDIDATES_RESOLVED.csv | Method Mentions Phase 3 (era 1) — seed of Methods Expansion Phase 1 | 3 | SCRATCHPAD_ONLY | candidate (insufficient_definition) |
| METHOD_CLAIMS_PHASE3.csv | Method Mentions Phase 3 (era 1) — reused in era 2 | 796 | SCRATCHPAD_ONLY | candidate |
| METHOD_MENTIONS_CLASSIFIED.csv | Method Mentions Phase 2 (era 1) — reused in era 2 | 796 | SCRATCHPAD_ONLY | candidate (extensive, unreviewed) |
| METHOD_MENTIONS_HUMAN_GATE.csv | Method Mentions Phase 2 (era 1) | 240 | SCRATCHPAD_ONLY | candidate |
| METHOD_MISMATCH_PATTERNS.csv | Method Mentions Phase 3 (era 1) | 225 | SCRATCHPAD_ONLY | findings |

### `era1-numeric-year-audits/` (2 files)

| filename | phase/task | rows | status | canonical/candidate |
|---|---|---|---|---|
| numeric_word_phrases_audit.csv | era 1 source data — reused as Numeric Language Phase 5 seed | 570 | SCRATCHPAD_ONLY | candidate |
| year_time_audit.csv | era 1 source data — reused in Numeric Language Phase 5 | 111 | SCRATCHPAD_ONLY | candidate |

### `era1-research-dna-architecture/` (3 files)

| filename | phase/task | rows | status | canonical/candidate |
|---|---|---|---|---|
| MULTIDIM_TEST_EXAMPLES.csv | Research DNA v1 (era 1) | 20 | SCRATCHPAD_ONLY | design-proposal supporting data |
| RESEARCH_DNA_ARCHITECTURE.md | Legacy → Research DNA Crosswalk (era 1) |  | PARTIALLY_PERSISTED | design proposal, unreviewed |
| RESEARCH_DNA_PROOF_OF_MODEL.md | Research DNA v1 — Proof of Model (era 1) |  | PARTIALLY_PERSISTED | design proposal, unreviewed |

### `era2-corpus-expansion/` (2 files)

| filename | phase/task | rows | status | canonical/candidate |
|---|---|---|---|---|
| CORPUS_EXPANSION_INTAKE_SPEC.md | Corpus Expansion Phase 1 + Gate Correction |  | PARTIALLY_PERSISTED | design spec, unreviewed |
| INTAKE_DECISION_MATRIX.csv | Corpus Expansion Phase 1 + Gate Correction | 18 | PARTIALLY_PERSISTED | design spec, unreviewed |

### `era2-hebrew-identity/` (3 files)

| filename | phase/task | rows | status | canonical/candidate |
|---|---|---|---|---|
| HEBREW_IDENTITY_FAMILIES.csv | Hebrew Identity Phase 2 | 29 | SCRATCHPAD_ONLY | candidate / pending Human-Gate |
| HEBREW_IDENTITY_HUMAN_GATE.csv | Hebrew Identity Phase 2 | 10 | SCRATCHPAD_ONLY | candidate / pending Human-Gate |
| HEBREW_IDENTITY_PHASE2_REPORT.md | Hebrew Identity Phase 2 |  | SCRATCHPAD_ONLY | candidate / pending Human-Gate |

### `era2-methods-expansion/` (2 files)

| filename | phase/task | rows | status | canonical/candidate |
|---|---|---|---|---|
| METHOD_EXPANSION_REPORT.md | Methods Expansion Phase 1 |  | PARTIALLY_PERSISTED | candidate |
| METHOD_EXPANSION_RESOLUTION.csv | Methods Expansion Phase 1 | 39 | PARTIALLY_PERSISTED | candidate (all 3 REMAIN_CANDIDATE) |

### `era2-numeric-language-phase1/` (3 files)

| filename | phase/task | rows | status | canonical/candidate |
|---|---|---|---|---|
| NUMERIC_LANGUAGE_ANCHORS.csv | Numeric Language Phase 1 | 61 | SCRATCHPAD_ONLY | candidate findings |
| NUMERIC_LANGUAGE_PHASE1_REPORT.md | Numeric Language Phase 1 |  | SCRATCHPAD_ONLY | candidate findings |
| anchor_union.csv | Numeric Language Phase 1 | 61 | SCRATCHPAD_ONLY | derived reference list |

### `era2-numeric-language-phase2/` (3 files)

| filename | phase/task | rows | status | canonical/candidate |
|---|---|---|---|---|
| NUMERIC_CROSS_ANCHOR_NETWORK.csv | Numeric Language Phase 2 | 26 | SCRATCHPAD_ONLY | candidate findings |
| NUMERIC_CROSS_ANCHOR_NETWORK_REPORT.md | Numeric Language Phase 2 |  | SCRATCHPAD_ONLY | candidate findings |
| raw_cross_anchor_paths.csv | Numeric Language Phase 2 | 26 | SCRATCHPAD_ONLY | candidate findings (raw) |

### `era2-numeric-language-phase3/` (2 files)

| filename | phase/task | rows | status | canonical/candidate |
|---|---|---|---|---|
| NUMERIC_LANGUAGE_NETWORK_REPORT.md | Numeric Language Phase 3 |  | SCRATCHPAD_ONLY | candidate findings |
| NUMERIC_LANGUAGE_NETWORK_V1.csv | Numeric Language Phase 3 | 26 | SCRATCHPAD_ONLY | candidate findings, decision NOT YET |

### `era2-numeric-language-phase4/` (6 files)

| filename | phase/task | rows | status | canonical/candidate |
|---|---|---|---|---|
| NUMERIC_LANGUAGE_PHASE4_CONTROL.csv | Numeric Language Phase 4 | 160 | SCRATCHPAD_ONLY | control/baseline data |
| NUMERIC_LANGUAGE_PHASE4_PATHS.csv | Numeric Language Phase 4 | 290 | SCRATCHPAD_ONLY | candidate findings |
| NUMERIC_LANGUAGE_PHASE4_REPORT.md | Numeric Language Phase 4 + Addendum |  | PARTIALLY_PERSISTED | decision report |
| NUMERIC_LANGUAGE_RESEARCH_INTEREST_PATHS.csv | Numeric Language Phase 4 Addendum | 120 | SCRATCHPAD_ONLY | candidate findings |
| NUMERIC_LANGUAGE_RESEARCH_INTEREST_SET.csv | Numeric Language Phase 4 Addendum | 63 | SCRATCHPAD_ONLY | candidate list |
| PHASE4_SAMPLE_representative.csv | Numeric Language Phase 4 | 100 | SCRATCHPAD_ONLY | sampling frame + candidate findings |

### `era2-numeric-language-phase5/` (5 files)

| filename | phase/task | rows | status | canonical/candidate |
|---|---|---|---|---|
| NUMBER_LANGUAGE_BIDIRECTIONAL_REPORT.md | Numeric Language Phase 5 |  | PARTIALLY_PERSISTED | candidate findings, decision NOT YET |
| NUMBER_WORDS_AMBIGUOUS.csv | Numeric Language Phase 5 | 22 | SCRATCHPAD_ONLY | candidate + specific Human-Gate list |
| NUMBER_WORDS_RECONCILED.csv | Numeric Language Phase 5 | 570 | SCRATCHPAD_ONLY | candidate findings |
| NUMBER_WORDS_RESEARCH_FINDINGS.csv | Numeric Language Phase 5 | 120 | SCRATCHPAD_ONLY | candidate findings |
| NUMWORDS_GENERATED.csv | Numeric Language Phase 5 | 61 | SCRATCHPAD_ONLY | candidate (intermediate) |

### `era2-strong-numbers/` (1 files)

| filename | phase/task | rows | status | canonical/candidate |
|---|---|---|---|---|
| NUMERIC_LANGUAGE_STRONG_NUMBERS_METHOD_SHEET.md | Strong Numbers Method Sheet |  | SCRATCHPAD_ONLY | reference sheet |

### `era2-words-names-identity/` (2 files)

| filename | phase/task | rows | status | canonical/candidate |
|---|---|---|---|---|
| WORDS_NAMES_IDENTITY_PROOF.csv | Words/Names/Aliases Phase 1 | 35 | PARTIALLY_PERSISTED | architecture decision (YES) + gap finding |
| WORDS_NAMES_IDENTITY_REPORT.md | Words/Names/Aliases Phase 1 |  | PARTIALLY_PERSISTED | architecture decision |

### `intermediate-caches/` (74 files)

| filename | phase/task | rows | status | canonical/candidate |
|---|---|---|---|---|
| _dummy.json | cross-phase intermediate reference data (era 2) | 0 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| all_rows.json | cross-phase intermediate reference data (era 2) | 15433 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| audit_rows.json | cross-phase intermediate reference data (era 2) | 42 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| candidates.json | cross-phase intermediate reference data (era 2) | 271 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| candidates_refined.json | cross-phase intermediate reference data (era 2) | 190 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| claims.json | cross-phase intermediate reference data (era 2) | 65 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| classification.json | cross-phase intermediate reference data (era 2) | 240 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| consolidated.json | cross-phase intermediate reference data (era 2) | 209 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| decisions_partial.json | cross-phase intermediate reference data (era 2) | 111 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| edge_counts.json | cross-phase intermediate reference data (era 2) | 100 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| exclude_reasons.json | cross-phase intermediate reference data (era 2) | 98 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| final_rows.json | cross-phase intermediate reference data (era 2) | 986 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| full_bucket.json | cross-phase intermediate reference data (era 2) | 330 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| group1.json | cross-phase intermediate reference data (era 2) | 1271 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| group2.json | cross-phase intermediate reference data (era 2) | 43 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| group3.json | cross-phase intermediate reference data (era 2) | 32 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| group4.json | cross-phase intermediate reference data (era 2) | 36 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| group5.json | cross-phase intermediate reference data (era 2) | 16 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| mark_reference_sets.json | cross-phase intermediate reference data (era 2) | 5 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| method_values_batch1.json | cross-phase intermediate reference data (era 2) | 200 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| mm_classified.json | cross-phase intermediate reference data (era 2) | 796 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| mm_expr_chunk_0.json | cross-phase intermediate reference data (era 2) | 100 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| mm_expr_chunk_100.json | cross-phase intermediate reference data (era 2) | 100 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| mm_expr_chunk_200.json | cross-phase intermediate reference data (era 2) | 100 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| mm_expr_chunk_300.json | cross-phase intermediate reference data (era 2) | 13 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| mm_final.json | cross-phase intermediate reference data (era 2) | 796 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| mm_full_batch1.json | cross-phase intermediate reference data (era 2) | 200 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| mm_full_batch2.json | cross-phase intermediate reference data (era 2) | 200 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| mm_full_batch3.json | cross-phase intermediate reference data (era 2) | 200 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| mm_full_batch4.json | cross-phase intermediate reference data (era 2) | 196 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| mm_parsed.json | cross-phase intermediate reference data (era 2) | 796 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| mm_verify_exprs.json | cross-phase intermediate reference data (era 2) | 313 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| mm_verify_needed.json | cross-phase intermediate reference data (era 2) | 329 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| mm_verify_result_0.json | cross-phase intermediate reference data (era 2) | 100 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| mm_verify_result_100.json | cross-phase intermediate reference data (era 2) | 100 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| mm_verify_result_200.json | cross-phase intermediate reference data (era 2) | 100 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| mm_verify_result_300.json | cross-phase intermediate reference data (era 2) | 13 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| new_heb_candidates.json | cross-phase intermediate reference data (era 2) | 19 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| number_node_values.json | cross-phase intermediate reference data (era 2) | 2034 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| overrides.json | cross-phase intermediate reference data (era 2) | 93 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| p3_candidate_rows.json | cross-phase intermediate reference data (era 2) | 37 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| p3_match_mentions.json | cross-phase intermediate reference data (era 2) | 36 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| p3_mismatch_mentions.json | cross-phase intermediate reference data (era 2) | 225 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| p3_mismatches_classified.json | cross-phase intermediate reference data (era 2) | 225 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| p3_provenance.json | cross-phase intermediate reference data (era 2) | 272 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| phase4_all_candidate_paths.json | cross-phase intermediate reference data (era 2) | 290 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| phase4_final_rows.json | cross-phase intermediate reference data (era 2) | 290 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| phase4_pool_evidence.json | cross-phase intermediate reference data (era 2) | 160 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| phase4_rep_all.json | cross-phase intermediate reference data (era 2) | 200 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| phase4_rep_expressions.json | cross-phase intermediate reference data (era 2) | 200 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| phase4_ri_all.json | cross-phase intermediate reference data (era 2) | 126 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| phase4_ri_expressions.json | cross-phase intermediate reference data (era 2) | 126 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| phase4_target_evidence.json | cross-phase intermediate reference data (era 2) | 150 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| phase5_reconciled_rows.json | cross-phase intermediate reference data (era 2) | 570 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| phase5_wordlists.json | cross-phase intermediate reference data (era 2) | 4 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| phase6_rat_rows.json | cross-phase intermediate reference data (era 2) | 18 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| phase6_sat_rows.json | cross-phase intermediate reference data (era 2) | 18 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| phase6_yh_rows.json | cross-phase intermediate reference data (era 2) | 3 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| phase8_candidate_pairs_raw.json | cross-phase intermediate reference data (era 2) | 1108 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| phase8_entity_labels.json | cross-phase intermediate reference data (era 2) | 625 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| phase8_hebrew_words.json | cross-phase intermediate reference data (era 2) | 4834 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| ragil_distribution.json | cross-phase intermediate reference data (era 2) | 2051 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| raw_results.json | cross-phase intermediate reference data (era 2) | 122 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| rep_batch0.json | cross-phase intermediate reference data (era 2) | 60 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| rep_batch1.json | cross-phase intermediate reference data (era 2) | 60 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| rep_batch23.json | cross-phase intermediate reference data (era 2) | 80 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| ri_batch_all.json | cross-phase intermediate reference data (era 2) | 126 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| rows.json | cross-phase intermediate reference data (era 2) | 986 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| strong_batch0.json | cross-phase intermediate reference data (era 2) | 50 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| strong_batch1.json | cross-phase intermediate reference data (era 2) | 50 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| strong_expressions.json | cross-phase intermediate reference data (era 2) | 100 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| strong_numbers_candidates.json | cross-phase intermediate reference data (era 2) | 131 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| strong_numbers_final.json | cross-phase intermediate reference data (era 2) | 50 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |
| wa_rows.json | cross-phase intermediate reference data (era 2) | 330 | SCRATCHPAD_ONLY | intermediate cache, not itself a finding |

### `session-audit/` (4 files)

| filename | phase/task | rows | status | canonical/candidate |
|---|---|---|---|---|
| PERSISTENCE_GAP_REPORT.md | Session Research Persistence Audit |  | PERSISTED (this snapshot) | audit deliverable |
| PROPOSED_PERSISTENCE_PASS.md | Session Research Persistence Audit |  | PERSISTED (this snapshot) | audit deliverable, unexecuted plan |
| SESSION_RESEARCH_INVENTORY.csv | Session Research Persistence Audit | 42 | PERSISTED (this snapshot) | audit deliverable |
| SESSION_RESEARCH_INVENTORY.md | Session Research Persistence Audit |  | PERSISTED (this snapshot) | audit deliverable |
