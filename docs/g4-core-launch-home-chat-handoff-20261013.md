# G4 core launch — existing Home, legacy chat and locked World

Status: branch implementation and local verification only. No merge, production deployment or live database write.

## Scope

- `/` redirects to `/2029`. The existing adopted `Home2029Page` and `HomeComposition2029` remain the public Home. The temporary separate launch screen was discarded.
- The Home shows its latest post hero and post cards, ELS links, the gematria calculator and a direct link to the existing `/community/chat` page. Secondary Home reads no longer hold back the latest post.
- World discovery, group source arrivals, convergence cards and World links are removed from the public Home while `lock_world` is active. The public System Frame does not start its World feed watcher.
- `/world`, `/topic/:slug` and `/researcher/:slug` are guarded by the `lock_world` site flag. The branch migration seeds that flag. Admin access follows the existing `MaintenanceLock` admin bypass after the flag is installed.
- The new user area, journey, Heichal, Raziel and books retain their separate locked states. The old chat remains available as a separate existing route.

## Chat evidence

- `/community/chat` routes to `SpotimChatPage` in the legacy document. Vercel's catchall rewrite serves that document; the new Home and navigation link to the existing route. The old `/chat` alias still redirects there.
- The OpenWeb launcher and conversation module are unchanged. The canonical chat thread uses the existing `sp_OVtajBTj` spot ID and existing post identifier. The `openweb-sso` Edge Function is active on the canonical Supabase project (version 2, read-only listing on 2026-10-12).
- Browser tests on `localhost` receive OpenWeb `403` for conversation reads and show a communication error. Re-running the same built legacy document with the browser origin `https://sod1820.co.il` returned `202` for conversation async, `200` for conversation read/realtime, no communication error, and a writable editor. This identifies origin restriction in the local test. A Vercel-connected read of the live `/community/chat` route returned HTTP 200 with the legacy document.
- Signed-in SSO and posting a message were not exercised; that requires a real authorized user session and would write to the live external chat. Neither is claimed verified here.

## Local acceptance

- Full legacy + 2029 production build passed.
- `test-2029-isolation`, `test-route-legitimacy-2029`, `test-home-2029-system-pulse` and the three ELS launch-gate tests passed.
- Browser at 390px and 1440px: existing composed Home, four post cards, no horizontal overflow, no `world_group_source_arrivals_v3` request, no Home World stream/link, Home → chat → Home returned to `/2029`, direct World entry showed its lock.

## Release boundary

- `lock_world` and the other closed-capability flag rows have not been applied to the live database. Until the migration is applied, those `requireFlag` routes fail closed, including for admins.
- The `world_group_source_arrivals_v3` migration is still absent live. World remains closed; the broader #1064 World CI stays red until that migration and source acceptance are completed.
- Security #999 still lacks its independent MAIN GO and trusted server-side denial evidence. This branch is not a production GO.
