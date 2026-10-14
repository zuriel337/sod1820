# CLAUDE_2029_LCP_MEDIA_FIX_20261014

Base: gpt/perf-execution-20261014 @ 5dd4afaacd9ead2fef5ff43d4c1adec4e4a0ed75 (PR1100). origin/main 12fea7a3 not substituted.

## Change (priority/discovery only; no size/srcset/preload change)
- CanonicalMediaImage2029 / CanonicalMediaFigure2029: new opt-in `priority` prop -> loading=eager + fetchpriority=high. Default unchanged (lazy). `primary` semantics untouched (World uses it).
- Post2029Page: the single reading cover passes `priority` (was lazy/auto, discovered late at 3779ms in hosted diagnostic).
- HomeHeroMotion2029: hero poster already eager; added fetchpriority=high (was auto/Low).
- Not touched: SystemFrame2029, Sod2029Shell, App2029, main2029, 2029.html, World2029Page, hooks/harness/CI. Home grid `Media` stays lazy.

## Status
IMPLEMENTED, `npm run build` passes. NOT timing-measured: no 7-sample interleaved mobile run, no media-network proof was executed in this session. No timing win is claimed. Home gap (content READY 3982ms -> hero start) is dominated by render/data chain, which these hints cannot fix; expect little Home gain.
Rollback: revert the commit (4 files, 9 lines).
