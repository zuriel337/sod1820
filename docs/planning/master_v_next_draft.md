# 📜 MASTER v-next — DRAFT (Command Center Research Layer · CC-2 · סשן 14.8.2026)

> **⚠️ DRAFT בלבד.** אינה `SOD1820_MASTER_STATE.md` ואינה משנה אותה. עד «אשר/מזג» לא נוגעים ב-Master.
> **מעמד:** סגירת-ידע. ❌ אין קוד/DB/migration/UI/deploy/merge-main.
> **כללי-הפרדה (מחייבים):** המלצה ≠ החלטה · FUTURE ≠ roadmap-מחייב · branch ≠ main · build/test ≠ live-verification · **לא ממציאים provenance**.
> **OPEN אינו BLOCKER:** O1–O6 מתועדים ב-Master ונשארים פתוחים עד הכרעה עתידית — אין לחכות להם כדי לסגור.

---

## §CC-2.0 · עקרון-העבודה (חדש · CONTRACT)
**הפרויקט עובד במחזור:**
```
RESEARCH → DECISION → MASTER → SESSION CLOSURE → IMPLEMENTATION SESSION
```
- **ה-Master הוא נקודת-המעבר בין מחקר לביצוע — לא רשימת-משימות שצריך לסיים כולה.**
- OPEN DECISIONS נשארים מתועדים ב-Master; אינם חוסמים סגירה.
- מחזור-ביצוע חדש מתחיל מ-Master, לא מזיכרון-סשן.

---

## §CC-2.1 · FACT — מה אומת (ברמת-האימות המדויקת)
- **F1** P1 Information Request (`inforequest.js`): state-machine + reuse `research_items`. *אומת: unit 23/23 + build.*
- **F2** P2 Field Package read-model (`fieldpackage.js`): מפת-מצב + גימטריה-מלאה + selfBridge, מעל `fn_gematria_pack`; לא-מצמצם-ragil; agnostic ל-21 שיטות. *אומת: unit 24+11 + build.*
- **F3** P2-UI ב-`WarRoomTab.DetailPanel`. *אומת: build + render-harness (צילומי צבי «ובתורתו»).*
- **F4** P2.5 ניווט → `/number/:phrase` הקיים; selfBridge «1020(רגיל·גדול)⇄1820(מילוי)». *אומת: build + render-harness.*
- **F5** GAP-1/1A method-aware nav (`ccnav.numLink` + באנר + עדשת-cross + src-return-link). *אומת: ccnav 13/13 + build.*
- **F6** GAP-2 cross דטרמיניסטי-חינם, נפרד מ-AI. *אומת: cross_no_ai 9/9 (מול הקוד-הנשלח) + build.*
- **F7** GAP-3 `projectCompoundFinding` read-model (בלי UI). *אומת: compound 13/13 על «נאות מדבר(703)+אליך(61)=נאות דשא(764)».*
- **F8** Edge `field-pack` — wrapper אדמין-gated מעל `fn_gematria_pack`, פלט verbatim. *אומת: unit gate 7/7 + §CC-2.5/2.6.*
- **F9** בדיקות-סשן: 108 עוברות · `npm run build` ✓. *(unit+build — לא live.)*
- **F10** תשתית-קיימת (Master State §-ים, EXISTING): `gematria_methods`(23) · `fn_gematria_pack` tokens:0 · `convergences` 8,917 FROZEN · CC-1 `WarRoomTab` read-only (§13) · `raziel_*`/`wa_vip_inbox`/`research_items`.
> **גבול:** «אומת» כאן = unit/build/render-harness/gate-unit. **אינו** live-verification (ראה §CC-2.6).

## §CC-2.2 · DECISION — החלטות מפורשות של ZURIEL (בלבד)
- **D1** מסלול P1→P2→P2-UI→P2-server→P2.5, שלב-בנפרד, reuse-first.
- **D2** P2-server = **Option ב (Edge wrapper)**. *(א׳/ג׳ → §CC-2.9.)*
- **D3** GAP-1 (method-aware via query) · **GAP-2 Option A** · **GAP-3 read-model בלבד**.
- **D4** GAP-1A — התוכן (לא רק באנר) יתועדף להקשר-שיטה; `src`→קישור-חזרה כשיש URL קיים.
- **D5** מנוע-עמוק (Sonnet) = 2/יום לכולם.
- **D6** AI חינמי/Claude/Gemini **נשארים פעילים** (ניסוי+למידה) — לא לבטל. AI = שכבת-פרשנות.
- **D7** אין P3 עדיין; לעצור-ולהחליט אחרי כל שלב; סגירת-ידע.
- **D8** (12.7, קדם-סשן, מחייב) declutter — הצלבות/עומק מקופלים כברירת-מחדל.
- **D9** OPEN אינו BLOCKER ל-Master; ה-Master מתעד החלטות-פתוחות (עקרון §CC-2.0).

