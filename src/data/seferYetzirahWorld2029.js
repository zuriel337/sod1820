export const SEFER_YETZIRAH_SOURCE = Object.freeze({
  identity: "book:sefer-yetzirah-9perushim",
  title: "ספר יצירה · תשעה פירושים",
  shortTitle: "ספר יצירה",
  attribution: "מיוחס לאברהם אבינו ע״ה",
  edition: "מהדורת ווארשא · לעווין־עפשטיין",
  pdfPages: 220,
  pdfUrl: "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/Book/Sefer%20Yetsirah.pdf",
});

export const SEFER_YETZIRAH_SCENE_MODES = Object.freeze([
  Object.freeze({ id: "sefirot", label: "עשר ספירות", short: "10", description: "עשרה עומקים כמרחב אחד שאפשר לסובב ולחקור." }),
  Object.freeze({ id: "letters", label: "כ״ב אותיות", short: "22", description: "שלוש אמות, שבע כפולות ושתים־עשרה פשוטות במסלול אחד." }),
  Object.freeze({ id: "gates", label: "רל״א שערים", short: "231", description: "כל זוג אותיות נעשה שער בתוך רשת הצירופים." }),
  Object.freeze({ id: "osn", label: "עולם · שנה · נפש", short: "3", description: "שלושה ממדים מקבילים: מרחב, זמן ואדם." }),
  Object.freeze({ id: "commentaries", label: "תשעת המפרשים", short: "9", description: "תשעה קולות מקיפים מקור אחד בתוך הכרך המשולב." }),
]);

export const SEFER_YETZIRAH_DEPTHS = Object.freeze([
  Object.freeze({ id: "beginning", label: "עומק ראשית", axis: "זמן", color: "#f4bf55" }),
  Object.freeze({ id: "end", label: "עומק אחרית", axis: "זמן", color: "#d99a42" }),
  Object.freeze({ id: "good", label: "עומק טוב", axis: "ערך", color: "#62c6a5" }),
  Object.freeze({ id: "evil", label: "עומק רע", axis: "ערך", color: "#d86f72" }),
  Object.freeze({ id: "up", label: "עומק רום", axis: "מרחב", color: "#8eb9ff" }),
  Object.freeze({ id: "down", label: "עומק תחת", axis: "מרחב", color: "#6481c3" }),
  Object.freeze({ id: "east", label: "עומק מזרח", axis: "מרחב", color: "#efad54" }),
  Object.freeze({ id: "west", label: "עומק מערב", axis: "מרחב", color: "#a07bc7" }),
  Object.freeze({ id: "north", label: "עומק צפון", axis: "מרחב", color: "#76a9b7" }),
  Object.freeze({ id: "south", label: "עומק דרום", axis: "מרחב", color: "#d78261" }),
]);

export const SEFER_YETZIRAH_LETTER_GROUPS = Object.freeze([
  Object.freeze({ id: "mothers", label: "שלוש אמות", letters: "אמ״ש", count: 3, color: "#f4bf55", role: "איזון בין אוויר, מים ואש" }),
  Object.freeze({ id: "doubles", label: "שבע כפולות", letters: "בג״ד כפר״ת", count: 7, color: "#75bca8", role: "זוגות, כיוונים וכוכבים" }),
  Object.freeze({ id: "simples", label: "שתים־עשרה פשוטות", letters: "הו״ז חט״י לנס״ע צ״ק", count: 12, color: "#8f8ee8", role: "גבולות, חודשים וכוחות הנפש" }),
]);

