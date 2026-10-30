# ELS background research: exact return and 2029 Preview

## Scope and provenance

- Actor GPT; recipient ZURIEL; task `ELS_RESEARCH_EXACT_RETURN_PREVIEW_20261030`.
- Base `46df61035b1d89202812029cb35d1785aa5844ab`, verified against remote `gpt/els-background-research-20261030` before writing.
- Branch `gpt/els-research-exact-return-preview-20261030`. No old branch imports, new engine, store, Provider, AI transport or DB schema.
- Live read-only coordination and ELS law v9, single-engine law v2 and canonical UI law v11 checked. Current World work explicitly excludes this scope. The historical Oct 28 matrix-preview BEFORE row was reconciled against the user's explicit completed handoff at `63e430113` and later ELS scope releases; it was not deleted or presented as a fresh claim. No authorized work-log writer is attached, so this is a passive handoff, not a claimed live BEFORE/AFTER write.
- Cloud runtime skill checked environment/network. Supabase skill used only for read-only rules/coordination. Vercel deployment/protected-access skills constrain release to a protected Preview of this exact branch; no domain assignment or Production operation.

## Implementation

The existing principal-scoped ResearchProvider observes trusted current engine-frame state before history deduplication. Starting an explicit background research operation copies an immutable, bounded snapshot only if corpus identity, term and occurrence exactly match the operation origin. No grid, saved-record edit identity, author metadata or request token is copied.

Returning uses the existing journey/load contract and canonical verification. It restores selected verified findings (including selected hits temporarily hidden by radius), source selections, colors, zoom, fit, heat, niqqud, axis visibility, result count/radius and search-window geometry. Invalid or unavailable snapshots fall back to the original exact axis, with distinct UI wording.

This does **not** restore scroll/pan position, camera mode, a selected verse highlight, the crossed-search result list/cursor or an editable saved-record identity. It does not make the transient non-AI task durable: reload, tab closure or principal change still ends it. No automatic dictionary loading or AI call is introduced. Classic/engine and the Fable job lifecycle are unchanged.

The isolated branch is added to the exact existing Preview allowlists. The generated worker has the same authenticated-submit/private-sync policy as the prior account Preview. Preview is **not an isolated backend**: explicit account synchronization and authorized AI actions use the existing backend. Testing in this cut does not invoke a paid model or write product records.

## Verification

- Snapshot unit tests cover immutable copies, invalid/unbounded input, corpus/occurrence mismatch, hidden selections and excluded unverified candidates.
- Real canonical engine browser acceptance captures manual findings/view, moves to another occurrence, reloads the snapshot and verifies original identity, findings/colors and native view values.
- Built-app acceptance uses declared external IO/iframe fixtures to test cross-route ownership, captured return, cancellation and no restart on reload at 320/390/1440 in light/parchment/dark. It also checks no AI call and lazy execution.
- Separate real-Provider fixture acceptance covers double starts, principal replacement, late responses and cancellation/watchdog.
- Existing Raziel responsive and account-sync/map browser tests remain required. They are intercepted tests, not evidence of a live cloud account round trip.
- Focused ELS/sync/Raziel contracts: 64/64. Final snapshot/background/Preview subset after defensive input guards: 26/26.
- Full Native browser suite: 49/49, no skips, including Classic privacy, exact skip/cross and mobile pinch. The new return case is also rerun after the final selected-hit snapshot refinement.
- Final built-app/provider/Raziel/account browser suites: 4/4, covering the widths/presets above. No paid/live AI.
- Both Legacy and 2029 builds pass with real dependencies (no stub). Built graph/lazy gate passes: eager JS 419,161 gzip bytes, 39,581 below reference. Isolation, cheap-hardening, Legacy Production lock and diff check pass.
- The previous base receipt documents six pre-existing source assertions in the wider suite; they were not rewritten or represented as fixed here.
- Deployment identity and read-only hosted smoke are appended in the release receipt after execution.

## Release boundary

No main merge, Production change, Edge deployment, DB/RLS change or paid experiment. Pre-release read-only alias checks found all four existing public hostnames on `dpl_AiKPHaoo5pxo9T5PFTpcBRG7LfMA`; this historical difference from the older AGENTS pin is not repaired in this task. Preview creation omits a Production/staging target and must leave those mappings unchanged.
