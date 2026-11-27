# Cloud First — נוסח מוצע לתיקון חוזים (הצעה לאישור נפרד של ZURIEL)

| שדה | ערך |
|---|---|
| סטטוס | **טיוטת נוסח בלבד.** לא הוחל על מסד הנתונים, לא על שום חוזה, לא על קוד. אין SQL שכותב בקובץ הזה. הנוסח ממתין לאישור נפרד ומפורש של ZURIEL לפי CLAUDE.md סעיף 0.4 (חוזים/DB). אישור העקרון של תכנית Cloud First אינו אישור לנוסח. |
| תאריך | 27.11.2026 |
| מאגר / ענף | `zuriel337/sod1820` · `claude/cloud-first-contracts` (מבוסס `origin/claude/cloud-first-plan` `04a4f4e66`, ללא PR) |
| מסמך אם | [PLAN.md](PLAN.md) סעיף 8 (שאותו מחליף הנוסח כאן, אחרי תיקונים), [APPENDIX-STORAGE-MAP.md](APPENDIX-STORAGE-MAP.md) |
| החלטות ZURIEL שהנוסח מגשים (27.11.2026) | (1) שמירות ומעקבים **קבועים בחשבון הענן** של המשתמש. (2) **כניסה/הרשמה בנקודת הפעולה** עם חזרה מדויקת. (3) תגובות אורח **נשארות כפופות לאישור מנהל**. |
| בעלות | EXTEND_EXISTING בלבד. אין חוק, מנגנון, מאגר או מערכת חדשים. החוקים בני־התוספת (additive): כל תיקון נוסף כבלוק `[UPDATE vN …]` בסוף גוף החוק, והנוסח הקודם נשאר במקומו כהיסטוריה (`everything_additive_law`). "החלפת סעיף" פירושה הצהרה שהנוסח החדש גובר, לא מחיקה. |

---

## 1. מה נקרא (חי מ־Supabase `linswmnnkjxvweumprav`, SELECT בלבד, 27.11.2026)

`nodes` שבהם `type='rule' AND is_active=true`, הגרסה הפעילה האחרונה לכל `rule_id`, גוף מלא:

| חוזה | גרסה פעילה (חי) | אורך | נקרא |
|---|---|---|---|
| `research_workspace_law` | **v5** (נוצרה 27.9.2026) | 16,063 | במלואו. כותרות הגוף: v2, v3, v4, ועדכון 27.9 («UNIFIED JOURNEY 2029»); **אין כותרת פנימית «v5»** — ה־v5 במסד הוא עדכון 27.9 |
| `subscription_funnel_law` | **v22** (3.11.2026) | 37,364 | במלואו (v1–v22) |
| `canonical_ui_components_law` | **v13** (19.11.2026) | 20,016 | במלואו (v1–v13) |
| `person_foundation_contract_law` | **v6** (15.9.2026) | 12,886 | במלואו (בסיס, v2, v3, Bedrock, v5, v6) |
| `els_research_layer_law` | **v9** (27.9.2026) | 44,778 | במלואו (סעיפים 1–86) — **לא נקרא בתכנית המקורית** |
| `platform_tiers_law` | **v5** (24.9.2026) | 6,712 | במלואו (סעיפים 1–18 + metadata) — **לא נקרא בתכנית המקורית** |
| `raziel_companion_layer_law` | **v3** (17.9.2026) | 3,068 | במלואו (כולל פרופיל WhatsApp 6.10) — **לא נקרא בתכנית המקורית** |

נקראו גם (קריאה בלבד): הגדרות הפונקציות החיות `watch_toggle`, `follow_subject_toggle`, `claim_follow_prefs_from_identity`, `notification_prefs_guest_get_v1`, `add_contribution` (חלק הסטטוס), `save_els_matrix`, `save_els_matrix_anon`; ספירות על `notification_prefs` ו־`subscribe_events`; קוד: `WatchButton.jsx`, `postFollowOpenStore2029.js`, `publicLaunch2029.js`, `publicReadingRelease2029.js`, `AccountEntry2029.jsx`, `oauthReturn.js`, `researchSyncRuntime.js`; `docs/reviews/follow-public-activation-20261126/README.md`; `docs/reviews/contract-governance-audit-20261110/pack-v4/` (ראו C1).

**לא נקרא / לא נבדק:** גוף `research_intake_foundation_contract_law`, `research_strategy_layer_law`, `traffic_intelligence_law` (נוגע בתכנית רק דרך 8.5, שלא נכלל כאן); ענף `claude/hybrid-access-law` (ענף Research DNA ישן ללא בסיס משותף עם `main`; לא נפתח); לא הורצו בדיקות או build.

---

## 2. ממצאים וסתירות (לפי CLAUDE.md 0.1 סעיף 6: לא מנחשים — מדווחים)

### C1. התנגשות מספרי גרסה עם חבילה ממתינה שלא הוחלה — `pack-v4` (11.11.2026)
`docs/reviews/contract-governance-audit-20261110/pack-v4/new/rules/` כבר מכילה טיוטות `research_workspace_law@v6`, `subscription_funnel_law@v23`, `platform_tiers_law@v6` (תיקוני יישור־Legacy ו־Design V2, בלי שינוי סמנטי). **אומת חי היום שאף אחת לא הוחלה** (הגרסאות הפעילות הן v5 / v22 / v5; אין שורה v6/v23 במסד, פעילה או לא). לכן הגרסאות `v6` ו־`v23` שבנוסח כאן **תפוסות בכוונה** על ידי חבילה אחרת.
**המלצה:** לפני החלה — להכריע מי קודם. אם החבילה מוחלת קודם, הנוסח כאן מקבל `research_workspace_law v7` ו־`subscription_funnel_law v24` ומתווסף אחרי הבלוקים שלה (התוכן אדיטיבי ואינו חופף: החבילה מוסיפה משפט אחד על בעל חוזה העיצוב ומסמנת רכיבי Legacy שהוסרו). אם לא — נוסח זה לוקח v6/v23 והחבילה תתחדש. **בטקסט להלן מסומנות הגרסאות כ־«v6\*», «v23\*» — הכוכבית = בכפוף ל־C1.** `canonical_ui_components_law v14` ו־`person_foundation_contract_law v7` אינם מתנגשים (אינם בחבילה).

### C2. סתירה פנימית ב־`subscription_funnel_law` — נפתרה בנוסח (O1 מציג את החלק שנשאר להחלטה)
- חוק־ברזל 3 (v2): «…אין Follow אנונימי.» (במקור המשפט נאמר בהקשר של «כל Follow מסביר מה מקבלים»; ניתן לקרוא אותו גם כ«אין Follow בלי הסבר», ולכן הוא עמום.)
- v9: «Follow … (מותר אנונימי, בלי לחסום, בלי לדרוש הרשמה לפני)» · «המנוי נשמר מיד (אנונימי=visitor_id · מחובר=user_id)».
- v10: «Follow של אורח מותר תמיד.» · v19 §1, §3: «Follow נשמר כ־interest/follow intent … אין חסימה של עצם ה־Follow לאורח».
- **הכרעה בנוסח v23\*:** המשפט «אין Follow אנונימי» נקבע כמחייב לעניין **שמירה** (אין עוד שורת מנוי חדשה לפי `visitor_id`), ו־v9/v10/v19 מתוקנים בהתאם. כך הסתירה נסגרת לכיוון שורה 23 — בהתאם להחלטת ZURIEL מ־27.11.

