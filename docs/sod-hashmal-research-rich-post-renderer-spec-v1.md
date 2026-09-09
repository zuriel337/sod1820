# SOD1820 — Sod HaHashmal Research-Rich Post Renderer v1

**Status:** IMPLEMENTATION SPEC · BRANCH-ONLY · EXTEND_EXISTING · HUMAN-GATE CONTROLLED  
**Golden Case:** `posts.id=5104` · `sod-hashmal-rosh-hashana-5787-keren-shofar-brit-111`  
**Canonical project:** `linswmnnkjxvweumprav`

## 0. Owner check

**Verdict: EXTEND_EXISTING.**

This renderer is a projection over existing owners only:
- Post/publishing identity and root slug path.
- `reality_graph_law` for one-tree identity/relations.
- Research OS / Research Intake for source-linked research families and provenance.
- Truth Axes for source-claim vs engine verification vs governance vs publication/access.
- `SOD1820_DESIGN_CONTRACT_V1.md` + W0.5 Visual Foundation for typography, responsive behavior, motion, palette and visual-asset requirements.
- Existing NumberDrawer / canonical gematria projection for numeric interaction until the future Research Inspector supersedes the presentation.

No new graph, store, engine, registry, truth lifecycle or parallel post system.

---

## 1. Core invariant — one post identity, many renderers

The post is not migrated or re-authored when the new experience ships.

**Stable:**
- `posts.id`
- root `/:slug` canonical URL
- retained source text
- source provenance
- linked research identities / findings / relations

**Replaceable:**
- typography
- layout
- hero
- navigation treatment
- research inspector presentation
- highlight visuals
- image placement

Therefore the current renderer may show a normal legacy post today, while the future renderer can show the same post as a Research-Rich Post automatically when released.

No manual re-publication is required merely to adopt the new renderer.

---

## 2. Source-text fidelity

### 2.1 Immutable source wording

The retained source text is source-owned and must not be rewritten merely for renderer adoption.

Allowed editorial additions:
- section headings
- section numbering
- navigation labels
- source/provenance labels outside the text
- interactive research overlays outside semantic source wording

Not allowed:
- silent paraphrase
- silent spelling normalization
- silently replacing quoted wording
- inserting AI explanation into source paragraphs as if source-authored
- changing an unverified source claim into verified language

### 2.2 Editorial heading boundary

Section headings are presentation metadata, not source text.

Golden Case headings:
1. קרן השופר והאור המקיף
2. ראש השנה ובריאת החיים מחדש
3. סוכה ועשתרות קרניים
4. שלוש הבריתות
5. משמיעה לראייה
6. ראשית ואחרית — קוצים, מישור ועמלק
7. סוד 111 — אחדות ופלא
8. שעפ״ע, יהו״ה–אדנ״י וחילופי אותיות
9. צפנים ו־ELS

The renderer may place these visually above exact source spans, but must not mutate the stored source sentence order to do so.

---

## 3. Reading-first composition

**Design mantra: Reading first. Research on demand.**

### 3.1 Desktop hierarchy

1. Hero / contextual visual
2. Series label: `סוד החשמל`
3. Main title
4. Fresh/temporal line when relevant
5. Short editorial summary
6. Topic chips / research anchors
7. Table of contents
8. Reading column
9. Contextual Research Inspector
10. Continue Research section

### 3.2 Reading column

Target desktop reading width: **680–760px**.

Body text:
- RTL
- right aligned
- never center-aligned for long prose
- do not full-justify by default
- target font size: 20–22px desktop
- target line-height: 1.75–1.85
- adequate paragraph rhythm

Hero/title metadata may be centered.

Section headings are right-aligned.

### 3.3 Mobile

- near-full reading width
- 18–22px logical inline margins
- no horizontal overflow
- no hover-only affordances
- inspector becomes bottom sheet / drawer
- table of contents collapses into a compact `תוכן המאמר` control
- all interactive controls >= canonical accessible target size

---

## 4. Gematria expression highlighting

### 4.1 Semantic rule

Gematria interaction highlights the **expression**, not merely the numeric result.

Example source rendering concept:

`קרבן עולה = 111`

The phrase `קרבן עולה` receives the semantic interactive treatment; `111` remains legible as the result.

### 4.2 Highlight visual

Use one canonical semantic style for interactive gematria expressions:
- restrained inline background/edge/underline treatment
- theme-aware
- readable in light and dark modes
- never a giant card inside prose
- must not change line-height materially

The highlight indicates **interactive research identity**, not truth status.

Do not encode `verified / unverified` as green/red truth coloring.

### 4.3 Interaction

Today, the interaction may delegate to the existing canonical NumberDrawer path where already supported.

Future target:
- desktop → contextual Research Inspector
- mobile → bottom sheet

Clicking the expression must preserve the post reading position and Research Context.

No route loss, no forced navigation away from the source unless the user explicitly opens the full Number/Phrase projection.

### 4.4 Truth signal

A small non-color-only status affordance may distinguish:
- source-claimed / not tested
- engine result available
- engine match
- engine mismatch

But the main highlight color remains interaction semantics only.

`SOURCE CLAIM != ENGINE VERIFIED != CANONICAL`.

---

## 5. Automatic research linking

Renderer data composition should consume existing linked identities/findings rather than parse truth from raw HTML on every view.

Supported linked facets:
- Numbers / Phrases
- Topics / Convergences
- Persons / attributed voices
- Books / textual sources
- Events / Time
- Methods
- ELS findings
- Images / evidence

A source phrase may carry several relations. Renderer ranking should show only the most useful inline affordance and expose depth on demand.

Do not create a node merely because a phrase is visually highlighted.

---

## 6. Research Inspector