export const SEFER_YETZIRAH_COMMENTATORS = Object.freeze([
  Object.freeze({ id: "chachmoni", name: "חכמוני", author: "ר׳ שבתי דונולו", pages: "125–152", start: 125, end: 152, form: "חיבור עצמאי", guide: "מבוא האדם כעולם קטן ולאחריו פירוש שיטתי לששת פרקי הספר.", color: "#e2b458" }),
  Object.freeze({ id: "raavad", name: "הראב״ד", author: "פירוש הראב״ד", pages: "7–124", start: 7, end: 124, form: "הקדמה וגוף משולב", guide: "ההקדמה הארוכה פותחת את הכרך, והפירוש מלווה את גוף המשניות המשולב.", color: "#7fb9dd" }),
  Object.freeze({ id: "ramban", name: "רמב״ן", author: "פירוש המיוחס לרמב״ן", pages: "29–124", start: 29, end: 124, form: "גוף משולב", guide: "קול פרשני נוסף המודפס לצד נוסח המשנה והמפרשים האחרים.", color: "#83c6a9" }),
  Object.freeze({ id: "saadia", name: "רס״ג", author: "פירוש המיוחס לרב סעדיה גאון", pages: "29–124", start: 29, end: 124, form: "גוף משולב", guide: "מסורת פרשנית קדומה המשולבת ברצף ששת הפרקים.", color: "#cd91b5" }),
  Object.freeze({ id: "wormser", name: "הרוקח", author: "ר׳ אליעזר מגרמייזא", pages: "29–124", start: 29, end: 124, form: "גוף משולב", guide: "פירוש קדום הנקרא בתוך המארג המקביל של הכרך.", color: "#9b9be8" }),
  Object.freeze({ id: "botril", name: "בוטריל", author: "ר׳ משה בוטריל", pages: "28–124", start: 28, end: 124, form: "הקדמה וגוף משולב", guide: "הקדמה נפרדת בעמוד 28 ולאחריה נוכחות בתוך הגוף המשולב.", color: "#de8e69" }),
  Object.freeze({ id: "otzar", name: "אוצר ה׳", author: "ר׳ משה בר יעקב הגולה", pages: "29–124", start: 29, end: 124, form: "גוף משולב", guide: "אחד מקולות הפירוש שנדפסו סביב נוסח ספר יצירה.", color: "#72b9b8" }),
  Object.freeze({ id: "gra", name: "הגר״א", author: "ר׳ אליהו מווילנא", pages: "153–203", start: 153, end: 203, form: "מהדורה ופירוש מקביל", guide: "פירוש בן שישה פרקים, ליקוטים ולוח רל״א השערים.", color: "#73a6e6" }),
  Object.freeze({ id: "peri-yitzchak", name: "פרי יצחק", author: "ר׳ יצחק אייזיק ממאהליב", pages: "153–207", start: 153, end: 207, form: "פירוש מקביל וטבלאות", guide: "פירוש מקביל לגר״א, טבלאות שערים ופתיחת ל״ב הנתיבות.", color: "#d6a94e" }),
]);

