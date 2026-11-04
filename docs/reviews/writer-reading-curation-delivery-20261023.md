# Writer reading, selected writings and public introduction

Branch `claude/2029-writer-reading-curation-20261023`, exact base `85940c62c8993084fce1150e459d54bca33b69bb`. Current main remains `e73687221aa2ab639930643e5cc8c99666adce88`. Required World reader ancestor `cfa786c1` is preserved. Branch Preview only; no merge/main/Production/database schema or product-data writes during implementation/testing.

## Behavior

- A public writing can be saved through the existing `ResearchProvider.saveItem`. Stable native source identity, exact href and paired source references survive. There is no new saved-items table, local-storage key or writer corpus. Guest saves stay in the existing principal-scoped local library; account sync remains owned by the existing Research OS.
- The private reading strip shows the current writer's saved count and latest available saved/opened source, using the existing principal-scoped history. A removed/nonpublic source is excluded by resolving against the current anonymous page view. This is an exact source bookmark, not a claim about paragraph completion or reading percentage.
- Explicit source opening records history and merges source selection/returnTo into the existing Research Context. Existing Journey state is preserved by the provider's merge semantics. Merely entering the page does not create a Journey or overwrite an active research context.
- Verified account owners may explicitly choose up to three public writings for the public page. The server resolves the submitted item ID using the anonymous canonical page reader; caller titles, hrefs, refs and administrator claims do not authorize a different source or writer. Display resolves selections against the currently available public items again.
- Selected writing pointers reuse the existing `contributor_content` **pin** type and `studio_upsert`/`studio_list`. They store only title/native link references; no source body/media copy. This also stays readable in Legacy. Repeated selection updates the same existing reference-only pin. Deselecting unpublishes the pin, preserving both pin and source history. Authored studio body/media is never overwritten by this action. The public projection deduplicates references and caps display at three; no new database uniqueness/locking constraint is introduced.
- Public introduction editing uses existing `update_my_page_config`. It reads and preserves current sections, links, highlights and visual settings; refuses ambiguous multi-contributor account bindings because that existing RPC targets an account rather than a supplied contributor ID. Empty clearing is unavailable in that RPC, so empty submissions are blocked rather than falsely reported as a cleared biography. Maximum 600 Unicode characters, explicit public save, no auto-save, draft retained on error and editor locked during saving.
- Existing `page_config.highlights` remains intact. Its RPC allowlist does not include source occurrences, so native source pointers use the already supported studio pin capability instead of mislabelling a source as a Post/Contribution or changing the database contract.

## Ownership and files

GPT owns the technical integration: new `api/contributor-curation.js`, page-local reading/curation models and controller; public page/catalogue integration; existing actions controller callback and public studio pin projection; focused tests/docs.

Claude supplied two controlled visual files, `ContributorReadingControls2029.jsx` and `contributorReadingControls2029.css`. Specialist `eee0be73` integrated as `c86cc81d`; focused editor QA `46504235` integrated as `277d351d`. No shared frame, App2029, ResearchProvider, Auth, UserCenter, World, Home, Post, Number, menu, DB/RLS/site_flags or hosting rewrite changes.

## Verification

- All five contributor test files pass, including eight new reading/curation cases (43 contained cases total). New cases exercise canonical recipient/source ownership, forged references, private/locked/unlinked writers, repeat/deselect behavior, feature limits, config preservation, ambiguous ownership, body limits, cross-origin rejection and bounded failures.
- Existing Research sync runtime tests and the date-display rule pass. `npm run build:2029` passes with existing shared-bundle warnings. `git diff --check` passes.
- Browser actions: nine viewport/theme combinations (320/390/1440 × day/parchment/night), no overflow/runtime errors; guest/member/owner paths, native feature href, selection/deselection, explicit introduction save, existing mocked follow and message/error regression. All external requests intercepted.
- Built App2029 plus the real existing frame: guest source save → reload → native personal library → exact World occurrence → back passes. Nine theme/viewport combinations and existing image/text locator, refresh/back, numeric writer and me/editor handoff regressions pass. No new store or duplicate shell.
- No test invokes a real authenticated publish, save, follow or message. Runtime write RPCs are mocked in tests; the live bridge is checked only through a non-writing HTTP method.

Evidence: local `work/evidence/writer-actions/results.json` and screenshots, `work/evidence/writer-routes/results.json` including `reading_workspace`, focused test/build logs. Hosted browser automation remains blocked by the existing bot middleware; hosted HTTP and local browser results are distinct.

## Next personal-area connections, inspected but not changed in this stage

| Entry | Current canonical destination | Next integration focus |
| --- | --- | --- |
| My public page | Workspace `public-page` → existing UserCenter card → `/community/researcher/me?view=public` | Resolve current account to exact canonical public slug/code, preserve return and handle no existing contributor without creating identity on a read. |
| Public page editor | Existing `page-editor` / `update_my_page_config` | Consolidate introduction, selected native references and visitor preview; preserve existing settings and studio content. |
| Profile/settings | Existing `profile`, own name/avatar | Explicit choice of a public portrait; never publish a social/account image implicitly. |
| Messages | Existing `messages` / direct-message inbox | Native return to writer and exact conversation, unread state through existing owner. |
| Follows/notifications | Existing notification preferences and WatchButton | Exact writer identity and explicit delivery preferences; repair the shared optimistic failure path in its own scope. |
| Reading/research | Existing library/history/Research Context | Already connected here; continue into collection organization and account-switch checks without adding another reading list. |
| Progress | Existing research-level authority | Reuse the same rank/medallion and explanation, keeping reputation distinct from truth/strength. |

Public last connection and community reaction aggregates remain unavailable until approved readers provide them. These are not inferred from saved state, activity volume or private research.
