import { AHAVAT_LETTER_COVERAGE } from "./ahavatTorahLetters2029.js";

export const AHAVAT_TORAH_SOURCE = Object.freeze({
  identity: "book:hebrewbooks:5635",
  title: "ספר אהבת תורה",
  author: "ר׳ פנחס זלמן הלוי סג״ל איש הורוויץ",
  imprint: "פודגורזה–קרקוב, תרס״ה / 1905",
  language: "עברית",
  pdfPages: 99,
  deepReadPages: 15,
  machineTextPages: 98,
  datasetCount: 13,
  researchBundleUrl: "/book-data/ahavat-torah.tables.json",
  pageTextBundleUrl: "/book-data/ahavat-torah.page-text.json",
  commentaryBundleUrl: "/book-data/ahavat-torah.commentary.json",
  pdfUrl: "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/Book/Hebrewbooks_org_5635.pdf",
  catalogUrl: "https://hebrewbooks.org/5635",
});

export const AHAVAT_TORAH_TRUTH_STATES = Object.freeze({
  source_verified: Object.freeze({ label: "מאומת במקור", tone: "verified", description: "העוגן או הסך נבדקו מול עמוד המקור." }),
  source_located: Object.freeze({ label: "אותר במקור", tone: "located", description: "המבנה אותר בעמוד, אך לא כל תא או ערך הוכרע." }),
  structural_map: Object.freeze({ label: "מיפוי מבני", tone: "mapped", description: "טווח העמודים ותפקידו בספר ממופים; אין בכך אימות של כל טענה." }),
  candidate: Object.freeze({ label: "מועמד למחקר", tone: "candidate", description: "קריאה או ערך שדורשים הכרעה נוספת לפני שימוש כממצא." }),
  open: Object.freeze({ label: "פתוח", tone: "open", description: "השאלה נשמרת פתוחה ולא מוצגת כתוצאה." }),
  machine_candidate: Object.freeze({ label: "תעתיק מכונה", tone: "machine", description: "טקסט שחולץ מן ה־PDF לצורכי חיפוש וקריאה, ועדיין דורש השוואה חזותית למקור." }),
});

export const AHAVAT_TORAH_READING_ARCS = Object.freeze([
  Object.freeze({ range: [1, 5], title: "זהות הספר והקדמות", explanation: "עמודי השער, הצהרת המחבר והקדמת המהדורה מגדירים את זהות החיבור, המחבר ותולדות ההדפסה. יש להבדיל בין דברי המחבר לבין חומר שנוסף במהדורות המאוחרות." }),
  Object.freeze({ range: [6, 15], title: "פתיחת מגדל עוז", explanation: "המחבר מציג את מניין 1,820 מופעי שם ה׳ ומפתח סביבו מערכות של פסוקים, מניינים וגימטריות. בעמודים אלה קיימת כבר שכבת קריאת עומק מפורטת לצד המקור." }),
  Object.freeze({ range: [16, 24], title: "המשך מגדל עוז", explanation: "הדיון ממשיך דרך ניסוך המים, מנייני אותיות ותיבות, שנות חיים, שבטים, מועדים ומבנים החוזרים אל משפחת המספר 1,820. ההסבר הוא מפת קריאה; כל חישוב דורש בדיקה מול השורה המקורית." }),
  Object.freeze({ range: [25, 31], title: "אוריין תליתאי", explanation: "יחידה טבלאית המונה דוברים, אנשים וקבוצות בתורה ומבחינה בין מספר הופעות לבין מספר התיבות המיוחסות להם. סכום המחבר 79,976 נשמר כטענת מקור עד להשלמת כל השורות." }),
  Object.freeze({ range: [32, 35], title: "שרשים בתורה", explanation: "רשימת שורשים וצורות לשון הערוכה בצפיפות. הקריאה המחקרית חייבת לשמור את כללי ההכללה של המחבר ולא להפוך רשימת מקור לקורפוס לשוני מודרני בלי הכרעה." }),
  Object.freeze({ range: [36, 43], title: "אותיות, תיבות וחמש מגילות", explanation: "רצף טבלאות לפי פרשה, חומש ומגילה. זהו חומר מתאים לחילוץ מובנה, אך ספרה עמומה או סכום חלקי נשארים מועמדים ולא מקבלים מעמד מאומת מכוח התאמה משוערת." }),
  Object.freeze({ range: [44, 45], title: "מעבר לחלק החידושים", explanation: "עמודי מעבר בין הטבלאות לבין חלק החידושים. גם עמוד דל־טקסט או ריק נשמר ברצף כדי שמספרי ה־PDF ומראי המקום לא יזוזו." }),
  Object.freeze({ range: [46, 53], title: "בראשית עד ויצא", explanation: "תחילת החידושים על סדר הפרשות: בריאה, נח, האבות, העקדה, חיי שרה, תולדות ויצא. המחבר משלב פשט, מדרש וקשרים מספריים; המערכת אינה מאחדת אותם לטענה אחת." }),
  Object.freeze({ range: [54, 60], title: "וישלח עד שמות", explanation: "חידושים על יעקב ובניו, יוסף וירידת מצרים, עד פתיחת ספר שמות. קשרים לשוניים ומספריים מוצגים כשיטת המחבר, לצד מקור העמוד המלא." }),
  Object.freeze({ range: [61, 70], title: "וארא עד פקודי", explanation: "יציאת מצרים, מתן תורה, משפטים, המשכן ומנייני עשייה. באזור זה נמצאת גם טבלת מופעי הפועל ״עשה״, שמעמדה עדיין מועמד למחקר." }),
  Object.freeze({ range: [71, 80], title: "ויקרא עד בלק", explanation: "קרבנות, טומאה וטהרה, מועדים, המדבר, המרגלים, קורח, חוקת ובלק. כמה יחידות כוללות מניינים צפופים ולכן התעתיק המכונתי משמש ניווט בלבד עד אימות חזותי." }),
  Object.freeze({ range: [81, 92], title: "פנחס עד וזאת הברכה", explanation: "סיום חידושי התורה: מסעות, דברים, מצוות, תוכחה, הברית, האזינו והברכה. כאן מופיעים גם מאגרי מסירה ותוכחה שעדיין פתוחים להכרעה." }),
  Object.freeze({ range: [93, 94], title: "מגילת אסתר", explanation: "יחידה עצמאית על אסתר ומרדכי, המשלבת קריאה לשונית, מדרשית ומספרית. הקשר לטבלאות חמש המגילות הוא קישור מחקרי ואינו מאחד את שני מוקדי המקור." }),
  Object.freeze({ range: [95, 99], title: "השמטות ותיקונים", explanation: "השלמות, חידושים שנוספו ולוח תיקוני המהדורה. התיקונים נשמרים לצד המקום שאליו הם מפנים; הם אינם מוחקים את נוסח העמוד המקורי." }),
]);