const PAGE_ZONES = Object.freeze([
  Object.freeze({ start: 1, end: 4, id: "binding", title: "מעטפת הכרך", guide: "כריכה, דפי מגן וחותמת בית הדפוס.", color: "#777f91" }),
  Object.freeze({ start: 5, end: 6, id: "title", title: "שער הכרך ותשעת המפרשים", guide: "שער הספר מציג את זהות הכרך, רשימת תשעת הפירושים והדפוס הוורשאי.", color: "#c99e4d" }),
  Object.freeze({ start: 7, end: 27, id: "raavad-preface", title: "הקדמת הראב״ד", guide: "הכניסה הרעיונית הארוכה אל שפת היצירה ואל קריאת המשניות.", color: "#6f9fc9" }),
  Object.freeze({ start: 28, end: 28, id: "botril-preface", title: "הקדמת ר׳ משה בוטריל", guide: "דף הקדמה עצמאי לפני פתיחת הגוף המשולב.", color: "#cf835f" }),
  Object.freeze({ start: 29, end: 75, id: "synoptic-one", title: "פרק ראשון · עשר ספירות", guide: "נוסח המשנה והמפרשים נקראים במקביל; היחידה בונה את יסודות הספירות, העומקים והאותיות.", color: "#7499d5" }),
  Object.freeze({ start: 76, end: 90, id: "synoptic-two", title: "פרק שני · כ״ב אותיות", guide: "משפחות האותיות, הקול והפה, הצירוף, השקילה, ההמרה וזוגות האותיות.", color: "#8f8ee8" }),
  Object.freeze({ start: 91, end: 98, id: "synoptic-three", title: "פרק שלישי · אמ״ש", guide: "שלוש האמות כציר מתווך בין יסודות ומצבים מנוגדים.", color: "#d5a44d" }),
  Object.freeze({ start: 99, end: 112, id: "synoptic-four", title: "פרק רביעי · שבע כפולות", guide: "שבע האותיות הכפולות, מחזורים, כיוונים וסדרי בנייה מן האותיות.", color: "#73b89e" }),
  Object.freeze({ start: 113, end: 120, id: "synoptic-five", title: "פרק חמישי · י״ב פשוטות", guide: "שתים־עשרה האותיות כטבעת של גבולות, חודשים וכוחות באדם.", color: "#b986c5" }),
  Object.freeze({ start: 121, end: 124, id: "synoptic-six", title: "פרק שישי · חתימת המהלך", guide: "חיבור 3·7·12, צירופי האמות וסיפור אברהם החותם את הספר.", color: "#d08b63" }),
  Object.freeze({ start: 125, end: 127, id: "chachmoni-opening", title: "פתיחת ספר חכמוני", guide: "שער, מבוא העורך והקדמת ר׳ שבתי דונולו.", color: "#d9ac55" }),
  Object.freeze({ start: 128, end: 134, id: "chachmoni-microcosm", title: "האדם כעולם קטן", guide: "חלק ראשון של חכמוני: גוף האדם כמראה של מבנה העולם.", color: "#c68d59" }),
  Object.freeze({ start: 135, end: 152, id: "chachmoni-commentary", title: "פירוש חכמוני לששת הפרקים", guide: "קריאה רציפה מן הספירות והאותיות עד עולם־שנה־נפש ותלי־גלגל־לב.", color: "#caa14e" }),
  Object.freeze({ start: 153, end: 154, id: "gra-opening", title: "שער הגר״א ופרי יצחק", guide: "שער פנימי והצעת המסדר למהדורה המקבילה.", color: "#779ed2" }),
  Object.freeze({ start: 155, end: 195, id: "gra-commentary", title: "הגר״א ופרי יצחק · שישה פרקים", guide: "שני קולות מקבילים מלווים את נוסח הספר דרך ל״ב הנתיבות, הספירות ומשפחות האותיות.", color: "#6f99d6" }),
  Object.freeze({ start: 196, end: 202, id: "gra-gleanings", title: "ליקוטי הגר״א", guide: "חטיבת השלמות נפרדת לאחר סיום הפירוש הראשי.", color: "#6889bd" }),
  Object.freeze({ start: 203, end: 206, id: "gates-tables", title: "רל״א שערים ודיאגרמות", guide: "לוח השערים של הגר״א ורשתות השערים והספירות של פרי יצחק.", color: "#d5a94f" }),
  Object.freeze({ start: 207, end: 211, id: "paths-ari", title: "ל״ב נתיבות ופירוש האר״י", guide: "פתיחת ל״ב הנתיבות ולאחריה פירוש המיוחס לאר״י.", color: "#947cc1" }),
  Object.freeze({ start: 212, end: 213, id: "appendices", title: "כליל תכנית ומאמר קדישין", guide: "שתי גרסאות נפרדות של חיבורי אמ״ש ובג״ד כפר״ת ונספח פרשני.", color: "#a67fb0" }),
  Object.freeze({ start: 214, end: 216, id: "old-recension", title: "נוסחה ישנה", guide: "נוסח הסיום שנדפס על פי דפוס מנטובה, עד חתימת ספר יצירה.", color: "#bc885c" }),
  Object.freeze({ start: 217, end: 220, id: "endpapers", title: "חתימת הכרך", guide: "דפי מגן אחוריים והכריכה האחורית.", color: "#777f91" }),
]);

