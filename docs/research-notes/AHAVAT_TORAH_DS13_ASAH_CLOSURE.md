# אהבת תורה — DS-13 עשה closure

> Status: 2026-10-22 branch-only research. No database write or deploy.

## Source contract

PDF pp.69–70 count words from the root עשה across the Mishkan span, Exodus
25:1–40:38. The table prints five already-adjusted parasha rows:

| פרשה | מקור | קורפוס |
|---|---:|---:|
| תרומה | 62 | 62 |
| תצוה | 48 | 48 |
| כי תשא | 24 | 24 |
| ויקהל | 84 | 84 |
| פקודי | 36 | 36 |
| **Subtotal** | **254** | **254** |

The earlier transcription `תרומה=42` is rejected; the glyph is `ס״ב=62`.

## Reproduction

The Koren-aligned MAM consonantal corpus contains 268 עשה-root candidates in
that span after unrelated עש״ר lexemes (numbers and `העשיר`) are removed.

1. The source excludes fourteen Golden-Calf forms: every candidate in Exodus
   32 plus `אלהי מסכה לא תעשה לך` at Exodus 34:17. This produces the five
   printed rows and subtotal 254.
2. The source's closing prose excludes six acts attributed to God rather than
   people: `עשה` at 31:17; `אעשה` at 33:5, 33:17 and 34:10; and `מעשה` plus
   `עשה` at 34:10.
3. `254 − 6 = 248`, exactly the printed `רמ״ח` conclusion.

The surviving grammatical-form frequencies also sum to 248. Two useful
cross-checks are `ועשית=51` and `ויעש=42`, both directly reproduced. The old
mechanical reading that treated apparent `ר׳` glyphs as 200-valued cells was a
right-to-left line-association error, not a real pair of 200 counts.

## Verdict

DS-13 is **CLOSED** at all available levels: span, lexical filter, five parasha
rows, fourteen Golden-Calf exclusions, six divine-action exclusions,
grammatical-form checksum and final 248.

Reproducer: `scripts/research/ahavat-torah-asah-count.mjs` (external corpus is
required and is not vendored).
