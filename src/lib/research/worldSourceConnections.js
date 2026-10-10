// Bounded read-time projection of the reviewed source locators in work_log 0584504f.
// These are witness annotations, not cards keyed by Post slug, tags, a method registry,
// publication decisions or stored graph edges. Every source is admitted and guarded again.
import { fetchGallerySourceContext, fetchPublicWorldPostSource, fetchTopicSourceContext, fetchMethodRegistry } from './entityHubProjection.js';
import { fetchNumberSystemMethods, fetchLiveNumericRuleVersions } from './numberSystemMethods.js';
import { applyMomentClockLaw } from './momentClockSystemMethod.js';
import { supabase } from '../supabase.js';
import { fetchGematriaMethodTrace } from './gematriaTrace.js';
import { numberExpressionFocusHref } from './numberExpressionFocus.js';
import { INDIA_CAPTAIN_SOURCE, buildPublicPostImageContext } from './topicSourceContext.js';

export const WORLD_SOURCE_DIRECTIONS = Object.freeze([
  { id: 'october', label: 'הקשר ל־7 באוקטובר', why: 'שני נוסחי תאריך בפוסט, אותו ערך, ומעבר מפורש לשביעי באוקטובר.' },
  { id: 'india', label: 'הודו ו־14–45', why: 'מתיעוד הודו בגלריות אל רמזי דוד, גאולה ורכבת המים.' },
  { id: 'wisdom', label: 'מה נפתח בחכמה 73', why: 'תמונת מחשבון היסטורית, שיטות שונות וחיבורים לירושלים.' },
]);
const mappingRef = 'work_log:0584504f-2b45-4f39-874b-42f8d7da41be';
const calc = (expression, method, expected) => ({ expression, method, expected });
const raw = (value, unit) => ({ value, unit });
const zero = (from, to) => ({ from, to, ruleId: 'zero_scale_law' });
const one = (from, to) => ({ from, to, ruleId: 'shitat_haechad_alef_law' });
// The exact quotation + locator is the admission guard, not ocr_numbers or numeric similarity.
export const REVIEWED_SOURCE_WITNESSES = Object.freeze([
  { id: 'date-718', direction: 'october', postMarker: 'data-fz1073-718-axis',
    title: 'שני נוסחי תאריך — והחיבור ל־718',
    guards: ['כ״ב בתשרי תשפ״ד = 1718', 'י״ט בתשרי תשפ״ז = 1718', 'שביעי באוקטובר'],
    reason: 'המחבר מחבר בין שני אירועים באמצעות נוסחי התאריכים ושיטת האחד. אימות הסכום אינו אימות התאריך בלוח השנה.',
    relationKind: 'author_comparison', topicSlug: 'gapfill-718',
    calculations: [calc('כ״ב בתשרי תשפ״ד', 'רגיל', 1718), calc('י״ט בתשרי תשפ״ז', 'רגיל', 1718), calc('שביעי באוקטובר', 'רגיל', 718)],
    relations: [one(1718, 718)] },
  { id: 'flight-wisdom', direction: 'october', postMarker: 'data-fz1073-1073-shachar',
    title: 'מספר הטיסה — והמשך לחכמה', guards: ['1073'],
    reason: '1073 הוא מספר הטיסה בפוסט; שיטת האחד מאפשרת את הקריאה 1000 ועוד 73. החיבור לחכמה הוא רמז נוסף לבדיקה, בנפרד מקריאת הדובר 10 | 7 | 3.',
    relationKind: 'proposed_rule_connection', readings: [raw(1073, 'מספר טיסה FZ1073')],
    calculations: [calc('חכמה', 'רגיל', 73)], relations: [one(1073, 73)] },
  { id: 'spoken-1202', direction: 'october', postMarker: 'data-video-spoken-hints-718', supporting: true,
    title: '1202 — אותו ערך, שיטות שונות', guards: ['חרבות ברזל', 'התגלות משיח', 'מסתתר = 1202'],
    reason: 'הפוסט מתעד השוואה פרשנית מתוך הסרטון. מסתתר מחשב הפרשים בין אותיות סמוכות; הוא אינו מילוי אותיות.',
    relationKind: 'author_comparison',
    calculations: [calc('כ״ב בתשרי תשפ״ד', 'מסתתר', 1202), calc('חרבות ברזל', 'מסתתר', 1202), calc('התגלות משיח', 'רגיל', 1202)] },
  { id: 'spoken-ofer', direction: 'october', postMarker: 'data-video-spoken-hints-718', supporting: true,
    title: 'מהשמות בפוסט אל ענף הבחירות', guards: ['עופר וינטר', 'מילוי = 1820'],
    reason: 'אותו שם מופיע בפוסט בשתי שיטות. זהו פתח מתועד לענף הבחירות; אין מכאן שוויון של כל השמות ל־1820. מיקום הסרטון 02:40–03:08 עדיין ממתין לאימות ניגון.',
    relationKind: 'documented_source_mention', calculations: [calc('עופר וינטר', 'רגיל', 631), calc('עופר וינטר', 'מילוי', 1820)] },
  { id: 'india-health', direction: 'india', galleryImageId: '6232be42-82a3-41ac-b4d3-004a21e48c7f',
    title: '״קודם 140 עכשיו 450״', guards: ['קודם 140', 'עכשיו 450'],
    reason: 'צילום היסטורי מהודו, עם שני המספרים מפורשים. זיקת האפסים מחברת ל־14 ול־45; דוד וגאולה מחושבים בנפרד. טענות הבריאות שבכיתוב הן תיעוד ופרשנות מן העבר.',
    relationKind: 'documented_source_mention', readings: [raw(140, 'חולים בדיווח ההיסטורי'), raw(450, 'מאושפזים בדיווח ההיסטורי')],
    calculations: [calc('דוד', 'רגיל', 14), calc('גאולה', 'רגיל', 45)], relations: [zero(140, 14), zero(450, 45)] },
  { id: 'water-train', direction: 'india', galleryImageId: '8940efb2-8423-4a27-a10a-d3fdd07cf595',
    title: 'רכבת המים — 216 ו־2160', guards: ['216 ק"מ', 'גדול 2160', 'יראה'],
    reason: 'מרחק הרכבת ותמונות המחשבון מופיעים באותו מקור. 216 הוא יראה ברגיל; 2160 הוא משיח יהוה במילוי גדול. זיקת האפסים מחברת ביניהם כרמז, עם שתי שיטות נפרדות.',
    relationKind: 'author_interpretation', readings: [raw(216, 'ק״מ — אורך המסלול המדווח')],
    calculations: [calc('יראה', 'רגיל', 216), calc('משיח יהוה', 'מילוי גדול', 2160), calc('משיח יהוה', 'מילוי', 950)], relations: [zero(216, 2160)] },
  { id: 'flight-descent', direction: 'india', postParagraph: true, supporting: true,
    title: 'מהמטוס: 14,000 רגל — והחיבור ל־14', guards: ['טיסת Flydubai', '14,000 רגל'],
    reason: 'הפוסט מדווח על ירידה של יותר מ־14,000 רגל. זיקת האפסים מאפשרת לקרוא את הקשר ל־14 ולדוד, בלי לשנות את יחידת הגובה ובלי לזהות את אירוע הטיסה עם האירועים ההיסטוריים בהודו.',
    relationKind: 'proposed_rule_connection', readings: [raw(14000, 'רגל — סף הירידה המדווח: יותר מ־14,000')],
    calculations: [calc('דוד', 'רגיל', 14)], relations: [zero(14000, 14)] },
  { id: 'india-tunnel', direction: 'india', galleryImageId: '96207e5d-ac80-4344-9e50-f50a8cc0a726', supporting: true,
    title: '41 פועלים ו־14 ימים', guards: ['41 פועלים', '14 ימים'],
    reason: 'התמונה מדווחת על 41 פועלים ו־14 ימים. 4.5 ק״מ וההשוואה למנהרות בישראל מגיעים מהכיתוב של עמיחי, ולא מן הצילום. קרדיט הצילום Reuters; תאריך המופיע בצילום 25.11.23.',
    relationKind: 'author_comparison', readings: [raw(41, 'פועלים'), raw(14, 'ימים')], calculations: [calc('דוד', 'רגיל', 14)] },
  { id: 'india-fighter', direction: 'india', galleryImageId: 'fcbcfb23-90ed-4b71-afd8-14cf7d1d4c3e', supporting: true,
    title: 'מטוס קרב הודי — אירוע אחר', guards: ['דור 4.5', '1.4 מיליארד דולר', 'GE-414'],
    reason: '4.5 הוא דור המטוס, 1.4 מיליארד דולר היא השקעה, ו־414 הוא דגם המנוע. זהו אירוע נפרד מטיסת FZ1073. הקריאה 14–45 בכיתוב היא פרשנות המחבר, ללא הסרת נקודה באמצעות חוק האפס.',
    relationKind: 'author_interpretation', readings: [raw('4.5', 'דור מטוס'), raw('1.4', 'מיליארד דולר השקעה'), raw('GE-414', 'דגם מנוע')] },
  { id: 'wisdom-methods', direction: 'wisdom', galleryImageId: 'c502fa89-96f1-495b-aeb7-b16deaaa96b3',
    title: 'חכמה — מה נפתח באותיות?', guards: ['חכמה', 'רגיל 73', 'מילוי בלבד גדול 1820'],
    reason: 'המחשבון ההיסטורי מציג כמה שיטות לאותו ביטוי. 1820 שייך למילוי בלבד גדול: מילוי גדול 1893 פחות האותיות המקוריות שערכן 73. הכיתוב ההיסטורי נשמר גם כשניסוחו מקוצר.',
    relationKind: 'documented_source_mention', calculations: [calc('חכמה', 'רגיל', 73), calc('חכמה', 'מילוי בלבד גדול', 1820), calc('חכמה', 'קדמי', 271), calc('חכמה', 'מילוי', 613), calc('חכמה', 'מילוי גדול', 1893), calc('חכמה', 'מילוי דמילוי', 1230), calc('חכמה', 'מסתתר', 67)] },
  { id: 'jerusalem-gate', direction: 'wisdom', galleryImageId: '5dfe5a87-702c-42da-aa36-46351dd70c4e',
    title: '730 מטרים — שער לירושלים', guards: ['730 מטרים', '28/09/2023'],
    reason: 'כיתוב המחבר מחבר את שער ירושלים לחכמה. הידיעה המצולמת היא מ־28.9.2023; ״היום״ בכותרתה שייך לאותו פרסום. 730 מטרים נפתחים ל־73 דרך זיקת האפסים.',
    relationKind: 'author_interpretation', readings: [raw(730, 'מטרים')], calculations: [calc('חכמה', 'רגיל', 73)], relations: [zero(730, 73)] },
  { id: 'jerusalem-cable', direction: 'wisdom', galleryImageId: '46987aba-4da8-4b57-bef8-3ed5bef0e48d', supporting: true,
    title: '73 קרונות — באותה גלריה', guards: ['73 קרונות', '1.4 ק"מ'],
    reason: 'הכיתוב מחבר את הרכבל לחכמה. בצילום: 73 קרונות, 1.4 ק״מ וכ־4.5 דקות. אין בו 450 נוסעים; אזכור כזה בכיתוב מאוחר אינו מאמת אותו. שיתוף הגלריה אינו זהות אירוע.',
    relationKind: 'author_interpretation', readings: [raw(73, 'קרונות'), raw('1.4', 'ק״מ'), raw('4.5', 'דקות בקירוב')], calculations: [calc('חכמה', 'רגיל', 73)] },
  { id: 'wall-clock', direction: 'wall', galleryImageId: '62ffc447-fd91-4027-9fe9-4a19d09679fd',
    documentedDate: { value: '2017-05-23', label: 'עדכון הגלריה', quote: '23/5/2017', field: 'name' },
    title: 'הכותל, ירושלים, 4:24 PM', shortTitle: 'צילום הכותל', displayValue: '4:24', eventLabel: 'ביקור טראמפ בכותל · תיעוד היסטורי מ־2017',
    guards: ['JERUSALEM', '4:24 PM', 'PRES TRUMP VISITS THE WESTERN WALL'],
    reason: 'בצילום השידור מופיע שעון ירושלים 4:24 PM. חוק השעון מחבר את התצוגה ל־424; השם דונלד טראמפ והביטוי משיח בן דוד נבדקים כל אחד בשיטה הרגילה. המשמעות המשיחית היא פרשנות המחבר.',
    boundary: '1:28 בראש הטלפון ו־7:24 MT בתחתית הם שעונים אחרים. התמונה מתעדת את השעה על המסך; רגע המגע הראשון המדויק לא אומת בווידאו.',
    relationKind: 'author_interpretation', calculations: [calc('דונלד טראמפ', 'רגיל', 424), calc('משיח בן דוד', 'רגיל', 424)],
    clock: { originalDisplay: '4:24 PM', display: '16:24', hour: 16, minute: 24, meridiem: 'PM',
      timezone: 'Asia/Jerusalem', context: 'JERUSALEM 4:24 PM — source display; 16:24 is its explicit 24h representation', target: 424, representation: 'CLOCK_12H_CONCAT' } },
  { id: 'trump-methods', direction: 'wall', galleryImageId: '00edc0d8-b792-45d9-aa86-d04b44600a3f',
    title: 'אותו שם, שתי שיטות', shortTitle: 'טראמפ · 424', displayValue: '424', eventLabel: 'צילום חישוב · אינו אירוע בחירות',
    guards: ['דונלד טראמפ', 'רגיל 424', '778'], relationKind: 'documented_source_mention',
    reason: 'השם המדויק דונלד טראמפ נותן 424 ברגיל ו־778 באתבש. צילום המחשבון נמצא כבר בטופיקים טראמפ ו־424. שני החישובים תלויים באותו ביטוי ואינם שני מקורות עצמאיים.',
    calculations: [calc('דונלד טראמפ', 'רגיל', 424), calc('דונלד טראמפ', 'אתבש', 778)],
    boundary: 'הכיתוב ההיסטורי מציע גם חיבור ל־1202. הוא נשמר כלשונו; המסלול הנוכחי ממשיך דרך האדם אל סיפור המועמדות.' },
  { id: 'delegates-1237', direction: 'wall', postId: 1222, postHeading: true,
    postImageUrl: 'https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/uploads/2016/05/503f09f92c9d6e15.jpg',
    title: 'מה פירוש 1,237 צירים?', shortTitle: 'סף המועמדות', displayValue: '1,237', eventLabel: 'המועמדות הרפובליקנית · 2016',
    guards: ['למספר הקסם 1237'], relationKind: 'documented_source_mention',
    reason: 'התמונה בפוסט מסבירה: 1,237 הוא מספר הצירים הדרוש לקבלת המינוי הרפובליקני בסיבוב הראשון. עוברים מהאדם שבצילום הכותל אל אירוע אחר בחייו.',
    boundary: 'זהו סף צירים למועמדות, לא מספר האלקטורים בבחירות הכלליות ולא תוצאה סופית של הצבעה. ניסוחים היסטוריים אחרים נשמרים בנפרד.',
    readings: [raw(1237, 'צירים — סף המינוי בסיבוב הראשון')], calculations: [calc('דונאלד טרמפ', 'רגיל', 424)] },
  { id: 'delegates-revelation', direction: 'wall', galleryImageId: '9e2a32a1-82aa-49d8-9823-e8b7fc2a8c59',
    title: 'המחבר מציב את התגלות לצד הצירים', shortTitle: 'החיבור המצולם', displayValue: '1237', eventLabel: 'קולאז׳ היסטורי בגלרית רמזי טראמפ 2024',
    guards: ['1,237 הצירים', 'התגלות', 'מסתתר רגיל 1237', 'דולנד טראמפ'], relationKind: 'author_comparison',
    reason: 'בקולאז׳ מופיעים יחד דיווח המועמדות, התגלות במסתתר, משיח בן דוד והכתיב דולנד טראמפ. זהו חיבור מפורש של המחבר. שם הגלריה 2024 אינו מתארך מחדש את אירוע המועמדות.',
    boundary: 'הכתיב דולנד טראמפ נשמר כפי שהוא בצילום; אין להחליפו בשקט. הקולאז׳ חוזר על תוכן המועמדות ואינו אימות חדשותי עצמאי נוסף.',
    calculations: [calc('התגלות', 'מסתתר', 1237), calc('דולנד טראמפ', 'רגיל', 424), calc('משיח בן דוד', 'רגיל', 424)] },
  { id: 'see-my-back', direction: 'wall', galleryImageId: 'd9842a5a-5313-4d32-8e58-5f07fa29b887',
    title: '״וראית את אחרי״', shortTitle: 'וראית את אחרי', displayValue: '1237', eventLabel: 'ביטוי מצולם · שלוש הופעות היסטוריות',
    guards: ['וראית את אחרי', 'רגיל 1237'], relationKind: 'author_interpretation',
    reason: 'הביטוי המצולם נותן 1237 בשיטה הרגילה. הכיתוב מחבר אותו במפורש להתגלות בתוך ההסתרה ומזכיר את תרומת עמיחי. זהו פירוש המחבר לצד חישוב שאפשר לפתוח.',
    calculations: [calc('וראית את אחרי', 'רגיל', 1237)] },
  { id: 'revelation-hidden', direction: 'wall', galleryImageId: 'c22b5594-0e1d-4f9a-ba38-d30f598fec1d',
    title: 'התגלות — דרך שיטת מסתתר', shortTitle: 'התגלות', displayValue: '1237', eventLabel: 'צילום חישוב · גלרית לילה כיום יאיר',
    guards: ['התגלות', 'מסתתר רגיל 1237', 'רגיל 844'], relationKind: 'author_interpretation',
    reason: 'התגלות נותנת 1237 במסתתר, ואילו ברגיל ערכה 844. הקשר ל״וראית את אחרי״ עובר בין שני ביטויים ובין שתי שיטות מפורשות.',
    boundary: 'התגלות השכינה = 1234 ברגיל שייכת לענף אחר. היא אינה אותו ביטוי ואינה תוצאת 1237.',
    calculations: [calc('התגלות', 'מסתתר', 1237), calc('התגלות', 'רגיל', 844)] },
  { id: 'covid-1237', direction: 'wall', galleryImageId: '84d4f578-0269-4b96-b0c0-1b1810d6847e',
    documentedDate: { value: '2020-10-02', label: 'פרסום הידיעה המצולמת', quote: '02/10/2020', field: 'ocr' },
    title: 'ענף הקורונה נשאר במקומו', shortTitle: 'תיעוד 2020', displayValue: '1,237', eventLabel: 'ידיעה מ־2.10.2020 · כיתוב גלריה מ־4.10.2020',
    guards: ['1,237 ממשרתי', '02/10/2020'], relationKind: 'author_comparison',
    reason: 'הידיעה מדווחת על 1,237 ממשרתי צה״ל שחלו בקורונה. הכיתוב מ־4.10.2020 מחבר במפורש לטראמפ, ל״וראית את אחרי״ ולהתגלות במסתתר. זהו אירוע נפרד מן המועמדות ומן הביקור בכותל.',
    readings: [raw(1237, 'ממשרתי צה״ל לפי הידיעה ההיסטורית')], calculations: [calc('וראית את אחרי', 'רגיל', 1237), calc('התגלות', 'מסתתר', 1237)] },
  { id: 'david-rail-caption', direction: 'rails', galleryImageId: '563069a0-8f0c-46ee-94a1-6085b36c9339',
    documentedDate: { value: '2024-06-05', label: 'התאריך בצילום החדשות, לא תאריך פרויקט המסילות', quote: '05.06.24', field: 'ocr' },
    title: 'מסילות דוד המלך — גשר בכיתוב', shortTitle: 'מסילות דוד', displayValue: '1873', eventLabel: 'כיתוב המחבר ליד צילום חדשות מ־5.6.2024',
    guards: ['14 אלף מבנים', '05.06.24'], captionGuards: ['מסילות רכבת דוד המלך ירושלים=1873', 'אחת שתים שלוש שבע=1873 מסתתר'],
    relationKind: 'author_comparison',
    reason: 'שחר קנדרו מוזכר בכיתוב שמחבר את ״מסילות רכבת דוד המלך ירושלים״ ברגיל ל״אחת שתים שלוש שבע״ במסתתר — שניהם 1873. כך שם המספר 1237 מוביל לנושא המסילות.',
    boundary: 'הקשר למסילות כתוב בכיתוב ההיסטורי. התמונה עצמה מציגה דיווח על לבנון; היא אינה צילום של רכבת או אישור לפרויקט המסילות.',
    calculations: [calc('מסילות רכבת דוד המלך ירושלים', 'רגיל', 1873), calc('אחת שתים שלוש שבע', 'מסתתר', 1873)] },
  { id: 'rail-budget', direction: 'rails', galleryImageId: '4f7a5ea1-7ff4-4a53-a28f-74f5617f8c68',
    title: '45 מיליון, 140 מיליון — ברכבת ישראל', shortTitle: '14 ו־45 ברכבת', displayValue: '14 · 45', eventLabel: 'קולאז׳ ידיעות וכיתוב · גלרית דוד 2020',
    guards: ['45 מיליון שקל', '140 מיליון שקל'], relationKind: 'author_comparison',
    reason: 'בדיווח המצולם על רכבת ישראל: כ־45 מיליון שקל הפסד תפעולי ו־140 מיליון שקל לחודש במסגרת הסיכום המתואר. המחבר מציב לידם את רמזי דוד וגאולה. יחידת מיליון השקלים נשמרת.',
    readings: [raw(45, 'מיליון שקל — הפסד תפעולי מדווח'), raw(140, 'מיליון שקל לחודש — סיכום תמיכה מדווח')],
    calculations: [calc('דוד', 'רגיל', 14), calc('גאולה', 'רגיל', 45)], relations: [zero(140, 14)],
    boundary: '14 ו־45 כאן הם קריאה במספרי סכומים; זו אינה שעה 14:45. הידיעות הנוספות בקולאז׳ אינן אותו אירוע.' },
  { id: 'light-rail-45', direction: 'rails', galleryImageId: '36f64c4f-9231-4f4c-9afd-33abf7e275ee',
    title: '45 רכבות, 450 נוסעים', shortTitle: 'הרכבת הקלה', displayValue: '45 · 450', eventLabel: 'הקו האדום · תיעוד בגלריה מאוגוסט 2023',
    guards: ['רכבות 45', '450 נוסעים'], relationKind: 'author_interpretation',
    reason: 'צילום תוצאות החיפוש אומר: 45 רכבות, כל אחת משני קרונות, ו־450 נוסעים. חוק האפס מסביר את הזיקה 450↔45. גאולה מחושבת בנפרד בשיטה הרגילה.',
    boundary: 'הכיתוב ההיסטורי אומר 45 קרונות ו־45 נוסעים. הוא נשמר בשלמותו, ולצדו מוצגת הקריאה המדויקת מן הצילום. אזכור שעת הפתיחה בכיתוב לא מאומת בצילום הזה.',
    readings: [raw(45, 'רכבות לפי הקטע המצולם'), raw(450, 'נוסעים לפי הקטע המצולם')], calculations: [calc('גאולה', 'רגיל', 45)], relations: [zero(450, 45)] },
  { id: 'light-rail-14', direction: 'rails', galleryImageId: '8cfa5f55-2c42-48d9-866a-180ae2ffe3de',
    documentedDate: { value: '2023-08-18', label: 'פרסום הכתבה המצולמת', quote: '18/8/2023', field: 'ocr' },
    title: '14 מיליארד — טענה על עלות הקו האדום', shortTitle: 'תיעוד העלות', displayValue: '14', eventLabel: 'כתבה מצולמת · 18.8.2023 · תום נחום',
    guards: ['14 מיליארד', 'ירון זליכה', '18/8/2023'], relationKind: 'proposed_source_connection',
    reason: 'הכתבה מביאה טענה של ירון זליכה על עלות עודפת של 14 מיליארד שקל. זהו תיעוד נוסף של הקו האדום, לצד צילום 45 הרכבות; מדובר בהיבטים שונים של הפרויקט.',
    boundary: 'הטענה מיוחסת למרואיין בכתבה; איננו מאמתים כאן את החשבון התקציבי.',
    readings: [raw(14, 'מיליארד שקל — טענת עלות עודפת בכתבה')], calculations: [calc('דוד', 'רגיל', 14)] },
  { id: 'clock-1445', direction: 'rails', galleryImageId: '4d01baa6-3d63-41b7-be1b-c31ea66b3498',
    title: 'וכאן 14:45 היא באמת שעה', shortTitle: 'שעון 14:45', displayValue: '14:45', eventLabel: 'ידיעה על ישיבת ממשלה מתוכננת · צילום היסטורי',
    guards: ['14:45', 'נחמן אש', 'שתתכנס היום בשעה'], relationKind: 'author_interpretation',
    reason: 'בקטע המצולם נאמר שהממשלה תתכנס בשעה 14:45. חוק השעון מפיק את הייצוג 1445; הקריאה הקיימת של 1445 כ־14|45 מחברת לדוד ולגאולה.',
    boundary: 'זו ידיעה על ישיבה מתוכננת, לא הוכחה שהישיבה התקיימה בדקה הזו. בסריקה הממוקדת לא נמצא צילום רכבת שמציג שעה 14:45.',
    calculations: [calc('דוד', 'רגיל', 14), calc('גאולה', 'רגיל', 45)], numberReading: 1445,
    clock: { originalDisplay: '14:45', display: '14:45', hour: 14, minute: 45, meridiem: 'PM', timezone: null,
      context: 'שעת ישיבת הממשלה המתוכננת כפי שמצוטטת בידיעה הישראלית; אין קביעת offset או תאריך אירוע', target: 1445, representation: 'CLOCK_24H_CONCAT' } },
  { id: 'forgiveness-bridge', direction: 'wisdom-depth', galleryImageId: '4de128e1-7609-406c-b692-7d9b2f9ffec1',
    title: 'מחכמה אל ״סלחתי כדברך״', shortTitle: '1230 אל 1234', displayValue: '1230', eventLabel: 'צילום חישוב והסבר המחבר · גלריה 67',
    guards: ['סלחתי', 'כדברך', 'מסתתר רגיל 1230', 'גדול 1234'], relationKind: 'proposed_method_connection',
    reason: 'חכמה במילוי דמילוי וסלחתי כדברך במסתתר נפגשים ב־1230. באותו צילום, סלחתי כדברך בשיטת גדול נותן 1234. המעבר משנה ביטוי ואז שיטה, ושני הצעדים גלויים.',
    calculations: [calc('סלחתי כדברך', 'מסתתר', 1230), calc('סלחתי כדברך', 'גדול', 1234), calc('ענג', 'רגיל', 123), calc('התגלות השכינה', 'רגיל', 1234)], relations: [zero(1230, 123)],
    boundary: 'הכיתוב מחבר לענג בכתיב חסר. החיבור לחכמה הוא הצעת קריאה לבדיקה על בסיס החישובים; אין כאן שוויון בין 1230 ל־1234.' },
  { id: 'internet-gate', direction: 'wisdom-depth', galleryImageId: 'fe9f458e-364c-4462-8a57-94f57a96ec65',
    title: 'רשת האינטרנט ושער נון', shortTitle: 'שתי הצלבות', displayValue: '1234 · 676', eventLabel: 'צילום חישוב וכיתוב · גלריה 67',
    guards: ['רֶשֶׁת הָאִינְטֶרְנֶט', 'רגיל 1234', 'מסתתר רגיל 676'], relationKind: 'author_comparison',
    reason: 'הכיתוב מחבר במפורש את רשת האינטרנט לשער נון. ברשת האינטרנט: 1234 ברגיל ו־676 במסתתר. בשער נון: 1234 במילוי ו־676 ברגיל. ארבעה חישובים, צילום אחד עם פירוש המחבר.',
    calculations: [calc('רֶשֶׁת הָאִינְטֶרְנֶט', 'רגיל', 1234), calc('שער נון', 'מילוי', 1234), calc('רֶשֶׁת הָאִינְטֶרְנֶט', 'מסתתר', 676), calc('שער נון', 'רגיל', 676), calc('שער נון', 'קדמי', 2626)],
    boundary: 'הכיתוב ההיסטורי מפרש את תפקיד האינטרנט בגאולה. אימות החישובים אינו אימות של הפרשנות.' },
]);
const compact = (text) => String(text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
export function witnessSource(spec, { gallery, india, post, topic } = {}) {
  if (spec.galleryImageId) {
    const item = [...(india?.items || []), ...(gallery?.items || [])].find((entry) => entry.access?.scope === 'public'
      && entry.occurrences?.some((occurrence) => occurrence.legacyPlacement?.galleryImageId === spec.galleryImageId));
    if (!item || !spec.guards.every((quote) => compact(item.intrinsic?.extraction?.text).includes(quote))) return null;
    const placement = item.occurrences.find((entry) => entry.legacyPlacement?.galleryImageId === spec.galleryImageId)?.legacyPlacement;
    if (spec.captionGuards && !spec.captionGuards.every((quote) => compact(placement?.originalCaption).includes(quote))) return null;
    return { item, text: item.intrinsic.extraction.text, sourceRef: `gallery_images:${spec.galleryImageId}`,
      href: item.imageUrl, topicHref: item.reopen.topicHref, topicSlug: item.reopen.topicHref ? india?.topicSlug : null };
  }
  if (!post || !Array.isArray(post.tags) || post.tags.some((tag) => ['טיוטה', 'פורום'].includes(tag))
    || ['gpt-draft', 'web'].includes(post.source) || post.home_hidden === true) return null;
  if (spec.postId && post.id !== spec.postId) return null;
  let text;
  if (spec.postParagraph || spec.postHeading) {
    text = (String(post.content || '').match(spec.postHeading ? /<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]>/gi : /<p\b[^>]*>[\s\S]*?<\/p>/gi) || []).map(compact)
      .find((paragraph) => spec.guards.every((quote) => paragraph.includes(quote)));
  } else {
    const start = String(post.content || '').indexOf(`${spec.postMarker}="v1"`);
    const end = post.content.indexOf('</section>', start);
    if (start < 0 || end < 0) return null;
    text = compact(post.content.slice(post.content.indexOf('>', start) + 1, end));
  }
  if (!text || !spec.guards.every((quote) => text.includes(quote))) return null;
  if (spec.postImageUrl) {
    const item = buildPublicPostImageContext(post, { postId: spec.postId, imageUrl: spec.postImageUrl, guards: spec.guards, label: spec.title });
    if (!item) return null;
    return { item, text, sourceRef: item.sourceRef, href: item.reopen.postHref, postTitle: post.title, author: post.author,
      topicHref: null, topicSlug: null, routePrecision: item.reopen.postRoutePrecision };
  }
  return { text, sourceRef: `posts:${post.id}#${spec.postMarker || `quote-${spec.id}`}`, href: `/post/${encodeURIComponent(post.slug)}`,
    topicHref: spec.topicSlug && topic?.topicSlug === spec.topicSlug ? `/topic/${encodeURIComponent(topic.topicSlug)}` : null,
    topicSlug: spec.topicSlug && topic?.topicSlug === spec.topicSlug ? topic.topicSlug : null,
    postTitle: post.title, author: post.author,
    routePrecision: 'post_only_region_not_visible',
  };
}
export function verifiedCalculation(request, finding) {
  const trace = finding?.projection?.dimensions?.trace;
  if (!trace || trace.input !== request.expression || trace.method_key !== request.method
    || trace.verification?.parity !== true || trace.verification?.trace_value !== trace.result
    || trace.verification?.canonical_value !== trace.result || trace.method_version == null
    || !Number.isSafeInteger(trace.result) || trace.result !== request.expected) return null;
  return { ...request, value: trace.result, trace, finding,
    href: numberExpressionFocusHref(trace.result, { expression: request.expression, method: request.method }) };
}
export function governedRelation(request, result) {
  if (!Number.isSafeInteger(request.from) || !Number.isSafeInteger(request.to)) return null;
  const card = result?.cards?.find((entry) => entry.ruleId === request.ruleId && entry.value === request.from && entry.ruleVersion != null);
  const fact = card?.finding?.evidence?.facts?.[0];
  if (!fact || fact.rule_id !== request.ruleId || fact.input !== request.from || fact.rule_version !== card.ruleVersion) return null;
  const supported = request.ruleId === 'zero_scale_law'
    ? fact.output?.scale_chain?.includes(request.from) && fact.output.scale_chain.includes(request.to)
    : request.ruleId === 'shitat_haechad_alef_law' && fact.output?.remainder === request.to;
  if (!supported) return null;
  return { ...request, card, display: request.ruleId === 'shitat_haechad_alef_law' ? card.display : `${request.from} ↔ ${request.to}`,
    relationClass: 'governed_interpretive_derivation', independentEvidence: false };
}
export async function projectWorldSourceWitness(spec, source, { traceReader = fetchGematriaMethodTrace, lawReader = fetchNumberSystemMethods } = {}) {
  if (!source) return null;
  const calculations = await Promise.all((spec.calculations || []).map(async (request) => {
    try { return { ...request, verified: verifiedCalculation(request, await traceReader(request.method, request.expression)) }; }
    catch { return { ...request, verified: null }; }
  }));
  const availableValues = new Set([...(spec.readings || []).filter((r) => Number.isSafeInteger(r.value)).map((r) => r.value),
    ...calculations.filter((c) => c.verified).map((c) => c.verified.value)]);
  const relations = await Promise.all((spec.relations || []).map(async (request) => {
    if (!availableValues.has(request.from) || !availableValues.has(request.to)) return { ...request, verified: null };
    try { return { ...request, verified: governedRelation(request, await lawReader(request.from)) }; }
    catch { return { ...request, verified: null }; }
  }));
  return { ...spec, source, mappingRef, calculations, relations, anchor: `world-source-${spec.id}`,
    dependencyKey: source.item?.sourceIdentity.ref || source.sourceRef, publication: 'read_time_projection_only' };
}
export function isPublicWorldMethod(row) {
  return row?.active === true && row.in_engine === true && row.required_entitlement === 'public' && row.version != null;
}
export async function fetchWorldSourceConnections(direction, { india, postId = INDIA_CAPTAIN_SOURCE.postId } = {}) {
  const specs = REVIEWED_SOURCE_WITNESSES.filter((spec) => spec.direction === direction);
  if (!specs.length) return [];
  const [gallery, post, topic, registry] = await Promise.all([
    fetchGallerySourceContext({ imageIds: specs.map((spec) => spec.galleryImageId).filter(Boolean) }),
    specs.some((spec) => spec.postMarker || spec.postParagraph) ? fetchPublicWorldPostSource({ postId }) : null,
    specs.some((spec) => spec.topicSlug) ? fetchTopicSourceContext({ topicSlug: specs.find((spec) => spec.topicSlug).topicSlug }) : null,
    fetchMethodRegistry(specs.flatMap((spec) => (spec.calculations || []).map((entry) => entry.method))).catch(() => []),
  ]);
  // Dedupe network calculation requests within this bounded projection, never durable truth.
  const traces = new Map(), laws = new Map();
  const traceReader = (method, expression) => {
    const key = JSON.stringify([method, expression]);
    const permission = registry.find((entry) => entry.method_key === method);
    if (!isPublicWorldMethod(permission)) return Promise.resolve(null);
    if (!traces.has(key)) traces.set(key, fetchGematriaMethodTrace(method, expression).then((finding) =>
      finding?.projection?.dimensions?.trace?.method_version === permission.version ? finding : null));
    return traces.get(key);
  };
  const lawReader = (value) => { if (!laws.has(value)) laws.set(value, fetchNumberSystemMethods(value)); return laws.get(value); };
  return (await Promise.all(specs.map((spec) => projectWorldSourceWitness(spec, witnessSource(spec, { gallery, india, post, topic }), { traceReader, lawReader })))).filter(Boolean);
}
// Existing Research Context only; ordinary source selection never starts a personal Path.
export function worldWitnessContext(witness, calculation = null, { href = `/world#${witness.anchor}`, anchor = witness.anchor, lens = 'world' } = {}) {
  const source = witness.source;
  return { selection: { entityId: source.item?.galleryImageId || source.sourceRef, entityType: source.item ? 'image' : 'source',
    sourceRef: source.sourceRef, locator: `#${anchor}`,
    ...(calculation ? { entityId: String(calculation.value), entityType: 'number', expression: calculation.expression, method: calculation.method,
      methodVersion: String(calculation.trace.method_version), resultValue: calculation.value, findingId: calculation.finding.id, focusKind: 'expression' } : {}),
  }, lens: calculation ? 'number' : lens,
  dimensions: { activeSectionId: anchor, readingFocus: null, surfaceFindings: calculation ? [calculation.finding] : [],
    surfaceFocus: { id: source.item?.mediaId || source.sourceRef, type: source.item ? 'image' : 'source', label: witness.title,
      reference: source.item?.sourceIdentity.ref || source.sourceRef, locator: `#${anchor}`, href,
      sourceLabel: witness.title, reason: witness.reason,
      ...(calculation ? { id: String(calculation.value), type: 'number', number: calculation.value, resultValue: calculation.value,
        primary: String(calculation.value), label: `${calculation.expression} · ${calculation.method}`, href: calculation.href } : {}),
    },
  } };
}