const PAGE_ANCHORS = Object.freeze({
  29: Object.freeze({ title: "פתיחת הגוף המשולב", guide: "משנה ראשונה של פרק א׳: מכאן מתחילה הקריאה המקבילה בין נוסח הספר למפרשים." }),
  40: Object.freeze({ title: "טבלת מזלות ושמות", guide: "עמוד חזותי שבו המבנה הרעיוני נעשה תרשים." }),
  42: Object.freeze({ title: "גלגל צירופי השם", guide: "דיאגרמה מעגלית של שנים־עשר צירופים בתוך הגוף המשולב." }),
  65: Object.freeze({ title: "3 · 7 · 12 בתוך פרק א׳", guide: "חלוקת האותיות מופיעה כבר בתוך רצף הפרק הראשון." }),
  76: Object.freeze({ title: "כ״ב אותיות יסוד", guide: "פתיחת פרק ב׳ וחלוקת האותיות לשלוש אמות, שבע כפולות ושתים־עשרה פשוטות." }),
  80: Object.freeze({ title: "חמשת מוצאות הפה ורל״א שערים", guide: "קול, רוח, פה וחמש קבוצות ההגייה לצד פעולת זוגות האותיות." }),
  85: Object.freeze({ title: "יצר · צרף · שקל · המיר", guide: "טבלת זיווגי האלפבית ומניין הצירופים מוצגים בעמוד אחד." }),
  91: Object.freeze({ title: "פתיחת שלוש האמות", guide: "אמ״ש מקבלות פרק עצמאי כמבנה של ניגוד ותיווך." }),
  102: Object.freeze({ title: "התרשים המעגלי", guide: "דיאגרמה חזותית בתוך פרק שבע הכפולות." }),
  111: Object.freeze({ title: "אבנים בונות בתים", guide: "מעבר מזוגות אותיות למספר סידורים הולך וגדל." }),
  113: Object.freeze({ title: "פתיחת י״ב הפשוטות", guide: "שתים־עשרה אותיות, גבולות וכוחות באדם." }),
  124: Object.freeze({ title: "סיום הגוף המשולב", guide: "סליק פרקא וסליק ספר יצירה — חתימה מפורשת של החטיבה הראשונה." }),
  125: Object.freeze({ title: "שער ספר חכמוני", guide: "מעבר מחטיבה משולבת לחיבור עצמאי של ר׳ שבתי דונולו." }),
  131: Object.freeze({ title: "דמהו לעולם", guide: "האדם נקרא כמיקרוקוסמוס: גוף קטן המשקף את מבנה העולם." }),
  135: Object.freeze({ title: "תחילת פירוש ספר יצירה", guide: "חכמוני עובר מן המבוא הפילוסופי לפירוש הפסוקים והמשניות." }),
  138: Object.freeze({ title: "קול, רוח וחמשת המוצאות", guide: "חכמוני מוסר מופע עצמאי של תהליך יצירת האות בפה." }),
  140: Object.freeze({ title: "עולם · שנה · נפש", guide: "שלושת הממדים מופיעים יחד בתוך פירוש שלוש האמות." }),
  151: Object.freeze({ title: "תלי · גלגל · לב", guide: "שלושה מוקדי הנהגה חותמים את המהלך בעולם, במחזור ובאדם." }),
  155: Object.freeze({ title: "ל״ב נתיבות החכמה", guide: "פתיחת נוסח הגר״א ופרי יצחק: עשר ספירות וכ״ב אותיות כמערכת אחת." }),
  160: Object.freeze({ title: "עשר ולא תשע", guide: "נוסחת הגבול של עשר הספירות עומדת במרכז הקריאה." }),
  175: Object.freeze({ title: "שש קצוות וחותמות", guide: "המרחב נבנה באמצעות שישה כיוונים וצירופי אותיות." }),
  178: Object.freeze({ title: "מנוע הצירוף", guide: "יצירה, צירוף, שקילה והמרה כפעולה מחזורית של כל אות עם האחרות." }),
  182: Object.freeze({ title: "שבע כפולות", guide: "המערכת השבעית נקראת דרך זוגות, מחזורים וכיוונים." }),
  186: Object.freeze({ title: "שתים־עשרה פשוטות", guide: "המערכת השנים־עשרית פורשת טבעת של גבולות וכוחות." }),
  190: Object.freeze({ title: "שלוש הקרנות של מבנה אחד", guide: "עולם, שנה ונפש מוצגים כשלושה ממדים מקבילים." }),
  203: Object.freeze({ title: "לוח רל״א השערים", guide: "הכותרת המפורשת והטבלה השלמה של זוגות האותיות לפי הגר״א." }),
  204: Object.freeze({ title: "אותיות על סריג הספירות", guide: "שתים־עשרה האותיות הפשוטות מוצבות על קווים במבנה ספירתי." }),
  207: Object.freeze({ title: "ל״ב נתיבות לפרי יצחק", guide: "פתיחת חטיבה חדשה המחברת נתיבים, אותיות וספירות." }),
  214: Object.freeze({ title: "פתיחת הנוסחה הישנה", guide: "הכרך מצרף נוסח נוסף של ספר יצירה על פי דפוס מנטובה." }),
  216: Object.freeze({ title: "סליק ספר יצירה הקדוש", guide: "חתימת הנוסחה הישנה וקולופון המדפיס מסיימים את גוף הטקסט." }),
});

