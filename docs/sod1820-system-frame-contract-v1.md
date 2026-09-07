# SOD1820 SYSTEM FRAME CONTRACT V1

Status: Design contract - 2026-09-04
Scope: Global navigation, contextual orientation, and personal/research control layer.

> UPDATE 2026-09-07 — Bottom Control Layer / Raziel rules below supersede the older presentation-specific wording where they conflict. Historical wording is retained as provenance.

## Core model
SOD1820 has three persistent layers:
1. Top Navigator - מפת העולם: where can I go?
2. Context Rail - איפה אני: where am I and what belongs to this world?
3. Bottom Control Layer - מה אני עושה עכשיו: live state, AI, research actions, connections and build status.

היכל is not a menu. It is a deep spatial/immersive world for discovery and relationships. Navigator gets users somewhere quickly; Heichal lets them enter, wander and understand.

## Top Navigator
RTL primary order:
- כי לה׳ המלוכה / SOD1820 identity
- לגלות
- לחקור
- היכל
- קהילה
- ארכיון
- left edge: האזור שלי

Mega menus expose real depth, not flat route dumps.

### לגלות
פוסטים, גלריות, צפנים/ספריית צפנים, נושאים.
בקרוב: מסעות גילוי, מסעות תלת-ממדיים, גלקסיות גילוי.

### לחקור
דף המספר, בית המדרש, דילוגי אותיות/ELS, מחשבון מקצועי, גימטריה מרחבית, מעבדות.
בקרוב: מצב מחקר, השוואה רב-ממדית, מחקר משותף עם AI.

### קהילה
צ׳אט, חוקרים.
בקרוב: התכנסויות, התכנסויות חיות, מרחבי מחקר משותפים, פורום חדש.

### ארכיון
כל הפוסטים, קטגוריות, שנים, נושאים, תגיות, ובהמשך views שמורים/פופולריים/גילויים.

### האזור שלי
המחקרים שלי, האוסף שלי, המשך/היסטוריה, התראות, פרופיל, הגדרות.
Existing canonical stores must be reused: research_items, user_research, journey_saves. Do not invent a parallel saved/research store without a separate gate.

## Context Rail
Thin contextual row under global navigator. It changes by world.
- Post: ראשי > פוסטים > קטגוריה > פוסט + previous/next/year
- Number: מספרים > 506 + ביטויים / שיטות / צפנים / קשרים
- ELS: צפנים > מחקר + מטריצה / ממצאים / שמירה / פתיחה במחקר
- Beit Midrash: בית המדרש > מקור + שיטה / פסוק / השוואה
- Community: קהילה > space + live/local actions

Invariant: user answers "איפה אני?" in under one second.

## Bottom Control Layer — historical V1 wording (superseded where conflicting)
Full-width, thin, system-like. RTL starts with current context.
Canonical family:
- ⌖ כאן
- ◉ עכשיו
- AI · רזיאל
- ＋ לחקירה
- 🔗 קשרים
- 🕘 המשך
- 🏗️ SOD1820 V2
- ⋯

Raziel is introduced as: AI · רזיאל - החוקר החכם של SOD1820.
Personal library/research navigation is not duplicated here. Contextual actions may add to existing personal research stores.
Layer must collapse and never trap content.

## UPDATE 2026-09-07 — Canonical Adaptive Bottom Dock Contract

### One Dock law
SOD1820 has ONE canonical Bottom Dock / Bottom Control Layer. Pages, tools and worlds MUST NOT create competing global bottom bars.

The Dock is a projection of the System Frame, not an owner of research truth. It reuses existing capability owners/stores/engines and must not create parallel navigation, research, notification, number, AI, graph or saved-item systems.

Working five-slot Global Mode vocabulary is:
`⌖ כאן | 123 מספר | ◉ עכשיו | ✦ רזיאל | ⋯ עוד`
Names/icons remain Human-Gate product vocabulary and may evolve without changing the functional contract.

### Stable structure, adaptive state
The Dock's structure is stable. Context changes state, signals and available actions; it must not make users chase moving controls.

Three projection modes are reserved:
1. **Global Mode** — normal system controls.
2. **Context Mode** — same Dock, with `כאן` and ambient signals reflecting the current canonical Research Context/entity/surface.
3. **Tool Mode** — deep tools (ELS, 3D, book viewers, advanced research tools, future labs) may project tool-specific actions into the SAME Dock. A tool MUST NOT build a second bottom bar. Tool Mode must preserve a clear route back to the global/system context and keep Raziel available.

Tool Mode is an EXTENSION POINT NOW, not permission to implement future tool controls before their roadmap gate.

### Context / כאן
`כאן` answers: "what is this thing and what can I do with it now?"
It may expose canonical current identity/context plus existing actions such as add to research, save, follow, share, relations, root/return and contextual lenses — only where a real owner/capability exists.

