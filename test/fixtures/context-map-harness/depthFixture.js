// Evidence for post 5112, read read-only from canonical Supabase (linswmnnkjxvweumprav) on 19.10.2026:
// - edges of the post node f42e2a16…: 28, all `documents` via post_tags (numbers 787, 1073, 1202, 1718, 363, …)
// - convergence_meter(787|1073|1718|1202|363): layers, cards, tiers (existing function, formula untouched)
// - engine-verified phrases: כב בתשרי תשפד = 1718 רגיל / 1202 מסתתר; חרבות ברזל = 1202 מסתתר; המשיח = 363 רגיל
//   (work_log/codex 19.10.2026: gematria_method_trace parity=true; also gematria_words is_verified).
// - 787 and 1073 have no engine-verified phrase tied to the post; they exist as tags (1073 also as the flight number in the title).
// Nothing here is a score; `existingMeter` is the existing raw value kept as an inert labelled fact.
const L = (name, detail) => ({ name, ok: true, detail });
export const POST_5112 = { id: "5112", type: "post", label: "טיסה 1073 — 14,000 רגל, 363 והנחיתה בסעודיה | רמזים חזקים" };
export const NUMBERS_5112 = [
  { value: 787, source: { kind: "גוף + תגיות", note: "787 נקרא בגוף הפוסט, בתגית 787 ובתגית תשפ״ז (שמקושרת לצומת 5787, מספר אחר)." },
    expressions: [
      { phrase: "תשפז",
        sources: [{ kind: "post_body", ref: "post:5112", locator: "בלוק ״רמזי תשפז · שמחה והודיה״", quote: "תשפז = 787" },
          { kind: "post_body", ref: "post:5112", locator: "רמז לשוני לפני הבלוק", quote: "FZ → פז → תשפז" },
          { kind: "tag", ref: "post:5112", quote: "התגיות 787 ו־תשפ״ז" },
          { kind: "plan_doc", ref: "docs/2029-eight-visual-review-handoff.md:447", quote: "787 = תשפ״ז" }],
        calculation: { method: "רגיל", value: 787, claimedValue: 787, reproducesClaim: true, rowVerified: true, rowPublished: true },
        interpretation: { text: "רמז לשוני באותיות הטיסה: FZ → פז → תשפז, השנה העברית. הפוסט עצמו מציין שזה רמז ולא פירוש רשמי של קוד חברת התעופה.", attestedBy: "פרשנות מחבר הפוסט" } },
      { phrase: "ושמחת בחגך",
        sources: [{ kind: "post_body", ref: "post:5112", locator: "בלוק ״רמזי תשפז · שמחה והודיה״", quote: "ושמחת בחגך = 787" },
          { kind: "tag", ref: "post:5112", quote: "התגית ושמחת בחגך" },
          { kind: "plan_doc", ref: "docs/2029-eight-visual-review-handoff.md:447", quote: "״ושמחת בחגך״ = 787" }],
        calculation: { method: "רגיל", value: 787, claimedValue: 787, reproducesClaim: true, rowVerified: true, rowPublished: false },
        interpretation: { text: "ביום של טיסה, החיבור הזה מקבל את השפה שלו: לטוס מתוך שמחה. לחזור מתוך הודיה.", attestedBy: "פרשנות מחבר הפוסט" } },
      { phrase: "מי שגמלך כל טוב הוא יגמלך כל טוב סלה",
        sources: [{ kind: "post_body", ref: "post:5112", locator: "אותו בלוק", quote: "מי שגמלך כל טוב הוא יגמלך כל טוב סלה = 787" },
          { kind: "tag", ref: "post:5112", quote: "התגית ברכת הגומל" }],
        calculation: { method: "רגיל", value: 787, claimedValue: 787, reproducesClaim: true, rowVerified: false, rowPublished: false },
        interpretation: { text: "מוצג בפוסט בתוך מסגרת השמחה וההודיה; ברכת הגומל מופיעה בתגיות.", attestedBy: "מסגור מחבר הפוסט" } },
    ],
    openQuestions: [{ text: "האם הקשר לזמן הוא שנה עברית בלבד (787 = תשפ״ז), או גם חגים ותאריכי אירוע. ההגדרה פתוחה בסקירה החזותית.", ref: "docs/2029-eight-visual-review-handoff.md:430" }], graph: { direct: 1, media: 0, viaTagsOnly: true }, calculations: [],
    convergence: { layers: [L("התכנסות מילים", "5 ישויות"), L("רב-שיטתי", "5 שיטות"), L("אשכול אותו-עולם", "2"), L("אקטואליה (חדשות)", "1")], cards: [], tiers: { gold: 0, silver: 0 }, existingMeter: 44 } },
  { value: 1073, source: { kind: "כותרת + תגית", note: "מספר הטיסה בכותרת הפוסט; פירוק הספרות 10|7|3 הוא פרשני ואינו חישוב מנוע." }, graph: { direct: 1, media: 0, viaTagsOnly: true }, calculations: [],
    convergence: { layers: [L("ישות מסומנת", "1 כסף")], cards: [], tiers: { gold: 0, silver: 1 }, existingMeter: 11 } },
  { value: 1718, source: { kind: "תגית", note: "תגית בפוסט; כב בתשרי תשפד נקרא בפוסט 233 עם חישוב מאומת." }, graph: { direct: 3, media: 0, viaTagsOnly: false },
    calculations: [{ phrase: "כב בתשרי תשפד", method: "רגיל", value: 1718, verified: true }],
    convergence: { layers: [L("התכנסות מילים", "2 ישויות"), L("אקטואליה (חדשות)", "1"), L("כרטיס התכנסות", "קיים")], cards: [{ slug: "gapfill-718", title: "718 — שביעי באוקטובר", quality: 8 }], tiers: { gold: 0, silver: 0 }, existingMeter: 33 } },
  { value: 1202, source: { kind: "תגית", note: "תגית בפוסט; אותו ערך מתקבל מאותו ביטוי בשיטה אחרת (מסתתר)." }, graph: { direct: 27, media: 22, viaTagsOnly: false },
    calculations: [{ phrase: "כב בתשרי תשפד", method: "מסתתר", value: 1202, verified: true }, { phrase: "חרבות ברזל", method: "מסתתר", value: 1202, verified: true }],
    convergence: { layers: [L("התכנסות מילים", "16 ישויות"), L("רב-שיטתי", "6 שיטות"), L("אשכול אותו-עולם", "5"), L("ישות מסומנת", "2 זהב 4 כסף"), L("ראשי בגלריות", "11"), L("קשרי גרף", "7"), L("אקטואליה (חדשות)", "2"), L("כרטיס התכנסות", "קיים"), L("עוגן קדוש", "קיים")],
      cards: [{ slug: "bereshit", quality: 8 }, { slug: "tevet-asiri-hitgalut", quality: 5 }, { slug: "atzirut-hageula", quality: 0 }, { slug: "trump", quality: 8 }, { slug: "charvot-barzel-1202", quality: 0 }], tiers: { gold: 2, silver: 4 }, existingMeter: 100 } },
  { value: 363, source: { kind: "תגית + צילום", note: "תגית וצילום 363 בפוסט." }, graph: { direct: 8, media: 19, viaTagsOnly: false },
    calculations: [{ phrase: "המשיח", method: "רגיל", value: 363, verified: true }, { phrase: "חמישה", method: "רגיל", value: 363, verified: true }],
    convergence: { layers: [L("התכנסות מילים", "10 ישויות"), L("רב-שיטתי", "7 שיטות"), L("אשכול אותו-עולם", "2"), L("ישות מסומנת", "1 כסף"), L("ראשי בגלריות", "10"), L("כרטיס התכנסות", "קיים")],
      cards: [{ slug: "gapfill-363", title: "363 — חמישה = המשיח", quality: 8 }, { slug: "974-bina-melachutit", quality: 8 }], tiers: { gold: 0, silver: 1 }, existingMeter: 67 } },
];