### 6.1 Desktop

The inspector is a contextual side projection, not a second truth system.

It may display:
- canonical identity / label
- numeric values/methods
- source loci
- related posts/books/findings
- verification status
- provenance
- open in World / Number / Book / ELS

Opening and closing the inspector must not lose reading position.

### 6.2 Mobile

Inspector becomes a bottom sheet/drawer with the same semantic capability.

Presentation changes; capability does not.

---

## 7. Source and attribution presentation

Inline source names remain quiet in the reading flow.

A source interaction may expose:
- source identity
- exact current locus
- other appearances
- open canonical source projection, when available

Keep these roles distinct:
- quoted textual source
- author interpretation
- oral attribution (`שמעתי מהרה״ג...`)
- engine calculation
- AI/research annotation

Never visually collapse all four into one "verified source" badge.

---

## 8. ELS / cipher evidence

ELS/cipher material may break the reading rhythm because it is visual evidence.

Render as a bounded evidence block containing, when available:
- source image/matrix
- claimed phrase
- claimed skip
- claimed numeric relation
- source locus
- engine verification state
- `פתח ב־ELS`
- `ראה במקור`

Default state for untested historical source claims: **SOURCE CLAIM / NOT TESTED**.

Never present a screenshot claim as engine-verified merely because it exists in a published post.

---

## 9. Sod HaHashmal visual contract

Every new `סוד החשמל` research-rich post should have a contextual visual asset unless a Human Gate explicitly waives it.

### 9.1 Format

Preferred hero ratio: **16:9** or **3:2**.

The image should:
- communicate the central theme of the article
- contain little or no essential text
- survive mobile crop safely
- have dark/light-compatible treatment
- preserve a focal safe area

The article title remains real DOM text below/around the visual; do not bake the full title into the image as the only readable title.

### 9.2 Series consistency

Sod HaHashmal images should feel like one family while remaining contextual:
- consistent framing / visual signature
- article-specific subject matter
- no identical generic image reused blindly across every issue

### 9.3 Generation and publication boundary

Automatic image generation may be part of the creation workflow, but generated media is a representation candidate.

Generation != publication.

Use the existing visual-asset / publishing path. No separate Sod HaHashmal media store.

---

## 10. Fresh → Evergreen behavior

Temporal prominence is presentation state, not semantic identity.

Default for a newly published Sod HaHashmal issue:

### Fresh window
**14 days** from publication.

May emphasize:
- `חדש`
- holiday/issue date
- temporal context
- current issue series label

### Evergreen mode
After the Fresh window:
- retain original publication date in provenance
- reduce date prominence
- rank/display by enduring topics, numbers, sources and research relations
- do not change `post.id` or slug merely because Fresh ended

Example:

Fresh title treatment:
`סוד החשמל · גליון ראש השנה תשפ״ז — קרן השופר, הברית וסוד 111`

Evergreen research treatment may foreground:
`קרן השופר · הברית · אחדות ופלא`
with `מתוך סוד החשמל — גליון ראש השנה תשפ״ז` as provenance/context.

---

## 11. Table of contents

TOC is derived from editorial section overlays, not by rewriting source text.

Desktop:
- may be sticky if it does not crowd the reading column
- current section indicator
- click scrolls to exact section

Mobile:
- collapsed by default
- open as compact sheet/list

TOC state must not create duplicate URLs or fragment canonical identity.

---

## 12. Continue Research footer

Replace generic "related posts" as the only ending with a research continuation projection.

Potential groups:
- מספרים
- נושאים
- מקורות
- אנשים
- שיטות
- ELS

Items are ranked linked identities, not hard-coded text blocks.

The user can continue into the World while retaining return context to the source post.

---

## 13. Legacy compatibility / rollout

The renderer must support progressive adoption.

### Before new renderer is live
- current post remains readable through existing renderer
- current `/:slug` remains canonical
- no content re-upload required

### When new renderer is released
If research-rich metadata exists:
- render enhanced experience automatically

If metadata is absent:
- render a safe reading-first fallback using existing post content
- do not fabricate missing research sections

No mass manual rewrite of legacy posts is required as a release prerequisite.

Legacy posts may acquire richer research overlays incrementally.

---

## 14. Golden Case acceptance — post 5104

Golden Post `5104` must prove:

1. same root slug before/after renderer migration
2. retained central source wording unchanged
3. 9 editorial section overlays render without becoming source-authored text
4. right-aligned readable body; centered hero/title allowed
5. responsive reading at 320 / 360 / 390 / tablet / desktop
6. dark + light theme
7. gematria expression highlight does not alter truth semantics
8. clicking a gematria expression opens the canonical number research interaction and preserves reading position
9. source/attribution distinctions remain visible on demand
10. ELS block exposes source-claim vs engine state honestly
11. Fresh 14-day treatment can expire into Evergreen without changing post identity
12. Research Inspector consumes existing linked Research OS material, not a parallel store
13. no automatic canonical promotion or publication of linked candidate research
14. image slot follows the Sod HaHashmal visual contract and degrades safely if an asset is unavailable
15. reduced-motion / keyboard / focus / bidi acceptance passes

---

## 15. Explicit non-goals for v1

- no new post table
- no source-specific graph
- no new Number engine
- no new ELS engine
- no automatic claim canonicalization
- no automatic rewrite of source prose
- no migration of root post URLs
- no mandatory redesign of every legacy post before release
- no giant card farm inside article prose

---

## 16. Release state

This document specifies target behavior only.

`DOCUMENTED != IMPLEMENTED != MERGED != DEPLOYED != LIVE != VERIFIED`.

Golden Case implementation belongs under the existing visual/experience rollout and requires the normal release gate before production.