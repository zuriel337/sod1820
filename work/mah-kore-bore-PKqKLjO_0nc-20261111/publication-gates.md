# טבלת שערי פרסום — מה קורה הבורא (PKqKLjO_0nc) · נבדק 11.11.2026 · בסיס: 177d817b1
לא נערך חוזה; לא נכתב ל-Production; לא הועלתה תמונה; אין merge/פרסום.

| # | שער | סטטוס | הפניה לחוזה | ראיה / הערה |
|---|---|---|---|---|
| 1א | מסלול קיים מאפשר סרטון YouTube עם תמלול+תרגומים במצב המתנה | **PASS** (המסלול קיים; לא הומצא פטור) | video_transcription_law §1 (YouTube מכוסה; video_key=PKqKLjO_0nc), §3 (video-transcribe, סט he·en·ar·es·fr·ru·pt·de), §5 (status pending/draft מוסתר מהציבור) | בפועל ב-video_transcripts רק video_key אחד, כולו published; אין precedent לשורת pending. פוסטים 5122/5119 בסדרה ללא שורות תמלול |
| 1ב | טקסט תמלול-מקור זמין ליצירת שורת original | **BLOCKED** | video_transcription_law §2 (מקור מ-captions/טקסט מצוריאל; ⛔ אין STT דרך Claude); content_translation_law v3 (SOURCE WITNESS ≠ TRANSLATION) + v4 §8 | יש פרפרזה בלבד — אינה עד-מקור ואסור להציגה כתמלול. נדרש: כתוביות מקור שצוריאל מספק / ייבוא מורשה. כתיבת video_transcripts + הפעלת video-transcribe = שינוי DB (CLAUDE.md 0.4) |
| 1ג | האם מותר לפרסם לפני שהתמלול והתרגומים קיימים | **REQUIRES_OWNER_DECISION** | publishing_conventions «UNIVERSAL MEDIA DEFAULTS» §1 (פרסום וידאו חדש: סט תרגום לפני READY); content_translation_law §1 | אין בחוק פטור; רק צוריאל רשאי לקבוע דחייה |
| 1ד | תרגום תוכן הפוסט (translation-ready) | **REQUIRES_OWNER_DECISION** | content_translation_law §1,§4 | המקור בעברית נקי; סימוני data-original-language/data-video-key (תקדים פוסט 5130) לא נוספו — הפוסט לא שונה לפי הוראה. אין צרכן JS לסימונים ב-src |
| 2 | עותק וידאו מקומי — חובה או אפשרות | **REQUIRES_OWNER_DECISION** | source_video_publish_law (חל כשצוריאל מורה «תעלה את הסרטון»/מספק Source Video; מסלול video-migrate); publishing_conventions «UNIVERSAL MEDIA DEFAULTS» §2 (פרסום וידאו = קובץ מאוחסן נוכח); Foundation: מדיה חיצונית YouTube עם קרדיט גלוי | פרשנות נוגדת: החוק הספציפי מותנה בהוראה; ברירת-המחדל האוניברסלית דורשת self-host. לא בוצעה משיכת וידאו מ-YouTube. תקדימים: 5122 (קישור חיצוני), 5119 (CDN חיצוני) |
| 3 | תוספת המערכת מוכנה ל-posts.ai_addition בלי כפילות בתוכן | **PASS** | publishing_conventions Decision #7 / CONTENT_FOUNDATION_CONTRACT §117 | ai-addition.html: 564 תווים, section data-origin="system-verification" (כתבנית 5129/5130); אין העתקה מילולית בתוכן (נבדק); לא מפעיל את marker «מקור מאת» של home2029Projection. הערה: קורא הפוסט אינו מציג ai_addition (אין צרכן ב-src), לכן הסעיפים inline נשארים הנראים לקורא; ai_addition = רשומה מסכמת |
| 4א | build-public-reading-production — מצב candidate | **BLOCKED** | scripts/build-public-reading-production.mjs; review-admission.js publicCandidateBuildIdentity; CLAUDE.md «נוהל פריסה» | נכשל `public_production_candidate_identity_rejected` — דורש זהות פלטפורמת Vercel Production (VERCEL_*, SHA=HEAD). לא ניתן ולא מותר לזייף משתני פלטפורמה. שערי ה-pre (legacy-retired, one-tree-content) עברו 79/79 |
| 4ב | אותו סקריפט — artifact רדום (ללא דגלים) | **PASS** | אותו סקריפט | exit 0; dist+manifest נוצרו; style-graph 4/4 על הפלט. אינו תחליף ל-4א ואינו הוכחת מועמד |
| 5א | נגן YouTube נטען בדף אמיתי | **PASS** | publishing_conventions (קרדיט + מדיה חיצונית) | בדף המנותב האמיתי ה-iframe טען את הנגן: 'מה קורה הבורא \| החוש של המשיח…', ערוץ 'אלון לוי - מה קורה הבורא'. (ניווט ישיר ל-/embed ללא דף מטמיע החזיר Error 153 — צפוי, לא ממצא על הפוסט) |
| 5ב | הפעלה בפועל + מקור Production | **BLOCKED** | — | לא נלחץ play; מקור localhost בלבד. נדרש מסלול קבלה מורשה על origin של מועמד Production. הנגן לא מסומן מאומת להפעלה |
| 6 | חוזי קטגוריות/סדרות לא שונו | **PASS** | work_log d521ea49 | git diff origin/main...HEAD נוגע רק בתיקיית work/mah-kore-bore-PKqKLjO_0nc-20261111 |

