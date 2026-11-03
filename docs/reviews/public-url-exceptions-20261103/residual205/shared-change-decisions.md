# החלטות תשתית מדויקות — מצב מעודכן12.37

**מצב נוכחי:** S2 וקורא הבקרה אושרו והוחלו ב־3.11 במיגרציות20261103175116/175126; [אימות וראיות](evidence/s2-approved-apply-20261103/README.md). A הישן הוחלף בהחלטת צוריאל ולא יוחל. [A2/B/D מעודכן, מדויק ונבדק](signup-default-updates/APPROVAL.md) ממתין לאישור תשתית ולהשלמת תנאי הנוסח/הקבלה. קמפייןC נשאר נדחה. אין מעבר2029 לחי.

## צילום ההצעה לפני האישור — היסטורי

הטבלה הבאה נשמרת כראיית ההצעה7fe שאושרה או הוחלפה; היא אינה מצב ההחלה הנוכחי. בפרט: S2/CP1 כבר הוחלו, ו־A ללא דיוור אוטומטי הוחלף ב־A2 לחשבון חדש ומאומת בלבד. B/D לא הוחלו.

בסיס המוצר957e4a6a, המשך בענף gpt/2029-public-cutover-final-preparation-20261103. ההצעות אינן הרשאת מעבר2029. הקריאות האחרונות נשמרו ב־[מטא־דאטה](evidence/final-preparation/fresh-shared-metadata.json), בלי קריאת תוכן פרטי.

| חבילה | מה משתנה ומי מושפע | בדיקות וראיות | חזרה והגבול |
|---|---|---|---|
| S2 — נדרש לפני מעבר | שתי מדיניותSELECT שלPosts,redirect_map ושבע פונקציות קריאה. חסימת התגית המדויקת טיוטה;Forumציבורי ומדיניות/כתיבת מנהל נשמרים. רשומות שפות ממתינות/דחויות אינן נגישות לפיvisitor_idנטען; תוכן וקרדיטapproved נשמרים. משפיע גם על קוראיLegacy | [הצעה מדויקת ו־SQL](shared-security-proposal/README.md);6 קבוצותPostgreSQLמבודדות ו־22assertions בכל מעבר קיים; hash/מדיניות נבדקו שוב ללא שינוי | rollbackאובייקטים בלבד נבדק, אבל פותח מחדש את החשיפה הידועה ולכן אינו אוטומטי. תיקון נוסחLegacyבשפות הואpatchמוצע בלבד. אין מחיקה או הרשאה חדשה |
| CP1 — כשל קריאה אינו אפס | רק שתי זרועותexception ב־admin_system_health: כשלcron→NULL, כשלsecurity→NULLבשני המונים. תוצאה מוצלחת ריקה/אפס נשמרת; חתימה,ACL,adminguard,owner ויתר הגוף ללא שינוי | [apply](shared-security-proposal/control-reader/apply.proposal.sql),[rollback](shared-security-proposal/control-reader/rollback.proposal.sql);9 קבוצותnativePostgreSQL עברו, כוללACL,כשל,אפס,replay,rollback ו־drift. תצוגת הבקרה עצמה נבדקה בנפרד | restoreהגדרת הקורא המדויקת, ללא נתונים. תצוגתLegacyusage/mediaאינה משתנה. קוראai-analyzeעדיין מכווץcronNULLלרשימה ריקה; לא נפרסEdgeכדי לשנותו |
| A — יצירת חשבון ללא דיוור אוטומטי | [handle-new-user-consent.proposal.sql](../../admin-full-access-auth-20261103/auth/handle-new-user-consent.proposal.sql) הקיים בלבד. משאיר users/profiles/roles/credits וחשבונות קיימים; מפסיקINSERTלמנויים/אירועי דיוור בעתAuthsignup. חל גם על הרשמותLegacyחדשות | guardמקור8cbc40e56e8d8ce9869f70e09535a7e5 עדיין תואם; בדיקת הטריגר המבודדת הקיימת נשמרת. לא נבדקה הרשמה חיה | rollbackהטריגר בלבד מתועד בהצעה המקורית, אינו מוחק חשבונות. כניסה ושמירות לחשבונות קיימים אינן תלויותA; social/signupבטוח תלויA |
| B — הרשמה מפורשת לעדכוני האתר | [site-updates-purpose.sql](../../admin-full-access-auth-20261103/shared-change-proposal/site-updates-purpose.sql) + קודnewsletter-signupהקיים במועמד בלבד,verify_jwt=false. מטרה חדשה בהסכמה מפורשת, לא הרחבת הסכמה ישנה. בלי welcome,Follow,קרדיט או משלוח מהמסלול הזה | בדיקותpurpose/actual-handler הקיימות עברו. השרת החי עדיין מפרסםopening-parts-v1בלבד; אין עמודת ההסכמה החדשה. חלונית2029נכשלת לפני הכנסת כתובת/POSTכללי | לא מריציםrollbackהמוחק הסכמות חדשות; שומרים את העמודה והמידע, משביתים מסלולחדש/משחזריםEdgeכמתועד. כתובת קיימת עםמטרהאחרת/הוסרה אינה משתנה אוטומטית; ראההמגבלהלהלן |
| D — אישור הסרה אמיתי | newsletter-unsubscribeבלבד,verify_jwt=false. HMAC וקישוריGET/POSTנשמרים; הצלחה רק באישור כתיבה או קריאתinactiveתואמת. replayאינו משנהזמןהסרה;כשל/אפסהתאמותאינםהצלחה | [patch מדויק](evidence/final-preparation/mail/unsubscribe/newsletter-unsubscribe.proposal.patch),[מקור מוצע](evidence/final-preparation/mail/unsubscribe/index.proposed.ts),[חזרהv9](evidence/final-preparation/mail/unsubscribe/index.v9.rollback.ts).16/16בדיקותactual-handlerמבודדות,0רשת/משלוחים; baselineמשחזרfalse-success | חזרתEdgeבלבד אפשרית אך משיבהfalse-successידוע, לכן עדיפההשבתתאישורשגוי/תיקוןקדימה. אין שינוי נמענים בבדיקה |
| C — שליחת קמפייןsite-updates | send-newsletterכוללמטרהחדשה. זהו חלק אחר מהצעתb21 | לא נדרש להצגת הטופס/שמירת הרשמה. יתר5מסננישולחים שכברנפרסו2.11נשמרים | **נדחה להפעלה נפרדת לפני קמפיין ראשון**; לא מפעילים עכשיו שליחה או הרשמה חוזרת |

