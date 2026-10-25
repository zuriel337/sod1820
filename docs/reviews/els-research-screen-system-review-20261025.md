# ELS Research screen — systemic package review · 25.10.2026

**Status:** BRANCH-ONLY REVIEW + FIRST INFORMATION-ARCHITECTURE/CLASSIC-CLEANUP SLICE · no new search capability.  
**Base:** `248c10ecaceb48c044833c86f9a46c4b7faf5581` (`gpt/els-matrix-discovery-v1-20261025`).  
**Scope:** the complete Research screen after regular search, with the five requested Goldens.  
**Boundaries:** no new engine, state, store, graph, Provider, Journey, Raziel path, database object, RLS/permission change, Preview, Production or merge.

## Authority and live reconciliation

The live canonical owner remains `els_research_layer_law v9`, with active children
`els_single_engine_law v2`, `els_seed_expansion_law v1` and
`testimony_not_prophecy v1`. The dedicated read-only connection found no active ELS/Matrix task or
overlapping claim on the reviewed implementation paths.

Two routing pointers in the repository are stale and are not used as current authority:

- the Matrix Projection contract still names Design V1 and older Experience/Workspace versions;
- live ownership is Design V2, Experience Governance v10 and Inter-Agent Coordination v17.

The user explicitly confirmed that there is no live file ownership blocking this slice and asked
for the mode cleanup directly. The implementation remains inside the existing visual system: it
clarifies labels/order and projection boundaries without creating a replacement design system.

## Current screen map

The screen already has the required primitives, but projects them through overlapping surfaces:

| Current surface | Canonical input | What it correctly owns | Current overlap or gap |
| --- | --- | --- | --- |
| Results rail | `state.search.occurrences` + `result-triage` | exact axis count, exact occurrences, opening order | repeats the active axis later in Findings and opens a second package form after occurrence selection |
| automatic Results discovery | bounded `matrix-discovery` | local matrix-first words, raw-pattern quarantine, bounded structural groups | now has one entry point; candidate rows still need merging with their later verified form |
| Findings rail | canonical `state.findings` + line/source lenses | verified findings, occurrence controls, source/verse actions | the active axis and discovered terms are restated separately from Results |
| focused axis package | `matrix-candidates` | verified nearby rows, source sequences, verses, geometry and groups | presented as a second package rather than a deeper verification stage of the selected occurrence |
| Advanced rail | explicit `structure-priority` and relationship research | broad lexical scan, geometric structures and manual cross-axis work | the former duplicate local-discovery entry point is removed; advanced group members can still repeat terms already listed as findings |
| Journey seam | existing snapshot/load/restore path | exact opening, promotion and return | correct capability, but its actions are distributed across Results, Findings and the active-bundle header |

This is not an engine fragmentation problem. `ElsNativeClassic2029` mounts one `TzofenEmbed`, all
search/lens operations use the same canonical engine, and no second store or Provider exists.

## Required package coverage and diagnosis

### 1. Exact axis and occurrences

Present and correctly separated in Results: the exact-axis total is derived from canonical search
occurrences, while local discovery has a separate count. The selected occurrence is then repeated
as the primary row in Findings and as an active-bundle heading.

**Cause:** UI projection duplication. Not vocabulary, normalization, geometry, ranking or matrix
bounds.

### 2. Words and context around the selected occurrence

Present in two grades:

- bounded automatic `matrix-discovery` returns local known/context-supported words and quarantines
  unknown repeated strings;
- explicit `matrix-candidates` verifies the focused package and adds canonical source/context detail.

The grades are valid, but the screen presents them as separate packages rather than candidate →
verified states of one selected-occurrence package.

**Cause:** UI composition and identity reconciliation. The deterministic data exists.

### 3. Relevant verses and source

The canonical verse/source lenses and focused-package source payloads work. They appear only after
moving to Findings or opening inline inspection there. The automatic Results package does not keep
the selected occurrence, discovered word, source reference and verse in one projection.

**Cause:** UI projection. No missing source adapter was observed in the requested Goldens.

### 4. Strong geometric structures

Bounded discovery already returns Stage A/Stage B metadata and structural groups. Focused packages
and the advanced Structures rail can also project groups. The same term can therefore appear once
as a discovered word, again as a finding and again as a group member.

**Cause:** deduplication/presentation. Geometry extraction and compact-before-spaced ordering pass.

### 5. Verify, open, add and exact-return actions

All actions exist and use canonical paths: `אמת והצג`, finding verification, exact occurrence open,
source/verse, promotion to a research axis, and Journey restore. Their placement depends on which
rail currently owns the projection.

**Cause:** UI action routing. The exact-return mechanism itself passes browser acceptance.

### 6. Raw patterns only under Advanced

Pass. Unknown repeated strings remain under a closed `details` disclosure and are explicitly not
presented as known words. Broad lexical scanning also remains under `מתקדם ואיטי` and never starts
on Research entry or settings open.

## Golden diagnosis

