export const ELS_RAZIEL_PLANNING_ACTION = "els_guided_planning_v1";
export const ELS_RAZIEL_SEARCH_PLAN_CONTRACT = "els_search_plan_v1";
export const ELS_RAZIEL_PLANNING_SUBJECT = "תכנן את חיפוש ה־ELS שביקשתי";

const MAX_STORY_LENGTH = 6000;
const MAX_AXIS_LETTERS = 12;
const MAX_CONTEXT_LETTERS = 24;
const MODES = new Set(["crossed_pair", "crossed_three", "exact_axis", "anchor_context"]);
const HEBREW_MARKS = /[\u0591-\u05C7]/g;
const PAIR_CUE = /(?:ש(?:ני|תי)\s+מילים|שני\s+מונחים|זוג\s+מילים|מוצלב(?:ת|ים)?|הצלב(?:ה|ת|ו)?)/u;
const THREE_CUE = /(?:שלוש(?:ה)?\s+ה?(?:מילים|מונחים|צירים)|3\s+ה?(?:מילים|מונחים|צירים))/u;
const INSTRUCTION_KEYS = new Set(["חפש", "חיפוש", "מצא", "תמצא", "תורה", "בתורה", "תנכ", "בתנכ", "מילה", "מילים", "מונח", "מונחים", "שני", "שתי"]);

const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const cleanStory = (value) => String(value ?? "")
  .replace(/<[^>]*>/g, " ")
  .replace(/[\u0000-\u001f\u007f]/g, " ")
  .replace(/\r\n?/g, "\n")
  .trim();
const cleanInline = (value, limit = 180) => String(value ?? "")
  .replace(/<[^>]*>/g, " ")
  .replace(/[\u0000-\u001f\u007f]/g, " ")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, limit);