## פערים שאין לפתור באמצעות שינוי אחר

- כתובת קיימת עם מטרתדיווראחרת מקבלת verification-required, לא הצלחה. **B לבדו אינו משלים בעלות/הסכמה מחדש לכתובת קיימת**. [המלצה טכנית ממוקדת](evidence/final-preparation/mail/unsubscribe/verified-existing-consent-recommendation.md) מאפשרת בעתיד רקכתובתAuthמאומתת ופעילה באמצעותCASבendpointהקיים; היא לא מומשה ולא נכללת באישורB. כתובת שהוסרה אינה מופעלתמחדש, משוםactiveגלובלי עלול להחיות גם מטרותישנות.
- שחזור סיסמה חדש אינו חלקמ־b21 ואינו קייםגםב־Legacy. חשבון קיים יכול להשתמש ב־OTPהקייםעםcreate_user=false; אין כאן פיתוח מסלולחדש או אישור למשלוחבדיקה.
- Google/Facebook מופעליםבהגדרותהספקים שנקראו. רשימתה־RedirectURLsאינה נגישהבחיבור. אחרי קביעתפריוויומדויק יש לוודא את origin/auth/callback המדויק, וכן https://sod1820.co.il/auth/callbackלקראתמעבר, בלי לשנותSiteURLאו כתובותקיימות. איןהוכחהשסיבתבעיהכלשהיהיארקהרשימה.
- ארבעתRPCהמנהל הםadmin-onlyבשרת. CP1דורשעדייןקבלתמנהלקריאהאמיתיתעלמועמדסופי;טלמטריהחלקיתאינהמדידהשלאפסתנועה/תקלות. חיישןegressהאחרוןמ־6.10:STALE,לאנתוןנוכחי; לאנבנהcollectorחדש.

## תוצרProduction ואישורמעבר — בנפרד

[הצעתשער מדויקת ובדיקות](evidence/final-preparation/production-activation/README.md):5/5מבחניםמוצעיםעברובעותקמבודד. רקמצבstagedProductionReviewל־SHA/פרויקט/ענף/hostמדויקים; canonical,indexing,domainAssignment,cutoverעדייןfalse. ההצעה **לא הוחלה**. שערLegacyלאהשתנה.

הכליהמחוברליצירתפריסהאינוחושףskip-domain. מסלולCLIמתועד--prod --skip-domainאךאינותשתיתמאומתת/מאומתתזהותבסביבה. לכןאיןבקשתאישורלפריסהבאמצעותמסלוללאבדוק. קודםנדרשתדרךחיבורשמשמרתזהותGitומונעתשיוךדומייניםבמפורש. גםאחריקבלתהתוצרנדרששינויהפעלהנפרדואישור2029ProductioncutoverעםSHAו־deploymentמדויקים; קבלתPreviewאינהאישור.

ProductionנשארLegacy. גיבויהקודו־H1מאומתים;עדכניותמסדוכיסוימדיהלאאומתווצוריאלקיבלאתהסיכוןלהמשךההכנהבלבד. איןהיתרמחיקהאוPASSחדש.
