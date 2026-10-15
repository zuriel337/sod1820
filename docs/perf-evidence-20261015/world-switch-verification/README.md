# fx_world_relation_identity — OFF vs ON, same commit `ab6ed6ab`

Build: 2029 production build of `ab6ed6ab604b366971f23da5709fce1ac35c3283` (branch `claude/sod-perf-continuation-838w4h`). Modes produced by a local, test-only interception of the `site_flags` read inside the test browser; no shared flag written, no product bypass. Same method as `../measurement/README.md` (390×844, DPR2, CPU×4, subject 1820 → "קשרים" → first "העמק").

**Hosted protected preview: NOT established.** No PR/deployment status exists for the branch, I have no Vercel access, and I did not open a PR (not requested). These numbers are a local build of the exact commit; they are *not* a hosted-preview result.

## Replay (8 runs/cell, fixed 150 ms reads)
| Target | Mode | click→identity | click→usable content | requests | CPU | CLS |
|---|---|---|---|---|---|---|
| world→number 776 | off | 1742 ms | 3820 ms | 92 | 1083 ms | 0.052 |
| | on | **206 ms** | **2315 ms** | **55** | **809 ms** | 0.052 |
| world→post | off | 1213 ms | 2561 ms | 29 | 652 ms | 0.227 [–0.278] |
| | on | **201 ms** | **1561 ms** | **16** | **445 ms** | 0.278 [0.227–0.278] |

## Live-server reads (3 runs/cell; real HTTPS reads, anonymous; not the production website)
| Target | Mode | click→identity | click→usable content | requests | CPU | CLS |
|---|---|---|---|---|---|---|
| world→number | off | 4074 ms | 8307 ms | 92 | 3058 ms | 0.053 |
| | on | **363 ms** | **5769 ms** | **55** | 2362 ms | 0.053 |
| world→post | off | 2410 ms | 4907 ms | 29 | 875 ms | 0.278 [0.227–0.278] |
| | on | **636 ms** | **3448 ms** | **16** | 1384 ms (range 819–1634) | 0.227 |

Content identity: exactly one identity variant (label/type/return/selection/lens/text length) across every run in both modes. CLS: the 0.227/0.278 post values flip within the OFF cell too, so the switch does not move it. Live post CPU medians are noisy (n=3, ranges overlap); the request/time gains are consistent with replay.

Raw: `raw/*.json`; runner `run.sh` (uses scratchpad `wd-measure2.mjs` = `../measurement/tools/wd-measure2.mjs`).
