# EXP-12 pilot — results (descriptive; no test statistic is claimed)

Spend: pilot USD 2.82562 (cap 8); total USD 31.54855 of 40; remaining USD 8.45145. Blind and diagnostic arms are reported apart and never pooled.

## Blind arms on the real region (B1 unnamed axis, B2 named axis)

| run | model | stop | usd | s | out tok | groups | sizes | connected (any) | claimed relation | names relation | PP groups | tight groups | E>=1 share | errors (other than digits) | phrases ok/all | continuations ok/all |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1-sonnet-1 | sonnet | end_turn | 0.068084 | 109 | 1696 | 10 | 6,4,4,4,2,2,3,5,4,3 | 1 | 10 | 8 | 4 | 4 | 0.622 | 13 (1) | 3/3 | 1/1 |
| B1-sonnet-2 | sonnet | end_turn | 0.068294 | 127 | 1738 | 11 | 9,4,3,4,2,5,4,3,3,5,2 | 1 | 11 | 8 | 3 | 3 | 0.5 | 5 (0) | 3/3 | 1/1 |
| B1-sonnet-3 | sonnet | end_turn | 0.071029 | 127 | 2285 | 11 | 7,4,4,4,6,4,4,5,5,5,3 | 0.964 | 11 | 6 | 5 | 4 | 0.471 | 9 (0) | 5/5 | 2/2 |
| B1-haiku-1 | haiku | end_turn | 0.00374 | 138 | 3040 | 14 | 5,5,6,5,4,3,3,4,4,3,3,3,3,3 | 0.958 | 13 | 9 | 5 | 4 | 0.685 | 54 (30) | 0/1 | 1/2 |
| B2-sonnet-1 | sonnet | end_turn | 0.072006 | 103 | 2483 | 12 | 8,4,4,4,4,5,4,5,4,3,3,4 | 1 | 12 | 6 | 4 | 3 | 0.385 | 12 (0) | 4/4 | 3/3 |
| B2-sonnet-2 | sonnet | end_turn | 0.067526 | 99 | 1587 | 9 | 7,4,4,4,5,5,4,3,6 | 0.956 | 9 | 3 | 3 | 3 | 0.405 | 13 (0) | 3/3 | 1/1 |
| B1-fable-1 | fable | end_turn | 0.59267 | 179 | 11786 | 12 | 3,4,5,6,4,6,6,4,4,4,6,7 | 0.944 | 12 | 8 | 4 | 4 | 0.237 | 32 (10) | 5/7 | 8/8 |
| B2-fable-1 | fable | end_turn | 0.727505 | 244 | 17182 | 12 | 5,4,7,9,5,6,6,4,6,4,4,5 | 0.972 | 12 | 8 | 1 | 1 | 0.138 | 18 (11) | 5/5 | 6/6 |

## Blind arm on control tiles (B3)

| run | model | stop | usd | s | out tok | groups | sizes | connected (any) | claimed relation | names relation | PP groups | tight groups | E>=1 share | errors (other than digits) | phrases ok/all | continuations ok/all |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B3-sonnet-1 | sonnet | end_turn | 0.077625 | 121 | 2134 | 12 | 8,4,3,3,5,5,4,4,4,6,4,3 | 1 | 12 | 4 | 0 | 1 | 0.302 | 26 (5) | 3/3 | 2/2 |
| B3-sonnet-2 | sonnet | end_turn | 0.069924 | 120 | 1970 | 9 | 5,4,3,5,2,4,4,4,4 | 1 | 9 | 4 | 2 | 2 | 0.457 | 14 (1) | 3/3 | 1/2 |
| B3-sonnet-3 | sonnet | end_turn | 0.073518 | 122 | 1460 | 6 | 2,5,6,3,3,3 | 1 | 6 | 3 | 0 | 0 | 0.5 | 10 (0) | 2/2 | 2/2 |
| B3-sonnet-4 | sonnet | end_turn | 0.074157 | 131 | 1622 | 8 | 4,4,4,5,5,4,4,3 | 0.912 | 8 | 4 | 0 | 0 | 0.152 | 13 (1) | 2/2 | 1/1 |
| B3-sonnet-5 | sonnet | end_turn | 0.076762 | 119 | 1885 | 9 | 5,3,3,4,3,2,4,3,3 | 1 | 9 | 6 | 0 | 1 | 0.433 | 14 (2) | 3/3 | 2/2 |
| B3-sonnet-6 | sonnet | end_turn | 0.07101 | 115 | 1875 | 10 | 8,6,3,3,3,3,4,4,6,4 | 1 | 10 | 4 | 1 | 2 | 0.364 | 12 (0) | 3/3 | 2/2 |
| B3-haiku-1 | haiku | end_turn | 0.003889 | 119 | 2512 | 11 | 3,3,4,3,3,3,3,3,3,3,3 | 1 | 11 | 10 | 2 | 2 | 0.441 | 30 (7) | 2/2 | 2/2 |
| B3-haiku-2 | haiku | end_turn | 0.004883 | 120 | 6523 | 9 | 2,3,3,3,3,2,2,2,5 | 1 | 9 | 8 | 2 | 2 | 0.48 | 28 (5) | 4/4 | 2/4 |

