import {
  BEIT_MIDRASH_WORLD_SECTION,
  buildBeitMidrashWorldSections,
} from "./beitMidrashWorldSections.js";
import {
  BEIT_MIDRASH_SOD1820_PRESENTATION,
  BEIT_MIDRASH_SOD1820_PRESENTATION_ID,
  buildBeitMidrashSod1820Presentation,
  isBeitMidrashSod1820Slide,
} from "./beitMidrashSod1820Presentation.js";

const clean = (value) => value == null ? "" : String(value).trim();
const DEFAULT_EXAMPLE_LIMIT = 2;
const MAX_EXAMPLE_LIMIT = 3;

export const BEIT_MIDRASH_LEARNING_PILLAR = Object.freeze({
  LEARN: "learn",
  DISCOVER: "discover",
  PARTICIPATE: "participate",
});

export const BEIT_MIDRASH_LEARNING_SECTION = Object.freeze({
  START: "start",
  METHODS: "methods",
  CIPHERS: "ciphers",
  SOURCES: "sources",
  NUMBERS: "numbers",
  PATHS: "paths",
  GUIDED: "guided",
  PRACTICE: "practice",
  PARTICIPATE: "participate",
});

export const BEIT_MIDRASH_GUIDED_KIND = Object.freeze({
  CROSSING: "crossing",
  CONVERGENCE: "convergence",
  MAP: "map",
});

const SECTION_VALUES = new Set(Object.values(BEIT_MIDRASH_LEARNING_SECTION));
const GUIDED_KIND_VALUES = new Set(Object.values(BEIT_MIDRASH_GUIDED_KIND));

const freezeItems = (items) => Object.freeze(items.map((item) => Object.freeze({ ...item })));

const BEGINNER_CONCEPTS = freezeItems([
  {
    id: "hint",
    title: "רמז",
    body: "פרט שמעורר שאלה או מצביע על חיבור אפשרי. רמז הוא התחלה להתבוננות, לא תשובה סופית.",
  },
  {
    id: "source",
    title: "מקור",
    body: "המקום המדויק שממנו הגיע הפסוק, הציטוט, המספר או הסיפור. תמיד חוזרים אליו לפני שמסיקים מסקנה.",
  },
  {
    id: "calculation",
    title: "חישוב",
    body: "פעולה שנעשית לפי שיטה מוגדרת ואפשר לחזור עליה. אותה שיטה ואותו ביטוי צריכים להוביל לאותה תוצאה.",
  },
  {
    id: "interpretation",
    title: "פירוש",
    body: "המשמעות שאנו מציעים למה שגילינו. מציגים אותה ככיוון למחשבה ומבדילים בינה לבין המקור והחישוב.",
  },
]);

const sourceReadingStepHref = (stepId) => {
  const step = encodeURIComponent(clean(stepId));
  return `/beit-midrash?section=sources&step=${step}#source-step-${step}`;
};

const SOURCE_READING_STEPS = freezeItems([
  {
    id: "locator",
    title: "מוצאים את המקום המדויק",
    body: "מתחילים במראה המקום שמזהה היכן החומר נמצא. מזהה פנימי יכול לשמור מקום מדויק גם כאשר אינו כתובת אינטרנט.",
    check: "האם אפשר לחזור לאותו מקום במקור בלי לחפש אותו מחדש?",
    boundary: "אין להפוך מזהה פנימי לכתובת שלא נמסרה במקור.",
    href: sourceReadingStepHref("locator"),
  },
  {
    id: "context",
    title: "קוראים את ההקשר",
    body: "קוראים לפני הציטוט ואחריו, מזהים מי מדבר, על מה נכתב הקטע ובאיזה זמן או מצב הוא נאמר.",
    check: "האם המשפט מקבל משמעות אחרת כאשר קוראים את הפסקה או היחידה שסביבו?",
    boundary: "משפט בודד אינו מחליף את ההקשר שבו הופיע.",
    href: sourceReadingStepHref("context"),
  },
  {
    id: "quotation",
    title: "מבדילים בין ציטוט לסיכום",
    body: "ציטוט שומר את לשון המקור; סיכום מתאר אותה במילים שלנו. מציגים בבירור מה נאמר במקור ומה נוסח לצורך ההסבר.",
    check: "אילו מילים הגיעו מן המקור ואילו מילים נוספו בהסבר?",
    boundary: "אין להציג ניסוח מסכם כאילו היה ציטוט מדויק.",
    href: sourceReadingStepHref("quotation"),
  },
  {
    id: "calculation",
    title: "בודקים את החישוב בנפרד",
    body: "אם המקור מלווה בחישוב, חוזרים על הפעולה לפי השיטה שנמסרה. החישוב והציטוט נבדקים בנפרד לפני שמחברים ביניהם.",
    check: "האם אותה שיטה ואותו ביטוי מובילים שוב לאותה תוצאה?",
    boundary: "חישוב שחוזר בהצלחה אינו מוכיח לבדו את הפירוש שניתן לו.",
    href: sourceReadingStepHref("calculation"),
  },
  {
    id: "independence",
    title: "בודקים עצמאות בין מקורות",
    body: "כמה הופעות שחוזרות לאותו מקום הן כמה הופעות של מקור אחד. מקור עצמאי נוסף צריך להביא חומר ממקום נפרד, לא רק לחזור על אותו מראה מקום.",
    check: "האם כל הופעה חוזרת למקום אחר, או שכולן מצביעות על אותו מקור?",
    boundary: "מספר ההופעות אינו מספר המקורות העצמאיים.",
    href: sourceReadingStepHref("independence"),
  },
  {
    id: "interpretation",
    title: "מפרידים בין המקור לפירוש",
    body: "לאחר שהמקור והחישוב ברורים, אפשר להציע משמעות. מסמנים אותה כפירוש או כיוון למחשבה ולא מייחסים אותה אוטומטית למקור.",
    check: "מה ידוע מן המקור, מה התקבל בחישוב ומה מוצע כאן כפירוש?",
    boundary: "פירוש אינו משנה את לשון המקור ואינו הופך לעובדה רק מפני שהוא מתאים לרמז.",
    href: sourceReadingStepHref("interpretation"),
  },
  {
    id: "return",
    title: "שומרים דרך חזרה",
    body: "מסיימים בקישור או במזהה שמחזירים אל המקום הקנוני. כתובת אינטרנט מוצגת רק כאשר המקור מסר כתובת מאומתת.",
    check: "האם הקורא יכול לפתוח את המקור המדויק ולחזור אחר כך לבית המדרש?",
    boundary: "קישור נוח אינו מחליף מראה מקום מדויק, ומראה מקום פנימי אינו בהכרח קישור.",
    href: sourceReadingStepHref("return"),
  },
]);

const SOURCE_READING_STEP_VALUES = new Set(SOURCE_READING_STEPS.map((step) => step.id));

const SOURCE_READING_EXERCISE_OPTIONS = freezeItems([
  {
    id: "three-independent-sources",
    label: "שלושה מקורות עצמאיים, מפני שהציטוט מופיע שלוש פעמים",
  },
  {
    id: "one-source-three-occurrences",
    label: "מקור עצמאי אחד ושלוש הופעות שלו",
  },
  {
    id: "no-source-until-web-link",
    label: "אין מקור עד שמופיעה כתובת אינטרנט",
  },
]);