export function readingArcForPage(page) {
  return AHAVAT_TORAH_READING_ARCS.find(arc => page >= arc.range[0] && page <= arc.range[1]) || AHAVAT_TORAH_READING_ARCS[0];
}

export const AHAVAT_TORAH_SECTIONS = Object.freeze([
  Object.freeze({
    id: "front-matter", index: "01", title: "שערים והקדמות", shortTitle: "הקדמות", range: [1, 5], page: 1, status: "structural_map", color: "var(--s29-warm-accent)",
    description: "שערי המהדורה, הצהרת המחבר, דברי פתיחה ורקע להדפסה המחודשת.",
    guide: "כאן מתחילה זהות הספר: מי חיבר, כיצד נדפס, ומה ביקשו עורכי המהדורה לשמר. ההסבר הוא מפתח קריאה, לא תחליף לעמודי המקור.",
  }),
  Object.freeze({
    id: "migdal-oz", index: "02", title: "חלק א׳ · מגדל עוז", shortTitle: "מגדל עוז", range: [6, 24], page: 6, status: "structural_map", color: "var(--s29-brand-gold)",
    description: "בניינים מספריים וטקסטואליים סביב התורה, שמות, דיבור ומחזורי זמן.",
    guide: "זהו שער הכניסה המרכזי לשיטת המחבר: טבלאות וסיכומים מספריים נשענים על אוכלוסייה, כלל ספירה ועמוד מקור. כל אחד משלושת אלה חייב להישמר בנפרד.",
  }),
  Object.freeze({
    id: "oryan-tlitai", index: "03", title: "אוריין תליתאי", shortTitle: "אוריין תליתאי", range: [25, 31], page: 25, status: "structural_map", color: "var(--s29-discovery)",
    description: "חלוקות של דיבור, ייחוס וספירת תיבות בתוך מבנים תורניים.",
    guide: "כאן אותו מספר עשוי להופיע במסלולים שונים. המערכת אינה מאחדת אותם רק מפני שהתוצאה זהה, אלא שומרת את שיטת הספירה והייחוס של כל מסלול.",
  }),
  Object.freeze({
    id: "roots", index: "04", title: "שרשים בתורה", shortTitle: "שרשים", range: [31, 35], page: 31, status: "structural_map", color: "var(--s29-accent-text)",
    description: "דיון בשורשים, צורות לשון וכללי הכללה בתוך המקרא.",
    guide: "לפני חישוב צריך להכריע מה נחשב אותו שורש ומהי צורה נפרדת. לכן המערכת מציגה את כלל ההכללה כחלק מהממצא, ולא רק את המספר הסופי.",
  }),
  Object.freeze({
    id: "counting-tables", index: "05", title: "סופר ומונה", shortTitle: "אותיות ותיבות", range: [35, 43], page: 35, status: "structural_map", color: "var(--s29-accent-secondary)",
    description: "טבלאות אותיות ותיבות לפי פרשה, ספר וחמש המגילות.",
    guide: "זהו אזור צפוף של טבלאות. כל ערך צריך להחזיק מראה־מקום, יחידת ספירה, סכום ביניים ומעמד הכרעה; ערך עמום נשאר עמום גם כשהוא קרוב לסכום מוכר.",
  }),
  Object.freeze({
    id: "parasha-novellae", index: "06", title: "חלק ב׳ · חידושים", shortTitle: "חידושים", range: [46, 92], page: 46, status: "structural_map", color: "var(--s29-warm-accent)",
    description: "חידושים הערוכים על סדר הפרשות, עם טענות, חישובים ומקורות משתנים.",
    guide: "במקום לפרק את החלק לעשרות כרטיסים מנותקים, הקורא נשאר בסדר הספר. ממצאים מחקריים ייקשרו אל העמוד והקטע המדויק בלי לשנות את רצף הקריאה.",
  }),
  Object.freeze({
    id: "esther", index: "07", title: "מגילת אסתר", shortTitle: "אסתר", range: [93, 94], page: 93, status: "structural_map", color: "var(--s29-discovery)",
    description: "יחידה מאוחרת המוקדשת למגילת אסתר ולמבנים הנקשרים אליה.",
    guide: "היחידה מוצגת כענף עצמאי של הספר, אך טבלאות חמש המגילות נשארות במקומן המוקדם. קשר ביניהן הוא קישור מחקרי, לא איחוד מקור.",
  }),
  Object.freeze({
    id: "addenda", index: "08", title: "השמטות ותיקונים", shortTitle: "השמטות", range: [94, 99], page: 94, status: "structural_map", color: "var(--s29-muted)",
    description: "הוספות, השלמות ולוח תיקוני המהדורה, כולל שאלות שהעורך עצמו השאיר פתוחות.",
    guide: "תיקון אינו מוחק את הקריאה הישנה. המערכת שומרת את הנוסח, את ההערה המתקנת ואת מצב ההכרעה כדי שאפשר יהיה לשחזר את התהליך.",
  }),
]);

