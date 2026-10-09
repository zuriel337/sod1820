# Kingdom of Numbers — phase 1 review handoff

Task: `KINGDOM_OF_NUMBERS_2029_CODEX_MASTER_V1`
Canonical brief: `work_log.id=48e2c9f4-f83c-42be-9995-769788f64ccc`
Actor: GPT · Date: 2026-10-09
Branch: `codex/kingdom-of-numbers-preview`
Baseline: `origin/main` at `8e939d3b` (clean, no divergence at start)

This is implementation evidence for the existing task, not a new contract or owner.

## Review the game

```sh
npm run preview:kingdom
# Open http://localhost:4173/2029/kingdom
```

The command builds a separate output in `dist/kingdom-preview`, serves the existing
2029 entry on port 4173, and blocks live service connections with a preview-only
CSP. No production credentials or live writes are required. Stop with Ctrl-C.
This is a local working preview, not a hosted deployment or production release.

Normal builds exclude the page and route. `VITE_KINGDOM_PREVIEW=true` is an
explicit build-time opt-in. The `/2029/kingdom` route remains a preview proposal;
no global navigation, route registry, hosting rewrite or public availability is
promoted by this change.

## Implemented

- Gate, CSS isometric map, three buildings, ten Hebrew numeric challenges,
  five upgrades, one internal resource (אור), gameplay XP, and a discovery journal.
- Correct answers reward once. Upgrades enforce prerequisites, discovery counts
  and affordability. Unlocking/upgrading the factory turns subsequent discoveries
  into finite collectible production; collection cannot be repeated for a reward.
- Versioned browser-local demo progress is restored by replaying bounded valid
  actions. Corrupt storage and unavailable storage have safe fallbacks.
- Existing `ResearchIcon`, `SystemFrame2029` (registered `journey` surface), palette,
  typography and theme store. No edits to the active shared-chrome writer's files.
- Existing Number expression/method URLs and frame navigation provide research
  handoff and return; Books and ELS use their existing routes. No parallel engine.
- All presets, RTL, keyboard activation, live feedback, 44px controls and reduced
  motion. Mobile uses compact building rows; desktop has a wide spatial map.

The local preview intentionally blocks online research/auth/analytics traffic.
Research navigation is tested as a route/context handoff, not as a live research
result fetch. Its target pages retain the existing online owners.

## Numeric evidence

All ten operands were checked read-only against canonical project
`linswmnnkjxvweumprav` on 2026-10-09 with `fn_method_profile(phrase,'value')`.
Every selected method was active, definition version 1. The active
`gematria_engine_law` was v2. Operands are exact unpointed Hebrew expressions.

| Expression | Method | Result |
| --- | --- | ---: |
| אב | רגיל | 3 |
| לב | רגיל | 32 |
| אור | רגיל | 207 |
| חיים | רגיל | 68 |
| שלום | רגיל | 376 |
| מלך | סידורי | 36 |
| אחד | רגיל | 13 |
| אהבה | רגיל | 13 |
| תורה | סידורי | 53 |
| ברכה | סידורי | 38 |

Replay the fixture evidence using SELECT only:

```sql
select f.phrase, p.method_key, p.computed_value,
       p.lifecycle_active, p.definition_version
from (values
  ('אב','רגיל'), ('לב','רגיל'), ('אור','רגיל'), ('חיים','רגיל'),
  ('שלום','רגיל'), ('מלך','סידורי'), ('אחד','רגיל'), ('אהבה','רגיל'),
  ('תורה','סידורי'), ('ברכה','סידורי')
) f(phrase,method)
cross join lateral public.fn_method_profile(f.phrase,'value') p
where p.method_key=f.method;
```

The UI reuses `METHODS` from `src/lib/gematria.js` and fails closed when a fixture
no longer agrees. It does not claim current server validation of a player's answer.
The fixture verification date and gameplay/research distinction are visible in
the journal. Equal numbers do not establish a historical or interpretive claim.

## Verification

