# 🌌 SOD1820 — מפת-הארכיטקטורה הגדולה (רזיאל · רמזים · שמות↔שנים↔אירועים↔ממצאים · מסע-החיים)
> **READ-ONLY סינתזה — לא WRITE, לא DB, לא נעילת-חוזה.** נאסף מ-Master State (§10–§14) · חוקי-`nodes` נעולים · `project_codex` · סכמת-DB חיה (14.8.2026).
> **מטרה:** לראות **מה כבר תוכנן** לפני שנועלים «Finding Identity» — כדי להרחיב את הקיים ולא להמציא מנגנון מקביל.

---

## 0 · שורש התשובה (הכי חשוב) — Finding Identity **כבר קיימת**: `research_objects`
> **⚠️ המסקנה שעוצרת נעילה מוקדמת מדי:** אין להמציא «Finding» חדש. הזהות-הקנונית-של-ממצא **כבר מוגדרת בסכמה** — טבלת **`research_objects`**:
```
id · kind · statement · terms · value · relates · source · source_ref · contributor ·
confidence · engine_verified · engine_detail · evidence · status · promoted_node_id ·
parent_id · meta · owner_person_id · privacy_scope
```
**מיפוי מלא של מה שבנינו החודש (Field Package / compound) אל הקיים:**
| מה הגדרנו החודש | היכן זה כבר חי ב-`research_objects` |
|---|---|
| expression × method × value | `terms` + `value` + `evidence` (שיטה-לכל-ראיה, לפי `convergence_evidence_law`) |
| relation (sum/equality/chain) | `kind` |
| compound (703+61=764, רכיבים) | `parent_id` (קינון!) — רכיבים = research_objects ילדים |
| claim ≠ verified ≠ fact | `status` + `engine_verified` + `confidence` + `evidence_level`(0-4) |
| arithmetic-verification ≠ gematria | `engine_verified`/`engine_detail` (מפרידים סוג-אימות ב-`evidence`) |
| source / provenance | `source` + `source_ref` + `contributor` |
| interpretation (isFact:false) | שכבה-נפרדת — **לא** ב-research_objects (ראה §5) |
| person / משפחה | `owner_person_id` + `privacy_scope` |
| קידום לקנוני | `status` → `promoted_node_id` (הפיכה ל-node בגרף) |
| Human-Gate | טבלת-נלווית `research_candidates` (recommendation/confidence/evidence_refs/rules_snapshot/**decision_id**/decided_at) |

**⇒ Field Package/compound = read-model (עדשה) מעל `research_objects`; לא מודל-ממצא חדש.** (מצב-נוכחי: הסכמה קיימת ומעוצבת, אך הצנרת מאכלסת אותה חלקית — `fn_persist_discovery` (H-1) כותב מועמדים; רוב ה-edge-functions עדיין לא כותבים. זה **חיווט**, לא חוזה חדש.)

---

## 1 · העץ-האחד = השורש (`unified_graph_law`) — שמות↔שנים↔אירועים↔ממצאים
כל דבר = `node`, כל קשר = `edge`, כל דף = עדשה. הצמתים החיים היום:
`entity`(710 · שמות) · `number`(2121) · `year`(12) · `event`(120) · `convergence`(219) · `phrase`/`word` · `image`(2020) · `post`(304) · `els`(5) · `language_bridge`(13).
- **שמות↔שנים↔אירועים↔ממצאים = edges על העץ הזה.** לא מנגנון נפרד — הצלבה היא node (`convergence`), אירוע הוא node (`event`), שנה היא node (`year`), וממצא (`research_object`) מקושר דרך `relates` + מקודם ל-node דרך `promoted_node_id`.
- **ציר-הזמן** (`RevelationAxis` / «ציר ההתגלות», מחליף «מסע התדר»): עובדה (`all_values`) מול עוגני-התגלות (`is_revelation_anchor`) מול VIEW — **הוחלט לא לנעול טבלת-מסע עד שנראה תחנות אמיתיות** (`teder_journey_three_layers`). *(אותה זהירות שאתה מבקש עכשיו — כבר חוק.)*

