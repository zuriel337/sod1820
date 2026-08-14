# 📜 MASTER v-next — DRAFT (Command Center Research Layer · סשן 14.8.2026)

> **⚠️ DRAFT בלבד.** זו טיוטה לאישור — **אינה** `SOD1820_MASTER_STATE.md` ואינה משנה אותו. עד «אשר/מזג» לא נוגעים ב-Master.
> **מעמד:** סגירת-ידע, לא פיתוח. ❌ אין קוד/DB/migration/UI/deploy/Audit נוסף.
> **כללי-הפרדה (מחייבים):** OPEN נשאר OPEN (לא הופך להחלטה) · FUTURE נשאר FUTURE (לא דרישת-מערכת) · המלצת-CLAUDE ≠ החלטת-ZURIEL.
> **בסיס:** `docs/planning/master_closure_candidate.md` (e09d02f) + work_log 14.8 + Master State §CL.

## מקרא-provenance (הפרדה קשיחה — אין ערבוב)
- **branch** = קומיט על `claude/raziel-capabilities-audit-h5k9ww`.
- **main** = מוזג ל-main (production frontend). *(בסשן זה: כלום מה-CC לא מוזג ל-main על-ידי thread זה.)*
- **deployed** = חי בפועל בסביבה (Supabase Edge / Vercel).
- **live-verified** = נבדק בריצה-חיה בפועל.
- **not-live-verified** = לא נבדק בריצה (נבדק ב-unit/build או ב-code בלבד).
> **חוק-ברזל של הטיוטה:** לא כותבים `DEPLOYED`/`LIVE-VERIFIED` אלא אם אומת בפועל.

---

## §CC-2.0 · טבלת-provenance מדויקת (לכל artifact)
| Artifact | branch | main | deployed | live-verified | הערה |
|---|---|---|---|---|---|
| `src/lib/inforequest.js` (P1) | ✅ | ❌ | ❌ | ❌ (unit 23/23 + build) | frontend-lib, לא-פרוס |
| `src/lib/fieldpackage.js` (P2 read-model + selfBridge + projectCompoundFinding) | ✅ | ❌ | ❌ | ❌ (unit 24+11+13 + build) | read-model, לא-פרוס |
| `src/lib/ccnav.js` (GAP-1 numLink) | ✅ | ❌ | ❌ | ❌ (unit 13/13) | לא-פרוס |
| `WarRoomTab.jsx` FieldPackageSection + nodes (P2-UI / P2.5 / GAP-1A) | ✅ | ❌ | ❌ | ❌ (build + render-harness) | UI על-branch, לא-פרוס |
| `EntityPage.jsx` banner + cross-toggle (GAP-1/1A/2) | ✅ | ❌ | ❌ | ❌ (build + cross_no_ai 9/9 מול-קוד) | UI על-branch, לא-פרוס |
| **Edge `field-pack`** (source: `supabase/functions/field-pack/*`) | ✅ (source) | ❌ (source לא-ב-main) | ✅ **Supabase ACTIVE v1** | ⚠️ **חלקי** | ראה §CC-2.4 |
| `work_log` רשומות-הסשן (actor=CLAUDE) | — | — | ✅ (data rows) | ✅ | journal בלבד; לא-schema/קנון |
| DB schema / canonical | — | — | **אין שינוי** | — | 0 migration · 0 canonical-write הסשן |

**סיכום-provenance:** כל קוד-ה-CC (P1→GAP-1A) = **implemented-on-branch, לא-main, לא-deployed, not-live-verified** (נבדק ב-unit+build). היחיד ה-**deployed** = Edge `field-pack` (ומאומת-חלקית — ראה §CC-2.4). **אין** merge-to-main של thread זה; **אין** שינוי-DB/קנון.

---