## §CC-2.3 · CONTRACT / RULE — כללי-עבודה שאושרו
- **C1** `handled` (תור-עבודה אישי) ≠ finding-status; «סיום בדיקה» ≠ «אישור ממצא».
- **C2** Information Request: תשובת-אדם = **RAW pointer**, לא Fact-אוטומטי; Request≠Finding≠Fact; owner-scoped.
- **C3** Field Package = **read-model** מעל מנועים קיימים — אין מנוע/גרף/טבלה/מערכת מקבילה.
- **C4** **expression × method × value** (לעולם לא expression→value); selfBridge; **אין צמצום-ragil**; method-count-agnostic.
- **C5** cross-resonance = חישוב **דטרמיניסטי חינמי**, נפרד מ-AI; עובדה-חינם לא נעולה מאחורי AI-בתשלום.
- **C6** Compound Finding: equality/sum כממצא-אחד; **arithmetic-verification ≠ gematria-verification**; claim≠Fact; interpretation isFact:false.
- **C7** Human-Gate: AI **מציע**, ZURIEL **מחליט**; שום פעולה ב-Field Package לא מקדמת/מפרסמת/שולחת.
- **C8** חוק-עלות: DB/engine קודם; AI רק לפרשנות/משימות-שדורשות-AI; עובדות-מנוע = 0 tokens.
- **C9** `field-pack`: שער-אדמין בצד-שרת (mirror wa_admin_reply); פלט verbatim; לא-כותב/לא-מקדם.
- **C10** method-aware nav = provenance/lens בלבד; המספר נשאר צומת קנוני; לא משנה משמעות ולא הופך ל-Fact.
- **C11** (§CC-2.0) עקרון-המחזור RESEARCH→DECISION→MASTER→CLOSURE→IMPLEMENTATION; Master = נקודת-מעבר.

## §CC-2.4 · IMPLEMENTED — מה בוצע (branch + commit)
> **הכל על ענף `claude/raziel-capabilities-audit-h5k9ww` — לא-main, לא-deployed (frontend), not-live-verified.**
- `72affa3` P1 Information Request · `d0c91a0` P2 Field Package read-model · `8dc266a` P2-UI (FieldPackageSection).
- `fffd965` P2-server `field-pack` **source** (index.ts+gate.js) · `752a23f` agnostic-guarantee test.
- `8f2308b` GAP-1 (ccnav + באנר) · `c404ceb` GAP-2 (cross AI-free) · `fb72b86` GAP-3 (compound read-model) · `47f4363` GAP-1A + src-link + cross_no_ai test.
- docs: `ee4f273`/`084bf63`/`abed2f9`/`e09d02f`/`bfdf250` (audits/proposals/closure/draft).
> **מאומת מול origin/main (READ-ONLY, 14.8):** `fieldpackage.js`/`inforequest.js`/`ccnav.js`/`field-pack` = **ABSENT on main**; הענף **NOT in main**.

## §CC-2.5 · DEPLOYED — רק מה שבאמת נפרס
- **Edge `field-pack` v1 → Supabase (ACTIVE, verify_jwt=true)** דרך MCP `deploy_edge_function`. *(deploy ל-Supabase, לא git-main.)*
- **inertness:** ה-frontend שקורא לו (`assembleFieldPackage`) על **branch, לא-main** ⇒ **production frontend אינו קורא לו** — אינרטי למשתמשי-פרודקשן.
- **לא-נפרס:** כל ה-UI/frontend (Field Package/באנר/toggle) — דורש Vercel-preview שלא בוצע.
- **DB/canonical:** **0 שינוי** (0 migration · 0 canonical-write). `research_items` bucket='info_request' = מבנה-reuse, **0 רשומות נכתבו**.

## §CC-2.6 · LIVE-VERIFIED — רק מה שנצפה ואומת חי
- **Edge `field-pack` — deny-paths בלבד (curl בפועל):** no-auth→401 `UNAUTHORIZED_NO_AUTH_HEADER` · anon-key→`{"error":"unauthenticated"}` · OPTIONS→200 CORS.
- **⛔ NOT live-verified:** `field-pack` **admin-success** (אין JWT-אדמין בסביבה — נבדק רק ב-unit 7/7) · **כל ה-UI/frontend** (Field Package/method-aware/cross-toggle/compound) — 0 ריצה-חיה.
> **אין שום פריט-frontend ב-LIVE-VERIFIED.** הכל שם = §CC-2.1 (unit/build) בלבד.

