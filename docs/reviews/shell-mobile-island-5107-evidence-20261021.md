# Mobile island V1 · Elections 5107 preview — evidence (21.10.2026)

**State:** `BRANCH-ONLY`, **not merged, not deployed, no DB/rules/flags/Production change.** Task key `SHELL_MOBILE_ISLAND_V1_5107_20261021`.
Branch `claude/shell-mobile-island-5107-20261021`, stacked on `claude/unified-post-shell-stacked-20261020` (`b2f71d6f`, PR #1137 lineage). Owners unchanged: System Frame, Design V2 §§8, 11.8, `canonical_ui_components_law` v8 (**unchanged**; the persistent share button waits for the separate v9 approval and is **not** implemented).

## Scope (all behind `shellReviewActive`, i.e. `VITE_ELECTIONS_631_PREVIEW=true` on the 5107 Post path)
- One search on phones (≤620px): the header search is hidden, the island keeps it.
- Island 2|orb|2 on phones: `[search][tools]` · Raziel orb in the exact middle · `[here][now]`; no trail row, progress track, locator strip or feed chip.
- Action and Tools share one sheet ("כלים ופעולות", two accessible tabs) using the **same** `ActionProjection` / `ToolsProjection` and handlers. The separate Action island button is hidden on phones only.
- "כאן" island button → existing Context sheet; count from the single `readingProgress` (same source as the orb ring and the peek).
- Position peek: inside the island above the orb, ~2s, only when the real active section changes (never the first position, never without real sections), `aria-hidden`, no animation under reduced motion.
- Now keeps one launcher with the unread count (accent, not danger).
- Label "מפגש" → "התכנסויות" in the shell text only (anchors such as `#post-discovery-meeting` unchanged).
- Files: `SystemFrame2029.jsx`, `SurfaceContextRail2029.jsx` (one label), `systemFrame2029-unified-bar.css` (new gated block), `test/shell-mobile-island-5107-2029.test.mjs`. No Post file is written.

## Tests
- New: `test/shell-mobile-island-5107-2029.test.mjs` (18 tests): every new CSS selector is gated, phone-only breakpoints, one search, 2|orb|2 grid, merged sheet semantics and unchanged projections, here/peek/counter sources, orb ring/tap, badge, label, no share control, 44px/14px floors, **and explicit "other surfaces unchanged" assertions** (island Search/Action/Tools buttons, original Action and Tools sheets verbatim, header search, trail, reading progress, feed chip, Now tabs, baseline island CSS). Mutation-checked: removing a gate prefix or the merged-sheet gate makes them fail.
- Existing tests untouched and passing: `scripts/test-2029-system-frame.mjs`, `scripts/test-experience-context-2029.mjs`, `test/unified-post-shell-2029`, `post-after-reading-companion-mobile-2029`, `elections-631-context-priority-2029`, `post-topic-pinned-context-rail-2029`, `companion-2029-one-feed-and-projector-rail`. (An earlier draft of the orb handler broke one of them; it was reverted to the original expression rather than editing the test.)
- `npm run build:2029` passes.

## Real browser (Chromium, local build with the preview flag, real post data from the canonical read path)
| Check | Result |
|---|---|
| 320 / 360 / 390 × Day / Parchment / Night | no horizontal overflow; island 66px; orb centered (offset 0px); all island targets ≥44px; header search `display:none`; locator and feed chip hidden |
| Gaps at 320 | 2 px, then 44 px each side of the orb (no squeeze) |
| Merged sheet | opens from Tools (Tools tab) and switches to Actions; ArrowLeft/Right switch tabs; Escape closes; focus returns to the Tools button |
| "כאן" | opens "ההקשר הפעיל" with the full position list; focus returns to the button |
| Counters | "כאן" 5/8, orb ring 63%, aria "חלק 5 מתוך 8" from the same source |
| Peek | appears on real section changes (e.g. 271 · … 2/8), centered above the orb, gone after ~2s; reduced-motion: `animation: none` |
| Scroll preservation | unchanged (±0) after opening/closing Context, Tools, Search sheets at 320 and 390 |
| Exact return | opening a Number from a gematria value and closing keeps the position (±3px, existing behavior) and returns focus to the value; `#post-sources` survives reload with the same position |
| Keyboard | Tab order search → tools → here → now; 2px focus outline on each; no unnamed island control |
| Contrast | "כאן" count 11.0–15.7:1; unread badge 5.7:1 (Day/Parchment) / 9.0:1 (Night) |

## Not verified (honest list)
- Raziel tap in this environment: the orb is **locked** here, so the tap-opens-Raziel behavior is asserted by source (`openRaziel` is the Post handler; the ring is `pointer-events:none`) and not exercised end to end.
- Safari/Firefox, a physical phone, safe-area insets on a real device, soft keyboard overlap.
- Anonymous vs admin readers, an account with new feed items (badge was checked by computed style only).
- A cross-surface `returnExact` round trip (that code is untouched by this diff).
- CI gates: G4 and Isolation were red at the base (PR #1137) and were not run here; five test files fail identically on the base (listed in the AFTER of `CLAUDE_POST_UNIFIED_SHELL_STACKED_20261020`).
- Tablet widths 621–980px keep today's pilot behavior (this change is phone-only by design).

## Overlap note
`HEICHAL_PREVIEW_ONLY_THREE_FIXES_CLAUDE_20261021` plans `claude/frame-preview-fixes-20261021` (free_question handling; mobile exact-return control) on another lineage, also touching `SystemFrame2029.jsx`. Regions differ (island/header search vs. subject actions/header return); a textual conflict is possible at integration and is for the integration owner to reconcile.