## §CC-2.1 · FACT — מה קיים ואומת (בהתאם ל-provenance)
- **F1** P1 Information Request (`inforequest.js`) — state-machine + reuse `research_items`. *branch · unit 23/23 · not-live-verified.*
- **F2** P2 Field Package read-model (`fieldpackage.js`) — מפת-מצב + גימטריה-מלאה + selfBridge, מעל `fn_gematria_pack`. לא-מצמצם-ragil (agnostic 21 שיטות). *branch · unit 24+11 · not-live-verified.*
- **F3** P2-UI ב-`WarRoomTab.DetailPanel`. *branch · render-harness · not-live-verified.*
- **F4** P2.5 ניווט → `/number/:phrase` הקיים + selfBridge «1020(רגיל·גדול)⇄1820(מילוי)». *branch · not-live-verified.*
- **F5** GAP-1/1A method-aware nav (ccnav + באנר + עדשת-cross). *branch · ccnav 13/13 · not-live-verified.*
- **F6** GAP-2 cross דטרמיניסטי-חינם, נפרד מ-AI. *branch · cross_no_ai 9/9 (מול-קוד) · not-live-verified.*
- **F7** GAP-3 `projectCompoundFinding` read-model בלבד (בלי UI). *branch · compound 13/13.*
- **F8** Edge `field-pack` — wrapper אדמין-gated מעל `fn_gematria_pack`, פלט verbatim. *source-branch · **deployed Supabase ACTIVE v1** · live-verified חלקי (§CC-2.4).*
- **F9** בדיקות-סשן: 108 עוברות · `npm run build` ✓. *(unit+build, not-live.)*
- **F10** תשתית-קיימת (Master State §-ים): `gematria_methods`(23) · `fn_gematria_pack` tokens:0 · `convergences` 8,917 FROZEN · CC-1 WarRoomTab read-only (§13) · `raziel_*`/`wa_vip_inbox`/`research_items` — *EXISTING (Master State).*

## §CC-2.2 · DECISION — החלטות ZURIEL (מפורשות · לא המלצותיי)
- **D1** מסלול P1→P2→P2-UI→P2-server→P2.5, שלב-בנפרד, reuse-first.
- **D2** P2-server = **Option ב (Edge wrapper)**. *(א׳ GRANT ו-ג׳ client-reassembly → REJECTED, §CC-2.6.)*
- **D3** GAP-1 (method-aware via query) · **GAP-2 Option A** (cross חינם·מקופל·בלי-AI) · **GAP-3 read-model בלבד**.
- **D4** GAP-1A — התוכן (לא רק באנר) יתועדף להקשר-שיטה; `src`→קישור-חזרה כשיש URL קיים.
- **D5** מנוע-עמוק (Sonnet) = 2/יום לכולם.
- **D6** AI חינמי/Claude/Gemini **נשארים פעילים** (ניסוי+למידה מהמשתמשים) — לא לבטל.
- **D7** אין P3 עדיין; לעצור-ולהחליט אחרי כל שלב; סגירת-ידע.
- **D8** (12.7, קדם-סשן, מחייב) declutter — הצלבות/עומק מקופלים כברירת-מחדל.

## §CC-2.3 · CONTRACT / RULE — חוקים שאושרו (נאכפים בקוד-branch)
- **C1** `handled` (תור-עבודה אישי) ≠ finding-status. «סיום בדיקה»≠«אישור ממצא».
- **C2** Information Request: תשובת-אדם = **RAW pointer**, לא Fact-אוטומטי. Request≠Finding≠Fact. owner-scoped.
- **C3** Field Package = **read-model** מעל מנועים קיימים — אין מנוע/גרף/טבלה/מערכת מקבילה.
- **C4** **expression × method × value** (לעולם לא expression→value); selfBridge; **אין צמצום-ragil**; method-count-agnostic.
- **C5** cross-resonance = חישוב **דטרמיניסטי חינמי**, נפרד מ-AI; עובדה-חינם לא נעולה מאחורי AI-בתשלום.
- **C6** Compound Finding: equality/sum כממצא-אחד; **arithmetic verification ≠ gematria verification**; claim≠Fact; interpretation isFact:false.
- **C7** Human-Gate: AI **מציע**, ZURIEL **מחליט**. שום פעולה ב-Field Package לא מקדמת/מפרסמת/שולחת.
- **C8** חוק-עלות: DB/engine קודם; AI רק לפרשנות/משימות שדורשות AI. עובדות-מנוע = 0 tokens.
- **C9** `field-pack`: שער-אדמין בצד-שרת (mirror wa_admin_reply); פלט verbatim; לא-כותב/לא-מקדם.
- **C10** method-aware nav = provenance/lens בלבד; המספר נשאר צומת קנוני; לא משנה משמעות ולא הופך ל-Fact.

