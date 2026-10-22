# אהבת תורה — DS-04 letter-count reconciliation

> Status: branch-only research correction, 2026-10-22. No database write, merge,
> deploy, canonical promotion, or Production change.

## Outcome

The `אותיות התורה` summary table on PDF pp.41–42 is fully transcribed and
arithmetically closed. The final source line reads:

`ס״ה ש״ד אלף תתי״ב`

That is **304,812**. The last numeral is unambiguously `תתי״ב`; the prior
304,830 candidate is withdrawn as a glyph/OCR error.

The source's 54 per-parasha rows sum exactly to its five printed cumulative
checkpoints and to 304,812. An independent reconstruction over the already-pinned
304,805-letter ketiv stream gives **304,805**. The residual **+7** is therefore a
real source-versus-corpus difference, not a remaining transcription ambiguity.

Source object: `book:hebrewbooks:5635`

PDF SHA-256: `895e9a720d984adf8ea453b644e3f6d0864e101238f348f418aa5fafa20e9c8b`

Canonical Torah SHA-256:
`9692eb34eca2f7a10f6e828d04b3dac50d5b0b688bf1d74d6936a6bd2fb92be4`

## Cumulative checkpoints

The checkpoints are cumulative, not independent book totals.

| ספר שהושלם | מקור מצטבר | קורפוס מצטבר | Δ | סכום ספר במקור | סכום ספר בקורפוס |
|---|---:|---:|---:|---:|---:|
| בראשית | 78,068 | 78,064 | +4 | 78,068 | 78,064 |
| שמות | 141,596 | 141,593 | +3 | 63,528 | 63,529 |
| ויקרא | 186,386 | 186,383 | +3 | 44,790 | 44,790 |
| במדבר | 249,917 | 249,913 | +4 | 63,531 | 63,530 |
| דברים | 304,812 | 304,805 | +7 | 54,895 | 54,892 |

## Eleven differing parasha rows

Forty-three rows match exactly. Eleven printed values differ from the canonical
verse-bounded reconstruction by one letter each:

| ספר | פרשה | מקור | קורפוס | Δ |
|---|---|---:|---:|---:|
| בראשית | נח | 6,908 | 6,907 | +1 |
| בראשית | לך לך | 6,337 | 6,336 | +1 |
| בראשית | וישלח | 7,459 | 7,458 | +1 |
| בראשית | מקץ | 7,915 | 7,914 | +1 |
| שמות | בשלח | 6,422 | 6,423 | −1 |
| במדבר | שלח | 5,819 | 5,820 | −1 |
| במדבר | בלק | 5,358 | 5,357 | +1 |
| במדבר | פינחס | 7,854 | 7,853 | +1 |
| דברים | דברים | 5,973 | 5,972 | +1 |
| דברים | ראה | 7,443 | 7,442 | +1 |
| דברים | שופטים | 5,591 | 5,590 | +1 |

The signed deltas sum to `(+9) + (−2) = +7`. This independently explains the
304,812 source total without changing any source cell or forcing the source onto
the canonical corpus.

## Reproduction

`scripts/research/ahavat-torah-parasha-letter-count.mjs` counts Hebrew letters
inside the same 54 traditional parasha boundaries used for DS-03. It strips
non-Hebrew marks and normalizes final forms one-for-one, preserving the exact
304,805-letter sequence.

```sh
node scripts/research/ahavat-torah-parasha-letter-count.mjs \
  --mam-dir /path/to/elev-alma-corpus
```

The external ElevAlma files are comparison inputs and remain unvendored.

## Truth-state split

- **SOURCE TRANSCRIPTION:** CLOSED — 54 rows and five cumulative checkpoints.
- **SOURCE ARITHMETIC:** CLOSED — the printed rows sum to 304,812.
- **FINAL GLYPH:** CLOSED — 304,812; the 304,830 candidate is withdrawn.
- **CANONICAL CORPUS:** CLOSED — 304,805, exact stream fingerprint pinned.
- **SOURCE ↔ CORPUS RELATION:** CLOSED AS A MISMATCH — +7, localized to eleven
  one-letter row deltas; the mismatch is preserved rather than silently corrected.

## Next action

DS-04 has no remaining transcription or arithmetic ambiguity. The next numeric
material is the `אותיות חמש מגילות` / `תיבות` matrix on pp.42–43 (DS-09/DS-10),
whose row-unit interpretation and prior Esther anomaly remain open.
