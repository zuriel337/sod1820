# אהבת תורה — DS-09/DS-10 Five Megillot reconstruction

> Status: 2026-10-22 branch-only research. No database write or deploy.

## Structural correction

The rows `א` through `ת` in `אותיות חמש מגילות` (PDF pp.42–43) are not opaque
row ordinals. Each row is the Hebrew letter being counted across five columns:
Esther, Song of Songs, Ruth, Lamentations and Ecclesiastes. DS-09 is therefore a
plain **22 letters × 5 Megillot** matrix.

The clean-corpus totals are:

| מגילה | אותיות מקור/קורפוס | תיבות מקור | תיבות בקורפוס | Δ תיבות |
|---|---:|---:|---:|---:|
| אסתר | 12,110 | 3,045 | 3,045 | 0 |
| שיר השירים | 5,141 | 1,250 | 1,250 | 0 |
| רות | 4,949 | 1,294 | 1,294 | 0 |
| איכה | 5,974 | 1,541 | 1,542 | −1 |
| קהלת | 10,968 | 2,987 | 2,987 | 0 |

The old `50,045` Esther reading is withdrawn: direct high-resolution inspection
reads `ג׳ אלף מ״ה` = **3,045**, not `נ׳ אלף מ״ה`. The other prior raw readings
`1,005` for Song of Songs and `3,986` for Ecclesiastes are likewise withdrawn;
the source visibly reads **1,250** and **2,987**.

`scripts/research/ahavat-torah-megillot-corpus.mjs` reproduces the full 22×5
letter matrix and the five corpus word totals from unvendored Koren-aligned MAM
JSON. The source's five printed letter totals match the reconstructed totals.

## Truth state

- **DS-09 row meaning:** RESOLVED.
- **DS-09 totals and corpus matrix:** COMPUTATIONALLY_REPRODUCED; the 110 source
  cells remain a dedicated final pixel-by-pixel transcription pass.
- **DS-10 source values:** VISUALLY_VERIFIED; the prior Esther anomaly is withdrawn.
- **DS-10 source/corpus comparison:** four exact matches; Eicha source 1,541 versus
  maqaf-split corpus 1,542 remains a localized one-word boundary question.

## Next action

Finish the source-cell transcription for the 22×5 DS-09 matrix, then isolate the
single Eicha word boundary in DS-10 using an independent word-spacing witness.
