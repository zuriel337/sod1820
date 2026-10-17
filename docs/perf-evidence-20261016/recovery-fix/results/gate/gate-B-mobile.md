# Recovery gate — arm B

| case | width | valid samples | verdict | space above the person (open task) | what failed / was not run |
|---|---|---|---|---|---|
| blip | 320 | 1/3 | **PASS** | – | all checks pass |
| blip | 390 | 3/3 | **PASS** | – | all checks pass |
| empty | 320 | 3/3 | **PASS** | OPEN (over the limit) | all checks pass |
| empty | 390 | 3/3 | **PASS** | OPEN (over the limit) | all checks pass |
| healthy | 320 | 2/3 | **PASS** | – | all checks pass |
| healthy | 390 | 3/3 | **PASS** | – | all checks pass |
| persist | 320 | 3/3 | **PASS** | OPEN (over the limit) | all checks pass |
| persist | 390 | 3/3 | **PASS** | OPEN (over the limit) | all checks pass |
| recover2 | 320 | 3/3 | **FAIL** | – | return 3 (healthy): layout shifts: FAIL 0.184 (limit 0.1) |
| recover2 | 390 | 3/3 | **PASS** | – | all checks pass |
| retry | 320 | 3/3 | **PASS** | – | all checks pass |
| retry | 390 | 3/3 | **PASS** | – | all checks pass |

PASS 11 · PASS_WITH_NOT_RUN 0 · FAIL 1 · NOT_RUN 0 (limits: CLS ≤ 0.1, reading place ≤ 12 px, failure box above the person ≤ 160 px + its message)
