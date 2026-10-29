import { AHAVAT_CONTENT_SOURCE } from "./ahavatTorahContentDepth2029.js";
import { AHAVAT_ROOT_SECTIONS, AHAVAT_ROOT_COLUMNS } from "./ahavatTorahRoots2029.js";
import { ahavatSourceSearch } from "./ahavatTorahPeople2029.js";

// Local source-glyph readings, not modernization, lexical normalization or a
// claim that a whole column has been proofread. The original OCR is never edited.
// The first fifteen source-reading identities are adopted and stay in order.
const readings = [
  ["roots:31:right", "ההו ובהו", "תהו ובהו"],
  ["roots:31:right", "על פני ההום", "על פני תהום"],
  ["roots:31:left", "אף הגעו", "אף תגעו"],
  ["roots:32:right", "צפור בערו", "צפור בעדו"],
  ["roots:32:right", "ויכםו", "ויכסו"],
  ["roots:32:left", "בחמלת המלם", "בחמלת המלט"],
  ["roots:33:right", "יפנשך", "יפגשך"],
  ["roots:33:left", "בצפררעים", "בצפרדעים"],
  ["roots:34:right", "ומזלנותיו", "ומזלגותיו"],
  ["roots:34:right", "רשת ברכוב", "רשת כרכוב"],
  ["roots:34:left", "מנרש", "מגרש"],
  ["roots:35:right", "וראבון", "ודאבון"],
  ["roots:35:right", "בשרירוה", "בשרירות"],
  ["roots:35:left", "ואתא רת", "ואתא דת"],
  ["roots:35:left", "וררום", "ודרום"],
  ...[
    ["roots:31:right", [
      ["כי. מוב", "כי. טוב"], ["בקר אחר", "בקר אחד"],
      ["הרשא עשב", "תדשא עשב"], ["והוצא שלישי", "ותוצא שלישי"],
      ["הגרילים", "הגדולים"], ["לטמשלה", "לממשלה"], ["הקמן", "הקטן"],
      ["בל הרמשת", "כל הרמשת"], ["הארמה", "האדמה"],
      ["בדמוהנו", "כדמותנו"], ["ברגת זבר", "בדגת זכר"],
      ["ובבשה", "וכבשה"], ["לאבלה", "לאכלה"], ["מאר הששי", "מאד הששי"],
      ["ויקרש", "ויקדש"], ["הולרת", "תולדת"], ["השרה", "השדה"],
      ["לעבור", "לעבוד"], ["ואר מן", "ואד מן"], ["בערן", "בעדן"],
      ["מקרם", "מקדם"], ["הרעה ורע", "הדעת ורע"], ["יפרר", "יפרד"],
      ["בנגדו", "כנגדו"], ["תררמה", "תרדמה"], ["ורבק", "ודבק"],
    ]],
    ["roots:31:left", [
      ["להשביל", "להשכיל"], ["הגיר. אתת", "הגיד. אתה"],
      ["לבלהי", "לבלתי"], ["וררדר", "ודרדר"], ["ועהה", "ועתה"],
      ["ירו לעולם", "ידו לעולם"], ["וינרש וישבן", "ויגרש וישכן"],
      ["הברובים להם", "הכרובים להט"], ["מככורות", "מבכורות"],
      ["ויהרנהו", "ויהרגהו"], ["אנבי. רמי", "אנכי. דמי"],
      ["בחה נע ונר", "כחה נע ונד"], ["הבות וישב", "הכות וישב"],
      ["בנור ועינב", "כנור ועוגב"], ["וברזס", "וברזל"],
      ["עור אחר אז", "עוד אחד אז"], ["ירון הנפלים", "ידון הנפלים"],
      ["צריק המים", "צדיק תמים"], ["חמם תיבה", "חמס תיבה"],
      ["קומהה", "קומתה"], ["בחורש נבקעו", "בחדש נבקעו"], ["הנשם בעצם", "הגשם בעצם"],
    ]],
    ["roots:32:right", [
      ["ויםברו ויבלא", "ויסכרו ויכלא"], ["זית מרף", "זית טרף"],
      ["ויםר למשפחהיהם מובח", "ויסר למשפחתיהם מזבח"],
      ["וחהכם אררוש", "וחתכם אדרוש"], ["קשהי", "קשתי"],
      ["ברם וישת", "כרם וישת"], ["וישבר ויהנל", "וישכר ויתגל"],
      ["בנםעם", "בנסעם"], ["ומגרל וירר", "ומגדל וירד"], ["ויחרלו", "ויחדלו"],
      ["ויעהק", "ויעתק"], ["ושפחוה", "ושפחות"], ["ונמלים וינגע רבר", "וגמלים וינגע דבר"],
      ["בכםף יחרו", "בכסף יחדו"], ["השרים המלת", "השדים המלח"],
      ["המרבר", "המדבר"], ["בלערי", "בלעדי"], ["שכרך ארני", "שכרך אדני"],
      ["הבט וםפר", "הבט וספר"], ["עגלה ועו איל והור", "עגלה ועז איל ותור"],
      ["העימ הפגרים", "העיט הפגרים"], ["הנור עשן ולפיר", "תנור עשן ולפיד"],
      ["ערלהכם", "ערלתכם"], ["וישהחו", "וישתחו"], ["פת וםערו", "פת וסעדו"],
      ["םאים", "סאים"], ["הואלהי", "הואלתי"], ["כשער ולינו", "בשער ולינו"],
      ["ישככו. והרלת", "ישכבו. והדלת"], ["במנורים", "בסנורים"], ["חהן אנחנו", "חתן אנחנו"],
    ]],
    ["roots:32:left", [
      ["נפרית", "גפרית"], ["נכיא ויהפלל", "נביא ויתפלל"], ["פקר מלל", "פקד מלל"],
      ["וינמל", "ויגמל"], ["השקור", "תשקור"], ["ולגכרי", "ולנכדי"],
      ["לערה חפרתי", "לעדה חפרתי"], ["נםה", "נסה"], ["בםבך", "בסבך"],
      ["לספור", "לספוד"], ["האבה", "תאבה"], ["כרך בהולה", "כדך בתולה"],
      ["משהאה", "משתאה"], ["נום צמירים", "נזם צמידים"], ["הבן מספוא ויקור", "תבן מספוא ויקד"],
      ["ובגרים ומנרנות", "ובגדים ומגדנות"], ["ותרבכנה", "ותרכבנה"], ["ושכע", "ושבע"],
      ["ויהרצצו בכטנך", "ויתרצצו בבטנך"], ["ארמני באררה", "אדמני באדרת"],
      ["ויזר עיף הלעימני", "ויזד עיף הלעיטני"], ["חוקהי", "חקתי"],
      ["םהמם", "סתמם"], ["מרוע", "מדוע"], ["הליך מטעמים", "תליך מטעמים"],
      ["גריי", "גדיי"], ["הבירו", "הכירו"], ["ממל", "מטל"], ["רגן", "דגן"],
      ["ויחרר", "ויחרד"], ["תריר", "תריד"], ["םלם", "סלם"],
      ["עררי", "עדרי"], ["הואר", "תואר"], ["רוראים זברני", "דודאים זבדני"],
      ["נחשהי", "נחשתי"], ["מהי נקור", "מתי נקד"], ["ההישים", "התישים"],
      ["כהמול", "כתמול"], ["וינהנ", "וינהג"], ["ההרפים", "התרפים"],
      ["כשמחה", "בשמחה"], ["וכתוף נטשהני", "ובתוף נטשתני"],
      ["רלקת", "דלקת"], ["הבקשנה", "תבקשנה"], ["ופחר", "ופחד"], ["שהרותא", "שהדותא"],
    ]],
    ["roots:33:right", [
      ["ויזרת", "ויזרח"], ["גיר הנשה", "גיד הנשה"], ["ונשמרהי", "ונשמרתי"],
      ["רבתם", "דבתם"], ["נבאת", "נכאת"], ["וימשבו", "וימשכו"],
      ["במתגיו", "במתניו"], ["וישרת ויפקירהו", "וישרת ויפקידהו"],
      ["כפהרון", "כפתרון"], ["שרינים", "שריגים"], ["בפורחת", "כפורחת"],
      ["אשבלותיה", "אשכלותיה"], ["וכום", "וכוס"], ["חרמומי", "חרטמי"],
      ["חבמיה", "חכמיה"], ["רביר", "רביד"], ["מבעתו", "טבעתו"],
      ["תבתנו", "תבחנו"], ["אמתחהו", "אמתחתו"], ["במנים ושקרים", "בטנים ושקדים"],
      ["החררה", "החדרה"], ["ירות גביעי", "ידות גביעי"],
      ["ויעמום", "ויעמס"], ["מענו בעירכם ענלות", "טענו בעירכם עגלות"],
      ["הרנזו", "תרגזו"], ["בסוםים", "בסוסים"], ["נכחר נויהנו", "נכחד גויתנו"],
      ["נור אריה", "גור אריה"], ["כבם", "כבס"], ["סוהה", "סותה"],
      ["אניוה", "אניות"], ["קויהי", "קויתי"], ["צערה", "צעדה"],
      ["ורועי", "זרועי"], ["נבעוה", "גבעות"],
      ["נומא", "גומא"],
    ]],
    ["roots:33:left", [
      ["ויחוגו", "ויחגו"], ["תפריעו שומריו", "תפריעו שוטריו"],
      ["חפניכם פית", "חפניכם פיח"], ["והבסמת", "והכסמת"],
      ["ערת במכסת", "עדת במכסת"],
      ["פמר שגר", "פטר שגר"], ["למטפת", "לטטפת"],
      ["נולים", "נוזלים"], ["לנלגלת", "לגלגלת"], ["וימודו", "וימדו"],
      ["ונמם", "ונמס"], ["כהוב", "כתוב"], ["והוהרת", "והזהרת"],
      ["םגלה", "סגלה"], ["נזית", "גזית"], ["בבנדו", "בבגדו"],
      ["לחוה", "לחת"], ["הרומה", "תרומה"], ["ירבנו", "ידבנו"],
      ["לאפור", "לאפוד"], ["כפהריה", "כפתריה"], ["משוקרים ומחתוהיה", "משקדים ומחתתיה"],
      ["קרפיו", "קרסיו"], ["עשהי", "עשתי"], ["ארני למקצעות", "אדני למקצעות"], ["לרשנו", "לדשנו"],
    ]],
    ["roots:34:right", [
      ["יתרותיו", "יתדתיו"], ["אבנם", "אבנט"], ["מורים אורם", "טורים אודם"],
      ["פטרה", "פטדה"], ["בליל", "כליל"], ["מכנםי", "מכנסי"],
      ["הבבר הבליות", "הכבד הכליות"], ["תנהח הנוך", "תנתח תנוך"],
      ["גנו קירותיו", "גגו קירותיו"], ["ביור", "כיור"], ["ררור", "דרור"],
      ["וקרה רוקח", "וקדה רוקח"], ["ושתקת", "ושחקת"], ["חרוה", "חרות"],
      ["וםלחת", "וסלחת"], ["נרש כרמל", "גרש כרמל"], ["כשננה", "בשגגה"],
      ["לבמא", "לבטא"], ["תבכה", "תכבה"], ["מנפיר", "סנפיר"],
      ["הבום", "הכוס"], ["החסירה", "החסידה"], ["הםלעם", "הסלעם"],
      ["החולר", "החולד"], ["נרת רותה", "נדת דותה"], ["שעמנז", "שעטנז"],
      ["הירענים", "הידענים"], ["נרב", "גרב"], ["ספית נזירך לצמיהות", "ספיח נזירך לצמיתות"],
    ]],
    ["roots:34:left", [
      ["יולה", "יבולה"], ["מומות תמאו", "מוטות תמאסו"], ["ליםרה", "ליסרה"],
      ["נלוליכם", "גלוליכם"], ["נרף ימקו", "נדף ימקו"], ["רגלו", "דגלו"], ["כפהע", "כפתע"],
      ["האבטח ם", "האבטחים"], ["בחירות", "בחידת"], ["לורא", "לזרא"],
      ["במכצרים", "במבצרים"], ["תנואהי", "תנואתי"], ["עריםתיבם", "עריסתיכם"],
      ["הםלע", "הסלע"], ["הפסנה", "הפסגה"], ["להכה", "להבת"],
      ["שריר", "שריד"], ["נרר", "גדר"], ["יר שפי", "ירט שפי"],
      ["בתועפוה", "כתועפת"], ["ויםפוק", "ויספוק"], ["הקכה", "הקבה"],
      ["הבריל", "הבדיל"], ["אצערה", "אצעדה"], ["מקלמ תוניפו", "מקלט תחניפו"],
      ["ותרננו", "ותרגנו"], ["הרבורים", "הדבורים"], ["להכעיםו", "להכעיסו"],
      ["במפכנות", "במסכנות"], ["ותקרת", "ותקת"], ["נרילים", "גדילים"],
      ["אהנן", "אתנן"], ["תפאר החסום", "תפאר תחסום"],
      ["וברלקת", "ובדלקת"], ["וכחרם ובשגעון", "ובחרס ובשגעון"],
    ]],
    ["roots:35:right", [["ורשן", "ודשן"], ["לשרים", "לשדים"]]],
    ["roots:35:left", [
      ["פחנים", "פתנים"], ["במום", "כמוס"], ["אירם", "אידם"],
      ["עתירת", "עתידה"], ["רבאך", "דבאך"],
    ]],
  ].flatMap(([fragmentId, changes]) => changes.map(([before, after]) => [fragmentId, before, after])),
  // Additive follow-up: partial readings keep the unadjudicated glyphs in place.
  ["roots:31:left", "כררתין", "כדרתיו"],
  ["roots:32:right", "אחורגיה", "אחורניה"],
  ["roots:32:left", "ומרה במרמה", "ומדה במרמה"],
  ["roots:33:left", "ובאורח", "ובאזרח"],
  ["roots:34:right", "מוו מרי", "טוו מרי"],
  // Do not silently delete the earlier unsupported dalet/resh adjudication.
  ["roots:35:right", "לשדים", "לשרים", "roots:35:right:glyph-review:269"],
];
export const AHAVAT_ROOT_GLYPH_READINGS = Object.freeze(readings.map(([fragmentId, before, after, restoresReadingId], ordinal) => Object.freeze({
  id: `${fragmentId}:glyph-review:${ordinal + 1}`,
  fragmentId, pdfPage: Number(fragmentId.split(":")[1]), before, after,
  status: "local_glyph_reading", basis: "direct_visual_source_comparison",
  sourceUrl: `${AHAVAT_CONTENT_SOURCE.pdfUrl}#page=${fragmentId.split(":")[1]}&view=FitH`,
  ...(restoresReadingId ? { restoresReadingId, basis: "original_ocr_restored_pending_source_glyph_decision", status: "restoration_pending_source_review" } : {}),
})));

