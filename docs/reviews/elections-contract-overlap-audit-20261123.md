# בחירות — ביקורת בעלות, סתירות וצמצום חוזים

**תאריך:** 2026-11-23 · **מצב:** ביקורת ענפית, קריאה בלבד במסד; תיקון תיעוד בענף בלבד. **לא מיזוג, לא מחיקה, לא שינוי production.**

## מקור סמכות
- `SOD1820_MASTER_OWNER_INDEX.md` מנתב בלבד — אינו בעל ראיות או חוזה־על מחקרי חדש.
- החוקים הפעילים נבדקו ב־`public.nodes` עם `type='rule' AND is_active=true`.
- בעלי תחום מאומתים: `reality_graph_law v8`, `truth_axes_foundation_law v3`, `research_strategy_layer_law v17`, `research_intake_foundation_contract_law v14`, `research_gold_hints_law v4`, `zero_scale_law v1`, `reality_stream_law v1`, `inter_agent_coordination_law v18`.
- חוזה ענפים `src/lib/research/oneTreeBranchContract2029.js` גרסה `sod1820.one-tree-branch.v2`, וחוזה בחירות `src/lib/research/electionsDomainContract2029.js` גרסה `sod1820.elections-domain.v3`; בקוד קיימים validators ו־projection ל־`raziel`. זה **לא** מוכיח שהחוזה מחובר לקורא רזיאל החי.
- אינדקס מקור `elections-one-tree-source-index-20261123.json` מכיל **234 הפניות קנוניות** לתמונות (222 `published=1` ללא `curator_hidden`, 12 לא מקיימות זאת), בלי תוכן OCR מלא. הקריאות הקנוניות כפופות ל־RLS בפועל, לא רק לדגלים.

## ממצאי ביקורת

| רמת סיכון | התנגשות/חפיפה | המלצה |
|---|---|---|
| **גבוה — לפני merge** | ענף `gpt/world-topic-navigation-inventory-20261123` מכיל גם `src/App2029.jsx`, `src/pages/ElectionsTopicPreview2029.jsx`, `src/data/electionsTopicSourcePaths2029.json` — קוד פריוויו שנוצר לפני החלטת המשתמש **מיפוי בלבד** | **לא למזג את הענף בשלמותו** למערכת. למסור/להעביר רק קבצי מחקר וחוזי־ניתוב רצויים בענף נקי או ב־PR ממוקד. לא למחוק קוד קיים ללא שער/אישור |
| **גבוה — בעלות מקור** | 234 רשומות נחשבות כולן "מועמדות" לפי OCR. אסור להכניס אותן ישירות ל־`topic_cards` או להציג כ־234 אירועים מאומתים | `gallery_images` נשאר בעל מקור, מספרי־OCR נשארים מועמדים; לשמור `canonical_ref` ומעמד בדיקה; לא שכפול תוכן |
| **גבוה — הרשאות** | חלק מהרשומות `published=2` או `curator_hidden`. המשתמש מורה לבצע מיפוי גם לסגורות, אבל זה לא שווה הרשאת פרסום ציבורית. שדות דגלים אינם הוכחת RLS | לצרוך דרך קורא מוסמך; אינדקס מחקר לבעלים בלבד. לא לייבא טקסט/כתובות פריטים לא־גלויים לבאנדל אתר או לתוצאת רזיאל ציבורית |
| **בינוני — שתי הגדרות לאותו מושג** | "מופע מתועד" מול "אירוע עצמאי" הוצגו בסשנים קודמים כאילו תיעוד זמני אינו אירוע | מסמך החוזה המאוחד כבר מכריע: `news_publication_marker` שומר ערך כפי שפורסם; אירוע, מקור עצמאי וסנכרון הם **מונים נפרדים**. להחליף נוסח קודם בתיקון מתועד, לא בחוק חדש |
| **בינוני — בעלות ranking** | מד עומק 0–100 הוא **סינון תצוגה**; אם הופך ל־"ציון אמת" חדש הוא חופף ל־`research_gold_hints_law v4` ול־`research_strategy_layer_law v17` | להשתמש בדירוג הקיים וב־Explain Why; סליידר קובע רוחב בלבד ולא אמת מחקרית |
| **בינוני — זהות גרף** | צומת בחירות קיים מסוג `entity`; טופיק חדש מתוכנן אך לא קיים ב־`topic_cards`. התאמתו ל־convergence לא מאושרת | לא לשנות type ולא להמציא זהות convergence. להחזיק `node:2bb53dbf-816a-4033-aff2-874c4981cd39` כשורש entity קיים, ולבדוק מסלול topic בנפרד |
| **בינוני — כפל חוזים** | `oneTreeBranchContract2029`, `electionsDomainContract2029`, `electionsIsrael21_26Seed2029` ושלל מסמכי `docs/reviews/elections-*` יכולים להיראות כחוזי־על מתחרים | **אין** לקדם את seed או מסמכי review לחוק. חוזה ענפים = מעטפת; דומיין בחירות = פרופיל; seed = דוגמה/מחקר; docs = ארכיון ראיות, וכלל אחד ב־Owner Index |
| **בינוני — יכולת מול חיות** | `ONE_TREE_CONSUMER.RAZIEL` וקיימת הקרנת `projectOneTreeBranchForConsumer`, אך לא אומת שזרימת production קוראת את 234 המקורות כך | להשאיר סטטוס `NOT_LIVE_INTEGRATED` עד בדיקת אסטרטגיית המחקר וקורא רזיאל, כולל הקשר תחום ו־RLS |
| **נמוך — דחיסת מסמכים** | המיפוי הקודם מכיל JSON עריכה ארוך וקובצי דוחות עוקבים | להשאיר אותם כ־evidence/provenance, ליצור **אינדקס ניתוב קצר יחיד** עם קישורי־מקור, לא לשכפל 234 רשומות בכל מסמך |
| **נמוך — תוקף גרסה** | החוק `inter_agent_coordination_law` מכיל גרסאות 1–17 לא פעילות מול 18 פעילה; גם Reality Graph היסטורי v2–7 מול v8 פעילה | רזיאל וסוכנים יפנו רק לחוק הפעיל העדכני; גרסאות ישנות יישארו provenance, לא הוראות נוספות |