## §CC-2.7 · OPEN — החלטות/שאלות פתוחות (מתועדות · לא-מוכרעות · לא BLOCKER)
- **O1** האם P3 בכלל נחוץ, ומה ממנו.
- **O2** תצוגת Compound Finding (GAP-3 display) — האם Field Package = תצוגת-הממצא-האחת.
- **O3** GAP-1A — עדשת-cross מספיקה, או סינון-תוכן-מלא לפי method.
- **O4** פערי-אגנוסטיות legacy (קליטה value-centric · אחסון `gematria_words` wide · client METHODS hard-coded).
- **O5** live-verify (Vercel preview) + מתי (אם) merge ל-main.
- **O6** (Master State §): `gematria_methods`=Registry-רשמי? · lifecycle · convergences↔graph · deploy publicIdentity.
> נשארים OPEN במכוון (§CC-2.0/D9).

## §CC-2.8 · FUTURE / STRATEGY — כיוונים עתידיים (⚠️ לא קנון · לא roadmap-מחייב · לא דרישה)
- **FUT-1** Premium AI Analysis (ידע-משולב + שמות + תאריכים + מספרים + המרות-תאריך-למילים + צירופים + הצלבות). *עד אישור-תכנון של ZURIEL.*
- **FUT-2** Field Map / מפה-רוחנית (אדם·זמן·רמזים·מספרים·אירועים). *לא מאושר-לבנייה.*
- **FUT-3** Raziel outward — **תשתית קיימת ורדומה** (`raziel_*`, `enabled=false`) **≠ הפעלה**. הפעלה = החלטה-עתידית.
- **FUT-4** P3 (thread-stitching Field-Package↔Info-Request↔wa_vip_inbox↔Raziel) — proposed, לא-אושר.
- **FUT-5** אנגלית · אנגרמות · ELS · ציר/תאריכים — לא-לחסום בלבד (bridges[]/`/number`/metadata פתוחים).
- **FUT-6** מנוע-הגילויים H-2..H-5 (Master State §10.6/§CL#13) — כל stage אישור-נפרד.

## §CC-2.9 · REJECTED / DEFERRED
- **REJ-1** GAP-1 Option א (GRANT `fn_gematria_pack` ל-public/authenticated) — **נדחה ע"י ZURIEL.**
- **REJ-2** GAP-1 Option ג (הרכבת-pack בקליינט) — **נדחה** (מנוע-מקביל/drift).
- **DEF-1** refactor אחסון long-format / rewrite אגנוסטי-מלא — **מוקפא (FUTURE).**
- **DEF-2** אנגלית/אנגרמות/ELS/ציר — **מוקפא** (רק לא-לחסום).
- **DEF-3** «GAP-7 (Master State חסר)» — **בוטל/תוקן:** `SOD1820_MASTER_STATE.md` קיים (542 שורות). האודיט טעה.

## §CC-2.10 · §CL entry מוצע (לטיוטה — טרם-רישום ל-Master)
| # | תאריך | מה השתנה | למה | מה הוחלף | סטטוס + provenance |
|---|---|---|---|---|---|
| *(next)* | 14.8.2026 | CC-2 Research Layer: P1 Info-Request · P2 Field Package read-model · P2-UI · P2.5 nav-gateway · GAP-1/1A method-aware · GAP-2 cross-AI-free · GAP-3 compound read-model · Edge `field-pack` | להפוך CC-1 (View קורא-בלבד) לשרשרת-מחקר-ניווטית מעל המנועים, reuse-first | «Field Package=מסך-מידע»→«שער-ניווט read-model»; «cross מאחורי AI»→«cross דטרמיניסטי-חינם» | **קוד: IMPLEMENTED (branch, לא-main, לא-deployed, not-live)** · **Edge field-pack: DEPLOYED (Supabase ACTIVE); LIVE-VERIFIED deny-paths בלבד; admin לא** · **DB: 0 שינוי** · 108 tests+build ✓ |

---

## נספח · טבלת-provenance (הפרדה קשיחה)
| רכיב | branch | main | deployed | live-verified |
|---|---|---|---|---|
| קוד-CC (inforequest/fieldpackage/ccnav/WarRoomTab/EntityPage) | ✅ | ❌ (ABSENT-on-main, מאומת) | ❌ | ❌ (unit 108 + build) |
| Edge `field-pack` (source) | ✅ | ❌ | ✅ Supabase ACTIVE v1 | ⚠️ deny-paths בלבד (admin ❌) |
| DB / canonical | — | — | 0 שינוי | — |
| work_log רשומות-סשן | — | — | ✅ (journal) | ✅ |

**אי-ודאות-provenance — נבדקה ונסגרה:** «PR #154→main» = thread נפרד (`988e650` "Story taxonomy v1 + OR_GEULA story rail + Latest Updates + reality Hero") — **אינו כולל CC**. אין פריט-provenance פתוח כרגע; היחיד שאינו-ניתן-לאימות-כאן = `field-pack` admin-success (דורש JWT-אדמין).