// Bounded unresolved windows, not proposed replacements. A source-looking
// spelling must not be silently regularized to a familiar biblical word.
export const AHAVAT_ROOT_OPEN_READINGS = Object.freeze([
  ["roots:31:right", "ויצו מית", "הבחנת י׳/ו׳ במילה הקצרה דורשת קריאה נוספת; לא הוחל כתיב מקראי מן הזיכרון."],
  ["roots:31:left", "כררתין", "רצף האותיות בסוף השורה לא הוכרע; אין להשלים אותו לפי הפסוק."],
  ["roots:32:right", "אחורגיה", "כמה אותיות אינן מוכרעות בצילום; הרצף נשאר כפי שחולץ."],
  ["roots:32:left", "ומרה במרמה", "הכתיב שלפני במרמה אינו מוכרע כאן; אין להחליפו על סמך ציפייה מן המקרא."],
  ["roots:33:right", "תאות", "נדרשת הכרעה בין האותיות הקרובות בדפוס; לא שונה הרצף."],
  ["roots:33:left", "דרתו", "המילה בדפוס מחייבת עיון נוסף; אין כאן השלמה מילונית."],
  ["roots:33:left", "ובאורח", "הבחנת ז׳/ו׳/ר׳ והכתיב המלא לא הוכרעו; התיקון המוצע לא אומץ."],
  ["roots:34:right", "מוו מרי", "שני רצפים קצרים טרם הוכרעו בהשוואת הדפוס."],
  ["roots:34:left", "ובתרחור", "רצף האותיות בשורה התחתונה דורש הגהה נוספת."],
  ["roots:35:right", "בשית", "האות הפותחת אינה מוכרעת כאן; אין לתקן לפי נוסח זכור."],
  ["roots:35:left", "ומשרמות", "איות רצף זה נשאר פתוח לקריאה נוספת, בלי לאחדו אוטומטית עם נוסח מקראי."],
  ["roots:35:right", "לשרים", "התיקון הקודם ל־לשדים נמשך: ההשוואה החוזרת אינה מבססת את הכרעת ד׳/ר׳. קריאת המכונה הוחזרה לעזר הקריאה, לא כציטוט מוכרע."],
].map(([fragmentId, originalOcr, reason], ordinal) => Object.freeze({
  id: `${fragmentId}:open-reading:${ordinal + 1}`, fragmentId,
  pdfPage: Number(fragmentId.split(":")[1]), originalOcr, reason,
  status: "unresolved", proposedReading: null,
})));

