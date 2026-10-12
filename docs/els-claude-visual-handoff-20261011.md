# ELS Research visual handoff — 2026-10-11

## Authority and scope

Actor: GPT. Task: `ELS_RESEARCH_CLAUDE_VISUAL_PREVIEW_20261011_V1`. Live coordination owner: `inter_agent_coordination_law v16` (§§89–96); domain owners: `els_research_layer_law v9`, `els_single_engine_law v2`, Experience v9, Design V2 and canonical UI v7. The user's latest direction assigns all ELS interface and visual component writing to Claude, and engine, calculations, data and tests to GPT.

Approved visual direction: Claude Home preview commit `fa0e26f66d7905c99bd1ec6a0cc5227586480d38` on `ccr-b9fd9245-z14usv`, based on `origin/main` `737ee9aa2df4aaa80dd95ea0fa3c4f2bcbc4f12a`. Its compact hierarchy and **bottom-bar structure** are the reference to adapt for ELS through the existing `Sod2029Shell` / `SystemFrame2029` and shared components. The current remote Home branch is `205ad28282720927b16aa7d1444a4989fe29d1d7`; approval of `fa0e26f` does not make either branch a common integration base. Obtain a separate exact-head/file-scope handoff from the active design session before editing shared Frame, palette or navigation files.

## Exact code basis and prior correction

ELS integration base: `gpt/2029-integrated-preview-20261010` at `cf608516e36f2e31e8c1a6092592c4482e3e6328`. Working branch: `codex/els-research-workspace`. The branch contains a documentation-only continuation commit `44777182fd663386ad2a1a288c2f958cef6f4ab9` and this handoff commit (see Git head). The only changed path against the ELS base is this documentation and `docs/els-capability-workarea-unification.md`. No engine, native Classic UI, CSS, generated HTML, schema or product data changed on this branch.

The earlier Classic-on-demand experiment was **fully reverted** by `13f21ae23d8ccb020bc53073445cef0dd293dbcf`; PR #1029 was closed unmerged. Its final tree has zero diff from the ELS integration base. The user requires Classic to retain its existing structure. Claude's new work belongs in the existing **Research** profile and must preserve the current Classic path and state.

## Existing capabilities to preserve

- One canonical ELS engine from `tools/els/els-code.template.html` → `public/tzofen.html`, presented through `TzofenEmbed.jsx` and the mounted native workspace. The callable `els-search-bridge` supports bounded page search with explicit `skip_min`, `skip_max`, scope and continuation, and exact occurrence verification. `els2029AdaptiveScanner.js` is a bounded planner over that adapter, not an independent occurrence engine.
- `Els2029Page.jsx` already offers CLASSIC / RESEARCH over the same state. Switching profile must not rediscover, replace or promote a result. Research has current source/replay projection, layer and optional Raziel action slots; many advanced actions are still placeholders.
- A fast, wide matrix; the existing desktop pinned findings rail at the visual left; readable add/remove finding actions; Torah/Tanakh search, regular and crossed discovery, exact occurrence selection, pagination/continuation, source/verse inspection, color/visibility, save/reopen and mobile panel behavior. Preserve exact axis/occurrence identity, provenance and canonical verification through all changes.
- A secondary term or source-text sequence is distinct from a verified ELS hit; visual proximity does not raise evidence strength. Bounded/empty/failed results remain explicit.

## Visual work and gaps

Claude owns the new ELS Research composition, ELS page and visual components/CSS, and final desktop/phone/three-palette acceptance. Use the approved Home direction's structure for the shared bottom bar, adapted to ELS tasks. Keep the research matrix the focal object and its findings clearly accessible on the left at desktop width. On phone, make the findings and add/remove/navigation reachable without shrinking the matrix into an unreadable decorative grid. The Classic interface is a regression target, not a redesign assignment.

The current Research profile is mostly a shared Classic workspace plus diagnostic blocks and `BUILDING` slots. It lacks a finished research-specific layout and many advanced manual actions. The recovered capability register has **85** unique items, not a confirmed literal list of 81; historic 2026-08 statuses are not current acceptance evidence. Manual skip ranges, geometry controls, comparison/controls and later optional Raziel depth need separate capability work by GPT and should not be presented as already functional. Claude should represent unavailable actions honestly while building the working visual preview from currently supported actions.

Claude may change `src/pages/Els2029Page.jsx`, its ELS presentation CSS, `src/components/experience2029/ElsMatrixProfileSwitch.jsx`, and ELS-specific **presentation** parts of `ElsNativeClassic2029.jsx` / `elsNativeClassic2029.css`, plus new ELS visual components and visual tests. Existing request/response callbacks and engine bridge semantics are a fixed boundary; if a JSX change requires new data or behavior, ask GPT through a passive work-log memo and keep the visual scope paused at that boundary. GPT freezes visual writes in these ELS paths. Claude does not change `tools/els/`, `public/tzofen.html`, `src/lib/research/els*`, `TzofenEmbed.jsx` bridge semantics, `supabase/functions/els-search-bridge`, migrations, auth or permissions. No shared Frame/palette edits until the current design session provides exact heads and a nonoverlapping write scope.

## Verification and release

GPT baseline: 40 focused ELS engine/profile/bridge tests passed; `npm run build:2029` passed with existing bundle-size warning. Focused executable browser checks for native rail, mobile layout, findings, results and design integration are running at handoff preparation; their final count is recorded in the assignment memo. The previous 32/33 browser run belonged to the *withdrawn* Classic candidate and is not acceptance evidence for the new Research visual work.

Claude acceptance: real working branch-only preview, exact branch/commit/deployment URL; desktop and 320/390 phone; light/parchment/dark palettes; wide matrix, left findings, clear add/remove; existing search, selection, navigation, source, save/reopen and mode round-trip; no horizontal document overflow, keyboard and RTL usability. Run focused engine/profile/browser regressions and build. Record pass/fail and screenshots in a passive `AFTER` to GPT with `dispatch_kind NULL`, without waking GPT. Stop on engine-result drift, overlapping shared-file writer, or unavailable exact design-session base.

Release status: `BRANCH ONLY`; no merge, main push, production deploy, product DB write or history cleanup. New visual preview deployment is limited to the user's requested working preview and must be labelled by exact SHA. Main/production remains separate from these branches.
