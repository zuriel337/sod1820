# 🔍 Independent Full Audit (Challenge) — אחרי P2.5 · לפני P3 (READ-ONLY · actor=CLAUDE · 14.8.2026)

> **שאלה יחידה:** האם התשתית שבנינו יכולה לשמש **מרכז-ניהול-ומחקר אחד** — בלי לאבד מידע, provenance, שיטות, קשרים או Human-Gate כשנרחיב?
> **מעמד:** Audit ניטרלי. ❌ לא תוקן · ❌ אין WRITE/DB/migration/Master-State/deploy/Raziel. נבדק מול הקוד החי + הסכמה החיה + החוזים.
> **SSOT שנקרא:** CLAUDE.md · work_log (P0–P2.5) · status_governance_contract · research_pipeline_contract · convergence_navigation_contract · method_agnostic_audit · research_workstation_audit. (SOD1820_MASTER_STATE.md — לא נמצא כקובץ ברפו; §-ים מוזכרים ב-CLAUDE.md בלבד — **פער-provenance מצוין ב-GAP-7.**)

---

## 🗺️ מפת-המערכת (חוט אחד)
```
מקור(פוסט/תגובה/WA/OCR/תרומה/corpus)
  → קליטה[value-centric ⚠️]  → RAW(wa_vip_inbox/gallery/research_items)
  → חילוץ(analysisFlow: CLAIM·equation·sum-equation·structural)
  → ממצא(research_items)  → גימטריה(fn_gematria_pack · registry 23)
  → שיטות methods[]✅  → cross✅  → convergence(per-method)✅  → selfBridge(1020רגיל⇄1820מילוי)✅
  → מספר(/number/:phrase — EntityPage ⚠️ ragil-anchored, מאבד method)
  → מקור-נוסף/ביטוי-אחר(/number/:phrase)  → 🔗 מקור-מלא(fullSource)
  → Information Request(P1 · RAW pointer)  → תשובת-אדם(RAW)  → אימות(מנוע)  → Human-Gate(פאזה 3)
```
**המקומות בירוק — רציפים ונבדקו. בכתום — נקודות-אובדן.** ה-Field Package הוא היום החוליה הרציפה ביותר; האובדן קורה **בגבולות** (קליטה, ומעבר /number).

---

## ✅ FACT — מה אומת בפועל
- **F1 · ניווט P2.5 עובד על יעד קיים.** ביטוי/ערך/ערך-התכנסות/ביטויי-התכנסות/cross-partners/zero-scale → `/number/:phrase` (App.jsx:343; EntityPage:422/575 `resolve(decodeURIComponent)` מטפל **מספר וגם ביטוי**). נבדק ב-build + render אמיתי (צילומי צבי «ובתורתו»).
- **F2 · גשר אותו-ביטוי נשמר.** `projectFinding.selfBridge` מקבץ methods[] לפי value → «1020(רגיל·גדול) ⇄ 1820(מילוי) ⇄ …», כל value צומת. נגזר מ-methods[] בלבד, **method-agnostic** (test 11/11 כולל 21 שיטות · novel values 10001-10008 כולם צמתים).
- **F3 · Field Package לא מצמצם ל-ragil.** engine(fn_gematria_pack 13)→wrapper(verbatim)→read-model(`Object.entries`)→UI(`.map`) — אין `.slice`/filter/cap. `primaryValue` = *אחת* מהשיטות, לא הזהות. (agnostic 11/11 + wrapper 8/8 · 21 שיטות עוברות.)
- **F4 · field-pack — שער-אדמין בלי עקיפה.** הגייט (`decideAccess`) רץ **לפני** קריאת ה-engine ב-service_role; unauth/anon→401 (**חי-אומת**: gateway `UNAUTHORIZED_NO_AUTH_HEADER` + `{"error":"unauthenticated"}`), non-admin→403 (unit 7/7). ה-service_role לא נחשף ללקוח (רק בתוך ה-Edge). **אין נתיב לעקוף Human-Gate דרך ה-wrapper** — הוא read-only (מחזיר pack), לא כותב/מקדם.
- **F5 · Governance מופרד.** «engine_verified ≠ Human-approved · Claim ≠ Fact» מוצג (WarRoomTab); `handled` = ציר-נפרד (research_items bucket, `markHandled` לא נוגע בסטטוס-המקור); «סיום בדיקה»(handled)≠«אשר ממצא»(פאזה 3, לא-מומש). INTERPRETATION (decompose) בשכבה נפרדת isFact:false.
- **F6 · Information Request = RAW בלבד.** `linkRawResponse` שומר pointer (rawTable+rawId), `IR_TRANSITIONS` לא מאפשר דילוג ל-Fact; owner-scoped (RLS ri_*_own). אין מעבר אוטומטי RAW→Fact.
- **F7 · עלות-מנוע = 0.** `fn_gematria_pack` → `cost:{tokens:0, used_llm:false, db_calls:9}`; field-pack רק מייצג (0 tokens); `getNumberDossier`=`number_dossier_json` RPC דטרמיניסטי; `getNumberMap` דטרמיניסטי. **ה-Field Package לא מפעיל AI כלל.**
- **F8 · אין מערכת-מקבילה מ-P1/P2/P2.5.** reuse: `research_items`(אין טבלה), `fn_gematria_pack`(אין מנוע), `/number`(אין ניווט), `selfBridge`(נגזר, אין מודל), `bridges[]`(חוזה קיים). **לא נוצרו** findings-table/graph/conversations/Field-Map/engine חדשים.

