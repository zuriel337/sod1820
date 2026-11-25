# SOD1820 — SYSTEM FRAME CONTRACT · 2027 ADAPTIVE V2 ADDENDUM

**Owner lineage:** `docs/sod1820-system-frame-contract-v1.md`  
**Status:** ADDITIVE SUPERSESSION ADDENDUM · EXTEND_EXISTING · HUMAN-GATE ZURIEL · MERGED (in main; the former «BRANCH ONLY UNTIL MERGED» banner is historical)  
**Date:** 2026-09-09  
**W0 source:** `docs/w0-2027-final-reconciliation-v1.md` + independent challenge `work_log d3c26a5c-1a01-47b9-9147-a94430c65f3c`

## 0. Scope / owner verdict

This file **does not create a second System Frame owner**. It is the 2027 additive supersession layer of the existing System Frame contract.

**OWNER CHECK: `EXTEND_EXISTING`.**

History in v1 remains valid provenance. Where v1 fixes a presentation shape that conflicts with this addendum, **this dated v2 addendum governs current presentation architecture once merged**.

The invariant remains:

> **One global frame · many projections · no competing navigation/control systems.**

### Product-language inheritance · 2026-09-13

Public labels used by the System Frame consume the Naming / product language law in `SOD1820_DESIGN_CONTRACT_V2.md` (carried from V1 on 11.11.2026; V1 keeps the historical copy) and the current Master Roadmap. Retained v1 examples such as `עולם המספרים` / `עולם המספרים והגימטריה` are historical wording only and MUST NOT be restored as formal product/navigation names unless Human Gate explicitly renames them. Current numeric-family navigation uses `דף המספר` for the public Number/Phrase product and neutral family labels such as `מספרים` / `מספרים וגימטריה` where a grouping label is needed.

---

## 1. What remains invariant from v1

Preserve these capabilities/constraints even when the visual shell changes:

- one global product frame rather than several competing bars/shells;
- one Research Context / continuity path;
- one canonical saved-research / My Workspace path, not duplicate stores;
- one Raziel companion identity with multiple projections;
- overlay/clearance/safe-area discipline;
- accessibility and mobile-safe behavior;
- ambient signals are evidence/ranking only: **HOT != TRUE**;
- legacy/external routes are not removed until deep-link/SEO/capability parity is deliberately handled;
- direct SEO-addressable products remain usable without entering Heichal/World first;
- frame/UI never becomes truth/access/identity owner.

---

## 2. Presentation clauses superseded

The following v1 presentation choices are historical, **not current architectural requirements**:

- mandatory three persistent visual layers as `Top Navigator + Context Rail + Bottom Control Layer`;
- a fixed top-navigation category order;
- the fixed five-slot One Dock vocabulary `⌖ כאן · 123 מספר · ◉ עכשיו · ✦ רזיאל · ⋯ עוד`;
- the claim that fast navigation must live specifically in the top bar;
- the claim that spatial/deep exploration must be entered specifically through the old Heichal surface;
- any implication that one physical rail/dock/header must remain in the same placement on desktop, tablet and mobile.

**Capability is stable; placement is adaptive.**

---

## 3. 2027 Adaptive Global Shell

The global shell exposes semantic capabilities through device/task-appropriate projections.

### 3.1 Global Orientation Header — persistent responsibility

**Purpose: `WHERE AM I?`**

The top surface is a small, persistent/recoverable orientation layer. It may show:

- SOD1820 / current World identity;
- current focus;
- semantic breadcrumb/path;
- research root/origin when different from current focus;
- active mode/tool when necessary;
- Universal Search / Command entry;
- account/access/attention indicators where useful.

**Orientation must never be lost.** The exact visual breadcrumb may compress older path segments, but the full semantic path and exact return remain recoverable.

The Header is **not** the primary giant category menu.

### 3.2 Global Navigation — desktop Sidebar projection

**Purpose: `WHERE CAN I GO?`**

The canonical capability is Global Navigation. Its preferred 2027 desktop projection is a **collapsible system Sidebar** (Vercel/Linear-style product navigation), with a clean hierarchy of major product areas rather than every legacy route.

Typical target families may include:

