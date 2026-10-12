# G4 core launch — existing Home, legacy chat and locked World

Historical launch scope. The later decision to open World while keeping Heichal closed is recorded in `docs/g4-world-open-cutover-sequence-20261013.md`; that document governs the current branch direction.

Status: branch implementation and local verification only. No merge, production deployment or live database write.

## Scope

- `/` redirects to `/2029`. The existing adopted `Home2029Page` and `HomeComposition2029` remain the public Home. The temporary separate launch screen was discarded.
- The Home shows its latest post hero and post cards, ELS links, the gematria calculator and a direct link to the existing `/community/chat` page. Secondary Home reads no longer hold back the latest post.
- Number is part of the opening scope: `/2029/number/:value` stays public, the core navigation opens its existing number search/drawer, and the calculator now has a visible “פתח דף מספר” action for a selected result.
- World discovery, group source arrivals, convergence cards and World links are removed from the public Home while `lock_world` is active. The public System Frame does not start its World feed watcher.
- `/world`, `/topic/:slug` and `/researcher/:slug` are guarded by the `lock_world` site flag. The branch migration seeds that flag. Admin access follows the existing `MaintenanceLock` admin bypass after the flag is installed.
- The new user area, journey, Heichal, Raziel and books retain their separate locked states. The old chat remains available as a separate existing route.
- The existing Home now keeps a visible notice that the system is under construction and sections open gradually. It does not replace the Home or its latest-post hero.
- The mobile Home reserves the post hero's loaded height, avoiding the large layout shift that occurred when the latest post and its update metadata arrived.

## User area bridge

- The 2029 workspace remains locked to public viewers. An admin can open its existing account, research and notification projection.
- Its profile/settings, public page/editor, private messages, credit details, contributions and hints cards now open the corresponding existing `/profile?module=...` module. The same Supabase Auth account remains active across the isolated document boundary; no duplicate user store or UI module was introduced.
- The legacy `/profile` launcher accepts only an allowlisted module and an internal return path. The return link brings the user back to the exact 2029 URL that opened it. Existing `/profile` and `#notifications` links keep their previous behavior.
- The old chat archive is a separate capability. Its transfer is not a prerequisite to connecting site user accounts, and the locked-area copy no longer says that it is.
- A browser smoke with a mocked admin account covered all six modules, the Home return and a nested calculator URL with query and hash preserved. Actual signed-in data, private-message delivery and account writes were not exercised against live user data.

## Chat evidence

- `/community/chat` routes to `SpotimChatPage` in the legacy document. Vercel's catchall rewrite serves that document; the new Home and navigation link to the existing route. The old `/chat` alias still redirects there.
- The OpenWeb launcher and conversation module are unchanged. The canonical chat thread uses the existing `sp_OVtajBTj` spot ID and existing post identifier. The `openweb-sso` Edge Function is active on the canonical Supabase project (version 2, read-only listing on 2026-10-12).
- Browser tests on `localhost` receive OpenWeb `403` for conversation reads and show a communication error. Re-running the same built legacy document with the browser origin `https://sod1820.co.il` returned `202` for conversation async, `200` for conversation read/realtime, no communication error, and a writable editor. This identifies origin restriction in the local test. A Vercel-connected read of the live `/community/chat` route returned HTTP 200 with the legacy document.
- Signed-in SSO and posting a message were not exercised; that requires a real authorized user session and would write to the live external chat. Neither is claimed verified here.

## Local acceptance

- Full legacy + 2029 production build passed.
- `test-2029-isolation`, `test-route-legitimacy-2029`, `test-home-2029-system-pulse` and the three ELS launch-gate tests passed.
- Browser at 390px and 1440px: existing composed Home, four post cards, no horizontal overflow, no `world_group_source_arrivals_v3` request, no Home World stream/link, Home → chat → Home returned to `/2029`, direct World entry showed its lock.
- Number browser smoke at 390px: direct 1237 and 1820 each loaded six method cards without horizontal overflow; calculator “שלום” → 376 opened the focused Number page and survived refresh. The desktop Number navigation opened the search/drawer and reached 1820. The smoke blocked telemetry/write requests; some optional `research_objects` reads returned 401 to the anonymous browser, while the number core loaded.
- A read-only mobile Home layout-shift smoke measured 0.0404 after height reservation, down from 0.4166 in the same harness (the 0.1 budget used by the CI browser acceptance). The previous CI run predates this fix; its broad World acceptance remains incompatible with the deliberately closed World.
- The new `G4 Public Core Gate` runs three focused browser scenarios on the isolated 2029 build: the adopted Home and opening links, posts → ELS → calculator → Number with refresh, and public locks for World/Topic/Researcher/books/Heichal/journey. The local run passed 3/3. The runner allows public reads but blocks Supabase writes; it supplies the five proposed closed flag rows as a browser fixture. For `/heichal` it mirrors the existing Vercel rewrite because Vite preview otherwise serves the legacy static file.

## Release boundary

- `lock_world` and the other closed-capability flag rows have not been applied to the live database. Until the migration is applied, those `requireFlag` routes fail closed, including for admins.
- The `world_group_source_arrivals_v3` migration is still absent live (only v2 is present). The new reader groups repeated public group-source messages while retaining private proof coordinates internally and returning sanitized public fields. World remains closed; the broad World browser suite still expects an open World and v3 data, so its failures do not describe the approved first public scope. It remains a gate for opening World later.
- Security #999 is a separate site-wide release gate, not a finding of personal user content in World. A read-only live catalog check on 2026-10-12 still found anonymous execute on `public.get_work_log()` and the 14 temporary anonymous Storage write policies named in #999 (plus the distinct `community_anon_upload` policy). The PR still lacks trusted server-side HTTP evidence and an independent MAIN GO. This branch is not a production GO.