## 🕳️ GAP — מה עדיין חסר
לכל GAP: *מה בודק → למה חשוב → איזו החלטה משתנה (A↔B) → צעד-תיקון.*

- **GAP-1 · אובדן-method במעבר `/number` (הכי קריטי).**
  *בודק:* האם הלולאה שומרת method מקצה-לקצה. *למה:* זו כל הבטחת P2.5 — «לנוע בלי לאבד שיטה». קליק «מילוי 1820» → `/number/1820`, ו-EntityPage מתייחס ל-1820 כ**מספר ragil-anchored** (`EntityConvergence` שו׳ 267: `isNumber ? ragil`). ה-method+provenance שהובילו לשם **נעלמים** — הגעת ל«1820» גנרי, לא ל«מילוי-של-ובתורתו». *החלטה:* A=להעביר method ב-URL/state ו-EntityPage מודע-method → לולאה מלאה · B=להשאיר value-only → כל hop מאבד שיטה (סותר את convergence_navigation_contract «anchor=number+method»). *צעד:* להוסיף `?method=`/`?from=` לקישורים + כותרת-הקשר ב-EntityPage («1820 · מילוי · מ-ובתורתו»). **P1.**
- **GAP-2 · cross-resonance חינמי נעול מאחורי AI ב-EntityPage.**
  *בודק:* האם עובדה-חינם דורשת AI. *למה:* `getWordCrossFacts` (דטרמיניסטי, bidim) נטען רק אם `aiText` קיים (EntityPage:860). ה-Field Package מציג cross **חינם**, אבל היעד (/number) מסתיר אותו מאחורי Sonnet → חוסר-עקביות + תשלום-מיותר. *החלטה:* A=לשחרר ל-mount → עקבי+חינם · B=להשאיר → משלמים AI לעובדה קיימת. *צעד:* טעינת `aiCross` ב-mount (open item #1). **P1 (נמוך-מאמץ).**
- **GAP-3 · ממצא-מורכב (equality+sum) לא נכנס ל-Field Package.**
  *בודק:* האם «703+61=764» / «נאות דשא=יומא דשבתא=764» נשמר ומוצג במבנה. *למה:* `analysisFlow` **כן** מזהה `sum-equation` (`verifiedSum:a+b===c ✓`, שו׳ 169/176/192) ו-`equation` (157), אבל `fieldpackage.js` **אפס** חשבון. ⇒ הממצא-המורכב **מפוצל**: FullAnalysis מציג חשבון, Field Package מציג גימטריה — לא מאוחד בממצא-ניווטי אחד. *החלטה:* A=Field Package סופג את structure מ-analysisFlow → ממצא-אחד-שלם · B=נשאר מפוצל → «703+61=764» אין לו בית ניווטי. *צעד:* להזרים `researchStructure`(analysisFlow) לתוך buildFieldPackage. **P1/P2. התשתית נושאת (research_items.metadata) — חסרה רק ההצגה.**
- **GAP-4 · קליטה value-centric — שיטה חדשה אובדת.** *בודק:* האם method שורד קליטה. *למה:* OCR/WA/פוסט/תרומה שומרים `primary_value`/`all_values`/`numbers` — מספר-עירום בלי method. *החלטה:* A=לשמר `{method,value}` בקליטה · B=רק המנוע יודע method, הקליטה עיוורת. *צעד:* עתידי — לתייג method ב-ingestion. **FUTURE (לא חוסם היום).**
- **GAP-5 · method כ-node עצמאי / verse-ref / ממצא-פר-כותב — אין route.** *בודק:* צמתים שהובטחו כלחיצים אך אין להם דף. *למה:* אין `/method/מילוי`; verse «תהלים 1:2» = count בלבד; קליק על ביטוי → EntityPage שלו, לא רשומת-ממצא-של-הכותב. *החלטה:* A=לקשר method דרך value (כפי שנעשה) ולדווח השאר כפער · B=לבנות routes חדשים (סיכון-מקביליות). *צעד:* להשאיר כפער-מדווח; לא להמציא. **P2/FUTURE.**
- **GAP-6 · admin-success של field-pack לא נבדק חי.** *בודק:* שאדמין אמיתי מקבל pack. *למה:* אין לי JWT-אדמין בסביבה. *החלטה:* לא משנה החלטה — unit 7/7 + שני deny-paths חיים מספיקים לאישור-לוגיקה. *צעד:* צוריאל בודק בפריוויו. **P2.**
- **GAP-7 · provenance של Master-State.** *בודק:* האם `SOD1820_MASTER_STATE.md` קיים כמקור. *למה:* CLAUDE.md מפנה אליו (§11/§12) אך **אין קובץ ברפו** — ההגדרות חיות ב-CLAUDE.md/DB בלבד. *החלטה:* A=זה מכוון (SSOT=CLAUDE.md+DB) · B=קובץ חסר → provenance חלקי. *צעד:* לאשר איפה ה-SSOT האמיתי. **P2 (החלטת-צוריאל).**

## ⚠️ RISK — מה עלול לשבור בהמשך
- **R1 (מ-GAP-1):** אם נרחיב את הניווט בלי לתקן את גבול-/number, **כל hop מאבד method** — והמערכת «נראית» ניווטית אבל מחזירה את המשתמש ל-ragil. שובר את חוק `expression×method×value` בדיוק בנקודת-המעבר.
- **R2 (מ-GAP-3):** אם נבנה תצוגת-ממצא-מורכב **חדשה** במקום להזרים מ-analysisFlow הקיים → מערכת-מקבילה. הסיכון הוא *לתקן לא-נכון*, לא היעדר-תשתית.
- **R3 · אחסון:** `gematria_words` (wide ~14 עמודות + `other_*` שקע-יחיד) — שיטה מעבר-לרישום-עם-עמודה נשענת על `all_values`(מספר-עירום). המנוע(23)+bidim(long) אגנוסטיים; **האחסון-הרחב והקליינט-הקשיח לא.** הוספת method #24 = בטוחה במנוע, מסוכנת באחסון-הרחב/קליינט.
- **R4 · client drift:** `gematria.js` METHODS(14)+DEPTH(9)=23 **hard-coded**, לא קורא מ-`gematria_methods`. רישום ישתנה → קליינט לא ידע. (מחשבון/שורשים/cross מקומיים.)

## 🧬 DUPLICATION — סכנת-מקביליות
- **אין כפילות חדשה מ-P1/P2/P2.5** (F8). ✅
- **סיכון-כפילות עתידי אחד:** אם ממצא-מורכב (GAP-3) או method-context (GAP-1) ייבנו כמערכת-חדשה במקום הרחבת-הקיים (analysisFlow / EntityPage / bridges[]). **המלצה: לאסור מנוע/מודל/route חדש — רק חיבור.**

## 💸 COST
- **נקי:** Field Package · fn_gematria_pack · dossier · map · selfBridge · cross(ב-Field Package) — **0 tokens**.
- **דליפה יחידה (GAP-2):** EntityPage נועל cross-resonance החינמי מאחורי `aiText`. זו העלות-המיותרת היחידה בלולאה. AI נשאר opt-in (`runAiNumber` כפתורים), עם תקרת 2/יום — תקין. **המסקנה: AI הוא פרשנות אופציונלית, לא תנאי-להצגת-עובדות — למעט GAP-2.**

## 🧭 DECISION NEEDED (רק מה שבאמת דורש צוריאל)
1. **method-aware `/number`?** (GAP-1) — האם היעד יישא method+provenance. *משנה: האם הלולאה שלמה או value-only.*
2. **לשחרר cross-resonance מה-gate?** (GAP-2) — עקביות+עלות. *משנה: משלמים AI לעובדה קיימת או לא.*
3. **מודל-הממצא:** האם Field Package הופך לתצוגת-הממצא-האחת (סופג equality/sum/claim) או נשאר גימטריה-בלבד. (GAP-3) *משנה: האם ל«703+61=764» יש בית.*
4. **מהו SSOT הקנוני?** (GAP-7) — CLAUDE.md+DB, או קובץ Master-State חסר.

## 🔮 Future-proofing (לא לבנות — רק לא-לחסום)
- **לא חסום:** אנגלית/אנגרמות/ELS/ציר/תאריכים/מידע-מאדם/Field-Map — כולם יכולים להשתמש ב**מנגנון-אחד** `bridges[]`/`selfBridge` + `/number`(גנרי) + `research_items.metadata` + `nodes/edges`. הארכיטקטורה **פתוחה** להם.
- **התנאי לשמור פתוח:** אל תקבע method-count בשום שכבה-חדשה; אל תבנה route/מנוע פר-סוג-קשר; שמור `{type, value}` ולא רק value.

---

## סיכום
### א. מה כבר סגור
ניווט-P2.5 על יעד-קיים (F1) · גשר-אותו-ביטוי method-agnostic (F2) · אי-צמצום-ragil ב-Field Package (F3) · שער-field-pack בלי עקיפה (F4) · הפרדת-Governance ו-handled (F5) · Info-Request=RAW (F6) · עלות-מנוע=0 (F7) · אפס-מקביליות-חדשה (F8).

### ב. מה עדיין פתוח
GAP-1 אובדן-method ב-/number (**קריטי**) · GAP-2 cross נעול מאחורי AI · GAP-3 ממצא-מורכב לא ב-Field Package · GAP-4 קליטה value-centric · GAP-5 method/verse/ממצא-פר-כותב אין route · GAP-7 SSOT Master-State.

### ג. מה אסור לבנות עכשיו
מנוע-גימטריה/graph/findings-table/conversations/Field-Map חדש · refactor אחסון ל-long-format · rewrite אגנוסטי-מלא · אנגלית/אנגרמות/ELS/ציר · תצוגת-ממצא-מורכב חדשה (רק הזרמה מ-analysisFlow).

### ד. שלושת הצעדים הבאים (בלבד)
1. **לסגור GAP-1 (method-aware /number).** בלעדיו P2.5 שלם רק חצי-לולאה — method נופל בכל מעבר. **P0.** (חיבור: `?method=` בקישור + הקשר ב-EntityPage; בלי route/מנוע חדש.)
2. **לשחרר GAP-2 (cross-resonance ל-mount).** עקביות מול Field Package + חיסכון-A00; מאמץ-נמוך. **P1.**
3. **להכריע GAP-3 (מודל-הממצא).** האם Field Package = תצוגת-הממצא-האחת שסופגת equality/sum/claim מ-analysisFlow. זו החלטת-ארכיטקטורה שקובעת אם P3 בכלל נחוץ. **P1 — החלטת-צוריאל לפני קוד.**

> **המלצה:** הבסיס **חזק ורציף בתוך ה-Field Package**, אבל ה**גבולות** (מעבר /number, קליטה) מאבדים method/provenance. לפני P3 — לסגור **רק את GAP-1** (החור האמיתי בלולאה), ולהחליט GAP-3 (מודל-הממצא). GAP-2 קטן ומשתלם. השאר = FUTURE. **אין לפתוח מערכת חדשה — רק לחבר את הקיים.**