const SOURCE_READING_LESSON = Object.freeze({
  id: "source-reading",
  title: "לומדים לקרוא מקור",
  description: "מן המקום המדויק אל ההקשר, הציטוט, הבדיקה והפירוש — עם דרך חזרה שאפשר לעקוב אחריה.",
  href: "/beit-midrash?section=sources#source-reading-lesson",
  anchor: "source-reading-lesson",
  objectives: Object.freeze([
    "לזהות מראה מקום מדויק בלי להמציא כתובת.",
    "להפריד בין ציטוט, חישוב ופירוש.",
    "להבחין בין כמה הופעות לבין כמה מקורות עצמאיים.",
    "לשמור דרך חזרה למקור ולבית המדרש.",
  ]),
  steps: SOURCE_READING_STEPS,
  exercise: Object.freeze({
    id: "source-independence",
    title: "נסו בעצמכם",
    prompt: "אותו ציטוט מופיע בכותרת, בתקציר ובגוף של אותו מאמר, וכל שלוש ההופעות חוזרות לאותו מקום. מה נכון לומר?",
    options: SOURCE_READING_EXERCISE_OPTIONS,
    correctOptionId: "one-source-three-occurrences",
    explanation: "יש כאן שלוש הופעות של מקור אחד. חזרה על אותו מקום אינה מוסיפה מקור עצמאי.",
    feedbackMode: "explanation-only",
  }),
  continuation: Object.freeze({
    title: "לתרגול בנקודת מפגש",
    href: "/beit-midrash?section=guided",
  }),
  progress: Object.freeze({
    persistence: "url-only",
    storesPersonalData: false,
  }),
});

const cipherReadingStepHref = (stepId) => {
  const step = encodeURIComponent(clean(stepId));
  return `/beit-midrash?section=ciphers&step=${step}#cipher-step-${step}`;
};

const CIPHER_READING_STEPS = freezeItems([
  {
    id: "text",
    title: "קובעים את הטקסט ואת גבולותיו",
    body: "מתחילים בטקסט הקנוני ובטווח מדויק. מציינים מאין מתחילים והיכן מסתיים החיפוש לפני שקוראים את התוצאה.",
    check: "האם אפשר לפתוח את אותו טקסט ואת אותו טווח בלי לנחש למה התכוונו?",
    boundary: "החלפת נוסח, ספר או טווח יוצרת חיפוש אחר ואינה המשך שקט של אותו חיפוש.",
    href: cipherReadingStepHref("text"),
  },
  {
    id: "parameters",
    title: "רושמים את תנאי החיפוש",
    body: "שומרים את נקודת ההתחלה, כיוון הקריאה וגודל הדילוג. התנאים הם חלק מן התוצאה, לא פרט טכני שאפשר להשמיט.",
    check: "האם נקודת ההתחלה, הכיוון והדילוג מופיעים במפורש?",
    boundary: "מילה שנמצאה בלי תנאי החיפוש שלה אינה תוצאה שאפשר לחזור עליה.",
    href: cipherReadingStepHref("parameters"),
  },
  {
    id: "letters",
    title: "עוקבים אחר האותיות במקומן",
    body: "בודקים שכל אות מגיעה מן המיקום שהמנוע מציג ובאותו דילוג. ההמחשה מסייעת לקריאה, אך המנוע הקנוני הוא שמחשב את המיקומים.",
    check: "האם כל מעבר בין שתי אותיות שומר על אותו דילוג ועל אותו כיוון?",
    boundary: "בית המדרש אינו מחשב דילוגים בעצמו ואינו מחליף את תוצאת המנוע.",
    href: cipherReadingStepHref("letters"),
  },
  {
    id: "repeat",
    title: "מוודאים שאפשר לחזור על התוצאה",
    body: "פותחים את אותם תנאים בכלי הצפנים ובודקים שמתקבלת אותה סדרת אותיות. כך מבדילים בין תוצאה שמורה לבין התרשמות חזותית.",
    check: "האם אותם טקסט, טווח ותנאים מחזירים את אותה תוצאה?",
    boundary: "חזרה מוצלחת מאמתת את החישוב בלבד; היא אינה מוכיחה את המשמעות שמציעים לו.",
    href: cipherReadingStepHref("repeat"),
  },
  {
    id: "comparison",
    title: "משווים ולא בוחרים רק את מה שהתאים",
    body: "בודקים כמה טווחים ודילוגים נוסו ומה מופיע גם בבדיקות השוואה. תוצאה נבחרת נקראת לצד מרחב החיפוש שממנו הגיעה.",
    check: "האם מוצגים גם ניסיונות ההשוואה ולא רק ההתאמה שנבחרה?",
    boundary: "ריבוי ניסיונות מגדיל את הסיכוי להתאמה מקרית ואסור להסתיר אותו.",
    href: cipherReadingStepHref("comparison"),
  },
  {
    id: "source",
    title: "חוזרים למקור ולהקשר",
    body: "לאחר קריאת הרצף חוזרים לפסוקים או ליחידה שבהם נמצאו האותיות. קוראים את לשון המקור בלי להפוך את הרצף לציטוט חדש.",
    check: "האם מראה המקום וההקשר זמינים לצד רצף האותיות?",
    boundary: "רצף אותיות אינו מחליף את הפסוקים שמהם נלקחו האותיות.",
    href: cipherReadingStepHref("source"),
  },
  {
    id: "interpretation",
    title: "מפרידים בין תבנית לפירוש",
    body: "מסיימים בהבחנה בין מה שהמנוע מצא, ההשוואות שנעשו והמשמעות שמציעים. הפירוש נשאר הזמנה להתבוננות.",
    check: "מהי התוצאה המחושבת, מה נלמד מן ההשוואה ומה מוצע כפירוש?",
    boundary: "התאמה בדילוג אותיות אינה לבדה הוכחה לכוונה, לנבואה או לקשר היסטורי.",
    href: cipherReadingStepHref("interpretation"),
  },
]);

const CIPHER_READING_STEP_VALUES = new Set(CIPHER_READING_STEPS.map((step) => step.id));

