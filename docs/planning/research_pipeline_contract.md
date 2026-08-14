# 🔗 חוזה ה-Pipeline המחקרי — Information Request · Field Package · Raziel · Field Layer

> **הרחבה ל-`status_governance_contract.md`.** מעמד: Design בלבד לאישור-צוריאל. ❌ אין WRITE · ❌ אין migration · ❌ אין UI · ❌ אין App · ❌ אין automation · ❌ אין notifications · ❌ אין AI-agent חדש · ❌ אין schema אם אין צורך ממשי. actor=CLAUDE.
> **מטרה:** להגדיר **Pipeline אחד** מעל primitives **קיימים** — לא מערכת חדשה. כל שלב = adapter/read-model מעל מבנה שכבר קיים, אלא-אם באמת חסר.

## ה-Pipeline (שרשרת אחת)
```
Research Context → Missing Info / Next Action → Field Package (מועמד)
   → Information Request → Human-Gate → Raziel → WhatsApp
   → Human Response → RAW Source → Extraction / Verification → Research Context (עדכון)
```
**חוק-על:** אף שלב לא הופך Claim→Fact, לא מקדם Canonical, לא מפרסם, בלי שער-אנושי. הזמן/התאריך = **operational context** בלבד («מה נכון לעשות עכשיו») — לעולם לא טענה-מחקרית.

---

## 🗺️ מפת ה-reuse — מה כבר קיים לכל שלב (אומת מול הסכמה החיה 14.8.2026)

| שלב ב-Pipeline | Primitive קיים | מה חסר (Gap) |
|---|---|---|
| **1 · Research Context** | `research_items` (הפריט) · `research_plans` (`ask, strategy, anchors, confidence`) · `persons`+`person_state` (`channels, loyalty_tier, is_identified, primary_app_context`) · הפריט-הפעיל ב-WarRoom | — (קיים) |
| **2 · Missing Info / Next Action** | `whatMissing` + `actionState` (`ccwork.js`) — **כבר בנוי** | — (קיים) |
| **3 · Field Package** (מועמד) | מקורות-הרכבה: `fn_gematria_pack(phrase)` (methods/cross/convergence/verses/decompose · 0 tokens) · `bidim` · `convergences` · `fn_miluy_letter` · שכבת-הציר · `gallery_images` (תמונה+ocr+occurred_at) · `person_state` | **G3:** אין read-model שמרכיב לפי *אדם+ממצא+מה-חסר+שפה+ערוץ* (רק לפי phrase) |
| **4 · Information Request** | `*_research_questions` (amit/christina/yiska: `question_text, category, asked_at, his_answer, answered_at, open_thread`) = בקשת-מידע-לאדם + תשובה, **אך per-person siloed** · `owner_note_requests` (נכנס: number/name/contact/message/status) | **G1:** אין abstraction אחיד, מקושר-לממצא, חוצה-אנשים |
| **5 · Human-Gate** | `research_candidates` (`recommendation, confidence, why, evidence_refs, rules_snapshot, status, decision_id, decided_at`) = מועמד→החלטה מלא | — (קיים, לשימוש-חוזר) |
| **6 · Raziel** | `raziel_brain` (persona/context) · `raziel_config`/`raziel_dm_policy` (מדיניות-שליחה) · `raziel_protocol_allowed_fns` = **רק** `fn_gematria_pack, fn_all_methods, fn_els_search` · `raziel_send_claims` (`done_key` = אידמפוטנטיות) · `raziel_quota` · `raziel_execution_flags` (`enabled`, `test_visitor_id`) · edge `fn_raziel_answer` (deterministic-first, **flag OFF**) | **G5:** רזיאל **כבוי** (`enabled=false`) — הפעלה = החלטת-אדם |
| **7 · WhatsApp** | Green API · `wa-webhook/wa-process/wa-poll` · `wa_vip_senders` · `wa_bot_config` · `wa_publish_log` · `wa_message_status` | — (קיים) |
| **8 · Human Response → RAW** | `wa_vip_inbox` (`text_raw, numbers, phrases, lang, sender, sender_name, status`) = הודעה-נכנסת **כבר מפורקת ל-RAW** · `wa_deep_queue` (`raw_text, phrase, status, processed_at`) | **G4:** אין timezone מפורש על אירוע-RAW (רק `created_at`) |
| **9 · Extraction / Verification** | `analysisFlow.js` (חילוץ) → `fn_gematria_pack`/מנוע (אימות) → Human-Gate (`research_candidates`) | — (קיים) |
| **10 · Context update** | `research_items` update · edges בגרף (רק מאושר) | — (קיים) |

**מסקנת-רוחב:** ל-8 מ-10 השלבים יש primitive קיים ומלא. הפערים האמיתיים (G1–G5) הם **חיבור/read-model**, לא מנוע/טבלה חדשה.

---

