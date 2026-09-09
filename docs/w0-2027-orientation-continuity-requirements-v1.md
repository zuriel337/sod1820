# SOD1820 — W0 2027 ORIENTATION & CONTINUITY REQUIREMENTS V1

**Status:** W0 ADDITIVE REQUIREMENTS · EXTEND_EXISTING · DOCS ONLY · NOT IMPLEMENTED

This note captures the additional orientation requirements identified during W0. It does not create a new System Frame, state store, route system or Research Context owner. It extends the existing 2027 Product Map / Adaptive Shell direction and must be reconciled into the active System Frame owner during W0 closure.

## 1. Core UX law

**Orientation must never be lost.**

SOD1820 contains dense cross-navigation between numbers, topics, books, passages, ELS findings, tools, journeys, sources and relations. The user must be able to answer **“Where am I?” in under one second** even after several deep transitions.

The system must therefore preserve and expose, when relevant:

- **Current location** — the present view/mode.
- **Current focus** — the entity/result currently being examined.
- **Research root / origin** — the subject or research starting point that brought the user here.
- **Path / breadcrumb** — the meaningful semantic path through the product.
- **Return point** — an exact previous research state when one exists.
- **Active tool / mode** — e.g. Heichal / ELS / Method Trace when operating in deep research.

These are semantic orientation capabilities, not a mandate for one specific visual breadcrumb component.

## 2. Global Orientation Header

The 2027 Global Orientation Header is a persistent capability of the Adaptive Shell.

Target responsibility:
- SOD1820 / World identity
- current focus
- compact semantic path
- Search / Command entry
- account / access signal where useful

It must not become a mega-menu or permanent route dump.

Example states:
- `SOD1820 / 1820 / World`
- `SOD1820 / ספר הבהיר / קטע 42`
- `SOD1820 / 1237 / Heichal / ELS`

The exact visual grammar remains an Experience decision for W1. The orientation semantics are W0 requirements.

## 3. Semantic compression

Deep paths must remain legible without creating a long, noisy breadcrumb.

Required behavior:
- nearby/current segments remain visible;
- older path segments may collapse into a compact history control;
- the full semantic path remains inspectable;
- collapse must never destroy exact return data;
- the user should not need to reconstruct the path from browser history.

Visual compactness must not erase research context.

## 4. Return Exact

**Browser Back is not sufficient as the canonical research-return contract.**

Where a meaningful research state exists, `return_exact` must be able to restore the relevant prior state, which may include:
- focus entity;
- bounded filters/facets;
- selected relation/result;
- exact ELS locus;
- path/window position;
- World renderer state where shareable/reopenable;
- origin/root relationship;
- active research mode where appropriate.

Only semantically meaningful reopenable state belongs here. Ephemeral details such as hover, animation or panel width do not.

## 5. Orientation across World / Heichal / Books / ELS

Orientation is continuous across mode changes.

Examples:

### Number → Book
User starts at 1820, opens a Book source, then a passage.
- current focus may become the passage;
- research root remains 1820;
- the header/path shows enough context to understand the relationship;
- exact return restores the prior 1820 state.

### World → Heichal → ELS
User starts at 1237 in World, opens Heichal, runs ELS.
- World focus/root is not discarded;
- active mode becomes Heichal / ELS;
- the exact ELS result can return to the originating World state;
- tool execution does not create a disconnected navigation universe.

### Journey
Journey position may be shown as an orientation dimension without replacing the canonical focus/path identity.

## 6. Orientation and Raziel

Raziel must consume the same orientation/context state rather than maintain a separate conversational notion of “where the user is.”

Raziel awareness should include, subject to authorization:
- current focus;
- research root;
- selected path/relation;
- active tool/mode;
- current Journey position;
- exact return target where meaningful.

This enables commands such as:
- “How did I get here?”
- “Return me to 1820.”
- “What am I looking at now?”
- “Continue from the Book passage into ELS.”

Raziel may explain or operate orientation; it does not own orientation truth/state.

## 7. Accessibility / device requirement

Orientation cannot depend only on desktop breadcrumbs.

Desktop, tablet, mobile, keyboard and screen-reader projections must all expose equivalent orientation semantics.

Mobile may show a compressed path or expandable header. Keyboard/screen-reader users must be able to identify current focus, root and available return action without using a graph or hover interaction.

## 8. W0 acceptance additions

W0 is not closed until the following are explicit:

- [ ] `orientation_never_lost` requirement accepted under the existing System Frame / Research Context owners;
- [ ] Global Orientation Header semantics mapped independently of legacy Navbar layout;
- [ ] current focus vs research root are distinguished;
- [ ] semantic path/breadcrumb behavior defined;
- [ ] semantic compression rules defined;
- [ ] `return_exact` state contract separated from browser Back and ephemeral UI state;
- [ ] World → Heichal → Tool → World continuity proven in the 1237 Golden Slice;
- [ ] Book/Passage and ELS transitions preserve origin/context;
- [ ] Raziel consumes, but does not own, orientation state;
- [ ] mobile/keyboard/accessibility orientation parity is covered.

## 9. Product priority

For SOD1820, orientation is not decorative navigation. It is a primary product capability because the research experience is intentionally deep, interconnected and multi-modal.

The three shell qualities that must survive every renderer redesign are:

1. **Orientation** — always know where you are.
2. **Context continuity** — never lose why/how you arrived.
3. **Raziel awareness** — the companion understands the same authorized context.

The UI may change completely in future versions. These three semantic capabilities must remain stable.
