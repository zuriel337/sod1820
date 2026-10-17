# Recovery gate — arm A

| case | width | valid samples | verdict | space above the person (open task) | what failed / was not run |
|---|---|---|---|---|---|
| blip | 1440 | 3/3 | **PASS** | – | all checks pass |
| blip | 1920 | 3/3 | **PASS** | – | all checks pass |
| empty | 1440 | 3/3 | **PASS** | OPEN (over the limit) | all checks pass |
| empty | 1920 | 3/3 | **PASS** | OPEN (over the limit) | all checks pass |
| healthy | 1440 | 3/3 | **PASS** | – | all checks pass |
| healthy | 1920 | 3/3 | **PASS** | – | all checks pass |
| persist | 1440 | 3/3 | **PASS** | OPEN (over the limit) | all checks pass |
| persist | 1920 | 3/3 | **PASS** | OPEN (over the limit) | all checks pass |
| recover2 | 1440 | 3/3 | **FAIL** | – | return 3 (healthy): layout shifts: FAIL 0.192 (limit 0.1) |
| recover2 | 1920 | 3/3 | **FAIL** | – | return 3 (healthy): layout shifts: FAIL 0.129 (limit 0.1) |
| retry | 1440 | 3/3 | **PASS** | – | all checks pass |
| retry | 1920 | 3/3 | **PASS** | – | all checks pass |

PASS 10 · PASS_WITH_NOT_RUN 0 · FAIL 2 · NOT_RUN 0 (limits: CLS ≤ 0.1, reading place ≤ 12 px, failure box above the person ≤ 160 px + its message)
