# SOD1820 — PERSISTENCE GAP REPORT
Companion to `SESSION_RESEARCH_INVENTORY.csv/.md`. Three groups, per instruction §9. No writes performed; this is risk classification only.

---

## A. SAFE — already persistent enough in the system/repo

- **The corpus itself.** All 15,433 `gematria_words` rows, all 5,889 `nodes`, all 5,100 `edges`, all 212 `topic_cards`, the 13 active `gematria_methods` — every underlying live table this session *read from* is exactly as safe as it was before the session started. Nothing about this research put the corpus itself at risk.
- **The 61 anchors' source data.** `number_anchors`/`number_roots`/`anchor_families`/`calculator_anchors`/`metatron_anchors` are live, pre-existing tables — only the *derived union list* (`anchor_union.csv`) is scratchpad-only, and it is cheaply re-derivable from these live tables on demand (low urgency, not zero-cost).
- **The `word_aliases` + `language_bridge` architecture itself.** Proven sufficient (Words/Names/Aliases Phase 1), unchanged, still 7 rows + 13 nodes — the *mechanism* is safe; what's at risk is only the *unwritten candidate data* that would eventually flow through it.
- **Headline decisions captured in `work_log` prose** (9 artifacts marked PARTIALLY_PERSISTED): the *verdicts* — Numeric Language's NOT YET / YES-provisional split, Methods Expansion's 3× REMAIN_CANDIDATE, Words/Names/Aliases' architecture-YES, Corpus Expansion's gate-correction — are all durably recorded in `work_log` memos this session wrote, and will survive session close. Only the row-level *evidence behind* each verdict is at risk (see Group B).
- **The 6 SUPERSEDED era-1 files** (early classification batches, `MASTER_CLASSIFICATION` v1/v2, `STEP2`/`STEP3`). Their content lives on inside `MASTER_CLASSIFICATION_v3.csv` — losing the superseded intermediates costs nothing beyond the ability to re-trace *how* v3 was built.

## B. AT RISK — exists only in scratchpad or partially

Ranked by a rough combination of research value and total absence of any live footprint:

1. **`MASTER_CLASSIFICATION_v3.csv`** (15,433 rows) — the single largest artifact of the whole session. Confirmed live: NOT reflected in `gematria_words.category` (different, legacy values) or `gematria_words.dna_status` (a different, pre-existing, single-column classification). Zero DB footprint whatsoever.
2. **`METHOD_MENTIONS_CLASSIFIED.csv` / `METHOD_CLAIMS_PHASE3.csv`** (796–797 rows each) — actively reused as primary source data by two later Era-2 phases; losing them breaks re-traceability of those phases' own findings, not just their own.
3. **`numeric_word_phrases_audit.csv` / `year_time_audit.csv`** (570 / 111 rows) — same cross-era dependency risk; the sole source for Numeric Language Phase 5's flagship finding (the organic 75/148/776 rediscovery).
4. **`NUMERIC_LANGUAGE_PHASE4_SAMPLE.csv`** (100 numbers) and **`NUMERIC_LANGUAGE_RESEARCH_INTEREST_SET.csv`** (63 numbers) — irreplaceable without an exact reseed; part of the evidentiary record behind the NOT YET decision.
5. **`NUMBER_WORDS_RECONCILED.csv` + `NUMBER_WORDS_AMBIGUOUS.csv` + `NUMBER_WORDS_RESEARCH_FINDINGS.csv`** (570 + 22 + 120 rows) — the full Words→Numbers reconciliation, including the ready-to-review 22-row Human-Gate list.
6. **`HEBREW_IDENTITY_FAMILIES.csv` + `HEBREW_IDENTITY_HUMAN_GATE.csv`** (29 + 10 rows) — see Group C below; this one is elevated beyond ordinary "at risk" because a real decision now sits on top of it, unlogged.
7. **`messiah_research_package_full.csv`** (1,467 rows) — large, thematically valuable, zero live footprint found by this audit; not independently re-verified this pass (no re-research performed, per instruction).
8. **`NUMERIC_LANGUAGE_STRONG_NUMBERS_METHOD_SHEET.md`** (1,300 live-computed values) — expensive to regenerate if lost.
9. **`METHOD_EXPANSION_RESOLUTION.csv`** (39 rows) — the live-engine test detail behind the 3× REMAIN_CANDIDATE verdict (e.g., the "צד" acronym test against all 13 methods for the 644 anchor).
10. Everything else in `SESSION_RESEARCH_INVENTORY.csv` marked `SCRATCHPAD_ONLY` (27 total) or `PARTIALLY_PERSISTED` (9 total, row-level detail only) — full list and individual risk notes in the CSV, not repeated here.

## C. NEEDS HUMAN DECISION — cannot be safely persisted without Zuriel

1. **Zuriel's chat-only approval of 5 Hebrew-identity spelling-variant families + the דוד↔בן דוד relational classification.** This is not "at-risk research" in the ordinary sense — **a real decision has already been made**, in this conversation, and exists nowhere durable yet (not in `work_log`, not in any table). This is the single most time-sensitive item in this entire audit. **Addressed directly in this task's closing `work_log` memo** (see below) so it does not depend on a future write to survive — logging the decision text is provenance/memo, not a canonical write, and is explicitly what this audit's own closing-memo instruction calls for.
2. **Which mechanism should carry future `lexical_identity`-type intake** — `word_aliases.alias_type='spelling_variant'` (populate existing) vs. a new `research_contributions.intent` value (`lexical_identity`, proposed name-only) vs. something else. Corpus Expansion Phase 1 posed this; not decided.
3. **`MASTER_CLASSIFICATION_v3.csv`'s eventual destination.** Three real options exist (new `gematria_words` columns via migration / one `research_contributions` row per corpus id / a versioned repo file) and picking one is an architecture decision, not a mechanical persistence task — flagged, not decided here.
4. **`messiah_research_package_full.csv`'s intended destination** — `topic_cards` (if meant to seed a convergence card) vs. `research_contributions` (if meant as a raw research dump) is unclear without knowing Zuriel's original intent for this file; not re-researched this pass.
5. **`RESEARCH_DNA_ARCHITECTURE.md` / `RESEARCH_DNA_PROOF_OF_MODEL.md`** — already explicitly marked in `work_log` as `returned_to_zuriel_gpt_for_decision`; still pending, unchanged.
6. **The Roadmap v4→v5 drift** — whether to update the local branch's `SOD1820_MASTER_ROADMAP.md` from a fresh `origin/main` pull is Zuriel's call on timing/branch strategy, not something this audit resolves.

---

## STOP
No writes performed in producing this report. See `PROPOSED_PERSISTENCE_PASS.md` for the exact, not-yet-executed write plan addressing Group B and (where a destination is already clear) Group C item 1.