const CIPHER_READING_LESSON = Object.freeze({
  id: "cipher-reading",
  title: "לומדים לקרוא דילוג אותיות",
  description: "מן הטקסט והתנאים אל האותיות, ההשוואה והפירוש — בלי להפוך תבנית למסקנה.",
  href: "/beit-midrash?section=ciphers#cipher-reading-lesson",
  anchor: "cipher-reading-lesson",
  objectives: Object.freeze([
    "לזהות את הטקסט, הטווח ותנאי החיפוש.",
    "לחזור על תוצאה דרך מנוע הצפנים הקנוני.",
    "לקרוא התאמה לצד ניסיונות ההשוואה.",
    "להפריד בין תבנית מחושבת לבין פירוש.",
  ]),
  steps: CIPHER_READING_STEPS,
  exercise: Object.freeze({
    id: "cipher-search-space",
    title: "נסו לקרוא נכון",
    prompt: "מילה הופיעה אחרי שנבדקו דילוגים וטווחים רבים, אבל מוצגת רק ההתאמה שנבחרה. מה עדיין חסר כדי לקרוא את התוצאה באחריות?",
    options: freezeItems([
      { id: "meaning", label: "רק פירוש מרגש יותר למילה" },
      { id: "comparison", label: "תנאי החיפוש, מרחב הניסיונות ובדיקות השוואה" },
      { id: "game-points", label: "ניקוד גבוה יותר למשחק" },
    ]),
    correctOptionId: "comparison",
    explanation: "התאמה נקראת יחד עם התנאים ומרחב החיפוש. בלי ההשוואה אי אפשר להעריך אם היא ייחודית או צפויה בין ניסיונות רבים.",
    feedbackMode: "explanation-only",
  }),
  continuation: Object.freeze({
    title: "לצפנים עם תמונות ולבדיקה במנוע",
    href: "/els?library=public",
  }),
  enginePractice: Object.freeze({
    title: "מתמונה אל אותה תוצאה במנוע",
    description: "הדוגמאות החזותיות מגיעות מספריית הצפנים הקנונית. פתיחת תמונה טוענת את הרשומה הציבורית; מיקום מדויק משוחזר במנוע, וצופן ותיק ללא מיקום מלא מסומן ונבדק מחדש.",
    searchHref: "/els",
    examplesHref: "/els?library=public",
    publicReader: "getMatrixLibraryPage",
    exactReplayHref: "savedMatrixWorkspaceHref",
    imageField: "image_url",
    engineIdentityFields: Object.freeze(["corpus_id", "search_term", "skip_distance", "direction", "start_index"]),
    visibility: Object.freeze({ status: "published", access: "public", enforcedBy: "RLS" }),
    createsEngine: false,
    createsImageStore: false,
  }),
  progress: Object.freeze({
    persistence: "url-only",
    storesPersonalData: false,
  }),
});

const NUMBER_GUIDE_CONCEPTS = freezeItems([
  {
    id: "number-page",
    title: "מה רואים בדף מספר?",
    body: "דף המספר אוסף ביטויים, דרכי חישוב, תכונות מתמטיות, מקורות וחיבורים סביב מספר אחד. כל שכבה מספרת משהו אחר, ולכן לא מחליפים עובדה בפירוש.",
    check: "זהו בכל פריט אם הוא חישוב, עובדה מתמטית, מקור, חיבור או פירוש.",
    boundary: "הופעה באותו דף אינה הופכת את כל הפריטים לאותה טענה.",
  },
  {
    id: "expressions-methods",
    title: "ביטוי, שיטה ותוצאה",
    body: "הביטוי הוא הטקסט שנבדק; השיטה קובעת כיצד מחשבים; התוצאה היא מה שהתקבל. החלפת שיטה יכולה לשנות את התוצאה, ולכן תמיד מציינים באיזו דרך חושב הערך.",
    check: "בדקו מהו הביטוי המדויק, איזו שיטה נבחרה והאם אפשר לחזור על שלבי החישוב.",
    boundary: "שני ביטויים שקיבלו אותו ערך אינם בהכרח בעלי אותה משמעות.",
  },
  {
    id: "verses",
    title: "פסוקים בעלי אותו ערך",
    body: "פסוק שמופיע בדף הגיע לקורא הפסוקים הקיים ונמצא שווה לערך בשיטה המוצגת. השוויון המספרי הוא נקודת פתיחה; את הפסוק קוראים גם במקומו ובהקשרו.",
    check: "חזרו למראה המקום, קראו את הפסוקים הסמוכים וודאו באיזו שיטה חושב הערך.",
    boundary: "שוויון מספרי אינו מחליף את לשון הפסוק ואת ההקשר שלו.",
  },
  {
    id: "math-profile",
    title: "הפרופיל המתמטי",
    body: "פירוק לגורמים מציג מאילו מספרים ראשוניים המספר בנוי. φ(n) סופר כמה מספרים קטנים ממנו זרים לו. סכום הספרות מחבר את ספרותיו, ושורש ספרות חוזר על החיבור עד שנשארת ספרה אחת.",
    check: "נסו לחשב מחדש את הפירוק, סכום הספרות ושורש הספרות לפי ההגדרה.",
    boundary: "תכונה מתמטית מדויקת עדיין אינה פירוש סמלי.",
  },
  {
    id: "math-families",
    title: "משפחות של מספרים",
    body: "ראשוני, משולשי, ריבועי, מצולע, מעוקב, חזקה של 2, מושלם, שופע או חסר, חצי־ראשוני, פלינדרומי, ספרות חוזרות, הרשד, שמח וארמסטרונג — אלה תיאורים מתמטיים מדויקים, לא פירוש סמלי בפני עצמו.",
    check: "פתחו את הגדרת המשפחה ובדקו שהמספר מקיים אותה, לא רק דומה לדוגמה מוכרת.",
    boundary: "שם של משפחה מתאר מבנה מספרי; הוא אינו מעניק למספר משמעות נוספת.",
  },
  {
    id: "prime-lens",
    title: "עדשת הראשוניים",
    body: "כאשר המספר ראשוני אפשר לראות את מקומו ברשימת הראשוניים, את הראשוני הקודם והבא ואת הפערים ביניהם. מספר שאינו ראשוני נשאר עם פירוק הגורמים שלו.",
    check: "ודאו תחילה שהמספר ראשוני, ואז בדקו את המספר הסידורי, השכנים והפערים.",
    boundary: "פער בין ראשוניים הוא נתון מחושב, לא רמז בפני עצמו.",
  },
  {
    id: "fibonacci",
    title: "פיבונאצ׳י ופירוק זקנדורף",
    body: "ברצף פיבונאצ׳י כל איבר הוא סכום שני קודמיו. בדף אנחנו משתמשים במוסכמה F1=1, F2=1. פירוק זקנדורף מציג כל מספר חיובי כסכום איברי פיבונאצ׳י שאינם סמוכים — דרך תיאור מדויקת, לא הוכחה למשמעות נסתרת.",
    check: "בדקו את מוסכמת האינדקסים ואת הסכום; בפירוק זקנדורף אין לבחור איברים סמוכים.",
    boundary: "חברות ברצף או פירוק תקין אינם הוכחה למשמעות נסתרת.",
  },
  {
    id: "sequences",
    title: "רצפים ומיקום בתוך π",
    body: "מד הרצפים מציג מיקום וערכים סמוכים כאשר קיימת התאמה מחושבת. ערך נגזר מתאר פעולה נוספת על התוצאה; הוא אינו זהה למספר המקורי ואינו מקבל משמעות בלי מקור והקשר.",
    check: "בדקו מה בדיוק חיפשו, באיזה רצף, באיזה מיקום ומה הייתה פעולת הגזירה.",
    boundary: "הופעה בתוך רצף או ערך נגזר אינה זהות עם המספר המקורי.",
  },
  {
    id: "relations",
    title: "מספרים קשורים ושיטת האפס",
    body: "מספר קשור חייב להגיע עם סיבה גלויה. שיטת האפס יוצרת נגזרת של המספר ומסלול חזרה אליו; נגזרת אינה שוויון, וקשר אינו אומר ששני המספרים זהים.",
    check: "חפשו את סיבת הקשר ואת מסלול החזרה מן המספר הנגזר אל מספר המקור.",
    boundary: "נגזרת אינה שוויון, וקשר אינו אומר ששני המספרים זהים.",
  },
  {
    id: "sources-and-meaning",
    title: "מקור, חיבור ופירוש",
    body: "מקור אומר מאין הגיע פרט; חיבור מצביע על יחס שניתן לבדוק; פירוש מציע כיצד להבין אותו. העולם מציג את מפת החיבורים, ובית המדרש מלמד איך לקרוא אותם.",
    check: "אתרו מראה מקום מדויק, נסחו את החיבור בנפרד ורק אחר כך קראו את הפירוש.",
    boundary: "פירוש טוב נשאר פירוש ואינו נכתב כאילו היה המקור עצמו.",
  },
  {
    id: "worlds-and-discoveries",
    title: "עולמות וגילויים",
    body: "עולם הוא הקשר רחב שמאגד אירועים, נושאים וחיבורים. גילוי הוא פריט מסוים בתוך המפה. דף המספר מציג חלון ממוקד; המפה והעמוד הקנוני נשארים בעולם.",
    check: "בדקו אם אתם קוראים פריט יחיד, אוסף סביב נושא או מפה רחבה של קשרים.",
    boundary: "החלון שבדף המספר אינו הרשימה המלאה ואינו מחליף את העולם.",
  },
  {
    id: "expressions-and-languages",
    title: "ביטויים ושפות",
    body: "כמה ביטויים יכולים להגיע לאותו מספר, לעיתים בשיטות שונות או בשפות שונות. התאמה מספרית אינה אומרת שהביטויים זהים; היא מזמינה לבדוק שיטה, תרגום והקשר.",
    check: "השוו את הכתיב, התרגום, שיטת החישוב וההקשר של כל ביטוי.",
    boundary: "ערך שווה אינו מוכיח זהות לשונית או רעיונית.",
  },
  {
    id: "people-media-time",
    title: "אנשים, מדיה וציר הזמן",
    body: "ייחוס לאדם מסביר מי תרם חומר; מדיה זקוקה לקשר ברור; וציר הזמן מספר מתי פריט נוסף. זמן ההוספה לאתר אינו בהכרח זמן האירוע שמתואר בו.",
    check: "בדקו ייחוס, מקור המדיה, מועד האירוע ומועד ההוספה כארבעה פרטים נפרדים.",
    boundary: "סדר ההוספה לאתר אינו בהכרח הסדר ההיסטורי של האירועים.",
  },
  {
    id: "journey-and-heichal",
    title: "מסע אישי והעמקה בהיכל",
    body: "המסע שומר רצף אישי ופרטי בין תחנות. ההיכל פותח בדיקה עמוקה, הרצות חדשות ושיחה עם רזיאל. בית המדרש מסביר את השיטות, אך אינו מחזיק את התיק האישי או את עבודת ההיכל.",
    check: "שימו לב באיזה בית אתם נמצאים: לימוד בבית המדרש, מפה בעולם, מסע אישי או בדיקה בהיכל.",
    boundary: "בית המדרש אינו שומר פרטים אישיים ואינו מחליף את עבודת ההיכל.",
  },
]);
const NUMBER_GUIDE_CONCEPT_VALUES = new Set(NUMBER_GUIDE_CONCEPTS.map((concept) => concept.id));