export const AHAVAT_TORAH_EXTRACTION_LAYERS = Object.freeze([
  Object.freeze({ id: "tables", title: "טבלאות מלאות", detail: "תאי אותיות, תיבות וסיכומי פרשות וחומשים כשורות נתונים שאפשר לסנן ולהשוות.", pages: "6 · 25–43 · 69–71", openingPage: 6 }),
  Object.freeze({ id: "roots", title: "רשימת השרשים", detail: "עשרת טורי הרשימה בסדר הדפוס, עם תעתיק עזר, חיפוש וקפיצה לכל עמוד מקור.", pages: "31–35", openingPage: 31 }),
  Object.freeze({ id: "people", title: "שמות, אנשים וייחוסים", detail: "אברהם, משה, דוד ואישים נוספים יחד עם ההקשר, הפרשה והספירה שבה הופיעו.", pages: "לאורך הספר", openingPage: 25 }),
  Object.freeze({ id: "time", title: "מועדים ומבני זמן", detail: "ימים, חודשים, שנים ומחזורי זמן המחוברים לקטע המקור ולמבנה המספרי שלהם.", pages: "9–24 · 46–92", openingPage: 9 }),
  Object.freeze({ id: "references", title: "מפת מקורות וקישורים", detail: "פסוקים, מסכתות, מדרשים וחיבורים אחרים כרשת מראי־מקום שנפתחת חזרה לעמוד.", pages: "לאורך הספר", openingPage: 46 }),
  Object.freeze({ id: "corrections", title: "השמטות ותיקונים", detail: "כל תיקון, ההפניה שלו והנוסח שאליו הוא שייך — בלי לאבד את הקריאה המקורית.", pages: "94–99", openingPage: 94 }),
]);

