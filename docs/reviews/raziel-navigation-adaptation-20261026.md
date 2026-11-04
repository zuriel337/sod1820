# Raziel canonical navigation actions — adaptation over the personal-area companion base

Task `RAZIEL_CANONICAL_NAVIGATION_ACTIONS_ADAPTATION_20261026` · branch-only · no merge, no deploy, no Production, no research-run.

- TARGET_BASE `6e609ebed58024d01339148771a76c6ea351298c` (personal-area explicit companion seam)
- SOURCE `claude/smart-navigation-links-mtcd75` @ `cef782b8ae13b3be83a1987be60ac7b469ec34ea` — capability transferred by hand; the source commit is neither merged nor cherry-picked.

## What was carried over
One deterministic resolver (`supabase/functions/_shared/razielNavigationActions.js`) shared by the 2029 site (lazy submit chunk) and `wa-raziel`; zero model calls; clarification question when no verified number; canonical button on the site; warm sentence + https link on WhatsApp; site/WhatsApp parity; route-parity and 320px tests.

## What the base keeps, untouched
`personal_area_companion_v1`, `submitPersonalAreaCompanion`, the AbortController / principal-change cancel and late-response ignore, the narrow private context, `save_as_life_journey_hint`, the single Provider / session / transport, every existing Raziel mode and action.

## Acceptance corrections
1. `prepareRazielSessionSubmission`: companion action, continuation (`again`, `continuationTurnId`) and view-mode override are decided first; navigation is checked only for an ordinary explicit request. A companion answer is private context and never supplies a navigation focus.
2. WhatsApp focus is valid only from the latest continuous topic, a direct clarification answer, or a canonical link Raziel sent. An unrelated message ends the topic; a generic "tell me about X" is not a gematria subject. The site thread follows the same rule.
3. "פתח את מפת המחקר": with a verified number → the number page; without → the clarification question. `/world` only for an explicit "פתח את העולם" / "קח אותי לעולם". Owner decision on a research-map home is still open.
4. **Deploy gate (not met):** `wa-raziel` must not be deployed until `/2029/number/<n>` is verified reachable in Production. From this environment `https://sod1820.co.il/2029/number/73` answered `403 Access denied` (edge/proxy), so availability is **unverified**. A future deployment requires a real WhatsApp Canary (one allow-listed chat: explicit link, continuation, unrelated-topic question, ordinary model turn) before wider traffic.
5. Handler test: `test/raziel-wa-navigation-handler.test.mjs` runs the real `wa-raziel/index.ts` (types erased, imports replaced, synthetic Supabase / Green API / ai-analyze) via `test/helpers/wa-raziel-handler.mjs`.

## Known limits
- The existing handler gate ignores messages with no Hebrew letters, so a bare `73` never reaches Raziel on WhatsApp (pre-existing, unchanged); `המספר 73` answers the clarification.
- Saved conversations keep their whitelist: a restored navigation message shows its text without the button.
- A navigation reply still counts as an answered DM for the anonymous daily quota (guest cut unchanged).