const LEARNING_PATH_DEFINITIONS = freezeItems([
  {
    id: "first-steps",
    title: "צעדים ראשונים",
    description: "רמז, מקור, חישוב ופירוש — ואיך מבדילים ביניהם.",
    href: "/beit-midrash?section=paths&path=first-steps#path-first-steps",
    steps: Object.freeze([
      { title: "מכירים את ארבע אבני היסוד", href: "/beit-midrash" },
      { title: "רואים דרך חישוב אחת", href: "/beit-midrash?section=methods" },
      { title: "פותחים דוגמה מודרכת", href: "/beit-midrash?section=guided" },
    ]),
  },
  {
    id: "gematria",
    title: "דרכי החישוב",
    description: "לומדים כל שיטת גימטריה, רואים דוגמה ומנסים בעצמנו.",
    href: "/beit-midrash?section=paths&path=gematria#path-gematria",
    steps: Object.freeze([
      { title: "בוחרים שיטה מן הרישום הקנוני", href: "/beit-midrash?section=methods" },
      { title: "קוראים את שלבי החישוב והזהירות", href: "/beit-midrash?section=methods" },
      { title: "מנסים בכלי הגימטריה", href: "/2029/gematria" },
    ]),
  },
  {
    id: "ciphers",
    title: "צפנים ודילוגי אותיות",
    description: "לומדים לקרוא את תנאי החיפוש, לחזור על התוצאה ולהבדיל בין תבנית לפירוש.",
    href: "/beit-midrash?section=paths&path=ciphers#path-ciphers",
    steps: Object.freeze([
      { title: "לומדים לקרוא דילוג צעד אחר צעד", href: CIPHER_READING_LESSON.href },
      { title: "פותחים צופן מצולם וחוזרים עליו במנוע", href: CIPHER_READING_LESSON.continuation.href },
      { title: "לומדים לבדוק מקור והקשר", href: SOURCE_READING_LESSON.href },
    ]),
  },
  {
    id: "number-page",
    title: "לקרוא דף מספר",
    description: "לומדים להבדיל בין תוצאה, תכונה מתמטית, מקור, חיבור ופירוש.",
    href: "/beit-midrash?section=paths&path=number-page#path-number-page",
    steps: Object.freeze([
      { title: "קוראים את מדריך דף המספר", href: "/beit-midrash?section=numbers" },
      { title: "לומדים פיבונאצ׳י וזקנדורף", href: "/beit-midrash?section=numbers&concept=fibonacci#number-concept-fibonacci" },
      { title: "מתרגלים תוצאה בכלי הגימטריה", href: "/2029/gematria" },
    ]),
  },
  {
    id: "sources",
    title: "קריאת מקורות",
    description: "חוזרים אל ההקשר, אל הציטוט המדויק ואל מקורות נוספים.",
    href: "/beit-midrash?section=paths&path=sources#path-sources",
    steps: Object.freeze([
      { title: "לומדים לקרוא מקור צעד אחר צעד", href: SOURCE_READING_LESSON.href },
      { title: "פותחים ספר או מקור קנוני", href: "/books" },
      { title: "בודקים את מסלול החזרה בדוגמה", href: "/beit-midrash?section=guided" },
    ]),
  },
  {
    id: "meetings",
    title: "הצלבות והתכנסויות",
    description: "לומדים מהי נקודת מפגש וכיצד כמה חיבורים מצטרפים לתמונה אחת.",
    href: "/beit-midrash?section=paths&path=meetings#path-meetings",
    steps: Object.freeze([
      { title: "קוראים נקודת מפגש מודרכת", href: "/beit-midrash?section=guided&kind=crossing" },
      { title: "רואים כיצד התמונה מתחברת", href: "/beit-midrash?section=guided&kind=convergence" },
      { title: "ממשיכים למפה המלאה בעולם", href: "/world#world-connections" },
    ]),
  },
  {
    id: "sod1820",
    title: "מסלול 1820",
    description: "מסלול מדורג להכרת המספר 1820, המקורות והשיטות שסביבו.",
    href: "/beit-midrash?section=paths&path=sod1820#path-sod1820",
    steps: Object.freeze([
      { title: "פותחים את מצגת מסע 1820", href: BEIT_MIDRASH_SOD1820_PRESENTATION.href },
      { title: "מכירים את שכבות דף המספר", href: "/beit-midrash?section=numbers" },
      { title: "לומדים לקרוא את הפרופיל המתמטי", href: "/beit-midrash?section=numbers&concept=math-profile#number-concept-math-profile" },
      { title: "לומדים דרך חישוב", href: "/beit-midrash?section=methods" },
      { title: "קוראים גילוי מודרך", href: "/beit-midrash?section=guided" },
      { title: "רואים את מפת החיבורים בעולם", href: "/world#world-connections" },
      { title: "מעמיקים עם רזיאל בהיכל", href: "/heichal" },
    ]),
  },
]);