const canonicalHebrew = (value) => cleanInline(value, 200)
  .normalize("NFKD")
  .replace(HEBREW_MARKS, "")
  .replace(/[^א-ת]/g, "")
  .replace(/[ךםןףץ]/g, (letter) => ({ ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" })[letter]);
const cleanHebrewTerm = (value) => cleanInline(value, 100)
  .normalize("NFKD")
  .replace(HEBREW_MARKS, "")
  .replace(/[^א-ת\s]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

export function extractElsLockedPhrases(story) {
  const phrases = [];
  const seen = new Set();
  for (const match of cleanStory(story).matchAll(/["״]([^"״\n]{2,100})["״]/g)) {
    const phrase = cleanHebrewTerm(match[1]);
    const key = canonicalHebrew(phrase);
    if (key.length < 2 || key.length > MAX_CONTEXT_LETTERS || seen.has(key)) continue;
    seen.add(key);
    phrases.push(phrase);
    if (phrases.length === 4) break;
  }
  return Object.freeze(phrases);
}

function validTerm(value, maxLetters) {
  const term = cleanHebrewTerm(value);
  const length = canonicalHebrew(term).length;
  return length >= 2 && length <= maxLetters ? term : "";
}

function exactKeys(value, allowed) {
  if (!isObject(value)) return false;
  const set = new Set(allowed);
  return Object.keys(value).every((key) => set.has(key));
}

export function normalizeElsRazielPlanningAction(value) {
  if (!exactKeys(value, ["id", "contract", "surface", "story", "scope", "locked_phrases", "pair_requested"])) return null;
  const id = value.id ?? value.contract;
  if (id !== ELS_RAZIEL_PLANNING_ACTION || value.surface !== "els") return null;
  const story = cleanStory(value.story);
  if (!story || story.length > MAX_STORY_LENGTH) return null;
  const scope = value.scope === "tanakh" ? "tanakh" : value.scope === "torah" ? "torah" : null;
  if (!scope) return null;
  const lockedPhrases = extractElsLockedPhrases(story);
  if (value.locked_phrases != null) {
    if (!Array.isArray(value.locked_phrases)) return null;
    const supplied = value.locked_phrases.map(cleanHebrewTerm);
    if (JSON.stringify(supplied) !== JSON.stringify(lockedPhrases)) return null;
  }
  const pairRequested = PAIR_CUE.test(story);
  if (value.pair_requested != null && value.pair_requested !== pairRequested) return null;
  return Object.freeze({
    id: ELS_RAZIEL_PLANNING_ACTION,
    surface: "els",
    story,
    scope,
    locked_phrases: lockedPhrases,
    pair_requested: pairRequested,
  });
}

function uniqueTerms(values, maxLetters, limit) {
  const terms = [];
  const seen = new Set();
  for (const value of Array.isArray(values) ? values : []) {
    const raw = isObject(value) ? value.term : value;
    const term = validTerm(raw, maxLetters);
    const key = canonicalHebrew(term);
    if (!term || seen.has(key)) continue;
    seen.add(key);
    terms.push(term);
    if (terms.length === limit) break;
  }
  return terms;
}

function phraseWords(value) {
  return cleanHebrewTerm(value).split(" ").filter((word) => validTerm(word, MAX_AXIS_LETTERS));
}

function lockedPair(action) {
  if (!action?.pair_requested) return null;
  for (const phrase of action.locked_phrases || []) {
    const words = phraseWords(phrase);
    if (words.length === 2) return words;
  }
  return null;
}

function lockedThree(action) {
  if (!THREE_CUE.test(action?.story || "")) return null;
  const separatelyQuoted = action.locked_phrases || [];
  if (separatelyQuoted.length === 3 && separatelyQuoted.every(phrase => phraseWords(phrase).length === 1)) {
    const words = separatelyQuoted.map(phrase => phraseWords(phrase)[0]);
    if (new Set(words.map(canonicalHebrew)).size === 3) return words;
  }
  for (const phrase of action.locked_phrases || []) {
    const words = phraseWords(phrase);
    if (words.length === 3 && new Set(words.map(canonicalHebrew)).size === 3) return words;
  }
  return null;
}

function lockedPhraseAccepted(term, action, { allowWord = false } = {}) {
  const key = canonicalHebrew(term);
  if (!key) return false;
  return (action.locked_phrases || []).some((phrase) => {
    if (canonicalHebrew(phrase) === key) return true;
    return allowWord && phraseWords(phrase).some((word) => canonicalHebrew(word) === key);
  });
}

export function normalizeElsRazielSearchPlan(value, rawAction) {
  const action = normalizeElsRazielPlanningAction(rawAction);
  if (!action || !isObject(value)) return null;
  const source = isObject(value.els_search_plan) ? value.els_search_plan : value;
  const mode = cleanInline(source.mode, 40);
  if (source.contract !== ELS_RAZIEL_SEARCH_PLAN_CONTRACT || source.status !== "READY" || !MODES.has(mode)) return null;
  if (source.scope !== action.scope) return null;
  if (THREE_CUE.test(action.story) && mode !== "crossed_three") return null;
  if (mode === "crossed_three" && (!Array.isArray(source.axes) || source.axes.length !== 3)) return null;

  let axes = uniqueTerms(source.axes, MAX_AXIS_LETTERS, 3);
  const pair = lockedPair(action);
  const three = lockedThree(action);
  if (THREE_CUE.test(action.story) && action.locked_phrases.length && !three) return null;
  if (three) {
    if (mode !== "crossed_three") return null;
    axes = three;
  } else if (pair) {
    if (mode !== "crossed_pair") return null;
    axes = pair;
  } else if (mode === "crossed_pair" && axes.length !== 2) return null;
  axes = axes.filter((term) => !INSTRUCTION_KEYS.has(canonicalHebrew(term)) || lockedPhraseAccepted(term, action, { allowWord: true }));
  if (mode === "crossed_pair" && axes.length !== 2) return null;
  if (mode === "crossed_three" && axes.length !== 3) return null;
  if (!["crossed_pair", "crossed_three"].includes(mode) && axes.length !== 1) return null;
  if (!axes.length) return null;

  // Quoted text is a user lock, not a hint. A plan may use the exact phrase, or its exact
  // component words only when the user explicitly asked for a two-word crossing.
  if (action.locked_phrases.length) {
    const allowsWords = mode === "crossed_pair" && action.pair_requested || mode === "crossed_three" && THREE_CUE.test(action.story);
    const hasLockedAxis = axes.some((term) => lockedPhraseAccepted(term, action, { allowWord: allowsWords }));
    if (!hasLockedAxis) return null;
  }

  const axisKeys = new Set(axes.map(canonicalHebrew));
  const contextTerms = (pair || three ? [] : uniqueTerms(source.context_terms ?? source.contextTerms, MAX_CONTEXT_LETTERS, 6))
    .filter((term) => !axisKeys.has(canonicalHebrew(term)))
    .filter((term) => !INSTRUCTION_KEYS.has(canonicalHebrew(term)) || lockedPhraseAccepted(term, action));
  const confidence = ["high", "medium", "low"].includes(source.confidence) ? source.confidence : "medium";
  const rationale = three ? "המשתמש ביקש במפורש שלוש מילים וציטט אותן כיחידת חיפוש נעולה."
    : pair
    ? "המשתמש ביקש במפורש שתי מילים וציטט אותן כיחידת חיפוש נעולה."
    : cleanInline(source.rationale, 240) || "רזיאל זיהה את יחידות החיפוש, והמנוע הקנוני יאמת אותן.";
  return Object.freeze({
    contract: ELS_RAZIEL_SEARCH_PLAN_CONTRACT,
    status: "READY",
    scope: action.scope,
    mode,
    axes: Object.freeze(axes.map((term, index) => Object.freeze({
      term,
      role: index === 0 ? "primary" : "secondary",
      source: lockedPhraseAccepted(term, action, { allowWord: true }) ? "locked_quote" : "raziel_proposal",
    }))),
    context_terms: Object.freeze(contextTerms),
    locked_phrases: action.locked_phrases,
    confidence,
    rationale,
    authority: "PROPOSED_UNTIL_CANONICAL_ELS_MATCH",
    model_calls: 1,
  });
}

export function deriveLockedElsSearchPlan(rawAction) {
  const action = normalizeElsRazielPlanningAction(rawAction);
  if (!action) return null;
  const three = lockedThree(action);
  if (three) return normalizeElsRazielSearchPlan({ contract: ELS_RAZIEL_SEARCH_PLAN_CONTRACT, status: "READY", scope: action.scope,
    mode: "crossed_three", axes: three, context_terms: [], confidence: "high", rationale: "שלוש מילים שנבחרו במפורש." }, action);
  const pair = lockedPair(action);
  if (pair) {
    return normalizeElsRazielSearchPlan({
      contract: ELS_RAZIEL_SEARCH_PLAN_CONTRACT,
      status: "READY",
      scope: action.scope,
      mode: "crossed_pair",
      axes: pair,
      context_terms: [],
      confidence: "high",
      rationale: "המשתמש ביקש במפורש שתי מילים וציטט אותן כיחידת חיפוש נעולה.",
    }, action);
  }
  const phrase = (action.locked_phrases || []).find((item) => validTerm(item, MAX_AXIS_LETTERS));
  if (!phrase) return null;
  return normalizeElsRazielSearchPlan({
    contract: ELS_RAZIEL_SEARCH_PLAN_CONTRACT,
    status: "READY",
    scope: action.scope,
    mode: "exact_axis",
    axes: [phrase],
    context_terms: [],
    confidence: "high",
    rationale: "הביטוי המצוטט נשמר בדיוק כציר נעול.",
  }, action);
}

export function elsPlanningPrompt(action) {
  const normalized = normalizeElsRazielPlanningAction(action);
  if (!normalized) return null;
  return [
    "אתה שכבת התכנון המצומצמת של רזיאל לחיפוש ELS. אינך מחפש בתורה ואינך מחשב דילוגים, מיקומים, התאמות או ממצאים.",
    "החזר JSON בלבד, ללא Markdown וללא טקסט מחוץ לאובייקט.",
    `החוזה: {\"els_search_plan\":{\"contract\":\"${ELS_RAZIEL_SEARCH_PLAN_CONTRACT}\",\"status\":\"READY\",\"scope\":\"torah|tanakh\",\"mode\":\"crossed_pair|crossed_three|exact_axis|anchor_context\",\"axes\":[{\"term\":\"...\"}],\"context_terms\":[\"...\"],\"confidence\":\"high|medium|low\",\"rationale\":\"...\"}}`,
    "כללים: crossed_pair כולל בדיוק שני צירים; crossed_three כולל בדיוק שלושה צירים מחייבים; exact_axis ו-anchor_context כוללים ציר אחד. עד שש מילות הקשר. עברית בלבד.",
    "מילות הוראה כגון חפש, תורה, בתורה, תנך, מילים, מונחים אינן צירי חיפוש אלא אם המשתמש ציטט אותן במפורש.",
    "טקסט מצוטט הוא נעילת משתמש: אסור לתקן, להחליף או להרחיב אותו. אם התבקשה במפורש הצלבה של שתי מילים ובציטוט יש בדיוק שתי מילים — החזר crossed_pair עם שתי המילים בדיוק ובאותו סדר.",
    "אם זה סיפור ולא פקודת שתי מילים, בחר את הציר הקצר והמובחן ביותר והקשר קטן ורלוונטי. אל תטען שנמצא דבר; זו הצעה בלבד למנוע הקנוני.",
    `היקף: ${normalized.scope}`,
    `בקשת שתי מילים: ${normalized.pair_requested ? "כן" : "לא"}`,
    `ביטויים נעולים: ${normalized.locked_phrases.length ? normalized.locked_phrases.map((item) => `״${item}״`).join(" · ") : "אין"}`,
    `הטקסט של המשתמש:\n${normalized.story}`,
  ].join("\n");
}
