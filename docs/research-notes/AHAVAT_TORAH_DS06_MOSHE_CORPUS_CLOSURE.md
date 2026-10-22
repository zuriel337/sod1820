# אהבת תורה — DS-06 משה corpus closure

> Status: 2026-10-22 branch-only research. Supersedes the old open row checksums.
> No database write or deploy.

## Result

The apparent per-parasha checksum gaps were transcription errors in visually
similar small numerals, not source arithmetic failures. A clean consonantal
corpus reproduces every layer of the source:

| ספר | source/corpus subtotal |
|---|---:|
| שמות | 290 |
| ויקרא | 86 |
| במדבר | 233 |
| דברים | 38 |
| **Torah** | **647** |

The decisive corrected rows are:

- בא 27, כי תשא 49 and ויקהל 9 (not 26/40/40);
- מצורע 3, קדושים 2 and בחוקותי 3 (not 50/20/50);
- בלק 3 (not 50);
- דברים 3 and האזינו 3 (not 50/50).

All other non-zero source rows match directly. Omitted parashiot are zero.

## Two same-consonant exclusions

A naive consonant-string scan gives 649 because two words spell `משה` without
being the proper name:

- Exodus 12:4 `מִשֶּׂה` — “from a lamb”.
- Deuteronomy 15:2 `מַשֵּׁה` — the loan/creditor form.

Excluding those two produces the source's grammatical-form checksum exactly:

`משה 614 + למשה 13 + ומשה 13 + במשה 4 + ובמשה 2 + כמשה 1 = 647`.

This also explains the source's closing `חוץ ...` language and proves that the
Re'eh homograph was correctly omitted rather than accidentally skipped.

## Verdict

DS-06 is **CLOSED** at all four levels: 39 parasha rows (including printed or
implicit zeros), four book subtotals, six grammatical forms and the Torah total.
The former “five recurring 50s” pattern is withdrawn; each was a ג/נ or related
small-glyph misread.

Reproducer: `scripts/research/ahavat-torah-moshe-count.mjs`.
