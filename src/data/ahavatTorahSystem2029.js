export const AHAVAT_TORAH_SOURCE = Object.freeze({
  identity: "book:hebrewbooks:5635",
  title: "ספר אהבת תורה",
  author: "ר׳ פנחס זלמן הלוי סג״ל איש הורוויץ",
  imprint: "פודגורזה–קרקוב, תרס״ה / 1905",
  language: "עברית",
  pdfPages: 99,
  pdfUrl: "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/Book/Hebrewbooks_org_5635.pdf",
  catalogUrl: "https://hebrewbooks.org/5635",
});

export const AHAVAT_TORAH_TRUTH_STATES = Object.freeze({
  source_verified: Object.freeze({ label: "מאומת במקור", tone: "verified", description: "העוגן או הסך נבדקו מול עמוד המקור." }),
  source_located: Object.freeze({ label: "אותר במקור", tone: "located", description: "המבנה אותר בעמוד, אך לא כל תא או ערך הוכרע." }),
  structural_map: Object.freeze({ label: "מיפוי מבני", tone: "mapped", description: "טווח העמודים ותפקידו בספר ממופים; אין בכך אימות של כל טענה." }),
  candidate: Object.freeze({ label: "מועמד למחקר", tone: "candidate", description: "קריאה או ערך שדורשים הכרעה נוספת לפני שימוש כממצא." }),
  open: Object.freeze({ label: "פתוח", tone: "open", description: "השאלה נשמרת פתוחה ולא מוצגת כתוצאה." }),
});

export const AHAVAT_TORAH_SECTIONS = Object.freeze([
  Object.freeze({
    id: "front-matter", index: "01", title: "שערים והקדמות", shortTitle: "הקדמות", range: [1, 5], page: 1, status: "structural_map", color: "#8c6a3d",
    description: "שערי המהדורה, הסכמות, דברי פתיחה ורקע להדפסה המחודשת.",
    guide: "כאן מתחילה זהות הספר: מי חיבר, כיצד נדפס, ומה ביקשו עורכי המהדורה לשמר. ההסבר הוא מפתח קריאה, לא תחליף לעמודי המקור.",
  }),
  Object.freeze({
    id: "migdal-oz", index: "02", title: "חלק א׳ · מגדל עוז", shortTitle: "מגדל עוז", range: [6, 24], page: 6, status: "structural_map", color: "#b08335",
    description: "בניינים מספריים וטקסטואליים סביב התורה, שמות, דיבור ומחזורי זמן.",
    guide: "זהו שער הכניסה המרכזי לשיטת המחבר: טבלאות וסיכומים מספריים נשענים על אוכלוסייה, כלל ספירה ועמוד מקור. כל אחד משלושת אלה חייב להישמר בנפרד.",
  }),
  Object.freeze({
    id: "oryan-tlitai", index: "03", title: "אוריין תליתאי", shortTitle: "אוריין תליתאי", range: [25, 31], page: 25, status: "structural_map", color: "#337f84",
    description: "חלוקות של דיבור, ייחוס וספירת תיבות בתוך מבנים תורניים.",
    guide: "כאן אותו מספר עשוי להופיע במסלולים שונים. המערכת אינה מאחדת אותם רק מפני שהתוצאה זהה, אלא שומרת את שיטת הספירה והייחוס של כל מסלול.",
  }),
  Object.freeze({
    id: "roots", index: "04", title: "שרשים בתורה", shortTitle: "שרשים", range: [31, 35], page: 31, status: "structural_map", color: "#4a6f9d",
    description: "דיון בשורשים, צורות לשון וכללי הכללה בתוך המקרא.",
    guide: "לפני חישוב צריך להכריע מה נחשב אותו שורש ומהי צורה נפרדת. לכן המערכת מציגה את כלל ההכללה כחלק מהממצא, ולא רק את המספר הסופי.",
  }),
  Object.freeze({
    id: "counting-tables", index: "05", title: "סופר ומונה", shortTitle: "אותיות ותיבות", range: [35, 43], page: 35, status: "structural_map", color: "#7358a1",
    description: "טבלאות אותיות ותיבות לפי פרשה, ספר וחמש המגילות.",
    guide: "זהו אזור צפוף של טבלאות. כל ערך צריך להחזיק מראה־מקום, יחידת ספירה, סכום ביניים ומעמד הכרעה; ערך עמום נשאר עמום גם כשהוא קרוב לסכום מוכר.",
  }),
  Object.freeze({
    id: "parasha-novellae", index: "06", title: "חלק ב׳ · חידושים", shortTitle: "חידושים", range: [46, 92], page: 46, status: "structural_map", color: "#9a4e55",
    description: "חידושים הערוכים על סדר הפרשות, עם טענות, חישובים ומקורות משתנים.",
    guide: "במקום לפרק את החלק לעשרות כרטיסים מנותקים, הקורא נשאר בסדר הספר. ממצאים מחקריים ייקשרו אל העמוד והקטע המדויק בלי לשנות את רצף הקריאה.",
  }),
  Object.freeze({
    id: "esther", index: "07", title: "מגילת אסתר", shortTitle: "אסתר", range: [93, 94], page: 93, status: "structural_map", color: "#3f805c",
    description: "יחידה מאוחרת המוקדשת למגילת אסתר ולמבנים הנקשרים אליה.",
    guide: "היחידה מוצגת כענף עצמאי של הספר, אך טבלאות חמש המגילות נשארות במקומן המוקדם. קשר ביניהן הוא קישור מחקרי, לא איחוד מקור.",
  }),
  Object.freeze({
    id: "addenda", index: "08", title: "השמטות ותיקונים", shortTitle: "השמטות", range: [94, 99], page: 94, status: "structural_map", color: "#687078",
    description: "הוספות, השלמות ולוח תיקוני המהדורה, כולל שאלות שהעורך עצמו השאיר פתוחות.",
    guide: "תיקון אינו מוחק את הקריאה הישנה. המערכת שומרת את הנוסח, את ההערה המתקנת ואת מצב ההכרעה כדי שאפשר יהיה לשחזר את התהליך.",
  }),
]);

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
    id: "torah-letters-candidate", dataset: "DS-04", title: "אותיות התורה · קריאה מועמדת", value: "≈304,812", page: 41, pages: [41, 42], status: "candidate", calculation: "not_closed",
    formula: "קריאת מקור מועמדת · הספרות האחרונות דורשות הכרעה",
    sourceNote: "העוגן אותר, אך בשכבת החומר הזו הסך אינו מסומן כסגור.",
    explanation: "המערכת משאירה את סימן הקירוב בכותרת ולא הופכת התאמה כמעט־מלאה לאימות. השלב הבא הוא הכרעת עדות מדויקת ואז השוואה לקורפוס מוגדר.",
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
  Object.freeze({ index: "02", title: "קריאת עומק", value: "15", label: "עמודים זמינים בשכבה זו", state: "partial" }),
  Object.freeze({ index: "03", title: "מפת מחקר", value: "13", label: "datasets במעמדים שונים", state: "mapped" }),
  Object.freeze({ index: "04", title: "הכרעת אדם", value: "נדרש", label: "לכל מועמד פתוח", state: "gated" }),
  Object.freeze({ index: "05", title: "פרסום", value: "0", label: "ממצאים ציבוריים", state: "locked" }),
]);

export function sectionForPage(page) {
  return AHAVAT_TORAH_SECTIONS.find(section => section.page === page)
    || AHAVAT_TORAH_SECTIONS.find(section => page >= section.range[0] && page <= section.range[1])
    || AHAVAT_TORAH_SECTIONS[0];
}

