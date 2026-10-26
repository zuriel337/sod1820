# Contributor rank — 3D public presentation

Actor: GPT. Task: PUBLIC_CONTRIBUTOR_RANK_3D_20261023. Handoff to: ZURIEL.
Branch: claude/2029-contributor-rank-3d-20261023.
Parent: 7e844cdb709284c5631735d508744808f24e09bc (the previously reviewed isolated contributor/catalogue implementation). Its required cfa786c1 World reader base is preserved.

Status: IMPLEMENTED_LOCAL / TESTED. This extends the existing contributor presentation and existing research_level_of rank authority. No rank/XP formula, currency, badge registry, graph, database schema, migration, grant, RLS policy or site_flags change.

## Result

A faceted six-sided 3D glass seal, sapphire/gold semantic palette, two depth orbits, actual rank numeral and five stage markers. CSS perspective/preserve-3d/front/back/side faces implement real 3D geometry; no canvas, WebGL, Three.js import, continuous rendering loop or new dependency. A keyboard-accessible rotate button and bounded mouse tilt provide interaction. Reduced motion removes interpolated motion. The semantic rank text remains outside the decorative aria-hidden geometry and available to screen readers. A flat fallback preserves the text if 3D transforms are unsupported.

The same component is mounted in the general contributor header and Tzvi source-catalogue header. It adds no global shell, navigation or bottom bar.

## Canonical rank and privacy

The existing public function research_level_of(p_user uuid) is the only rank authority. Its live definition and anonymous execute grant were read; no formula is reproduced or changed. It already supplies a level (1–5) and Hebrew label, with a possible existing seniority floor. The UI does not derive rank from likes, source count, text length or finding strength, and does not invent a progress percentage/next-stage threshold.

A new **read-only** same-origin endpoint, /api/public-contributor-rank?slug=<canonical-code-or-slug>, uses the existing anonymous getPublicResearchClient. It resolves the exact active public contributor and its existing account binding **inside the server handler**, then invokes research_level_of. It never trusts a caller-supplied user ID, mode, JWT or admin cookie. No service-role key is introduced.

The response allowlist is exactly state/level/label when ready; other responses carry only state. Account IDs, XP, per-activity counters, raw function payload, private metadata and database error text never leave this handler. Private/inactive/unknown profiles do not receive a rank RPC. An unlinked account remains unlinked, not rank 1. Errors remain unavailable, never zero. Requests omit cookies, responses use no-store. The rank fetch is once per profile/explicit retry, not once per content card, and does not block catalogue rendering.

**Live anonymous verification, 23 October 2026 (Israel):** Tzvi resolved through the endpoint's actual anonymous reader to `{state:"ready",level:5,label:"חוקר היכל"}`. This result is not hardcoded in product code. Controlled visual fixtures use the same shape and are explicitly marked test data. The opt-in live browser check captured only the public rank response, not the account binding.

## Validation

- Six new focused rank tests: canonical account binding, exact RPC reuse, field allowlist, hidden/unlinked profiles, unknown vs zero, GET-only behavior, ignored administrator headers/cookies/caller IDs, bounded errors, same-origin credentials-omitting browser requests.
- Sixteen existing focused contributor/catalogue tests remain passing.
- Existing contributor projection, World surface and public-language checks pass; build:2029 passes with pre-existing chunk/dynamic-import warnings.
- A separate build of the deliberately unrouted review entry compiled the new component and CSS.
- Nine rank captures: 320/390/1440 × Day/Parchment/Night, plus three seal close-ups.
- Browser assertions: actual matrix3d/preserve-3d, keyboard rotation, unchanged semantic rank after rotation, ≥44px control, ARIA text, visible focus, no horizontal overflow, zero WebGL/canvas contexts, reduced-motion duration 0, 20 initial Tzvi source cards.
- Loading/unlinked/not-found/unavailable states do not acquire a default numeric rank. Anonymous live rank response is exactly the three allowlisted fields.
- Existing general/catalogue browser regressions were rerun using synthetic anonymous/admin responses. Their rank request is intercepted separately so they remain independent of live rank data.

## Ownership / remaining central integration

A fresh bounded work_log_current read found active task RAZIEL_SESSION_FRAME_SEAM_PREVIEW_20261021 retaining src/App2029.jsx ownership for its provider mount. Under AGENTS.md ONE FILE / SCOPE — ONE ACTIVE WRITER, this session does not modify that file even though our route hunk differs. Existing routing patch remains unapplied for the central owner. No agent was dispatched or messaged. No work_log write is claimed; this is the passive handoff.

Unchanged: App2029, vercel.json, Legacy ContributorPage, SystemFrame, World/Home/Post/Books/Number/Researcher pages, existing rank engine/hook/RankCard, existing source readers, DB and Production. No push, merge, hosted Preview or production action occurred. The rank API is tested locally and prepared for the eventual branch deployment; the public contributor route is not claimed live.

## Recommended next product work

1. **נבחרי הכותב** — a compact editorial selection using existing approved page_config/highlight identities and exact source links. No copied articles or implied truth upgrade.
2. **קהילה** — separately verified received likes, received replies and authored messages. Preserve archive provenance and distinguish administrator boosts from distinct people. Keep activity rank, community engagement and finding strength separate.
3. **להכיר את הכותב** — short public interests/about text and an optional existing public portrait beside the seal. Do not infer identity or interests from private activity.
4. **Progress to the next rank**, only if the canonical engine later returns an explicit public progress/threshold contract that correctly handles seniority floors. No client-reconstructed XP formula or invented percentage.

## Local review

The existing fixture harness accepts `scenario=catalog&theme=dark&rank=ready` for controlled 3D review; `rank=live` explicitly opts into the actual same-origin rank endpoint. The product page never reads these fixture query switches. Use a local Vite proxy for /api/public-contributor-rank to a Node server running the new handler, or the normal Vercel preview runtime once central route ownership is resolved.

Run `CONTRIBUTOR_REVIEW_PORT=5182 CONTRIBUTOR_VERIFY_LIVE_RANK=1 python test/public-contributor-rank-2029.browser.py` against that localhost review setup. Omitting CONTRIBUTOR_VERIFY_LIVE_RANK keeps the new rank test offline. Older browser scripts accept CONTRIBUTOR_REVIEW_PORT and retain 5181 as their default.