const LEARNING_PATH_STEP_IDS = Object.freeze({
  "first-steps": Object.freeze(["foundations", "method", "guided-example"]),
  gematria: Object.freeze(["choose-method", "read-method", "calculator"]),
  ciphers: Object.freeze(["cipher-lesson", "cipher-tool", "source-reading"]),
  "number-page": Object.freeze(["number-guide", "fibonacci", "calculator"]),
  sources: Object.freeze(["source-lesson", "canonical-source", "guided-return"]),
  meetings: Object.freeze(["crossing", "convergence", "world-map"]),
  sod1820: Object.freeze(["presentation", "number-layers", "math-profile", "method", "guided-example", "world-map", "heichal"]),
});

const learningPathStepHref = (pathId, stepId) => {
  const path = encodeURIComponent(clean(pathId));
  const step = encodeURIComponent(clean(stepId));
  return `/beit-midrash?section=paths&path=${path}&pathStep=${step}#path-${path}-step-${step}`;
};

const LEARNING_PATHS = Object.freeze(LEARNING_PATH_DEFINITIONS.map((path) => Object.freeze({
  ...path,
  steps: freezeItems(path.steps.map((step, index) => {
    const id = LEARNING_PATH_STEP_IDS[path.id]?.[index] || `step-${index + 1}`;
    return {
      ...step,
      id,
      pathHref: learningPathStepHref(path.id, id),
    };
  })),
  progress: Object.freeze({
    persistence: "url-only",
    storesPersonalData: false,
    completionInferred: false,
  }),
})));

const LEARNING_PATH_VALUES = new Set(LEARNING_PATHS.map((path) => path.id));

function learningPathOf(pathId) {
  const id = clean(pathId);
  return LEARNING_PATHS.find((path) => path.id === id) || null;
}

const SECTIONS = freezeItems([
  {
    id: BEIT_MIDRASH_LEARNING_SECTION.START,
    pillar: BEIT_MIDRASH_LEARNING_PILLAR.LEARN,
    title: "איך מתחילים לגלות?",
    description: "ארבע אבני יסוד שעוזרות לקרוא כל גילוי בבהירות.",
  },
  {
    id: BEIT_MIDRASH_LEARNING_SECTION.METHODS,
    pillar: BEIT_MIDRASH_LEARNING_PILLAR.LEARN,
    title: "דרכי החישוב",
    description: "הסבר, דוגמה ותרגול לכל שיטת גימטריה מן הרישום הקנוני.",
  },
  {
    id: BEIT_MIDRASH_LEARNING_SECTION.CIPHERS,
    pillar: BEIT_MIDRASH_LEARNING_PILLAR.LEARN,
    title: "לקרוא בין האותיות",
    description: "צפנים ודילוגי אותיות, לצד הגבולות והזהירות הנדרשים בכל שיטה.",
  },
  {
    id: BEIT_MIDRASH_LEARNING_SECTION.SOURCES,
    pillar: BEIT_MIDRASH_LEARNING_PILLAR.LEARN,
    title: "לחזור אל המקור",
    description: "כיצד בודקים ציטוט, הקשר ועצמאות בין מקורות בלי לאבד את הדרך חזרה.",
  },
  {
    id: BEIT_MIDRASH_LEARNING_SECTION.NUMBERS,
    pillar: BEIT_MIDRASH_LEARNING_PILLAR.LEARN,
    title: "איך קוראים דף מספר?",
    description: "מדריך לשכבות שכבר מופיעות בדף המספר — מן החישוב ועד פיבונאצ׳י, מקורות וחיבורים.",
  },
  {
    id: BEIT_MIDRASH_LEARNING_SECTION.PATHS,
    pillar: BEIT_MIDRASH_LEARNING_PILLAR.LEARN,
    title: "מסלולי לימוד",
    description: "שיעורים קצרים ומסלולים מדורגים, ובהם מסלול 1820.",
  },
  {
    id: BEIT_MIDRASH_LEARNING_SECTION.GUIDED,
    pillar: BEIT_MIDRASH_LEARNING_PILLAR.DISCOVER,
    title: "לומדים דרך גילויים",
    description: "דוגמאות נבחרות מן העולם, מפורקות צעד אחר צעד ללמידה.",
  },
  {
    id: BEIT_MIDRASH_LEARNING_SECTION.PRACTICE,
    pillar: BEIT_MIDRASH_LEARNING_PILLAR.PARTICIPATE,
    title: "מנסים בעצמכם",
    description: "תרגול ומשחק שמחזקים את ההבנה בלי להפוך ניקוד למדד של אמת.",
  },
  {
    id: BEIT_MIDRASH_LEARNING_SECTION.PARTICIPATE,
    pillar: BEIT_MIDRASH_LEARNING_PILLAR.PARTICIPATE,
    title: "ממשיכים יחד",
    description: "משתפים רמז או מצטרפים לשיחה דרך הזרימות הקיימות של האתר.",
  },
]);

const DESTINATIONS = Object.freeze({
  calculator: Object.freeze({
    id: "calculator",
    title: "לתרגול במחשבון",
    description: "המחשבון הקנוני נפתח ככלי נפרד; בית המדרש אינו מחזיק עותק שלו.",
    href: "/2029/gematria",
    status: "ready",
  }),
  ciphers: Object.freeze({
    id: "ciphers",
    title: "לכלי הצפנים",
    description: "הכלי הקנוני נפתח בנפרד מן השיעור.",
    href: "/code",
    status: "ready",
  }),
  world: Object.freeze({
    id: "world",
    title: "למפת הידע בעולם",
    description: "שם נמצאות המפה המלאה, ההצלבות, ההתכנסויות והעמודים הקנוניים.",
    href: "/world#world-connections",
    status: "ready",
  }),
  heichal: Object.freeze({
    id: "heichal",
    title: "להעמקה בהיכל",
    description: "שם נפתחת החקירה העמוקה עם רזיאל והשפה המקצועית המלאה.",
    href: "/heichal",
    status: "ready",
  }),
  community: Object.freeze({
    id: "community",
    title: "לשיחת הקהילה",
    description: "השיחה ממשיכה במקום הקנוני של הקהילה.",
    href: "/community/chat",
    status: "ready",
  }),
  contribution: Object.freeze({
    id: "contribution",
    title: "לשתף רמז",
    description: "הרמז נשלח דרך שער הקשר הקנוני של האתר; בית המדרש אינו יוצר טופס או מאגר משלו.",
    href: null,
    action: "openIssueReport",
    status: "ready",
  }),
  game: Object.freeze({
    id: "game",
    title: "למשחק",
    description: "המשחק זמין רק ב־Preview שבו ממלכת המספרים הופעלה. הניקוד בו הוא משחקי ואינו דירוג של גילוי.",
    href: "/2029/kingdom",
    status: "preview_only",
  }),
});