## 1 · Information Request — הגדרה (מעל הקיים)
בקשת-מידע = פעולה מחקרית מקושרת לממצא/אדם/מקור. **אינה Fact, אינה משנה Governance.** השדות (תיאור-תכנון — נשען על תבנית `*_research_questions` הקיימת + `owner_note_requests`):
`מה-חסר (missingKind מ-whatMissing) · למה-נדרש · ממי (person_id) · איזה-ממצא-ביקש (research_items.entity_ref) · Field-Package-מסייע · שפה · ערוץ · status(draft/pending/sent/answered/verified/cancelled) · provenance`.
- **⛔ לא טבלה חדשה:** התבנית כבר קיימת ב-`*_research_questions` (אבל siloed per-person = anti-pattern). **החוזה:** להגדיר **shape אחיד** (type/read-model) שמאחד את התבנית; אם נדרש store — `research_items` `bucket='info_request'`, `entity_ref`=הממצא, `metadata`=שדות-הבקשה. **לא לשכפל N טבלאות-per-person.**
- `status` = מצב-הבקשה בלבד; **אינו** ציר-הממצא (Governance) ואינו `handled` (תור-אישי).

## 2 · Field Package — read-model/assembly (לא מנוע)
**⛔ אין מערכת Field-Map מקבילה.** Field Package = **הרכבה-על-קריאה** של מקורות קיימים לפי Context, שיכולה בעתיד לכלול: מספרים+שיטות · bridges/convergences · מילוי · ציר-זמן · מקורות · תמונות · שאלות · הסבר · קישורים · שפה.
- **הבסיס כבר קיים:** `fn_gematria_pack` מרכיב את רוב-זה לפי phrase; רזיאל כבר מורשה לקרוא לו (`allowed_fns`). הפער (G3) = הרכבה לפי *אדם+ממצא+מה-חסר+ערוץ*, לא רק phrase.
- **אותו מקור, גרסאות-תצוגה שונות:** Command-Center / Raziel-context / WhatsApp / public / premium = **projections** של אותו read-model, לא עותקים. `raziel_brain.addon_wa`/`addon_site` כבר מדגים גרסאות-context שונות מאותו core.
- **Field Package ≠ Fact.** היא תצוגת-ההצלבות שנמצאו — לא «מסר מהיקום».

## 3 · Context-driven selection — הצעה, לא שליחה
Field Package **לא נשלחת אוטומטית.** המערכת מציעה: `🎯 הצעה: שלח Field Package X + בקש Y`. הבחירה יכולה להישען על: האדם (`person_state`) · הממצא-הפעיל · מה-חסר (`whatMissing`) · מקורות-זמינים · שפה (`wa_vip_inbox.lang`) · ערוץ (`persons.primary_channel`) · זמן-נוכחי כ-**operational context**.
- **⛔ אין להסיק משמעות-מחקרית מהשעה/תאריך** רק כי הם context.

## 4 · Raziel — שכבת-תקשורת/ניסוח בלבד (קיימת, לא נבנית)
רזיאל מקבל Context מובנה (אדם + מטרה + ממצא + מה-חסר + חומר + שפה + ערוץ) ומנסח/משוחח. **אינו מחליט מה-חסר, אינו מקדם Canonical, אינו מפרסם.**
- **הכל כבר קיים:** persona (`raziel_brain`), מדיניות (`raziel_dm_policy`), fns-מורשות (`raziel_protocol_allowed_fns` — read-only-מחקר בלבד), אידמפוטנטיות (`raziel_send_claims.done_key`), מכסה (`raziel_quota`), מתג (`raziel_execution_flags.enabled` = **כבוי**). **לא לבנות מנוע-רזיאל חדש** — לחבר Context אליו.

## 5 · Human-Gate — כל פעולה outward דורשת אישור-צוריאל
במיוחד: בחירת-Field-Package · מה-מבקשים · ניסוח-ההודעה · שליחה. **מנגנון קיים:** `research_candidates` (מועמד→`decision_id`/`decided_at`). כל שליחת-רזיאל = מאחורי שער; `enabled=false` הוא ברירת-המחדל הבטוחה.

## 6 · תשובת-האדם → RAW תמיד
תשובה נשמרת **תמיד** כ-RAW (`wa_vip_inbox.text_raw` + `numbers/phrases/lang` שכבר מפורקים). **אין הפיכה אוטומטית ל-Fact.** המסלול: `RAW → extraction (analysisFlow) → engine verification (fn_gematria_pack) → Human-Gate (research_candidates)`.

## 7 · זמן — operational context בלבד
מותר «מה נכון לעשות עכשיו». **אסור** להפוך זמן כשלעצמו לטענה-מחקרית. (הבחנה זהה ל-`reality_stream_law`: `occurred_at` = ציר-תצוגה, לא משמעות.)

