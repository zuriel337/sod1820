# SOD1820 SYSTEM FRAME CONTRACT V1

Status: Design contract - 2026-09-04
Scope: Global navigation, contextual orientation, and personal/research control layer.

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

## Bottom Control Layer
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

## Responsive
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