Contextual lenses (numbers/topics/people/sources/etc.) are projections of relationships belonging to the current object; they are not duplicate content or new truth stores.

### Ambient signals
The Dock may communicate without requiring a click, but prominence never changes truth state.
Allowed vocabulary: quiet state, subtle dot/glow/pulse, real counter/badge, brief contextual micro-message.

Rules:
- `כאן`: signal only from real current context/selection/relation availability.
- `עכשיו`: unseen/new state only from the canonical live-updates owner.
- `עוד`: personal unread state only from canonical personal notification/message owners.
- `מספר`: contextual indicator only when backed by real number/entity projection data.
- `רזיאל`: proactive signal only when backed by an actual contextual Raziel/research event; never fabricate activity merely because AI could generate text.
- HOT ≠ TRUE. Signal/prominence means relevant/new, never verified/canonical/published by implication.

### Overlay and clearance law
Every new surface that uses the viewport bottom, fixed positioning, drawer, sheet, lightbox, fullscreen viewer or immersive tool MUST declare its behavior relative to the canonical Dock.

No component should independently hard-code a private approximation of Dock clearance when the System Frame exposes/owns that behavior. Reuse/extend existing owners first.

Required behaviors:
- Context/More/Raziel sheets open above the Dock; the Dock remains visible.
- Existing drawers/panels (Number, Now/Live updates, personal center, ads and future tools) must not cover the Dock or become covered by it.
- Mutually exclusive overlays coordinate through their existing owners where possible; do not create a parallel Overlay Manager without a separate architecture gate.
- Fullscreen surfaces must explicitly choose: preserve Dock, collapse Dock, or temporarily yield it. Silent collision is forbidden.
- Mobile safe-area is part of the contract.
- Invisible clickable layers and z-index traps are forbidden.

### More / personal gateway
`עוד` is a gateway sheet, not automatically the full personal center. Opening `עוד` must not itself hide the Dock.
It may route into the existing personal area/User Center and existing research/library/history capabilities. Do not create a second personal area or duplicate saved/research stores.

### Raziel — persistent contextual companion
Raziel is a permanent capability of the System Frame and remains available in Global, Context and Tool modes.

**One Raziel, multiple responsive projections:**
- Mobile: `✦ רזיאל` remains a stable Dock slot and opens the contextual Raziel surface.
- Desktop: Raziel MAY project as a persistent left-side Companion Rail when viewport/surface allows. It is the SAME Raziel capability and SAME Research Context, not a second chatbot/session/system.
- The desktop Companion Rail should be collapsible. "Always available" does not mean "forced permanently open". User choice should be respected when preference persistence is implemented.
- Deep research surfaces (ELS, Number research, books, 3D/graph/labs) may give the Companion Rail stronger presence when useful, without making AI the owner of the experience.

Raziel follows the user's research path. Moving Post → Number → Book → ELS should preserve relevant Research Context/provenance so Raziel can understand how the user arrived, subject to the canonical context contract.

Raziel proactive behavior:
- default = quiet;
- contextual insight available = subtle glow/pulse;
- meaningful contextual event = optional brief micro-message above/near the Dock/Rail;
- high-prominence interruption requires a separately defined product gate.

Raziel MUST NOT auto-open a chat or take over the screen merely because it has generated something. User action opens/expands the conversation except where a future explicitly approved critical-interruption contract says otherwise.

Any proactive Raziel statement must preserve truth taxonomy and provenance. AI suggestion/interpretation/recommendation is not promoted to Finding/Fact/Canonical/Published by UI prominence.

### Responsive law
Mobile and desktop are the same system, not separate products. Responsive presentation may differ while capability identity remains shared.

Mobile favors the compact floating Dock and sheets. Desktop may use wider presentation and the Raziel Companion Rail, but must not create a second navigation/research/AI architecture.

### Rollout / migration law
During gated rollout, role/feature gates may temporarily show the new Dock to approved users while preserving legacy launchers for everyone else. Never remove a legacy entry point for users who cannot yet access its replacement.

Retire legacy surfaces only after capability parity is verified. Preserve capability, truth and provenance — not necessarily the legacy interface.

### New-surface implementation checklist
Before shipping any new page/tool/surface, verify:
- Which Dock mode applies: Global / Context / Tool?
- What canonical identity/context does `כאן` receive?
- Which real ambient signals exist? No fake badges.
- What is Raziel's projection on mobile and desktop?
- Does any fixed/overlay/fullscreen UI collide with the Dock/Rail?
- Are existing capability owners reused?
- Does the public/admin/feature-gated audience retain all existing entry points?
- Does the surface preserve truth/provenance and Human Gate boundaries?

## "בקרוב" is product language
Future capabilities are intentionally visible in the correct conceptual home. They must:
- be clearly marked בקרוב/בבנייה;
- never look like a broken active link;
- explain value briefly;
- live under the correct world: 3D journeys under Discover/Heichal, gatherings under Community, advanced research under Research;
- not create routes/data models merely to support a teaser.