| Golden | Deterministic evidence on this base | Missing finding diagnosis |
| --- | --- | --- |
| `מקדש ירד` | canonical regular search returns exactly 2 axes; bounded matrix-first Stage B independently rediscovers `ירושלם` twice; browser displays both facts separately; runtime special-case guard passes | none in the asserted result. Remaining issue is only package/UI composition |
| `יום שבת תשמור` | focused canonical scan rediscovers `שבת`, marks it `SOURCE_EXACT` at skip 1 and retains its literal axis-topic context | no vocabulary/normalization failure. Source context is not characterized in one unified regular-search browser package, so the open gap is UI projection/test coverage |
| `משיח טבת עשירי` | focused scan rediscovers `יבואו`, `אליהו`, `ישלח מלאכו`, `נשבעתי נאם יהוה` and `תשעו`; desktop browser verifies the exact 1820 axis and keeps `ישלח מלאכו` as source sequence rather than ELS | no engine failure. Normal-search package remains split between Results, Findings and focused package |
| `קולומביה` | focused scan rediscovers `יכל אש`, `ספינת` and `אש אכלה`; exact context phrase stays unsplit and receives a first-package seat; mobile browser passes | no engine failure. Explicit context affects package priority as declared, not truth or occurrence generation |
| `בלעם הרשע` | regular search retains at least 2 exact occurrences; both carry canonical literal `בלעם` source context and rank as recommended without hiding other rows; mobile browser passes | no ranking or source failure. The repeated context is evidence in triage but is not yet composed with the rest of one visible package |

No requested Golden currently justifies a cipher-specific patch. The bounded automatic discovery is
deliberately smaller than the focused dynamic-language package; that difference is a declared
budget boundary, not a recall defect. If a future expected term is missing, diagnose it in this
order before changing code: vocabulary → normalization/recognition → geometry → ranking → matrix
bounds → UI projection.

## General solution — extend the existing projection only

Implement one selected-occurrence Research package over the existing engine/state and lenses. It is
a projection/component boundary, not a new contract owner or state system.

1. Use the existing canonical identity tuple — scope/corpus, primary `axis.hitId`, normalized term,
   finding `hitId` or source-sequence identity — as the merge key.
2. Keep the exact-axis total and paged occurrence list as search facts. Selecting an occurrence
   updates the same package instead of creating another package identity.
3. Merge bounded `matrix-discovery` candidates and later `matrix-candidates` verification by that
   identity. A row changes state from candidate to `VERIFIED`/`SOURCE_EXACT`; it is not rendered a
   second time.
4. Attach source reference, verses, geometry relation, group membership and verification state to
   that one row. A strong group lists relations and member references; it does not clone full member
   cards.
5. Keep one action set per row: verify/show, open in matrix, add/remove, source/verse and promote.
   Route every action through the existing canonical callbacks.
6. Keep the existing Journey snapshot/load/restore seam for exact return. Do not add a navigation
   store or return stack.
7. Restrict the separate Structures surface to explicitly advanced work: broad lexical plans,
   manual relationship/cross research and raw patterns. Default local discovery belongs only to
   the selected-occurrence package.
8. Preserve the binding default-work rule: automatic package discovery uses `matrix-discovery`,
   `defaultLexiconLoaded=false`, the bounded context pack and the finite local ray budget. Focused
   verification, broad vocabulary and deeper structure scans remain explicit stages.

The technical implementation should first expose a pure deduplicated package view-model and action
routing tests. Any hierarchy, layout, typography, styling or control-placement change then belongs
to the active Claude visual lane and requires the normal exact-file ownership check.

## Intended screen, in plain terms

The screen is one workflow, not four parallel products:

```text
חיפוש חדש
  [חיפוש רגיל] [הצלבה בין צירים]                         [מצב קלאסי]
  term / two terms · scope · bounded search controls

active matrix

research package for the selected occurrence
  1. exact axis + exact occurrence count and selector
  2. words and context around that selected occurrence
  3. source and relevant verses for the selected row
  4. strong geometry, shown as relations between those rows
  5. verify · open · add/remove · promote · exact return

advanced (closed unless requested)
  broad vocabulary scan · manual relationship/cross research · raw patterns
```

`חיפוש רגיל` and `הצלבה בין צירים` are search modes. `מחקר` is what the user does with the
selected result; it is not a third search engine. `מצב קלאסי` exposes a clean single-axis view of
the same mounted canonical engine; cross-meeting controls remain in Research and the underlying
meeting identity is preserved for exact return. `חיפוש חדש` always resets the
ephemeral result/package projection but never creates a second engine.

The first implementation slice makes this distinction visible without inventing state or changing
the visual system: it orders exact occurrences before local findings, labels the visible workspace
as axis/occurrences → research package → advanced → save, and names Classic explicitly. The
automatic bounded local discovery stays inside the active regular-search package, and its former
duplicate entry point is removed from Advanced. In the 2029 Classic projection, cross controls,
meeting banners/lists and the host Research overlay are hidden while the one canonical engine and
exact Research return identity remain intact. Merging candidate → verified rows with their
source/verse and geometry remains the next technical slice.

## Acceptance for the implementation slice

- one visible selected-occurrence package per active `axis.hitId`;
- exact axis count never includes nearby words, groups or source sequences;
- one visible row per normalized term + exact occurrence identity, with candidate/verified/source
  status updated in place;
- source/verse and strong geometry are available from that row without a duplicate card elsewhere;
- group summaries reference members without restating full finding rows;
- raw patterns and the broad lexicon remain closed under Advanced;
- user open/verify/add/return actions pre-empt background discovery and remain canonical;
- `מקדש ירד`, `יום שבת תשמור`, `משיח טבת עשירי`, `קולומביה` and `בלעם הרשע` remain generic Goldens,
  with no term/title/author-specific runtime branch;
- one mounted canonical ELS engine; no new engine, state, store, graph, Provider or Raziel path.

## Review verdict

**FOUNDATION DETERMINISTIC BASE: PASS for the asserted Goldens.**  
**SCREEN PACKAGE COHERENCE: PARTIAL — mode hierarchy, occurrence-first order, Advanced local-discovery dedup and clean Classic containment implemented; candidate/verified row merge remains open.**  
**NEXT SAFE SLICE:** Research 2 has deliberately not been started. Await the user's definition,
then reconcile it with the pure package projection + dedup/action-routing boundary before adding
any discovery capability.
