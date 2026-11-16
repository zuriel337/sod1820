# Fonts: Hebrew, vowel marks and digits readable, nothing moves when a font arrives (16 November 2026)

ZURIEL 16.11.2026: "עברית וניקוד קריאים, בלי שינוי פריסה כשהגופן מגיע". Branch only (PR #1371); no deployment.

## What changed

- **The body face as WOFF2.** `NotoSansHebrew-Regular/Bold.woff2` are 11.2 KB each, against 27 KB for the TTF. They have the same glyphs and the same character map (checked with fontTools). The TTF stays as the second `src`. The Regular WOFF2 is preloaded instead of the TTF, and the cache rule in `public-reading-deploy/vercel.json` covers both.
- **Local faces with the metrics of the web faces** (`2029.html`, "Sod … Fallback"):
  - Each face is built on Arial-compatible local fonts: Arial, Liberation Sans, Arimo.
  - Each sets `size-adjust` and the ascent, descent and line-gap overrides.
  - There is one face per target face, weight band and script:
    - **Sod Hebrew Fallback:** Noto Sans Hebrew 400 and 700, Hebrew range.
    - **Sod Rubik Fallback:** Rubik, one face per weight 400–900 and per class (Hebrew letters; Latin letters and punctuation; digits; the space). It also stands in for digits and Latin inside body text. *(Afternoon follow-up below; the first version had "Sod Latin Fallback" for body text and Rubik bands at 400, 700 and 850.)*
- **The font stacks** (`src/lib/designTokens.js`; the frame, the article and the first-document frame all read these tokens):
  - body: `'Noto Sans Hebrew','Sod Hebrew Fallback','Rubik','Sod Rubik Fallback',Arial,sans-serif`
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
- ~~The digits still come from Rubik Latin (35 KB, not preloaded) once it arrives, with a matched fallback meanwhile.~~ Fixed in the follow-up below.

## Follow-up (afternoon): one Rubik file for Hebrew text, stand-ins per weight

**What the lab found.** On a phone, Post 192 ("סדר תפילה ל- רפואה שלמה") had two layout shifts of 0.069 each. The header grew by 52 px and then shrank back. The cause was a mixed state of Rubik:
- Google's split puts Hebrew letters in `Rubik-Hebrew.woff2`, which is preloaded, and spaces, digits and punctuation in `Rubik-Latin.woff2` (35 KB), which loads on first use.
- So for a while Hebrew words were drawn in Rubik and their spaces by the local stand-in. The stand-in's space was matched at weight 400 (0.245 em), but the header's chips are 500, where Rubik's space is 0.229 em.
- Each chip has two spaces, so it grew by 0.5 px. Two chips that filled their row exactly (175.6 + 8 + 158.2 of 342 px) wrapped onto a second line, until the Latin file arrived.
- Measured with the real Post 192 row, Chromium 412×839: the header is 288 px with every font and 340 px with only the Latin file held.

**What changed** (`fonts/rubik-faces.py`; `test/fonts-2029-faces.test.mjs` pins the split):
- **`Rubik-Hebrew-Common.woff2` (15.1 KB) replaces `Rubik-Hebrew.woff2` (9.3 KB) as the preloaded Rubik file.** It holds Hebrew, the vowel marks Rubik has, the space, no-break space, digits, and the punctuation of Hebrew prose and of the gematria pages: `! " % ' ( ) + , - . / : ; = ? [ ]` · « » × – — ‘ ’ ‚ “ ” „ • … −. It keeps the features that apply to them: proportional and tabular digits, kerning and vowel-mark positioning.
  - It is cut from the same Rubik 2.3 variable source as Google's two files (`google/fonts`, `ofl/rubik/Rubik[wght].ttf`, sha256 `1b3a7437…4e88`).
  - Against Google's files, outlines and advances show 0 differences in 1,530 glyph and weight pairs. The licence is OFL with no reserved font name.
- **`Rubik-Latin.woff2` now answers only for Latin letters** and the rest of Google's Latin range. The two ranges do not overlap, and together they cover exactly what Google's split covered.
  - A Hebrew page with no Latin letters no longer downloads the Latin file. Post 192 shows none in Rubik.
- **The local stand-in matches each weight.** 'Sod Rubik Fallback' has one face per weight band (400, 500, 600, 700, 800, 900; Arial for 400–500, Arial Bold from 600) and per class:
  - Hebrew letters;
  - Latin letters and punctuation;
  - digits (Rubik's are proportional and 3–22% wider than Arial's);
  - the space (88.2% of Arial's at 400, 66.9% at 900).
  - That is 24 faces instead of 11, about 1 KB more in the document head after gzip. The body stack uses the same stand-in; "Sod Latin Fallback" is gone.
- **One visible difference once the fonts have loaded:** Rubik's own kerning between a Hebrew letter and punctuation now applies, because both come from one file, as in the full font. Examples are `ר:`, `ד?`, `ל-`, `ה"ק`, `ז ·`.
  - In Chromium, 108 strings at weights 400–900, normal and tabular digits: 56 strings are 0.02–1.4 px narrower. With `font-kerning:none` all 108 are identical, so the glyphs and advances are unchanged.
  - Strings of digits only, or of Latin, are identical either way.
- `Rubik-Hebrew.woff2` stays in the repository, unused and without a cache rule. Removing it is a decision for ZURIEL.

**Measured after the change** (Chromium, the built artifact, the real Post 192 row, the post page held before adoption):

| fonts | phone 412×839: header | phone: chips | desktop 1280×900: header |
|---|---|---|---|
| all loaded | 288.14 px | 175.16 + 157.75 px | 272.19 px |
| Latin file never arrives | 288.14 px | 175.16 + 157.75 px | 272.19 px |
| Hebrew file never arrives | 288.14 px | 172.19 + 157.64 px | 272.19 px |
| no web font arrives | 288.14 px | 172.19 + 157.64 px | 272.19 px |

- In every state, the first 40 blocks of the article are in the same place and size, on the phone and on desktop.
- The throttled phone lab (Slow 4G, 4× CPU) on Post 192: CLS 0.000 in one run, against 0.139 before. The confirmation series is in `FOLLOWUPS.md`.
- **Not measured:** Android, which has no Arial (see "Not done or not measured").
