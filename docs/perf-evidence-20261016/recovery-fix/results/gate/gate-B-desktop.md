# Recovery gate — arm B

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
| recover2 | 1440 | 3/3 | **PASS** | – | all checks pass |
| recover2 | 1920 | 3/3 | **PASS** | – | all checks pass |
| retry | 1440 | 3/3 | **PASS** | – | all checks pass |
| retry | 1920 | 3/3 | **PASS** | – | all checks pass |

PASS 12 · PASS_WITH_NOT_RUN 0 · FAIL 0 · NOT_RUN 0 (limits: CLS ≤ 0.1, reading place ≤ 12 px, failure box above the person ≤ 160 px + its message)
