# נספח — מפת אחסון מקומי ונתיבי כתיבה (Cloud First)

מצורף ל־[PLAN.md](PLAN.md). סריקה סטטית של `origin/main` `66f4176a1` (27.11.2026): `src/`, `public/tzofen.html`, `public/sw.js`, `public-reading-deploy/transport.js`. בלי הרצה בדפדפן ובלי קריאת תוכן מכשירים. נשען על ביקורת קודמת [STORAGE-WRITERS-AUDIT.md](../auth-storage-resilience-20261110/STORAGE-WRITERS-AUDIT.md) ומרחיב אותה.

**מקרא**
- **סיכון היסטוריה אישית:** נמוך = העדפת תצוגה/דגל חד־פעמי; בינוני = מזהה מדידה או הקשר התנהגותי; גבוה = תוכן משתמש או רצף פעולות.
- **תנאי לשרת?** האם הכתיבה המקומית חוסמת או קודמת לכתיבת שרת של אותה פעולה.
- **מחקר לא־מסונכרן?** האם עבודת משתמש יכולה לשבת שם בלבד.
- **ת':** פעולה מוצעת — K נשמר · C הופך לענן · R מפסיק להיכתב (באישור) · Q כוונה ממתינה תחומה.
- דגל `PUBLIC_READING_RELEASE` (Production): נבדק רק היכן שצוין; **לא אומת פר מפתח**.

## A. מחקר אישי (Research OS) — הליבה

| מפתח | קובץ | מטרה / סוג נתון | סיכון | תנאי לשרת? | לא־מסונכרן? | ת' |
|---|---|---|---|---|---|---|
| `sod_research_v2:<principal>` (`user:<id>` או `guest`) | `research/researchSyncState.js:2,8`, `researchSyncRuntime.js:239` | מצב מחקר: `saved`, `cart`, `pinned`, `collections`, `journeys`, `history`, `context` | גבוה | **כן** — `persist()` לפני `flush()` (שורה 250) | **כן** (אורח: תמיד; מחובר: עד אישור) | C |
| `sod_research_v2:<principal>:pending:<id>` | `researchSyncRuntime.js:111-115,168` | יומן המתנה: `queue` של batches, `inflight`, `revision`, בעלות+lease | גבוה | **כן** — נכתב לפני שליחה | **כן** | K (עד אישור), אחר כך C |
| `…:pending:<id>:conflict:<id>` | `researchSyncRuntime.js:317` | עותק מוסתר של יומן במחלוקת («provenance») | גבוה | לא | **כן** | K, לא נמחק אוטומטית |
| `sod_research_v2:<principal>:localonly` | `researchLocalOnly.js:10,51` | פריטים שהענן לא אישר בעת `hydrate()` + `collections/journeys/history` כ־`extras` | גבוה | לא | **כן — `extras` ללא נתיב שחזור** | K→C (שלב 4) |
| `sod_research_context_v2:<principal>` (session) | `researchSyncState.js:3` | הקשר מחקר (subject, selection, journey position) | בינוני | לא (best-effort) | לא (גם בענן ב־`context_set`) | K |
| `sod_research_v1`, `sod_research_context_session_v1` | `researchSyncState.js:4-5`, `ResearchProvider.jsx:33` | מפתחות legacy לא מסוגרים; מאומצים פעם אחת לאורח | גבוה | לא | **כן** (אורח ישן) | K→C |
| `sod_mode_rollout_v1` | `ResearchProvider.jsx:32` | סימון חד־פעמי «הגירת מצב» | נמוך | לא | לא | K |
| `sod_my_hints_v1` | `hints.js:7` | **«הרמזים שלי» של אורח** (מערך רמזים, `research_items` bucket `hint` למחוברים) | גבוה | **מקומי בלבד לאורח** | **כן** | C (הצעת העלאה בכניסה) |
| `sod29.goldenProjector.mode` / VIEW_MODE | `researchViewMode.js:18`, `GoldenProjectorModeLayer2029.jsx:20` | מצב תצוגה | נמוך | לא | לא | K |
| `sod-raziel-companion-view-v1` | `razielCompanionPreference2029.js:1` | העדפת תצוגת עוזר | נמוך | לא | לא | K |

## B. אימות והחזרה