export const AHAVAT_TORAH_DATASETS = Object.freeze([
  Object.freeze({ id: "DS-01", title: "מופעי שם ה׳ בתורה", total: "1,820", pages: [6], state: "closed", truthState: "source_verified", summary: "כל 54 שורות הפרשות נסגרות לחמשת סיכומי החומשים ול־1,820 בדברי הספר.", nextStep: "הרחבת ההסבר על שיטת המחבר וקישור למבנים המקבילים בספר." }),
  Object.freeze({ id: "DS-02", title: "אותיות התורה וצורותיהן", total: "28 צורות בדפוס", pages: [35, 36, 37, 38, 39, 40, 41], state: "partial", truthState: "source_located", summary: `כל ${AHAVAT_LETTER_COVERAGE.forms} צורות האותיות נפתחות כטבלאות של 54 פרשות — ${AHAVAT_LETTER_COVERAGE.rows.toLocaleString("en-US")} שורות לצד המקור. אפשר לחפש, לייצא ולהציג את המבנה בתלת־ממד.`, nextStep: `בפרטי המקור: ${AHAVAT_LETTER_COVERAGE.unresolvedRows} תאי פרשות ו־${AHAVAT_LETTER_COVERAGE.unresolvedCheckpoints} סיכומים מצטברים טרם הוכרעו, ופערי קריאה נשמרים בלי התאמה מלאכותית לסכום.` }),
  Object.freeze({ id: "DS-03", title: "מספר תיבות התורה", total: "79,976", pages: [41], relatedSourcePages: [25, 26, 27, 28, 29, 30, 31], state: "partial", truthState: "source_located", summary: "טבלת תיבות התורה פתוחה בכל 54 הפרשות, עם סיכומים לפי חומש וסיום המחבר: 79,976. כל שורה נפתחת לצד המקור בעמוד 41.", nextStep: "חקירת שיטת הספירה וקישור למוקדי התיבות המקבילים בספר." }),
  Object.freeze({ id: "DS-04", title: "מספר אותיות התורה", total: "304,812", pages: [41, 42], state: "partial", truthState: "source_verified", summary: "כל 54 הפרשות נגישות בטבלת האותיות, לצד הסיכומים המצטברים. סיום המחבר הוא ש״ד אלף תתי״ב — 304,812; כל פרשה פותחת את עמוד המניין שלה.", nextStep: "העמקת ההסבר על מנייני הפרשות והקשרים לטבלאות האותיות הנפרדות." }),
  Object.freeze({ id: "DS-05", title: "אוריין תליתאי · אנשים וייחוסים", total: "שני מדדי ייחוס", pages: [25, 26, 27, 28, 29, 30, 31], state: "partial", truthState: "source_located", summary: "סיכומי חמשת החומשים: פעמים ותיבות בנפרד, לכל אדם, קבוצה וקטגוריית מקור.", nextStep: "תעתוק שורות הפרשות והסיכום הכללי; סיכומי החומשים כבר ניתנים לחיפוש ולמחקר." }),
  Object.freeze({ id: "DS-06", title: "מופעי השם משה בתורה", total: "647 · בדברי הספר", pages: [70], state: "partial", truthState: "source_located", summary: "סיכום המחבר הוא 647 מופעי משה. עשר פרשות ספר שמות נקראו מחדש ונסגרות ל־290; סיכומי ארבעת החומשים נגישים לצד המקור.", nextStep: "קריאה מחודשת של יתר שורות הפרשות וצורות השם, תוך שימור התעתיק הקודם בנפרד." }),
  Object.freeze({ id: "DS-07", title: "שרשרת מסירת טהרת פרה אדומה", total: "איתור להמשך", pages: [], state: "unknown", truthState: "open", summary: "נושא ממפת המחקר ההיסטורית שמראה־המקום שלו עדיין בבירור. הדיון במסורת המסירה נשמר להמשך קריאה, בלי לייחסו לעמוד שלא אומת.", nextStep: "איתור מחדש של הקטע, ורק לאחריו הכרעת יחידת הספירה והיקף הרשימה.", locatorReview: Object.freeze({ previousEstimate: 78, reviewedRange: [71, 80], note: "ההערכה הישנה הייתה עמוד 78; בדיקת הטווח המאוחרת לא איתרה את השרשרת. אין עמוד מקור מדויק מוכרע." }) }),
  Object.freeze({ id: "DS-08", title: "השוואת תיבות התוכחה", total: "איתור להמשך", pages: [], state: "unknown", truthState: "open", summary: "נושא ממפת המחקר ההיסטורית שמקומו טרם הוכרע. נבדיל בין דיון בתוכחה לבין טבלת מניינים, ונציג את הטבלה רק כשתאותר במקור.", nextStep: "יישוב דוחות החיפוש ואיתור קטע מספרי תחום לפני שיוך עמוד או תאים למאגר.", locatorReview: Object.freeze({ previousEstimate: 90, reviewedRange: [81, 99], note: "האיתור המשוער בעמוד 90 לא אושר. דוחות החיפוש המאוחרים לא מצאו את הטבלה המספרית בטווח 81–99; אין זו טענה שהנושא נעדר מכל הספר." }) }),
  Object.freeze({ id: "DS-09", title: "אותיות חמש המגילות", total: "140 תאי אותיות", pages: [42, 43], state: "partial", truthState: "source_located", summary: "28 צורות לכל מגילה, עם סיכומי המחבר, חיפוש, יצוא וקישורי PDF לכל שורה.", nextStep: "הכרעת שמונת התאים העמומים והצלבת קריאת השורות, בלי להשלים מתוך הסיכומים." }),
  Object.freeze({ id: "DS-10", title: "תיבות חמש המגילות", total: "חמש מגילות", pages: [43], state: "closed", truthState: "source_located", summary: "חמשת מנייני התיבות בדפוס, בנפרד ממנייני האותיות וללא דרישת מנוע לצפייה.", nextStep: "קריאה והשוואה בין המגילות לצד המקור; אין כאן תוצאת מנוע." }),
  Object.freeze({ id: "DS-11", title: "רשימת השרשים בתורה", total: "1,820", pages: [31, 32, 33, 34, 35], state: "partial", truthState: "source_located", summary: "עשרת טורי הרשימה בסדר הקריאה, עם תעתיק עזר, חיפוש והסבר לכל עמוד.", nextStep: "הגהת התעתיק והכרעת יחידת הרשימה של המחבר, בלי להחיל כללי שורש מודרניים." }),
  Object.freeze({ id: "DS-12", title: "לוח השמטות ותיקונים", total: "רשימה איכותנית", pages: [99], state: "closed", truthState: "source_verified", summary: "הגהות מודפסות בסוף המהדורה ושאלות עריכה; זהו מאגר טקסטואלי, לא מספרי.", nextStep: "השוואת נוסח ההערות לקטעים המקושרים, בלי להחיל את הצעות התיקון על גוף הספר." }),
  Object.freeze({ id: "DS-13", title: "מופעי הפועל ״עשה״ לפי פרשה", total: "248 · בדברי הספר", pages: [70], state: "partial", truthState: "source_located", summary: "חמש פרשות המשכן נקראו בעמוד 70, ולאחריהן דיון בצורות הפועל ובהשמטות. סיום המחבר הוא רמ״ח — 248; מנייני הפרשות מוצגים בנפרד.", nextStep: "תעתוק כל צורות הפועל וההשמטות וקישורן למנייני הפרשות, בלי לערבב בין שלבי הספירה." }),
]);