## 2 · שכבת-הראיה (Claim/Evidence/Fact) — **כבר מוגדרת, אל תמציא enum חדש**
- **`evidence_level` (0-4):** רעיון → השערה → נתמך-חלקית → מאומת-חישובית → מאומת-חישובית+מקורות.
- **`name_evidence_levels_law`:** direct (הופעה/גימטריה/אנגרמה-מאומתת) · value_match (אותו ערך — **לא הוכחת-קשר**) · interpretive (חיבור פרשני של מטטרון/AI).
- **`convergence_evidence_law`:** כל התכנסות מציגה **רשימת-ראיות + שיטה-לכל-ראיה** + מונה-עוצמה («5 ראיות»). «ראיה, לא סיסמה».
- **⇒ ה-claim/verified/fact שלנו = בדיוק המדרג הזה.** «Field Package known/verified/claimed» חייב למפות ל-`evidence_level`/`engine_verified`/direct-value-interpretive — לא סטטוס-חדש.

## 3 · רזיאל / Research Context — **מנוע-מחקר, לא מנוע-תשובות** (`research_engine_law`)
- **מחזור-החיים של כל שאלה** (`raziel_mind_architecture`): `שאלה → Research Plan → Metatron Context → Tools → Reasoning → Answer → Memory`.
- **Research Plan (הלב · טבלת `research_plans`):** קלט=שאלה+זהות+ערוץ → פלט `{strategy, anchors_needed[], tools_needed[], check_order[], plan_confidence}`. Strategy ∈ Number/Name/Comparison/Discovery/Personal/Contribution. שני-מעברים (מקס' 2). לולאת-למידה (`plan_v1/v2/changed/final_confidence`).
- **Metatron Contract (API של המוח):** מקבל Research Plan → מחזיר `{intent, strategy, anchors[], facts[], graph[], research[], memory, active_laws[], definitions[], confidence, provenance, suggestions[]}`.
- **רזיאל = שכבת-מחקר קבועה** (`raziel_companion_layer_law`): 3 שכבות — בית-קבוע («רזיאל – סוכן המחקר שלי») · נוכחות-בכל-דף (**ההקשר מהדף, לא מהמשתמש**) · לוויין-חיים. קול-אחד בכל ערוץ (`raziel_voice_law`); ניתוב-חוזה-קשיח question→intent→expert→scoped→cross_check→synthesis + Trace (`raziel_routing_law`); פרסונה+חוקים ממקור-DB יחיד (`unified_ai_brain_law`, `fn_raziel_persona`); 20%-מודל/80%-הקשר+כלים (`bot_experience_architecture_law`); מטטרון = מוח-על, לעולם-לא-שתיקה (`never_silent_metatron_law`).
- **⇒ «Research Context» שלנו כבר קיים = `research_plans` + Metatron Context.** Information Request (P1) = feeder לתוך אותו Research Context, לא מנגנון חדש.

## 4 · מסע-המשפחה / מסע-החיים — **מוגדר, ובכוונה לא-נעול**
- **זהות:** `persons`/`person_state` (`owner_person_id`, `loyalty_tier`, `channels`, `is_identified`) → ממצא מקושר-לאדם דרך `research_objects.owner_person_id` + `privacy_scope`. **המשפחה/החיים = persons + findings-שלהם על העץ.**
- **מסע נוצר אחרי גילוי** (`metatron_discovery_before_journey_law`): `מספר → הצלבות → AI-חוקר → תובנה → מסע-אישי → זיכרון`. לא «צור מסע» כפעולה-ראשונה.
- **מבנה-המסע לא-נעול** (`teder_journey_three_layers`): לא לקבע טבלה עד שנראה תחנות אמיתיות. *(עקרון-זהירות תואם לבקשתך.)*
- **⇒ «מסע-החיים למשפחה» = עדשת-persons על העץ + ציר-ההתגלות + זיכרון-רזיאל.** לא טבלת-מסע חדשה כרגע.

## 5 · קנוני מול פרשנות — הגבול החקוק
- **FACT / קנוני:** `engine_verified=true` + `evidence`/`evidence_level≥3` → `status` → `promoted_node_id` (node בגרף). זו האמת-הניתנת-לשחזור.
- **פרשנות (Interpretation):** שכבה **נפרדת** (`isFact:false`) — direct≠value_match≠**interpretive**; AI מפריד עובדה-מפרשנות (`ai_analyze_contract`, `raziel_voice_law` «עובדה ✅ ≠ פרשנות ✦»). **לא נכנסת ל-research_objects כ-Fact.**
- **⇒ בדיוק ה-`claim ≠ Fact ≠ interpretation isFact:false` שלנו — כבר חוק-מערכת.**

## 6 · Growth OS — שכבת-ההפצה (concern נפרד, לא ממצא)
`growth_os_vision` (Meta Growth OS · 6 שכבות · לולאת-צמיחה אוטונומית) = **הפצה/מדידה/צמיחה**, נפרד לגמרי מזהות-הממצא. לא מתערבב עם Finding Identity. (סטטוס: חלקי, ראה work_log «Meta Growth OS».)

---

## 🎯 הכרעה — האם «Finding Identity» מתאים לתוכנית הגדולה, או נועלים מוקדם מדי?
**התשובה: אל תנעל חוזה-ממצא חדש. הזהות כבר קיימת = `research_objects` (+ `research_candidates` להחלטה). מרחיבים אותה — לא ממציאים.**

- **✅ מה שבנינו נכון ותואם:** expression×method×value · compound(parent_id) · claim/verified/fact(evidence_level) · provenance(source/source_ref) · Human-Gate(research_candidates) · interpretation-נפרד. **כולם כבר יש להם בית בסכמה הקיימת.**
- **⚠️ הסכנה המדויקת (למנוע):** לקבע את `projectCompoundFinding` (fieldpackage.js) כ**חוזה-ממצא קנוני** = מודל-מקביל ל-`research_objects` → הפרה של `unified_graph_law`. ה-read-model הוא **עדשת-תצוגה**, לא מקור-האמת.
- **הרחבה-לא-המצאה (הכיוון):**
  1. Field Package/compound = **עדשה מעל `research_objects`** (statement/terms/value/kind/parent_id/evidence/source/owner_person_id) — לא טבלה/מודל חדש.
  2. GAP-3 display (O2) יתנסח מחדש: «האם Field Package מרנדר `research_objects`» — הזהות = research_objects.
  3. claim/verified → למפות ל-`evidence_level`/`engine_verified`/direct-value-interpretive (לא enum חדש).
  4. Information Request (P1) = feeder ל-`research_plans`/Research Context הקיים.
  5. person/משפחה → `owner_person_id`+`privacy_scope`; מסע → ציר-ההתגלות (לא-נעול).
- **⛔ מה שעדיין לא-נעול בכוונה (וכך צריך להישאר):** מבנה-מסע (`teder_journey`) · ספי «צומת-חזק»/«קשר-משמעותי» (convergence_navigation_contract) · הפעלת-רזיאל-outward. **לא לנעול עד שנראה שימוש אמיתי.**

## 📌 שורה-תחתונה
התוכנית הגדולה **כבר פתרה** את זהות-הממצא (`research_objects`), שכבת-הראיה (`evidence_level`/evidence-per-method), הקשר-המחקר (`research_plans`+Metatron), הזהות (`persons`), והעץ-האחד. **מה שבנינו החודש הוא שכבת-תצוגה-וניווט תקינה מעליהם — כל עוד נמפה אותה ל-`research_objects` ולא נכריז עליה כחוזה-ממצא חדש.** לפני כל WRITE הבא: המיפוי הזה קודם, ורק אז קוד.
