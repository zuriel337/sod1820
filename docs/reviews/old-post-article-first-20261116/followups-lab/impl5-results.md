# The first-paint guard: is it costly? (16.11.2026, 14:17–14:29 UTC)

- **C:** `9852baf0b` as built, without analytics IDs.
- **U:** the same documents without the guard: no class on `<html>`, no removal script, selectors as authored (`lab2.mjs`, `fixture.unboost`).
- **Setup:** phone, Slow 4G, 4× CPU; blocks interleaved C U U C; n = 6 per post and arm; p is Mann–Whitney.

| post | text C / U (ms) | page ready C / U (ms), p | long tasks C / U (ms), p | CLS C / U | adopted C / U |
|---|---|---|---|---|---|
| O1 | 1,712 / 1,712 | 7,573 / 7,538, p 0.82 | 922 / 880, p 0.39 | 0.000 / 0.000 | 6/6 / 6/6 |
| O3 | 1,782 / 1,860 | 7,458 / 7,384, p 0.70 | 894 / 844, p 0.39 | 0.000 / 0.000 | 6/6 / 6/6 |
| V1 | 1,738 / 1,734 | 7,326 / 7,395, p 0.31 | 812 / 776, p 0.48 | 0.002 / 0.002 | 6/6 / 6/6 |
| M1 | 1,754 / 1,730 | 7,780 / 7,750, p 0.59 | 942 / 780, p 0.59 | 0.000 / 0.000 | 6/6 / 6/6 |

**No measurable cost.** None of these differences is significant (p 0.31–0.82):
- page ready: −74 to +68 ms;
- long tasks: −36 to −162 ms.

**Variation between series.** The same build, C, measured in two separate series (impl4 and impl5), differs by 140–320 ms in page ready.