- Home / Discover;
- World;
- Number / Phrase;
- Books / Sources;
- ELS / Biblical Cipher;
- Beit Midrash / Chidushim;
- Content / Reality projections;
- Journeys;
- Heichal deep-research mode;
- Global Now / Raziel / My Workspace entry;
- authorized Admin Research / System Operations entries.

This is **not a second navigation owner**. On mobile the same capability may render as drawer/sheet; for keyboard users through Search/Command; in focused reading/tool modes it may collapse or temporarily hide with a clear restore path.

RTL/LTR uses logical-start placement: Hebrew/Arabic may place the system Sidebar on the right; LTR locales may mirror it appropriately. Language is projection, not a second shell.

### 3.3 Adaptive Command Surface

**Purpose: `WHAT CAN I DO NOW?`**

Semantic commands may render as:

- bottom dock;
- contextual toolbar;
- command palette;
- floating dock;
- side rail;
- mobile task sheet;
- keyboard shortcut;
- gesture with accessible alternative.

A bottom bar remains a **valuable projection**, especially on mobile, but no fixed set of slots is globally mandatory.

Examples of semantic actions: `open_world`, `open_heichal`, `inspect`, `compare`, `run_tool`, `add_to_research`, `save_path`, `ask_raziel`, `return_exact`.

### 3.4 Raziel Companion

**Purpose: one companion, not another bar/system.**

Raziel may render as compact presence, side companion, full-height mobile sheet or deep-research surface. Every projection uses the same authorized Research Context and cannot own parallel truth/memory/graph state.

### 3.5 Contextual Inspector

Provenance, truth axes, method trace, relation detail, layers, unresolved/contradiction state, access/publication state and Human-Gate actions appear **when useful**, not as mandatory permanent chrome.

#### 3.5.1 Global desktop semantic region · Human-Gate ZURIEL · 2026-09-30

The **Contextual Inspector is one shared semantic capability across desktop surfaces**, not a Post rail, World rail, Community rail, Book rail or Heichal-only panel.

- Desktop surfaces should reserve a recoverable Inspector region when contextual depth materially helps. The region may be open, compact, collapsed or temporarily hidden according to task/focus mode.
- Home may use a light/compact projection; Post, Book, Topic, Community, Number and Cipher may use a stronger contextual projection; World uses it as the zoom/selection Inspector over the wider panorama; Heichal uses the same semantic region for deep research, trace, provenance, method state and Raziel deep context.
- Focused/immersive modes may collapse the Inspector, but must preserve a clear restore path and the underlying Research Context.
- The Inspector **is not a mini-World**. It shows bounded context around the current subject/selection. A clear `open_world` action deepens to the full World surface; a clear `open_heichal` action deepens to the full Heichal workbench while preserving exact return.
- Visual accent/iconography may distinguish destination/action (World, Heichal, Raziel, source, time, relation), but color never changes truth rank and the Inspector retains one product identity.
- The same reusable Inspector shell consumes domain-owned projections. It owns no graph, ranking, source, timeline, truth, community or Raziel memory state.
- Raziel remains one identity: compact Orb/presence may invoke the same companion inside the Inspector; opening the side companion does not create a second Raziel.

#### 3.5.2 Bottom context trail != Global Navigation

The bottom surface is **context/path/action**, not the permanent product menu.

- Global product destinations such as World, Number, Books, Cipher, Posts, Community, Journeys and Heichal remain owned by Global Navigation / Search / Command.
- The bottom trail may show the active research path, e.g. `Post → Person → Number → Concept → Source`, plus a small stable command/presence core when useful.
- A small persistent command set may preserve muscle memory (for example Search/Inspect/Now/Raziel) while the contextual path/actions change around it.
- The bottom trail may collapse on desktop or become the preferred Command Island/path projection on mobile.
- It must never silently become a second global navigation system.

#### 3.5.3 Living sources, One Companion and contextual Projector · ZURIEL Human Gate 12.10.2026