- `npm run test:kingdom`: 4 tests pass, including all ten engine fixtures,
  invalid/duplicate/locked actions, the complete economy and corrupt save replay.
- Playwright: 14 cases pass: 320/390/768/1440px × Day/Parchment/Night; complete
  ten-challenge/five-upgrade flow; unavailable local storage. Tests include RTL,
  no horizontal overflow, minimum control dimensions, reduced motion, keyboard
  entry, wrong answers, hints, reload persistence, journal and research handoff.
- Targeted follow-up: the complete game → Number → canonical exact-return flow passes after wiring the destination context in the game adapter.
- `npm run build`: legacy and 2029 builds pass; the default production manifest contains no Kingdom page.
- Existing isolation source/built-graph, System Frame and calculator Golden checks pass.
- Screenshots: `/workspace/artifacts/kingdom/` (local review artifacts).

Browser runner: `@playwright/test@1.55.0`, installed outside the repo. The downloaded
Chromium 140 rendered even a plain Hello page with no text in this environment;
using `/usr/bin/chromium` restored text rendering. No product workaround was added.

To run browser acceptance against the local preview, install Playwright in your
normal test environment and run:

```sh
npx playwright test tests/kingdom2029-preview.spec.cjs
# Optional environment-specific executable:
KINGDOM_CHROMIUM=/usr/bin/chromium npx playwright test tests/kingdom2029-preview.spec.cjs
```

## Boundaries and next handoff

Owner verdict: EXTEND_EXISTING — Experience/Design V2/System Frame, Gematria
Engine/Method Registry, Research OS navigation. No new owner, icon registry,
calculator, ELS implementation, research store or analytics system.

Live coordination was read through the general Supabase connector (not a
technically read-only credential), using SELECTs only. Relevant current writers
were checked before implementation and again at completion. The existing
SystemFrame header/rail writer was excluded; no overlapping Kingdom/App2029
writer was found in the bounded live scan. No claim, ACK or AFTER was written to
Supabase because this session preserves the user's no-live-database-write boundary.
The canonical task therefore still reads PLANNED; this file does not imply that
an authorized coordinator received or recorded an AFTER.

Release advice: HOLD_FOR_PHASE_1_REVIEW. Implemented and locally tested;
not merged, deployed, or LIVE. No main push or database changes.

Before phase 2, review the route and game direction, obtain approval for server
persistence, and resolve the existing authorized server owner for transactional,
idempotent rewards, account-scoped access and rate limits. Local demo actions and
balances are editable by the browser and must never be imported as trusted server
balances, account credit, researcher mastery or research truth. No automatic
migration of local demo progress is provided. Social sharing, account persistence,
production analytics and the advanced zones remain deferred as in the brief.

Handoff to: existing authorized coordinator / ZURIEL for prototype review.

## Hosted review follow-up — 2026-10-09

After the user reported that the localhost link was inaccessible, the tested
static output from commit `90b9e5a7687531377063561fca431f004610c0f1` was uploaded
as a Preview to the existing Vercel project `sod1820` (team
`team_vtfWHZfKvdbob8gvynQb5N89`, project `prj_43q7k7QFAcWnin1tcBjce5xOi7Cq`).
This supersedes the initial local-only deployment status above.

- Deployment: `dpl_3LugfJCw1PUcbAm1tPidMMWCsCwa`, READY, preview (`target=null`).
- Host: `sod1820-fl0x5w1xb-sod1820-s-projects.vercel.app`, path `/2029/kingdom`.
- Build: static Vite/React output, about 3 seconds; no server functions supplied.
- Protection remains enabled; a deployment-scoped share link valid for seven days
  was supplied directly to the user, without storing its token in Git.
- A fresh mobile browser opened the shared URL with HTTP 200, entered the kingdom,
  solved the first challenge and received 20 demo light; zero JavaScript errors.
- Response CSP `connect-src 'self'; form-action 'self'` preserves the live-service
  boundary. No custom production alias, main push, merge or database write.
- Hosted browser screenshot: `/workspace/artifacts/kingdom/hosted-mobile.png`.