// The original eleven open records remain immutable provenance. These are
// follow-up outcomes in the same reader, not a replacement source or registry.
export const AHAVAT_ROOT_WINDOW_REVIEWS = Object.freeze([
  ["unresolved", null, "הבחנת י׳/ו׳ לא הוכרעה בהגדלה. קריאת המכונה נשארה כפי שהייתה."],
  ["partial_reading", "כדרתיו", "ד׳ במקום ר׳ באמצע הרצף ו־ו׳ במקום ן׳ בסופו נקראו מחדש. אות הפתיחה ב׳/כ׳ נשארה פתוחה; אין כאן קביעה של נוסח המילה כולה."],
  ["partial_reading", "אחורניה", "האות שנקראה ג׳ נקראת נ׳. שאר הכתיב נשאר בתעתיק העזר ולא הושלם אוטומטית לצורה המקראית המוכרת."],
  ["partial_reading", "ומדה במרמה", "האות האמצעית נקראה ד׳ במקום ר׳. האות שלפניה נשמרה בקריאת המכונה, והמילה כולה טרם הוכרעה."],
  ["printed_reading_retained", "תאות", "רצף האותיות תאות נשמר כפי שנקרא בדפוס; לא נוסף לו ניקוד ולא הוחלף בכתיב מילוני אחר."],
  ["unresolved", null, "הצורה שבתחילת השורה עדיין אינה מוכרעת. לא הוחל נוסח חלופי רק מפני שהרצף נראה חריג."],
  ["source_reading", "ובאזרח", "בהגדלה נקראו ז׳ ו־ר׳ ברצף ובאזרח. זהו תיקון קריאת הצילום, ללא השלמת משפט או ערך מילוני."],
  ["partial_reading", "טוו מרי", "במילה הראשונה נקראה ט׳ במקום מ׳. קריאת ד׳/ר׳ במילה השנייה עדיין פתוחה, ולכן מרי לא הוחלפה לפי נוסח זכור."],
  ["unresolved", null, "רצף האותיות נשאר פתוח גם לאחר ההגדלה; לא נבחרה השלמה על סמך לשון פסוק מוכרת."],
  ["unresolved", null, "אות הפתיחה ב׳/כ׳ עדיין אינה מוכרעת. לא הוחל כתיב חלופי."],
  ["unresolved", null, "הבחנת ד׳/ר׳ והכתיב במרכז הרצף עדיין פתוחים; התעתיק לא נורמל לנוסח מקראי."],
  ["unresolved", null, "קריאה קודמת ל־לשדים נמשכה, ועזר הקריאה חזר ל־לשרים. ההכרעה בד׳/ר׳ נשארה פתוחה ואינה מוצגת כציטוט מוכרע."],
].map(([status, reading, explanation], index) => Object.freeze({
  id: `${AHAVAT_ROOT_OPEN_READINGS[index].id}:followup:1`,
  openReadingId: AHAVAT_ROOT_OPEN_READINGS[index].id,
  fragmentId: AHAVAT_ROOT_OPEN_READINGS[index].fragmentId,
  pdfPage: AHAVAT_ROOT_OPEN_READINGS[index].pdfPage,
  status, reading, explanation,
  displayStatus: ({ unresolved: "נשאר להגהה", partial_reading: "נקרא בחלקו", printed_reading_retained: "הקריאה בדפוס נשמרה", source_reading: "קריאה חוזרת בצילום" })[status],
  sourceUrl: `${AHAVAT_CONTENT_SOURCE.pdfUrl}#page=${AHAVAT_ROOT_OPEN_READINGS[index].pdfPage}&view=FitH`,
})));

