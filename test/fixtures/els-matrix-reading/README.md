# Test fixtures for the matrix reading layer

All files here are **test data** (`is_test_fixture: true` in the reading contract), copied from the experiments of 28-29.10.2026 on branch claude/els-axis-window-exp18-20261029 (EXP-18) and the canonical engine. They are never product findings and are never mixed with engine-verified results of a real reading.

| file | what it is |
|---|---|
| window-c1.json | the 23 x 41 Columbia window (rows 44-66, per-row md5 from public.torah_stream) |
| request-c2-general-cap60.json, request-c3-general-cap25.json | the exact requests that were sent (previous general instruction, cap 60 / 25) |
| response-c3.json | the saved answer of run C3 (text, usage, cost); C2 ended at max_tokens |
| harness-classified-c3.json | the harness classification of that answer (the golden for the new classifier) |
| engine-replay-c3.json | recorded els_verify_occurrence_v1 answers for the 25 occurrences |
