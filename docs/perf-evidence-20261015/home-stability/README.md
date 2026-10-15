# Home return stability — CLAUDE_PERF_HOME_STABILITY_20261015 (BRANCH_ONLY, local replay)
Base A = a1f7cd0b08674daf89c98a666fc9676efca80998. B = code commit on `claude/perf-home-stability-20261015` (see git log; one commit, Discovery loading reservations).
Runner: `hometest.mjs` (copy of scroll-integration/scrolltest.mjs + `geom` mode), fixtures `../scroll-integration/fixtures-combined.json.gz`, mobile 390x844 DPR2 CPU4 150ms flat replay, 7 samples/arm run sequentially (A block then B block, NOT interleaved). Per-sample numbers: `summary.json` (raw files with DOM class/rect detail kept locally only).

## Result: **FAIL** (target action-window CLS <= 0.1 not met)
| Home back-from-Post action-window CLS | samples | median [range] |
|---|---|---|
| A | 2.396 2.401 2.336 1.956 2.343 2.403 1.952 | 2.34 [1.95–2.40] (7/7 >0.1) |
| B | 1.502 1.643 1.086 1.216 1.183 1.373 1.383 | 1.37 [1.09–1.64] (7/7 >0.1) |
Fixture misses: A 5/7 runs had 1 miss (only 2 clean A runs: 2.336, 2.403); B 6/7 had 1 miss. No page errors, 0 invalid. Position: |yAfter-yBefore| = 0 in 14/14 (<=120px). Back time ms A 411–822, B 485–617 (no regression).
Not run (time/stop condition): 150/900/1800/3200 late-arrival focus runs, user-input cancel, 320/360/1440 widths, Day/Parchment/Night, error/empty states, reduced motion, existing unit tests (build:2029 passes). No spec file added.

## Attribution (layout-shift sources, A)
`section.dg29` (loading→loaded height 876→1636 on phone: gateways 168/168/242→403/224/458, Dimension row 230→484), its children, `.sod29-watch-icon-wrap` (shared WatchButton, out of scope), and the Reveal wrappers/sections below it that get pushed.
## Patch B
Phone-only (`@container h29 max-width 620`) loading min-heights on the three gateways and Dimension Five row, class `is-loading` while the existing read is pending. No data/read/shared changes. Cut CLS ~40% but not to target.
## Falsified / remaining
Trial B2 (placeholder for the late notable-convergences strip above Discovery) gave no gain (1.10/1.64/1.52, n=3) and was reverted, not committed. Remaining dominant shift (~0.73 single event) occurs when the gateways fill in: dg29 content moving ~280-340px while rows render; likely also content above the restored viewport arriving late, and WatchButton icon mount (shared component, DO_NOT_TOUCH-adjacent). Needs: per-item skeleton rows in gateways with exact loaded counts, WatchButton reserved box in shared component, or hold-until-ready in restorer (out of scope).
Rollback: revert the B commit.