## ארכיטקטורת צמצום מאושרת לתכנון בלבד

```text
MASTER OWNER INDEX [routing only]
  ├── Reality Graph v8 [identity/source relationships]
  ├── Truth Axes v3 [claim/observation/verification/access]
  ├── Research Intake v14 [ingestion & provenance]
  ├── Research Strategy v17 [bounded context / Raziel selection]
  ├── Ranking v4 [explained prominence]
  └── Numeric Rule Family / zero_scale_law [number families]
        ↓ existing One Tree Branch v2 [non-owning evidence envelope]
            ↓ Elections Domain v3 [domain vocabulary, not duplicate graph]
                ↓ canonical gallery_images / posts / topic_cards / nodes / edges
                    ↓ authorized Topic / World / Raziel / Number projections
```

קובץ הניתוב המדויק: `elections-one-tree-owner-route-20261123.json`. רשימת 234 המקורות: `elections-one-tree-source-index-20261123.json`. המודל: **Reference, don't replicate**.

## שערי מעבר לפני אימוץ חי
1. לפתוח ענף/PR נקי של **מיפוי וחיבור חוזים בלבד** ולהוציא ממנו את קבצי ה־UI/preview הישנים — לא למחוק אותם ב־main.
2. לבדוק את הפורמט ב־`inspectOneTreeBranchInput` ואת בדיקות ה־One Tree ו־Election Domain על קלט מאושר אמיתי, לא להניח ש־JSON מתועד הוא כבר bundle.
3. לבדוק ש־Raziel מקבל `Context Pack` תחום מהקוראים הקנוניים, לא קובץ 234 רשומות במלואו; פרופיל ברירת־מחדל: 14/45/424/1237, חזרה למקור.
4. לאשר הרשאות מקור דרך RLS ופרטי access tier לפני כל הצגה.
5. רק אחר כך לשקול אימוץ חוזי/מיזוג/פרסום לפי `inter_agent_coordination_law v18`, ללא חוקים/Store/Graph חדשים.

**מסקנה:** נמצאו *מוקדי סיכון לחפיפה ודריפט* אך לא הוכחה סתירה בין חוקים פעילים של אותה בעלות. אין למחוק חוזים. יש לצמצם **מסירות וקופסאות מקור־אמת**, לא חוקים קנוניים.
