# 📐 SOD1820 — CONTENT FOUNDATION CONTRACT v1

> **מטרה:** לסגור חוזה-Foundation **מינימלי, מדויק וניתן-להרחבה** למימד-חמש + Content Taxonomy + Media/Representation + Multilingual Video — כך שנוכל להמשיך ל-Posts Program **בלי redesign / migration / identity-break**.
>
> **סטטוס:** `FOUNDATION CANONICALIZED` (26.8.2026 — approved-in-principle ZURIEL/GPT + תיקון-אחד, ר' §5). ה-canonicalization הוחל **חי** על `nodes`/`project_codex` (§8 — עדכון אדיטיבי, rule_versioning). קבצי-מסמך (חוזה/CLAUDE.md/Roadmap-anchor) על **ענף-בלבד, לא-מוזג, לא-פרוס**.
>
> **Human-Gate:** כל 8 ההחלטות = **מאושרות ע"י ZURIEL**. תיקון-review יחיד הוחל ב-26.8.2026 על ייצוג «מימד חמש»; **הוחלף ב-6.11.2026 בהפניה ל-PLAN37 ולקוד הקנוני (§5)**. נשאר בתוקף: **אין כלל המחייב Series להיכתב גם כ-Category**.

> **עדכון 6.11.2026 (תכנוני בלבד · ענף-בלבד · לא-מוזג · לא-פרוס):** נוסף §12 — הבחנה מחייבת בין סדרות, מפת-המציאות, זרם-המציאות וחלונית-הרמזים, ושישה צירי-סיווג נפרדים. §1–§11 נשארים כתיעוד-היסטורי של 26.8.2026; כל סתירה מדווחת ב-§12.7 ולא נפתרת בשקט.

---

## 0. LIVE_SYNC_TOKEN

```
timestamp        = 2026-08-26 (canonicalization pass — fresh sync)
origin_main_sha  = e8f02f6f   (fetched live; branch rebased onto it, then +1 commit)
branch           = claude/video-transcription-multilingual-neqwjm  (rebased off origin/main e8f02f6f)
supabase_project = linswmnnkjxvweumprav  (canonical)
collision_check  = content / dim5 / posts = NONE in-progress; research workstream (Shared Expression v1) MERGED+frozen on main → no active roadmap collision
roadmap_version  = MASTER_ROADMAP v5.3 (Shared Expression v1 reconciled, e8f02f6f) — anchor WS-CONTENT-PUBLISHING-FOUNDATION added
master_state_ref = §10–12 (posts = corpus/source + publish-target)
schema_verified  = video_transcripts + posts columns read live (§2); NO schema change
canonicalized    = nodes: dim5_upload_law v2, canonical_ui_components_law v2 (additive) · project_codex.publishing_conventions (additive) · CLAUDE.md line-130 corrected · Roadmap anchor added
```

**Parallel-Agent note:** ה-workstream המקביל (Zvi/Shared-Expression-Extraction v1) **מוזג ל-main (e8f02f6f) והוקפא/reconciled** — אין agent `in_progress` על ה-Roadmap כרגע. ⇒ **אין collision פעיל**. לכן הענף רובּס onto e8f02f6f והעוגן היחיד `WS-CONTENT-PUBLISHING-FOUNDATION` נוסף למפה (navigation-only, לא-מחסן-חוקים). ה-canonicalization ל-`nodes`/`project_codex` הוחל **חי** (DB), קבצי-המסמך על ענף-בלבד.

---

## 1. THE MODEL — ארבעה צירים אורתוגונליים + זהות אחת

**חוק-על (Decision #5 — Taxonomy Separation):** ארבעה מושגים **נפרדים**, אסור לערבב באותו שדה/חוק:

| ציר | דוגמה | הגדרה | ייצוג חי היום |
|---|---|---|---|
| **Series / Content Stream** | «מימד חמש» | סדרת-תוכן חוצת-מדיה. **לא סוג-מדיה.** | חברות: PLAN37 + `contentSeries2029Identity.js` (אין הגדרה מקבילה כאן) — ר' §5 |
| **Category / Topic** | «רמזים חזקים» · «עלוני גאולה» · «צפונות בתורה» | סיווג-תמטי/עריכתי | `posts.categories[]` |
| **Medium / Media** | video · image · audio · text | סוג-המדיה בפריט | **נגזר מ-`posts.content`** (יש `<video>`/`<audio>`/`<img>`) — ר' §4 |
| **Representation / Projection** | DimensionFiveFeed · card · rail · full-page · OG | איך אותה זהות **מוצגת** | קוד-רינדור בלבד (ללא שדה-DB) |

**Content Identity (Decision #2 — One Content Identity):**
- **זהות-אחת = שורת `posts`** (`id` / `slug`). לוידאו: זהות-הוידאו = `video_transcripts.video_key`/`video_id`.
- **`Identity ≠ Representation`.** אותו Content Item מקבל **כמה projections** מאותה שורה: `DimensionFiveFeed vertical` · `full post/page` · `card/list/rail` · `OG/share` · projections-עתידיים.
- **אסור להכפיל** תוכן כדי שיופיע בפיד. ✅ מאומת: `getDimensionFiveVideos()` קורא את **אותה** שורת-`posts` (אין store נפרד לפיד).

---

## 2. SCHEMA REPRESENTABILITY — הוכחה שאין-צורך-בסכימה-חדשה

נקרא חי (project `linswmnnkjxvweumprav`):

- **`video_transcripts`** = `id, video_key, video_id, yt, source_url, title, lang, transcript, summary, is_original, translated_by, model, status, created_at, updated_at`.
- **`posts`** (רלוונטי) = `..., ai_addition, ai_touched, author, categories, content, date, image_url, modified, source, tags`.

מכאן: **כל MUST-NOW ניתן-לייצוג בקיים → אין schema change, אין STOP-for-mismatch.**

---

## 3. MULTILINGUAL VIDEO CONTRACT (Decision #4) — ממופה על `video_transcripts` הקיים

**לכל Video Identity** (`video_key`/`video_id`):

| שדה-חוזה | ייצוג חי | הערה |
|---|---|---|
| `source_language` | השורה עם `is_original = true` → ה-`lang` שלה | אין שדה-חדש; `is_original` הוא הסמן |
| `original transcript` | שורת `is_original=true` (`transcript`) | — |
| `translations bound to same identity` | שורות `is_original=false` עם אותו `video_key`/`video_id` (`lang` שונה) | binding = `video_key` |
| provenance | `translated_by` · `model` | קיים |

**כללי-המקור (מקובעים):**
- מקור **עברית** → עברית=original + תרגומים לסט-היעד הקנוני.
- מקור **אנגלית** → אנגלית=original + **עברית חובה** + יתר-הסט.
- מקור **שפה-אחרת** → שפת-המקור נשמרת + **עברית+אנגלית חובה** + יתר-הסט לפי `content_translation_law`.

**⛔ אסור מנגנון-תרגום מקביל.** מרחיבים **רק** את `content_translation_law` / `video_transcription_law` הקיימים (הרחבה-מילולית ב-§8, לא-מיושמת עדיין). Image+Text פוסטים: רב-לשוניות = **EXTENSION POINT** (טרם-נדרש; ר' §7).

---

## 4. MEDIUM DETECTION + DIMENSION FIVE FEED (Decision #1 & #3)

- **Medium נגזר מהתוכן** (לא שדה): `getDimensionFiveVideos()` מזהה `mp4`→`kind:"video"`; אחרת `m4a|mp3|aac|ogg`+`<img>`→`kind:"photo"`. **זהו ה-medium-resolver החי.**
- **Eligibility לפיד = חברות-Series** (בקורא-הפיד הישן: `tag "מימד חמש"`; חברות-סדרה קנונית — §5), **לא medium**. ✅ מאומת חי: פוסט 5082 (photo, `categories=['מימד חמש']`, **בלי «וידאו»**) חוזר מהשאילתה-לפי-תג ומופיע בפיד.
- **Feed בוחר rendering לפי medium** (רכיב אחד, `DimensionFiveFeed`, אין feed/store נפרד):
  - **Video** → vertical-immersive + `<track>` he(default)+en + language-switching (היכולת הקיימת).
  - **Image+Text+Audio** → vertical-immersive image + מלל-נגלל + `<audio autoPlay loop>` + gesture/autostart לפי מגבלות-הדפדפן.
- **אין חובת «וידאו» כשהפריט אינו-וידאו** (Decision #1). `categories` נקבע לפי-התוכן; Series-מmembership עצמאי.

---

## 5. SERIES REPRESENTATION — מצביע למקור-האמת הקיים  [עודכן 6.11.2026]

> **מסמך זה אינו מגדיר סדרות ואינו מגדיר חברות בסדרה.** ההגדרה נמצאת אצל הבעלים הקיימים בלבד:
> - **החלטות:** PLAN37 (`project_codex` id 37) — DEC-SERIES-003/004/005/006 וההחלטה על הסדרה המשותפת «מסרים» (CONTENT-AUDIENCES-HYBRID-NOW-20261102/SERIES-01).
> - **קוד קנוני:** `src/lib/research/contentSeries2029Identity.js` — `CONTENT_SERIES_2029`, `contentSeriesMembershipFilter`, `hasExactMembership`, `contentSeriesByKey`, `contentSeriesKeysForPost`; ו-`src/lib/research/contentSeries2029Projection.js` כקורא הסדרות המשותף ל-Home/World.
>
> ⚠️ **ההגדרה בקוד היא «bounded presentation contract», לא registry, store או סמכות פרסום** (כלשון הקוד). כשיש סתירה בין סעיף זה לבין PLAN37 או הקוד, הם קובעים, והסתירה מדווחת (§12.7) ולא נפתרת כאן.

- **אין שדה/טבלת `series`.** נשאר **EXTENSION POINT** (לא-בונים): רק אם יידרש Series חוצה-מדיה עם metadata (עונה/סדר/hero).
- **Category≠Series נשאר חוק:** נוכחות שם-סדרה ב-`categories` אינה הוכחת-חברות, ולהפך. ⛔ אין כלל המחייב Series להיכתב גם כ-Category (או להפך).
- **חסר-שיוך נשאר חסר-שיוך** — לא מסיקים חברות מנושא, משם או מקשר-למפה (§12.4).
- קורא פיד «מימד חמש» הישן (`getDimensionFiveVideos`, §4) קורא תג בלבד; הוא קורא-פיד היסטורי ואינו קובע חברות-סדרה קנונית.

<details><summary>היסטורי · 26.8.2026 · לא נורמטיבי</summary>

הנוסח שקדם לעדכון: «ייצוג-Series קנוני של «מימד חמש» = הטוקן ב-`posts.tags` בלבד; נוכחותו ב-`posts.categories` = transitional/legacy-compat». נוסח זה הוחלף בהפניה למעלה בעקבות DEC-SERIES-003/004/005/006 וממומש ב-`contentSeries2029Identity.js`. נשמר כאן כתיעוד הפרובננס בלבד.

</details>

---

## 6. TAXONOMY UI ≠ IDENTITY (Decisions #6, #7) + Category Icons

- **`רמזים חזקים` — לא-מוגבל-לפי-כותב (Decision #6):** קטגוריה/בחירת-עריכה ברף-גבוה. ZURIEL=Human-Gate ורשאי לשייך גם תוכן של יוצר-חיצוני. **מבטל את הקונבנציה הישנה «צוריאל-בלבד»** (DRIFT-1 מהדוח הקודם — **RESOLVED ע"י ZURIEL**).
  - *הבהרה 6.11.2026 (§12.5):* הקטגוריה נשארת סימן-עריכה. **כניסה לחלונית-הרמזים** היא מסלול נפרד ומסונן לרמזי גאולה בלבד, ואינה נגזרת מהקטגוריה לבדה.
- **סמלי-קטגוריה/באדג'ים = presentation בלבד, לא Identity (Verification #8):** `categoryIcons.js` (💎/📖/🔠) + `StrongHintBadge`/`VideoBadge`/`DimensionFiveBadge` הם **תווית-תצוגה** על שם-הקטגוריה/הכרטיס. **אינם קובעים מדיה/סדרה/זהות.** מקור-האמת לזהות = `posts` row; לסיווג = `categories`; ל-Series = תג.
- **System Addition (Decision #7):** תוספת-מערכת על פוסט-כותב-חיצוני חייבת להיות **מובחנת מדברי-הכותב**, ולהישען על **`posts.ai_addition` הקיים** (אין storage חדש). *הערה-provenance:* פוסט 5081 («78=מחל») מימש זאת כ-HTML-inline (`🔵 תוספת המערכת`) — עתידית ראוי להעביר ל-`posts.ai_addition`; **מיגרציה = out-of-scope עכשיו**, מתועד בלבד.

---

## 7. FOUNDATION EXPANSION GATE

**פסק-דין: `FOUNDATION SUFFICIENT`** — לסגירת החוזה הזה. כל MUST-NOW **ניתן-לייצוג בקיים** (§2), אין schema change.

| יסוד | סיווג | נימוק |
|---|---|---|
| Identity independent of media | **MUST NOW ✅ סגור** | `posts` row / `video_transcripts.video_key`; medium נגזר, לא-מזהה |
| Series / Category / Medium separation | **MUST NOW ✅ סגור** | §1 — 4 צירים; ייצוג-חי ממופה |
| Media binding | **MUST NOW ✅ סגור** | medium-resolver ב-`getDimensionFiveVideos` |
| Multilingual **video** binding | **MUST NOW ✅ סגור** | `video_transcripts` (is_original+lang+video_key) |
| Author/System-voice separation | **MUST NOW ✅ סגור** | `posts.ai_addition` + `authors.js` |
| Human Gate | **MUST NOW ✅ קיים** | ZURIEL |
| Extensibility hook | **MUST NOW ✅ סגור** | Series-token + medium-resolver + projection-layer (רכיב-אחד) |
| Dedicated `series` field/table | **EXTENSION POINT** | representable דרך המתארים הקיימים (§5); לבנות רק כשיידרש metadata |
| Multilingual **non-video** (image+audio/text) | **EXTENSION POINT** | טרם-נדרש; hook ל-`content_translation_law` שמור |
| Carousel / PDF / live / audio-only | **EXTENSION POINT** | medium-resolver מרחיב בלי-schema |
| Alternate feed renderers | **EXTENSION POINT** | projection-layer מרחיב בלי-store |
| Post ↔ Reality-Graph binding | **LATER** | Master State §12.4 — parser לא-בנוי (out-of-scope) |
| Full Posts Research ingestion | **LATER** | Shared-Extraction workstream נפרד |

**Future-Capability Challenge:** סוג-מדיה-חדש (קרוסלה/PDF/live) — **לא-שובר** את המודל: medium-resolver מוסיף ענף, projection-layer מוסיף renderer, Identity=posts row נשאר. הסיכון-היחיד-האמיתי = רב-לשוניות-לפוסט-לא-וידאו — מסומן EXTENSION POINT עם hook קיים.

---

## 8. CANONICALIZATION — ✅ APPLIED (26.8.2026, additive · rule_versioning · אפס-מחיקה)

> הוחל **חי** על `nodes`/`project_codex` בפאס-הקנוניזציה (אישור-עקרוני ZURIEL/GPT + התיקון ב-§5). כל שינוי = הרחבה-אדיטיבית: גרסה-ישנה `is_active=false`, שורה-חדשה `rule_version+1`+`supersedes_version`. אפס-מחיקה.

1. ✅ **`dim5_upload_law` v1→v2** (nodes, additive): נוסף — «מימד חמש» = **Series** חוצת-מדיה (לא medium); eligibility-לפיד לפי-**תג** (`posts.tags`), נוכחות ב-`categories`=transitional/legacy (⛔ אין חובת dual-write); **אין חובת «וידאו»** כשהפריט אינו-וידאו; medium-resolver (video/photo) קובע rendering; Identity≠Representation.
2. ⏸️ **`content_translation_law` + `video_transcription_law`** — **NO CHANGE (already-sufficient):** `video_transcription_law` כבר מקודד קנונית את המיפוי (`is_original=true` שורת-מקור · שורה-אחת לכל `(video_key,lang)` · binding=`video_key` · כללי-מקור). לא נדרש bump.
3. ✅ **`canonical_ui_components_law` v1→v2** (nodes, additive): נוסף — Category-Icon/Badge = רכיב-תצוגה קנוני, ליד-הכותרת/תווית-«פוסט», לחיץ-לקטגוריה, **לא על-התמונה**, **אינו Identity**.
4. ⏸️ **`post_gematria_box_law` / `ai_gematria_verified_stamp_law`** — **NOT bumped (החלטת-מינימום):** מנגנון-החותמת נשאר כמות-שהוא; קונבנציית System-Addition הכללית (מדיה-אגנוסטית) הושמה בבית-האמת שלה = `publishing_conventions` (פריט 5), לא בחוק-גימטריה. חוסך over-touch.
5. ✅ **`project_codex.publishing_conventions`** (additive append): (א) `רמזים חזקים` = בחירת-עריכה ברף-גבוה, לא-מוגבלת-כותב, Human-Gate=ZURIEL (גובר על «צוריאל-בלבד»). (ב) דפוס «יוצר-חיצוני \| שם» + attribution-למדיה-חיצונית. (ג) System-Addition → `posts.ai_addition`, מובחן מדברי-הכותב. (ד) 4-צירים + הפניה לחוזה זה.
6. ✅ **`CLAUDE.md` שורה-130** (additive edit): הנוסח «רמזים חזקים = רק הפוסטים של צוריאל» עודכן ל-«בחירת-עריכה ברף-גבוה, לא-מוגבלת-לפי-כותב» (Decision #6) — למניעת drift מול ה-codex החי.
7. ⏸️ **`project_codex` slug ייעודי `content_foundation_contract`** — **NOT created** (החלטת-מינימום: «אל תיצור codex/rule חדש אם ניתן להרחיב קיים»). החוזה חי כקובץ-מקור + הפניות מהחוקים הקיימים. ניתן להוסיף אם review עתידי יבחר בכך.

---

## 9. ROADMAP — ✅ APPLIED (עוגן יחיד, navigation-only)

collision-check חי: workstream-המחקר (Shared Expression v1) **מוזג+הוקפא ב-main (e8f02f6f)** — אין collision פעיל. הענף רובּס onto e8f02f6f, ונוסף **עוגן-ניווט יחיד** (לא-מחסן-חוקים) ל-`SOD1820_MASTER_ROADMAP.md`:

```
## 🎬 WS-CONTENT-PUBLISHING-FOUNDATION — יסוד תוכן/פרסום  [OPEN-HUMAN-GATE · 26.8.2026]
- Scope: Content Identity · Series/Category/Medium/Representation · media binding · multilingual-video binding.
- מקור-אמת: SOD1820_CONTENT_FOUNDATION_CONTRACT.md + חוקי-פוסט ב-nodes + project_codex.publishing_conventions (הפניה בלבד).
- STATE: Foundation CANONICALIZED (ענף-בלבד); Posts Program build = OPEN-HUMAN-GATE.
- Open: image+audio-multilingual (EXT) · series-field (EXT) · content-safety (Human-Gate) · Post↔Reality-Graph parser (LATER §12.4).
```

---

## 10. OUT OF SCOPE (מקובע — לא-נבנה)

⛔ Posts Research Extraction · parser-חדש-לפוסטים · Research-store-חדש · UI/feed redesign · content-system-מקביל · auto-canonicalization/publication · merge/deploy. עתיד: `Post/Transcript/OCR/Source → Shared-Extraction → Verification → Research-OS` (workstream נפרד).

---

## 11. VERIFICATION — ר' דוח-הסשן (§G). כולם ✅ concept/code/live, build ירוק, אפס-regression.

---

## 12. עדכון 6.11.2026 — תוכן-ליבה, סדרות, מפת-המציאות וחלונית-הרמזים  [תכנון + מימוש בענף, ללא מיזוג/פריסה · ממתין ל-Human Gate]

> **היקף:** חוזה/תכנון, והמימוש השלבי שבענף מתועד ב-§12.9. אין שינוי DB, API, פוסטים, סיווגים או פרודקשן. כל ההפניות לבעלים מצביעות על בעלים קיימים; מסמך זה אינו מקור-אמת חלופי להם.

### 12.1 עיקרון מוצר

מוצר הדגל הוא **מערכת-הידע SOD1820**. תוכן-הליבה, הסדרות, מפת-המציאות וזרם-המציאות עובדים יחד, אך **אינם אותו מוצר** ואינם מחליפים זה את זה.

### 12.2 ההבחנה המחייבת

| מושג | תפקיד | בעלים קיים (הפניה בלבד) |
|---|---|---|
| **סדרות** | הבית של תוכן-הליבה, המחקר והידע; קיבוץ עריכתי עם חברות מפורשת | PLAN37 (`project_codex` id 37) DEC-SERIES-003/004/005/006 · `src/lib/research/contentSeries2029Identity.js` |
| **מפת המציאות** | **הסדרה הראשית:** סדרה רגילה במנגנון הסדרות הקיים; חברות בתגית המדויקת «מפת המציאות» בלבד (שלב 1, §12.9). אינה חלונית-רמזים, אינה גרף הקשרים ואינה זרם-המציאות | PLAN37 DEC-SERIES (החלטה ממתינה) · `src/lib/research/contentSeries2029Identity.js` |
| **גרף הקשרים (Reality Graph)** | **שכבת קשרים** בין פוסטים, מספרים, שפות, מקורות, נושאים ואירועים (הוגדר קודם בשם «מפת-המציאות»; השם «מפת המציאות» שמור כעת לסדרה). **אינו מסווג רמזים ואינו קובע סדרה** | `reality_graph_law` v8 (`project_codex` id 18) · Owner Index §F |
| **זרם-המציאות / תיעוד אירועים** | תיעוד המציאות והאירועים | `reality_stream_law` (`project_codex` id 17) · קטגוריית «תיעוד אירועים» |
| **רמזים חזקים / חלונית-הרמזים** | מסלול **נפרד ומסונן** לרמזי גאולה בלבד | ר' §12.5 · §6 (קטגוריה = סימן-עריכה) |

**פוסט מחקרי יכול להשתייך לסדרה ולהיות מחובר למפה — בלי להיות רמז גאולה.** שלוש התכונות בלתי-תלויות.

### 12.3 שישה צירי-סיווג נפרדים (ללא שדה חדש)

הארבעה של §1 נשמרים, ונוספים שניים שכבר קיימים כמושגים. כל ציר נקרא ממנגנונו הקיים בלבד:

| ציר | מנגנון קיים | מה הוא אינו |
|---|---|---|
| **Series** | חברות לפי מתארים ב-`contentSeries2029Identity.js` | אינו Category, אינו Medium, אינו רמז |
| **Category** | `posts.categories[]` | אינו סדרה (גם כששם זהה — ר' §12.7) |
| **Medium** | נגזר מהתוכן (§4) | אינו סדרה, אינו קטגוריה |
| **Representation** | קוד-רינדור בלבד (§1) | אינו זהות |
| **קשר בגרף הקשרים** | edges/ישויות לפי `reality_graph_law`, בהרשאה ובאסמכתה | אינו חברות בסדרה ואינו סיווג-רמז. טקסט-סיווג אינו edge |
| **סיווג-רמז / אישור כניסה לחלונית** | החלטה מפורשת של ZURIEL (Human Gate) | אינו נגזר מאף ציר אחר |

### 12.4 כללי אי-הסקה (מחייבים)

אין להסיק **רמז גאולה** מ:
1. שיוך לסדרה;
2. קשר למספר (גם 1820 או מספר גאולה מוכר);
3. הופעה בגרף הקשרים או קשר בגרף;
4. תגית/קטגוריה בנושא גאולה, או כל מילה בכותרת;
5. מדד התכנסות, איכות או חוזק.

ולהפך: אין להסיק **סדרה** מקשר-למפה, ואין לסווג **סדרה/קטגוריה** מתוך שם-נושא בלבד. אין ליצור שיוך-סדרה אוטומטי; חסר-שיוך נשאר חסר-שיוך.

### 12.5 חלונית-הרמזים

- כניסה מחייבת **סיווג-רמז מפורש** ו**אישור** (Human Gate = ZURIEL), פר-פריט.
- קטגוריית «רמזים חזקים» (§6) נשארת **סימן-עריכה ברף-גבוה** על הפוסט; היא אינה, לבדה, אישור כניסה לחלונית.
- פוסט מחקר/ליבה (ר' §12.6) אינו נכנס לחלונית אוטומטית, ואף לא פוסט שכבר נושא את הקטגוריה.
- אין ליצור חלונית, רשימה או מאגר נוסף; המסלול מוגדר מעל הקיים. **בבדיקה (6.11.2026) לא נמצא חוק ייעודי שמגדיר כניסה לחלונית** (ר' §12.7 סעיף 3); PLAN37 §32.3 קובע שהסיווג משותף עם סינון הפוסטים ונשאר אצל בעלי המקור/Intake/Graph.

### 12.6 פוסטים לדוגמה — תוכן-ליבה / מחקר (אסנס)

דוגמאות לתוכן-ליבה/מחקר. **נקראו 6.11.2026 מ-`posts` החי בקריאה בלבד; תצלום-מצב ולא החלטה.** אין בטבלה שיוך, סיווג או הכרעה:

| פוסט | קטגוריות (מקור) | כותב במקור | סדרה נפתרת היום | הערה |
|---|---|---|---|---|
| **5018** שבילי שפה — חיבור בין שפות | שבילי שפה · רמזים חזקים · תיעוד אירועים | — | אין | «שבילי שפה» אינה בין הסדרות המוגדרות. נושא את «רמזים חזקים» כסימן-עריכה בלבד. כותרת המקור: «חיבור **בן** שפות» |
| **5084** ברכת כהנים במרחב — 1820 בחוץ, 898 בפנים | גימטריה מרחבית · סוד האותיות והמספרים | SOD1820 | אין | — |
| **מטריקס — הצופן הנסתר (506)** | מימד חמש · הצופן בסרטים | — | אין | «מימד חמש» דורשת גם מפרסם מדויק. DEC-SERIES-003 (APPROVED): 5003/5004 יוצאים ממימד חמש ליעד «הצופן בסרטים» (נושא) + מפרסם «המערכת»; קטגוריית המקור «מימד חמש» עדיין שמורה בנתונים, ועדכונה הוא שינוי סיווג נפרד שלא הוחל |
| **משחקי הדיונון** (5004) | מימד חמש · הצופן בסרטים | — | אין | כנ"ל |
| **5009** עטרת תפארתכם = 1820 | סוד 1820 · סוד האותיות והמספרים | — | אין | התגית «גאולה» אינה סיווג-רמז (§12.4) |

- קשרים קיימים (נבדק 6.11.2026 בקריאה בלבד, ר' טבלאות `research_objects`/`world_contributor_research_v1` לפי `source_ref`, `post_gematria_links`, `post_qa`, `post_revisions`, `news_ticker*`, `entity_links`, `edges.metadata`, `nodes.metadata`): **5018, 5084 ו-5009** מחוברים לשורת `research_objects` אחת כל אחד במצב `candidate` (`source_ref` = `posts:<id>#…`), שנוצרה ב-backfill של 7.10.2026; **5003 ו-5004 — לא נמצא קשר**. אין edge/entity_link/nodes לאף אחד מהחמישה. ללא שינוי; קשר `candidate` אינו אישור, אינו סדרה ואינו סיווג-רמז (§12.4).
- אין להכניסם אוטומטית לחלונית-הרמזים. אין למחוק אף פוסט.

### 12.7 נקודות פתוחות לאישור ZURIEL

1. **DRIFT §5 מול PLAN37 — ✅ תוקן בענף (6.11.2026):** §5 הוחלף בהפניה ל-PLAN37 + `contentSeries2029Identity.js`, ללא הגדרה מקבילה. הנוסח הישן נשמר כהיסטוריה. ממתין לאישור מיזוג.
2. **סדרה לפוסטי-הליבה שלעיל:** האם קיימת להם סדרה מוגדרת, או שהם נשארים תוכן-ליבה ללא סדרה. נדרשת קודם בדיקת-קשרים (§12.6). אין להציע סדרה חדשה בלי צורך מוכח.
3. **בעלים להסמכת חלונית-הרמזים (נבדק 6.11.2026):** Owner Index אינו מפרט בעלים לחלונית. `research_gold_hints_law` v4 = דירוג בולטות/אצירה בעולם — **לא** הסמכת-כניסה. `reality_stream_law` = זרם התמונות (`gallery_images`, יחידה «רמז»), לא פוסטים. PLAN37 §32.3 מגדיר רק שהסיווג משותף עם סינון הפוסטים ונשאר אצל בעלי המקור/Intake/Graph. **לא נמצא בעלים ייעודי** — נדרשת החלטה: להרחיב בעלים קיים (EXTEND_EXISTING) או לקבוע ש-PLAN37 §32.3 הוא הבית. ללא שדה/חוק חדש לפני החלטה.
4. **בריכת הבית ועדשת ה-hints (החלטת ZURIEL 6.11.2026):** HOME-01 **נשאר כפי שאושר** ובריכת הבית (`src/lib/research/homeLaunchPosts2029.js`) **אינה משתנה**. היא בריכת כרטיסי «עכשיו»/תיעוד, **לא** חלונית-הרמזים; §12.5 חל על החלונית ועל עדשת `hints` בלבד. **אין כניסה לחלונית או לעדשת `hints` על בסיס קטגוריה או תגית בלבד.** עדשת `hints` ב-`src/lib/nowPublications2029.js` נגזרת היום מקטגוריה/ערוץ — סטייה מ-§12.5; פתרון זמני מוצע (לא יושם): העדשה נשארת ריקה ומוסתרת עד שיוגדר מקור הסמכה מפורש. תיקון `exactAuthor` בבית נבדק בנפרד ולא מומלץ בשלב זה (משנה התנהגות שנבדקת בבדיקה קיימת).
5. **חוזה Reality Graph:** `reality_graph_law` הוא רשומת DB (`project_codex` id 18), לא קובץ-מקור. ההצעה: תוספת אדיטיבית (גרסה חדשה לפי `rule_versioning`) עם ההבהרה «שכבת קשרים, לא מסווגת רמזים». היא דורשת אישור כתיבה נפרד ולא בוצעה כאן.

### 12.8 קריטריוני קבלה (למסמכים בלבד)

- [ ] §12.2 מצביע רק על בעלים קיימים; אין שם/מוצר/סדרה/חלונית/שדה חדשים.
- [ ] §12.3 מונה שישה צירים, וכל ציר ממופה למנגנון קיים.
- [ ] §12.4 אוסר הסקת רמז-גאולה מסדרה, מספר, מפה, תגית ומדד, ואוסר הסקת סדרה מקשר.
- [ ] §12.5 דורש סיווג מפורש + Human Gate; הקטגוריה לבדה אינה כניסה.
- [ ] §12.6 הוא תצלום-מצב מתוארך ללא שיוך בפועל.
- [ ] §12.7 מפרט את כל נקודות ה-DRIFT וההחלטות הפתוחות.
- [ ] ה-diff נוגע רק בקבצי `.md`: אין שינוי ב-`src/`, `api/`, `supabase/` או בנתונים.
- [ ] ה-Roadmap מכיל הפניה בלבד לחוזה זה, בלי שכפול חוקים.

### 12.9 תוכנית הסדרות ודף הבית — מימוש שלבי (6.11.2026, ענף בלבד)

- **שלב 1 (מומש בענף):** «מפת המציאות» (`reality-map`) נוספה ל-`CONTENT_SERIES_2029` כסדרה ראשונה ברשימה; שאר הסדרות בסדרן. חברות: תגית מדויקת «מפת המציאות» בלבד — אף פוסט לא שויך, ואין שיוך אוטומטי לפי קטגוריות. בבית: כרטיס ראשי קומפקטי בשורה מלאה עם דוגמית מצוטטת מילה במילה מפוסט 5018, מקושרת אליו (אינה הופכת אותו לחבר בסדרה). קישור לעמוד הסדרה מופיע רק כשיש חבר; כרטיס ראשי אינו מוצג ריק. מזהה ההחלטה ב-PLAN37 ממתין (`PENDING-PLAN37-DECISION`; כתיבה ל-DB טעונה אישור). נוסח הדוגמית טעון אישור סופי לפני פרסום.
- **שלב 2 (מומש בענף):** אזור «מחקרים ותוכן נוסף» אחרי הסדרות והירו (HOME-01 והבריכה לא השתנו): פוסטים ציבוריים בלי סדרה ובלי בריכת «עכשיו» (משלים מדויק, אותם פרדיקטים), 120 יום, עד 4, בלי כפילות מול סרטים/צפנים, בלי שיוך כפוי; נטען רק בהתקרבות; לא מוצג כשהוא ריק או נכשל.
- **שלב 3 (ביקורת בלבד):** מעקב סדרות אינו פעיל בשרת לאף סדרה; «מפת המציאות» ו«מסרים» נשארות מחוץ למיגרציה המאושרת (ממתינות). מצב המיגרציה והסטיות — בדוח השלב; כל החלה דורשת Human Gate.
- **שלב 4 (שמירת אפשרות, ללא בנייה):** משפחות עתידיות בתוך הסדרה: סוד 1820, הצופן בסרטים, שבילי שפה, **תכני גאולה** (שם מוצע במקום «רמזי גאולה», כדי לא להתבלבל עם AUD-01 ועם alias הקטגוריה), ועוד. אין בורר משפחות, אין שדה ואין שיוך. «רמזים חזקים» נשאר סיווג רוחבי, ללא שינוי שם, ואינו כניסה לחלונית-הרמזים.
- **שם ציבורי — «מסרים» (ZURIEL, 6.11.2026) — מיושם בענף:** השם הציבורי של הסדרה המשותפת הוא «מסרים», לפי PLAN37 (CONTENT-AUDIENCES-HYBRID-NOW-20261102/SERIES-01), בבית, בעמוד הסדרות, בחיפוש, בניווט ובמעקב. המפתח `messages-from-righteous` וכותרות המקור ההיסטוריות לא שונו. «מסרים מצדיקים» הוסרה מהקוד כולל המתאר שלה: הקטגוריה הזו אינה קיימת בנתונים (0 פוסטים), וחברי הסדרה הם 80 הפוסטים בקטגוריה «רמזים מצדיקים». «מסרים» היא גם שם של קטגוריה חיה (299 פוסטים, 8 מנויים); היא נשארת ניתנת למעקב ונראית בנפרד (`shadowedCategories` ריק לסדרה זו), ואינה חלק מחברות הסדרה. **פתוח להחלטה:** האם חברות הסדרה «מסרים» תכלול גם את הקטגוריה «מסרים» (299 פוסטים).
- **דוגמית מפת המציאות:** מוצגת כגרפיקה המלכותית של הפוסט עצמו (אריחי האותיות B2 E5 R18 E5 S19 H8 I9 T20 וסכום 86), מצוטטת מבלוק ה-`sgx` של פוסט 5018 ומאומתת בקוד (הסכום חייב להתאים לאריחים, אחרת הדוגמית מוסתרת).