## Heichal contract
Heichal is immersive projection of the knowledge world, not replacement for conventional navigation.
Future doors may include:
- עולם המספרים
- עולם הצפנים
- עולם הטקסט / בית המדרש
- עץ הידע / קשרים
- גלקסיות
- מסעות תלת-ממדיים
- shared spaces where semantically appropriate

Fast navigation stays in top bar. Spatial exploration belongs in Heichal.

## Responsive — historical V1 wording
Desktop: top/bottom frame spans usable viewport width; rich mega menus; thin context rail; console-like bottom.
Mobile: same IA, not a different product. Top = identity + location + menu. Bottom = כאן / AI / עכשיו / לחקירה / עוד. עוד opens complete Control Center. No wall of tiny buttons.

## Visual language
Systemic, quiet, deep, premium. Thin rails, subtle glass/depth, restrained gold/violet accents, no oversized emoji dashboard, clear active state/counters/live dots, subdued but intriguing בקרוב, Hebrew-first RTL geometry. Top and bottom share tokens/radius/borders/spacing/motion.
Spiritual system inscription:
וידע כל פעול כי אתה פעלתו · ויבין כל יצור כי אתה יצרתו

## Invariants
- One global frame; no page creates competing global navigation/control bar.
- One canonical saved/research data path; reuse before creating.
- WhatsApp is a source for עכשיו, not a separate global product surface.
- Raziel is contextual AI, not detached chatbot.
- Heichal and Navigator have distinct jobs.
- Teasers never imply a feature is live.
- Existing SEO routes/canonical URLs are unchanged by the frame.
- Admin-only live AI remains admin-only until a separate release gate.

## Rollout
V1 visual frame first: navigation groups, context rail, full-width bottom console, collapse, בקרוב previews.
Then wire existing live sources: Now feed, canonical saved/research, contextual page adapters.
Then activate future modules one by one behind explicit gates.

## Knowledge Navigation Vision - retained product direction

The navigation must communicate not only current routes but the scale of the knowledge machine being built.

### Ancient books become explorable knowledge spaces
Public promise: users will not only read old books; they will be able to enter them through new lenses and see how their contents connect to the rest of SOD1820.

Navigation family: ספרים ומקורות
- Live/current: scanned books, texts, sources, reading, search where available.
- Connected research lenses: numbers, names/people, verses/sources, topics, codes, related research.
- Future: AI/Raziel analysis, automatic knowledge-tree linking, cross-book comparison, guided journeys inside a book, multilayer views, spatial/3D book exploration.
- Copy direction: "לא רק לקרוא ספר עתיק — להיכנס לתוכו."

The system must eventually expose real live counters from canonical data: books scanned, text units/pages ingested, units analysis-ready, links/entities produced. Never invent these counts.

### Numbers are a research engine, not only a calculator
The UI must represent the real breadth of the gematria/method system (roughly 30 methods according to current project direction; exact production count must be audited before public display).
Lenses include: method, value, expression, person/name, verse, code, topic, source and relationships.
Future spatial model: one numerical object viewed through multiple calculation layers, comparison and 3D/multidimensional navigation.

### ELS / codes are a world, not a single search form
Navigation should expose current matrices/library/research and future scale:
- word/expression search
- multiple terms and cross-search
- names/people
- numbers
- biblical scope/book/chapter
- layered matrices
- relationships between layers
- multilayer and 3D ELS exploration
- guided journeys through a code
- Raziel-assisted relationship analysis
Exact capabilities must be marked Live / In development / Coming soon from the canonical system map.

### Historical content is first-class knowledge
Old posts and media are not legacy clutter. They become an archive navigable through multiple lenses:
- year
- category
- topic/tag
- person/name
- number
- verse/source
- code
- media/research type
The same canonical item may appear through many lenses; never duplicate the content merely to support navigation.

### Multi-entry knowledge principle
A user may enter from a number, name/person, verse, code, book, post or topic and should be able to converge on the same connected body of knowledge.
Human menus = explicit navigation.
Raziel = conversational/contextual navigation.
Heichal = spatial/immersive navigation.
Knowledge graph/tree = shared underlying relationship structure.

### Progress and scale indicators
Every major world may display a real progress/scale module, sourced from one canonical system map:
- current inventory/coverage
- Live
- In development
- Coming soon
- progress percentage only when backed by defined milestones
Home build map, mega-menu progress and bottom V2 indicator must read from the same source rather than hard-coded competing numbers.

### Future registration/value hook - reserved, not designed yet
The frame must leave a future place to explain why joining today creates value tomorrow (early access, saved research continuity, future benefits, etc.), but no benefit promise or signup mechanic is defined by this contract yet.

### Product experience goal
Opening a mega menu should make the visitor understand the scale of SOD1820: existing knowledge plus visible future capability. "Coming soon" belongs beside the live material it extends, rather than in a disconnected roadmap page.