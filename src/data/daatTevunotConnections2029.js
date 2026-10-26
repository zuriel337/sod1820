import { DAAT_TEVUNOT_BRANCHES } from "./daatTevunotSections2029.js";

export const DAAT_TEVUNOT_RELATION_STATES = Object.freeze({
  source_explicit: Object.freeze({
    label: "מפורש בסעיף",
    description: "המונח מופיע בנוסח המקור של הסעיף הנבחר.",
  }),
  structural_map: Object.freeze({
    label: "מיפוי מבני",
    description: "חיבור ניווט שנגזר ממבנה הקריאה של הספר, לא ציטוט נוסף.",
  }),
  interpretive_candidate: Object.freeze({
    label: "עדשת השוואה",
    description: "הצעת קריאה לעולמות; אינה מיוחסת לרמח״ל ללא מקור נוסף.",
  }),
  engine_pending: Object.freeze({
    label: "ממתין למנוע",
    description: "ביטוי מקור מוכן לפתיחה במחשבון הקנוני; אין כאן ערך מחושב.",
  }),
});

export const DAAT_TEVUNOT_WORLD_LENSES = Object.freeze([
  Object.freeze({ key: "atzilut", title: "אצילות", short: "א", role: "אחדות, רצון ומקור ההנהגה" }),
  Object.freeze({ key: "beriah", title: "בריאה", short: "ב", role: "תכלית, סדר ותבנית ההנהגה" }),
  Object.freeze({ key: "yetzirah", title: "יצירה", short: "י", role: "מידות, יחסים ותנועת הנפש" }),
  Object.freeze({ key: "asiyah", title: "עשייה", short: "ע", role: "גוף, מעשה ותוצאה נראית" }),
]);

const connectionModel = {
  opening: {
    governance: ["תכלית האדם", "עבודה והשלמה", "השגחה ומשפט"],
    worlds: ["beriah", "asiyah"],
    concepts: ["השגחה", "תכלית", "אדם", "עבודה", "שלמות", "חסרון", "רצון", "טוב"],
    gematriaSeeds: ["אדם", "שלמות", "רצון"],
  },
  unity: {
    governance: ["הנהגת הייחוד", "ממשלה יחידית", "תיקון כללי"],
    worlds: ["atzilut", "beriah"],
    concepts: ["יחוד", "שליטה", "ממשלה", "הסתר", "גילוי", "תיקון", "טוב", "רע"],
    gematriaSeeds: ["יחוד", "תיקון", "ממשלה"],
  },
  "body-soul": {
    governance: ["מבנה האדם", "זיכוך הדרגתי", "גמול ותחייה"],
    worlds: ["yetzirah", "asiyah"],
    concepts: ["גוף", "נשמה", "תחיית המתים", "זיכוך", "שכר", "עבודה", "שלמות", "אדם"],
    gematriaSeeds: ["גוף", "נשמה", "תחיית המתים"],
  },
  concealment: {
    governance: ["הסתר פנים", "הארת פנים", "מדרגות גילוי"],
    worlds: ["beriah", "yetzirah"],
    concepts: ["הסתר", "הארה", "פנים", "מדרגה", "נשמה", "גוף", "זמן", "שלמות"],
    gematriaSeeds: ["הסתר", "הארה", "פנים"],
  },
  influence: {
    governance: ["השפעה וקבלה", "גבול החיסרון", "התהוות הטוב והרע"],
    worlds: ["atzilut", "beriah", "asiyah"],
    concepts: ["השפעה", "שפע", "טוב", "רע", "העדר", "גבול", "בריאה", "טבע"],
    gematriaSeeds: ["שפע", "טוב", "רע"],
  },
  repair: {
    governance: ["סדר התיקון", "קשר פרט וכלל", "גבולות הרע"],
    worlds: ["beriah", "yetzirah", "asiyah"],
    concepts: ["תיקון", "עולם", "ישראל", "רע", "טוב", "השפעה", "בריאה", "כלל"],
    gematriaSeeds: ["תיקון", "ישראל", "עולם"],
  },
  judgment: {
    governance: ["הנהגת המשפט", "שכר ועונש", "זמן ותיקון כללי"],
    worlds: ["beriah", "yetzirah", "asiyah"],
    concepts: ["משפט", "שכר", "עונש", "דין", "חסד", "זמן", "מזל", "צדיק", "תיקון", "השגחה"],
    gematriaSeeds: ["משפט", "דין", "חסד", "מזל"],
  },
  prophecy: {
    governance: ["השגה נבואית", "מראה ונמשל", "גבולות הידיעה"],
    worlds: ["beriah", "yetzirah"],
    concepts: ["נבואה", "נביא", "מראה", "תמונה", "דמות", "השגה", "משה", "ידיעה"],
    gematriaSeeds: ["נבואה", "מראה", "דמות"],
  },
  closing: {
    governance: ["יש מאין", "סדר הפעולה", "גבול החקירה"],
    worlds: ["atzilut", "beriah"],
    concepts: ["בריאה", "יש", "אין", "פעולה", "סדר", "ידיעה", "אמונה", "שלמות"],
    gematriaSeeds: ["בריאה", "יש", "אין"],
  },
};

const branchKeys = new Set(DAAT_TEVUNOT_BRANCHES.map(branch => branch.key));
if (Object.keys(connectionModel).some(key => !branchKeys.has(key))) {
  throw new Error("Daat Tevunot connection model references an unknown branch");
}

export const DAAT_TEVUNOT_CONNECTIONS_BY_BRANCH = Object.freeze(Object.fromEntries(
  Object.entries(connectionModel).map(([key, value]) => [key, Object.freeze({
    governance: Object.freeze(value.governance),
    worlds: Object.freeze(value.worlds),
    concepts: Object.freeze(value.concepts),
    gematriaSeeds: Object.freeze(value.gematriaSeeds),
  })]),
));

function unique(items) {
  return [...new Set(items)];
}

export function connectionBundleForSection(section) {
  const model = DAAT_TEVUNOT_CONNECTIONS_BY_BRANCH[section.branch];
  if (!model) return null;
  const explicitConcepts = model.concepts.filter(term => section.sourceText.includes(term));
  const exactGematriaTerms = unique([
    ...model.gematriaSeeds.filter(term => section.sourceText.includes(term)),
    ...explicitConcepts,
  ]).slice(0, 4);
  const gematriaTerms = exactGematriaTerms.length
    ? exactGematriaTerms.map(term => Object.freeze({ term, sourceStatus: "source_explicit", calculationStatus: "engine_pending" }))
    : model.gematriaSeeds.slice(0, 2).map(term => Object.freeze({ term, sourceStatus: "structural_map", calculationStatus: "engine_pending" }));

  return Object.freeze({
    branch: section.branch,
    governance: Object.freeze(model.governance.map(label => Object.freeze({ label, status: "structural_map" }))),
    concepts: Object.freeze(explicitConcepts.map(label => Object.freeze({ label, status: "source_explicit" }))),
    worlds: Object.freeze(DAAT_TEVUNOT_WORLD_LENSES.map(world => Object.freeze({
      ...world,
      active: model.worlds.includes(world.key),
      status: "interpretive_candidate",
    }))),
    gematria: Object.freeze(gematriaTerms),
  });
}
