# Smart footer + verified link registry + Raziel link answers — 5.11.2026

Task `2029_SMART_FOOTER_RAZIEL_LINK_REGISTRY_20261105` · assignment `fe3a6910-42d5-4324-a863-6f8007ea37cd` · WRITE, **BRANCH_ONLY** (no merge, deploy, DB/RLS/Auth, publication).
Branch `claude/awesome-dirac-q95gjl` from `origin/main` `11346873d`.

## What changed
| Area | File | Note |
|---|---|---|
| Link registry (single source) | `supabase/functions/_shared/siteLinkRegistry.js` | 22 entries: 16 internal routes, newsletter (section), WhatsApp, 3 socials. Each has `availability` (open / building / account / section) and Hebrew aliases. |
| Raziel answers | `supabase/functions/_shared/razielSiteLinks.js` | Deterministic "where is X / link to X" grammar over the registry. No model, DB or network. Runs only after the existing navigation grammar returns nothing. |
| Site transport | `src/lib/research/razielSessionRequest2029.js` | `resolveRazielNavigationTurn` falls back to the site-link answer (text-only turn, existing deterministic path). |
| WhatsApp transport | `supabase/functions/wa-raziel/index.ts` | Same fallback, same text. **Edge function is not deployed by this branch.** |
| Footer | `SiteFooter2029.jsx`, `siteFooter2029Model.js`, `siteFooter2029.css` | Lazy-mounted at the end of `<main>` in `SystemFrame2029.jsx`. Not fixed, not a second bottom nav. Theme tokens `--s29-*` only. |
| Knowledge map | `src/lib/knowledgeMap.js` | Comment pointer only; legacy quick-nav data untouched. |
| Tests | `test/site-link-registry.test.mjs` | 10 tests (links, routes/locks parity, Raziel, footer wiring, suggestions). |

## Decisions / conflicts
- **Existing pinned contract kept.** `test/raziel-canonical-navigation-actions.test.mjs` forbids hardcoded URLs and `import` in `razielNavigationActions.js` and pins "איפה העולם", "תן לי את העולם" and "מה הלינק של דף המספר" as fall-through. Therefore the registry and answers live in two new `_shared` modules, `world` has no spoken aliases, and a number page without a number stays with the canonical grammar. No existing test was edited.
- **Availability follows `publicReadingPath`** (test-pinned): `/archive`, `/research` (Heichal), `/code` (ELS), `/start` are *closed* in the public reading release → shown as "בבנייה", never as live links, and Raziel says so without a URL. `/profile` and `/profile#notifications` continue to `/2029/me/*` (account) → marked "כניסה".
- **Newsletter**: only the existing `StayUpdatedCTA variant="footer"` (own availability probe and consent), lazy and mounted near the viewport. No second signup. Raziel points to the footer section, with no URL.
- **WhatsApp analytics preserved** (`trackWhatsappJoin("footer")`; the helper itself is a no-op in the public-reading release, unchanged).
- **DimensionFiveRail not mounted**: it is a Legacy component (legacy palette, direct posts query). Dimension Five stays reachable via `/category/מימד חמש`. Progress is one compact line from the existing `BUILD_PUBLIC_PROGRESS` linking to `/map`.
- "המחקר שלי" (`/research`) was merged into the single Heichal entry to avoid two entries for one href.
- Internal URLs are percent-encoded (`/category/מימד%20חמש`) so a space cannot break a chat link.
- Legacy `layout/Footer.jsx` (Legacy app) is untouched.

## Evidence
- `node --test test/site-link-registry.test.mjs test/raziel-canonical-navigation-actions.test.mjs test/raziel-canonical-continuation-href.test.mjs` → 38 pass, 0 fail.
- `node --test src/lib/research/razielSessionRequest*.test.js src/lib/research/razielRoutingClosure2029.test.js src/components/experience2029/*.test.js test/g3-reliability-preclose.test.mjs` → all pass.
- `SOD_BUILD_TARGET=2029 vite build` → success.

## Not verified / open
- **No browser evidence.** An ad-hoc static server of `dist/` entered a client navigation loop in this sandbox, so 320/390/768/1440 screenshots, theme checks and an axe pass were NOT obtained. Layout is written mobile-first (44px targets, grid collapses at 760/360px, `prefers-reduced-motion`), but this is unproven until a Preview run.
- The site Raziel thread shows the answer URLs as plain text (no new clickable chip), so as not to touch the thread seam or the opening-graph budget. A follow-up could add a registry-validated link button.
- `wa-raziel` and the Vite lazy chunk share the new modules; the edge function needs a separate, explicitly authorised deploy.
- Visual/Isolation/ELS full suites and the canary were not run. No thresholds changed.
- No draft PR was opened by this run; the branch is pushed only.
