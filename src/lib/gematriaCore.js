// Neutral gematria core data: letter values, calcGem and the key-number table.
// Extracted VERBATIM from src/theme.js (which mixed engine data with Legacy design tokens). No logic change.
// theme.js re-exports these names so Legacy importers are untouched; engine and 2029 code import from here.
// ===== GEMATRIA =====
export const GEM = {'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,'י':10,'כ':20,'ך':20,'ל':30,'מ':40,'ם':40,'נ':50,'ן':50,'ס':60,'ע':70,'פ':80,'ף':80,'צ':90,'ץ':90,'ק':100,'ר':200,'ש':300,'ת':400};
export const calcGem = w => [...w].reduce((s, c) => s + (GEM[c] || 0), 0);

export const KEY_NUMBERS = {
  1:    "האחד — שורש הכל",
  3:    "שלמות / חשכה / קוד הבריאה 333",
  7:    "חותם הבריאה",
  14:   "דוד מלכות",
  26:   "יהוה",
  40:   "מ — זרע שינוי",
  45:   "גאולה",
  358:  "משיח = נחש",
  400:  "ת — חותם התפשטות",
  786:  "תשפ\"ו — השנה שלנו!",
  1237: "התגלות — לילה כיום יאיר",
  1820: "סוד השם יהוה × עמים",
};

// מספר "חם"/משמעותי = אחד ממספרי הליבה (KEY_NUMBERS). אחרת — "קר", ולא מציגים אותו על פוסטים.
export const isWarmNumber = n => KEY_NUMBERS[n] != null;
