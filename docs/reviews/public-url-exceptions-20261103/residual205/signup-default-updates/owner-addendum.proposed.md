# Proposed bounded addition to the existing subscription owner

Not applied. Extend the current `subscription_funnel_law` v21 using the existing owner-version process; preserve its full history. Do not create a new policy table, owner or subscription pipeline. Current owner label/index v19 is stale; use the actual active version 21. `person_foundation_contract_law` v6 remains in force.

> החלטת צוריאל, 3.11.2026 — עדכוני אתר כברירת מחדל לחשבון חדש בלבד: לאחר הפעלת המדיניות, הרשמה חדשה לאתר כוללת עדכוני אתר במייל (`site-updates`), לאחר אימות כתובת המייל ב־Auth ותוך הצגת הודעה ברורה לפני ההרשמה. ההצטרפות היא ברירת המחדל של הרשמה חדשה, ולא תירשם כאילו נבחרה תיבת opt-in. בכל הודעת עדכון נשמר קישור הסרה פעיל.
>
> התחולה היא רק לחשבון Auth חדש שנוצר לאחר זמן הפעלה קבוע ומתועד. כניסה לחשבון קיים, רענון חיבור, אישור חשבון שנוצר לפני ההפעלה, החלפת כתובת, קריאה, חיפוש, Follow והמלצה אינם מצרפים לעדכוני האתר. שליחת קוד אינה אימות. מקור האימות הוא `auth.users.email_confirmed_at`, לא טענה ב־metadata.
>
> משתמשים ב־`subscribers` ובמטרה `site-updates` הקיימים. לכתובת חדשה תירשם רק המטרה הזאת; אין הרחבה ל־general, site-openings או ערוצים אחרים. כאשר הרשמה חדשה ומאומתת שייכת לכתובת שכבר רשומה ופעילה, אפשר להוסיף רק site-updates תוך שמירת כל ההסכמות, המקור והזמנים הקודמים. רשומה לא פעילה או בעלת `unsubscribed_at` אינה מופעלת מחדש, גם אם נוצר חשבון חדש; הסרה קודמת קודמת לברירת המחדל.
>
> `subscribe_events` הקיים מתעד הצטרפות שנשמרה בפועל במקור `site-signup-default-updates-v1`, עם מזהה Auth מאומת וזמן האימות. אין הסקת Follow, מיזוג visitor, ציון עניין, שיווק, acquisition, הפניה, קרדיטים, חיוב או שליחת קמפיין. הרשמה, אימות, הצטרפות למטרה, מוכנות למשלוח, משלוח ומסירה נשארים מצבים נפרדים.
>
> זהו חריג מצומצם להוראות ההיסטוריות על אי־צירוף אוטומטי בעקבות הרשמה חדשה, רק לגבי מטרה זו והחלטה זו. כל גבולות v18–v21 האחרים נשמרים: Follow וכוונת המשתמש נפרדים מערוץ דיוור, אין הרחבת קהל מכניסה רגילה ואין הרחבה או חידוש של הסרות קודמות. אין backfill. אין שינוי בתפקידים, בחשבונות קיימים, בנתונים פרטיים או במנוע הקרדיטים.
>
> מצב ההחלטה: PRODUCT DECISION APPROVED; הצעת SQL נבדקה בנתונים סינתטיים בלבד. יישום משותף, קבלה אמיתית של ספקי כניסה/מייל והעלאה לחי הם שלבים נפרדים. הפעלה מחייבת את תשתית המטרה הקיימת והסרה פעילה; היא אינה אישור למשלוח קמפיין.

Document 37 should record the same four states separately: approved product decision; tested revised proposal; whether shared schema/trigger/unsubscribe were actually applied; owner-controlled real flow acceptance. The old identity-only A is superseded, not silently marked applied.