const PRACTICE_ACTIVITIES = freezeItems([
  {
    id: "source-independence",
    title: "כמה מקורות יש כאן?",
    description: "מתרגלים את ההבדל בין כמה הופעות של אותו מקום לבין מקורות עצמאיים.",
    kind: "lesson-exercise",
    href: sourceReadingStepHref("independence"),
    actionLabel: "לתרגיל קריאת מקור",
    feedbackMode: SOURCE_READING_LESSON.exercise.feedbackMode,
    researchRating: false,
  },
  {
    id: "cipher-comparison",
    title: "מה צריך להשוות?",
    description: "קוראים תוצאת דילוג לצד תנאי החיפוש והניסיונות שנבדקו.",
    kind: "lesson-exercise",
    href: cipherReadingStepHref("comparison"),
    actionLabel: "לתרגיל קריאת דילוג",
    feedbackMode: CIPHER_READING_LESSON.exercise.feedbackMode,
    researchRating: false,
  },
  {
    id: "calculation",
    title: "חוזרים על חישוב",
    description: "פותחים את כלי הגימטריה הקנוני ומנסים ביטוי ושיטה בלי ליצור מחשבון נוסף.",
    kind: "canonical-tool",
    href: DESTINATIONS.calculator.href,
    actionLabel: DESTINATIONS.calculator.title,
    feedbackMode: "tool-result",
    researchRating: false,
  },
  {
    id: "guided-discovery",
    title: "קוראים נקודת מפגש",
    description: "משתמשים בשאלות ההתבוננות על דוגמה ציבורית שנקראת מן העולם.",
    kind: "guided-example",
    href: "/beit-midrash?section=guided",
    actionLabel: "לדוגמה מודרכת",
    feedbackMode: "reflection-only",
    researchRating: false,
  },
  {
    id: "game",
    title: "משחקים וזוכרים את הגבול",
    description: "הניקוד שייך למשחק בלבד; הוא אינו מודד גילוי, מקור או אמת.",
    kind: "preview-game",
    href: DESTINATIONS.game.href,
    actionLabel: DESTINATIONS.game.title,
    status: DESTINATIONS.game.status,
    feedbackMode: "game-only",
    researchRating: false,
  },
]);

const PRACTICE_ACTIVITY_VALUES = new Set(PRACTICE_ACTIVITIES.map((activity) => activity.id));

function practiceActivityOf(activityId) {
  const id = clean(activityId);
  return PRACTICE_ACTIVITIES.find((activity) => activity.id === id) || null;
}

export const BEIT_MIDRASH_LEARNING_MANIFEST = Object.freeze({
  identity: Object.freeze({
    eyebrow: "בית המדרש",
    title: "לומדים לגלות",
    description: "כאן לומדים את דרכי החישוב, הקריאה והפענוח — מבינים כיצד רמז נולד, חוזרים אל המקור ומנסים צעד אחר צעד.",
    canonicalRoute: "/beit-midrash",
  }),
  pillars: freezeItems([
    { id: BEIT_MIDRASH_LEARNING_PILLAR.LEARN, title: "לומדים" },
    { id: BEIT_MIDRASH_LEARNING_PILLAR.DISCOVER, title: "מגלים" },
    { id: BEIT_MIDRASH_LEARNING_PILLAR.PARTICIPATE, title: "משתתפים" },
  ]),
  sections: SECTIONS,
  beginnerConcepts: BEGINNER_CONCEPTS,
  cipherReadingLesson: CIPHER_READING_LESSON,
  sourceReadingLesson: SOURCE_READING_LESSON,
  numberGuideConcepts: NUMBER_GUIDE_CONCEPTS,
  learningPaths: LEARNING_PATHS,
  sod1820Presentation: BEIT_MIDRASH_SOD1820_PRESENTATION,
  practiceActivities: PRACTICE_ACTIVITIES,
  practicePolicy: Object.freeze({
    persistence: "url-only",
    completionInferred: false,
    gameScoreIsResearchRating: false,
  }),
  destinations: DESTINATIONS,
  methodLesson: Object.freeze({
    source: "canonical-method-registry",
    blocks: Object.freeze([
      "מה השיטה עושה",
      "איך החישוב בנוי",
      "דוגמה מודרכת",
      "מתי נזהרים",
      "נסו בעצמכם",
    ]),
  }),
  language: Object.freeze({
    crossing: Object.freeze({ title: "נקודת המפגש", eyebrow: "הצלבה" }),
    convergence: Object.freeze({ title: "כשהתמונה מתחברת", eyebrow: "התכנסות" }),
    missingValue: "אין נתון",
    unratedValue: "טרם דורג",
  }),
});

const LEGACY_TAB_MAP = Object.freeze({
  calc: Object.freeze({ section: BEIT_MIDRASH_LEARNING_SECTION.PRACTICE }),
  methods: Object.freeze({ section: BEIT_MIDRASH_LEARNING_SECTION.METHODS }),
  crosses: Object.freeze({ section: BEIT_MIDRASH_LEARNING_SECTION.GUIDED, guidedKind: BEIT_MIDRASH_GUIDED_KIND.CROSSING }),
  atlas: Object.freeze({ section: BEIT_MIDRASH_LEARNING_SECTION.GUIDED, guidedKind: BEIT_MIDRASH_GUIDED_KIND.MAP }),
  convergence: Object.freeze({ section: BEIT_MIDRASH_LEARNING_SECTION.GUIDED, guidedKind: BEIT_MIDRASH_GUIDED_KIND.CONVERGENCE }),
  searches: Object.freeze({ section: BEIT_MIDRASH_LEARNING_SECTION.START, adminOnly: true }),
  verified: Object.freeze({ section: BEIT_MIDRASH_LEARNING_SECTION.SOURCES }),
  sod1820: Object.freeze({ section: BEIT_MIDRASH_LEARNING_SECTION.PATHS, pathId: "sod1820" }),
  submit: Object.freeze({ section: BEIT_MIDRASH_LEARNING_SECTION.PARTICIPATE, destinationId: "contribution" }),
  community: Object.freeze({ section: BEIT_MIDRASH_LEARNING_SECTION.PARTICIPATE, destinationId: "community" }),
});

function searchParamsOf(search) {
  if (search instanceof URLSearchParams) return new URLSearchParams(search);
  const value = clean(search);
  return new URLSearchParams(value.startsWith("?") ? value.slice(1) : value);
}

function safeSection(value) {
  const section = clean(value).toLowerCase();
  return SECTION_VALUES.has(section) ? section : null;
}

function safeGuidedKind(value) {
  const kind = clean(value).toLowerCase();
  return GUIDED_KIND_VALUES.has(kind) ? kind : null;
}

function methodRoute(methodKey) {
  const method = clean(methodKey);
  return method ? `/beit-midrash/${encodeURIComponent(method)}` : "/beit-midrash";
}

