# Raziel Center combined base — 2026-10-26

Task key: `RAZIEL_CENTER_COMBINED_BASE_20261026`

This branch certifies the existing single integration merge
`59cca6fc34f06d42417ff180cd58fa9717044be8` as the stable base for the future
Raziel Center in My Workspace. It does not implement `RazielCenter2029`.

## Required ancestry

- Books: `b10540b727ad838510bda0d67a199947931183af`
- Raziel: `8a20446f5bd94deef5f203af93e38e8bfaad8380`
- Common split base: `c121dab3badb9297ab3dbfe88d35189cfa1285`
- Integration merge parents:
  - `54671fc9c485131d1497a2959d65bad1f0825672` (Books, including the guided Sefer HaPeli'ah reader)
  - `8a20446f5bd94deef5f203af93e38e8bfaad8380` (Raziel saved sessions and isolated Preview gate)

The merge contains the required Raziel commits:

- `4b7d63c9c` — natural method-question routing
- `8ce433d22` — evidence detail in the research map
- `3145d3295` — explicit saved conversations
- `8a20446f5` — isolated Preview gate

`10f8f70f8` (`claude/claude-raziel-live-20261025`) is not an ancestor.

## Resolution

The only true two-parent content conflict was
`scripts/build-integrated-preview.mjs`. The final version preserves both
`VITE_BOOK_PUBLICATION_REVIEW_PREVIEW=true` and
`VITE_UNLOCKED_2029_PREVIEW=true`, together with the existing read-only Preview
guard and `rd_is_admin` reader.

`SystemFrame2029.jsx` keeps the Raziel saved-session actions. `App2029.jsx`
keeps the Books line and the provider order:

`AuthProvider -> BrowserRouter -> ResearchProvider -> RazielSessionMount2029 -> Routes`

## Verification

- Books: 26 files, 210/210 tests passed.
- Raziel session/saved-session/frame/method suites: 169/169 tests passed.
- System Frame acceptance: passed.
- My Workspace tests: passed.
- Integrated Preview auth guard: 4/4 passed.
- Unlocked Preview boundary: 2/2 passed.
- 2029 cheap hardening and isolation: passed.
- Legacy Production Lock: passed.
- `npm run build`: Legacy and 2029 passed.
- `git diff --check`: passed.

Only the pre-existing Vite chunk-size and dynamic-import warnings remain.

No database, RPC, RLS, Legacy, ELS, payment, Production, or main change is part
of this base. No Preview was deployed.
