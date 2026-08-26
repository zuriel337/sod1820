# 📐 SOD1820 — CONTENT FOUNDATION CONTRACT v1

> **מטרה:** לסגור חוזה-Foundation **מינימלי, מדויק וניתן-להרחבה** למימד-חמש + Content Taxonomy + Media/Representation + Multilingual Video — כך שנוכל להמשיך ל-Posts Program **בלי redesign / migration / identity-break**.
>
> **סטטוס:** `DRAFT — FOUNDATION-CLOSED, AWAITING GPT/ZURIEL REVIEW`. ענף-בלבד, **לא-מוזג, לא-פרוס**. שום כלל לא נכתב ל-`nodes`/`project_codex` (אין auto-canonicalization). ה-canonicalization ל-DB יבוצע **אחרי** אישור-review (ר' §8).
>
> **Human-Gate:** כל 8 ההחלטות למטה = **מאושרות ע"י ZURIEL** (הבקשה שסגרה אותן). החוזה מקבע אותן; אינו ממציא חדשות.

---

## 0. LIVE_SYNC_TOKEN

```
timestamp        = 2026-08-26 (session)
origin_main_sha  = 3351bac9   (== local HEAD, clean tree)
branch           = claude/content-foundation-contract  (off origin/main)
supabase_project = linswmnnkjxvweumprav  (canonical)
work_log_cutoff  = collision-check on content/dim5/posts = NONE in-progress
roadmap_version  = MASTER_ROADMAP v5.3 (25.8.2026)  — no Content/Posts workstream
master_state_ref = §10–12 (posts = corpus/source + publish-target)
schema_verified  = video_transcripts + posts columns read live (§2)
```

**Parallel-Agent note:** `work_log` האחרון נשלט ע"י workstream-מחקר מקביל (Zvi/Corpus/Shared-Extraction). **תחום נפרד** — אין WRITE חופף על תוכן/dim5/posts (collision-check=NONE). ⚠️ לכן חוזה זה **אינו** נוגע ב-`SOD1820_MASTER_ROADMAP.md` בפועל (אותו workstream עורך אותו כעת) — עוגן-המפה מוצע כאן כ-ready-to-insert בלבד (§9), למניעת SSOT-collision.

---

## 1. THE MODEL — ארבעה צירים אורתוגונליים + זהות אחת

**חוק-על (Decision #5 — Taxonomy Separation):** ארבעה מושגים **נפרדים**, אסור לערבב באותו שדה/חוק:

| ציר | דוגמה | הגדרה | ייצוג חי היום |
|---|---|---|---|
| **Series / Content Stream** | «מימד חמש» | סדרת-תוכן חוצת-מדיה. **לא סוג-מדיה.** | טוקן `מימד חמש` ב-`posts.tags` (וגם `categories`) — ר' §5 |
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

היום «מימד חמש» חי כטוקן ב-`posts.tags` **וגם** `posts.categories`. **זהו מיזוג-שדות** (Series בתוך אותו array של Category) — Decision #5 שולל מיזוג-מושגי, אך:
- **ייצוג-הביניים מתקבל:** `getDimensionFiveVideos({tag:"מימד חמש"})` משתמש בטוקן-התג כסמן-Series. **representable → אין-צורך בשדה-`series` כעת.**
- **EXTENSION POINT (לא-בונים עכשיו):** אם/כאשר יידרש Series-אמיתי חוצה-מדיה עם metadata (עונה/סדר/hero) — שדה/טבלת-Series ייעודי. עד אז: **התג הוא ה-Series-marker הקנוני.**
- **חוק-קבוע:** Series-marker נכתב **גם ב-tags** (מקור-האמת לפיד). Category≠Series — לא להסתמך על נוכחות «מימד חמש» ב-categories כאילו היא category-תמטי.

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

## 8. CANONICALIZATION PLAN — ready-to-apply (⚠️ לא-בוצע; post-review בלבד)

> אין auto-canonicalization. הדלתאות למטה **מוצעות** ל-`nodes`/`project_codex` — יוחלו **רק** אחרי אישור GPT/ZURIEL. כולן **הרחבה-אדיטיבית** (rule_versioning), אפס-מחיקה.

1. **`dim5_upload_law`** (bump v1→v2, additive): להוסיף — «‹מימד חמש› = **Series** חוצת-מדיה, לא medium; eligibility-לפיד לפי-תג; **אין חובת ‹וידאו›** כשהפריט אינו-וידאו; medium-resolver (video/photo) קובע rendering».
2. **`content_translation_law`** + **`video_transcription_law`** (הבהרה, ללא-bump-נדרש): לעגן את מיפוי `source_language = is_original`; binding לפי `video_key`; כללי-מקור (§3). **בלי מנגנון מקביל.**
3. **`canonical_ui_components_law`** (bump, additive): «Category-Icon/Badge = רכיב-תצוגה קנוני, ליד-הכותרת, לחיץ-לקטגוריה, **לא על התמונה**, **אינו Identity**».
4. **`post_gematria_box_law`** / **`ai_gematria_verified_stamp_law`** (הבהרה): variant «System-Addition על פוסט-כותב-חיצוני» → מובחן + `posts.ai_addition`.
5. **`project_codex.publishing_conventions`** (עדכון-טקסט): (א) הסרת «רמזים-חזקים = צוריאל-בלבד» → «בחירת-עריכה ברף-גבוה, לא-מוגבלת-כותב, Human-Gate=ZURIEL». (ב) הוספת דפוס «יוצר-חיצוני \| שם» + attribution-למדיה-חיצונית. (ג) הפניה לחוזה זה.
6. **`project_codex` חדש** (אופציה — אם ה-review יבחר בית-ייעודי): slug `content_foundation_contract` = תקציר §1–§7 (תואם דפוס `person_foundation_contract`/`research_intake_foundation_contract` הקיים).

---

## 9. ROADMAP DELTA — ready-to-insert (⚠️ לא-הוחל על הקובץ)

הבוטסטראפ מאשר: **ל-`SOD1820_MASTER_ROADMAP.md` אין עוגן ל-Content/Posts.** מוצע להוסיף **workstream-אחד בלבד** (navigation, לא-מחסן-חוקים) — להכנסה ע"י בעל-המפה (למניעת collision עם workstream-המחקר הפעיל):

```
### WS-CONTENT-PUBLISHING-FOUNDATION — יסוד תוכן/פרסום (Foundation)  [OPEN-HUMAN-GATE]
- Scope: Content Identity · Series/Category/Medium/Representation separation · media binding · multilingual-video binding.
- מקור-אמת: SOD1820_CONTENT_FOUNDATION_CONTRACT.md + מאגר-חוקי-הפוסט ב-nodes + project_codex.publishing_conventions.
- אין להכניס את חוקי-הפרסום למפה — הפניה בלבד.
- Open-threads: image+audio content-type (EXT) · multilingual-non-video (EXT) · content-safety-policy (Human-Gate) · Post↔Reality-Graph parser (LATER, Master State §12.4).
```

---

## 10. OUT OF SCOPE (מקובע — לא-נבנה)

⛔ Posts Research Extraction · parser-חדש-לפוסטים · Research-store-חדש · UI/feed redesign · content-system-מקביל · auto-canonicalization/publication · merge/deploy. עתיד: `Post/Transcript/OCR/Source → Shared-Extraction → Verification → Research-OS` (workstream נפרד).

---

## 11. VERIFICATION — ר' דוח-הסשן (§G). כולם ✅ concept/code/live, build ירוק, אפס-regression.
