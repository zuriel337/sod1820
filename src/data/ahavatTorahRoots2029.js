import { ahavatSourceSearch } from "./ahavatTorahPeople2029.js";

export const AHAVAT_ROOT_SECTIONS = Object.freeze([
  { page: 31, title: "בריאה, אדם ודורות ראשונים", opening: "בראשית ברא אלקים את השמים הארץ היתה", explanation: "הרשימה נפתחת בלשון מעשה בראשית, ממשיכה לאדם ולגן, ובטור הבא לדורות הראשונים ולמבול. קוראים מימין לשמאל, לא לפי סדר אלפביתי." },
  { page: 32, title: "מן המבול אל סיפורי האבות", opening: "צפור בעדו ותרם ויכסו", explanation: "העמוד ממשיך את המבול ועובר לאורך סיפורי האבות עד פרידת יעקב ולבן. הצורות נשארות בלשון הדפוס: המחבר לא מציג כאן מילון של שורשים בני שלוש אותיות." },
  { page: 33, title: "מיעקב ובניו אל יציאת מצרים והמשכן", opening: "שור ויחץ פרות ועירים ורוח", explanation: "הטור הראשון ממשיך ביעקב ובניו ומגיע לשעבוד ולמשה; הטור הבא עובר דרך יציאת מצרים אל חלקי המשכן. זהו המשך של אותה רשימה, לא רשימה חדשה לכל נושא." },
  { page: 34, title: "מן המשכן אל המצוות והמסעות", opening: "ויעיו ומזרקותיו ומזלגותיו מכבר רשת כרכוב", explanation: "תחילת העמוד ממשיכה בכלי המשכן. בהמשך באות לשונות של מצוות, מסעות ותוכחות. אפשר לאתר צורה ולפתוח את העמוד המלא כדי לקרוא את סביבתה בדפוס." },
  { page: 35, title: "חתימת רשימת השרשים", opening: "שש ונסחתם תרגיע ודאבון", explanation: "הרשימה מסתיימת בלשונות שירת האזינו וברכת משה. הקו המפריד חותם אותה; אחריו מתחיל סעיף חדש, „סופר ומונה אותיות התורה”, שאינו חלק מרשימת השרשים." },
].map(item => Object.freeze(item)));

export function ahavatRootFragments(bundle, query = "") {
  if (bundle?.schema_version !== "ahavat-torah-roots-transcript.v1" || bundle.source_identity !== "book:hebrewbooks:5635" || !Array.isArray(bundle.fragments)) return [];
  const valid = bundle.fragments.filter(fragment => AHAVAT_ROOT_SECTIONS.some(section => section.page === fragment.pdf_page) && ["right", "left"].includes(fragment.column) && typeof fragment.text === "string");
  const needle = ahavatSourceSearch(query);
  return valid.filter(fragment => !needle || ahavatSourceSearch(`${fragment.text} ${AHAVAT_ROOT_SECTIONS.find(section => section.page === fragment.pdf_page).title}`).includes(needle));
}