## 8 · Architecture rule (נאכף)
❌ אין טבלת `conversations` חדשה (יש `wa_vip_inbox`+`wa_deep_queue`) · ❌ אין מנוע Field-Map חדש (read-model מעל `fn_gematria_pack`/`bidim`/`convergences`) · ❌ אין מנוע-Raziel חדש (`raziel_*`+`fn_raziel_answer`) · ❌ אין שכפול-מקור (RAW נשאר ב-`wa_vip_inbox`/`research_items`). קודם primitives, ואז read-model/adapter **רק אם באמת חסר**.

---

## 🌱 Future Field Layer — Foundation Only (תאימות-עתיד בלבד)
**אין לבנות עכשיו אפליקציית Field-Map ואין מערכת-רוחנית חדשה.** רק לוודא שהשכבה **ניתנת-להרכבה בעתיד** מהקיים.
- **Field Event = RAW event של אדם:** מספר/מילה/שעה/תאריך/תמונה/טקסט/אירוע + `timestamp, מקור, timezone, provenance`.
  - **נשען מלא על הקיים:** `wa_vip_inbox` כבר נושא (`sender, numbers, phrases, lang, text_raw, created_at`) = כמעט-כל-אירוע-שדה · `gallery_images` (תמונה+ocr+`occurred_at`) = אירועי-שדה-תמונה כבר קיימים · `research_items.metadata` (jsonb, provenance) · `persons`/`person_state` (זהות/ערוצים). **הפער היחיד (G4):** `timezone` מפורש — נכנס ל-`metadata`, **בלי schema חדש.**
- **המסלול העתידי:** אירוע → מנועים-קיימים (`bidim`/`fn_gematria_pack`/`convergences`/גרף) → **Field Analysis** + **Field Map כ-read-model בלבד.**
- **Field Map ≠ Fact ו≠ «מסר מהיקום».** היא תצוגת-ההצלבות/קשרים שנמצאו על-בסיס האירוע+המקורות. **כל פרשנות-רוחנית = שכבת Interpretation נפרדת מ-Fact** (זהה ל-`FACT≠INTERPRETATION`).
- **המטרה כרגע:** Future Compatibility בלבד. אין UI/App/automation/notifications/AI-agent. אין schema/migration.

---

## 🧾 Gaps (מה באמת חסר — 5 בלבד, כולם חיבור/read-model)
- **G1 · Information Request אחיד** — מקושר-לממצא, חוצה-אנשים. (היום: silos per-person + owner_note_requests נכנס-בלבד.) → shape/read-model; store ב-`research_items` אם צריך.
- **G2 · תפירת-החוט** — קישור ממצא→בקשה→`raziel_send_claims`→`wa_vip_inbox` תשובה→RAW→חילוץ. → adapter/join, לא טבלה.
- **G3 · Field Package read-model** — הרכבה לפי אדם+ממצא+מה-חסר+שפה+ערוץ (לא רק phrase). → read-model מעל fns-קיימות.
- **G4 · timezone על אירוע-RAW** — היום רק `created_at`. → שדה ב-`metadata` כשהשכבה תיבנה.
- **G5 · רזיאל כבוי** — `execution_flags.enabled=false`. → הפעלה = החלטת-אדם, לא build.

## 📐 הצעת סדר-מימוש (Design → Build, כל צעד על-אישור נפרד)
| שלב | מה | reuse/gap | outward? | סטטוס |
|---|---|---|---|---|
| **P0** | להקפיא את חוזה-ה-Pipeline + מפת-reuse (המסמך הזה) | — | לא | ✅ הושלם (לאישורך) |
| **P1** | shape אחיד ל-Information Request (read-model; store ב-`research_items` bucket='info_request' רק אם צריך); Human-Gate דרך `research_candidates` | G1 + reuse | לא (פנימי) | ⏸ ממתין-אישור |
| **P2** | Field Package read-model/adapter (fn_gematria_pack + person_state + whatMissing + lang/channel) — Command-Center-first, קריאה בלבד, בלי שליחה | G3 + reuse | לא | ⏸ ממתין-אישור |
| **P3** | תפירת-החוט ממצא↔בקשה↔רזיאל↔`wa_vip_inbox`↔RAW↔חילוץ (adapter); רזיאל נשאר **flag-OFF**; כל outward = Human-Gate | G2/G5 + reuse | כן → שער | ⏸ ממתין-אישור |
| **P4** | Field-Layer foundation — לוודא ש-Field Event ניתן-לייצוג ב-`research_items.metadata`(+timezone); Field Map=read-model; Interpretation נפרד | G4 + reuse | לא | ⏸ עתיד · אישור-נפרד |

**חוק-ברזל לכל השלבים:** אף שלב לא פותח טבלה/מנוע/מקור חדש; אף פעולה outward בלי שער-צוריאל; רזיאל נשאר כבוי עד שתפעיל אותו במפורש. **שום דבר לא נבנה/נפרס לפני אישורך.**