### C3. החלטת 18.11.2026 («פתוח לכולם, גם לאורחים») **אינה כתובה בשום חוזה**
`subscription_funnel_law` מסתיים ב־v22 (3.11). ההחלטה קיימת רק בהערת קוד (`WatchButton.jsx` שורות 35–37), בטסטים (`test/home-follow-and-links-2029.test.mjs:13-15`, `world-gallery-entry-follow-chain-2029.test.mjs:59-63` — «Re-pinned here on purpose; flagged for ZURIEL's con…») ובתכנית. היא מגדירה `publicFollow` רק לנושאים `stream:reality` ו־`series:*`. **לכן אין «תיקון» של חוק קיים — יש חור תיעודי** שהנוסח סוגר. **ההחלטה העניינית — O1 (בסעיף 4).**

### C4. פונקציית ה־claim החיה **מוחקת** את שורת האורח אחרי שהעתיקה את הנושאים
`claim_follow_prefs_from_identity()` (טריגר על `identity_edges`, `kind IN ('login','legacy_seed')`): ממזגת את `topics` של שורות האורח המוכחות לחשבון, **ואז `DELETE FROM notification_prefs WHERE user_id IS NULL AND <ערוץ זהות מוכח>`**. זה סותר את הדרישה «לא נמחק לעולם» אם מפרשים אותה בקפדנות. הערוצים (`channels`) **לא** מועברים (לא הסכמה). **ההכרעה — O2.**
נתונים חיים (27.11.2026): 107 שורות אורח ב־`notification_prefs`; 69 מהן עם נושאים; 13 עם מייל; **19 עם `identity_edges` מסוג `legacy_seed`; 0 מקושרות כרגע לחשבון** (אין `persons.account_user_id`); עדכון אחרון 2.11.2026. ב־`subscribe_events`: 252 אירועי אורח (2 מאז 1.11). כלומר ≈88 שורות אינן ניתנות לתביעה כלל (אין הוכחת זהות) ונשארות כמות שהן — וזה תקין לפי v18 §5.

### C5. אינבריאנט 6 ב־`research_workspace_law` נאכף היום בקוד ובשלושה־ארבעה טסטים
«יומן מקומי נכתב לפני שליחה; אם `persist()` נכשל — לא נשלח» (`researchSyncRuntime.js:244-250`) ננעל ב: `test/research-sync-session-fallback-2029.test.mjs:48-56` («durable storage failure is still fail-closed: nothing is sent»), `test/research-save-storage-faults-2029.test.mjs` («still fail-closed: nothing is sent without a durable journal»), `test/personal-save-decision-2029.test.mjs:54`, `src/lib/research/researchSyncRuntime.test.js:162`. **שינוי החוזה לבדו לא שובר אותם; שלב 2 של התכנית כן.** הנוסח להלן מגביל את ביטול ה־fail-closed למצב כשל־אחסון בלבד ומשאיר את היומן העמיד כשהאחסון תקין — כדי שהטסטים הללו יתעדכנו בדיוק בשורת ה־assert הרלוונטית ולא יימחקו.

### C6. שליטה בגישה: «ההרשאה אינה מתרחבת מכוח שמירה בענן»
`platform_tiers_law` (§2, §6, §15) ו־`els_research_layer_law` §11 קובעים: זמינות מגיעה ממקור שרת־סמכותי; אין אמת־גישה מקומית; Premium משפיע על עומק/תקציב לא על אמת; **שמירת מסעות והיסטוריה ב־ELS עשויות להיות מוגבלות לפי הרשאה**. «כל שמירה לחשבון» אסור שתעקוף זאת. נוסף כסעיף מפורש ב־RW v6\* (פריט 6).

### C7. `person_foundation_contract_law`: STORE ≠ PARTICIPATE ≠ ANALYZE
v3 §4, v6 «PRIVACY BEFORE COMPOSITION» ו־«FOLLOW / RELEVANCE / RAZIEL SUGGESTION REMAIN DISTINCT». העברת עוד נתונים לענן = **STORE בלבד**; אין בכך הרשאה לנתח, לדרג רלוונטיות או להשתתף במחקר קבוצתי. v6 מונה «explicit save/follow/priority signals» לצד «weaker relevance/behavior signals» כקלט **אפשרי** ל־Personal Reality; הפסקת איסוף `history` אינה סותרת («may compose»). **לא נמצא ש־Raziel קורא `history`** במיגרציית ההמשכיות האישית (`20261005210000_…phase_l_personal_research_continuity_read.sql`: אין אזכור `history`/`journeys`/`collections`); לא נבדקו שאר הקוראים.

### C8. «הצעת כניסה בנקודת הפעולה» אינה פותחת יכולת נעולה (`canonical_ui_components_law` v4/v12; `publicReadingActionsLocked`)
בייצור המעקבים נעולים לציבור (`publicReadingActionsLocked`); פתוחים רק: `stream:reality`, `series:*` (18.11), `communityThread` לחשבון מאומת, ופאנל הפוסט — **רדום** (`POST_FOLLOW_PUBLIC_2029 = false`, חבילת הפעלה נפרדת). שמירה אישית נעולה לאורח (`personalActionsLocked`) ופתוחה למאומת. לכן: הצעת כניסה נוספת **רק כשהפעולה עצמה פתוחה למי שייכנס**; הצעה אינה מפעילה יכולת. **ב־v14\* פריט 3.** נוסף: v12 §5 — «No signup/account mutation in a Preview designated existing-accounts-only».

### C9. הרשמה חדשה בנקודת פעולה = חשבון חדש ← חל `subscription_funnel_law v22` (עדכוני אתר כברירת מחדל)
v22 דורש «הודעה ברורה לפני ההרשמה»; כניסה לחשבון קיים/Follow/קריאה אינן מצרפות. הנוסח (v23\* פריט 5, v14\* פריט 3) מחייב להציג את ההודעה גם בהרשמה שנפתחה מתוך מעקב/שמירה/תגובה, ושומר: כוונה ממתינה **אינה נושאת ערוץ**.

### C10. חבילת ההפעלה `follow-public-activation-20261126` מניחה את המודל הישן
שלב 4 בה: «אורח (מעקב נשמר כ־follow intent ואז בקשת אימות זהות …)». **חייב להתיישר לנוסח v23\* לפני שמעבירים את `POST_FOLLOW_PUBLIC_2029` ל־`true`** (אחרת תיפתח לציבור חוויית אורח שנוגדת את ההחלטה).

### C11. תגובת אורח שנהפכת לתגובת חשבון — הבהרה, לא סתירה (ZURIEL לאשר)
החלטה 3: «תגובות אורח נשארות כפופות לאישור מנהל». בקוד/מסד: `add_contribution` מחזיר `approved` מיד לחשבון מאומת עם intent `תגובה`, ו־`pending` לאורח. תגובה שנכתבה כאורח ופורסמה אחרי שהכותב השלים כניסה **היא תגובת חשבון → מאושרת מיד** (כמו `communityGuestPost` היום ו־`publishing_conventions` 530–531). הנוסח (RW v6\* פריט 5) אומר זאת במפורש. אם ZURIEL רוצה שגם תגובה כזו תחכה לאישור — זו החלטה אחרת (שינוי `add_contribution`, אישור 0.4).

### C12 (F9). מה שלושת החוזים החדשים (ELS, platform_tiers, Raziel) מטילים על התכנית
**לא נדרש תיקון טקסט באף אחד מהם.** נדרש לתקן את **התכנית** (F9, שלב 4 סעיף 3, F7/F8):
1. **`els_research_layer_law` §9, §35:** רשומה ישנה/מקומית ללא קואורדינטות, corpus ומעקב מלא נשארת **היסטורית/לא־פתורה**; אסור להמציא provenance; `status=published`, תמונה או כותרת אינם הוכחת אימות. ← העלאת `elscode_saved_v2` לענן חייבת להסמן כל פריט כ־**חומר היסטורי לא מאומת**, בלי `published`, בלי טענת replay, ובלי שדות שלא היו בו.
2. **`save_els_matrix` החי** (נבדק): `p_public` ברירת מחדל **`true`** — חבר רגיל מקבל `status='draft'`, `visibility='public'` («גלוי בעמוד האישי שלו», לא בספרייה המרכזית); מנהל מקבל `published`. ← העלאה גורפת בקריאה בברירת מחדל **תחשוף פומבית** רשימות פרטיות. **חובה: `p_public=false` (פרטי) כברירת מחדל בהעלאה, ומעבר לציבורי רק בפעולה נפרדת מפורשת** (`person_foundation_contract_law v6`: «PRIVATE MATERIAL → PUBLIC RESEARCH IS EXPLICIT»).
3. **`elscode_proposals_v1`, `elscode_global_v1`** (הצעות/גלובלי): אינם «מחקר אישי» — מנתיב קהילה/ציבור; לא מועלים אוטומטית ולא נכנסים לשום ספרייה ציבורית בלי שער אנושי (`els` §10 + Human Gate).
4. **`els` §25, §28:** תוצאות Monte-Carlo מהדפדפן (`Math.random()`) אינן סמכות מחקרית. אם נשמרות — מסומנות «לא ניתן לשחזור», בלי שפה של מובהקות.
5. **`els` §35, §79–80:** שמירת מצב ELS לשחזור = חבילה סמנטית מלאה; מעבר Classic↔Research משמר מצב ו«HIDDEN ≠ DELETED». ← הרשימות המקומיות אינן «מצב ELS שנשמר»; העלאתן מסומנת כ־legacy import. העדפת Classic/Research (§81) היא העדפת תצוגה מקומית קטנה (K) ואינה מועלית לענן במסגרת זו.
6. **`els` §11 + `platform_tiers` §2, §6, §15 + `raziel` §7:** שמירה בענן אינה מרחיבה הרשאה; יכולת שמוגבלת לפי הרשאה (מסעות/היסטוריה ב־ELS, Research Dossier, Private Research Corpus) נשארת מאחורי השער השרת־סמכותי גם כשהיא נכתבת «לחשבון». כוונה ממתינה לא נושאת כל טענת זכאות.
7. **`raziel_companion_layer_law` §1, §8:** זהות/זיכרון Raziel אחד, וכישלון קול «אינו מוחק מצב מחקר». ← עקבי עם שלב 2 (כשל אחסון מקומי לא מאבד שמירה). אין מקור זיכרון חדש; «הרמזים שלי»/מחקר בענן הם קלט מורשה בלבד.
8. **`platform_tiers` §6 (future hooks):** «No local hard-coded access truth» — אין לאחסן במכשיר דגל גישה כ«אמת»; ה־pending intent אינו נושא זכאות.

---

## 3. נוסח התיקונים לפי חוזה

מוסכמות: **טקסט ישן** מצוטט מילה במילה מהמסד. **טקסט חדש** = הנוסח המלא של הסעיף/הבלוק המוצע. הנוסח באנגלית היכן שהחוק כתוב באנגלית (RW, Person), ובעברית היכן שהחוק בעברית (SF, UI); מתחת לכל בלוק — שורת תקציר בעברית. «מי מושפע» = קוד/מסמכים/טסטים; הפירוט המלא בסעיף 7.

### 3.1 `research_workspace_law` — v5 → **v6\***

**סיבה:** אינבריאנט 6 קובע «LOCAL-FIRST» והוא יסוד חוזי לתכנית בקוד (`researchSyncRuntime.js`), ולכן מתנגש עם ההחלטה «שמירות קבועות בחשבון הענן». נדרש גם בסיס חוזי ל«כוונה ממתינה» ולהגירה מקומית→ענן, ולתיעוד תגובה בפוסט (סעיף 8 של v3).
**מי מושפע:** `researchSyncRuntime.js`, `PersonalSaveButton2029.jsx`, `PostCommentComposer2029.jsx`, מסך «המחקר שלי»; הטסטים ב־C5; מחרוזות provenance `research_workspace_law v5` בקוד (סעיף 7.4).

#### תיקון א — אינבריאנט 6 (החלפת נוסח)

טקסט ישן (גוף v2, CORE INVARIANTS):
> 6. LOCAL-FIRST WHERE ALREADY SUPPORTED, CLOUD SYNC WHERE AUTHORIZED. Do not destroy or orphan existing personal research state during shell migration.

טקסט חדש (נכנס כבלוק `[UPDATE v6* …]`; הישן נשאר כהיסטוריה וגובר עליו הנוסח הבא):
> [UPDATE v6* · Human-Gate ZURIEL · <date> — CLOUD-FIRST PERSONAL STATE · EXTEND_EXISTING]
>
> 1. INVARIANT 6 IS REPLACED. «6. CLOUD-FIRST FOR THE AUTHENTICATED PERSON; LOCAL STATE IS A BOUNDED CACHE OR A PENDING INTENT. Every personal save of an authenticated person (item, collection, follow, hint, comment, Journey) is written to that person's cloud account, which is its permanent home; a save is permanent until the person removes it. Device storage (localStorage/sessionStorage/cookie) is never the research store. Do not destroy or orphan existing personal research state during shell migration (unchanged).»
>
> 2. NO LOCAL PRECONDITION. A local write is never a precondition for a server write of the same action. While device storage is healthy, the existing durable pending journal (batch id, expected revision, durable receipts, one owned journal per tab) is kept exactly as is. When device storage is full, blocked or corrupt, the runtime sends the batch from memory only: status stays «syncing/pending» (never «saved»), a network failure leaves the item visibly pending, and the person is warned before leaving the page while a memory-only batch exists. «Saved in the account» may be shown only after a server receipt (applied_revision). No existing `:pending:`, `:conflict:` or `:localonly` state is deleted or overwritten by this clause.
>
> 3. PENDING INTENT (bounded). A signed-out visitor who performs a personal action of kind save, follow or post_comment is offered sign-in or sign-up at that action (canonical_ui_components_law v14*). The action is kept as ONE bounded record per kind: {kind, target, createdAt, expiry}, plus the text body only for post_comment (bounded length). It carries no identity, no entitlement and no channel consent. It is completed automatically, exactly once, under `auth.uid()` of the account that finishes the sign-in begun from that action and arriving through that exact return context; the stored record is never a source of authority (person_foundation_contract_law §5). The record is deleted only after a server receipt, and expires after a fixed, documented lifetime (not more than 6 hours). It exists only for an explicit user action and only where the action itself is available to the person who will sign in.
>
> 4. MIGRATION IS UPLOAD → RECEIPT → OPTIONAL REDUCTION. Items that exist only on a device move to the account by an explicit user action or by a pending intent; they leave the device only after a server read-back receipt and only at the person's explicit request. No blanket cleanup. Legacy journeys (`journey_saves`, `user_research.journeys`, historical addJourney collections) migrate adapter-first and explicitly, are not counted as Journey 2029 starts and are not blended into public Pulse (the 27.9.2026 LEGACY EXCLUSION remains in force). Local ELS lists (`elscode_*`) are uploaded as historical, unverified, PRIVATE material by explicit action, with no invented lineage, never as published or verified findings (els_research_layer_law §9, §35).
>
> 5. NO UNNEEDED PERSONAL HISTORY. Device identifiers, counters and history are not newly collected unless they serve a capability the person asked for; every such collection is recorded in its own owner law. Existing history is preserved and read; stopping a specific write requires a decision for that key.
>
> 6. NO ACCESS EXPANSION. Persisting to the account grants no entitlement and bypasses no gate. Capabilities limited by entitlement or budget (platform_tiers_law, els_research_layer_law §11) stay behind the server-authoritative gate. Storing is not participating in research, analysing, or ranking relevance (person_foundation_contract_law STORE ≠ PARTICIPATE ≠ ANALYZE).

תקציר: הענן הוא המקום הקבוע; האחסון המקומי הוא מטמון/כוונה ממתינה תחומה בלבד; יומן עמיד נשאר כשהאחסון תקין; הגירה = העלאה→אישור→צמצום אופציונלי; אין הרחבת הרשאה.

#### תיקון ב — סעיף 8 של v3 (הרחבה לתגובה בפוסט; תיעוד הקיים)

טקסט ישן (v3):
> 8. RESEARCH CONTRIBUTIONS ARE AN INPUT PIPELINE, NOT A SECOND GOVERNANCE SYSTEM. Existing research_contributions data may continue to store community/research input. Any local moderation/research_state vocabulary cannot outrank Truth Axes. Candidate/approved/canonical/published transitions follow current Truth/Human-Gate owners; old contribution UI/lifecycle wording is historical where it conflicts.

טקסט חדש (פריט נוסף בבלוק v6\*, אינו מחליף את ס' 8):
> 7. POST COMMENTS (documentation of the existing path, ZURIEL 25–27.11.2026; no new semantics). A comment on a post is a `research_contributions` row with `target_type='post'`, `target_id=<canonical posts.id>`, `origin='community_2029'`, intent «תגובה». A verified account's comment is approved immediately; a **guest comment (posted without signing in) is `pending`, is not public before admin approval, and that decision stands**. A comment written signed-out and published after the author completes sign-in is the account's comment (approved) and is published once, via pending intent (item 3). No parallel comments system, store or law is created; Truth/Human-Gate transitions are unchanged.

תקציר: אישור מנהל לתגובת אורח נשמר; תגובה שפורסמה אחרי כניסה היא תגובת חשבון (ראו C11).

---

### 3.2 `canonical_ui_components_law` — v13 → **v14\***

**סיבה:** v12 קובע «ONE AccountEntry2029» ו«Preserve the exact authorized local return context»; חסר: כניסה **בנקודת הפעולה** (inline), נשיאת כוונה ממתינה, וכללי אמת לסטטוס «נשמר». הלקוח הנוכחי: «יש להתחבר לחשבון קיים, ואז ללחוץ שוב» (`PersonalSaveButton2029.jsx:41`).
**מי מושפע:** `AccountEntry2029.jsx`, `oauthReturn.js` (עוגן `#post-comments` כבר מותר ב־`/^#[\p{L}\p{N}_:.-]{1,250}$/u`), `PersonalSaveButton2029`, `WatchButton`, `PostCommentComposer2029`; מצביע האינדקס (7.2).

טקסט ישן (v12, פריט 4):
> 4. Preserve the exact authorized local return context, current session and refresh/account-switch behavior. Opening a public profile is never private-area access. Display names, email strings and provider labels never grant ownership/admin authority, and linking/merging identities remains explicit under Person/Human Gate.

טקסט חדש (בלוק נוסף; פריט 4 של v12 נשאר ומורחב באמור):
> —— v14* · ZURIEL <date> — כניסה בנקודת הפעולה (ACCOUNT ENTRY AT THE POINT OF ACTION) ——
> Owner check: EXTEND_EXISTING canonical_ui_components_law v12 (CANONICAL ACCOUNT ENTRY); אין רכיב כניסה, ספק, מערכת זהות או חוזה כניסה לכל משטח.
> 1. פעולה אישית שמחייבת חשבון (שמירה, מעקב, תגובה, פרסום) מציעה את `AccountEntry2029` באותו משטח (`inline`), בלי ניווט לדף אחר ובלי הנוסח «התחבר ואז לחץ שוב». כניסה והרשמה הן אותו רכיב; הצעת ההרשמה אינה רכיב נוסף.
> 2. נתיב החזרה של v12 פריט 4 נושא גם מזהה אופציונלי של **כוונה ממתינה** (research_workspace_law v6* פריט 3), והמשתמש חוזר לאותה נקודה מדויקת (נתיב, עוגן, פריט) והפעולה מושלמת פעם אחת. כוונה שאינה מגיעה דרך הקשר חזרה תקף אינה מושלמת. החלפת חשבון באותו דפדפן אינה מעבירה כוונה לחשבון אחר.
> 3. **גבולות:** (א) ההצעה מוצגת רק כשהפעולה עצמה פתוחה למי שייכנס; יכולת נעולה (`site_flags`, גרסת קריאה ציבורית, v4) אינה נפתחת בגלל הצעת כניסה. (ב) בסביבה שמוגדרת «existing-accounts-only» אין הרשמה (v12 פריט 5). (ג) הרשמה חדשה מציגה את ההודעה של `subscription_funnel_law v22` לפני ההרשמה; כניסה לחשבון קיים אינה מצרפת לדיוור; כוונה ממתינה אינה נושאת ערוץ. (ד) לא נשלח OTP/קוד ללא בקשת המשתמש להיכנס.
> 4. **אמת הסטטוס:** «נשמר» / «בוצע מעקב» מוצגים רק אחרי אישור שרת. כישלון נשאר גלוי עם קוד כשל אמיתי ועם נתיב `IssueReport` הקנוני (v6); אין הודעה כמו «הטקסט נשמר כאן» כשהוא קיים רק בזיכרון הלשונית.
> 5. `sessionStorage`/`localStorage` של נתיב החזרה והכוונה הם כלי תחום (TTL, גודל, מפתח אחד לכל מטרה), אינם מקור אמת ואינם תנאי מקדים לשליחה.
> 6. Merge Gate: מימוש חדש של פעולה שמחייבת חשבון שמפנה לדף נפרד בלי הקשר חזרה, או שמחזיק רשימת ספקים/טופס OTP משלו = FAIL (משלים את v12 פריט 6). גרסה זו אינה אישור למיזוג, לפריסה או לשינוי נתונים.

תקציר: כניסה inline בנקודת הפעולה עם חזרה מדויקת וכוונה ממתינה; לא פותח יכולות נעולות; מציג את הודעת v22 בהרשמה חדשה; «נשמר» רק אחרי אישור שרת.

---

### 3.3 `person_foundation_contract_law` — v6 → **v7\***

**סיבה:** מעבר גדול של נתונים לענן = הרחבת STORE; יש לקבוע שהוא אינו הרשאה לניתוח/רלוונטיות, שמצב מכשיר אינו רשומה אישית, ושהשלמת כוונה נעשית בהרשאת שרת. מבוסס על v3 §4–5, Bedrock ו־v6 «PRIVACY BEFORE COMPOSITION».
**מי מושפע:** מסמכי/קוד היסטוריה אישית (`history_add` ב־`ResearchProvider.jsx:220,232` — רק בהחלטה נפרדת), `person-identity-bridge` (אין שינוי בקוד).

טקסט ישן (v6, שלוש הפסקאות הרלוונטיות):
> PERSONAL REALITY IS AN AUTHORIZED CONTEXTUAL PROJECTION, NOT A FEED/STORE. It may answer “what in the shared reality materially touches my current research/world?” by composing the same canonical identities and public/governed research with authorized private Person/Life research state plus explicit save/follow/priority signals and weaker relevance/behavior signals.
>
> PRIVACY BEFORE COMPOSITION. Private Person/Life inputs, memories, observations and relations are filtered by authorization before retrieval/composition and may never leak into public/shared projection or another user context. Exact return/resume preserves Person scope and relevant provenance without exposing unrelated private state.
>
> FOLLOW / RELEVANCE / RAZIEL SUGGESTION REMAIN DISTINCT. Explicit Follow is user intent; inferred relevance is a contextual signal; Raziel suggestion is a recommendation. Personal Reality may compose all three as labeled inputs but never collapse them or infer delivery consent.

טקסט חדש (בלוק נוסף; הפסקאות הישנות נשארות):
> [UPDATE v7* · Human-Gate ZURIEL · <date> — CLOUD STORAGE IS STORE, DEVICE STATE IS NOT A PERSON RECORD · EXTEND_EXISTING]
>
> 1. ACCOUNT IS THE PERSONAL RECORD. A person's saved research, follows and hints are stored and read from the authenticated account. Device state (localStorage/sessionStorage/cookie, including `visitor_id`) is not a Person record and is never a source for deciding interest, context or identity. A guest `visitor_id` row is not a Person; it is attached to an account only through the existing proof path (subscription_funnel_law v18 §5), never by a visible id alone (consistent with cross_reference_is_not_disclosure).
> 2. STORE ≠ PARTICIPATE ≠ ANALYZE. Moving personal saves/follows to the cloud is STORE only. It does not authorize relevance ranking, Personal Radar/Alert, cohort participation, Raziel analysis or promotion; each remains a separate authorization axis (v3 §4). Follow, relevance and Raziel suggestion stay distinct (v6); saving or following never infers delivery consent.
> 3. PENDING INTENT HOLDS NO AUTHORITY. A stored pending intent is provenance input only (v3 §5). Its completion is performed server-side under `auth.uid()`; client-supplied user/actor/role text never grants authority.
> 4. NO DEFAULT HISTORY COLLECTION. View history and personal counters are not collected by default; collecting any of them needs an explicit justification and retention bound in its owner law. Already-collected history is preserved and remains private to the account (privacy before composition). This clause neither deletes existing history nor requires any particular signal to be collected for Personal Reality.
> 5. PRIVATE → PUBLIC IS EXPLICIT. Uploading local or legacy personal material to the account creates private account state. Making it public/contributing it to research uses the existing Intake/Contribution/Human-Gate path and an explicit person action; the upload never publishes, canonicalizes or verifies anything.

תקציר: ענן = שמירה בלבד; אין הרשאה לנתח/לדרג; מצב מכשיר אינו רשומה אישית; השלמת כוונה בהרשאת שרת; אין איסוף היסטוריה כברירת מחדל (הקיים נשמר); העלאה פרטית כברירת מחדל.

---

### 3.4 `els_research_layer_law`, `platform_tiers_law`, `raziel_companion_layer_law` — **ללא תיקון**
נקראו במלואם; הנוסח של 3.1–3.3 עומד בהם (ראו C12). **נדרש רק תיקון התכנית** (F7–F9, שלב 4), לא החוקים. טסטים שנועלים את ELS v9: `test/els-g3-runtime-scanner-controls.test.mjs:192-208`, `test/g3-client-correlation.test.mjs:43-44` — לא מושפעים.

---

## 4. התאמת חוק המעקב — `subscription_funnel_law` v22 → **v23\***

### 4.1 מה משתנה בקצרה
1. **Follow נשמר בחשבון הענן** — קבוע (אינו פג ואינו נמחק בניקוי מטמון); רק המשתמש מסיר.
2. **מבקר שלא מחובר** שלוחץ מעקב **מוצעת לו כניסה/הרשמה באותה נקודה** (`AccountEntry2029` inline) עם **חזרה מדויקת**; לא נכתבת שורת מנוי חדשה לפי `visitor_id`.
3. **כוונת Follow ממתינה** (topic + source + זמן, פג) נשמרת רק עד השלמת הכניסה; אחרי אימות — Follow לחשבון פעם אחת.
4. **שורות אורח קיימות** — נשמרות, ניתנות לתביעה בהוכחה בלבד, ולא נמחקות בקוד חדש (ראו O2 לגבי ה־claim החי).
5. **החלטת 18.11** — מתועדת וקובעת מי רואה את הכפתור; **היכן נשמר** נקבע לפי ההחלטה של 27.11 (O1).

### 4.2 נוסח התיקון (עברית; בלוק נוסף בסוף החוק, אחרי v22)

טקסטים ישנים שמתוקנים (צוטטו מהמסד):
- חוק־ברזל 3 (v2): «כל Follow מסביר מה מקבלים במשפט אחד («תקבל עדכון כשיתפרסם צופן חדש» / «…מחקר חדש בנושא»). אין Follow אנונימי.»
- v9, עיקרון: «Follow = פעולה ראשונה בחיכוך-מינימלי (מותר אנונימי, בלי לחסום, בלי לדרוש הרשמה לפני).»
- v9, חוק־ברזל: «Follow יכול להיות אנונימי/לפני-הרשמה, אבל מרכז-העדכונים המלא שייך רק למשתמש רשום/מנוי.»
- v9, שלב 1 במסע: «Follow (השער) — … לחיצה אחת → «נעקוב עבורך». המנוי נשמר מיד (אנונימי=visitor_id · מחובר=user_id).»
- v9, מצב אחרי Follow: «לא-רשום → «✓ עקבת» → «כדי לנהל את כל העדכונים שלך במקום אחד — הצטרף לסוד 1820».»
- v10: «Follow של אורח מותר תמיד. אחרי Follow: אורח → «✓ עקבת · הצטרף כדי לנהל את כל העדכונים שלך במקום אחד» · רשום → «✓ אתה במעקב · רוצה Push? / פתח מרכז».»
- v19 §1: «אורח/לא-רשום: Follow נשמר כ-interest/follow intent; הצעד הבא היחיד הוא בקשת הרשמה/אימות זהות כדי לשמור ולנהל את המעקב. אין הצעת Push/Email/WhatsApp בשלב זה.»
- v19 §3: «אין חסימה של עצם ה-Follow לאורח. אין המרה אוטומטית לניוזלטר ואין opt-in אוטומטי לערוץ.»
- v19 §4: «Guest: Content→Follow→Signup/Verify→Center/Channels.»
- v12, מפת «נשמר-מקומית»: «… כולם מסתנכרנים-לענן רק בהתחברות דרך auth-blob — נפרד מטבלת research_items. צעד 7 מאחד את שלושתם למקור-אמת אחד.»

טקסט חדש:

> == v23* — FOLLOW נשמר בחשבון הענן; כניסה בנקודת הפעולה (ZURIEL <date>) ==
> OWNER CHECK: EXTEND_EXISTING subscription_funnel_law. אין מנוע, טבלה, רכיב או חוק מקביל; WatchButton, EmailVerify/OTP ו־`watch_toggle` נשארים; אין שינוי DB מכוח הבלוק הזה.
>
> 1. **שמירה בחשבון.** Follow הוא מנוי של **חשבון מאומת** (`user_id`) ונשמר בו באופן קבוע. אין עוד שורת מנוי חדשה לפי `visitor_id` ואין `subscribe_events` חדש עם `visitor_id` בלבד. המשפט «אין Follow אנונימי» (חוק־ברזל 3) הוא המחייב לעניין שמירה; הניסוחים «מותר אנונימי» (v9), «המנוי נשמר מיד (אנונימי=visitor_id · מחובר=user_id)» (v9 שלב 1) ו«Follow של אורח מותר תמיד» (v10) מתוקנים בזאת, וכן v19 §1 («נשמר כ-interest/follow intent» = כוונה ממתינה לפי פריט 2, לא שורת מנוי) ו־v19 §3 («אין חסימה של עצם ה-Follow לאורח» = הלחיצה אינה נחסמת; היא מובילה לכניסה).
> 2. **כניסה בנקודת הפעולה, חזרה מדויקת.** אורח שלוחץ על כפתור מעקב **שפתוח לו** (v18 §1: אותה לוגיקה בכל ה־variants) מקבל באותה נקודה הצעת כניסה/הרשמה (`AccountEntry2029` inline, canonical_ui_components_law v14*) ו**כוונת Follow ממתינה אחת לכל topic**: {topic קנוני, source, זמן יצירה, פקיעה}; לא נשמרים בה זהות, ערוץ או הרשאה. אחרי כניסה מאומתת דרך אותו הקשר חזרה — המערכת מבצעת Follow לחשבון **פעם אחת** (idempotent; Follow קיים אינו יוצר מנוי כפול ולא `subscribe_event` נוסף, v3), רושמת `subscribe_events` עם `user_id` ו־source, ומציגה «✓ אתה במעקב» רק אחרי אישור שרת. אם הכניסה לא הושלמה — דבר לא נשמר, והכוונה פגה (עד 6 שעות). אין פופאפ או חסימת קריאה כפויים (v18 §1).
> 3. **הפרדות נשמרות במלואן.** `FOLLOW_INTENT ≠ VERIFIED_IDENTITY ≠ CHANNEL_OPT_IN ≠ DELIVERY_READY ≠ SENT ≠ DELIVERED` (v18 §3). אחרי השלמת הכניסה הצעד הבא הוא כמו למשתמש רשום: הצעת ערוץ (Push/Email) רק בבחירה מפורשת נפרדת (v19 §2). אנליטיקה (v19 §6) מפרידה: `follow_intent_started`, `signup_prompted`, `signup_started`, `identity_verified`, `follow_saved` (רק אחרי שמירה בחשבון), `channel_prompted`, `channel_opted_in`; בלי PII.
> 4. **הרשמה חדשה בנקודת מעקב.** כשהכניסה יוצרת חשבון חדש חלה v22 במלואה, כולל **הודעה ברורה לפני ההרשמה** על עדכוני האתר; Follow, כוונה ממתינה וכניסה לחשבון קיים אינם מצרפים לדיוור. אין opt-in אוטומטי לשום ערוץ אחר.
> 5. **שורות אורח קיימות — נשמרות.** `notification_prefs.visitor_id` ו־`subscribe_events` של אורח (חי 27.11.2026: 107 שורות מנוי · 252 אירועים) **אינם נמחקים, אינם נבדלים ואינם נתבעים בכוח** בידי שום קוד חדש. הן **ניתנות לתביעה** לחשבון אך ורק דרך מסלול הזהות המוכח הקיים (`identity_edges` מסוג `legacy_seed` + אימות; v18 §5: אין לתבוע לפי `visitor_id` גלוי בלבד), עם ערוצים שאינם עוברים (הסכמה אינה עוברת), `subscribe_events` נשאר append-only, וכישלון קישור נשאר גלוי וניתן לניסיון חוזר. אורח עם שורה ישנה רואה אותה כ«במעקב» ומוצעת לו כניסה עדינה להשלמה (v18 §1); הוא רשאי **לבטל** מעקב ישן שלו (הסרת נושא = עדכון `topics` + `unfollow`, לא מחיקת שורה). **[נוסח מחייב: מחיקת שורת אורח ע״י ה־claim — O2, בחירה א׳ או ב׳ להלן.]**
> 6. **נקודת הפתיחה לאורחים (החלטת 18.11.2026).** ההחלטה «פתוח לכולם, גם לאורחים» קובעת **מי רואה ומי יכול ללחוץ** על מעקב `stream:reality` ו־`series:*` בגרסת הקריאה הציבורית; היא נשארת. **היכן נשמר המעקב נקבע לפי פריט 1.** **[O1 — ראו להלן; נוסח ברירת המחדל: אורח שלוחץ על הפעמון בבית מקבל כניסה בנקודה (פריט 2) ולא שורת `visitor_id`.]** כל מעקב אחר נשאר סגור בגרסת הקריאה (בהתאם `publicReadingActionsLocked`); הצעת כניסה אינה פותחת אותו.
> 7. **מפת «נשמר־מקומית» (v12).** מתעדכנת: הפריטים שהוזכרו בה (`els_saved/els_findings`, `sod_notes_v1`, `maftech_history`, `collections+journeys`) מועברים/מועלים לחשבון לפי research_workspace_law v6*; הם **חומר מקור היסטורי**, אינם «מתאדים לאורח» (אך אינם נמחקים), והאיחוד נעשה בפעולה מפורשת (v6* פריט 4). מקור האמת של הנשמר הוא החשבון.
> 8. **מה לא משתנה:** v2 חוקי־ברזל 1,2,4–8; v3 אידמפוטנטיות ו־append-only; v5/v6/v10 מפת היעדים (cat/number/stream/codes — כל יעד חדש = שורה במפה קודם); v7 (`code:<slug>` לא מוצג); v8/v10 (אין מעקב פוסט בודד); v11–v12 (Identity ≠ שם); v15 (batching); v18 §§2,4,6,7; v19 §2,5; v20; v22 (חריג מצומצם). `notify_*`, dispatcher, resolve_topics, fan-out — ללא שינוי.
> 9. **מצב:** GOVERNANCE PROPOSED. יישום ≠ מיזוג ≠ פריסה ≠ אימות חי. `POST_FOLLOW_PUBLIC_2029` נשאר `false`; חבילת ההפעלה 26.11 מתיישרת לבלוק הזה לפני כל הפעלה.

### 4.3 מה קורה לשורות האורח הקיימות — פירוט (להחלטה O2)

| מצב שורת אורח | מה נשמר | מה קורה בנוסח |
|---|---|---|
| ללא `identity_edges` (≈88 מ־107) | `topics`, `channels`, `email`, `visitor_id`, `subscribe_events` | נשארת כמות שהיא. אין תביעה (אין הוכחה). אין מחיקה. |
| עם `legacy_seed` ללא חשבון מקושר (19; 0 מקושרות) | כנ״ל | ניתנת לתביעה כשהאורח מאמת חשבון (מסלול קיים). |
| נתבעת (עתידי) | נושאים → `notification_prefs(user_id)`; ערוצים **לא**; אירועים נשארים עם `visitor_id` | **נוסח קיים בקוד: שורת האורח נמחקת אחרי המיזוג** — O2. |
| אורח עם שורה ישנה לוחץ «ביטול מעקב» | — | מותר: הסרת נושא (`unfollow`), לא מחיקת שורה. |
| אורח לוחץ מעקב חדש | — | אין שורה חדשה; כוונה ממתינה + כניסה. |

### 4.4 החלטות פתוחות ל־ZURIEL (שנוגעות לחוק המעקב)

- **O1 — 18.11 מול 27.11.** שתי החלטות נכונות; יש לקבוע איך הן מתיישבות. **א׳ (מומלץ, מוצג כברירת מחדל בנוסח):** הכפתור נשאר פתוח לכולם (18.11) והלחיצה של אורח מובילה לכניסה בנקודה ולשמירה בחשבון (27.11); אין שורת `visitor_id` חדשה. **ב׳:** חריג מפורש לשני הנושאים בלבד (`stream:reality`, `series:*`) — לחיצת אורח נשמרת כשורת `visitor_id` כמו היום (ניתנת לתביעה), וכל השאר לפי א׳. ב׳ משמרת חיכוך אפסי לאורח בבית, אך שומרת מקור־אמת לא־חשבוני לשני נושאים ונוגדת «קבוע בחשבון». **נדרשת הכרעתך; בלעדיה לא ניתן ליישם את הבלוק.**
- **O2 — מחיקת שורת אורח ב־claim.** `claim_follow_prefs_from_identity` מוחקת את שורת האורח אחרי המיזוג לחשבון. **א׳ (תואם את הקוד החי):** «לא נמחק לעולם» מתפרש כ«לא נמחק ולא אובד תוכן» — הנושאים עוברים לחשבון, ההיסטוריה נשמרת ב־`subscribe_events`, והמחיקה היא צריכת השורה בתביעה מוכחת בלבד. **ב׳ (קפדני):** שורת האורח נשמרת עם סימון «נתבעה» — **דורש שינוי פונקציה ב־DB (אישור 0.4 נפרד; כאן לא נכתב SQL)** ועדכון `test/fixtures/community-thread-follow-*.sql`. הנוסח ב־4.2 פריט 5 מנוסח כך שהוא נכון לשתי הבחירות; ההכרעה קובעת את ה«[נוסח מחייב]» בסופו.
- **O3 — לאיזה חשבון מוחלת כוונה ממתינה (החלטה 3א בתכנית).** הנוסח (RW v6\* פריט 3, UI v14\* פריט 2) קובע: **רק לחשבון שהשלים את הכניסה שהתחילה מאותה פעולה**, דרך הקשר חזרה תקף — **ולא** לכל חשבון שיסיים כניסה באותו דפדפן. זה שונה מהמלצת התכנית («כמו הקהילה») ומהסיבה: בקהילה הטקסט הוא של הכותב ופומבי; בשמירה/מעקב התוצאה נכנסת למצב **פרטי** של חשבון, ו־person_foundation_contract_law (PRIVACY BEFORE COMPOSITION; Bedrock) מצדיקה קשירה צרה. אם תעדיף את גישת הקהילה — לשנות את הפריט.
- **O4 — גרסאות (C1).** האם להחיל קודם את `pack-v4` (ואז v7/v24), או להקדים את הנוסח הזה (v6/v23).
- **ברירות מחדל שבחרתי — לאישור:** פקיעת כוונה ≤ 6 שעות (כמו `communityGuestPost`); ביטול מעקב ישן של אורח מותר; העלאת רשימות ELS פרטית כברירת מחדל; `elscode_proposals/global` אינם מועלים אוטומטית; ELS אנונימי (`save_els_matrix_anon`, מסלול הגשה ציבורי עם `pending`) נשאר מחוץ ל־Cloud First האישי ואינו משתנה.

---

## 5. השפעה על תיעוד קנוני

- **מסמך 37 / `project_codex` / Owner Index:** לא עודכנו. **ממתין** (בעלים: סשן שיחיל את החוזים, באישור ZURIEL). בעת החלה יש לעדכן אותו־זמנית: `SOD1820_MASTER_OWNER_INDEX.md` שורות 79 (`research_workspace_law`), 167 (`person_foundation_contract_law`), 168 (`subscription_funnel_law`), 199 (`canonical_ui_components_law`) — מצביעי גרסה בלבד (דפוס «version-pointer correction, not a new owner»); ו־`SOD1820_MASTER_STATE.md`/`ROADMAP.md` רק אם מצב Cloud First נזכר שם (לא נבדק).
- `docs/2029-data-placement-retention-crosswalk.md` (שורת `research_contributions` / personal client state): **ממתין**, שלב 6 של התכנית.
- `docs/reviews/follow-public-activation-20261126/README.md` שלב ג.4: **ממתין** (C10).
- לפי AGENT_HANDOFF «השפעה על התיעוד הקנוני»: **אין שינוי נדרש לתיעוד שכבר מתאר את המצב החי** (שום חוזה אינו משונה כאן); **ממתין** לכל האמור לעיל, בעלים: ZURIEL להחלטה, סשן יישום להחלה.

---

## 6. סדר החלה מוצע (לא בוצע; כל שלב באישור מפורש נפרד)

1. החלטות O1–O4 (סעיף 4.4) + אישור הנוסח (3.1–3.3, 4.2).
2. הכרעה על `pack-v4` (C1) וקביעת מספרי הגרסאות.
3. החלה כ־`rule_versioning` (שורה חדשה, פעילה; הקודמת מושבתת; תוספת אדיטיבית) — **עבודת DB נפרדת באישור 0.4**.
4. עדכון תמונת חוקים מתוארכת (`audits/g1-agent-entry/G1_LAWS_ACTIVE_SNAPSHOT_<תאריך>.txt`, קובץ חדש; לא עורכים את 12.11), מצביעי Owner Index, והטסט `test/world-topic-gallery-state-map-2029.test.mjs:10` (מצביע `v13 ACTIVE`) — באותו PR.
5. רק אז שלב 1 של התכנית בקוד. שלב 2 דורש עדכון ממוקד של ה־asserts ב־C5.

---

## 7. קוד וטסטים שנועלים היום את הנוסח/ההתנהגות הישנים (grep ב־`test/`, `scripts/`, `src/`, `supabase/`, `docs/`; לא הורצו)

### 7.1 נועלים את «מקומי קודם / fail-closed» (אינבריאנט 6) — ישתנו בשלב 2 (לא בגלל נוסח החוק)
| קובץ | מה נעול |
|---|---|
| `src/lib/research/researchSyncRuntime.js:244-250` | הערה «Commit … to local storage BEFORE sending it» ו־`if (!persist()) { notify(); return; }` |
| `test/research-sync-session-fallback-2029.test.mjs:48-56` | «durable storage failure is still fail-closed: nothing is sent» (`syncStatus === 'local_error'`, 0 פריטים בשרת) |
| `test/research-save-storage-faults-2029.test.mjs` (מקרה «a full store…») | «still fail-closed: nothing is sent without a durable journal» + `storageIssue === 'quota'` |
| `test/personal-save-decision-2029.test.mjs:54` | «blocked durable storage keeps the item queued (fail-closed)» |
| `src/lib/research/researchSyncRuntime.test.js:162` | «duplicated tabs own distinct durable pending journals» — **נשאר תקף** כשהאחסון תקין (הנוסח משמר זאת) |
| `src/lib/research/personalSaveDecision.js` (`saveFailureNotice`), `PersonalSaveButton2029.jsx:41` | נוסח «יש להתחבר לחשבון קיים, ואז ללחוץ שוב» — **לא נמצא טסט שנועל אותו** |

### 7.2 נועלים מצביעי גרסה של חוקים
| קובץ | מה נעול | השפעה |
|---|---|---|
| `test/world-topic-gallery-state-map-2029.test.mjs:10` | `canonical_ui_components_law` **v13 ACTIVE** באינדקס | יישבר ב־v14 אם האינדקס יעודכן ללא הטסט — לעדכן יחד |
| `test/g3-client-correlation.test.mjs:51-52` | `research_workspace_law v5` מחויב; `v4` אסור | נשאר ירוק כל עוד הקוד לא משתנה |
| `supabase/functions/research-run/index.ts:383,614`, `supabase/functions/ai-analyze/index.ts:2036,2049,2330`, מיגרציה `20261005210000_…phase_l…:201` | מחרוזות provenance `research_workspace_law v5` | יהפכו «גרסה קודמת»; שינוי דורש פריסת Edge Function (0.4) — **לא לגעת בלי אישור** |
| `test/person-identity-bridge-foundation.test.mjs:77`, `scripts/ops/link-*.sql` | `person_foundation_contract_law` = 6 בהקשר היסטורי | אין שינוי (provenance) |
| `scripts/test-g1-agent-routing-smoke.mjs` + `audits/g1-agent-entry/G1_LAWS_ACTIVE_SNAPSHOT_20261112.txt` (`CURRENT_LAWS_FILE` = הקובץ המתוארך החדש ביותר) | בדיקות מעבר גרסה: «text changed in place», «version went backwards», בעלים תקף, מצביעי Owner Index | דורש קובץ snapshot מתוארך חדש וריצת `scripts/test-g1-agent-routing-smoke.mjs` |
| `test/els-g3-runtime-scanner-controls.test.mjs:192-208`, `test/g3-client-correlation.test.mjs:43-44` | `els_research_layer_law:v9` | **לא מושפעים** (אין תיקון ELS) |

### 7.3 נועלים את מודל המעקב הישן / החלטת 18.11
| קובץ | מה נעול |
|---|---|
| `src/components/WatchButton.jsx:35-37` | `publicFollow` (`stream:reality` / `series:*`) ושורת `actionsLocked`; המסלול `getVisitorId()` + `watchToggle(..., visitorId)` (שורות ≈ 55–95); `regCta` «🔑 שמור את המעקב שלך» + `EmailVerify` |
| `test/home-follow-and-links-2029.test.mjs:13-15,21` | ביטויים רגולריים על `publicFollow` ועל `actionsLocked` |
| `test/post-follow-panel-2029.test.mjs:36,55,59-60` | `POST_FOLLOW_PUBLIC_2029 === false`; ביטוי `actionsLocked` של WatchButton; `postFollowLocked` |
| `test/world-gallery-entry-follow-chain-2029.test.mjs:59-63` | הערות «Re-pinned here on purpose; flagged for ZURIEL» לגבי 18.11 |
| `test/watch-button-2029.test.mjs:18`; `test/watch-button-2029-state.browser.py:46-100`; `test/email-verify-2029-boundary.browser.py:56`; `test/follow-identity-slot-2029.browser.py:58`; `test/follow-center-visual-2029.browser.py:265`; `test/writer-follow-safety-2029.browser.py:70` | חוויית «עקוב כאורח ← «אימות חשבון»» והטקסטים «אימות חשבון» / «שמור את המעקב שלך» |
| `test/fixtures/follow-identity-slot-2029.jsx`, `test/fixtures/community-thread-follow-assertions.sql`, `test/fixtures/community-thread-follow-baseline.sql` | התנהגות guest/visitor ו־`claim_follow_prefs_from_identity` — **רלוונטי אם נבחר O2-ב׳** |
| `docs/reviews/follow-public-activation-20261126/README.md` (ג.4, ו) · `docs/reviews/follow-series-release-20261031.md` + חבילת הקבלה (`run-follow-series-release-acceptance.sh`) | תרחיש אורח «follow intent ואז אימות»; בדיקות SQL של מסלול האורח (ה־DB אינו משתנה, המשמעות כן) |
| הערות כותרת: `scripts/generate-follow-category-series-alignment.mjs:39` (v19), `scripts/generate-follow-content-series-only.mjs:23` (v21), מיגרציות מעקב | provenance היסטורי — אין שינוי |

### 7.4 קוד שמיישם את המודל הישן ויתוקן ביישום (לא בהחלה)
`PostCommentComposer2029.jsx` («שם (לא חובה)», אין כניסה); `PersonalSaveButton2029.jsx:41`; `WatchButton.jsx` (נתיב `visitorId`); `src/lib/communityGuestPost.js`-דפוס (הרחבה לפי PLAN שלב 1); `public/tzofen.html` (רשימות `elscode_*`).

---

## 8. מגבלות מה שלא נבדק

- הנוסח לא הורץ מול סימולציית `rule_versioning`/G1; לא הורצו `npm run build`, בדיקות מקומיות או CI.
- לא אומת בקוד/מסד אם קיימים מסמכים נוספים (מעבר ל־`docs/` ולטסטים שנסרקו) שמצטטים «אין Follow אנונימי» או «LOCAL-FIRST».
- מספרי השורות והנתונים החיים (107/69/13/19/0, 252/2) נקראו ב־27.11.2026 ויתיישנו.
- `claude/hybrid-access-law` ו־`claude/laws-alignment-20261112` לא נפתחו (ללא בסיס משותף עם `main`).
- הנוסח האנגלי ב־RW/Person ביחס לסגנון החוקים הקיימים: ניסוח משפטי סופי — לשיקול ZURIEL.
- אין שינוי ב־Production, ב־DB, בחוזים או באנליטיקס; אין PR; אין מיזוג; אין פריסה.
