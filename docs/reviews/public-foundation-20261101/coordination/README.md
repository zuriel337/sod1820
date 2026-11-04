# Bounded public routing and menu proposal

Base: `77d226d11594988266207d9054e791748e49895e`. Branch: `gpt/2029-public-foundation-continuity-20261101`.

ZURIEL approved the bounded transfer in the active conversation. It was recorded in BEFORE `7bc61ae5-dd89-46fd-8eb7-94192ad542f6`, after a fresh overlap check. The accompanying original proposal patch changes only public Preview routes in `src/App2029.jsx` and Home/Posts/service menu destinations in `src/components/experience2029/SystemFrame2029.jsx`. It is gated by `VITE_PUBLIC_FOUNDATION_PREVIEW`; existing private routes, authentication, Raziel sessions, capability locks and normal builds remain unchanged. Root `vercel.json` and the Production lock are excluded. New leaf pages use existing Post/Number readers and newsletter/unsubscribe infrastructure.

Historical ownership provenance: BEFORE `711f7dc9-49aa-4d77-ab95-611aa9438451` (WRITER_PERSONAL_CHAIN_20261023) includes App2029 and SystemFrame; Oct31 carve-out `99ab48c5-3dab-48f8-b4b0-35725429852f` transfers only specified personal-area files. Other historical Frame claims remain explicit. A stale session or isolated branch is not a transfer. The approved public route/menu lines are now integrated, including the existing Number address alias using the same new adapter in this Preview. All other ownership is retained. Root vercel.json is unchanged.

Validation: original proposal applies cleanly to the base; integrated changes pass the existing content/build/Production lock and focused guard tests. Browser acceptance covers old/new Post, Number/expression, services, unknown routes and exact return. The complete outcome and release receipt are in the task handoff and passive work_log AFTER.
