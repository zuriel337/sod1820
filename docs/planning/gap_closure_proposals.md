# 🔧 Gap-Closure Proposals — GAP-1 / GAP-2 / GAP-3 (READ-ONLY · הצעה לפני WRITE · actor=CLAUDE)

> **מעמד:** הצעות-מימוש בלבד. ❌ אין WRITE/קוד/DB/migration/Master-State/deploy. כל שינוי-בפועל — רק אחרי אישורך.
> **מטרה:** להפוך את מה שכבר בנוי לשרשרת-מחקר שלא מאבדת context. **בלי יכולות חדשות, בלי מערכת מקבילה.**

## ✅ תיקון-Audit — SSOT (בדיקה חוזרת READ-ONLY)
**טעיתי ב-GAP-7.** `SOD1820_MASTER_STATE.md` **קיים** — בשורש הרפו (542 שורות, מאומת-DB 10.8.2026). §11/§11-B/§12 = מפרט **חדר-המפקדה הקנוני** (INTAKE→DISCOVERY→JUDGE→PUBLISH · «שער-אחד ≠ מקור-אמת-אחד» · provenance מלא · KEEP-EVERYTHING/אין-מערכת-חדשה). **ה-SSOT בפועל = `CLAUDE.md` (חוקי-סוכן) + `SOD1820_MASTER_STATE.md` (מצב/מוצר קנוני) + DB (`nodes`/`gematria_methods`/`work_log`).** GAP-7 **נמשך**. (הלקח: לחפש בפועל, לא להסיק — כפי שהזהרת.)
עבודת P0–P2.5 מיושרת ל-§11.16 (הצינור), §11.19 (provenance נשמר), §11 (אין-מערכת-חדשה). ✅

---

## P0 · GAP-1 — Method-aware navigation context
**FACT.** `/number/:phrase` (EntityPage) = הצומת הקנוני, מטפל מספר+ביטוי. EntityPage **כבר** קורא query-params: `useSearchParams` + `sp.get("from") === "calc"` (שו׳ 573-574). קישורי P2.5 מובילים ל-`/number/<value>` — הצומת נכון.
**GAP.** הקישור נושא **value בלבד**. `method`+`expression`+`provenance` נופלים; EntityPage מתייחס למספר כ-ragil-anchored (`EntityConvergence:267 isNumber?ragil`). ⇒ «מילוי 1820» מגיע ל-1820 גנרי — איבדנו «מילוי-של-ובתורתו-מ-צבי».
**מינימום-שינוי (מעל הקיים, בלי route/tree חדש).**
1. `WarRoomTab` `numLink/Node` — לצרף context אופציונלי כ-query: `/number/1820?method=מילוי&expr=ובתורתו&src=<source>`. (המספר נשאר הצומת; ה-method = **קונטקסט-הגעה**, לא צומת.)
2. `EntityPage` — לקרוא `sp.get("method"/"expr"/"src")` ולרנדר **באנר-הקשר לא-הרסני** ליד הכותרת: «הגעת ל-**1820** · דרך **מילוי** של «**ובתורתו**» · מקור: **צבי/פורום**». כשאין params → אין באנר (התנהגות זהה להיום).
**מה לא נוגעים.** `resolve()`/ה-bundle/הדף-הקנוני/ה-routes · אין `/method/...` · אין עץ-מקביל · הלוגיקה של המספר לא משתנה.
**בדיקות.** (א) unit טהור: בונה-הקישור עם context → query מקודד נכון (encodeURIComponent, params חסרים מושמטים). (ב) build. (ג) render: הבאנר מופיע עם params, נעדר בלעדיהם.
**הצעת-WRITE.** 2 עריכות קטנות: `Node/numLink` (WarRoomTab) + באנר-הקשר (EntityPage). אפס DB. **חוזר את `convergence_navigation_contract` (anchor=number+method).**