| מפתח | קובץ | מטרה | סיכון | תנאי לשרת? | לא־מסונכרן? | ת' |
|---|---|---|---|---|---|---|
| `sb-<ref>-auth-token` / `sod-public-reading-account` + `-code-verifier` | `publicReadingAuthSession.js`, `authStorage.js` (resilient: primary → sessionStorage → memory) | session Supabase Auth, PKCE | בינוני (אסימון) | **אינו חוסם עוד** (חסימת אחסון אינה עוצרת כניסה) | לא | K |
| `sod2029_oauth_return` (session, TTL 10 דק') | `oauthReturn.js:17,30-36`, `auth.js:26` | **נתיב חזרה** אחרי OAuth (`path`+anchor בטוח) | נמוך | לא (try/catch) | לא | K, מורחב ל־Q |
| `sod_pw_recovery_v1` | `passwordRecovery.js:5` | מצב שחזור סיסמה | נמוך | לא | לא | K |
| `sod_auth_diag_v1` (≤ 20) | `authDiagnostics.js:42` | אבחון כשלי אימות (שמות/קודים) | בינוני | לא | לא | K |
| `sod_early_access_last_seen` | `EarlyAccess2029Page.jsx:17` | חזרה לדף | נמוך | לא | לא | K |

## C. קהילה ותגובות

| מפתח | קובץ | מטרה | סיכון | תנאי לשרת? | לא־מסונכרן? | ת' |
|---|---|---|---|---|---|---|
| `sod29-community-guest-post-v1` (localStorage, 6 שעות) | `communityGuestPost.js:8` | **ההודעה של האורח** שממתינה להרשמה; מפורסמת פעם אחת בידי החשבון שהשלים | גבוה (טקסט) | לא (שרת בלי תלות) | **כן** (עד 6 שעות) | Q — המודל לכוונה ממתינה |
| `sod29-community-draft-v1:<principal>` (7 ימים) | `communityDraft.js:5`, `useCommunityDraft2029.js` | טיוטת כותב: גוף, `reply` (id הורה) | גבוה (טקסט) | לא (נשמרת סינכרונית, לא לפני שליחה) | **כן** | K (החלטה 7) |
| `sod29-community-reading-v1:<principal>` | `communityReadingPosition.js:6` | סמן קריאה (לא «נקרא») | בינוני | לא | לא | K, TTL |
| `sod29-community-guest-name-v1` | `communityGuestApi.js:31` | שם אורח לפרסום | בינוני (שם) | לא | לא | K, TTL/Q |
| `sod29.community.treePinsSeen` | `CommunityLive2029.jsx:427` | «ראיתי» | נמוך | לא | לא | K |
| (ללא אחסון) תגובה בפוסט | `PostCommentComposer2029.jsx` | `useState` בלבד | גבוה (טקסט) | לא | **כן — אובד בכל מעבר/רענון** | Q (שלב 1) |

## D. מזהים, מדידה ו«היסטוריה» (סיכון פרטיות גבוה יחסית)

| מפתח | קובץ | מטרה | סיכון | תנאי לשרת? | לא־מסונכרן? | ת' |
|---|---|---|---|---|---|---|
| `sod_id` (localStorage + cookie שנה, `SameSite=Lax`) | `identity.js:8,29-41` | «Identity Spine»: מזהה יציב לדפדפן | בינוני | **כן ל־follow/צופן אורח** (דרך `getVisitorId`) | לא | K (או צמצום, החלטה 3) |
| `sod_vid` | `visitorId.js:8` | מזהה מבקר (primitive יחיד, לפי ההערה בקובץ) | בינוני | כן — `WatchButton`, `saveMatrixAnon` | לא | K→R משותף עם `sod_id` |
| `sod_visitor`, `sod_visitor_id` | `identity.js:10`, `supabaseApi2029.js:692-705` | מזהי legacy כפולים (`log_journey_ab`, AI) | בינוני | לא | לא | **R** (קריאה לגשר בלבד) |
| `sod_sid`, `sod_sid_t`, `sod_sid_account` | `identity.js:81-96` | session GA־style (30 דק') + גבול חשבון | בינוני | לא | לא | K |
| `sod_identity_bridged` (session) | `identity.js:121` | מניעת קישור כפול | נמוך | לא | לא | K |
| `sod_ref` (+ `ref-…` ב־session) | `propagation.js:64,77`, `AuthContext.jsx:127` | מזהה מפנה (rid) | בינוני | לא | לא | K / בחינת צורך |
| `sod_src`, `sod_land` (session) | `tracking.js:214-222` | מקור נחיתה לסשן | נמוך | לא | לא | K |
| `sod_acq_first`, `sod_acq_last` | `tracking.js:233,267-298` | ייחוס רכישה: ראשון/אחרון | בינוני | לא | לא | K / בחינת צורך |
| `sod_app_installed` | `tracking.js:357` | דגל התקנה | נמוך | לא | לא | K |
| `sod_exp_ctx`, `sod_arrival_2029` (session) | `events.js:63,121` | קשר ניסוי/הגעה | נמוך | לא | לא | K |
| `ua_visit_<uid>_<YYYY-MM-DD>` | `AuthContext.jsx:92-100` | «ביקור יומי» למחובר (אחד ליום, לא נמחק) | **בינוני־גבוה: יומן ביקורים לפי תאריך** | לא | לא | **R** (באישור) |
| `sod_entry_learn_2029_v1` (+ session) | `entryLearn2029.js:58,119-128` | למידת היכרות: משטחים/מושגים ו־`stage`+`at` | **בינוני־גבוה (הקשר התנהגותי)** | לא | לא | **R** או TTL (החלטה 5) |
| `anon-search` (session) | `privacy.js:5` | מצב «חיפוש אנונימי» — **מכבה** היסטוריה אישית | נמוך | לא | לא | K |
| (בענן) `history` bucket | `ResearchProvider.jsx:220,232,245` | כל `addToResearch`/`saveItem` מוסיף `history_add` | **גבוה** | — | — | **R** (החלטה 5) |

## E. ELS / צופן (מנוע `tzofen.html`)

| מפתח | קובץ | מטרה | סיכון | תנאי לשרת? | לא־מסונכרן? | ת' |
|---|---|---|---|---|---|---|
| `elscode_saved_v2` | `public/tzofen.html:1612` | רשימת צפנים שמורים מקומית | גבוה | לא (הכתיבה לענן — בלחיצה נפרדת) | **כן** | C |
| `elscode_global_v1`, `elscode_proposals_v1`, `elscode_hidden_v1` | `tzofen.html:1612` | גלובלי/הצעות/מוסתרים | בינוני־גבוה | לא | **כן** | C/K |
| `elscode_cmt_<מילה>#<דילוג>` | `tzofen.html:5783` | תגובות מקומיות מתחת למטריצה («עד לחיבור לענן») | גבוה | לא | **כן** | C |
| `tzofen_free_v1` | `tzofen.html:1882` | מונה שימוש חינמי | נמוך | לא | לא | K |
| `tzofen_gal_closed_v1`, `tzofen_guide_seen_v1`, `tzofen_onboarded_v1`, `tzofen_howto_hidden_v1` | `tzofen.html:1724,6199,6235,6293` | דגלי הדרכה/גלריה | נמוך | לא | לא | K |
| `sod_dossier_prompted_v1` | `TzofenEmbed.jsx:343` | חגיגת «שמירה ראשונה» | נמוך | לא | לא | K |
| (שרת) `saveMatrix` / `saveMatrixAnon` | `TzofenEmbed.jsx:327,348`, `elsMatrices.js:217,230` | חשבון → `save_els_matrix`; אורח → `save_els_matrix_anon` לפי `visitor_id`, `pending` | גבוה | **אורח תלוי ב־`sod_vid`** | לא | Q/C |

## F. עורך פוסטים / תצוגה מקדימה

| מפתח | קובץ | מטרה | סיכון | תנאי לשרת? | לא־מסונכרן? | ת' |
|---|---|---|---|---|---|---|
| `sod2029:post-unit-body-preview:<postId>:<unitId>` (+`:meta`) | `postUnitBody2029.js:173-189` | **טיוטת גוף יחידה בעורך (Preview בלבד)** | גבוה (עבודת כותב) | לא | **כן** | החלטה נפרדת: C/K |
| `sod2029:post-unit-prefs-preview:<postId>` | `postSemanticDesign2029.js:214` | העדפות עיצוב יחידה | נמוך | לא | לא | K |
| `sod2029:pu-last:<postId>` (session) | `PreviewUnitExtras2029.jsx:22` | «המקום האחרון» | נמוך | לא | לא | K |
| `sod2029:royal-candidate-review` | `MorePanel2029.jsx:24` | סימון סקירה | נמוך | לא | לא | K |
| `sod-kingdom-preview-v1` | `kingdom/kingdomPreview.js:5` | תצוגת Kingdom | נמוך | לא | לא | K |

## G. העדפות תצוגה ודגלים חד־פעמיים

`sod-global-rail` (`SystemFrame2029.jsx:783,876`) · `sod2029:theme-preset`, `…-seeded`, `sod-theme` (קריאה חד־פעמית; `themePreset2029.js`) · `sod-home-seen-updates`, `sod-home-hero-played`, `sod-home-reveal-played` (`HomeHeroMotion2029.jsx`, `homeMotion2029.js`, `useReveal2029.js`) · `sod_legacy_newsletter_invite_until/joined` (`useGuestNewsletterInvite2029.js` — **אינו הוכחת הסכמה**) · `sod2029:install-suggestion-until` (`installOffer2029.js`) · `sod2029_chunk_reload_v1`, `sod_runtime_heal` (שמירת reload, `appRecovery2029.js`, `transport.js:728`) — כולם **נמוך, אינם חוסמים, אינם מחקר, K**.

## H. מנגנונים שאינם אחסון משתמש

| מנגנון | ממצא |
|---|---|
| Service worker (`public/sw.js`) | Push + `notificationclick` בלבד; **אין fetch ואין מטמון**. `authRecovery.refreshAppRuntime` מבטל רישום ומוחק מטמונים בהתאוששות בלבד. |
| IndexedDB | **אין** בקוד המקור (הערה בלבד ב־`authRecovery.js:3`). |
| `readDedupe.js` | זיכרון בלבד; TTL קצר; לא נשמר בדיסק. |
| Cache API | אין כתיבה ל־CacheStorage (`caches.open` לא נמצא); `authRecovery.js` רק מוחק מטמונים קיימים בהתאוששות, ואינו נוגע ב־localStorage/sessionStorage/IndexedDB. |
| Outbox / queue מקומי נפרד | **אין** מעבר ל־`pending` journal של Research. |
| `stash*` | `stashGuestPost` בלבד (קהילה). |

---

## נתיבי כתיבה לשרת של פעולות אישיות (מי תלוי באחסון מקומי)

| פעולה | נתיב | תלוי באחסון מקומי? | אורח מותר? (Production) |
|---|---|---|---|
| שמירת פריט ל«המחקר שלי» | `PersonalSaveButton2029` → `ResearchProvider.saveItem` → journal → `apply_ops` | **כן (`persist()` שער)** | לא (`personalActionsLocked`) — ללא חזרה מדויקת |
| `addToResearch` / `pinned` / אוספים / מסעות | `ResearchProvider` actions | **כן** | לא (נעול), ישן — מקומי |
| מסע (`research_paths`) | `saveCurrentResearchPath` → `fn_research_path_append_v1` | לא ישירות | מחובר |
| תגובה בפוסט | `PostCommentComposer2029` → `add_contribution` | **לא** | כן (`pending`) |
| הודעת קהילה (חשבון) | `CommunityLive2029` → `add_contribution` | לא | לא — אורח: `add_guest_community_message` + stash 6 שעות |
| מעקב | `WatchButton` → `follow_subject_toggle` / `watch_toggle` | אורח: `getVisitorId` (localStorage); חשבון: לא | רק `stream:reality`, `series:*` (18.11) |
| שמירת צופן | `TzofenEmbed` → `save_els_matrix` / `save_els_matrix_anon` | אורח: `visitor_id` מקומי | כן (`pending`) |
| רמז | `hints.js` | אורח: **מקומי בלבד**; חשבון: `research_items` | כן (מקומי) |
| העדפות התראה | `saveNotificationPrefs` | אורח: `visitorId`; חשבון: `user_id` | לפי `WatchButton` |

**ממצא נוסף (פער):** אין שום נתיב בקוד שמעלה `collections` / `journeys` / `history` מקומיים לענן אחרי `hydrate()`; הם נשמרים ב־`:localonly` כ־`extras` ואינם מוצגים לשחזור. זה מחקר שעלול להישאר במכשיר לצמיתות (שלב 4, F8).
