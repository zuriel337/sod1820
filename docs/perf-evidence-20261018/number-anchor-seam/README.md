# Number opening anchor seam

- Branch: `gpt/perf-number-anchor-seam-20261018`
- Exact base: `origin/gpt/perf-number-opening-projection-20261018@a9f566720b124352ffc89f1c7d26a22359e5015b`
- Owner: `reality_graph_law` v8 Number Anchor projection; existing Number/Experience owners unchanged.
- Coordination: bounded read of canonical `public.work_log_current` found no active writer for `src/lib/research/entityHubProjection.js` or `number_anchors` when this branch started.

## Change

`fetchNumberAnchorProfile(number)` is now exported without changing its query or result semantics. The new nonvisual `fetchNumberOpeningContext(number)` reuses `resolveEntityHubNode` and the existing anchor reader. It returns the exact shared Number identity plus `anchorProfile`, or `null` before any anchor read when no Number node exists, including value `0`.

The seam starts no family, graph, full-row or Legacy reads. A future 2029 surface can start it in parallel with `fetchNumberOpeningProjection`; compact phrase samples remain outside Universal Findings.

## Verification

- Focused Number/projection/anchor suite: 40/40 passed.
- New seam suite: export/result parity, one resolved anchor read, missing node/zero, orphan anchor exclusion, valid identity without anchor, unsafe/no-value fail-closed.
- `node scripts/test-2029-world-surface.mjs`: passed.
- `npm run build`: Legacy and 2029 builds passed.
- `npm run test:2029-bundle-budget`: 5/5 passed.
- `git diff --check`: passed.

No UI/CSS, live database, RLS, flags, CI, deployment, merge or Production change was made.