## §CC-2.4 · IMPLEMENTED / DEPLOYED (provenance מדויק)
- **IMPLEMENTED (branch, not-main, not-deployed, not-live-verified):** כל F1–F7 (קוד-frontend + read-models). מאומת ב-**unit(108)+build** בלבד — **לא** בריצה-חיה.
- **DEPLOYED (Supabase Edge):** `field-pack` v1, verify_jwt=true, **ACTIVE**.
  - **live-verified (deny-paths):** no-auth→401 (`UNAUTHORIZED_NO_AUTH_HEADER`) · anon-key→`{"error":"unauthenticated"}` · OPTIONS→200. *(curl בפועל.)*
  - **NOT live-verified:** **admin-success** (אין JWT-אדמין בסביבה) — נבדק רק ב-unit (gate 7/7).
  - **הערת-inertness:** ה-frontend שקורא ל-`field-pack` (`assembleFieldPackage`) על **branch, לא-main** ⇒ **production frontend אינו קורא לו** — ה-Edge אינרטי למשתמשי-פרודקשן כרגע.
- **NOT deployed:** כל ה-UI/frontend (Field Package, באנר, toggle) — דורש Vercel-preview שלא בוצע.
- **DB/canonical:** **0 שינוי** (0 migration · 0 canonical-write). `research_items` bucket='info_request' — מבנה-reuse, **לא נכתבו רשומות** (createRequest רק בלחיצת-משתמש, לא בוצעה).

## §CC-2.5 · OPEN — החלטות פתוחות (מתועדות · לא-מוכרעות · לא הופכות להחלטה)
- **O1** האם P3 בכלל נחוץ, ומה ממנו.
- **O2** תצוגת Compound Finding (GAP-3 display) — האם Field Package = תצוגת-הממצא-האחת.
- **O3** GAP-1A — עדשת-cross מספיקה, או סינון-תוכן-מלא לפי method.
- **O4** פערי-אגנוסטיות legacy (קליטה value-centric · אחסון `gematria_words` wide · client METHODS hard-coded) — מתי/אילו.
- **O5** live-verify (Vercel preview) + מתי (אם) merge ל-main.
- **O6** (Master State §): `gematria_methods`=Registry-רשמי? · lifecycle · convergences↔graph · deploy publicIdentity.
> **הערה:** O1–O6 **נשארים OPEN במכוון**. ה-Master מתעד החלטות-פתוחות; אינו מחייב לפתור אותן לפני סגירה.