// An unresolved locator must not navigate to an old estimate or invent a page.
export function ahavatDatasetSourcePage(dataset, currentPage = 6) {
  const valid = value => Number.isInteger(value) && value >= 1 && value <= AHAVAT_TORAH_SOURCE.pdfPages;
  return dataset?.pages?.find(valid) || (valid(currentPage) ? currentPage : 6);
}

export function ahavatCurrentOccurrenceReading(table) {
  const reading = table?.current_reading;
  if (reading?.source_identity !== AHAVAT_TORAH_SOURCE.identity
    || reading?.source_pdf_sha256 !== "895e9a720d984adf8ea453b644e3f6d0864e101238f348f418aa5fafa20e9c8b"
    || reading?.pdf_page !== 70 || reading?.source_anchor !== "#page=70&view=FitH"
    || !Array.isArray(reading?.rows) || !reading.rows.length || !reading.rows.every(row => row.pdf_page === 70 && Number.isSafeInteger(row.decimal) && row.decimal >= 0 && typeof row.printed === "string" && row.printed)
    || !Array.isArray(reading.book_totals) || !reading.book_totals.every(book => book.pdf_page === 70 && Number.isSafeInteger(book.decimal) && book.decimal >= 0)) return null;
  return reading;
}

export const AHAVAT_TORAH_DEEP_PAGES = Object.freeze([
  { page: 1, printed: null, section: "שער הספר", blocks: 5, tables: 0, unresolved: 0, depth: "זהות ביבליוגרפית" },
  { page: 2, printed: null, section: "שער והקדמות", blocks: 3, tables: 0, unresolved: 0, depth: "זהות ביבליוגרפית" },
  { page: 3, printed: null, section: "הצהרת המחבר ופרטי המהדורה", blocks: 3, tables: 0, unresolved: 0, depth: "זהות ביבליוגרפית" },
  { page: 4, printed: null, section: "הקדמות", blocks: 10, tables: 0, unresolved: 1, depth: "קריאה חלקית" },
  { page: 5, printed: null, section: "הקדמות", blocks: 8, tables: 0, unresolved: 1, depth: "קריאה חלקית" },
  { page: 6, printed: 1, section: "מגדל עוז", blocks: 4, tables: 1, unresolved: 1, depth: "פרפרזה נרחבת + נתונים" },
  { page: 7, printed: 2, section: "מגדל עוז", blocks: 3, tables: 0, unresolved: 1, depth: "קריאה חלקית" },
  { page: 8, printed: 3, section: "מגדל עוז", blocks: 4, tables: 0, unresolved: 0, depth: "קריאה חלקית" },
  { page: 9, printed: 4, section: "מגדל עוז", blocks: 5, tables: 1, unresolved: 1, depth: "פרפרזה נרחבת + נתונים" },
  { page: 10, printed: 5, section: "מגדל עוז", blocks: 4, tables: 1, unresolved: 2, depth: "פרפרזה נרחבת + נתונים" },
  { page: 11, printed: 6, section: "מגדל עוז", blocks: 3, tables: 0, unresolved: 1, depth: "קריאה חלקית" },
  { page: 12, printed: 7, section: "מגדל עוז", blocks: 4, tables: 2, unresolved: 0, depth: "פרפרזה נרחבת + נתונים" },
  { page: 13, printed: 8, section: "מגדל עוז", blocks: 5, tables: 1, unresolved: 0, depth: "פרפרזה נרחבת + נתונים" },
  { page: 14, printed: 9, section: "מגדל עוז", blocks: 5, tables: 0, unresolved: 0, depth: "פרפרזה נרחבת + נתונים" },
  { page: 15, printed: 10, section: "מגדל עוז", blocks: 4, tables: 2, unresolved: 1, depth: "פרפרזה נרחבת + נתונים" },
].map(Object.freeze));

