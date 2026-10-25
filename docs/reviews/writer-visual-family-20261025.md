# Person family visual alignment — semantic roles, reading size, hierarchy, mobile

Status: IMPLEMENTED / TESTED LOCALLY / BRANCH ONLY. A visual candidate for ZURIEL's review, not acceptance of the
Person 2029 vision and not a release.

- Branch `claude/writer-visual-family-20261025`, isolated above
  `gpt/2029-central-writer-world-focus-20261025` @ `aef4ac254927a6d534dbceb84a4e85bf9f90ef5d` (PR #1152 merged).
  No cherry-pick and no re-merge of the chain. `origin/main` stayed `8642f7c93` and was not merged.
- BEFORE `b73164e1-3b93-4342-9616-0208c5dc778d`, with scope amendments `9d5e2166-3f62-436e-abb9-b7f7fa397393` (ELS finding-colour
  compatibility) and `a2f31dc7-75a8-4bd4-95e3-42db08243ab6` (author-card type floors).
- Read: AGENTS.md, CLAUDE.md, Owner Index, Design V2 (roles §§3–4, type scale 14/16/18), Person Foundation §§11–15,
  `community-person-unification-20261025.md`, records `aedc8dd2`, `2647e067` and the two design audits.

## What changed

| Area | Change | Evidence of the problem on the base |
| --- | --- | --- |
| Message reading | The blanket `max(14px,1em)` rule is replaced by targeted rules. Message text is 18px (Noto Sans Hebrew) with 1.8 line height and a 66ch measure. Metadata keeps the 14px floor; message actions are 16px with 44px targets. The shared like control, which sets 13px inline, reads at 16px inside this family only. | Rendered message text was 16px and the like/reply controls were 13–14px (real data, Tzvi and Emily). |
| Semantic roles (shared token change) | `DESIGN_V2_PALETTES.dark` action, secondary, discovery and focus roles now follow Design V2 Night: royal blue `#315DD5` / action text `#A8C7FF`, violet `#C2A8FA`, cyan `#69DED7` (also the focus ring), white on the blue action fill. Day and Parchment already matched and are unchanged. Surfaces, ink, gold-tinted borders, Brand gold/sapphire, hero numbers and the warm black-brown canvas are untouched. | Night roles were gold/tan/amber (`#D4AF37`, `#D3B88E`, `#E3B77D`), so links, tabs, kind labels and focus all read gold. |
| Role use in the family | Action = links, active tab, path control. Discovery = exact source/World links and the "findings in the world" entry. Secondary = content-kind labels and the source label under a message. Gold/sapphire stay identity ornament on the medallion. | |
| Hierarchy | The medallion sits on the start side beside the name. Role label, available measurements and the path control form one row under the introduction. The path panel spans the hero and no longer repeats an introduction that is already visible on wide screens. The title focus ring hugs the text. The embedded message list aligns with the page column. | The medallion floated at the far end of the hero, detached from the name; the list was inset by about 109px. |
| Mobile | The medallion is level with the name on the start side. The cap row (label, measurements, path control) wraps in one block. | |
| Author card | Card message time and meta 13px → 14px, preview text 15px → 16px, writer chip 13px → 14px. | Below the type floor. |

The medallion, its data, the seven axes, and every route and state kept as they were: community → card → Person → content → World → return,
draft/reply, 20-item paging and URL state, Tzvi's 20 recent publications with the full catalogue, paired media, source refs and exact World links.
No rank, R0–R7, XP conversion or new research strength was added.

## Decision needed: the shared Night palette

The palette change is not confined to writer pages. Every 2029 surface that reads Night roles through `use2029Palette` or the frame tokens now shows blue
actions, violet depth and cyan focus where it used gold. It is in its own commit (`fix(2029): align Night semantic roles with Design V2`) so it can
be accepted or reverted independently.

An existing ELS browser test asserted the opposite ("Dark returns to the approved black/gold/brown palette", gold primary in Night). I changed that
assertion to the Design V2 role because the handoff asked for alignment, but it records a possibly deliberate earlier choice. If the gold Night
action colour was the intended look, drop that commit and restore the two assertions in `test/els-native-ui-browser.test.mjs`. Saved ELS finding colours
that carry the former Night hex values keep their slots (compatibility constant, pinned by `test/palette-design-v2-roles.test.mjs`).

## Verification (own run)

- `test/palette-design-v2-roles.test.mjs`: role values per preset, focus = discovery, Night contrast ≥ 4.5:1, warm identity values unchanged, ELS compatibility.
- `node --test` contributor2029, community, userCenter: 103 pass. Projection tests, `npm run build` (Legacy + 2029) and the Legacy Production lock pass.
- New `test/writer-visual-family-2029.browser.py`: three real public pages (Tzvi catalogue, Yaniv general, Emily old-chat author from the community) × 320/390/1440 × day/parchment/night.
  Asserts: message text 18px with 1.8 line height, metadata ≥ 14px, actions 16px and ≥ 44px, role colours per preset (eyebrow, path control, active tab, world link,
  kind label), visible focus ring in the discovery role, medallion beside the name on the start side, no horizontal overflow, no legacy-rank element,
  card type floors, community → card → Person. 0 page errors, 0 unexpected writes; telemetry writes blocked.
- Browser regressions that pass: medallion (27 cases), community-person unification (16), routes, cold-entry card, general writer, actions (member, owner, failed send),
  follow safety, and the 34 ELS native UI tests.
- Real-data captures: `writer-visual-family-evidence-20261025/` — 27 closed, 6 reading and 9 open captures plus `results.json`. `/api/*` is stubbed, so the overview
  and interaction panels show their honest "unavailable" state in these captures.

### Failures that exist on the base and were not changed

- `writer-personal-chain` page-editor save acknowledgement: reproduced on the base by the integration and by me earlier. A separate task, not touched.
- `writer-community-reuse-2029.browser.py` waits for a "לעמוד הכותב המלא בקהילה ←" link that the integrated community unification no longer renders there; it fails identically on the base `aef4ac254`.
- `public-contributor-2029-loader` and `public-contributor-catalog-2029` (stale route table / strings, as reported before).
- 20 failing cases in `src/lib/research/*.test.js` (engine-receipt and typed-separation), identical count on the base.

## Gaps and limits

1. No Preview was verified for this SHA: this session has no deployment visibility, so no URL is claimed. The captures are a local build with real anonymous Supabase reads.
2. Yaniv has no loadable public message rows, so the 18px reading check ran on Tzvi and Emily; his page was checked for hierarchy and roles.
3. The shared ReactionBar keeps its legacy palette colours; only its size is lifted inside this family.
4. The main community feed (outside the Person family) was not changed; its body text is already 18px and its action labels remain 14px.
5. Person binding, research standing, historical tenure, active days and last-seen are unchanged and still unmeasured or unresolved.

## Contrast fix after review 36d16f8d (P2)

Cause: the Night palette change made `--s29-accent` the royal-blue action *fill* (`#315DD5`, about 3.2:1 on the Night card), but many 2029
rules still used it as a *text* colour (for example the contact "← חזרה" control, contact status text, number/calculator/topic/world labels).
Fix: every text use of `color: var(--s29-accent)` now uses `var(--s29-accent-text)` (Night `#A8C7FF`, 10–11.6:1; Day and Parchment text roles
are unchanged in meaning). The new blue/violet/cyan action roles, fills, borders, focus ring, warm canvas, the three presets and stored ELS
colours are unchanged. The one remaining use is the large glyph outline graphic in `spatialGlyphScene2029.css` (non-text, at least 3:1 on the card and page).

Evidence: `test/accent-text-contrast-2029.test.mjs` (palette ratios and a source guard that fails on any `color: var(--s29-accent)`),
`test/contact-back-contrast-2029.browser.py` (real writer page; Day/Parchment/Night x 390/1440; "← חזרה" computed colour is the text role,
contrast 6.4 / 6.7 / 11.6 : 1, 18px, keyboard-reachable with a visible focus ring, clickable). The browser test fails on the previous code
(colour `49,93,213`). Captures: `writer-visual-family-evidence-20261025/contact-back-*.png`.
Re-run: writer visual family 27, medallion 27, community-person unification 16, routes, cold-entry, actions, follow safety,
ELS native UI 34, palette roles, Production lock, both builds.
Not re-run here: the page-editor save acknowledgement (separate task, unchanged) and the personal-area pages; no claim is made for them.
