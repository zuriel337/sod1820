# Fonts: Hebrew, vowel marks and digits readable, nothing moves when a font arrives (16 November 2026)

ZURIEL 16.11.2026: "עברית וניקוד קריאים, בלי שינוי פריסה כשהגופן מגיע". Branch only (PR #1371); no deployment.

## What changed

- **The body face as WOFF2.** `NotoSansHebrew-Regular/Bold.woff2` are 11.2 KB each, against 27 KB for the TTF. They have the same glyphs and the same character map (checked with fontTools). The TTF stays as the second `src`. The Regular WOFF2 is preloaded instead of the TTF, and the cache rule in `public-reading-deploy/vercel.json` covers both.
- **Local faces with the metrics of the web faces** (`2029.html`, "Sod … Fallback"):
  - Each face is built on Arial-compatible local fonts: Arial, Liberation Sans, Arimo.
  - Each sets `size-adjust` and the ascent, descent and line-gap overrides.
  - There is one face per target face, weight band and script:
    - **Sod Hebrew Fallback:** Noto Sans Hebrew 400 and 700, Hebrew range.
    - **Sod Latin Fallback:** Rubik Latin, used for digits and Latin inside body text, 400 and 700.
    - **Sod Rubik Fallback:** Rubik Hebrew and Rubik Latin, at weights 400, 700 and 850.
- **The font stacks** (`src/lib/designTokens.js`; the frame, the article and the first-document frame all read these tokens):
  - body: `'Noto Sans Hebrew','Sod Hebrew Fallback','Rubik','Sod Latin Fallback',Arial,sans-serif`
  - display and UI: `'Rubik','Sod Rubik Fallback','Noto Sans Hebrew',Arial,sans-serif`
- **Why that order:**
  - While Noto is on its way, Hebrew body text is drawn by its own metric-matched fallback, never by Rubik first. Rubik's Hebrew is 5% narrower, which would mean two swaps.
  - Digits and Latin, which the Noto subset does not contain, wait for Rubik Latin on a Rubik-matched fallback.
- **If a web font never arrives**, the matched local face stays. Hebrew, vowel marks and digits remain readable: Liberation Sans and Arial include Hebrew, the 24 vowel-mark code points and digits.

## How the numbers were measured (`fonts/fallback-metrics.py`)

The advance widths of a Hebrew sample (the opening of Genesis plus common words) and of a digits-and-Latin sample were measured with fontTools for:
- each web face, with variable Rubik instanced at each weight;
- Liberation Sans Regular and Bold, which are metric-compatible with Arial.

- `size-adjust` = web width ÷ local width.
- `ascent-override` = web ascent ÷ size-adjust; the same for descent.

| face | size-adjust | ascent | descent |
|---|---|---|---|
| Noto 400 (Hebrew) | 100.6% | 106.2% | 29.0% |
| Noto 700 (Hebrew) | 99.1% | 107.7% | 29.5% |
| Rubik Hebrew 400 / 700 / 850 | 94.8% / 92.5% / 95.1% | 98.6–101.1% | 26.3–27.0% |
| Rubik Latin 400 / 700 / 850 | 98.9% / 104.7% / 109.2% | 85.7–94.5% | 22.9–25.3% |

Coverage of the subsets (`fonts/font-coverage.py`):
- **Noto Sans Hebrew:** Hebrew letters, the vowel marks U+0591–05C7, space and hyphen. No digits and no Latin.
- **Rubik Hebrew:** Hebrew.
- **Rubik Latin:** ASCII and Latin-1.

## Measured in Chromium

A Post with a long title (digits, a vowelled word, Latin) and twelve paragraphs was measured twice, with the web fonts loaded and with every font request failing. It was measured per heading and paragraph: the number of lines and the summed line width.

| | old stacks | new stacks |
|---|---|---|
| title (Rubik), width with fallback vs loaded | +4.9% (phone and desktop) | −1.2% |
| mean width difference, all 17 blocks | 1.0% | 0.3–0.4% |
| line count differences | 0 | 0 |

In this sample no line changed in either case; the margin before a line breaks differently is now about four times larger.

## Not done or not measured

- Devices whose only fallback is not Arial-compatible were not measured. Android has no Arial, so a Rubik-matched face cannot load there and the browser's own Hebrew font, Noto on most phones, draws the text meanwhile.
- No screenshots of the swap moment.
- The digits still come from Rubik Latin (35 KB, not preloaded) once it arrives, with a matched fallback meanwhile.