- This is a **projection assignment inside the existing System Frame**, not another Context/Attention/Projector owner: right navigation remains the unique Global Navigation; the existing desktop **left Companion** has two recoverable modes, **עדכונים | הקשר**, over one authorized World/Source reader and one contextual Inspector. Home favors Updates; selecting a meaningful source may focus Context; manual user choice remains recoverable.
- The Golden Projector belongs **inside the Contextual Inspector** as optional depth over a currently selected source. Preserve the existing admin-only pilot and RLS; the "ציבור" compare mode is not permission to expose the admin research universe. Shared public source/media, verified calculation and candidate Finding are not interchangeable types.
- **One bottom Command Island** continues to own Path, actions, Now and Raziel. If real Post/Topic sections and current section are present, a compact page-progress cue may consume its existing context-trail slot and open the same Context sheet. No second fixed progress bar or invented timestamp, percentage, claim or section.
- Desktop left Updates and mobile Now sheet consume the **same governed source-arrival projection and seen identity**; no duplicate watcher, store or news-truth ranking. A living authored section's update is only shown when a source-native locator **and** the meaningful approved revision/version are available. The section itself remains in its original authored position; compact opening update line jumps to exact locus, with bounded disclosure/history.
- Acceptance is interaction-based: 320/390/980/1100/1440, all Day/Parchment/Night presets, ≥44px hit targets, keyboard/focus, reduced-motion, overlapping mobile cues/dock, accurate source attribution, anonymous/admin RLS and exact return/reload.

**Design authority and G4 gate:** SOD1820_DESIGN_CONTRACT_V2.md §§8.1, 11.8; source/fragment ownership stays with Publishing, Research Intake and Reality Graph; not a new Golden, storage, route owner or production acceptance. PR #1044 is shared rail branch-only, PR #1039 is compact Post branch-only and source-fragment propagation is still pending.

### 3.6 My Workspace

My Workspace is one personal projection. Avatar, Sidebar, commands or Raziel may all invoke the same semantic capability `open_my_workspace`; multiple launchers do not create multiple personal areas.

---

## 4. Direct page / SEO duality

A first-class product can be both:

1. a direct, independently understandable SEO/deep-link page; and
2. a continuous participant in the shared Research OS / World.

Therefore:

- Number/Phrase can open directly;
- Books/Book pages can open directly;
- ELS can open directly;
- Topic/Post/other approved first-class surfaces can open directly;
- **Heichal is never a mandatory gateway.**

When the user deepens research, the current page seeds Research Context and may enter World/Heichal without losing location or return state.

---

## 5. Exact orientation / return

Browser Back alone is insufficient for deep research continuity.

`return_exact` must restore, where the owner supports it:

- subject/focus;
- selection/source locus;
- active dimensions/filter/lens;
- method/tool identity;
- Journey position;
- exact ELS/book/source locator;
- valid return target.

If the exact target is stale, inaccessible or retired, the frame must render an **honest terminal/recovery projection**, not silently redirect to unrelated Home content.

---

## 6. Reader / focused modes

“One World, Many Views” does **not** mean every page renders a graph or all global chrome.

Book reading, long posts, ELS matrices, Heichal tools and other focused tasks may reduce/hide Sidebar, Inspector or commands for clarity/performance. The user must retain a clear way to recover:

- current location;
- global navigation;
- Raziel when authorized;
- exact return/context.

---

## 7. Access + language readiness

The Shell is structurally ready for:

- Public;
- registered;
- Premium;
- Deep Premium;
- Admin/private authorized depth;

without creating duplicate page identities. Access state changes retrieval/control depth, never truth.

Language switching is a global semantic capability. Locale changes must not discard entity identity, orientation, Journey or Research Context. RTL/LTR is a rendering concern over the same shell semantics.

---

## 8. Number/Phrase bridge

Number/Phrase is a first-class direct projection during the 2027 rebuild.

**CONNECT NOW · REDESIGN LATER.**

The new Shell may wrap/connect the current Number/Phrase core while its final redesign is deliberately deferred. Preserve its signature capabilities and active method-state semantics; do not force them into a new generic shell geometry merely for visual consistency.

---

## 9. Release / migration law

No legacy entry point is retired merely because a replacement design exists on a branch.

Before retirement/replacement verify:

1. capability parity or explicit Human-Gate retirement;
2. stable identity/context continuity;
3. route/SEO/deep-link handling;
4. personal-state parity where applicable;
5. access/security behavior;
6. honest terminal/moved/gated state;
7. mobile/keyboard/accessibility path;
8. semantic telemetry continuity.