export const AHAVAT_TORAH_AI_EXPLANATIONS_HE = Object.freeze({
  imprint_de: "שורת דפוס לועזית מן השער. היא נשמרת לצורך זיהוי המהדורה, אך אינה חלק מתוכן המחקר של המחבר.",
  copy_corner_ad: "מודעת בית דפוס מן ההדפסה המאוחרת. זהו חומר ביבליוגרפי, לא טקסט מן המהדורה המקורית של תרס״ה.",
  biegeleisen_ad: "פרטי מכירה והפצה של ההדפסה המאוחרת. המערכת מפרידה אותם מתוכן הספר ומזהות המחבר.",
  opening_declaration: "המחבר פותח בדברי הרמב״ם על אזכורי השם בתפילין ובדברי מגלה עמוקות על חשיבות מניין השם. מכאן הוא מסביר מדוע יצא לספור את מופעי שם ה׳ בכל התורה.",
  per_parasha_tetragrammaton_table: "טבלה צפופה המונה את מופעי שם ה׳ בכל פרשה ומסכמת כל חומש. קריאת כל 54 השורות נסגרת לחמשת סיכומי החומשים ול־1,820 המודפס בספר.",
  beha_bram_hey_discourse: "דיון בדרשת ״בהבראם — בה׳ בראם״ ובקשרים בין בריאה, חכמה וכתר. המחבר בונה שרשרת של פסוקים וגימטריות; ההסבר כאן מתאר את מהלך הטיעון ואינו מאשר את מסקנותיו.",
  man_90_letters_section: "יחידה חדשה שכותרתה ״מן״ וקושרת מניין אותיות למוטיב של הדורות שקדמו למתן תורה. המספר המרכזי אינו נקרא בוודאות בשכבה הנוכחית.",
  hateivah_section: "דיון ארוך על המילה ״תיבה״, שמות ה׳ ומידות התיבה, ובהמשך הקבלות בין מבנה הגוף, התפילה וארבעת העולמות. זוהי פרפרזה מסייעת לקריאה לצד המקור.",
  aram_pelishtim_census: "המחבר מחבר מנייני צבא מארם ומפלשתים לדיון רחב יותר על משמעות ספירת אלפים ומנייני ישראל. היחידה מוצגת כטענת מקור ולא כנתון היסטורי מאומת.",
  shevet_menashe_note: "הערת ביניים על מניין אנשי חצי שבט מנשה ועל נתוני מרכבות ופרשים בספר שמואל, כחלק מהבחנה בין מספר אנשים לבין מספר יחידות־אלף.",
  shem_ad_section: "פתיחת טבלה המונה צורות דקדוקיות שונות של שמות ממשפחת ״אלהים״ בתורה. הטבלה נמשכת לעמודים הבאים ודורשת הפרדה בין כל צורה לשונית.",
  tzirufim_continuation: "המשך דיון בצירופי אותיות ובשנים־עשר צירופי שם ה׳, עם רמזים מספריים למושג ״חדש״. זהו מהלך פרשני של המחבר.",
  yaakov_rachel_leah_word_count: "טבלת ספירה של מילים המיוחסות לדיבורם של יעקב, רחל ולאה. הסכום המשולב מתקרב למשפחת 1,820, אך קיימת מחלוקת ספרות בין קריאות קודמות ולכן הוא נשאר פתוח.",
  aseret_hadibrot_letter_intro: "פתיחה לדיון בספירת אותיות בעשרת הדיברות ובהשוואה בין הדיברות הראשונות לשניות.",
  adonai_shem_forms: "המשך דיון בצורות שם אדנות ובקשרים בין קודש הקודשים, המקדש והמספר 1,820. ההקשרים מוצגים כשיטת המחבר ולא כהוכחה עצמאית.",
  elokim_form_by_form_tally: "פירוט של צורות לשוניות שונות ממשפחת ״אלהים״ ומניין הופעותיהן. הטבלה צפופה וחלק מן המספרים עדיין זקוקים לקריאה חוזרת.",
  hayeriot_mishkan_section: "דיון ביריעות המשכן, מידותיהן, הקרסים וחצר המשכן. המחבר מחבר את המידות למבנים מספריים; המערכת שומרת בין נתוני המקור לבין הפרשנות.",
  sinai_no_intermediary: "דיון בהתגלות סיני ללא מתווך ובקשר למצוות תפילין ולקשר שלהן. זהו המשך רציף של היחידה הקודמת בעמוד.",
  hakvh_mishkan_loops: "ספירת לולאות וקרסי יריעות המשכן והקבלתם למבני שם ה׳. נדרש אימות פרטני לכל מספר לפני חילוצו כממצא.",
  harani_merkavah: "דיון במעשה מרכבה, ארבע החיות ודמות האדם, עם מקורות מרש״י, רמב״ם וספרי. ההסבר מציג את רצף המקורות והגימטריות בלי לאחד אותם לטענה חדשה.",
  darash_darash_midpoint: "המחבר דן בזוג ״דרש דרש״ ומציגו כצמד המילים הכפולות שבמרכז התורה, על רקע הסוגיה בקידושין. זהו עוגן חשוב למחקר אמצע התורה.",
  haggadah_span_table: "טבלת ספירה מפורטת של מילים בהגדה, מן ״הא לחמא עניא״ ועד ״גאל ישראל״, שלפי המחבר מסתכמת ב־1,820. יש לשמור את גבולות הקטע כחלק בלתי נפרד מן הנתון.",
  aleinu_word_count: "ספירה לפי קטעים של תפילת עלינו בנוסח מוסף ראש השנה, שמובילה אצל המחבר למבנה של 1,820 מילים.",
  keter_sefirot_gematria: "חיבור שמות הספירות למהלך גימטרי שמסתכם אצל המחבר ב־1,820, וממנו מעבר לספירת העומר.",
  omer_count_frontmatter: "דיון בשאלה אם היום החמישים נכלל בספירת העומר, לצד הקשרים לגיל השירות וליובל. זו הופעה מוקדמת של נושא שחוזר בהמשך הספר.",
  hatekiot_shofar: "ספירת תקיעות ותרועות בראש השנה וביום הכיפורים, המחוברת למבנה מספרי של 1,820 ולמאמר רבי עקיבא על טהרת ישראל.",
  erechin_shekel_arithmetic: "חישוב סכומי ערכין לפי קבוצות גיל בויקרא כ״ז, שהמחבר מסדר למבנה מספרי של 1,820.",
  kavod_levite_census: "דיון במניין הלויים מול מניין בכורי ישראל ובפדיון העודף של 273, עם מעבר לחישובי מולד ולחלום סולם יעקב.",
  speaker_wordcount_table_start: "תחילתה של טבלה המונה את מספר המילים המיוחסות לדוברים שונים בתורה — משה, יהושע, הזקנים, אהרן, בני ישראל ואחרים. הסכום הכולל מופיע בעמוד הבא.",
  pirkei_avot_age_stages: "רשימת שלבי הגיל מפרקי אבות — למקרא, למשנה, למצוות ועוד — המשולבת בדיון בספירת העומר ובמבנה מספרי נוסף של 1,820.",
  reciprocal_love_hate_sifrei: "קטע המביא מקורות מספרי ומעדויות על מצוות אהבה ואיבה הדדיות ועל זכירת עמלק.",
  hashem_aharon_miriam_speak: "דיון בפרשת דיבורם של אהרן ומרים במשה, בענוות משה ובקשרי גימטריה למידות קודש הקודשים.",
  serah_bat_asher: "דיון בשרח בת אשר, ששמה מופיע פעמיים בתורה, ובהקשרים אגדיים לאריכות ימיה ולמבנים ממשפחת 1,820.",
  gedolah_letters_vav_dalet: "הערה קצרה על האותיות הגדולות דל״ת ווי״ו בקריאת שמע ועל משמעות צירופן.",
  issaron_korban_measures: "פירוט מידות העשרון במנחות של תמיד, שבת, ראש חודש והמועדים. המחבר מסכם את המדידות למבנה מספרי ממשפחת 1,820.",
  nesachim_wine_libation: "חישוב צפוף של מידות ניסוך היין לפי סוגי הקרבנות לאורך השנה. היחידה נמשכת מעבר לעמוד שנקרא בשכבה הנוכחית ולכן אינה מוצגת כסגורה.",
});