export function beitMidrashLearningHref(section, {
  methodKey = null,
  guidedKind = null,
  findingId = null,
  pathId = null,
  pathStepId = null,
  activityId = null,
  conceptId = null,
  sourceStepId = null,
  cipherStepId = null,
  lessonId = null,
  slideId = null,
  destinationId = null,
} = {}) {
  const resolvedSection = safeSection(section) || BEIT_MIDRASH_LEARNING_SECTION.START;
  const params = new URLSearchParams();
  const methodOwnsSection = clean(methodKey) && resolvedSection === BEIT_MIDRASH_LEARNING_SECTION.METHODS;
  if (resolvedSection !== BEIT_MIDRASH_LEARNING_SECTION.START && !methodOwnsSection) {
    params.set("section", resolvedSection);
  }
  const kind = safeGuidedKind(guidedKind);
  if (resolvedSection === BEIT_MIDRASH_LEARNING_SECTION.GUIDED && kind) params.set("kind", kind);
  if (clean(findingId)) params.set("finding", clean(findingId));
  const requestedPath = clean(pathId);
  const learningPath = resolvedSection === BEIT_MIDRASH_LEARNING_SECTION.PATHS
    && LEARNING_PATH_VALUES.has(requestedPath)
    ? learningPathOf(requestedPath)
    : null;
  const safePathId = learningPath?.id || null;
  if (safePathId) params.set("path", safePathId);
  const requestedPathStep = clean(pathStepId);
  const pathStep = learningPath?.steps.find((step) => step.id === requestedPathStep) || null;
  if (pathStep) params.set("pathStep", pathStep.id);
  const presentationLesson = safePathId === "sod1820"
    && clean(lessonId) === BEIT_MIDRASH_SOD1820_PRESENTATION_ID
    ? BEIT_MIDRASH_SOD1820_PRESENTATION_ID
    : null;
  if (presentationLesson) params.set("lesson", presentationLesson);
  const presentationSlide = presentationLesson && isBeitMidrashSod1820Slide(slideId)
    ? clean(slideId)
    : null;
  if (presentationSlide) params.set("slide", presentationSlide);
  const requestedActivity = clean(activityId);
  const practiceActivity = resolvedSection === BEIT_MIDRASH_LEARNING_SECTION.PRACTICE
    && PRACTICE_ACTIVITY_VALUES.has(requestedActivity)
    ? practiceActivityOf(requestedActivity)
    : null;
  if (practiceActivity) params.set("activity", practiceActivity.id);
  const concept = clean(conceptId);
  const numberConcept = resolvedSection === BEIT_MIDRASH_LEARNING_SECTION.NUMBERS
    && NUMBER_GUIDE_CONCEPT_VALUES.has(concept);
  if (numberConcept) {
    params.set("concept", concept);
  }
  const requestedSourceStep = clean(sourceStepId);
  const sourceStep = resolvedSection === BEIT_MIDRASH_LEARNING_SECTION.SOURCES
    && SOURCE_READING_STEP_VALUES.has(requestedSourceStep)
    ? requestedSourceStep
    : null;
  if (sourceStep) params.set("step", sourceStep);
  const requestedCipherStep = clean(cipherStepId);
  const cipherStep = resolvedSection === BEIT_MIDRASH_LEARNING_SECTION.CIPHERS
    && CIPHER_READING_STEP_VALUES.has(requestedCipherStep)
    ? requestedCipherStep
    : null;
  if (cipherStep) params.set("step", cipherStep);
  if (clean(destinationId)) params.set("to", clean(destinationId));
  const query = params.toString();
  const finding = clean(findingId);
  const anchor = finding
    ? `finding-${encodeURIComponent(finding)}`
    : presentationSlide
      ? `sod1820-slide-${encodeURIComponent(presentationSlide)}`
      : numberConcept
      ? `number-concept-${encodeURIComponent(concept)}`
      : sourceStep
        ? `source-step-${encodeURIComponent(sourceStep)}`
        : cipherStep
          ? `cipher-step-${encodeURIComponent(cipherStep)}`
          : pathStep
            ? `path-${encodeURIComponent(safePathId)}-step-${encodeURIComponent(pathStep.id)}`
            : safePathId
              ? `path-${encodeURIComponent(safePathId)}`
              : practiceActivity ? `practice-${encodeURIComponent(practiceActivity.id)}` : "";
  return `${methodRoute(methodKey)}${query ? `?${query}` : ""}${anchor ? `#${anchor}` : ""}`;
}

/**
 * Resolve old and new Beit Midrash links without redirecting the independent
 * Beit Midrash identity to World. `searches` remains an admin-only compatibility
 * signal and never opens a public catalogue.
 */
export function resolveBeitMidrashLearningLocation({ methodKey = null, search = "" } = {}) {
  const params = searchParamsOf(search);
  const routeMethod = clean(methodKey);
  const legacyMethod = clean(params.get("m"));
  const requestedMethod = routeMethod || legacyMethod || null;
  const legacyTab = clean(params.get("tab")).toLowerCase();
  const legacyAtlas = clean(params.get("atlas"));
  const explicitSection = safeSection(params.get("section"));
  const explicitKind = safeGuidedKind(params.get("kind"));
  const legacy = LEGACY_TAB_MAP[legacyAtlas ? "atlas" : legacyTab] || null;

  let section = explicitSection || legacy?.section || BEIT_MIDRASH_LEARNING_SECTION.START;
  if (requestedMethod) section = BEIT_MIDRASH_LEARNING_SECTION.METHODS;
  const guidedKind = section === BEIT_MIDRASH_LEARNING_SECTION.GUIDED
    ? (explicitKind || legacy?.guidedKind || null)
    : null;
  const findingId = clean(params.get("finding")) || null;
  const requestedPath = clean(params.get("path")) || clean(legacy?.pathId);
  const pathId = section === BEIT_MIDRASH_LEARNING_SECTION.PATHS
    && LEARNING_PATH_VALUES.has(requestedPath)
    ? requestedPath
    : null;
  const selectedPath = learningPathOf(pathId);
  const requestedPathStep = clean(params.get("pathStep"));
  const pathStepId = selectedPath?.steps.some((step) => step.id === requestedPathStep)
    ? requestedPathStep
    : null;
  const lessonId = pathId === "sod1820"
    && clean(params.get("lesson")) === BEIT_MIDRASH_SOD1820_PRESENTATION_ID
    ? BEIT_MIDRASH_SOD1820_PRESENTATION_ID
    : null;
  const requestedSlide = clean(params.get("slide"));
  const presentationSlideId = lessonId && isBeitMidrashSod1820Slide(requestedSlide)
    ? requestedSlide
    : null;
  const requestedActivity = clean(params.get("activity"));
  const activityId = section === BEIT_MIDRASH_LEARNING_SECTION.PRACTICE
    && PRACTICE_ACTIVITY_VALUES.has(requestedActivity)
    ? requestedActivity
    : null;
  const requestedConcept = clean(params.get("concept"));
  const conceptId = section === BEIT_MIDRASH_LEARNING_SECTION.NUMBERS
    && NUMBER_GUIDE_CONCEPT_VALUES.has(requestedConcept)
    ? requestedConcept
    : null;
  const requestedSourceStep = clean(params.get("step"));
  const sourceStepId = section === BEIT_MIDRASH_LEARNING_SECTION.SOURCES
    && SOURCE_READING_STEP_VALUES.has(requestedSourceStep)
    ? requestedSourceStep
    : null;
  const requestedCipherStep = clean(params.get("step"));
  const cipherStepId = section === BEIT_MIDRASH_LEARNING_SECTION.CIPHERS
    && CIPHER_READING_STEP_VALUES.has(requestedCipherStep)
    ? requestedCipherStep
    : null;
  const destinationId = clean(params.get("to")) || legacy?.destinationId || null;
  const toolCompatibility = clean(params.get("tool")).toLowerCase() === "midrash";

  return Object.freeze({
    section,
    guidedKind,
    methodKey: requestedMethod,
    findingId,
    pathId,
    pathStepId,
    lessonId,
    presentationSlideId,
    activityId,
    conceptId,
    sourceStepId,
    cipherStepId,
    destinationId,
    adminOnly: legacy?.adminOnly === true,
    compatibilitySource: legacyAtlas
      ? "legacy-atlas"
      : legacy ? `legacy-tab:${legacyTab}`
        : toolCompatibility ? "legacy-tool:midrash"
          : requestedMethod ? "method-deep-link"
            : explicitSection ? "learning-section"
              : "default",
    canonicalHref: beitMidrashLearningHref(section, {
      methodKey: requestedMethod,
      guidedKind,
      findingId,
      pathId,
      pathStepId,
      lessonId,
      slideId: presentationSlideId,
      activityId,
      conceptId,
      sourceStepId,
      cipherStepId,
      destinationId,
    }),
    shouldRedirect: false,
  });
}