export const SEFER_YETZIRAH_PAGE_ATLAS = Object.freeze(Array.from({ length: 220 }, (_, index) => {
  const page = index + 1;
  const zone = PAGE_ZONES.find(item => page >= item.start && page <= item.end);
  const anchor = PAGE_ANCHORS[page];
  return Object.freeze({ page, zoneId: zone.id, title: anchor?.title || zone.title, guide: anchor?.guide || zone.guide, color: zone.color, isAnchor: Boolean(anchor) });
}));

const GEMATRIA_VALUES = Object.freeze({ א: 1, ב: 2, ג: 3, ד: 4, ה: 5, ו: 6, ז: 7, ח: 8, ט: 9, י: 10, כ: 20, ל: 30, מ: 40, נ: 50, ס: 60, ע: 70, פ: 80, צ: 90, ק: 100, ר: 200, ש: 300, ת: 400 });
const LETTER_ORDER = "אבגדהוזחטיכלמנסעפצקרשת";
export const SEFER_YETZIRAH_LETTERS = Object.freeze([...LETTER_ORDER].map((letter, index) => {
  const group = "אמש".includes(letter) ? SEFER_YETZIRAH_LETTER_GROUPS[0] : "בגדכפרת".includes(letter) ? SEFER_YETZIRAH_LETTER_GROUPS[1] : SEFER_YETZIRAH_LETTER_GROUPS[2];
  return Object.freeze({ letter, index, value: GEMATRIA_VALUES[letter], groupId: group.id, group: group.label, color: group.color, role: group.role });
}));

export function getSeferYetzirahGateNumber(firstLetter, secondLetter) {
  const first = LETTER_ORDER.indexOf(firstLetter);
  const second = LETTER_ORDER.indexOf(secondLetter);
  if (first < 0 || second < 0 || first === second) return null;
  const low = Math.min(first, second);
  const high = Math.max(first, second);
  let before = 0;
  for (let index = 0; index < low; index += 1) before += 21 - index;
  return before + high - low;
}

