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