export function buildBeitMidrashLearningPath(pathId, pathStepId = null) {
  const path = learningPathOf(pathId);
  if (!path) return null;
  const requestedIndex = path.steps.findIndex((step) => step.id === clean(pathStepId));
  const selectedIndex = requestedIndex >= 0 ? requestedIndex : 0;
  return Object.freeze({
    path,
    selectedStep: path.steps[selectedIndex],
    selectedIndex,
    previousStep: selectedIndex > 0 ? path.steps[selectedIndex - 1] : null,
    nextStep: selectedIndex < path.steps.length - 1 ? path.steps[selectedIndex + 1] : null,
  });
}

function boundedLimit(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_EXAMPLE_LIMIT;
  return Math.max(0, Math.min(MAX_EXAMPLE_LIMIT, Math.trunc(numeric)));
}

function requestedFirst(rows, findingId, limit) {
  if (!limit) return [];
  const id = clean(findingId);
  if (!id) return rows.slice(0, limit);
  const requested = rows.find((row) => clean(row?.sourceId) === id);
  if (!requested) return rows.slice(0, limit);
  return [requested, ...rows.filter((row) => row !== requested)].slice(0, limit);
}

const CROSSING_PROMPTS = Object.freeze([
  "מה נפגש כאן?",
  "איך נוצר החיבור?",
  "מאין הגיע כל חלק?",
  "איזה כיוון למחשבה נפתח?",
  "נסו בעצמכם",
]);

const CONVERGENCE_PROMPTS = Object.freeze([
  "מה נמצא במרכז?",
  "אילו חיבורים מצטרפים?",
  "מאילו מקורות הם מגיעים?",
  "מה אפשר לראות כשהם מופיעים יחד?",
]);

function freezeOccurrence(value) {
  return value && typeof value === "object" ? Object.freeze({ ...value }) : value;
}

function guidedExample(row, concept) {
  const copy = concept === BEIT_MIDRASH_GUIDED_KIND.CONVERGENCE
    ? BEIT_MIDRASH_LEARNING_MANIFEST.language.convergence
    : BEIT_MIDRASH_LEARNING_MANIFEST.language.crossing;
  return Object.freeze({
    id: row.id,
    sourceId: row.sourceId,
    concept,
    title: copy.title,
    eyebrow: copy.eyebrow,
    statement: row.statement,
    secondary: row.secondary,
    values: Object.freeze([...(row.values || [])]),
    sourceLabel: row.sourceLabel,
    sourceRef: row.sourceRef,
    sourceRefs: Object.freeze([...(row.sourceRefs || [])]),
    sourceHref: row.sourceHref,
    canonicalFindingHref: row.canonicalFindingHref,
    contributor: row.contributor,
    createdAt: row.createdAt,
    occurrenceCount: row.occurrenceCount,
    occurrences: Object.freeze((row.occurrences || []).map(freezeOccurrence)),
    returnHref: beitMidrashLearningHref(BEIT_MIDRASH_LEARNING_SECTION.GUIDED, {
      guidedKind: concept,
      findingId: row.sourceId,
    }),
    prompts: concept === BEIT_MIDRASH_GUIDED_KIND.CONVERGENCE
      ? CONVERGENCE_PROMPTS
      : CROSSING_PROMPTS,
  });
}

/**
 * A bounded public teaching lens over the already-loaded World projection.
 * It performs no fetch, ranking or deduplication. Ordering and occurrence
 * preservation remain owned by World; an explicitly requested public example
 * is only moved to the front so a deep link can resume exactly.
 */
export function buildBeitMidrashGuidedExamples(worldProjection, {
  limit = DEFAULT_EXAMPLE_LIMIT,
  findingId = null,
} = {}) {
  const take = boundedLimit(limit);
  const world = buildBeitMidrashWorldSections(worldProjection);
  const crossings = requestedFirst(
    world.sections[BEIT_MIDRASH_WORLD_SECTION.CROSSES],
    findingId,
    take,
  ).map((row) => guidedExample(row, BEIT_MIDRASH_GUIDED_KIND.CROSSING));
  const convergences = requestedFirst(
    world.sections[BEIT_MIDRASH_WORLD_SECTION.CONVERGENCE],
    findingId,
    take,
  ).map((row) => guidedExample(row, BEIT_MIDRASH_GUIDED_KIND.CONVERGENCE));

  return Object.freeze({
    source: world.source,
    crossings: Object.freeze(crossings),
    convergences: Object.freeze(convergences),
    mapCallout: DESTINATIONS.world,
    maxExamplesPerKind: MAX_EXAMPLE_LIMIT,
    nonDestructiveDedup: world.nonDestructiveDedup,
  });
}

export function buildBeitMidrashLearningProjection({
  worldProjection = { rows: [] },
  curationCatalog = null,
  methodKey = null,
  search = "",
  exampleLimit = DEFAULT_EXAMPLE_LIMIT,
} = {}) {
  const location = resolveBeitMidrashLearningLocation({ methodKey, search });
  return Object.freeze({
    manifest: BEIT_MIDRASH_LEARNING_MANIFEST,
    location,
    learningPath: buildBeitMidrashLearningPath(location.pathId, location.pathStepId),
    sod1820Presentation: location.pathId === "sod1820"
      ? buildBeitMidrashSod1820Presentation(curationCatalog, location.presentationSlideId)
      : null,
    practiceActivity: practiceActivityOf(location.activityId),
    guidedExamples: buildBeitMidrashGuidedExamples(worldProjection, {
      limit: exampleLimit,
      findingId: location.findingId,
    }),
    sources: Object.freeze({
      methods: "canonical-method-registry",
      guidedExamples: "worldAllResearchProjection",
      diamonds: "curationProjection2029",
      book: "book:ahavat-torah",
    }),
  });
}

