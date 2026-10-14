# Reuse of newly completed interaction work (journal4459d81e)

Fetched exact remote `ccr-7478c3d3-aujbfc@30e3381a` after passive AFTER appeared.
Its PR1102 is **not** this lane's integration target; role A changes only PR1100.
No whole-branch cherry-pick. Existing raw evidence is retained in its original
branch and linked below, rather than rerunning its broad experiment.

Source: [independent report](https://github.com/zuriel337/sod1820/blob/30e3381a/docs/perf-evidence-20261014/interactions/README.md).

| Finding / source | Reconciliation | Integration verdict |
|---|---|---|
| Bennett region scroll:4 storage writes,0.5ms guest; synthetic150KB research state2.6ms | Complements our zero-write ordinary/Flydubai wheel windows. Does not prove real signed-in queue cost. No justification for removing persistence | **REUSE EVIDENCE**, no ResearchProvider/ResearchSync change |
| Nasrallah raster1350ms/image decode500ms, JS20ms over6500ms | Headless/no GPU; physical phone remains open. Image optimization already accepted separately; no additive saving claim | **REUSE DIAGNOSIS**, no new image work |
| Number drawer initial~450ms, dossier/journey~3.3/4.0s after input | Public direct Number is gated; drawer and full page are distinct flows. SQL lab B remains draft only | **REUSE**, no RPC replacement/DB apply |
| E1 feed reuse8cb39c63+c7eeb78a | Author reports3–9 fewer requests; all timing ranges overlap; local unthrottled network/live DB, not our calibrated replay. Hook keeps module-level sharedFeed+tierMemo; tierMemo has no cardinality bound and keys item.id instead of exact tier args. Auth cache display lifecycle/error/refresh behavior needs executable tests (source regex is weak). Freshness30s is declared, but no blanket cache adoption from request counts | **HOLD**, retain source and proven request reduction; do not mix with pure primary-paint scheduling candidate or call speed verified |
| E2 batched Post connection resolution52f6188f | 31→25 requests proved in its own experiment; output/content parity needs more cases. Current Post identity lookup chooses first DB row across slug variants, candidate prioritizes original/decoded/encoded variants. Live schema has no UNIQUE posts.slug constraint, so precedence/duplicates cannot be assumed equivalent. Candidate batch lacks explicit row limit; table/API truncation must not silently omit connections. Active839c2af4 owns Post technical reader scope | **BLOCKED/HOLD**: transfer precise post2029ReadingProjection scope and prove encoded/decoded/duplicate/error/RLS/bounded-content equivalence before integration |
| E3 Number lenses suppressed | Source reports changed topic findings at878/91 and no timing gain | **REJECT**, preserve original rejection |

No shared-reader cache/store has been added by role A. Its independent feed
scheduling experiment preserves the existing watcher args, auth headers, result
contents, visibility-aware refresh and cleanup; it does not reuse old responses.
All sample methods and source branches remain distinct.

The two-example secondary World/cipher change is explicitly still not implemented
by this handoff. A visible limit without reduced work is not a performance fix.
Its implementation needs an existing continuation control, bounded reader and
preserved primary content; material new composition remains the visual lane.