## DIAGNOSTIC arms (D1 pool-forced, D2 structure hint) — never counted as blind success

| run | model | stop | usd | s | out tok | groups | sizes | connected (any) | claimed relation | names relation | PP groups | tight groups | E>=1 share | errors (other than digits) | phrases ok/all | continuations ok/all |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| D1-sonnet-1 | sonnet | end_turn | 0.069423 | 106 | 1759 | 10 | 7,3,3,4,4,2,3,3,2,2 | 1 | 10 | 8 | 4 | 3 | 0.818 | 8 (1) | 2/2 | 1/1 |
| D1-sonnet-2 | sonnet | end_turn | 0.069753 | 117 | 1825 | 9 | 7,4,4,4,3,5,5,4,4 | 1 | 9 | 5 | 3 | 3 | 0.525 | 7 (2) | 2/2 | 2/2 |
| D1-fable-1 | fable | end_turn | 0.45724 | 106 | 6164 | 12 | 3,4,3,4,4,4,4,4,4,4,4,4 | 0.958 | 12 | 12 | 5 | 6 | 0.478 | 39 (16) | 2/10 | 7/7 |
| D2-sonnet-1 | sonnet | end_turn | 0.070976 | 122 | 2246 | 12 | 5,6,5,5,4,4,4,3,4,5,5,2 | 1 | 12 | 11 | 10 | 7 | 0.673 | 18 (3) | 4/4 | 2/2 |

## Free proposals (arm F: window letters, no list; every proposal verified by the engine)

| run | model | stop | usd | proposals | verified | by engine | plain text only | not verified | saved words proposed |
|---|---|---|---|---|---|---|---|---|---|
| F-sonnet-1 | sonnet | end_turn | 0.031473 | 20 | 18 | 0 | 18 | 2 | none |
| F-haiku-1 | haiku | end_turn | 0.004134 | 12 | 12 | 1 | 11 | 0 | none |

## Known words in the diagnostic pool (D1)

### D1-sonnet-1

* groups holding both words: 0; all three words: 0; any added item: 1
  * group #6 (pair) F118 F119 — relation named in the reason: yes — "ארהב מוכל בתוך ארהבאששבת על אותו קו, וזה המשך מלא. E של הארוך נמוך מאוד, ולכן זה ממצא נדיר יחסית."
  * single #1 F119 — "ארהבאששבת היא מילה ארוכה עם E נמוך מאוד, ולכן היא הממצא הנדיר ביותר."
  * continuation #1 of F119: before "ושאהמ" after "ר" (engine_confirmed)

### D1-sonnet-2

* groups holding both words: 0; all three words: 0; any added item: 0
  * single #2 F119 — "ארהבאששבת היא מילה ארוכה מאוד עם E נמוך מאוד, לכן נדירה בדילוג הזה."
  * continuation #1 of F119: before "ושאהמ" after "ר" (engine_confirmed)

### D1-fable-1

* groups holding both words: 0; all three words: 0; any added item: 1
  * group #1 (cluster) F118 F119 F173 — relation named in the reason: yes — "F119 ארהבאששבת הוא ממצא נדיר מאוד (E נמוך בסדרי גודל) והוא מכיל את F118 ארהב על אותו קו K1. את אותו קו חוצה F173 ארהב בעמודה, כלומר אותה מילה מופיעה פעמיים בשני דילוגים שונים ונפגשת בתא משותף. מבנה בולט במאגר."
  * single #1 F119 — "ארהבאששבת: E הנמוך ביותר במאגר בפער עצום, רצף ארוך בדילוג K1."
  * continuation #1 of F118: before "ושאהמ" after "אששבתר" (engine_confirmed)

