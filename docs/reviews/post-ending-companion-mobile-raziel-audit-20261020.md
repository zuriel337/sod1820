# 2029 · Post end, all rails, mobile and Raziel — acceptance audit (20.10.2026)

**State:** isolated review implementation, **not** a new contract, score, store, approval workflow, production deployment or a whole-site release. Canonical owners remain `SOD1820_DESIGN_CONTRACT_V2.md` §§11.1–11.8, `docs/sod1820-system-frame-contract-v2-addendum.md` §§10.2–10.4, Master Owner Index, Research Context, `project_codex id=37`, and existing Publishing/Reality Graph/Raziel owners.

## Product decision / scope

- Keep Post 5107's original authored body unchanged. After it, the **existing** Continuations, Convergence Measures and source-context data are *projected* into an in-flow menu **״קשרים | מפגש | מקורות״**. The Post still has its own published source line, timeline, comments and exact return; no duplicated event/graph.
- The desktop LEFT `CompanionPanel2029` continues **עדכונים | הקשר | רצף**. When its Post-5107 Context is active, `SurfaceContextRail2029` presents only the six-cup **coverage** shortcut, lightweight reading orientation and actions. Full 631/1820 explanations and source listing are no longer within that panel.
- The 6D owner is unchanged: `ContextDepthMeter2029`, `buildContextDepth`, six *independent coverage statuses*, no aggregate score. 631 context-first, 1820 follows through an authored method link; one Post source group. 631 `gematria_words` public rows and canonical `METHODS` replay are checked through **one bounded reader only after opening the Post**. Neither tags nor unpublished rows become independent witnesses or link approvals.
- Only six small coverage strings (plus Post identity) enter the existing `ResearchContext.dimensions` as an ephemeral projection pointer. The original source and full calculation data remain with their Post and method owners; no parallel cache or Graph.
- This experiment is **gated by `VITE_ELECTIONS_631_PREVIEW=true`**, scoped to Post 5107, fail-closed on draft/private/unavailable source. Ordinary Posts and Legacy retain their current experience.

## Cross-viewport chrome ownership inventory

| Surface | Desktop / wide | Phone 320/360/390 | Owner and boundary |
|---|---|---|---|
| Global navigation | RIGHT navigation rail + small top header | 56–60px minimal topbar, one navigation sheet | `SystemFrame2029`; not a new Post header/nav |
| Reading place | in-flow section map; Context orientation | existing contextual Page Map / locator just above Island | `SurfaceSectionNav2029`, `SurfaceContextRail2029`; not a duplicate permanent toolbar |
| Updates / Now | LEFT Companion Updates; one World public stream | one Now launcher in the Post-5107 visual pilot, existing Attention sheet | `useSystemFeed2029` and Frame; no second feed/read-state |
| Post context / six cups | LEFT Companion Context: **compact** six statuses | inside the existing Context sheet: same six statuses, no additional floating indicator | shared `ContextDepthMeter2029`; on click navigates to post-end Meeting |
| Research actions | one Command Island with context trail | **one** bottom Command Island, respecting safe area | `SystemFrame2029`; no permanent Post footer |
| Raziel presence | orb and, on non-Post surfaces, compact chat in Companion | orb physically centered in Island; opens existing transient mobile sheet | existing `RazielProjection`, `RazielNativeChat`, `askRaziel`; not owned by Post or the meter |
| Post deep dive | after the article: Links / Meeting / Sources | **in-flow** three-tab strip (44px minimum), no third fixed rail | Post owner + context/read-only projection |

### Mobile shell experiment

At 320–620px **and only when `data-shell-review=elections631`**, the existing three Now shortcuts condense to one `world/Attention` launcher. Its two adjacent slots (Workspace and Raziel) were duplicate entry points: Workspace remains in the topbar/navigation sheet, Raziel remains in the central Orb. The extra floating feed chip is hidden when the Post already has its contextual locator. These are **presentation changes only**; handlers, semantics, one public feed and permission owners are unchanged. Do not extrapolate the result to other pages without visual acceptance.

**Risks to verify visually:** narrow widths must not squeeze the Source text or Orb, obscure focus under the Context locator and Island, duplicate Now/Companion indicators or cause a third sticky row; all keys, selected source hashes and return-to-exact-region must work.

## Raziel (does it belong here?)

**Yes, to the same contextual shell; no, to the post's evidence/rating engine.**

- The small Companion `RazielNativeChat` is presently **not mounted on the Post surface** (`razielNode={razielLocked || surface === "post" ? null : ...}`). This is deliberate to keep reading clean.
- On Posts, the same **existing** centered Orb, contextual `SurfaceContextRail2029` action and transient `RazielProjection` expose Raziel. No new Raziel component or provider was created here.
- `RazielNativeChat` sends only on explicit user Submit; opening and rendering must cost zero model calls. Its bounded `buildSurfaceSemantic` / `readingFocus` DTO may refer to the same Post, number or source. Never pass HTML, unpublished findings or entire six-dimensional graphs in an AI prompt.
- **Open seam, not fixed here:** the native compact chat holds a local thread and the transient/full chat is another mounted instance. This is not evidence of durable cross-instance conversation memory or seamless transcript transfer. Its owner should review continuity separately; do not create a Post-specific memory/chat store.
- No automatic commentary, fact promotion, source approval or publication occurs because someone clicked a cup or a Post connection.

## Technical acceptance checklist before integration release

1. **Code and build:** the preview feature flag is exclusive to integrated Preview; the normal build and unrelated routes do not eagerly fetch review rows. All tests and navigation/egress guards must pass without lowering the security gate.
2. **Desktop and mobile:** 320, 360, 390, 620, 980, 1100, 1440 px. Day, Parchment and Night. Long Hebrew authored headings, orientation, icon/label consistency and no sideways scrolling.
3. **One meaning per layer:** 631/corpus publication, unpublished authored winter equality, 1820 filled method and 6D coverage are not rolled into a synthetic number; one-source dedup stays clear. Editor/approval unknown remains *טרם מופה*.
4. **Correct interactions:** post body → after-Post Links → Meeting → Sources; slide into the existing Companion's compact cups → Meeting, then return exactly; browser back/forward, share link, full reload; post-connections/post-sources/older update anchors; reduced motion, keyboard tab+arrows and visual focus.
5. **Chrome:** top nav and mobile menu, Context/Page Map, one bottom Island, Now launcher and Orb; no overlap of keyboard, safe area, unread feed chip, Context locator or tab bar. 44px touch targets, aria labels/selected state, controlled sheet close.
6. **Privacy:** anon vs admin, protected source corpus and draft Bennett (5113) must not be exposed by tags/Graph projection. Nothing in Preview posts, Supabase, RLS, Legacy or production changes.

**Verified so far:** source and method contract examination, bounded Post context reader, static tests/projection-level checks. **NOT YET VERIFIED:** browser acceptance, full G4/Isolation gates, visual/mobile approval, release. These are non-negotiable before merge or Preview redeployment.
