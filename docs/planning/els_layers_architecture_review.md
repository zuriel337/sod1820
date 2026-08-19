# 🔬 Architecture Review — research_objects ↔ research_contributions ↔ ELS (READ-ONLY · 14.8.2026)
> ❌ אין WRITE · אין טבלה/מנגנון חדש · אין נעילה. נאסף מסכמת-DB חיה + Master State §11/§12 + חוקי-nodes.
> **מתקן חידוד קודם:** ב-`grand_architecture_map.md` כתבתי «Finding Identity = research_objects». הביקורת הזו **מדייקת**: זו לא טבלה-אחת — יש **שתי שכבות-ממצא לפי מקור** (מנוע מול ציבור/אדם), שמתאחדות רק ב**גרף** וב**שער**.

---

## FACT — מה נמדד בפועל
- **`research_objects` (121 · SERVER-ONLY · כולם `candidate` · 0 promoted):** `kind·statement·terms·value·relates·source·source_ref·contributor·confidence·engine_verified·engine_detail·evidence·status·promoted_node_id·parent_id·owner_person_id·privacy_scope`. **אין GRANT ל-anon/authenticated** (server-only, מאושש). מנוע-מונע (fn_persist_discovery/H-1). `promoted_node_id` **קיים בסכמה אך 0 שימוש** — קידום-observation **לא-מחווט**.
- **`research_contributions` (369 · PUBLIC read anon+authenticated):** `author_*·intent·origin·research_state·status·target_type·target_id·parent_id·title·body·gematria_claim·projected_insight_id·reactions·graph_node_id·pinned_at·is_featured·convergence_slug·is_answer·reaction_boosts`. שכבה **ציבורית/אנושית/דיונית** עם ייחוס, ריאקציות, threading, ולייף-סייקל משלה.
  - lifecycle משלה: `research_state` raw(41)→idea(54)→discussion(24)→investigating(1)→validated(35)→published(214).
  - Human-Gate משלה: `status` pending(1)→approved(45)/hidden(58)/published(265).
  - **קידום-לגרף עובד:** `graph_node_id`+`projected_insight_id` מאוכלסים — intent=`חידוש`(51 · **15 promoted · 16 insights**) + `תצפית`(3 · **3 promoted · 3 insights**). ⇒ ~18 קודמו לגרף בפועל.
  - **ELS חי כאן:** `origin=els`(26) · `target_type=els`(27). (מקורות נוספים: whatsapp_group 80 · auto-post 120 · number 25 · post 22 · forum/beit_midrash/broadcast.)
- **`research_candidates` (41 · subject_type=number · status decided/dismissed/pending):** `candidate_type·subject_type·subject_ref·node_id·recommendation·confidence·why·evidence_refs·rules_snapshot·**decision_id·decided_at**`. שכבת-**החלטה** (שופט) נפרדת, מעל מספרים.
- **Master State §12.4 מתעד:** «שני-שערי-שיפוט לאיחוד» — כלומר ריבוי-שערים **כבר מזוהה** כפער.

## INFERENCE — מה זה אומר (נגזר, לא-עובדה-נמדדת)
- **אלה שתי שכבות שונות בכוונה — לא כפילות-שגיאה:**
  - **`research_contributions` = שכבת-הקלט-הציבורית/האנושית + הקרנה-לגרף.** «front-of-house»: מה שאדם/קורפוס תורם, נדון, ומקודם לגרף-הציבורי. ELS, פורום, וואטסאפ, פוסטים = תרומות/תצפיות כאן. **חי, מגודר, ומקדם.**
  - **`research_objects` = שכבת-לדג׳ר-המנוע-הדטרמיניסטי.** «back-of-house»: מה שמנוע-הגילויים חישב כמועמד-מאומת-מנוע, server-only, ממתין-לשער. **קיים, לא-מקדם, לא-ציבורי.**
