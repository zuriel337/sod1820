# אהבת תורה — DS-09/DS-10 Five Megillot reconstruction

> Status: 2026-10-22 branch-only research. No database write or deploy.

## Structural correction and source closure

The rows in `אותיות חמש מגילות` (PDF pp.42–43) are not opaque row ordinals.
Each row is the printed Hebrew glyph being counted across five columns: Esther,
Song of Songs, Ruth, Lamentations and Ecclesiastes. The source distinguishes the
five final forms, so DS-09 is a **27 glyphs × 5 Megillot** matrix, not the earlier
22 normalized letters × 5 reconstruction.

The completed source/corpus totals are:

| מגילה | אותיות מקור | אותיות קורפוס | Δ אותיות | תיבות מקור | תיבות בקורפוס | Δ תיבות |
|---|---:|---:|---:|---:|---:|---:|
| אסתר | 12,108 | 12,110 | −2 | 3,045 | 3,045 | 0 |
| שיר השירים | 5,142 | 5,141 | +1 | 1,250 | 1,250 | 0 |
| רות | 4,945 | 4,949 | −4 | 1,294 | 1,294 | 0 |
| איכה | 5,974 | 5,974 | 0 | 1,541 | 1,542 | −1 |
| קהלת | 10,968 | 10,968 | 0 | 2,987 | 2,987 | 0 |

All 135 source cells were transcribed at high resolution. There are eleven
non-zero source/corpus cell deltas, concentrated in eight glyph rows:

| glyph | Megillah | source | corpus | Δ |
|---|---|---:|---:|---:|
| ב | קהלת | 581 | 582 | −1 |
| ה | קהלת | 981 | 980 | +1 |
| ו | שיר השירים | 477 | 476 | +1 |
| ו | רות | 493 | 495 | −2 |
| ו | איכה | 638 | 637 | +1 |
| י | אסתר | 1,176 | 1,178 | −2 |
| י | קהלת | 1,178 | 1,179 | −1 |
| כ | קהלת | 420 | 419 | +1 |
| ך | איכה | 56 | 57 | −1 |
| נ | רות | 154 | 155 | −1 |
| ע | רות | 198 | 199 | −1 |

The 135 source cells sum exactly to all five printed source totals. The clean
corpus's 27 glyph columns independently sum to the five corpus totals above.
This corrects the prior note's assumption that the printed letter totals equal
the corpus totals.

The old `50,045` Esther reading is withdrawn: direct high-resolution inspection
reads `ג׳ אלף מ״ה` = **3,045**, not `נ׳ אלף מ״ה`. The other prior raw readings
`1,005` for Song of Songs and `3,986` for Ecclesiastes are likewise withdrawn;
the source visibly reads **1,250** and **2,987**.

`scripts/research/ahavat-torah-megillot-corpus.mjs` reproduces the full 27×5
source/corpus matrix and the five corpus word totals from unvendored
Koren-aligned MAM JSON.

## Eicha's one word boundary

The independent Open Scriptures MorphHB / Westminster Leningrad Codex witness
(`Lam.xml`, SHA-256
`be68fc6a913313367280c2596e28733ee8cf877c12a65227237733b40d0248c4`)
contains 1,542 ketiv `<w>` elements after qere readings are excluded. It contains
exactly one variant in which **two ketiv word elements become one qere word**:
Lamentations 1:6, `מן־בת` (ketiv) / `מִבַּת` (qere). Collapsing that unique
two-to-one boundary yields the source's 1,541. The boundary is therefore
localized without changing the 5,974-letter ketiv stream.

## Truth state

- **DS-09 row meaning:** CORRECTED AND RESOLVED (27 glyph rows, including finals).
- **DS-09 source/corpus matrix:** CLOSED; 135 source cells transcribed, eleven
  cell deltas preserved, all five source and corpus checksums closed separately.
- **DS-10 source values:** VISUALLY_VERIFIED; the prior Esther anomaly is withdrawn.
- **DS-10 source/corpus comparison:** CLOSED; four exact matches and the sole
  Eicha delta localized to the unique `מן־בת` / `מִבַּת` two-to-one variant.

No DS-09 or DS-10 numeric/transcription action remains.
