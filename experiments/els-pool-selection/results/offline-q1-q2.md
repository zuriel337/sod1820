# EXP-12 pilot — offline results for questions 1-2 (pool, geometry), 28.10.2026

No model was called. Window: rows 1-31 × columns 1-101 (absolute columns 162-262) of the width-10101 Torah matrix; the axis (the saved cipher's phrase, 7 letters) is local column 51, rows 9-15.
Sources: `evaluation/saved-cipher-u1.json` (read after commit 172344dc0), `evaluation/locate-saved-result.json`, `evaluation/analyse-saved-result.json`, `review/pool-stats.json`. Cells are local (row, column).

## Q1 — are the saved words in the candidate pool?

The saved record stores five words and no positions (Amendment 2). Every occurrence of each word along the registered families was located by exhaustive search and checked letter by letter against the canonical stream.

| saved word | in word list | occurrences in the region (registered families) | candidates | in the pool | lost at |
|---|---|---|---|---|---|
| אירנ (Iran, final letter folded) | **no** | 2: C+ rows 9-12 col 64; C+ rows 9-12 col 86 (skip 10101, E 13.9 each) | 0 | 0 | **word list** |
| ארהב (USA) | **no** | 2: C+ rows 15-18 col 64 (E 14.3); K1+ (12,61)→(18,64) (skip 20203, E 12.7) | 0 | 0 | **word list** |
| סיכנ | **no** | 1: C− (19,65)→(16,65) (E 0.62) | 0 | 0 | **word list** |
| ארהבאששבת (9 letters) | **no** | 1: K1+ (12,61)→(28,69) (skip 20203, E 5.5e-6) | 0 | 0 | **word list** |
| ישראל | yes | 16: 15 on the plain-text row, 1 on C2 (skip 20202, E 0.89) | 4 (the maximal-per-reading rule dropped 12) | 1 (the C2 one, tier B) | shortlist cut (3 plain-text candidates) |

**Verdict for the pair אירנ + ארהב: neither word is in the candidate pool. This is a pool-creation failure (word list), not a model failure.** Why the list misses them, checked read-only:
* `public.gematria_words` has `איראן` as a single word (and `איראני`), but `אירן` only inside multi-word phrases; `ארהב` / `ארה"ב` appear only inside multi-word phrases. The recipe takes single-word rows only.
* The larger (non-public) `maftech_lexicon` holds `איראן` and `ישראל` but not `אירן`, `ארהב` or `סיכן`. A bigger dictionary would not have helped: the failure is spelling variants, abbreviations and modern names, which no word list holds reliably.
* Outside the region: nothing — all five words have occurrences inside it. Outside the registered families: the extended step search found **two more occurrences of ארהב** along steps (1,−4) and (4,1) that the families do not cover (stated limit of the families).
* The first-occurrence choice is not made by me: the record has no positions, so which occurrence the author meant is unknown; both are reported.

## Q2 — is the geometric relation represented correctly?

Relations were computed with the registered definitions (`lib/relations.mjs`) on the located occurrences, and re-checked by arithmetic on raw stream positions.

* **אירנ (rows 9-12, col 64) and ארהב (rows 15-18, col 64) are NOT parallel. They lie on the same column, same direction, two empty cells apart: relation `same_line`, gap 2.** The two letters between them (rows 13-14) are `ו`, `י`; together they form one 10-letter ELS `אירנויארהב` at skip 10101 (checked: ten letters in one arithmetic progression of the canonical stream). Relative to the axis (col 51) both words are on columns parallel to it, 13 columns away: farther than the registered parallel/near limits (6 / 1), so the pool would give them **no relation to the axis**.
* In the diagnostic pool D1 the relation exists in the relation table (R0110, `same_line`, gap 2, F068–F174) and equals the independent computation.
* Real parallel structure around them (all computed): `ארהב` (C+, rows 15-18, col 64) ∥ `סיכנ` (C−, rows 16-19, col 65): `parallel`, offset 1, overlap 3, **opposite directions**; `ארהב` K1 and the 9-letter word share their first four letters (`continuation`, nested); `ארהב` C crosses the 9-letter K1 word at one cell (18,64).
* Connected structure of all located occurrences: 9 members, 15 relations. Three of the members are plain-text `ישראל` rows (each crosses or touches one of the other words); a common word on the plain-text row is weak evidence — the Torah contains it many times.
* **Rank:** the registered pair score ranks continuation/crossing/parallel pairs. `same_line` is not a scored type, so the pair has **no rank** by the registered rule; the parallel pair `ארהב`–`סיכנ` is rank 515 of 558 ELS pairs (1566 of 1609 with plain-text rows). The top ELS pair is a long continuation (11 letters, E 0.013).

## Controls — how many similar groups do the control windows produce?

Same pipeline on 12 tiles of the same text (31 rows × 101 columns, pseudo-axis in the middle column), engine-confirmed pools of 269-300 items.

| measure | real window | real + known words (D1) | control tiles (12): min / median / max |
|---|---|---|---|
| PP (registered): ELS words ≥ 4 letters, parallel, offset ≤ 3, overlap ≥ 3 | 75 | 78 | 41 / 88 / 107 |
| PPA = PXA (registered): both attached to the axis | 34 | 34 | 15 / 41 / 67 |
| collinear pairs (post-hoc): same line, gap ≤ 2, both ELS ≥ 4 letters | 4 | 5 | 2 / 5 / 8 |
| tight groups of ≥ 3 words (post-hoc) | 10 | 11 | 2 / 7 / 11 |
| largest tight group (post-hoc) | 5 | 5 | 5 / 7 / 11 |

The known cluster {אירנ, ארהב, סיכנ} is one tight group of size 3 (rows 9-19, columns 64-65). **Every one of the 12 control tiles holds a tight group at least as large (largest 5-11), and every tile holds at least two collinear ELS pairs.** In word-list terms the geometry alone does not separate this structure from what the method produces anywhere in the text; what makes it stand out is the meaning of the words, which is not something the pool or the relations measure. (Post-hoc measures: defined after the pair was seen; descriptive only; the controls are neighbouring windows of the same text.)

## What the pool cannot see (limits, as found)

Words not in the list (names, abbreviations, spelling variants); lines outside the 11 registered families (two ארהב occurrences found that way); the 6-cell/3-cell relation limits and the packet filter (parallels farther than 3 cells and near pairs with a 4-letter member are not listed); the shortlist cut (300 items; 5-letter plain-text words are cut unless related to the axis); only 4-9 letters; the region bounds (101 columns). The saved record's own choice of occurrences is unknown.
