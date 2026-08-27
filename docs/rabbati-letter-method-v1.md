# אות רבתי · Rabbati Letter Method v1

Human Gate: ZURIEL · 2026-08-27

## Definition

When an input/source explicitly marks or declares a Hebrew letter as **רבתי / large**, its value under this method is **1000 × its regular gematria value**.

Examples: א רבתי = 1000; ב רבתי = 2000. The method is explicit-context only: an ordinary א remains 1 under רגיל and is never auto-promoted.

## Family

Same extended-letter-value family as **גדול / מנצפ״ך**. Existing `גדול` remains unchanged and continues to mean final-letter values ך=500, ם=600, ן=700, ף=800, ץ=900. `אות רבתי` is a separate method identity that extends the family beyond 900 into the thousands.

## Research basis

Cross-verification performed 2026-08-27. Sources found describing large-letter values include:

- Daf Yomi / Torah numerology material explicitly describing ב׳ רבתי as 2000: https://www.dafyomi.co.il/general/info/torahau/torah_numerology.php?d=13&lan=he&style=print
- Sepher Sephiroth transcription: when written large, Hebrew-letter value is increased one thousandfold; Aleph=1000, Beth=2000, etc.: https://hermetics.net/media-library/kabbalah/crowley-aleister-sepher-sephiroth-part-3/
- Hebrew numeral convention independently confirms א׳=1000, ב׳=2000 for thousands notation (supporting value semantics, not by itself proof of Rabbati method): https://numdic.com/numerals/hebrew

Source acceptance is not engine verification. Engine verification is provided separately by `fn_rabbati`.

## Golden specimen — ZVI 1112

Source claim: `א + יב״ק = 1000 + 112 = 1112` with source explanation `א-1000, אלופו של עולם`.

Canonical verification after admission:

- `fn_rabbati('א') = 1000`
- `fn_ragil('יבק') = 112`
- `1000 + 112 = 1112`

The existing Research Object remains `candidate`; only `engine_verified` was re-verified. No canonical promotion or publication occurred.
