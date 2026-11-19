# Independently open Discovery — 19 November 2026

Branch `ccr-06bc2910-pgarr4`, base `548f15fe408f7bda0288387147a583216580d194`, PR #1397.

Owner request: Research Discovery opens by default, can be closed explicitly, and coexists with one of Scan/findings, Results or Save. Discovery has its own local open state and inspector header/close action. The three other tools retain their existing mutually exclusive state and close action. Wide layouts show both in two columns; narrow layouts stack readable panes. Selecting an additional tool scrolls to that tool, rather than the top of Discovery. Both use the existing mounted canonical engine and discovery component. Local controls remain beside the matrix; no new global bar or global frame source edits.

Only the UI mounts on opening Research. Dictionary scans, engine searches and Fable calls still require explicit user actions. Closing and reopening Discovery retains its in-page view/settings/results; this is not new persistence. Classic and guided modes hide the Research pane. Existing cancellation, context-ownership and account boundaries remain unchanged.

No engine-limit changes, SQL writes, secrets, flags, merge or deployment. Preview remains on the earlier approved SHA until separately approved.

Validation: 17/17 unit contracts; six targeted native browser scenarios pass (default discovery and explicit launch, independent panes across 320/360/390/1440 and three themes, fullscreen reuse, existing frame/Raziel integration, Fable lazy entry/authorization, joint engine/Fable list). The independent-pane test checks adjacent desktop bounds, stacked mobile bounds, closing each additional tool, preserved settings, no implicit dictionary/AI/search requests and unchanged occurrence identity. Build including shell budget and diff check PASS. New-head CI not yet verified. Full browser suite not rerun.