- **החפיפה האמיתית = נקודת-הקידום + השער**, לא הטבלאות: לשתיהן שדה-קידום-לגרף (`graph_node_id` מול `promoted_node_id`) — ואחת מגודרת-ועובדת, השנייה לא. הסיכון: **שני מסלולי-קידום ⇒ אולי שני Human-Gates** (בדיוק §12.4).
- **מיפוי לעקרון §11.19 («שער-אחד ≠ מקור-אמת-אחד»):** שתי השכבות = **שני מקורות** מתוך ~16 שהמפקדה מרכזת. המקורות **נשארים נפרדים בכוונה**; האיחוד הוא ב**שער** וב**גרף**, לא בטבלה.
- **חיבור לתמונה הגדולה:** שתיהן = feeders ל**עץ-אחד** (nodes+edges). Family/Life-Journey = `persons`+`owner_person_id` וחיבוריהם על-הציר (years/events). Hints/רמזים = reality_stream/גלריות + `research_contributions`. Raziel/Research Context = `research_plans`+Metatron הקוראים את **שתי** השכבות + הגרף. Center-Control = השער-האחד מעל **כל** ה-feeders.
- **ELS מטבעו = תרומה, לא אובייקט-מנוע:** ELS הוא תצפית שאדם מצא בכלי, עם ייחוס+דיון+קידום → מתאים ל-`research_contributions`. `research_objects` הוא ל**גילויי-מנוע דטרמיניסטיים** — ELS אינו כזה.

## RECOMMENDATION
- **אל תעביר ELS ל-`research_objects`.** הוא כבר חי, מגודר ומקדם ב-`research_contributions` — העברה תשבור מקור-עובד ותאבד ייחוס/דיון/קידום.
- **אל תאחד את הטבלאות.** הן שתי שכבות-מקור מכוונות (ציבורי/אנושי מול מנוע/דטרמיניסטי). האיחוד הנכון = **שער-אחד + גרף-אחד**, לא מיזוג-טבלה.
- **ההחלטה הנכונה = להגדיר את היחס במפורש**, לא לאחד:
  - `research_contributions` = feeder ציבורי/אנושי (עם השער והקידום שלו).
  - `research_objects` = feeder מנוע-דטרמיניסטי (קידום טרם-מחווט).
  - כשתרומה ניתנת-לאימות-מנוע → **קישור** (`relates`/evidence) ל-research_object, **לא העברה**.
- **ה-4 עקרונות — מצב:**
  - **one engine** ✅ (`gematria_methods`/`fn_gematria_pack`; `gematria_claim` צריך להיבדק ע״י המנוע — POST-CONTENT≠TRUTH).
  - **one graph** ✅ nodes+edges — אבל **שני שדות-קידום** מזינים אותו ⇒ צריך dedup, לא גרף-שני.
  - **one Research Context** ⚠️ `research_plans`+Metatron צריכים לקרוא **את שתי** השכבות (היום מפוזר).
  - **one Human-Gate** ⚠️ **הפער האמיתי:** ל-contributions שער-משלה (עובד), ל-research_candidates שער-החלטה נפרד, ל-research_objects אין-שער-מחווט → §12.4 «שני-שערי-שיפוט לאיחוד».

## OPEN DECISIONS (לצוריאל — לא-מוכרעות)
- **OD-1** מהו ה-Human-Gate הקנוני-היחיד, ואיך **שתי** השכבות מקדמות דרכו (איחוד §12.4)?
- **OD-2** יחס contributions↔objects: קישור (`relates`/evidence) בלבד, או שיקוף-דו-כיווני (תרומה-מאומתת-מנוע יוצרת research_object מקושר)?
- **OD-3** האם `research_objects.promoted_node_id` מקדם דרך **אותו** שער/גרף כמו `graph_node_id` (dedup משותף), או נשאר נפרד?
- **OD-4** האם «Finding Identity» מוגדר-על שתי-השכבות (view מאוחד לקריאה) או נשאר שתי-רשומות-נפרדות המקושרות בגרף?

## ⛔ מה אסור לנו לבנות עדיין
- ❌ **לא** להעביר ELS ל-`research_objects`.
- ❌ **לא** לאחד/למזג את שתי הטבלאות.
- ❌ **לא** לחווט מסלול-קידום שני / Human-Gate שני (מחמיר את §12.4).
- ❌ **לא** להגדיר טבלה/מנגנון/view-מאוחד חדש לפני OD-1..OD-4.
- ❌ **לא** לקבע את Field Package/compound כחוזה-ממצא קנוני מקביל (מהביקורת הקודמת).

## 🚪 ה-Decision Gate הבא
**להכריע OD-1 קודם: «מהו ה-Human-Gate הקנוני היחיד, ומה מקדם דרכו».** רק אחרי שיוגדר שער-אחד + גרף-אחד-עם-dedup — אפשר להחליט על יחס contributions↔objects (OD-2/3) ועל ELS. **בלי ה-Gate הזה, כל מהלך על ELS/objects = חיווט שער-שני עיוור.** לפני כל WRITE: להכריע את OD-1, ואז למפות (לא לבנות).