export function ahavatPartiallyReviewedRoots(bundle) {
  if (bundle?.source_identity !== AHAVAT_CONTENT_SOURCE.identity || bundle.pdf_sha256 !== AHAVAT_CONTENT_SOURCE.pdfSha256 || bundle.schema_version !== "ahavat-torah-roots-transcript.v1" || !Array.isArray(bundle.fragments)) throw new Error("Foreign roots source");
  const ids = new Set(bundle.fragments.map(fragment => fragment.id));
  if (bundle.fragments.length !== 10 || ids.size !== 10 || AHAVAT_ROOT_GLYPH_READINGS.some(reading => !ids.has(reading.fragmentId))) throw new Error("Incomplete roots source");
  return bundle.fragments.map(fragment => {
    if (!AHAVAT_ROOT_COLUMNS.some(column => column.id === fragment.id && column.page === fragment.pdf_page && column.column === fragment.column)) throw new Error("Foreign roots column");
    const changes = AHAVAT_ROOT_GLYPH_READINGS.filter(item => item.fragmentId === fragment.id);
    let text = fragment.text;
    const readingDetails = [];
    for (const change of changes) {
      const previous = change.restoresReadingId ? readingDetails.find(reading => reading.id === change.restoresReadingId) : null;
      const originalOcrAnchor = previous ? previous.before : change.before;
      if (typeof text !== "string" || fragment.text.split(originalOcrAnchor).length !== 2 || text.split(change.before).length !== 2 || change.before === change.after || fragment.pdf_page !== change.pdfPage || (change.restoresReadingId && (!previous || previous.fragmentId !== change.fragmentId || previous.after !== change.before || previous.before !== change.after || previous.restoresReadingId))) throw new Error(`Source review no longer applies: ${change.id}`);
      readingDetails.push({ ...change, originalOcrAnchor,
        // OCR line is a locator within this aid, never a printed line number.
        originalOcrLine: fragment.text.slice(0, fragment.text.indexOf(originalOcrAnchor)).split("\n").length,
      });
      text = text.replace(change.before, change.after);
    }
    const windowReviews = AHAVAT_ROOT_OPEN_READINGS.filter(item => item.fragmentId === fragment.id).map(item => {
      const review = AHAVAT_ROOT_WINDOW_REVIEWS.find(candidate => candidate.openReadingId === item.id);
      if (!review || fragment.text.split(item.originalOcr).length !== 2 || !text.includes(review.reading ?? item.originalOcr)) throw new Error(`Open source window no longer applies: ${item.id}`);
      return Object.freeze({ ...item, ...review, originalOpenReadingId: item.id });
    });
    const openReadings = windowReviews.filter(item => ["unresolved", "partial_reading"].includes(item.status));
    for (const detail of readingDetails) {
      detail.supersededBy = changes.find(candidate => candidate.restoresReadingId === detail.id)?.id || null;
      Object.freeze(detail);
    }
    return Object.freeze({ id: fragment.id, pdfPage: fragment.pdf_page, column: fragment.column,
      originalOcr: fragment.text, partiallyReviewedText: text,
      appliedReadings: Object.freeze(changes.map(item => item.id)),
      readingDetails: Object.freeze(readingDetails), openReadings: Object.freeze(openReadings),
      windowReviews: Object.freeze(windowReviews),
      status: "partial_proofreading_not_verified_quotation",
      remainingReview: "שאר הטור עדיין מחייב הגהה מול הצילום; לא נקבע מספר ערכים ולא הוחל כלל שורש מודרני.",
    });
  });
}

// Search both reading layers without changing the source-native column identity.
export function ahavatReviewedRootFragments(bundle, query = "") {
  if (!bundle) return [];
  const needle = ahavatSourceSearch(query);
  return ahavatPartiallyReviewedRoots(bundle).map(fragment => ({
    id: fragment.id, pdf_page: fragment.pdfPage, column: fragment.column,
    text: fragment.partiallyReviewedText, originalOcr: fragment.originalOcr,
    appliedReadings: fragment.appliedReadings, reviewStatus: fragment.status,
    readingDetails: fragment.readingDetails, openReadings: fragment.openReadings,
    windowReviews: fragment.windowReviews,
  })).filter(fragment => !needle || ahavatSourceSearch([
    fragment.text, fragment.originalOcr, ...fragment.readingDetails.flatMap(reading => [reading.before, reading.after]),
    AHAVAT_ROOT_SECTIONS.find(section => section.page === fragment.pdf_page)?.title,
  ].join(" ")).includes(needle));
}