export const SEFER_YETZIRAH_READING_GATES = Object.freeze([
  Object.freeze({
    id: "paths", index: "01", title: "ל״ב נתיבות החכמה", page: 155, mode: "sefirot", source: "בשלשים ושתים נתיבות פליאות חכמה... וברא עולמו בשלשה ספרים: בספר, וספר, וספור.",
    explanation: "הפתיחה מציגה את הבריאה כמערכת שיש לה שלושים ושניים נתיבים. בכרך, הפירושים קוראים את המספר כמבנה המחבר עשר ספירות וכ״ב אותיות. שלושת ה׳ספרים׳ מתארים יצירה שנעשית באמצעות סימן כתוב, מידה מספרית וסיפור או דיבור שמעניק לסימן תנועה ומשמעות.",
    focus: "10 + 22 = 32", sourceRef: "book:sefer-yetzirah-9perushim#p155:gra_commentary:gra:mishnah1",
  }),
  Object.freeze({
    id: "ten", index: "02", title: "עשר ספירות בלימה", page: 160, mode: "sefirot", source: "עשר ספירות בלימה — עשר ולא תשע, עשר ולא אחת עשרה.",
    explanation: "הספירות כאן אינן רק רשימת שמות. הן גבולות של תפיסה: התחלה וסוף, טוב ורע, מעלה ומטה וארבע רוחות. המילה ׳בלימה׳ מחזיקה מתח בין מידה לבין מה שאי־אפשר לאחוז בו; לכן המודל התלת־ממדי מציג אותן כעומקים סביב מרכז פתוח.",
    focus: "עשרה עומקים", sourceRef: "book:sefer-yetzirah-9perushim#p160:gra_commentary:gra:ten_sefirot_refrain",
  }),
  Object.freeze({
    id: "directions", index: "03", title: "שש קצוות וחותמות", page: 175, mode: "sefirot", source: "בחר שלש אותיות אמ״ש... וחתם בהם שש קצוות. פנה למעלה... פנה למטה...",
    explanation: "הספר מתאר מרחב שאינו ניטרלי: כל כיוון נחתם בצירוף אותיות. מעלה, מטה וארבע הרוחות נעשים שישה קצוות של נפח. הסיבוב במודל מאפשר לראות שהמרכז אינו קצה נוסף, אלא נקודת היחס שממנה הכיוונים מקבלים משמעות.",
    focus: "6 קצוות", sourceRef: "book:sefer-yetzirah-9perushim#p175:gra_commentary:gra:six_extremities",
  }),
  Object.freeze({
    id: "letters", index: "04", title: "כ״ב אותיות יסוד", page: 76, mode: "letters", source: "עשרים ושתים אותיות יסוד, שלש אמות, שבע כפולות ושתים עשרה פשוטות.",
    explanation: "האלפבית מתחלק לשלוש משפחות שאינן רק דקדוקיות. כל משפחה נעשית שכבה של סדר: שלוש האמות פועלות כעקרונות יסוד, שבע הכפולות כזוגות וכיוונים, ושתים־עשרה הפשוטות כפריסה מחזורית רחבה. יחד הן יוצרות אלפבית שהוא גם מפה.",
    focus: "3 · 7 · 12", sourceRef: "book:sefer-yetzirah-9perushim#p76:synoptic_body:mishnah:ch2_m1",
  }),
  Object.freeze({
    id: "voice", index: "05", title: "קול, רוח ופה", page: 80, mode: "letters", source: "חקוקות בקול, חצובות ברוח, קבועות בפה בחמשה מקומות: אחה״ע, בומ״ף, גיכ״ק, דטלנ״ת, זסשר״ץ.",
    explanation: "האות עוברת שלושה מצבים: היא נחקקת כקול, נחצבת בזרימת הרוח ומקבלת צורה קבועה בפה. חמש קבוצות המוצא הופכות את הגוף לכלי יצירה. לכן הממשק מחבר את האותיות גם למשפחה הרעיונית שלהן וגם למקום שבו הן נעשות צליל.",
    focus: "5 מוצאות", sourceRef: "book:sefer-yetzirah-9perushim#p80:synoptic_body:mishnah:ch2_m3",
  }),
  Object.freeze({
    id: "gates", index: "06", title: "גלגל רל״א השערים", page: 203, mode: "gates", source: "סדר הרל״א שערים לפי דעת הגר״א ז״ל.",
    explanation: "עשרים ושתיים אותיות יוצרות מאתיים שלושים ואחד זוגות בלתי־חוזרים. כל זוג הוא שער: מפגש שבו אות אחת משנה את האופן שבו השנייה יכולה להיקרא. הרשת התלת־ממדית אינה הוכחה חיצונית; היא ציור נאמן לפעולת הצירוף שהכרך מציג בטבלה.",
    focus: "22 × 21 ÷ 2", sourceRef: "book:sefer-yetzirah-9perushim#p203:gra_gleanings:gra_231_gates:title",
  }),
  Object.freeze({
    id: "permutation", index: "07", title: "יצר · צרף · שקל · המיר", page: 178, mode: "gates", source: "יצר צרפן שקלן והמירן, א׳ עם כולם וכולם עם א׳, ב׳ עם כולם וכולם עם ב׳, וחוזרין חלילה.",
    explanation: "ארבעת הפעלים מתארים תהליך: לתת צורה, לחבר, למדוד ולהחליף. לא מדובר רק ברשימת זוגות אלא במנוע לשוני מחזורי. כל אות עוברת מול כל האחרות, והמשמעות נוצרת מן היחסים המשתנים ביניהן.",
    focus: "פעולת הצירוף", sourceRef: "book:sefer-yetzirah-9perushim#p178:gra_commentary:gra:mishnah_yatzar_tzarfan",
  }),
  Object.freeze({
    id: "mothers", index: "08", title: "שלוש אמות אמ״ש", page: 140, mode: "letters", source: "שלש אמות אמ״ש... א׳ מתווכת בין מ׳ הדוממת ובין ש׳ השורקת.",
    explanation: "אל״ף, מ״ם ושי״ן מציגות מערכת של ניגודים ותיווך. מים ואש אינם מתבטלים; הרוח שבאמצע מאפשרת להם להישאר שונים בתוך מבנה אחד. זוהי תבנית החוזרת בספר בין קול, יסודות, עונות וכוחות באדם.",
    focus: "אוויר · מים · אש", sourceRef: "book:sefer-yetzirah-9perushim#p140:chachmoni_treatise:part2:ch3:amash_open",
  }),
  Object.freeze({
    id: "doubles", index: "09", title: "שבע כפולות", page: 182, mode: "letters", source: "שבע כפולות בג״ד כפר״ת: חיים ושלום, חכמה ועושר, חן וזרע, ממשלה ושליטה.",
    explanation: "הכפילות מתבטאת בצליל קשה ורך ובצמדי מצבים. שבע האותיות נפרשות בשבעה כיוונים ומחזורי כוכבים. הפירוש קורא אותן כמערכת שבה כל כוח מופיע עם אפשרות הפוכה או משלימה.",
    focus: "7 זוגות", sourceRef: "book:sefer-yetzirah-9perushim#p182:gra_commentary:gra:perek4_title_m1",
  }),
  Object.freeze({
    id: "simples", index: "10", title: "שתים־עשרה פשוטות", page: 186, mode: "letters", source: "שתים עשרה פשוטות: ה׳ ו׳ ז׳ ח׳ ט׳ י׳ ל׳ נ׳ ס׳ ע׳ צ׳ ק׳.",
    explanation: "שתים־עשרה האותיות פותחות טבעת של גבולות אלכסוניים, חודשים וכוחות חישה ופעולה. בניגוד לציר של שלוש ולמערכת של שבע, כאן נוצרת הקפה שלמה: שנה שמסתובבת ומרחב שמקבל שנים־עשר מעברים.",
    focus: "12 גבולים", sourceRef: "book:sefer-yetzirah-9perushim#p186:gra_commentary:gra:perek5_title_m1",
  }),
  Object.freeze({
    id: "osn", index: "11", title: "עולם · שנה · נפש", page: 190, mode: "osn", source: "ראיה לדבר: עדים נאמנים — עולם ושנה ונפש.",
    explanation: "אותו מבנה מופיע בשלוש קומות: בעולם הוא מרחב וחומר; בשנה הוא זמן ומחזור; בנפש הוא גוף, חישה ותודעה. אין כאן שלושה ספרים נפרדים אלא שלוש הקרנות של דקדוק אחד. המודל מציג אותן כשלוש טבעות החודרות זו בזו.",
    focus: "מרחב · זמן · אדם", sourceRef: "book:sefer-yetzirah-9perushim#p190:gra_commentary:gra:perek6_title_m1",
  }),
  Object.freeze({
    id: "teli", index: "12", title: "תלי · גלגל · לב", page: 151, mode: "osn", source: "תלי בעולם כמלך על כסאו, גלגל בגוף כמלך במדינה, לב באדם כמלך במלחמה.",
    explanation: "בסיום המהלך מופיעים שלושה מרכזי הנהגה. התלי מסמן ציר כולל בעולם, הגלגל את התנועה המחזורית, והלב את מרכז ההכרעה באדם. שלושתם אינם זהים, אך כל אחד ממלא בתוך ממדו תפקיד של מוקד שמארגן תנועה סביבו.",
    focus: "3 מרכזי הנהגה", sourceRef: "book:sefer-yetzirah-9perushim#p151:chachmoni_treatise:part2:ch6:teli_galgal_lev",
  }),
]);

export const SEFER_YETZIRAH_VOLUME_LAYERS = Object.freeze([
  Object.freeze({ pages: "5–124", title: "הגוף המשולב", detail: "ספר יצירה עם תשעה פירושים קדומים המשולבים סביב נוסח המשנה." }),
  Object.freeze({ pages: "125–152", title: "ספר חכמוני", detail: "פירושו העצמאי של ר׳ שבתי דונולו, מן האדם הזעיר אל מבנה העולם." }),
  Object.freeze({ pages: "153–203", title: "הגר״א ופרי יצחק", detail: "נוסח בן שישה פרקים, שני פירושים מקבילים ולוח רל״א השערים." }),
  Object.freeze({ pages: "204–207", title: "דיאגרמות ונתיבות", detail: "אותיות על קווי הספירות, לוחות שערים ופתיחת ל״ב הנתיבות." }),
  Object.freeze({ pages: "208–216", title: "נספחים ונוסחה ישנה", detail: "פירוש המיוחס לאר״י, כליל תכנית ונוסח דפוס מנטובה." }),
]);
