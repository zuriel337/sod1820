# Writer visual refinement — review candidate

The user explicitly rejected the preceding writer-page design. This revision is a new visual review candidate, not final visual acceptance.

Branch `claude/2029-writer-visual-refinement-20261023`, base `3b8f0125c686356d5aee45bad2886accd94ade11`. Actual Claude visual commits `36d24e1d` and `fe0363c1b` integrated as `c2d23c08` and `944c5fd3`. The exact final Preview SHA is recorded in the passive delivery. Main remains independently verified `e73687221aa2ab639930643e5cc8c99666adce88`; required World ancestor `cfa786c1` is preserved. No merge/main/Production.

- One editorial writer layout: frameless identity medallion, clearer name/title/body hierarchy, quiet membership facts and content rows instead of repeated nested cards. Known-empty studio is omitted; real studio media is retained.
- Mobile name/short existing role sit beside the smaller 3D seal. Full canonical description remains available from the existing about control. Navigation is one scrollable row, with overflow limited to that navigation. Metadata and touch targets retain readable sizing.
- Duplicate local workspace entry is removed from the action group; existing global workspace remains. The private reading summary renders only when the existing library/history supplies saved items or a resume link. Source save/open and owner controls remain available.
- Existing community messages/likes use the same shared view and reader, with presentation scoped to the writer subtree. No new community profile, reaction engine, reader, corpus or store.
- Tzvi still has no approved public photo, so the seal shows the canonical initial. Rank comes from the existing five-level authority and remains distinct from finding strength.

Verification: **121 contained Node cases**, builds for **Legacy + 2029**, and `git diff --check` pass. Real anonymous data through the built app and GET-only local canonical rank/overview/interactions handlers was inspected at **320/390/1440 × day/parchment/night**: 27 captures (top/writings/community), 20 recent sources and 20 initial community items, no document overflow or JavaScript errors. Capture-loop timings were 6.9–11.1 seconds including all three views; these are review timings over the session proxy, not browser performance percentiles. Live mutations were blocked.

Functional browser regressions preserve guest/member/owner actions, keyboard medallion, source saving/reload/exact World occurrence/back, existing community like rollback/retry and pagination, existing full community profile, private editor/portrait/inbox/follows and account-switch guards. Fixture mutations stay intercepted. The previous unknown last-seen row assertion was updated to verify that unavailable presence does not become a displayed date.

Local evidence: `work/evidence/writer-design-reviewed-final/` plus action/router/community/private regression logs. The real-data screenshots verify the local built app, not hosted browser access. Prior hosted access/error investigation is separate; no access-protection setting, provider/Auth, shared frame, menu, World, database, RLS or site flags changed.

The exact new Preview URL is provided in the delivery message. Final design acceptance remains with ZURIEL.
