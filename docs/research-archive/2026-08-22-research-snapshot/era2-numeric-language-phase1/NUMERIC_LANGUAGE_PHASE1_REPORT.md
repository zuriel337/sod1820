# SOD1820 — NUMERIC LANGUAGE · PHASE 1
Anchor numbers → Hebrew word forms. READ-ONLY design + live engine test. No DB write, no migration, no gematria_words insert, no UI.

---

## 1. Anchor source (live only, not from memory)

Pulled from 5 live tables + the gold-entity flag, per instruction to source only from what already exists:

| Source | Live table | Rows found |
|---|---|---|
| `number_anchors` | general number-facts reference | 35 |
| `number_roots` | kabbalistic root numbers (`world`/`sefira`, `is_active=true`, `space=core`) | 15 |
| `anchor_families` | Metatron-lab discovered-anchor research (`status`: reviewed/featured/approved_anchor/discovered/**rejected**) | 8 |
| `calculator_anchors` | UI quick-pick anchors (`is_active=true`, `source_kind`=root/series) | 24 |
| `metatron_anchors` | Metatron-tier anchor forms (`tier`=primary/variant) | 13 |
| gold entities | `nodes type='entity' and metadata->>'tier'='gold'` (per `golden_entity_law`) | 2 rows, both `value=1820` |

**Union: 61 distinct anchor numbers.** One item carries an explicit non-canonical flag and is kept in the set but never treated as endorsed: `anchor_families.root=1237` has `status='rejected'` — included for completeness (nothing hidden), flagged `anchor_status_flag=rejected` in the CSV. `nodes type='convergence'` was also checked as a candidate anchor source; it turned out to be ~1 number per convergence card with no concentration (a weak existence-signal, not a ranking source), so it was used only downstream (existing-corpus/package checks), not to select the anchor list itself.

## 2. Two Hebrew forms generated per anchor (61 × 2 = 122 expressions)

- **A. `digit_read`** — reads each decimal digit by name in sequence (e.g. 1820 → `אחד שמונה שתיים אפס`).
- **B. `cardinal_wording`** — full Hebrew cardinal spelling (e.g. 1820 → `אלף שמונה מאות ועשרים`), implemented with standard Hebrew number-word grammar (thousands/hundreds construct forms, vav-conjunction only on the true final grammatical unit — verified against 7 known-correct forms, incl. the corpus's own existing convention for 1820, before running any of the 61).

Every generated form carries the required distinction, kept in the CSV/process and never written anywhere: `source_number`, `generated_form`, `generation_type`, `language=he`, `generation_provenance=system`, `generated=true`. **Nothing was inserted into `gematria_words`.**

## 3. Live engine pass

All 122 expressions were run through `fn_all_methods_full(expr, 'public')` — the actual registry-driven sweep (iterates live `gematria_methods where active=true`, currently 13 active methods including `אטבח`/`משולש גדול`), not the narrower `fn_all_methods` (which only computes 3 methods as a fallback for phrases absent from the corpus — confirmed by reading its source live before choosing which function to use). Each expression was also checked against `gematria_words` for an exact existing phrase match.

## 4. What was checked, per instruction 6

- Existing corpus match (exact phrase). Found: **4 / 122**.
- Value in any method == source number (self-hit). Found: **0 / 61 anchors**.
- Value in any method == a *different* anchor in the 61-set (cross-anchor hit). Found: **17 / 61 anchors**.
- Existing convergence at that value — not run as a blanket sweep (out of proof-of-model scope); the 4 existing-corpus matches were checked individually for package/theme notes instead (see below), which is the more direct signal.
- Interesting cross-method hit **within one generated expression** (two+ methods landing on the same value). A structural check first: `גדול`/`רגיל` and `קדמי`/`משולש גדול` trivially coincide whenever the expression contains no final-form letter (ם/ן/ץ/ף/ך) — and diverge the moment it does (e.g. any "tens" word 20–90 ends in ־ים, a final-mem). This is a real, explainable property of the methods themselves, not a discovery, so those two pairs were excluded from "cross-method" counting to avoid reporting a mechanical artifact as a finding. After excluding them: **4 / 122** expressions show a genuine non-trivial cross-method coincidence.
- Package/theme/year link: not inferred — only reported where a **pre-existing** corpus row (one of the 4 exact matches) already carried a note/tag. Found: **3 / 4** of the exact matches carry a pre-existing tag.

## 5. OUTPUT

**`NUMERIC_LANGUAGE_ANCHORS.csv`** — 61 rows, one per anchor number, columns: `number, anchor_status_source, anchor_status_flag, digit_read, digit_read_method_values, cardinal_wording, cardinal_wording_method_values, self_hit_digit_read, self_hit_cardinal_wording, other_anchor_hits_digit_read, other_anchor_hits_cardinal_wording, existing_corpus_match_digit_read, existing_corpus_match_cardinal_wording, cross_method_matches_digit_read, cross_method_matches_cardinal_wording, package_theme_year_links`.

### Summary

- Anchors tested: **61** (122 generated expressions)
- Self-hits (generated form's own gematria == its source number, any method): **0**
- Hit a *different* anchor from the same 61-set: **17**
- Already existed verbatim in the 15,433-row corpus: **4**
- Real (non-trivial) internal cross-method coincidences: **4**
- Package/theme-backed by a pre-existing note: **3**

### Top 20 strongest findings (Rank, Don't Hide — facts only, no interpretation)

| Rank | Number | Score | Evidence |
|---|---|---|---|
| 1 | **148** | 9 | `cardinal_wording` "מאה ארבעים ושמונה" **already exists** in `gematria_words` (`ragil=776`), pre-tagged by a human researcher `notes="שרשרת: [776]"` — independently reproduced live by `fn_all_methods_full` (רגיל=776, matches the stored value exactly). Also: `digit_read` hits אטבח=313, סידורי=111 (both other anchors). |
| 2 | **75** | 7 | `cardinal_wording` "שבעים וחמש" **already exists** (`ragil=776`), same pre-existing tag `"שרשרת: [776]"`, different source row (`wp16571` vs. `148`'s `wp9298`) — i.e. two different anchors' word-forms were independently pre-chained by a human researcher to the same 776, before this exercise ran, and the live engine reproduces both. |
| 3 | **358** | 5 | `cardinal_wording` "שלוש מאות חמישים ושמונה" already exists (`ragil=1898`), tagged `"גם סוד הויה מילוי דמילוי"`. |
| 4 | **50** | 4 | `digit_read` hits אלבם=152, סידורי=75 (both anchors); `cardinal_wording` hits סידורי=75. |
| 4 | **414** | 4 | `digit_read` hits אלבם=358; `cardinal_wording` hits אלבם=474 (both anchors). |
| 4 | **566** | 4 | `digit_read` hits אלבם=152; `cardinal_wording` hits אותיות_אחרי=2216 (both anchors). |
| 4 | **665** | 4 | Same pattern as 566 (identical digit_read/cardinal_wording strings — 665 and 566 are digit-permutations of each other). |
| 8 | **555** | 3 | `digit_read` hits אתבש=216 (anchor); real cross-method coincidence אטבח=אלבם=336 within the same expression. |
| 9–17 | 45, 59, 73, 145, 456, 474, 506, 512, 776, 999, 1948 | 2 each | Single anchor-hit via a secondary method (אלבם/אטבח/גדול/רגיל/מסתתר), or the existing-corpus match for 776 itself (`digit_read` "שבע שבע שש", stored `ragil=1344`, no pre-existing tag). |
| 18 | **111** | 1 | Real 3-way cross-method coincidence: גדול=רגיל=סידורי=39 within `digit_read` "אחד אחד אחד". |

Full per-anchor detail (all 61, both forms, all 13 method values) is in `NUMERIC_LANGUAGE_ANCHORS.csv`.

## 6. Facts, not interpretation (per instruction 8)

- Zero anchor, in either word-form, reproduces its own source number under any of the 13 live methods. This is stated as a plain negative result, not as evidence the direction "doesn't work" — it only means none of these particular 61×2 expressions happen to self-reference numerically.
- The 148/75→776 finding is the one case in this pass with **three independent sources agreeing**: a pre-existing human-tagged corpus row (×2, from two different legacy imports), and a fresh live-engine computation. Presented as a candidate for review, not as a validated discovery — no promotion, no `research_objects` write, no graph write was made.
- 122 expressions generated, only 4 already existed — confirms this pass explored genuinely new ground rather than re-deriving what the corpus already had.

---
*Stopping here per instruction. No WRITE performed anywhere — 0 inserts to `gematria_words`, 0 `research_objects`, 0 migrations, 0 UI.*
