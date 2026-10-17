# Recovery gate — arm A

| case | width | valid samples | verdict | space above the person (open task) | what failed / was not run |
|---|---|---|---|---|---|
| blip | 320 | 3/3 | **FAIL** | – | return 2 (healthy): layout shifts: FAIL 0.186 (limit 0.1) |
| blip | 390 | 3/3 | **PASS** | – | all checks pass |
| empty | 320 | 3/3 | **PASS** | OPEN (over the limit) | all checks pass |
| empty | 390 | 3/3 | **PASS** | OPEN (over the limit) | all checks pass |
| healthy | 320 | 2/3 | **PASS** | – | all checks pass |
| healthy | 390 | 3/3 | **PASS** | – | all checks pass |
| persist | 320 | 2/3 | **FAIL** | OPEN (over the limit) | return 3: reading place: FAIL 196px (limit 12px) |
| persist | 390 | 3/3 | **FAIL** | OPEN (over the limit) | return 3: reading place: FAIL 196px (limit 12px) |
| recover2 | 320 | 2/3 | **FAIL** | – | return 3 (healthy): layout shifts: FAIL 0.404 (limit 0.1) |
| recover2 | 390 | 3/3 | **FAIL** | – | return 3 (healthy): layout shifts: FAIL 0.252 (limit 0.1) |
| retry | 320 | 2/3 | **PASS** | – | all checks pass |
| retry | 390 | 3/3 | **PASS** | – | all checks pass |

PASS 7 · PASS_WITH_NOT_RUN 0 · FAIL 5 · NOT_RUN 0 (limits: CLS ≤ 0.1, reading place ≤ 12 px, failure box above the person ≤ 160 px + its message)
