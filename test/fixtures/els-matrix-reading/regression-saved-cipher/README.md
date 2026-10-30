# Regression data: the saved cipher "יום משיח בא 583"

**REGRESSION ONLY. Not a blind discovery, and never reported as one.**

| file | what it is |
|---|---|
| window.json | the exact 33 x 41 window that live job 5f5aa117 sent (sha256 equals its `window_sha256`), read from `public.torah_stream` |
| saved-cipher.json | the six findings saved on the site (`els_records`, `els_finds`): an EVALUATION TARGET |
| live-run-uniform-proposals.json | the 25 proposals of that first live run (uniform instruction): the baseline, 0 of the 6 hit |
| engine-replay.json | recorded `els_verify_occurrence_v1` answers for the axis and the four saved ELS findings |

Rules, enforced by `test/els-matrix-reading-saved-cipher-regression.test.mjs`:

1. The six words (and their parts) never appear in any instruction, schema, default, constant or comment of production code (`supabase/functions`, `src`). A general instruction does not know them.
2. Production code never imports or reads this directory.
3. The cipher is known, and the neighbourhood radius (8) was first read off it, so it is IN-SAMPLE for that radius. A run on it that proposes the six words is a regression result, not a discovery.
4. The radius is also checked against the other saved ciphers of the site (19 Torah ciphers, 108 findings): 66% within 4 cells, 81% within 8, 94% within 12.