export function hebrewBlockKind(blockId = "") {
  if (/title|heading/.test(blockId)) return "כותרת מקור";
  if (/table|tally|count/.test(blockId)) return "טבלה או מניין";
  if (/quote|citation/.test(blockId)) return "ציטוט ומקור";
  if (/imprint|colophon|credit|ad|stamp|sale/.test(blockId)) return "זהות מהדורה";
  if (/preface|opening|introduction/.test(blockId)) return "הקדמה";
  return "יחידת קריאה";
}

export const AHAVAT_TORAH_FINDINGS = Object.freeze([
  Object.freeze({
    id: "divine-name-1820", dataset: "DS-01", title: "שם ה׳ · 1,820", value: "1,820", page: 6, pages: [6], status: "source_verified", calculation: "arithmetic_verified",
    formula: "165 + 398 + 311 + 396 + 550 = 1,820",
    sourceNote: "מבנה הטבלה והסך נבדקו חזותית; תאי הפרשות נשמרים ברמת איתור מקור.",
    explanation: "הספר מסכם את מופעי שם ה׳ בחמשת חומשי התורה. זו טענת ספירה של המקור עם סגירה חשבונית, ולא קביעה אוטומטית על כל נוסח מקראי אפשרי.",
  }),
  Object.freeze({
    id: "torah-words-79976", dataset: "DS-03", title: "תיבות התורה · 79,976", value: "79,976", page: 25, pages: [25, 41], status: "source_verified", calculation: "cross_validated",
    formula: "שני עוגני מקור נפרדים · עמ׳ 25–31 ועמ׳ 41–42",
    sourceNote: "הסך מופיע בשני מקומות שונים בספר; סגירת כל שורות הפרשות אינה מוצגת כאן.",
    explanation: "החזרה על אותו סך בשתי יחידות טקסטואליות מחזקת את הקריאה של נתון המחבר. היא אינה מבטלת את הצורך לתעד את גבול המילה ואת נוסח הקורפוס.",
  }),
  Object.freeze({
    id: "torah-letters-candidate", dataset: "DS-04", title: "אותיות התורה · סיכום המחבר", value: "304,812", page: 42, pages: [41, 42], status: "source_verified", calculation: "קריאת סיכום בדפוס",
    formula: "ש״ד אלף תתי״ב · PDF 42, סוף הטור השמאלי",
    sourceNote: "הסך נקרא בצילום המוגדל של אותו PDF. הקריאה הקודמת בסימן קירוב נשמרת בדוסייה ההיסטורי; זהות הפריט לא שונתה. לא בוצעה ספירת קורפוס עצמאית.",
    explanation: "המחבר מסכם כאן את מניין אותיות התורה, לאחר רצף הפרשות וחמשת החומשים. בדפוס ש״ד מציין 304 אלפים, ותתי״ב מציין 812: הסיכום הנקרא הוא 304,812. זו הצגת דברי הספר; השלמת שורות הפרשות היא שכבת חילוץ נפרדת.",
  }),
  Object.freeze({
    id: "five-megillot", dataset: "DS-09", title: "אותיות חמש המגילות", value: "5", page: 42, pages: [42, 43], status: "source_located", calculation: "open",
    formula: "מטריצה לפי מגילה · הערכים נשארים פתוחים",
    sourceNote: "קיום הטבלה והמבנה אותרו חזותית; הערכים אינם מוצגים כתוצאה סופית.",
    explanation: "זהו חלון טוב למערכת העתידית: אפשר לעבור מן העמוד אל מטריצה, לבחור מגילה, לראות תא מקור ולהריץ בדיקת קורפוס — בלי לערבב את שלבי הבדיקה.",
  }),
]);

