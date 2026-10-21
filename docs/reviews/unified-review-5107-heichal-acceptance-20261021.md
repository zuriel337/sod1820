# Unified review · Post 5107 + Heichal — integration and acceptance evidence (21.10.2026)

**State:** `BRANCH-ONLY`, hosted read-only **review preview**. Not merged to `main`, not deployed to Production, no live-site data, DB, RLS, `site_flags` or server capability touched. Task `UNIFIED_2029_REVIEW_5107_HEICHAL_20261021`. v9 (persistent share) stays `PROPOSED_ONLY`.
Branch `claude/2029-unified-review-5107-heichal-20261021` over `gpt/2029-unified-els-integration-20261020` (`e403217f`). The earlier approved preview branches, their source and their URLs are untouched.

## 1. Controlled integration (order approved by ZURIEL)
| # | Step | How |
|---|---|---|
| 0 | existing GPT preview display unlock (`18ad4bec`, `e96424bf`, `db10cf55`) | cherry-picked unchanged: attested read-only Hybrid host/worker only, canonical lock rule and `site_flags` untouched |
| 1 | frame fixes `bc6d4bf8` | cherry-picked (`6e35ebcd`) |
| 2 | Heichal stage 2 `37978247` (with PR #1138 line) | merge `d25cc78c`, **only the Heichal files**: components, libs, page, tests, copy test. Excluded as unrelated Legacy / main-line changes: `LegacyNewsletterInvite`, `LayoutCore`, `App.jsx`, `AGENTS.md`, `CLAUDE.md`, `AGENT_HANDOFF.md`, Owner Index, `gpt-delivery-disabled-v17.sql` |
| 3 | Posts stage D `10e4a9e2` | merge `97effb67` (clean) |
| 4 | mobile island V1 `26d6ec08` | merge `fef103c6`, three documented hunks: keep ShellPortal + busy effect, add `question` label and `contextSubjectRef`, pass `onReturnExact={returnExact}` to **both** the original Action panel and the merged Actions tab |
| 5 | hosted-preview guard | `89b35bc6`: one exact new approved branch (constant + `deploymentEnabled` entry); every host/commit/shallow/read-only gate unchanged |
| 6 | Heichal return control | `9e446a39`: the page-level return button existed unconditionally (dead without a target, doubled beside the desktop header control); now only with a stored target, hidden at ≥981px |
| 7 | preview-only 5107 gate in the review build | `38e5ab79`: `build.env.VITE_ELECTIONS_631_PREVIEW=true` for this branch's hosted build only (path-scoped, fail-closed; revert if not wanted) |

**Canonical free question:** one definition, `src/lib/research/freeQuestionContext.js`; `heichalEntryDirections.js` re-exports it (a test fails if a second definition appears). Strict: needs `entryIntent=free_question`, phrase subject equal to the question, no exact expression; only Heichal produces it, so ordinary calculator phrases are unaffected.
**Routes (mapped once, in `HEICHAL_DOMAIN_GATES`):** `/calculator`, `/code`, `/books`, `/world`, `/journey` (personal data stays with the destination), `/kingdom` (door only in a build that includes it). No new routes; a test checks each exists in `App2029.jsx`.

## 2. Tests (final head)
117 tests, 114 pass, 0 fail, 2 skipped (artifact-dependent). Includes: Heichal stage 1/1.1/2 and guided decoding (40), frame free-question/return, shell V1 (18), unified post shell, Posts D, 631 context, Companion, hybrid preview routing/build/guard, visual unlock, community read-only, and the new `test/unified-review-integration-2029.test.mjs` (7: one free-question definition, route map, one return handler and no dead/doubled control, frame guards, exact hosted-branch approval with earlier branches kept and guards intact, display unlock is the attested projection, pilot scope without island share). Also `test-2029-system-frame`, `test-experience-context-2029`, `test-public-2029-language`, W2 composer, `build:2029`: PASS.
Pre-existing, not changed: `test/hybrid-preview-build.test.mjs` "local server routes candidate paths…" fails **on the base too** when a local hybrid artifact exists (it expects `/code` → Legacy, but `9a91d94f` exposed `/code` as 2029).

## 3. Acceptance (local guarded hybrid preview, Chromium, anonymous reader; the same builder and read-only guard as the hosted preview)
- **Display unlock:** all 8 routes (`/heichal /world /number/776 /post/… /calculator /code /books /journey`) open, no lock page, frame present, no JS errors, theme applied, at 320/390/768 × Day/Parchment/Night (72 loads).
- **Journey 776:** Heichal (anchor 776) → World → Number (`/number/776`): exact return from the Number page lands on World with 776; Heichal → World → return lands on Heichal with root 776; Heichal → Number → return lands on Heichal root 776. Verified through both the Action panel control and the navigation-sheet control at 320, 390 and 768.
- **Return controls:** header control hidden ≤980; never more than one enabled control at a time (page control only with a target; sheet and panel are exclusive overlays); every control calls the frame's single `returnExact`.
- **Free question** ("איפה מופיע פה אל פה במקרא?"): no request at all after submit (the text is in no request), no writes; island Tools = World/ELS/Books only (no 123/gematria), Action = Raziel only; no `phrase:` text, no save/research/share, at 390 and 1366.
- **Sources / pilot:** 5107 pilot active (`data-shell-review`), tabs קשרים | התכנסויות | מקורות, anchors `post-sources`, `post-connections`, `post-discovery-meeting` present, source tab opens `#post-discovery-sources`.
- **Privacy:** only GET reads and the existing read RPC allowlist; no write; the 631 reader is bounded and filtered `is_verified=true&is_published=true`; the Bennett link triggers only an `id,slug` lookup of an anonymously readable row, no draft content.
- **Performance (3-run median, 390px, local, vs unified + the same unlock):** FCP 396–488 ms vs 372–464, LCP 760–2348 vs 792–1948, CLS equal (0–0.054), requests ±2, DOM +20 on Heichal, Post Supabase requests 26 → 23. Within noise except Number LCP (+400 ms, one cold Supabase round trip; not reproduced as a regression source). JS transfer bytes were not available (no content-length).

## 4. Findings that were **not** changed (pre-existing / outside this scope)
- **Single-level exact return:** the Research Context keeps one `returnTo`. Heichal → World → Number → return gives World, and World then has no return to Heichal. A multi-level return would change the Research Context contract (needs its owner and a Human Gate).
- Now-tabs are 36px wide (<44px) at ≤380px on every surface except the 5107 pilot; Number page has no `h1`; the Post renders two `h1`; a one-off `/calculator` horizontal overflow at 320 appeared once in the sweep and did not reproduce.
- Admin vs anonymous, Safari/Firefox, a physical phone, safe-area insets and the hosted URL itself (egress to `*.vercel.app` is blocked from this environment) were **not** verified.