## Arms (means over usable runs)

```json
{
 "B1/sonnet": {
  "runs": 3,
  "usable": 3,
  "usd": 0.2074,
  "groups_mean": 10.667,
  "connected_any_mean": 0.988,
  "groups_with_pp_pair_mean": 4,
  "groups_with_tight_pair_mean": 3.667,
  "errors_total_mean": 9,
  "stability_jaccard": [
   0.588,
   0.63,
   0.667
  ]
 },
 "B1/haiku": {
  "runs": 1,
  "usable": 1,
  "usd": 0.0037,
  "groups_mean": 14,
  "connected_any_mean": 0.958,
  "groups_with_pp_pair_mean": 5,
  "groups_with_tight_pair_mean": 4,
  "errors_total_mean": 54,
  "stability_jaccard": []
 },
 "B2/sonnet": {
  "runs": 2,
  "usable": 2,
  "usd": 0.1395,
  "groups_mean": 10.5,
  "connected_any_mean": 0.978,
  "groups_with_pp_pair_mean": 3.5,
  "groups_with_tight_pair_mean": 3,
  "errors_total_mean": 12.5,
  "stability_jaccard": [
   0.709
  ]
 },
 "B3/sonnet": {
  "runs": 6,
  "usable": 6,
  "usd": 0.443,
  "groups_mean": 9,
  "connected_any_mean": 0.985,
  "groups_with_pp_pair_mean": 0.5,
  "groups_with_tight_pair_mean": 1,
  "errors_total_mean": 14.833,
  "stability_jaccard": [
   0.063,
   0.043,
   0.064,
   0.096,
   0.093,
   0.14,
   0.03,
   0.066,
   0.129,
   0.038,
   0.04,
   0.1,
   0.033,
   0.013,
   0.042
  ]
 },
 "B1/fable": {
  "runs": 1,
  "usable": 1,
  "usd": 0.5927,
  "groups_mean": 12,
  "connected_any_mean": 0.944,
  "groups_with_pp_pair_mean": 4,
  "groups_with_tight_pair_mean": 4,
  "errors_total_mean": 32,
  "stability_jaccard": []
 },
 "B2/fable": {
  "runs": 1,
  "usable": 1,
  "usd": 0.7275,
  "groups_mean": 12,
  "connected_any_mean": 0.972,
  "groups_with_pp_pair_mean": 1,
  "groups_with_tight_pair_mean": 1,
  "errors_total_mean": 18,
  "stability_jaccard": []
 },
 "D1/sonnet": {
  "runs": 2,
  "usable": 2,
  "usd": 0.1392,
  "groups_mean": 9.5,
  "connected_any_mean": 1,
  "groups_with_pp_pair_mean": 3.5,
  "groups_with_tight_pair_mean": 3,
  "errors_total_mean": 7.5,
  "stability_jaccard": [
   0.44
  ]
 },
 "D1/fable": {
  "runs": 1,
  "usable": 1,
  "usd": 0.4572,
  "groups_mean": 12,
  "connected_any_mean": 0.958,
  "groups_with_pp_pair_mean": 5,
  "groups_with_tight_pair_mean": 6,
  "errors_total_mean": 39,
  "stability_jaccard": []
 },
 "D2/sonnet": {
  "runs": 1,
  "usable": 1,
  "usd": 0.071,
  "groups_mean": 12,
  "connected_any_mean": 1,
  "groups_with_pp_pair_mean": 10,
  "groups_with_tight_pair_mean": 7,
  "errors_total_mean": 18,
  "stability_jaccard": []
 },
 "B3/haiku": {
  "runs": 2,
  "usable": 2,
  "usd": 0.0088,
  "groups_mean": 10,
  "connected_any_mean": 1,
  "groups_with_pp_pair_mean": 2,
  "groups_with_tight_pair_mean": 2,
  "errors_total_mean": 29,
  "stability_jaccard": [
   0.037
  ]
 }
}
```
