# Community calculator continuity — branch implementation

Base: `9d3a09689a05bd0b72ca484335c1fbce8b538170`. Scope: F15, with F14/F31 distinction retained. Coordinator verified the bounded BEFORE record `5fbf9e75-b445-4da4-bf24-dfc485387b8f`; this branch does not write the live ledger.

Status: IMPLEMENTED / UNIT TESTED. Route/HTTP integration, full build, browser acceptance and release remain with the root integrator. No deployment, database mutation, Auth, engine, global Frame or route ownership change is included.

## Integration

Register the existing address `/community/calculator` with the default export of `src/pages/CommunityCalculator2029Page.jsx`. It takes no props and supplies its own `Sod2029Shell` (`surface="community"`, `introVariant="none"`). Do not wrap another Frame.

Server metadata should describe this calculator: **מחשבון הקהילה — גימטריה, שמות ותאריך עברי**. Suggested description: **מחשבון הגימטריה הקהילתי של SOD1820: השוואת שמות, בדיקת שמות לתינוק, שם משפחה ותאריך עברי, עם קישור לחזרה ולשיתוף.** Canonical document: `/community/calculator`; names/dates from queries must not enter metadata. Client metadata stays `noindex: true` for Preview. Deployment policy remains the route/metadata owner's responsibility.

`CommunityCalculatorPage` gains optional `initialState`, `renderCalculator`, `renderBabyTool`, `passive` and `actionsLocked` props. With no props its Legacy markup, palette, calculations and UI flow remain the existing defaults. The new composition consumes its view models; it has no calculation implementation. `passive` suppresses automatic telemetry, wall publishing and delayed deep-name mounting. `actionsLocked` guards both existing AI handlers and wall/telemetry effects. The new route derives the action lock from `publicLaunchActionsLocked(useAuth().isAdmin)` and always sets `passive`.

## Preserved behavior and URLs

- The existing engine envelope supplies every available calculation row. At this base that is **23 methods**, exceeding the historical “13 methods” description; the adapter neither caps nor expands the roster. Regular, filling and hidden remain the initial discovery view; every row is available through the all-methods disclosure.
- Comparison keeps both names and same-method equalities. Baby mode keeps one to three names, optional family name, optional birth date and descriptive family/date matches. Date conversion uses the existing `@hebcal/core` path, with `next()` once after sunset; the baby date path shares this existing sunset semantics.
- Reads use the existing method-state and published/verified phrase readers. Automatic Legacy wall publishing, VisitorSearches, NameMultiSearch and telemetry are not mounted/executed in the 2029 composition. Public AI is unavailable through the existing profile gate. No save/write affordance is introduced.
- Recognized inputs: `w` (also `q`, `calc`, `name1`), `w2` (also `name2`, `compareWith`), `method`/`m`, `result`/`v`, `mode`, `compare`, `babyMode`, `dateMode`, `date`/`gDate`, `afterSunset`, repeated `babyName`/`names`, `family`/`surname`, `birthDate`/`bDate`, `babyAfterSunset`, `context`. Existing unrelated/repeated query parameters, share IDs and fragments survive serialization. Known credential/protection fields are removed using the existing public-share sanitizer.
- Arrival does not rewrite the address. Edits replace the current browser history entry; refresh/back restores the form, including hidden inputs and the active mode. Exact Number return uses the original address until an edit, then the current serialized state. Existing research navigation carries the selected expression, method and value. Related phrase links focus the clicked phrase, not just its shared number.
- Unknown methods remain unavailable instead of falling back to Regular. A conflicting shared result gets a visible notice and cannot become calculation truth. Invalid calendar dates are not rolled into a different day.
- Sharing uses the existing `ShareActions` with the full form state and current deployment origin. It supports link/native/WhatsApp sharing; it does not mount the Legacy generated-card download or preview image.

## Scope limits

`/gematria` and its F14 aliases remain the regular calculator route owner's scope. `/name`, `/שם` and `/name-lab` are not aliases of this page: the existing NameLab includes verse/dossier/cross-language research, so no equivalence or redirect is claimed for F31. The public profile does not gain those engines through this adapter.

No numeric formula, method registry, database/server reader, Auth or shared Frame file changes. No alternate palette or fixed navigation is added. Styles use shared 2029 tokens and apply only under `.sod29-community-calc`. Desktop is centered with bounded width; mobile controls reflow at 320/390 widths, with shared typography and 44px-or-larger targets. Actual browser/layout acceptance is still pending central integration.

## Checks

`node --test test/community-calculator-continuity-2029.test.mjs test/community-calculator-runtime-2029.test.mjs src/lib/research/gematriaCalculationContract.test.js`

20 checks: URL round trips, repeated sources, share credentials, all existing method identities/results, unknown/mismatched method-result states, exact typed Number return, sunset conversion, actual mounted controller/component state, zero wall/AI/telemetry/deep-search calls on public mount/typing, and baby/date editing. Runtime tests use the repository's existing esbuild + React renderer fixture pattern, with external services stubbed and the real calculation/date engines retained. The React renderer emits its standard deprecation notice.

Both edited JSX modules also passed Vite's syntax transform with no warnings; `git diff --check` passes. Browser and full builds were deliberately left to the root integrator under the assigned scope.

Suggested central acceptance URLs:

1. `/community/calculator?w=אור&method=מילוי&result=643&source=a&source=b#result`
2. `/community/calculator?mode=compare&w=אור&w2=רז&method=רגיל&result=207`
3. `/community/calculator?mode=baby&babyName=אור&babyName=רז&babyName=שלום&family=לוי&birthDate=2024-04-22&babyAfterSunset=1`
4. `/community/calculator?mode=date&date=2024-04-22&afterSunset=1`
5. `/community/calculator?w=אור&method=unknown&result=999`

Check all modes at 320/390/1440 in the three existing themes, plus keyboard focus, method disclosure, share-copy, Number/phrase exact return, refresh/back and absence of automatic writes. These are acceptance tasks, not a claim of browser completion.