**DOCUMENTED != MERGED != DEPLOYED != LIVE != VERIFIED.**

This addendum becomes the current long-form System Frame presentation contract only after it is merged into the canonical repository lineage.

---

## 10. 2029 Human-Gate North Star Lock · 2026-09-16

**Decision owner:** Zuriel / Human Gate  
**Architecture action:** `EXTEND_EXISTING` — this section extends the same System Frame owner. It does not create a new shell, command system, AI system, notification engine, inspector store or research context.

### 10.1 Product north star

SOD1820 2029 is a **context-preserving Research Operating System**, not a collection of pages with AI controls added on top.

The stable semantic chain is:

`SYSTEM FRAME → RESEARCH CONTEXT → CURRENT SURFACE → SELECTION/FOCUS → ADAPTIVE ACTIONS → RAZIEL / INSPECT → DEEPEN TO HEICHAL`

The frame must always preserve the distinction between:

- `WHERE AM I?` — Orientation;
- `WHERE CAN I GO?` — Global Navigation;
- `WHAT AM I RESEARCHING / WHAT IS SELECTED?` — Research Context + temporary selection/focus;
- `WHAT CAN I DO NOW?` — Adaptive Command Surface;
- `WHAT MAY HELP ME NEXT?` — Raziel contextual recommendation, subject to truth/access/governance.

AI may rank or recommend actions and information. AI must not unpredictably reorganize primary navigation, silently mutate truth state, canonicalize findings, publish, or replace Human Gate authority.

### 10.2 Adaptive Command Island — preferred mobile projection

The legacy fixed Bottom Bar is **capability/provenance evidence only** and is not presentation authority for 2029.

The preferred mobile projection of the Adaptive Command Surface is a compact **Floating / Adaptive Command Island** rather than a full-width fixed navigation bar. It is a projection of semantic commands, not a second navigation system.

Typical persistent capabilities may include Universal Search/Command, Quick Inspect, Now/Attention and Raziel. Contextual actions may appear when relevant, but the frame must preserve interaction stability and muscle memory; AI must not continuously reshuffle controls.

Desktop/tablet may project the same capabilities into Sidebar-adjacent controls, contextual toolbars, command palette or another governed form. No physical placement is canonical across devices.

### 10.3 Raziel Orb — canonical compact-presence direction

Raziel's preferred compact-presence direction is a **living orb** rather than a generic robot/chat icon.

Human-Gate visual direction:

- blue → indigo → purple chromatic identity;
- quiet, restrained motion rather than continuous attention-seeking animation;
- compact persistent/recoverable presence when Raziel is authorized;
- one subtle pulse/attention event may signal genuinely decision-relevant research information;
- no notification spam and no false implication that activity equals truth.

The exact color values, gradients, motion curves, contrast treatment and reduced-motion projection are design tokens governed by the active Product Visual Language / Design Contract and accessibility requirements. Orb color is **brand/presence semantics, never truth semantics**; verification, uncertainty, canonical state, errors and access state require independent accessible signals.

Opening the Orb must preserve the current authorized Research Context. It may expand into contextual companion, mobile sheet, side companion or deep-research Raziel surface without creating another Raziel identity, memory or truth path.

### 10.4 Proactive but quiet AI

Raziel may surface a restrained attention signal when new information is materially relevant to the user's current research context or could change the next research decision.

The preferred behavior is **proactive but quiet**:

- no interruption merely because new content exists;
- no automatic claim that a discovered relation is true;
- no popup-first interaction model;
- recommendation/explanation remains distinct from Finding / Claim / Evidence / Fact / Canonical;
- the user controls whether to inspect, dismiss, mute, deepen or act.

### 10.5 Selection Intelligence

Current text/object selection may seed a **temporary contextual focus** for Inspect, Compare, Tools, Raziel and Research actions.

Examples include a selected expression, number, verse, source locus, person, image/media object, Finding or relation.

Selection Intelligence is projection/context only. Selecting something does not create canonical identity, Finding, Claim or publication state by itself. Any persisted research object must pass through its canonical owner and truth/provenance boundary.

