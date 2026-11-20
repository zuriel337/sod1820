// "למי אתם שווים?" — the result a visitor wants to send on (ZURIEL 20.11.2026): the name, its value in the chosen method and published,
// verified phrases that share that value IN THE SAME METHOD. Pure wording and selection only. The matches come from the site's existing
// same-method reader (fn_number_lookup -> collectVerifiedLookupMatches -> pickEqualsPreview, the one the professional calculator uses);
// nothing is calculated, read or counted here, and no AI is involved.
const clean = value => String(value ?? "").replace(/\s+/g, " ").trim();

// The community calculator shows these methods and no more (ZURIEL 20.11.2026); every other method lives in the professional calculator.
export const COMMUNITY_CALCULATOR_METHODS = Object.freeze(["רגיל", "מילוי", "מסתתר", "גדול"]);
export const COMMUNITY_EQUALS_LIMIT = 3;
export const COMMUNITY_EQUALS_MORE_LIMIT = 24;

// A personal card is something people send to each other. These phrases stay in the corpus and on the number pages; they are only never
// offered on a personal card (ZURIEL 20.11.2026, after "בלעם הרשע בימינו" and "גיהנום" came up as a name's match). Whole words only, with
// an optional ה or ו in front, so "נשמת" or "שמות" never match "מת" / "מות". Reviewed list; extend it here, nowhere else.
export const COMMUNITY_CARD_EXCLUDED_WORDS = Object.freeze([
  "רשע", "רשעה", "רשעים", "גיהנום", "גהנום", "גיהנם", "שטן", "מוות", "מות", "צלמות", "רצח", "רוצח", "הרג", "עמלק", "בלעם", "המן", "היטלר",
  "שואה", "טמא", "טומאה", "טמאת", "קללה", "ארור", "מגפה", "אליל", "אלילים", "זונה", "זנות", "גוסס", "קבר", "אבדון", "קליפה", "קליפת", "ערלה",
  "מינות", "כפירה", "אפיקורס", "נחש", "מלחמה", "טרור", "מחבל", "מחבלים", "אויב", "חטא",
]);
export const COMMUNITY_CARD_EXCLUDED_PHRASES = Object.freeze(["עבודה זרה", "אלהים אחרים", "סטרא אחרא", "יצר הרע", "מלאך המות"]);
const EXCLUDED_WORDS = new Set(COMMUNITY_CARD_EXCLUDED_WORDS);
// the same rule for a term of several words: whole words, with an optional ה or ו in front of its first word
const EXCLUDED_PHRASE_PATTERNS = COMMUNITY_CARD_EXCLUDED_PHRASES.map(term => new RegExp(`(^| )[הו]?${term}( |$)`));
export function communityCardSuitable(phrase) {
  const text = clean(phrase);
  if (!text) return false;
  if (EXCLUDED_PHRASE_PATTERNS.some(pattern => pattern.test(text))) return false;
  return !text.split(" ").some(word => EXCLUDED_WORDS.has(word) || (/^[הו]/.test(word) && EXCLUDED_WORDS.has(word.slice(1))));
}

const words = text => clean(text).split(" ").filter(Boolean).length;
const rank = row => Number.isFinite(Number(row?.leadRank)) && row?.leadRank != null ? Number(row.leadRank) : Infinity;

// The matches shown first and the further ones the visitor may open and choose from. A name calculator puts names and single words first:
// an editor's lead rank still decides first, then fewer words, then the reader's own order. The typed name itself, repeats and phrases that
// are not suitable for a personal card are left out.
export function communityEqualsSelection(matches, name, limit = COMMUNITY_EQUALS_LIMIT, moreLimit = COMMUNITY_EQUALS_MORE_LIMIT) {
  const own = clean(name), seen = new Set(), all = [];
  for (const [index, row] of (Array.isArray(matches) ? matches : []).entries()) {
    const phrase = clean(row?.phrase);
    if (!phrase || phrase === own || seen.has(phrase) || !communityCardSuitable(phrase)) continue;
    seen.add(phrase); all.push({ ...row, phrase, index });
  }
  all.sort((a, b) => rank(a) - rank(b) || words(a.phrase) - words(b.phrase) || a.index - b.index);
  const rows = all.map(({ index, ...row }) => row); // eslint-disable-line no-unused-vars
  return { top: rows.slice(0, limit), more: rows.slice(limit, moreLimit), total: rows.length };
}

// The match that goes on the card: the visitor's own choice while it is still one of the matches, otherwise the first.
export function communityEqualsChosen(selection, chosenPhrase) {
  const all = [...(selection?.top || []), ...(selection?.more || [])];
  return all.find(row => row.phrase === clean(chosenPhrase)) || all[0] || null;
}

// What goes out in a share: the name the visitor typed, its value, the method when it is not the regular one, the chosen match and an invitation.
export function communityEqualsShareText({ name, value, phrase, methodKey = "רגיל", methodLabel = "" } = {}) {
  const expression = clean(name), peer = clean(phrase);
  if (!expression || !Number.isSafeInteger(Number(value)) || Number(value) < 1) return "";
  const method = clean(methodKey) === "רגיל" ? "בגימטריה" : `בגימטריה בשיטת ${clean(methodLabel) || clean(methodKey)}`;
  return `${expression} = ${Number(value)} ${method}${peer ? `, כמו ${peer}` : ""}. ומה השם שלכם שווה?`;
}

// Two names together (ZURIEL 20.11.2026, the "מחשבון אהבה" searches): the pair is written as the two names with a space, whose regular value is
// exactly the sum of the two (a space has no value), so the existing share link restores it and the engine verifies it on opening.
export function communityPairExpression(first, second) {
  const a = clean(first), b = clean(second);
  return a && b ? `${a} ${b}` : "";
}
export function communityPairShareText({ first, second, value, phrase } = {}) {
  const a = clean(first), b = clean(second), peer = clean(phrase);
  if (!a || !b || !Number.isSafeInteger(Number(value)) || Number(value) < 1) return "";
  return `${a} ו${b} ביחד = ${Number(value)} בגימטריה${peer ? `, כמו ${peer}` : ""}. ומה אתם שווים ביחד?`;
}
// In how many of the community's four methods the two names have the same value: counted from the engine's own rows, never estimated.
export function communityPairMeetings(firstRows, secondRows, methods = COMMUNITY_CALCULATOR_METHODS) {
  const meet = [];
  for (const key of methods) {
    const a = (firstRows || []).find(row => row.key === key), b = (secondRows || []).find(row => row.key === key);
    if (a && b && Number.isFinite(Number(a.value)) && Number(a.value) === Number(b.value)) meet.push(key);
  }
  return { meet, total: methods.length };
}
