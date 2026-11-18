# EXP-25 — discovery first, then Fable: results

Collected 2026-11-18T15:24:15.567Z. Total cost (estimated from usage at list prices, batch 50%): $2.3556. Approved: $10.

| Arm | Model | Seeds | State | Proposals | Verified by engine | Repeats of seeds | New vs discovery | Continued from seeds | Target (האר חשך) | Output tokens | Cost $ |
|---|---|---|---|---|---|---|---|---|---|---|---|
| C1-51-plain | claude-fable-5-1 | 0 | COMPLETE | 25 | 25 | 0 | 22 | 0 | no | 31000 | 0.882705 |
| C1-51-seeds | claude-fable-5-1 | 12 | COMPLETE | 25 | 23 | 0 | 21 | 0 | no | 24571 | 0.72469 |
| C1-52-plain | claude-fable-5-2 | 0 | COMPLETE | 25 | 10 | 0 | 10 | 0 | no | 4727 | 0.180704 |
| C1-52-seeds | claude-fable-5-2 | 12 | COMPLETE | 25 | 15 | 0 | 13 | 0 | no | 6515 | 0.218632 |
| C2-52-plain | claude-fable-5-2 | 0 | COMPLETE | 24 | 11 | 0 | 10 | 0 | - | 4380 | 0.1737 |
| C2-52-seeds | claude-fable-5-2 | 12 | COMPLETE | 22 | 10 | 0 | 9 | 2 | - | 4338 | 0.175144 |

Verified means: the letters are at the claimed cells of the canonical stream and els_verify_occurrence_v1 answered MATCH. It says nothing about meaning; random windows give signals of the same kind (EXP-16).