### 10.6 Entity Quick Inspect — Number/Expression first

The existing legacy `NumberDrawer` proves the cross-surface capability but is not the 2029 presentation contract.

2029 adopts **Entity Quick Inspect** as the semantic capability: inspect an addressable subject without losing the current surface or exact return position.

Number / Expression is the **Golden first projection** of Quick Inspect.

The future Number/Expression full page and its Quick Inspect projection must consume the same canonical Number/Expression identity, calculation engines, method registry, truth/provenance and governed read model. They are not separate products or separate stores.

Target projection chain:

`NUMBER / EXPRESSION CORE → QUICK INSPECT → FULL PAGE → WORLD / HEICHAL / JOURNEY PROJECTIONS`

Final Number-page and Quick-Inspect visual composition remains deliberately redesignable. This lock governs shared semantics and continuity, not a frozen card layout.

The same Inspect capability may later project Book/Source, Person, Event, Finding/Evidence or other supported entity types without creating a separate drawer architecture per domain.

### 10.7 Heichal = deep-research mode, not tool ownership

Heichal is the canonical **deep-research workbench / mode**, not the mandatory owner or gateway of every tool.

A tool/capability may be invoked through:

- its direct first-class page when one exists;
- Search/Command;
- a contextual action from World/Post/Book/Number/other surface;
- Raziel recommendation;
- Quick Inspect;
- Heichal deep mode.

Entering Heichal must carry the same Research Context, selected subject/tool and exact return target. A capability must not require navigation through Heichal merely to exist or be invoked.

### 10.8 Now / Attention = unified projection, not unified truth/store

`Now` is the System Frame's **attention projection**. It may compose governed signals such as:

- site / content stream updates;
- subjects the user follows;
- messages / replies / mentions when authorized;
- meaningful research-state changes;
- Raziel research pulse / recommendation;
- resumable Journey or research continuity.

This does **not** authorize a new global Notification Engine or merged truth table. Each signal remains owned by its canonical domain. The frame may rank/project authorized attention items while preserving provenance, source type, access state and reason-for-attention.

The Home surface may show a richer `Global Now` projection; the Command Island may show a compact peek; My Workspace may expose history/management. These are multiple projections over owned capabilities, not duplicate attention systems.

**Pin, new and motion in `Now` (ZURIEL 11.11.2026, dated addendum). [SUPERSEDED for the public stream by ZURIEL 25.11.2026, "No pin priority in the public stream" below; the text is kept as history. "Pinned ≠ new ≠ true" and the finite, reduced-motion-safe "new" pulse still hold.]** At most **one** pinned item, set with ZURIEL's approval, for **at most 72 hours** from the moment it is set. The expiry is shown on the item and the pin ends by itself; after it the item returns to its place by time. **Pinned ≠ new ≠ true**: a pin is attention, never verification. "New" is marked with a short, **finite** pulse only (never an endless blink) and with no motion when reduced motion is requested. A pin creates no store, no local flag and no duplicate: it is the same publication, at its own address, shown once (the pinned card is not repeated as a row). The first pin is the update of Post 5107 (code: `HOME_FEATURED_POST_2029.pin`), with its central message shown verbatim in "עכשיו · המרכז" on Home and in the `Now` sheet.