export const AHAVAT_TORAH_PIPELINE = Object.freeze([
  Object.freeze({ index: "01", title: "מקור", value: "99", label: "עמודי PDF", state: "available" }),
  Object.freeze({ index: "02", title: "חיפוש ותעתיק", value: "98", label: "עמודי מכונה + עמוד ריק מתועד", state: "available" }),
  Object.freeze({ index: "03", title: "קריאת עומק", value: "15", label: "עמודים מאומתים בשכבה זו", state: "partial" }),
  Object.freeze({ index: "04", title: "הכרעת אדם", value: "נדרש", label: "לכל מועמד פתוח", state: "gated" }),
  Object.freeze({ index: "05", title: "פרסום", value: "0", label: "ממצאים ציבוריים", state: "locked" }),
]);

export function sectionForPage(page) {
  return AHAVAT_TORAH_SECTIONS.find(section => section.page === page)
    || AHAVAT_TORAH_SECTIONS.find(section => page >= section.range[0] && page <= section.range[1])
    || AHAVAT_TORAH_SECTIONS[0];
}

export function ahavatCompanionPage(bundle, page) {
  if (!Number.isInteger(page) || page < 1 || page > AHAVAT_TORAH_SOURCE.pdfPages
    || bundle?.schema_version !== "ahavat-torah-commentary.v1"
    || bundle?.source_identity !== AHAVAT_TORAH_SOURCE.identity || bundle?.display_label !== "הסבר נלווה") return null;
  const item = bundle.pages?.find(record => record.pdf_page === page);
  return item?.source_anchor === `#page=${page}&view=FitH` && typeof item.companion_explanation === "string" && item.companion_explanation.trim() ? item : null;
}

// Lightweight availability only; no commentary/OCR is imported into the eager
// URL projection. Counts reflect actually authored units, not a depth score.
export const AHAVAT_COMPANION_PAGE_COUNTS = Object.freeze(Object.fromEntries([
  ...Array.from({ length: 5 }, (_, i) => [i + 1, i < 3 ? 1 : 3]),
  ...Array.from({ length: 19 }, (_, i) => [6 + i, 3]),
  ...Array.from({ length: 19 }, (_, i) => [25 + i, 2]),
  [44, 1],
  ...Array.from({ length: 54 }, (_, i) => [46 + i, 3]),
]));

export function ahavatCompanionUnitCount(page) {
  return Number.isInteger(page) ? AHAVAT_COMPANION_PAGE_COUNTS[page] || 0 : 0;
}

export function ahavatCompanionUnitId(page, position) {
  if (!Number.isInteger(page) || !Number.isInteger(position) || position < 1 || position > ahavatCompanionUnitCount(page)) return "";
  const section = page >= 1 && page <= 5 ? "front" : page >= 6 && page <= 24 ? "migdal" : page >= 25 && page <= 43 ? "tables" : page === 44 ? "transition" : page >= 46 && page <= 99 ? "novellae" : "";
  return section ? `ahavat-${section}-p${String(page).padStart(3, "0")}-${String(position).padStart(2, "0")}` : "";
}

export function ahavatCompanionReadingUnits(bundle, page) {
  const guide = ahavatCompanionPage(bundle, page);
  const units = guide?.companion_units;
  if (bundle?.source_pdf_sha256 !== "895e9a720d984adf8ea453b644e3f6d0864e101238f348f418aa5fafa20e9c8b"
    || !ahavatCompanionUnitId(page, 1) || !Array.isArray(units) || units.length !== ahavatCompanionUnitCount(page)) return [];
  const valid = units.every((unit, index) => unit
    && unit.id === ahavatCompanionUnitId(page, index + 1)
    && unit.pdf_page === page && unit.source_anchor === guide.source_anchor
    && unit.display_label === "הסבר נלווה" && unit.scope === "selected_passage_not_exhaustive"
    && unit.source_basis === "embedded_text_and_visual_page_review"
    && ["title", "question", "explanation", "takeaway"].every(key => typeof unit[key] === "string" && unit[key].trim()));
  return valid ? units.map(({ id, pdf_page, title, question, explanation, takeaway, source_anchor }) => ({ id, pdf_page, title, question, explanation, takeaway, source_anchor })) : [];
}
