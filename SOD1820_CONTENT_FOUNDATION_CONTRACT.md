# 📐 SOD1820 — CONTENT FOUNDATION CONTRACT v1

> **מטרה:** לסגור חוזה-Foundation **מינימלי, מדויק וניתן-להרחבה** למימד-חמש + Content Taxonomy + Media/Representation + Multilingual Video — כך שנוכל להמשיך ל-Posts Program **בלי redesign / migration / identity-break**.
>
> **סטטוס:** `FOUNDATION CANONICALIZED` (26.8.2026 — approved-in-principle ZURIEL/GPT + תיקון-אחד, ר' §5). ה-canonicalization הוחל **חי** על `nodes`/`project_codex` (§8 — עדכון אדיטיבי, rule_versioning). קבצי-מסמך (חוזה/CLAUDE.md/Roadmap-anchor) על **ענף-בלבד, לא-מוזג, לא-פרוס**.
>
> **Human-Gate:** כל 8 ההחלטות = **מאושרות ע"י ZURIEL**. תיקון-review יחיד הוחל: מימד-חמש כ-Series מיוצג קנונית ב-`posts.tags` (feed-eligibility); נוכחות ב-`posts.categories` = transitional/legacy-compat בלבד, **ואין כלל המחייב Series להיכתב גם כ-Category** (§5).

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
| **Series / Content Stream** | «מימד חמש» | סדרת-תוכן חוצת-מדיה. **לא סוג-מדיה.** | טוקן `מימד חמש` ב-`posts.tags` (מקור-אמת-לפיד; נוכחות ב-`categories` = transitional/legacy בלבד) — ר' §5 |
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
- **Eligibility לפיד = חברות-Series** (`tag "מימד חמש"`), **לא medium**. ✅ מאומת חי: פוסט 5082 (photo, `categories=['מימד חמש']`, **בלי «וידאו»**) חוזר מהשאילתה-לפי-תג ומופיע בפיד.
- **Feed בוחר rendering לפי medium** (רכיב אחד, `DimensionFiveFeed`, אין feed/store נפרד):
  - **Video** → vertical-immersive + `<track>` he(default)+en + language-switching (היכולת הקיימת).
  - **Image+Text+Audio** → vertical-immersive image + מלל-נגלל + `<audio autoPlay loop>` + gesture/autostart לפי מגבלות-הדפדפן.
- **אין חובת «וידאו» כשהפריט אינו-וידאו** (Decision #1). `categories` נקבע לפי-התוכן; Series-מmembership עצמאי.

---

## 5. SERIES REPRESENTATION — הבהרה + Extension-Point

**תיקון-review יחיד (ZURIEL/GPT 26.8.2026) — קנוני:** ייצוג-Series קנוני של «מימד חמש» = **הטוקן ב-`posts.tags` בלבד** (מקור-האמת ל-feed eligibility). נוכחותו ב-`posts.categories` היא **transitional/legacy-compatibility בלבד — ואינה חלק מחוזה-Series.** ⛔ **אין לקבוע כלל המחייב Series להיכתב גם כ-Category.**
- **representable → אין-צורך בשדה-`series` כעת:** `getDimensionFiveVideos({tag:"מימד חמש"})` משתמש בטוקן-התג כסמן-Series.
- **EXTENSION POINT (לא-בונים עכשיו):** אם/כאשר יידרש Series-אמיתי חוצה-מדיה עם metadata (עונה/סדר/hero) — שדה/טבלת-Series ייעודי. עד אז: **התג ב-`tags` הוא ה-Series-marker הקנוני היחיד.**
- Category≠Series — לא להסתמך על נוכחות «מימד חמש» ב-`categories` כאילו היא category-תמטי; היא compat-שריד בלבד.

---

## 6. TAXONOMY UI ≠ IDENTITY (Decisions #6, #7) + Category Icons

- **`רמזים חזקים` — לא-מוגבל-לפי-כותב (Decision #6):** קטגוריה/בחירת-עריכה ברף-גבוה. ZURIEL=Human-Gate ורשאי לשייך גם תוכן של יוצר-חיצוני. **מבטל את הקונבנציה הישנה «צוריאל-בלבד»** (DRIFT-1 מהדוח הקודם — **RESOLVED ע"י ZURIEL**).
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
| Dedicated `series` field/table | **EXTENSION POINT** | representable-via-tag היום; לבנות רק כשיידרש metadata |
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
