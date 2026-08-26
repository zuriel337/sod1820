# SOD1820 — Shared Expression Extraction v1 (Contract Freeze)

Status: Foundation contract frozen by Claude session `d8c22ffa`, pending ZURIEL/GPT Challenge. No merge/deploy by this document alone. Branch: `claude/zvi-full-corpus-dossier` @ `bb37e38f`.

Index entry: `project_codex.slug='shared_expression_extraction_v1'`. Active law: `nodes.rule_id='shared_expression_extraction_contract_v1'`. This document is the full semantic specification; the `nodes` row is the compact, queryable pointer + core law text; `project_codex` is the discoverability index. This mirrors the existing `research_intake_foundation_contract` pattern (`docs/sod1820-research-time-and-extensible-laws.md` + `project_codex` row + `nodes` rule) — no competing governance system was created.

## 0. Purpose

SOD1820 has one shared pipeline for turning raw source text (WhatsApp, OCR, channel updates, Writer Intake, future Research Studio input) into structured, checkable gematria/arithmetic expressions **before** the canonical engine calculates anything. This contract is source-agnostic: Zvi and Christina are the writers whose real corpora taught and stress-tested it, but nothing here is Zvi-specific or Christina-specific. It is **not** a Gematria Method Registry (that's `gematria_methods`, live in Supabase), **not** a Raziel prompt, and **not** a new engine or store.

## 1. Core pipeline

```
SOURCE
  → CONTEXT SEGMENTATION       (line/message boundary — analysisFlow.js line-split, Rule R01)
  → EXPRESSION EXTRACTION      (span detection — GEN_SPAN_RE family, specific-format regexes)
  → EXPRESSION AST             (genTokenize/genParseChain — recursive-descent grammar, Rule R26)
  → OPERAND RESOLUTION         (resolveOperand — רגיל-first, matchAnyMethod fallback, Rule R25)
  → CANONICAL METHOD ENGINE    (gematria.js METHODS/DEPTH_METHODS, same fn's client+future-server)
  → ARITHMETIC VERIFICATION    (link-equality check on the AST)
  → TRUTH CLASSIFICATION       (ENGINE_VERIFIED_COMPOSITE / ENGINE_MISMATCH / METHOD_UNRESOLVED — never Claim=Fact)
  → PROVENANCE                 (raw/origRaw/linesUsed/strippedAnnotations — nothing silently discarded)
  → PROJECTION                 (Writer Dossier / Research Studio / future Number Page / Raziel)
```

**Foundation principle:** extraction determines WHAT the writer/source is claiming. The canonical engine determines WHETHER the claim reproduces. AI may interpret/contextualize/rank downstream of this pipeline. AI is never the calculator.

## 2. One-System Law

SOD1820 has **one** Shared Expression Extraction Contract. There must not be a Zvi parser, a Christina parser, a Writer-X parser, a Raziel parser, or an OCR parser as competing semantic systems. A new writer's material can (A) **confirm** an existing shared rule, (B) **extend** an existing shared rule, or (C) **reveal a new candidate rule** — but writer-specific *usage habits* never automatically become system rules. The ability to parse "N פעמים phrase" is shared infrastructure; the fact that a given writer uses it often is Writer Dossier knowledge, not a parser fact. New deterministic rules enter this same registry with provenance, evidence, status, a regression case, and a Human Gate where required.

## 3. The 36-Rule Registry

Columns: **#** · **rule_id** · **short_name** · **status** · **deterministic/interp.** · **provenance** · **consumers** (today, all client-side via `triage.js`/`analysisFlow.js` — no server consumer exists yet, see §6).

Statuses used: `ACTIVE_SHARED` (implemented, general, in the shared contract) · `CANDIDATE_SHARED` (plausible/confirmed general but not yet exercised by a live server consumer) · `OPEN_GAP` (known limitation, not yet implemented) · `REJECTED_REVERTED` (attempted, caused a regression, removed — kept for history) · `NEEDS_MORE_EVIDENCE` (only one writer sample, unconfirmed) · `SUPERSEDED` (replaced by a later, more general rule).

### Group A — Baseline extraction (`analysisFlow.js`, pre-dates the Zvi project)

| # | rule_id | short_name | status | det/interp | provenance | consumers |
|---|---|---|---|---|---|---|
| R01 | line_sentence_split | Split by `\n` and `". "`, never inside `7.10`-style digit-dot-digit | ACTIVE_SHARED | deterministic | BASELINE | WHATSAPP, OCR, WRITER_INTAKE |
| R02 | relation_format_hub | `N = phrase(method) · phrase(method)` cross-method hub notation | ACTIVE_SHARED | deterministic | BASELINE | WHATSAPP, WRITER_INTAKE |
| R03 | equality_chain_cluster | `A=N=B=C` writer-cluster shorthand, skipped if it contains `+`/`×` | ACTIVE_SHARED | deterministic | BASELINE | WHATSAPP, WRITER_INTAKE |
| R04 | split_method_suffix | Trailing method name in parens or as last word (≥2 words left) | ACTIVE_SHARED | deterministic | BASELINE | ALL |
| R05 | sum_equation_named_operands | `A(x)+B(y)=C(z)` — verifies the arithmetic only, never gematria-of-concatenation | ACTIVE_SHARED | deterministic | BASELINE, ZVI | ALL |
| R06 | paren_explicit_value | `phrase(value)` = writer-marked explicit value | ACTIVE_SHARED | deterministic | BASELINE | ALL |
| R07 | gematria_wrapper_after | `"phrase" בגימטריא/שווה/עולה N`, excludes `N פעמים` (routed to product-claim) | ACTIVE_SHARED | deterministic | BASELINE | ALL |
| R08 | quoted_phrase_emphasis | Quoted phrases → low-score `emphasized` signal, not a value claim | ACTIVE_SHARED | deterministic | BASELINE | ALL |
| R09 | meta_stop_list | Reject reference-words (`"כל הפסוק"`, `"שלושתם"`) as computable phrases | ACTIVE_SHARED | deterministic | BASELINE | ALL |
| R10 | valid_phrase_bounds | Hebrew-only, 2-40 chars, ≤6 words, no digits/colons/parens | ACTIVE_SHARED | deterministic | BASELINE | ALL |
| R11 | koll_marker_flag | `"עם הכולל"`/`"בחישוב"` → value is a CLAIM-with-addon, not a raw engine value | ACTIVE_SHARED | deterministic (flag) / interpretive (meaning) | BASELINE | ALL |
| R12 | source_citation_guard | Book-name needs a valid citation format after it, else rejected (`"רות"` inside `"הבחירות"`) | ACTIVE_SHARED | deterministic | BASELINE | ALL |
| R13 | product_claim_anchor | `detectProducts` requires a gematria-anchor word before the number (`"X בגימטריא N פעמים Y"` ≠ `"מופיעה 214 פעמים"`) | ACTIVE_SHARED | deterministic | BASELINE, CHRISTINA (confirmed) | ALL |
| R14 | occurrence_claim_routing | `"'X' מופיע N פעמים"` routed as a checkable text-occurrence claim, not gematria | ACTIVE_SHARED | deterministic | BASELINE | ALL |
| R15 | arithmetic_self_check | Subtraction/multiplication self-check with lookbehind/ahead guards against long numbers/dates | ACTIVE_SHARED | deterministic | BASELINE | ALL |
| R16 | dependency_value_reuse | Value-reuse edge with self-reference guard | ACTIVE_SHARED | deterministic | BASELINE | ALL |
| R17 | cluster_distinct_phrases | Candidate-convergence requires ≥2 **distinct** phrases sharing a value, not repeats | ACTIVE_SHARED | deterministic | BASELINE | ALL |
| R18 | pending_marker | `"X - טרם נבדק"` (incl. misspelling `"טאם נבדק"`) never computed on writer's behalf | ACTIVE_SHARED | deterministic | BASELINE | ALL |
| R19 | date_claim_exclusion | Date/birthday markers routed to timeline, never fed to the gematria engine | ACTIVE_SHARED | deterministic | BASELINE | ALL |

### Group B — Compound-format extractors (`triage.js` Part 1-3, Zvi Full Corpus Pass)

| # | rule_id | short_name | status | det/interp | provenance | consumers |
|---|---|---|---|---|---|---|
| R20 | quantity_product | `N פעמים/× phrase(v)? = result`, parsed as an operation over verified operands | ACTIVE_SHARED | deterministic | ZVI | WHATSAPP, WRITER_INTAKE |
| R21 | two_phrase_product | `phrase(vA) × phrase(vB) = result` | ACTIVE_SHARED | deterministic | ZVI | WHATSAPP, WRITER_INTAKE |
| R22 | number_product_equals_phrase | `numA × numB = phrase` (reverse of R21) | ACTIVE_SHARED | deterministic | ZVI | WHATSAPP, WRITER_INTAKE |
| R23 | phrase_sum_chain | `phrase+phrase(+...)=num+num(+...)=result`, each pair verified before summing | ACTIVE_SHARED | deterministic | ZVI | WHATSAPP, WRITER_INTAKE |
| R24 | engine_match_scan | Phase 5: extraction decides WHAT to check, the engine (all 23 methods) decides WHICH matches — never trust a label blindly | ACTIVE_SHARED | deterministic | ZVI, LIVE_METHOD_REGISTRY | ALL |
| R25 | resolve_operand_ragil_first | Explicit value checked against רגיל first; `matchAnyMethod` fallback only on mismatch | ACTIVE_SHARED | deterministic | ZVI | ALL |

### Group C — General-chain grammar + equation identity (Zvi Unresolved Cleanup Pass)

| # | rule_id | short_name | status | det/interp | provenance | consumers | supersedes |
|---|---|---|---|---|---|---|---|
| R26 | general_chain_grammar | Recursive-descent `Chain:=Link('='Link)* · Link:=Term('+'Term)* · Term:=Factor(TIMES Factor)*` | ACTIVE_SHARED — **named as the contract's core grammar** | deterministic | ZVI | WHATSAPP, WRITER_INTAKE, OCR | R20-R23 (subsumes their shapes generally; they remain as fast-path specific extractors, not deleted) |
| R27 | prefix_skip_string_level | Leading-prefix skip at raw-string level, re-tokenize fresh each attempt | ACTIVE_SHARED | deterministic | ZVI | ALL |
| R28 | prefix_skip_consistency_pref | Collect all valid skip-attempts, prefer internally-consistent chain over first success | ACTIVE_SHARED | deterministic | ZVI | ALL |
| R29 | reserved_word_midrun_break | "כפול"/"פעמים" recognized anywhere inside a multi-word Hebrew run, word-by-word flush | ACTIVE_SHARED | deterministic | ZVI | ALL |
| R30 | gematria_wrapper_silent_drop | `"(ב/ה)?גימטרי[אה](ית)?"` dropped from a merged phrase run without breaking accumulation | ACTIVE_SHARED | deterministic | ZVI, CHRISTINA (confirmed) | ALL |
| R31 | hyphen_list_marker | 2+ consecutive hyphens as a list-marker boundary | **REJECTED_REVERTED** | deterministic (attempted) | ZVI | none — reverted before merge |
| R32 | equation_method_identity_consistency | Equation branch accepts only the SAME method applied consistently on both sides, never brute-forces cross-method equality; ריבוע excluded pre-fix (see R33) | ACTIVE_SHARED | deterministic | ZVI | ALL |
| R33 | ribua_meshulash_label_refusal | Defensive refusal of `method="ריבוע"` label (two untagged extraction paths could disagree) | **SUPERSEDED** by the Method Identity Resolution (§4) — root cause fixed in `analysisFlow.js:normMethod`, defensive branch removed 26.8.2026 | deterministic | ZVI | — |
| R34 | dedupe_general_vs_specific | General-chain "safety net" claim dropped if its span overlaps a specific extractor's captured span | ACTIVE_SHARED | deterministic | ZVI | ALL |

### Group D — Second-writer stress test + implemented gaps (Foundation Closure sessions)

| # | rule_id | short_name | status | det/interp | provenance | consumers | history |
|---|---|---|---|---|---|---|---|
| R35 | vertical_multiline_arithmetic | Vertical/multi-line layout (`72\n27\n=\n99`) requires ≥3 consecutive bare lines, ≥2 numeric, 1 `=` line; synthetic-PLUS + line provenance recorded | ACTIVE_SHARED | deterministic | CHRISTINA (found + confirmed); confirmed zero false-positive against ZVI | WHATSAPP, OCR (future) | `OPEN_GAP → IMPLEMENTED → ACTIVE_SHARED`, 26.8.2026, `extractVerticalArithmetic()` in `triage.js` |
| R36 | trailing_prose_separation | `".."` collapsed to whitespace pre-span-detection (single `.` untouched); stranded PHRASE stripped only when directly before a **real EQ token**, never at end-of-stream | ACTIVE_SHARED | deterministic | CHRISTINA (found + confirmed) | WHATSAPP, OCR (future) | `OPEN_GAP → IMPLEMENTED (buggy end-of-stream variant) → REGRESSION CAUGHT (4 false "verified" tautologies on real Zvi data, e.g. "...=850 בגימטריא 'תכלת'" collapsed to a vacuous 850=850) → FIXED → ACTIVE_SHARED`, 26.8.2026, `stripStrandedTrailingPhrases()` in `triage.js` |

**36/36 preserved.** None deleted. R31 stays in the table with `REJECTED_REVERTED` and its reason. R33 stays with `SUPERSEDED` and a pointer to what replaced it, not silently dropped.

## 4. Method Identity / Alias Contract — קדמי ↔ משולש

**BEFORE (pre-26.8.2026):** `analysisFlow.js:normMethod()` merged `/ריבוע|משולש/` into one label `"ריבוע"` — a provable bug, not a documented alias: the live `gematria_methods` registry has `method_key='ריבוע'` (`fn_ribua`) and `method_key='קדמי'` (`kadmi_calc`) as two **distinct** rows. `triage.js` carried a defensive "refuse to verify method=ריבוע at all" workaround (R33) because the two extraction paths could silently disagree on which of the two real methods a candidate meant.

**AFTER:** Verified directly against the live `gematria_methods` registry (not guessed, not inferred from code comments):
- `method_key='קדמי'` → `display_label = "קדמי · משולש"`. This is the **canonical, live-registry-confirmed alias**: קדמי is officially also displayed/known as "משולש". `normMethod()` no longer merges this into `"ריבוע"`.
- Required structure (already how `triage.js`/`analysisFlow.js` candidates carry this, extended, not replaced):
  - `claimed_method_text` — the writer's original wording, preserved verbatim in provenance (e.g. `candidate.method` as extracted by `splitMethod`/`methodToken`, never rewritten).
  - `resolved_method_identity` — the canonical `method_key` used for engine verification (`METHOD_KEY_MAP["משולש"] = "קדמי"`).
  - `display_alias` — `"קדמי · משולש"`, taken directly from the live registry's own `display_label`, not invented.
- If a writer's claim under the "משולש" label mismatches קדמי, the existing all-methods `engine_matches` scan (R24) automatically checks the rest of the registry (including the specific triangular-family methods, §5) before the claim is reported as unresolved — no separate special-casing needed, no guess forced.

**Genuinely open, honestly reported, not resolved by guess:** bare `"משולש"` is canonically polysemous at the registry level — 5 distinct live `method_key` rows carry `"משולש"` in a `display_label` (see §5). קדמי is the confirmed **default** alias; which of the other 4 a bare, unqualified "משולש" should fall back to (beyond the automatic all-methods scan) remains a Zuriel decision, not resolved here.

## 5. Specific Triangular Method Names — proof of distinctness

Verified directly from the live `gematria_methods` table (`select * from gematria_methods`, 26.8.2026):

| method_key | function | category | Distinguishing note |
|---|---|---|---|
| קדמי (bare "משולש" default alias) | `kadmi_calc` | base | `display_label="קדמי · משולש"` — the only bare-alias-holder |
| משולש גדול | `kadmi_gadol_calc` | depth | conditionally equivalent to קדמי only when `no_final_letters` |
| משולש מילה | `triangle_word_calc` | depth | conditionally equivalent to ריבוע only when `single_word_input` |
| משולש הפוך | `triangle_reverse_calc` | depth | conditionally equivalent to משולש מדרגות only when `single_word_input` |
| משולש מדרגות | `stair_triangle_calc` | depth | position-weighted-sum family, distinct function from all the above |

Each has its **own** `function`/`db_column`/`mathematical_family` — none share a calculation with another. `METHOD_KEY_MAP` in `triage.js` was **not** changed to collapse any of these into קדמי; an explicit specific name (`"משולש גדול"`, `"משולש מילה"`, etc., already recognized verbatim by `methodToken()` in `analysisFlow.js`) resolves to its own exact `method_key` — the **longest/most specific identity wins** over the bare alias, per rule. No calculation function was modified. No new gematria method was created. Regression-confirmed: 0 live Zvi candidates currently carry any of these 5 labels, so this section is a forward-looking contract, not yet exercised by real corpus data — flagged honestly, not overstated.

## 6. Raziel Extension Contract (named, NOT wired this session)

```
SOURCE → SHARED EXPRESSION EXTRACTION → STRUCTURED AST/CLAIM → CANONICAL GEMATRIA ENGINE
  → VERIFICATION → RESEARCH CONTEXT → RAZIEL
```
Raziel explains, interprets, connects, ranks, suggests. Raziel does **not** implement `×`/`פעמים`/`כפול`/sum-chains/method-matching independently inside its own prompt logic — deterministic extraction/calculation stays shared infrastructure (`triage.js`'s grammar, ported to a shared server-callable form, not duplicated). Confirmed this session (background-agent audit of `research-extract`/`wa-raziel`/`number-researcher`/`ai-analyze`/`wa-process`): **no collision exists today** — none of them independently parse compound arithmetic — but **no shared contract exists either**. Classification: **EXTENSION POINT NOW**, not MUST FOUNDATION NOW (nothing breaks by naming this without building it, since nothing server-side collides yet). Not implemented this session.

## 7. OCR / Image Extension Contract (named, NOT wired this session)

```
IMAGE → OCR/VISUAL EXTRACTION → SOURCE REPRESENTATION → SHARED EXPRESSION EXTRACTION
  → ENGINE → CLAIM/FINDING → WRITER DOSSIER / RESEARCH CONTEXT
```
An image is a **source representation**, never a replacement for the underlying claim text (`analysisFlow.js:analyzeOcrSource` already models this: `ocrText` is a communication layer, `image_url` is preserved, OCR output is a CLAIM not a Fact until engine + human approval). OCR must not build its own arithmetic/gematria parser — once OCR text reaches this pipeline, it goes through the exact same §1 pipeline as WhatsApp/channel/writer-intake text. Not implemented/extended this session — the principle is recorded, `analyzeOcrSource` already routes into the same `analyzeFull`, so no code change was required to state this contract truthfully.

## 8. Regression Corpus v1

**Storage mechanism:** this document + the scratchpad scripts used to produce it (`zvi_batch_pass1_v2.mjs` → `zvi_batch_pass2_v2.mjs` → `classify_failures_v2.mjs`, session-local, reproducible against `src/lib/triage.js`/`analysisFlow.js`/`gematria.js` as committed at `bb37e38f`). These are **regression baselines, not eternal product truth** — if a future legitimate parser change alters them, §9 (Contract Change Law) requires recording why.

**ZVI baseline (378 real WhatsApp/channel source messages, re-verified live 26.8.2026, unchanged across this session's fixes):**
`378 sources · 623 extracted artifacts · 288 verified direct · 122 verified composite (410 resolved, 65.8%) · 213 unresolved (57 COMPOSITE_PARSE_GAP, 101 NO_ENGINE_MATCH, 37 PARSER_PROBLEM, 8 ENGINE_MISMATCH, 6 METHOD_UNRESOLVED, 2 INTERPRETATION_NOT_CALCULATION, 2 EXTRACTION_NOISE) · 95 superseded-by-compound simple candidates · 108 duplicate occurrences across 82 groups`. Source rows live in Supabase `research_objects` (`source='zvi_full_corpus_pass'` + `'zvi_unresolved_cleanup_pass'`, `contributor='צבי (OPOC)'`, 297 rows total including 4 legacy).

**CHRISTINA reference examples (real `wa_bot_log` rows, `sender_name='כריסטינה'`, ids cited exactly, proving 5 rules general and 2 rules newly implemented):**
- Vertical arithmetic (R35): `wa_bot_log:346` — `"...72\n27\n=\n99..."`.
- Trailing prose (R36): `wa_bot_log:336`/`346` — `"543 × 4 גילויים.. = 2172"`.
- `×` as operator, pure numeric arithmetic (R2/R5): `wa_bot_log:298` — `"שם ע״ב 72×3=216"`.
- Sum chain, pure numeric, 7 terms (R5 extended): `wa_bot_log:467` — `"ו=6,נ=50,ת=400,ח=8,ז=7,ק=100,ה=5 → 6+50+400+8+7+100+5=576"`.
- One source → multiple artifacts (baseline extraction, general property): `wa_bot_log:465`/`466` — `"עייפות=576"` and `"ונתחזקה=576"` in the same message.
- Writer-move ≠ canonical method: `contributors.dossier_settings.milui_method` for Christina's own hand-decoded custom letter-value table (`ו=12`, non-standard) — proof R14's caution (Group A's `WRITER_METHOD ≠ canonical registry entry` principle) is real and general, not a Zvi-only worry.
- Negative control for R35 (must NOT be swept into a false equation): a bare 2-3 line citation run (`"תהלים"`/`"כז"`) with no numeric line and no `"="` line — structurally rejected, tested in `test_rule35_36.mjs`.

## 9. Contract Change Law

No future agent may silently change shared extraction semantics. Any change affecting this contract must: (1) identify the affected rule(s) by `rule_id`; (2) preserve old behavior/history in this document (never rewrite as if it were always solved — see R35/R36's own history column); (3) provide a real failing example, not a synthetic one; (4) add/update regression coverage (extend `test_rule35_36.mjs` or the Zvi pass1/pass2/classify scripts); (5) state whether the change is `FIX` / `EXTENSION` / `NEW_CANDIDATE_RULE` / `SUPERSESSION` / `REVERT`; (6) rerun Regression Corpus v1 (§8) in full; (7) report before→after counts explicitly (no silent count changes); (8) record provenance (`BASELINE`/`ZVI`/`CHRISTINA`/`LIVE_METHOD_REGISTRY`/`MULTIPLE`/new writer name). A rule that stops being active is never deleted — it becomes `SUPERSEDED` or `REJECTED_REVERTED` with the reason and evidence kept in §3 (Rank, Don't Hide).

## 10. Foundation Expansion Gate — evaluated for Writer 3

| Dimension | Verdict |
|---|---|
| Identity | Sufficient — `contributor` text field + `contributors` table already scope any writer |
| Representations | Sufficient — `research_objects.meta.ext.<domain>.<key>` (ratified convention) covers any writer-specific extension |
| Relations | Sufficient — `edges`/existing convergence layer unaffected by this contract |
| Time/Context | Sufficient — `source_ref`/`created_at` provenance unaffected |
| Provenance | Sufficient — `raw`/`origRaw`/`linesUsed`/`strippedAnnotations`/`claimed_method_text` all preserved end-to-end, none silently discarded |
| Truth Lifecycle | Sufficient — ENGINE_VERIFIED_COMPOSITE/ENGINE_MISMATCH/METHOD_UNRESOLVED unchanged, matches `research_intake_foundation_contract`'s `input≠candidate≠finding≠claim≠canonical≠published` chain |
| Engines | Sufficient client-side (23 methods); **not yet** server-side — see §6 |
| Extensibility | Sufficient — §9 gives a real change process; a 3rd writer's new shape enters as a new rule row, not a fork |
| Human Gate | Sufficient — nothing in this contract auto-promotes; §4's open bare-"משולש" question is correctly left to Zuriel, not guessed |
| Multilingual | **Not evaluated** — this contract is Hebrew-script-specific (`[א-ת]` throughout); a non-Hebrew writer would need new tokenizer character classes, not just new rules |
| Cross-domain connections | Sufficient — this contract sits entirely inside "extraction", doesn't touch `edges`/convergence semantics |

**Future-Capability Challenge:** could another writer expose a missing capability forcing a redesign of the identity/provenance/rule-registry contract? **Yes, one named risk:** a writer who mixes Hebrew and **transliterated/Latin-script** gematria claims (e.g., referencing a value in Latin numerals or a non-Hebrew phrase intended for a different cipher family) would break the `[א-ת]`-only tokenizer assumption baked into `genTokenize`/`HEB_PHRASE`/`validPhrase` throughout both files — that's a real, structural limitation, not a cosmetic one, and would require extending the character classes and possibly the AST's leaf-resolution logic (which currently assumes every PHRASE leaf resolves via Hebrew gematria methods only). Not over-engineered here since no such writer has been observed yet — named per the instruction, not pre-built.

## 11. Drift check (this session)

`origin/main` advanced `862aff23 → 623f6117` during this session (merge of `claude/video-transcription-multilingual-neqwjm`, touching only `src/legacy/legacy.jsx` — audio autostart feature, unrelated subsystem). No collision with `analysisFlow.js`/`triage.js`. This branch's base remains 2 commits behind `origin/main` on an unrelated file; no rebase required for this contract-freeze task, no DRIFT affecting this work.