**Series-latest mark in `Now` — exception for the reality-map series (ZURIEL 16.11.2026 [SUPERSEDED for ORDER by ZURIEL 25.11.2026: the series no longer leads the stream; its mark stays at the row's own time], dated addendum; the blink rule revised the same day).** The newest publication of the flagship series מפת המציאות (membership: the exact tag, Content Foundation Contract §12) is shown first in `Now` below any pinned item **and in the same place in the Home "עכשיו · המרכז" strip (one projection, even when the Post is already shown by the flagship region)**. When the newest thing is a registered unit of the Post, the row is shown **as that update** — the unit's own name as the title (for 5107: "ימין ושמאול תפרצי מדהים!!! רמזים חזקים ביותר"), the unit's time, a link straight to the unit, and "בפוסט: <the Post's title>" as the context line — with a small mark: a dot and the label "עדכון חדש" while it blinks, "העדכון האחרון" once the viewer has entered it. The dot **blinks until this viewer enters the update** (opens it from `Now` or opens the Post itself) and then **stays as a still dot** (no motion) for as long as it is the latest, until a newer publication of the series replaces it. "Entered" is the **existing per-browser seen state** (the same one that clears "חדש"), keyed per Post and per newest registered unit/update of that Post, so a new registered unit makes the dot blink again; nothing new is stored. The blink is therefore bounded per viewer by that viewer's own action rather than by a clock; it is the only mark with this behaviour, and the general rule above ("a short, finite pulse only, never an endless blink") is unchanged for every other "new" mark. Reduced motion removes the blink. It is a presentation of the series, **not a pin**: it counts toward no pin limit, creates no store, no local flag of its own and no duplicate row, and `pinned` is untouched. Code: `nowModels` / `seriesLatestSeenKey` in `src/lib/nowPublications2029.js`, `see` in `useSystemFeed2029.js`, the Post page effect in `Post2029Page.jsx`; styles `.sod29-nowpub-blink.is-blinking`; covered by `test/reality-map-now-projection-2029.test.mjs`.

**No pin priority in the public stream (ZURIEL 25.11.2026, decision D2 — APPROVED by ZURIEL in the active conversation; implemented on a branch only, not merged or deployed).** The public stream of `Now` and of the Home "עדכונים אחרונים" is in **time order only**, newest first. No item is lifted, held past a bucket cap or shown as a central card because it is pinned: this removes (a) the owner's pin of at most 72 hours (11.11.2026), (b) the "last pin on top" order of owner and writer pins (12.11.2026), (c) the 24-hour writer pin in «הגילוי היומי», and (d) the series-latest-first order of the reality-map series (16.11.2026). **Nothing is deleted:** `featuredFeedItem`, `GROUP_WRITER_PINS_2029` and the pin fields of a row, `seriesLatestSeenKey` (the Post page) and `homePinnedCover2029` / `homePinnedLeadEarly2029` (preload) keep serving the domains that use them; only the public stream stops honouring pin order. The "חדש" mark stays a mark, never an order, and the reality-map series keeps its dedicated flagship area on the Home. Implementation seam: `withoutPin` in `feedRows` (`src/lib/systemFeed2029.js`) and `sortedNowModels` / `nowModels` (`src/lib/nowPublications2029.js`).

**"עכשיו" as a centre of threads by source (ZURIEL 25.11.2026, decisions D1–D11 — APPROVED for planning and implementation on a branch; not merged, not deployed).** The window opens as **compact threads, one per source**. A source's thread shows its **latest update on top**, with its earlier publications opened on demand (only rows the window already holds; opening a thread fetches no history). **The sources are ordered by the time of their latest update: the source updated most recently is at the top of the list.** A second view, **"הכול · כרונולוגי"**, lists every publication in one time order, next to opening a single source (the existing source picker, by stable key, is kept). **Messages and replies that belong to one PROVEN thread are shown together under its root**: a discussion's approved replies are read through the existing community reader (`community_replies_page`, approved only) **only when the thread is opened**; group replies stay private until the group-reply proof (PR #1549's proposal v2, not applied) is applied by a separate approval. Private messages, replies not yet approved for publication and unauthorised material are never read or shown. The source identity, the writer, the date (Hebrew and Gregorian, `relative_time_display_law` v4), the "חדש" mark and the exact link to the content are kept; a row's picture or video preview is a **small thumbnail**, and a video plays on request only (the Or HaGeula video plays in place without its pictures, by the integrated c4f598a21). The construction note «האתר נבנה מבפנים…» and the button «הרשמה לעדכונים» close the window, the same note and the same button as the Home's (`BuildingSignupNote2029`); the button opens the existing sign-up component (`NewsletterSignup2029`, `subscription_funnel_law` v22) and reports only what the server answered. Implementation seam: `nowSourceThreads` and `homeUpdateColumns` (pure projections of the same models) in `src/lib/nowPublications2029.js`; `SourceThread` and `ThreadReplies` in `NowPublications2029.jsx`.

**«דופק האתר» at the top of "עכשיו" (ZURIEL 25.11.2026 — APPROVED on a branch; reconnects the 21.11.2026 line; not merged, not deployed to Production).** One thin line (`NowPulseLine2029` in the fixed-height `NowPulseLineSlot2029`), above everything else in the window, fed by the **one existing public reader** (`research_pulse_2029`, through `readResearchPulse` and its cache) for a **fixed 168-hour window, one read**, named «השבוע האחרון» (no adaptive 24h/7d/30d). It shows only: **hot numbers** (links to their number pages, at most two, no event counts), the **trend of activity** (computations from `activity_2029`, taken from the server's own two halves of the window: the last 3.5 days against the 3.5 days before; a direction and a percentage, with the two counts in the tooltip and on a wide screen; these are events, never people), and an **entrance to «סטטיסטיקה»**. Traffic Intelligence v10–v12: aggregates above the server's privacy floor (10 events and 5 sessions) only; **no audience size, no totals, no per-section views, no per-post counts, no crawlers**; a part with no data is left out (never a zero, never invented) and a window with nothing usable says «אין עדיין נתונים מעל סף הפרטיות». Layout: one 44px line on a wide screen; on a phone **two thin rows** (title and statistics link; hot numbers and trend), a third thin row only at ≤370px; **no horizontal scroll and nothing hidden**; the slot reserves the height before and after the data arrives. The component loads on demand inside "עכשיו" (about 1.6KB JS and 0.8KB CSS gzip); no measurement change. The test `royal-connected-assets-2029` was narrowed for this one place only: the calculator pages still may not mount any pulse strip, and `NowPublications2029` must mount `NowPulseLineSlot2029` exactly once and no other pulse slot.

### 10.9 One transient surface at a time

On constrained/mobile layouts, the System Frame must coordinate transient surfaces so Quick Inspect, Now, Raziel, Tools and Workspace overlays do not stack into competing modal layers.

Preferred invariant: **one primary transient surface open at a time**, while Research Context and exact return remain preserved underneath.

Close/back/Escape/gesture behavior must be semantically consistent and accessible. Opening another transient surface may replace the visible projection but must not silently destroy the underlying research context or return position.

### 10.10 Tools and AI are contextual, navigation remains stable

Global Navigation communicates product structure. Adaptive Actions communicate available operations. They must not collapse into the same control system.

AI may prioritize which contextual tool/action is most useful for the current selection and research context, but stable navigation families and core command affordances remain user-learnable and recoverable.

Future voice, keyboard, agentic or ambient interfaces should invoke the **same semantic commands**, not introduce a parallel control architecture.

### 10.12 One bar that expands upward · Human Gate ZURIEL · 19.11.2026

**Status:** the composition below is APPROVED by ZURIEL (19.11.2026). Exact visual values are
PENDING PREVIEW (Design V2 §14.7). No merge, deployment, database write or flag change is approved
by this section. Owner action: **EXTEND_EXISTING** (this addendum; visual language in Design V2 §14).

1. **Entries.** The global bar holds five entries in this order: **כאן · שיתוף · רזיאל · עכשיו · עוד**.
   Raziel stays at the physical center. “שיתוף” takes the slot of the former gimatria shortcut.
   **Superseded:** the v1 working vocabulary `⌖ כאן | 123 מספר | ◉ עכשיו | ✦ רזיאל | ⋯ עוד`
   (UPDATE 2026-09-07) and the 29.10.2026 order כאן | מספר | רזיאל | עכשיו | עוד.
2. **Gimatria stays open.** Number/gimatria is a direct shortcut inside “עוד”, with its own
   availability state (`lock_number`); it never moves behind the “כלים” lock.
3. **Expansions.** “עוד”, “שיתוף” and “כאן” open an expansion that rests on the bar and is visually
   attached to it, in the shared visual language. §10.9 applies: one expansion (one transient
   surface) at a time; switching replaces the visible projection and keeps Research Context and
   exact return. The bar's row stays reachable and keyboard-operable; each entry exposes whether
   its expansion is open.
4. **What each expansion holds.** “עוד”: actions, tools, search, the gimatria shortcut, the
   personal area and installation. “שיתוף”: the one `ShareActions`, naming the exact page, result or
   finding being shared (its title and address). “כאן”: context, selection and the page map with the
   relevant actions. Existing permissions stay: “כאן”, actions and closed capabilities keep their
   current gates; a new design opens nothing.
5. **Visible operations.** An active operation shows a compact indicator attached to the bar:
   operation, context, real phase and elapsed time, also while expansions are closed; activating it
   opens the detail and the way back to the result. It is a projection of the existing operation
   owners only (no task store, persistence or polling in the bar), uses the canonical progress model,
   and never shows an invented percent.
6. **Tool Mode.** Unchanged: a deep tool projects its actions into the same bar through
   `SystemToolDock2029`, keeps Raziel and keeps a route back to the global bar.
6a. **One width, one surface (ZURIEL, second round, 19.11.2026).** The bar and its expansions share one
   width token (`--s29-bar-w`); an open expansion rests on the bar with joined corners; the bar uses the
   compact royal surface of Design V2 §14.5. Panel titles are centered exactly. Focus moves into an
   opened expansion, Escape closes it and returns focus to its bar entry, and the expansion does not
   trap focus, so the bar row stays reachable.
6b. **“עכשיו” is an expansion too (Human Gate ZURIEL · 19.11.2026).** “עכשיו” and the personal area it
   holds open as an expansion of the same bar (one width, joined corners, a fixed height like “כאן”), not
   as a separate centered window. In the bar the publications show as one list with inline expansion
   (the 5.11.2026 wide desktop list-and-detail applies only where “עכשיו” is not opened from the bar).
   The source row of “עכשיו” orders sources by their latest update in the window, newest first (the
   first chip, on the right in RTL, after “הכול”); a known public group with nothing loaded stays listed
   after them. **Superseded:** the fixed kind order of the 11.11.2026 source picker. The group
   «כי לה׳ המלוכה — גימטריות» is hidden from “עכשיו” (no chip, none of its rows; presentation only).
6c. **Rail and sources (Human Gate ZURIEL · 19.11.2026).** The navigation rail lists destinations only: site map,
   email updates and privacy are not rail rows; they stay in the footer (“מידע” and the updates signup) and on
   their own pages. A rail closed by hand (the × above it or its own button) stays closed while the pointer is
   still over its column; hover opens it again only after the pointer has left that column. In “עכשיו”,
   «הגילוי היומי» is one source: its channel updates and its group arrivals share the group's source key.
6d. **One share window (Human Gate ZURIEL · 19.11.2026).** A share placed inside a page (a post, a finding, a result, an image,
   a message) opens the bar's “שיתוף” expansion with exactly what it shares (`src/lib/share/barShare2029.js`: the same
   ShareActions props, channels and telemetry); the page keeps one “שיתוף” entry, never its own channel row. What a page sends
   (its card and “מה יישלח”) folds into one line so the buttons stay in view. Where no bar is mounted, the page keeps its own
   ShareActions. The window also holds «שתפו בקהילה» (canonical_ui_components_law v13 §2: the existing composer through the
   person's existing device draft, own words required before publishing; not a share event) and a QR code of the same link,
   made on the device when asked. Not yet routed: the ELS matrix share and the Lightbox image link (share map C6).
7. **Dependency.** The bar's “שיתוף” entry requires `canonical_ui_components_law` v13 (Design V2
   §14.6) before any merge.

### 10.11 Acceptance implication for the first native 2029 frame

Before a World-specific surface becomes the presentation authority, the generic System Frame should demonstrate these semantics without World hard-coding:

- Orientation + exact return;
- adaptive Global Navigation;
- Research Context continuity;
- Adaptive Command Surface / Command Island projection;
- Raziel compact presence and contextual expansion seam;
- one-transient-surface coordination;
- Quick Inspect seam with Number/Expression as first planned Golden projection;
- Now/Attention projection seam without a parallel notification store;
- Heichal deepening while preserving context;
- mobile 320/360/390, desktop, RTL/LTR readiness, keyboard/focus, reduced-motion and accessibility behavior.

**LOCKED PRODUCT DIRECTION != IMPLEMENTED != MERGED != DEPLOYED != LIVE.**

This 2029 section is a Human-Gate product/architecture lock on the branch. It becomes canonical repository state only through the normal merge/release gate.