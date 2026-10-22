# אהבת תורה — DS-03 word-count reconciliation

> Status: branch-only research correction, 2026-10-22. No database write, merge,
> deploy, canonical promotion, or Production change.

## Outcome

The apparent `79,976 ↔ 110,976` source contradiction is closed. The final line of
the `תיבות התורה` table on PDF p.41 reads:

`ס״ה ע״ט אלף תתקע״ו`

The disputed glyph is **ט**, not final **ם**. The normalized author count is
therefore **79,976**. The earlier `110,976` reading is withdrawn as a visual
transcription error; it is not preserved as a competing source value.

This does **not** close the whole DS-03 dataset. The Torah-total source witness is
closed, while the per-parasha rows and an edition-specific clean word-boundary
reproduction remain partial.

## Direct source witnesses

The same total is not confined to two passages. A targeted full-PDF search followed
by direct visual inspection found five explicit witnesses:

| PDF page | Local wording | Status |
|---|---|---|
| 12 | `חפשתי ומצאתי כי בתורה יש ע״ט אלף תתקע״ו תיבות` | VISUALLY_VERIFIED |
| 25 | `... מתיבות התורה אשר הם ע״ט אלף תתקע״ו` | VISUALLY_VERIFIED |
| 30 | `בכל התורה יש ע״ט אלף תתקע״ו תיבות` | VISUALLY_VERIFIED |
| 41 | `ס״ה ע״ט אלף תתקע״ו` | VISUALLY_VERIFIED; corrects the prior p.41 read |
| 51 | `כי בתורה יש ע״ט אלף תתקע״ו תיבות` | VISUALLY_VERIFIED |

Source object: `book:hebrewbooks:5635`

PDF SHA-256: `895e9a720d984adf8ea453b644e3f6d0864e101238f348f418aa5fafa20e9c8b`

## Reproducible local-corpus diagnostic

`scripts/research/ahavat-torah-word-count.mjs` audits the repository's Torah
display projection without pretending that it is a clean word corpus:

| Measure | Result |
|---|---:|
| Torah verses in `tk-vtext.txt` | 5,846 |
| whitespace tokens | 80,849 |
| standalone `פ` / `ס` section markers | 670 |
| display words after marker removal | 80,179 |
| delta from the author's 79,976 | +203 |
| Hebrew letters in the display projection after marker removal | 305,599 |
| canonical Torah letters in `tk-letters.txt` | 304,805 |
| letter delta | +794 |

The 80,179 result is therefore **not** a failed verification of the author. The
repository documentation identifies `tk-vtext.txt` as a verse-display projection,
and the file visibly contains edition/variant annotations such as
`בספרי ספרד ואשכנז`. Its 794-letter surplus independently proves that it is not the
same population as the canonical 304,805-letter Torah stream.

For context only, an independently published Koren-based counter reports 79,977
words and explicitly attributes its one-word difference from the common 79,976
reference to a borderline word-division case. This is corroboration, not a local
canonical verification:
`https://codigos.elevalma.com/en/blog/numeros-tanaj-versiculos-palabras-letras`
(read 2026-10-22).

## Truth-state split

- **SOURCE TOTAL:** CLOSED / VISUALLY_VERIFIED — 79,976, five witnesses.
- **PRIOR 110,976 READING:** CORRECTED / WITHDRAWN.
- **LOCAL DISPLAY-PROJECTION AUDIT:** REPRODUCIBLE — 80,179 under the declared
  whitespace contract, but unsuitable for canonical word-total verification.
- **PER-PARASHA TABLE:** PARTIAL — dense cells and subtotals are not fully closed.
- **CLEAN EDITION-SPECIFIC WORD-BOUNDARY REPRODUCTION:** OPEN — requires a clean
  ketiv-only text with an explicit maqaf/qere/word-division contract.

## Next action

Build or import one clean ketiv-only Koren-aligned word corpus whose 304,805-letter
stream hashes to the existing canonical Torah letters, preserve explicit word
boundaries, and isolate the single 79,977/79,976 boundary decision. Do not use
`tk-vtext.txt` as the canonical word-count source.
