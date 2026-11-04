import { ahavatSourceSearch } from "./ahavatTorahPeople2029.js";

export const AHAVAT_ROOT_SECTIONS = Object.freeze([
  { page: 31, title: "בריאה, אדם ודורות ראשונים", opening: "בראשית ברא אלקים את השמים הארץ היתה", explanation: "הרשימה נפתחת בלשון מעשה בראשית, ממשיכה לאדם ולגן, ובטור הבא לדורות הראשונים ולמבול. קוראים מימין לשמאל, לא לפי סדר אלפביתי." },
  { page: 32, title: "מן המבול אל סיפורי האבות", opening: "צפור בעדו ותרם ויכסו", explanation: "העמוד ממשיך את המבול ועובר לאורך סיפורי האבות עד פרידת יעקב ולבן. הצורות נשארות בלשון הדפוס: המחבר לא מציג כאן מילון של שורשים בני שלוש אותיות." },
  { page: 33, title: "מיעקב ובניו אל יציאת מצרים והמשכן", opening: "שור ויחץ פרות ועירים ורוח", explanation: "הטור הראשון ממשיך ביעקב ובניו ומגיע לשעבוד ולמשה; הטור הבא עובר דרך יציאת מצרים אל חלקי המשכן. זהו המשך של אותה רשימה, לא רשימה חדשה לכל נושא." },
  { page: 34, title: "מן המשכן אל המצוות והמסעות", opening: "ויעיו ומזרקותיו ומזלגותיו מכבר רשת כרכוב", explanation: "תחילת העמוד ממשיכה בכלי המשכן. בהמשך באות לשונות של מצוות, מסעות ותוכחות. אפשר לאתר צורה ולפתוח את העמוד המלא כדי לקרוא את סביבתה בדפוס." },
  { page: 35, title: "חתימת רשימת השרשים", opening: "שש ונסחתם תרגיע ודאבון", explanation: "הרשימה מסתיימת בלשונות שירת האזינו וברכת משה. הקו המפריד חותם אותה; אחריו מתחיל סעיף חדש, „סופר ומונה אותיות התורה”, שאינו חלק מרשימת השרשים." },
].map(item => Object.freeze(item)));

// Companion explanations of the ten already-bounded source columns. These are
// not quotations, lexical entries, normalized roots or an independent word count.
export const AHAVAT_ROOT_COLUMNS = Object.freeze([
  [31, "right", "מעשה בראשית ובריאת האדם", "הטור נפתח בכותרת רשימת השרשים, ועובר מבריאת העולם אל האדם, הגן ובריאת האשה. המילים מופיעות ברצף המקראי: אפשר לעקוב אחר המעבר מן העולם אל האדם בלי לסדר את הרשימה מחדש לפי האלפבית."],
  [31, "left", "מן הנחש אל תחילת המבול", "הרצף ממשיך מן הנחש והאכילה בגן, דרך קין והדורות הראשונים, אל נח ובניית התיבה. סוף הטור מגיע לתחילת המבול; ההמשך נקרא בטור הימני של העמוד הבא, ולא במילת שומר־הדף שמתחת לטקסט."],
  [32, "right", "סיום המבול, נח ואברהם", "הטור ממשיך את לשונות המבול והיציאה מן התיבה, ועובר דרך נח, דור הפלגה ואברהם עד סיפור סדום. זהו רצף צורות מן הפרשות, לא ערכים נפרדים שנוספה להם הגדרה מילונית."],
  [32, "left", "מסדום דרך יצחק אל יעקב ולבן", "תחילת הטור ממשיכה את סיפור סדום. בהמשך באים אברהם ויצחק, העקדה, קניית המערה, נישואי יצחק וסיפורי יעקב ולבן. החתימה מגיעה לברית ולגל שבין יעקב ללבן; הטור הבא ממשיך את מסע יעקב."],
  [33, "right", "יעקב ובניו ועד תחילת ספר שמות", "הטור עובר ממפגש יעקב ועשו ומסיפורי בני יעקב אל יוסף, ירידת המשפחה למצרים וסוף ספר בראשית. בסופו מתחילות לשונות השעבוד והצלת משה. המעבר בין חומשים נמצא בתוך הרשימה ואינו פותח כאן מילון חדש."],
  [33, "left", "משה, יציאת מצרים והמשכן", "ממשיכים ממשה והסנה אל המכות, היציאה ממצרים, הים והמסע במדבר. בהמשך מופיעים מעמד סיני, משפטים וכלי המשכן. סוף הטור עוסק בחלקי המשכן, הנמשכים בראש העמוד הבא."],
  [34, "right", "כלי המשכן, עבודת הכהנים ודיני ויקרא", "הטור פותח בהמשך כלי המשכן, ועובר לבגדי הכהנים, הקטורת ושאר מלאכת המשכן. בהמשך מופיעות לשונות הקרבנות, בעלי החיים, הטומאה והטהרה, המועדים ודינים נוספים שבספר ויקרא. הסבר זה עוזר להתמצא ברצף; הצורות עצמן נקראות בצילום."],
  [34, "left", "מחתימת ויקרא דרך במדבר אל דברים", "הטור ממשיך את סוף דיני ויקרא והתוכחות, ואחריהם לשונות המסעות והאירועים במדבר. בהמשך עוברים אל ספר דברים עד לשונות התוכחה שבו. גם כאן נשמר רצף הדפוס, בלי להניח שמילה בעלת צורה דומה היא אותו ערך."],
  [35, "right", "חתימת התוכחה ושירת האזינו", "הטור מתחיל בהמשך התוכחה שבספר דברים, ועובר ללשונות הברית ולשירת האזינו. כדי לקרוא את הסיום ממשיכים לטור השמאלי באותו עמוד; טבלת האותיות שמתחת לקו אינה המשך של רשימת השרשים."],
  [35, "left", "סוף האזינו וברכת משה", "כאן נשלמות לשונות האזינו, ואחריהן לשונות ברכת משה. הרשימה מסתיימת לפני הקו המפריד. אחריו מתחיל סעיף אחר, סופר ומונה אותיות התורה; אין לצרף את מספריו או מילותיו אל טורי הרשימה."],
].map(([page, column, title, explanation]) => Object.freeze({ id: `roots:${page}:${column}`, page, column, title, explanation })));

// Navigation over the printed columns, not a new lexical or counting layer.
export function ahavatRootColumnJourney(id) {
  const index = AHAVAT_ROOT_COLUMNS.findIndex(column => column.id === id);
  if (index < 0) return null;
  return {
    current: AHAVAT_ROOT_COLUMNS[index],
    position: index + 1,
    total: AHAVAT_ROOT_COLUMNS.length,
    previous: AHAVAT_ROOT_COLUMNS[index - 1] || null,
    next: AHAVAT_ROOT_COLUMNS[index + 1] || null,
  };
}

export function ahavatRootFragments(bundle, query = "") {
  if (bundle?.schema_version !== "ahavat-torah-roots-transcript.v1" || bundle.source_identity !== "book:hebrewbooks:5635" || !Array.isArray(bundle.fragments)) return [];
  const valid = bundle.fragments.filter(fragment => AHAVAT_ROOT_COLUMNS.some(column => column.id === fragment.id && column.page === fragment.pdf_page && column.column === fragment.column) && typeof fragment.text === "string");
  const needle = ahavatSourceSearch(query);
  return valid.filter(fragment => !needle || ahavatSourceSearch(`${fragment.text} ${AHAVAT_ROOT_SECTIONS.find(section => section.page === fragment.pdf_page).title}`).includes(needle));
}