## P1 · GAP-2 — שחרור cross-resonance מ-AI
**FACT.** `getWordCrossFacts` = **דטרמיניסטי/חינם** (RPC מעל `bidim`, 0 tokens). ה-Field Package (P2) כבר מציג cross חינם. **הניואנס החשוב:** ה-gate ב-EntityPage:860 `if (key && aiText)` הוא **החלטת-declutter של צוריאל (12.7)** (הערה 855-856: «נחשפות רק בלחיצת-AI שהמסך לא יתמלא») — **לא** gate-עלות. העובדה עצמה חינם.
**GAP.** כדי **לראות** את העובדה-החינמית ב-/number צריך `aiText` — שמגיע רק מלחיצת-AI **שעולה**. ⇒ בעקיפין, עובדה-חינם נעולה מאחורי תשלום-AI, ולא-עקבי מול ה-Field Package.
**מינימום-שינוי (מכבד את 12.7).** לנתק את `getWordCrossFacts` מ-`aiText`: לטעון אותו כשמדור-ההצלבות **נפתח** (toggle משלו, מקופל-כברירת-מחדל), במקום כתלות ב-`aiText`. שינוי-התנאי: `if (key && aiText)` → `if (key && crossOpen)`. **הדף נשאר נקי כברירת-מחדל (12.7 נשמר), אבל ההצגה כבר לא דורשת AI.**
**מה לא נוגעים.** כפתורי-ה-AI opt-in · מכסת-2/יום · ברירת-המחדל המקופלת (declutter).
**בדיקות.** התנאי לא תלוי `aiText`; המסלול-החינמי נטען בלי שום קריאת-AI; build.
**⚠️ DECISION NEEDED.** צוריאל החליט 12.7 declutter. השאלה: **מקופל-אבל-AI-free** (מומלץ — מכבד את שתי הדרישות) *או* **גלוי-כברירת-מחדל** (מבטל את ה-declutter)? A=מקופל→נקי+חינם · B=גלוי→ממלא מסך שוב.
**הצעת-WRITE.** שינוי-תנאי אחד + toggle קטן ב-EntityPage. אפס DB.

## P1 · GAP-3 — ממצא-מורכב (read-model, לפני קוד)
**FACT.** `analyzeFull(rawText)` **כבר** מחזיר `researchStructure`: `equalities`(«A=B») · `chains`(ביטויים-שונים→ערך-אחד, `candidateConvergence`) · `equations`(sum-equation+arithmetic **עם `verifiedSum:a+b===c`**) · `dependencies` · `methodComparison`(`exprMap` = ביטוי×שיטה×ערך). `detectArithmetic` מאמת «703+61=764» חשבונית (לא גימטריה). `clusters` (`{value,items,distinctExprs,methods,uniformMethod,candidateConvergence}`) מבדיל «אותו-ערך·ביטויים-שונים» מ«אותו-ביטוי·שיטות».
**GAP.** `fieldpackage.js` = **אפס חשבון**. ⇒ הממצא-המורכב **מפוצל**: FullAnalysis מציג מבנה, Field Package מציג גימטריה — אין ממצא-ניווטי-אחד. **התשתית נושאת (research_items.metadata); חסרה ההצגה המאוחדת.**
**הגדרת ה-read-model (מעל הקיים — אין טבלה/מנוע).** `projectCompoundFinding(analysis, packsByExpr)`:
```
{
  kind: "compound",
  relation: "sum" | "equality" | "chain",          // מ-researchStructure.equations/equalities/chains
  components: [{ expression, value, method, verified }],  // מ-parts/exprMap + pack פר-ביטוי (fn_gematria_pack)
  target:     { expression, value },                // צד-התוצאה («נאות דשא» · 764)
  arithmetic: { text, verifiedSum },                // אימות-חשבוני חינם (a+b===c) — לא גימטריה
  claim:      true,                                 // טענת-כותב עד Human-Gate (לא Fact)
  verification:{ arithmetic: bool, gematriaPerPart: bool },  // מה אומת במנוע פר-רכיב
  interpretation: null | {...isFact:false},         // שכבה נפרדת
  source:     { kind, url }                          // provenance (חובה)
}
```
**דוגמה:** «נאות מדבר(703) + אליך(61) = נאות דשא(764)» → components=[{נאות מדבר,703},{אליך,61}], target={נאות דשא,764}, arithmetic={verifiedSum:true}, verification={arithmetic:true, gematriaPerPart:אחרי-pack}, claim:true, source=הפוסט/WA.
**מה לא נוגעים.** מנוע-analysisFlow · fn_gematria_pack · אין טבלה חדשה · אחסון = `research_items.metadata` הקיים.
**בדיקות.** unit טהור: analysis עם sum-equation → `projectCompoundFinding` מפריד components/target/arithmetic/claim/verification/interpretation; equality≠sum≠chain לא מתאחדים רק כי הגיעו לאותו value; build.
**הצעת-WRITE.** `projectCompoundFinding` ב-`fieldpackage.js` + מדור-תצוגה ב-Field Package; הזרמת `analyzeFull.researchStructure` ל-`buildFieldPackage`. אפס DB. **ההכרעה שקובעת אם P3 נחוץ: האם Field Package = תצוגת-הממצא-האחת.**

---

## סדר-ביצוע מוצע (על-אישורך, אחד-אחד)
1. **GAP-1 (P0)** — החור-האמיתי בלולאה. סוגר את «לנוע בלי לאבד method».
2. **GAP-2 (P1)** — קטן, אחרי החלטת A/B (מקופל-AI-free מומלץ).
3. **GAP-3 (P1)** — אחרי שתאשר את ה-read-model למעלה. זו גם החלטת-מודל-הממצא.
**לכל אחד:** אימות-חי לפני WRITE → עריכה מינימלית → בדיקות+build → commit לענף → בלי deploy/main. ואז Audit-קצר, ורק אז נחליט על P3.