// Real post row 5112 (public.posts, read-only 19.10.2026) exactly as `getPostsFromSupabase` returns it for the index card.
export const POST_ROW_5112 = {
  id: 5112, slug: "flydubai-fz1073-363-14000-remzei-geula", title: POST_5112.label.replace(" | רמזים חזקים", "") + " | רמזים חזקים",
  author: null, date: "2026-09-30T20:15:36.179757+00:00", modified: "2026-10-13T10:51:01.506903+00:00",
  image_url: "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/sod1820/2029/image/2026/10/post-5112-cover-20261012/reading-v2.jpg",
  thumb_url: "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/sod1820/2029/image/2026/10/post-5112-cover-20261012/thumb-fast-v1.jpg",
  categories: ["תיעוד אירועים", "רמזים חזקים", "רמזי הגאולה"],
  tags: ["104", "1073", "119", "1202", "14000", "1459", "1718", "2029-golden", "336", "363", "386", "401", "424", "455", "459", "599", "604", "616", "624", "631", "683", "718", "73", "75", "750", "7500", "776", "787", "ושמחת בחגך", "ברכת הגומל", "תשפ\"ז"],
  excerpt: "טיסה FZ1073 — 363, 14,000, ציר 75→750→7500, 776, 787, 599, סעודיה וטבוק, אסף רג׳ואן וקפטן סמיט מאצ׳הר.",
};

// Real edges (sample, non-media) around each number, as relation Findings; same shape entityGraphFinding produces.
const node = (id, type, label, href = null) => ({ id, type, label, href });
const P = node("f42e2a16", "post", "טיסה 1073 — 14,000 רגל, 363 והנחיתה בסעודיה", "/post/flydubai-fz1073-363-14000-remzei-geula");
const NUM = { 787: node("n787", "number", "787", "/number/787"), 1073: node("n1073", "number", "1073", "/number/1073"), 1718: node("n1718", "number", "1718", "/number/1718"),
  1202: node("n1202", "number", "1202", "/number/1202"), 363: node("n363", "number", "363", "/number/363") };
const E = (id, a, b, relationType) => ({ projection: { relations: [{ id, fromNodeId: a.id, toNodeId: b.id, relationType, from: a, to: b }] } });
export const GRAPH_BY_NUMBER = {
  787: [E("c1", P, NUM[787], "documents")],
  1073: [E("c2", P, NUM[1073], "documents")],
  1718: [E("c3", P, NUM[1718], "documents"), E("c4", NUM[1718], node("phrase1718", "entity", "כב בתשרי תשפד"), "equals"), E("c5", NUM[1718], node("p233", "post", "פוסט 233", "/post/233"), "mentions")],
  1202: [E("c6", P, NUM[1202], "documents"), E("c7", node("n776", "number", "776", "/number/776"), NUM[1202], "related"), E("c8", node("ti", "system", "traffic_intelligence"), NUM[1202], "demand_signal")],
  363: [E("c9", P, NUM[363], "documents"), E("c10", node("c974", "convergence", "974 — בינה מלאכותית", "/topic/974-bina-melachutit"), NUM[363], "contains")],
};
export const NODE_BY_NUMBER = Object.fromEntries(Object.entries(NUM).map(([k, v]) => [k, v]));
export const ENGINE_BY_LABEL = { "כב בתשרי תשפד": { value: 1718, methodLabel: "רגיל" } };
