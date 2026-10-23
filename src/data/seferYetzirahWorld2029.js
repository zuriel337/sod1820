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
