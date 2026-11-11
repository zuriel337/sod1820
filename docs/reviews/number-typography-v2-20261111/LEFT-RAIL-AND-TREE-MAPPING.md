# Number page: the left "ההקשר הפעיל" rail and the tree material (mapping only, no new design)

Status: mapping for ZURIEL's note of 11.11.2026 ("a lot of material from the tree has to enter the Number page; the left panel; a redesign").
Nothing here is implemented. It uses existing components and contracts only (SOD1820_DESIGN_CONTRACT_V2 §6.1; "the number or expression
itself is the focal identity, no generic hero").

## What the rail is today (public /number/<address>, desktop >= 1024px)
`SurfaceContextRail2029` inside `ContextualInspector2029` (`src/components/experience2029/SurfaceContextRail2029.jsx`), mounted by the shared frame
(`SystemFrame2029.jsx`, class `number-context-only`; recognised for `/number/` since commit 12c7cceed, before that only `/2029/number/`).
It shows: the number again (already the focal element of the page), a one-line "מה אנחנו חוקרים עכשיו?", the actions "פתח את N", "פתח בעולם",
"שאל את רזיאל" (locked for non-admins), and "פתח לעומק". Its two data slots are empty on the Number route:
- `surfaceSections` (the progress spine / page map) is `[]` (ResearchProvider `numberRouteSelection`);
- `surfaceFindings` ("חיבורים נוספים") is `[]`.
Posts and Topics fill both slots, so the rail there is a real map and a connection list. On the Number page it repeats the centre and carries nothing.

## Material that already exists on the page and in the tree (not in the rail)
From the mapping of 11.11.2026 (file:line in the earlier report): sections of `NumberLivingWorld2029` (verses, essential, worlds = convergence cards,
connections / related numbers, math + Prime Lens, expressions, sources + media, people, timeline, about, journey gate, deep gate), the hero
(methods grid, regular-expression rail, hidden crossing, meetings), `NumberPathContinuation2029`, Beit Midrash concept links (fibonacci, prime-lens),
topics (`/topic/<n>`), World / ELS / Heichal gates, Raziel (admin), exact return.

## Proposed use of the existing slots (needs ZURIEL's decision on the design before any code)
1. `surfaceSections` <- the existing `navItems` of `NumberLivingWorld2029` (ids already on the page). The rail becomes the page map with the active
   section marked; the in-page nav strip can then be dropped or kept compact. No new component: `SurfaceProgressSpine2029` is already what Posts use.
2. `surfaceFindings` <- related numbers / the convergence cards (worlds) / crossings, labelled by their existing reason strings, each opening in place
   with exact return, as Topics do.
3. The rail stops repeating the number; its title is the expression (the H1 of the page) and its actions stay.
4. Mobile keeps the existing context sheet (not a column).
Open design questions: whether the in-page strip is removed; which tree nodes (topic hubs, people, timeline) get a place in the map; item 18 (explained
updates / pulse) and item 24 (Kingdom of Numbers) of the 27-item plan have no contract that can be implemented yet.