// Editorial reading proposals over reviewed locators; NOT durable Topic memberships or a
// Path/graph/tag registry. The live Topic gate, source guards and canonical traces run first.
// A URL selects a presentation step, never starts/saves a personal journey.
export const WORLD_DISCOVERY_READINGS = Object.freeze([
  { id: 'wall', title: 'מהכותל אל 1237', lead: 'שעה מצולמת, אדם, אירוע אחר — וביטוי שמאיר את הקריאה.', number: '424 / 1237',
    steps: ['wall-clock', 'trump-methods', 'delegates-1237', 'delegates-revelation', 'see-my-back', 'revelation-hidden', 'covid-1237', 'david-rail-caption'],
    bridges: ['מהשעה על המסך עוברים לשמו של האדם המצולם, בחישוב נפרד.',
      'אותו אדם, אירוע אחר: מהביקור בכותל אל המרוץ למועמדות ב־2016.',
      'הקולאז׳ ההיסטורי חוזר על סיפור הצירים ומציג את החיבור שהמחבר עשה להתגלות.',
      'מאותו ערך אל ביטוי אחר: וראית את אחרי ברגיל, עם מקור מצולם נפרד.',
      'הכיתוב מחבר בין ראיית האחוריים להתגלות; כאן נפתחת השיטה האחרת — מסתתר.',
      'אותו נושא במחקר, אירוע שונה: תיעוד הקורונה מ־2020 וההשוואה שכתב המחבר.',
      'כיתוב אחר כותב את שם המספר במילים ומחבר אותו למסילות דוד המלך. זהו גשר של המחבר, לא שוויון 1237=1873.'] },
  { id: 'rails', title: 'מסילות, דוד וגאולה', lead: '14 ו־45 ברכבת, שעה מפורשת, והמשך דרך הכותל אל 73.', number: '14 · 45 · 73',
    steps: ['david-rail-caption', 'rail-budget', 'light-rail-45', 'light-rail-14', 'clock-1445', 'jerusalem-cable', 'india-health', 'water-train'],
    bridges: ['נושא המסילות מוביל לתיעוד אחר של רכבת ישראל: סכומים שהמחבר קשר ל־14 ול־45.',
      'מרכבת ישראל עוברים לפרויקט אחר: הקו האדום ו־45 הרכבות שבתצלום.',
      'אותו פרויקט, היבט נוסף: כתבה על טענת העלות העודפת. אין לערבב נוסעים ושקלים.',
      'משפחת הקריאה 14|45 מופיעה גם בשעה מתועדת. זהו אירוע ממשלתי נפרד מן הרכבת.',
      'בחזרה לירושלים: בכיתוב הרכבל המחבר קושר במפורש את 14, 45 ו־73. המרחק והזמן שומרים על היחידות שלהם.',
      'אותו זוג בפרשנות המחבר, ארץ ואירוע אחרים: 140 ו־450 בתיעוד הודו.',
      'בתוך הציר ההודי אפשר להמשיך לרכבת המים וליראה 216. הנושא המשותף אינו הופך את הידיעות לאותו אירוע.'] },
  { id: 'wisdom-set', title: 'לפתוח את החכמה', lead: 'מן הרכבל אל האותיות — ומן השיטות אל מקורות נוספים.', number: '73',
    steps: ['jerusalem-cable', 'wisdom-methods', 'forgiveness-bridge', 'internet-gate', 'jerusalem-gate'],
    bridges: ['הכיתוב ברכבל מזכיר חכמה 73. צילום המחשבון מאפשר לבדוק את המילה עצמה ולפתוח את שיטותיה.',
      'חכמה במילוי דמילוי נותנת 1230. אותו ערך מופיע בסלחתי כדברך במסתתר; צילום המקור פותח גם את 1234 בשיטת גדול.',
      'ממשיכים דרך 1234 אל קשר כתוב אחר: רשת האינטרנט ושער נון, בשתי הצלבות מפורשות.',
      'חוזרים לנושא ירושלים והחכמה דרך תיעוד 730 המטרים. זהו מעבר נושאי, לא זהות בין 676, 1234 ו־730.'] },
]);
export const DISCOVERY_TOPIC_SLUGS = Object.freeze(['1237', '424-mashiach-ben-david', 'trump']);
const topicTargets = Object.freeze({
  'wall-clock': ['424-mashiach-ben-david', 'trump'], 'trump-methods': ['trump', '424-mashiach-ben-david'],
  'delegates-1237': ['1237', 'trump'], 'delegates-revelation': ['trump', '1237'],
  'see-my-back': ['1237'], 'revelation-hidden': ['1237'], 'covid-1237': ['1237'], 'david-rail-caption': ['1237'],
  'india-health': ['india-axis'], 'water-train': ['india-axis', 'hodu'],
});
export function discoveryLocation(hash, topicSlug = null) {
  const prefix = topicSlug ? 'topic-discovery' : 'world-discovery';
  const match = String(hash || '').match(new RegExp(`^#${prefix}-([a-z-]+)--([a-z0-9-]+)$`));
  const reading = WORLD_DISCOVERY_READINGS.find((r) => r.id === match?.[1]) || WORLD_DISCOVERY_READINGS[0];
  const fallback = topicSlug === '1237' ? 'delegates-1237' : reading.steps[0];
  const id = reading.steps.includes(match?.[2]) ? match[2] : (reading.steps.includes(fallback) ? fallback : reading.steps[0]);
  return { reading, id, anchor: `${prefix}-${reading.id}--${id}` };
}
export function discoveryHref(readingId, witnessId, topicSlug = null) {
  return `${topicSlug ? `/topic/${encodeURIComponent(topicSlug)}` : '/world'}#${topicSlug ? 'topic' : 'world'}-discovery-${readingId}--${witnessId}`;
}
export function discoveryDocumentedTimeline(items = []) {
  const dated = [], undated = [];
  for (const item of items) {
    const d = item.documentedDate;
    const placement = item.source.item.occurrences.find((o) => o.legacyPlacement?.galleryImageId === item.galleryImageId)?.legacyPlacement;
    const witnessText = d?.field === 'name' ? placement?.originalName : item.source.text;
    const publishedAt = item.source.item.postPlacement?.publishedAt;
    const date = d && compact(witnessText).includes(d.quote) ? { ...d, kind: 'documented_source_date_not_event_date' }
      : publishedAt && /^\d{4}-\d{2}-\d{2}/.test(publishedAt) ? { value: publishedAt.slice(0, 10), label: 'פרסום הפוסט, לא תאריך האירוע', kind: 'post_publication' } : null;
    (date ? dated : undated).push({ id: item.id, title: item.title, date });
  }
  dated.sort((a, b) => a.date.value.localeCompare(b.date.value));
  return { dated, undated, orderBasis: 'separate_documentary_chronology_original_gallery_order_unchanged' };
}
export async function projectWitnessClock(spec, source, ruleVersions) {
  if (!spec.clock || source?.item?.access?.scope !== 'public') return null;
  const c = spec.clock;
  const result = await applyMomentClockLaw({ observation: { ...c, source_ref: source.sourceRef, accessTier: 'public' },
    ruleVersions, event: { key: source.item.sourceIdentity.ref, ref: source.sourceRef } });
  const application = result.applications?.find((f) => f.evidence.facts[0].operation === c.representation
    && f.evidence.facts[0].output.value === c.target);
  return result.ok && application ? { ...result, application, originalDisplay: c.originalDisplay } : null;
}
export async function fetchWorldDiscovery(readingId, { galleryReader = fetchGallerySourceContext,
  postReader = fetchPublicWorldPostSource, topicReader = fetchTopicSourceContext, registryReader = fetchMethodRegistry,
  traceReader: readTrace = fetchGematriaMethodTrace, lawReader = fetchNumberSystemMethods,
  ruleReader = fetchLiveNumericRuleVersions, readingReader = async () => {
    const { data, error } = await supabase.from('number_readings').select('id,number,digit_sequence,reading,meaning,source_type,is_active')
      .eq('number', 1445).eq('is_active', true).limit(8);
    return error ? [] : data || [];
  },
} = {}) {
  const route = WORLD_DISCOVERY_READINGS.find((r) => r.id === readingId);
  if (!route) return null;
  const specs = route.steps.map((id) => REVIEWED_SOURCE_WITNESSES.find((s) => s.id === id));
  const postIds = [...new Set(specs.map((s) => s.postId).filter(Boolean))];
  const topicsWanted = [...new Set(specs.flatMap((s) => topicTargets[s.id] || []))];
  const [gallery, posts, topics, registry, ruleVersions, readings] = await Promise.all([
    galleryReader({ imageIds: specs.map((s) => s.galleryImageId).filter(Boolean) }),
    Promise.all(postIds.map((postId) => postReader({ postId }).catch(() => null))),
    Promise.all(topicsWanted.map((topicSlug) => topicReader({ topicSlug }).catch(() => null))),
    registryReader([...new Set(specs.flatMap((s) => (s.calculations || []).map((c) => c.method)))]).catch(() => []),
    specs.some((s) => s.clock) ? ruleReader(['moment_clock_law']).catch(() => ({})) : {},
    specs.some((s) => s.numberReading) ? readingReader().catch(() => []) : [],
  ]);
  const traceCache = new Map(), lawCache = new Map();
  const traceReader = (method, expression) => {
    const permission = registry.find((r) => r.method_key === method);
    if (!isPublicWorldMethod(permission)) return Promise.resolve(null);
    const key = JSON.stringify([method, expression]);
    if (!traceCache.has(key)) traceCache.set(key, readTrace(method, expression).then((f) =>
      f?.projection?.dimensions?.trace?.method_version === permission.version ? f : null));
    return traceCache.get(key);
  };
  const readLaw = (n) => { if (!lawCache.has(n)) lawCache.set(n, lawReader(n)); return lawCache.get(n); };
  const items = (await Promise.all(specs.map(async (spec) => {
    const source = witnessSource(spec, { gallery, post: posts.find((p) => p?.id === spec.postId) });
    if (!source) return null;
    const item = await projectWorldSourceWitness(spec, source, { traceReader, lawReader: readLaw });
    const clock = await projectWitnessClock(spec, source, ruleVersions).catch(() => null);
    const numberReading = clock && readings.find((r) => r.is_active && r.number === spec.numberReading
      && r.digit_sequence === '14|45' && r.source_type === 'human_gate_zuriel') || null;
    return { ...item, clock, numberReading, mappingRef: 'work_log:2cbd0c8b-6e91-40ad-8d52-4f597d49b552',
      topicLinks: (topicTargets[spec.id] || []).flatMap((slug) => {
        const topic = topics.find((t) => t?.topicSlug === slug && t.access?.scope === 'public');
        if (!topic) return [];
        const stored = topic.items.find((i) => i.sourceIdentity.ref === source.item.sourceIdentity.ref);
        // Other Topics open the existing stored occurrence; they do not acquire our
        // proposed reading or a fabricated anchor/membership because of a shared number.
        const href = DISCOVERY_TOPIC_SLUGS.includes(slug) ? discoveryHref('wall', spec.id, slug) : stored?.reopen.topicHref;
        if (!href) return [];
        return [{ slug, title: topic.topicTitle, href,
          association: stored ? 'stored_topic_association' : 'proposed_reading_not_stored_membership', storedHref: stored?.reopen.topicHref || null }];
      }) };
  }))).filter(Boolean);
  const distinct = new Map(items.map((i) => [i.dependencyKey, i.source.item]));
  return { route, items, missing: specs.filter((s) => !items.some((i) => i.id === s.id)).map((s) => s.id),
    coverage: { requested: specs.length, sources: distinct.size,
      occurrences: [...distinct.values()].reduce((n, item) => n + item.occurrences.length, 0),
      occurrencesTruncated: gallery.occurrencesTruncated, independence: 'not_established_by_source_count' } };
}