---
## עדכון 11.11.2026 — החלטת צוריאל 470785b0 (וידאו YouTube חיצוני פטור; טקסט הפוסט העברי חייב במסלול התרגום הקנוני)
בדיקת מצב בלבד: לא הופעל מנוע, לא נכתב ל-DB, הפוסט לא שונה.

| שער | סטטוס | ראיה |
|---|---|---|
| תרגום/תמלול הווידאו החיצוני | **PASS (פטור לפי ההחלטה)** | נשאר ביוטיוב; אין הורדה/רה-האסטינג/תמלול מומצא. שערים 1ב/1ג/2 בטבלה למעלה — סגורים |
| מנוע התרגום הקנוני קיים ועובד | **PASS (לתמלולי וידאו)** | Edge Function video-transcribe v7 (Claude Sonnet 5; סט he·en·ar·es·fr·ru·pt·de; פרומפט נאמן: שמות/פסוקים/מספרי גימטריה נשמרים); video_transcripts: 13 video_key, 73 שורות, 7 מקורות he; 61 רשומות ai_token_log מסוג תרגום (מסלול raw) |
| אחסון/זהות לתרגום **טקסט פוסט** | **BLOCKED** | content_translation_law §4 («טבלת-תרגומים לפי (entity, lang)») מוגדר בחוק אך לא ממומש: אין טבלה/מיגרציה/RPC לפוסטים; actions translate/set_original/list קשורים ל-video_key בלבד (אחסון טקסט פוסט שם = ייצוג שגוי כתמלול, בניגוד להחלטה סעיף 3); action raw מחזיר טקסט ללא שמירה/זהות |
| קבלה/אימות תרגום פוסט | **BLOCKED** | אין admission/validation לטקסט פוסט: הפרומפט טקסט-פשוט (לא מודע ל-HTML/קישורים/טבלאות), max_tokens=4000 לקריאה (הפוסט ≈10.5K תווים — דורש חלוקה), אין בדיקה אוטומטית שפסוקים/כתיב/מספרים/URL נשמרו |
| ממשק קורא רב-לשוני | **BLOCKED** | אין בורר שפה (change_language לא ממומש; W0 2027 מסמן NOT IMPLEMENTED), אין VideoTranscript.jsx ב-src, אין צרכן של video_transcripts ב-src; ניתוב he בלבד. התקדים היחיד: פוסט 5131 — תרגומי תמלול סטטיים inline כ-<details> (7 שפות), לא מסלול לטקסט פוסט |
| סימון translation-ready לפוסט (זהות+שפת מקור) | **REQUIRES_OWNER_DECISION** | תקדים פוסט 5130: עטיפת article עם data-original-language/data-video-key; לא נוסף (הפוסט לא שונה). אין צרכן JS לסימונים |
| הפעלת מנוע תרגום בפועל | **REQUIRES_OWNER_DECISION** | הפעלה דרך video_translate כותבת ל-ai_token_log (DB) ועולה בעלות ספק; דורש אישור מפורש (CLAUDE.md 0.4) |

מסקנה: המנוע קיים, אך המסלול הקנוני **אינו מאפשר כרגע להשלים** את תרגום טקסט הפוסט — חסרים אחסון/זהות, אימות וממשק. אין לטעון שהתרגום הושלם. לא נבנה מנוע/טבלה/חוזה.
