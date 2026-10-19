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
  { value: 787, source: { kind: "תגית", note: "תגית בפוסט (קשר documents). אין חישוב מאומת המקשר אותה לפוסט." }, graph: { direct: 1, viaTagsOnly: true }, calculations: [],
    convergence: { layers: [L("התכנסות מילים", "5 ישויות"), L("רב-שיטתי", "5 שיטות"), L("אשכול אותו-עולם", "2"), L("אקטואליה (חדשות)", "1")], cards: [], tiers: { gold: 0, silver: 0 }, existingMeter: 44 } },
  { value: 1073, source: { kind: "כותרת + תגית", note: "מספר הטיסה בכותרת הפוסט; פירוק הספרות 10|7|3 הוא פרשני ואינו חישוב מנוע." }, graph: { direct: 1, viaTagsOnly: true }, calculations: [],
    convergence: { layers: [L("ישות מסומנת", "1 כסף")], cards: [], tiers: { gold: 0, silver: 1 }, existingMeter: 11 } },
  { value: 1718, source: { kind: "תגית", note: "תגית בפוסט; כב בתשרי תשפד נקרא בפוסט 233 עם חישוב מאומת." }, graph: { direct: 3, viaTagsOnly: false },
    calculations: [{ phrase: "כב בתשרי תשפד", method: "רגיל", value: 1718, verified: true }],
    convergence: { layers: [L("התכנסות מילים", "2 ישויות"), L("אקטואליה (חדשות)", "1"), L("כרטיס התכנסות", "קיים")], cards: [{ slug: "gapfill-718", title: "718 — שביעי באוקטובר", quality: 8 }], tiers: { gold: 0, silver: 0 }, existingMeter: 33 } },
  { value: 1202, source: { kind: "תגית", note: "תגית בפוסט; אותו ערך מתקבל מאותו ביטוי בשיטה אחרת (מסתתר)." }, graph: { direct: 49, viaTagsOnly: false },
    calculations: [{ phrase: "כב בתשרי תשפד", method: "מסתתר", value: 1202, verified: true }, { phrase: "חרבות ברזל", method: "מסתתר", value: 1202, verified: true }],
    convergence: { layers: [L("התכנסות מילים", "16 ישויות"), L("רב-שיטתי", "6 שיטות"), L("אשכול אותו-עולם", "5"), L("ישות מסומנת", "2 זהב 4 כסף"), L("ראשי בגלריות", "11"), L("קשרי גרף", "7"), L("אקטואליה (חדשות)", "2"), L("כרטיס התכנסות", "קיים"), L("עוגן קדוש", "קיים")],
      cards: [{ slug: "bereshit", quality: 8 }, { slug: "tevet-asiri-hitgalut", quality: 5 }, { slug: "atzirut-hageula", quality: 0 }, { slug: "trump", quality: 8 }, { slug: "charvot-barzel-1202", quality: 0 }], tiers: { gold: 2, silver: 4 }, existingMeter: 100 } },
  { value: 363, source: { kind: "תגית + צילום", note: "תגית וצילום 363 בפוסט." }, graph: { direct: 27, viaTagsOnly: false },
    calculations: [{ phrase: "המשיח", method: "רגיל", value: 363, verified: true }, { phrase: "חמישה", method: "רגיל", value: 363, verified: true }],
    convergence: { layers: [L("התכנסות מילים", "10 ישויות"), L("רב-שיטתי", "7 שיטות"), L("אשכול אותו-עולם", "2"), L("ישות מסומנת", "1 כסף"), L("ראשי בגלריות", "10"), L("כרטיס התכנסות", "קיים")],
      cards: [{ slug: "gapfill-363", title: "363 — חמישה = המשיח", quality: 8 }, { slug: "974-bina-melachutit", quality: 8 }], tiers: { gold: 0, silver: 1 }, existingMeter: 67 } },
];