## §CC-2.6 · FUTURE / STRATEGY — כיוונים עתידיים (⚠️ לא קנון · לא משימת-ביצוע · לא דרישת-מערכת)
- **FUT-1** Premium AI Analysis (ידע-משולב + שמות + תאריכים + מספרים + המרות-תאריך-למילים + צירופים + הצלבות). **FUTURE/STRATEGY בלבד — עד אישור-תכנון של ZURIEL.**
- **FUT-2** Field Map / מפה-רוחנית (אדם·זמן·רמזים·מספרים·אירועים). **FUTURE/STRATEGY בלבד — לא מאושר-לבנייה.**
- **FUT-3** Raziel outward — **תשתית קיימת ורדומה** (`raziel_*`, `enabled=false`, allowed-fns קריאה-בלבד) **≠ הפעלה**. הפעלה = החלטה-עתידית.
- **FUT-4** P3 (thread-stitching Field-Package↔Info-Request↔wa_vip_inbox↔Raziel) — proposed, לא-אושר.
- **FUT-5** אנגלית · אנגרמות · ELS · ציר/תאריכים — **מוקפאים**; רק לא-לחסום (bridges[]/`/number`/metadata פתוחים).
- **FUT-6** מנוע-הגילויים H-2..H-5 (Master State §10.6/§CL#13) — ROADMAP, אישור-נפרד לכל stage.

## §CC-2.7 · REJECTED / DEFERRED
- **REJ-1** GAP-1 Option א (GRANT `fn_gematria_pack` ל-public/authenticated) — **נדחה ע"י ZURIEL.**
- **REJ-2** GAP-1 Option ג (הרכבת-pack בקליינט) — **נדחה** (מנוע-מקביל/drift).
- **DEF-1** refactor אחסון long-format / rewrite אגנוסטי-מלא — **מוקפא (FUTURE).**
- **DEF-2** אנגלית/אנגרמות/ELS/ציר — **מוקפא** (רק לא-לחסום).
- **DEF-3** GAP-7 (Master State חסר) — **בוטל/תוקן:** `SOD1820_MASTER_STATE.md` קיים (542 שורות). האודיט טעה.

## §CC-2.8 · §CL entry מוצע (לטיוטה — טרם-רישום ל-Master)
| # | תאריך | מה השתנה | למה | מה הוחלף | סטטוס + provenance |
|---|---|---|---|---|---|
| *(next)* | 14.8.2026 | Command Center Research Layer: P1 Info-Request · P2 Field Package read-model · P2-UI · P2.5 navigation gateway · GAP-1/1A method-aware nav · GAP-2 cross-AI-free · GAP-3 compound read-model · Edge `field-pack` | להפוך את CC-1 (View קורא-בלבד) לשרשרת-מחקר-ניווטית מעל המנועים הקיימים, reuse-first | «Field Package = מסך-מידע» → «שער-ניווט read-model»; «cross מאחורי AI» → «cross דטרמיניסטי-חינם» | **קוד: IMPLEMENTED (branch, לא-main, לא-deployed, not-live)** · **Edge field-pack: DEPLOYED (Supabase ACTIVE), live-verified חלקי (deny-paths; admin לא)** · **DB: 0 שינוי** · 108 tests + build ✓ |

---

## סיכום-הצגה (לפי בקשתך)
### א. אילו סעיפים ייכנסו (למועמד-Master)
§CC-2.0 provenance · §CC-2.1 FACT (F1–F10) · §CC-2.2 DECISION (D1–D8) · §CC-2.3 CONTRACT (C1–C10) · §CC-2.4 IMPLEMENTED/DEPLOYED · §CC-2.8 §CL-entry.
### ב. אילו נשארים OPEN
§CC-2.5: O1–O6 (מתועדים כ-OPEN, לא מוכרעים).
### ג. אילו FUTURE
§CC-2.6: FUT-1 Premium-AI · FUT-2 Field-Map · FUT-3 Raziel-outward · FUT-4 P3 · FUT-5 אנגלית/אנגרמות/ELS/ציר · FUT-6 H-2..H-5.
### ד. מה הוצא (אינו החלטה)
המלצותיי-שלי כ«החלטות» (למשל «Option A מומלץ» — ההחלטה = D3 של ZURIEL) · REJ-1/REJ-2 כאופציות-חיות · כל FUTURE כקנון/דרישה · «PR #154→main» (thread אחר — **לא נכלל**, לאימות-נפרד).
### ה. provenance מלא (commits/deploy)
- **branch `claude/raziel-capabilities-audit-h5k9ww`:** `72affa3` P1 · `d0c91a0` P2 · `8dc266a` P2-UI · `fffd965` field-pack-source · `752a23f` agnostic-test · `8f2308b` GAP-1 · `c404ceb` GAP-2 · `fb72b86` GAP-3 · `47f4363` GAP-1A+src+cross-test · docs: `ee4f273`/`084bf63`/`abed2f9`/`e09d02f`/(this).
- **deploy:** Edge `field-pack` v1 → **Supabase (ACTIVE)** דרך MCP deploy_edge_function (לא git-main). deny-paths live-verified (curl); admin-success לא.
- **main:** ❌ thread-CC לא-מוזג. «PR #154→main» = thread נפרד (לא בסגירה זו).
- **DB:** ❌ 0 migration · 0 canonical-write. work_log = journal בלבד.

> **הבא (רק על-אישורך):** להעביר את §CC-2 מ-DRAFT ל-`SOD1820_MASTER_STATE.md` (§ חדש CC-2 או הרחבת §11/§13) + §CL-entry — **בלי לגעת ב-Master עד «אשר/מזג».**
