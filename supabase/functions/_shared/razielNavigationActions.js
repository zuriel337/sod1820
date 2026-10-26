// RAZIEL_CANONICAL_NAVIGATION_ACTIONS_V1
//
// One pure, deterministic resolver for explicit navigation requests ("תן לי את דף המספר 73",
// "פתח את מפת המחקר", "קח אותי לביטויים של המספר הזה"). The 2029 site (lazy submit chunk) and
// wa-raziel both load this exact module, so a button on the site and a link on WhatsApp are
// produced by the same grammar, the same route table and the same warm copy.
//
// It never calls a model, a database or the network, and it never reads a URL from model output:
// an href exists only as the result of `razielNumberPageHref` / the closed route table below,
// whose shapes are pinned to the 2029 router (`/2029/number/:value`, `/world`) by a parity test.
// Transport adapters supply a *verified* conversation focus; this module revalidates its shape and
// range but does not decide what is verified. A missing or ambiguous number is never guessed.
//
// Dependency-free on purpose (Deno edge + Vite lazy chunk + node:test).

export const RAZIEL_NAVIGATION_ACTIONS_VERSION = "raziel-canonical-navigation-actions-v1";

export const RAZIEL_NAVIGATION_INTENT = Object.freeze({
  NUMBER_PAGE: "number_page",
  NUMBER_EXPRESSIONS: "number_expressions",
  RESEARCH_MAP: "research_map",
  WORLD: "world",
});

export const RAZIEL_NAVIGATION_NUMBER_MIN = 1;
export const RAZIEL_NAVIGATION_NUMBER_MAX = 999999;

export const RAZIEL_NAVIGATION_ASK_NUMBER = "לאיזה מספר תרצה שאפתח דף?";

// Closed route table. Mirrors App2029 `<Route path="/2029/number/:value">` and `<Route path="/world">`
// (and `numberExpressionFocusHref(root)` without query); pinned by test/raziel-canonical-navigation-actions.test.mjs.
export const RAZIEL_NAVIGATION_ROUTES = Object.freeze({
  number: (value) => `/2029/number/${value}`,
  world: () => "/world",
});

const NUMBER_HREF = /^\/2029\/number\/([1-9]\d{0,5})$/;
const WORLD_HREF = "/world";

export function isValidRazielNavigationNumber(value) {
  const number = typeof value === "string" && /^\d{1,12}$/.test(value.trim()) ? Number(value) : value;
  return Number.isSafeInteger(number)
    && number >= RAZIEL_NAVIGATION_NUMBER_MIN
    && number <= RAZIEL_NAVIGATION_NUMBER_MAX;
}

export function razielNumberPageHref(value) {
  return isValidRazielNavigationNumber(value) ? RAZIEL_NAVIGATION_ROUTES.number(Number(value)) : null;
}

export function isCanonicalRazielNavigationHref(href) {
  if (typeof href !== "string") return false;
  return href === WORLD_HREF || NUMBER_HREF.test(href);
}

// Absolute https link for chat transports. Same-site canonical hrefs only; never a Preview/dev origin.
export function razielNavigationUrl(href, origin) {
  if (!isCanonicalRazielNavigationHref(href)) return "";
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== "https:") return "";
    const host = parsed.hostname.toLowerCase();
    if (host.endsWith(".vercel.app") || host === "localhost" || host.includes("preview")) return "";
    return parsed.origin + href;
  } catch {
    return "";
  }
}

// ── Grammar ──────────────────────────────────────────────────────────────────────────────────────

const FILLER = new Set([
  "בבקשה", "נא", "אנא", "תודה", "רזיאל", "באתר", "שלנו", "שלכם", "לי", "לנו", "אשמח", "אפשר",
  "טוב", "נו", "אוקי", "אוקיי", "סבבה", "היי", "שלום", "אז", "עכשיו", "כעת", "מיד", "ישר",
  "פשוט", "ממש", "יפה", "מעולה", "כן",
]);

function normalize(text) {
  if (text == null) return "";
  const cleaned = String(text)
    .normalize("NFC")
    .replace(/[֑-ׇ]/g, "")
    .replace(/\p{Extended_Pictographic}/gu, " ")
    .replace(/[׳״'"`’‘“”]/g, "")
    .replace(/[־‐-―-]/g, " ")
    .replace(/[?!.,;:()[\]{}…<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^@/, "");
  return cleaned.slice(0, 200);
}

const NEGATION = /(?:^| )(?:לא|בלי)(?: |$)|(?:^| )אל ת/u;

function stripFiller(text) {
  return text
    .split(" ")
    .map((token) => token.replace(/^@/, ""))
    .filter((token) => token && !FILLER.has(token))
    .join(" ");
}

const OPEN_VERBS = "(?:תפתח|תפתחי|תפתחו|פתח|פתחי|פתחו|לפתוח)";
const TAKE_VERBS = "(?:קח|קחי|קחו|תיקח|תיקחי|תקח|תקחי|הובל|הובילי|תוביל|תובילי|העבר|העבירי|תעביר|תעבירי) אותי";
const GIVE_VERBS = "(?:תן|תני|תנו|שלח|שלחי|תשלח|תשלחי|הבא|הביאי|תביא|תביאי|הראה|הראי|תראה|תראי|הצג|הצגי|תציג|תציגי|לקבל|לשלוח)";
const WANT = "(?:רוצה|מבקש|מבקשת|צריך|צריכה|מעוניין|מעוניינת)";

// Lead = how the person asks. open/take mean "move me there"; give means "hand me"; none means a bare link noun.
const LEADS = [
  { kind: "take", re: new RegExp(`^(?:אני )?${TAKE_VERBS}(?: |$)`, "u") },
  { kind: "take", re: new RegExp(`^(?:בוא|בואי) (?:נפתח|נעבור|נלך|ניגש)(?: |$)`, "u") },
  { kind: "open", re: new RegExp(`^(?:אני )?${WANT} (?:לפתוח|לראות|לעבור|להגיע|ללכת|ש(?:תפתח|תפתחי))(?: |$)`, "u") },
  { kind: "give", re: new RegExp(`^(?:אני )?${WANT} (?:לקבל|ש(?:תיתן|תתן|תשלח|תשלחי|תביא|תראה))(?: |$)`, "u") },
  { kind: "open", re: new RegExp(`^(?:אני )?${OPEN_VERBS}(?: |$)`, "u") },
  { kind: "open", re: /^(?:לראות|לעבור|להגיע|ללכת)(?: |$)/u },
  { kind: "give", re: new RegExp(`^(?:אני )?${GIVE_VERBS}(?: |$)`, "u") },
];

const LINK_NOUN = /^(?:ה)?(?:לינק|קישור|קישורית)(?: (?:אל|עבור|של))?(?: |$)/u;

const PREP = "(?:את |אל |ל|ב)?";
const NUM = "\\d{1,12}";
const NUMBER_REF = `(?:ה?מספר(?: (?:${NUM}|הזה|זה))?|${NUM}|הזה|זה)`;

const TARGETS = [
  // Explicit "page of the number" wording; also fine after "give me".
  { intent: RAZIEL_NAVIGATION_INTENT.NUMBER_PAGE, allow: ["open", "take", "give", "none"],
    re: new RegExp(`^${PREP}(?:ה)?(?:דף|עמוד)(?: של)? (?:ה)?מספר(?: (?:${NUM}|הזה|זה))?$`, "u") },
  { intent: RAZIEL_NAVIGATION_INTENT.NUMBER_PAGE, allow: ["open", "take", "give", "none"],
    re: new RegExp(`^${PREP}(?:ה)?(?:דף|עמוד) של ${NUM}$`, "u") },
  // "the number 337" / "this number" alone is also an information request when someone *gives* it,
  // so it navigates only with open/take/link-noun wording.
  { intent: RAZIEL_NAVIGATION_INTENT.NUMBER_PAGE, allow: ["open", "take", "none"],
    re: new RegExp(`^${PREP}(?:ה)?מספר(?: (?:${NUM}|הזה|זה))$`, "u") },
  { intent: RAZIEL_NAVIGATION_INTENT.NUMBER_PAGE, allow: ["none"], linkOnly: true,
    re: new RegExp(`^(?:ל ?)?${NUM}$`, "u") },
  { intent: RAZIEL_NAVIGATION_INTENT.NUMBER_PAGE, allow: ["open", "take", "none"],
    re: /^(?:את |אל |ל)?(?:ה)?מספר$/u, requireReference: true },
  { intent: RAZIEL_NAVIGATION_INTENT.NUMBER_EXPRESSIONS, allow: ["open", "take", "none"],
    re: new RegExp(`^${PREP}(?:ה)?ביטויים(?: של(?:ו|ה)| (?:של|עבור) ${NUMBER_REF}| (?:של|עבור) (?:ה)?מספר)?$`, "u") },
  // "/world" is opened only by an explicit request for the world; "מפת המחקר" is never mapped to it (owner decision pending).
  { intent: RAZIEL_NAVIGATION_INTENT.WORLD, allow: ["open", "take", "none"],
    re: new RegExp(`^${PREP}(?:ה)?עולם$`, "u") },
  { intent: RAZIEL_NAVIGATION_INTENT.RESEARCH_MAP, allow: ["open", "take", "none"],
    re: new RegExp(`^${PREP}מפת (?:ה)?מחקר(?: של(?:ו|ה)| (?:של|עבור) ${NUMBER_REF}| (?:של|עבור) (?:ה)?מספר)?$`, "u") },
];

const REFERENCE_WORDS = /(?:^| )(?:הזה|זה|שלו|שלה)(?: |$)/u;

function numberSlot(rest) {
  const digits = rest.match(/\d+/g) || [];
  if (digits.length > 1) return { status: "invalid", value: null };
  if (digits.length === 1) {
    const raw = digits[0];
    const value = Number(raw);
    return /^0/.test(raw) || !isValidRazielNavigationNumber(value)
      ? { status: "invalid", value: null }
      : { status: "explicit", value };
  }
  return REFERENCE_WORDS.test(rest) ? { status: "reference", value: null } : { status: "none", value: null };
}

// Returns null unless the WHOLE message is a navigation request (extra clauses fall through to the
// normal Raziel path, which keeps the explanation a person also asked for).
export function parseRazielNavigationRequest(text) {
  const normalized = normalize(text);
  if (!normalized || NEGATION.test(normalized)) return null;
  let rest = stripFiller(normalized);
  if (!rest) return null;

  let leadKind = "none";
  for (const lead of LEADS) {
    const match = rest.match(lead.re);
    if (match) {
      leadKind = lead.kind;
      rest = rest.slice(match[0].length).trim();
      break;
    }
  }
  let link = false;
  const linkMatch = rest.match(LINK_NOUN);
  if (linkMatch) {
    link = true;
    rest = rest.slice(linkMatch[0].length).trim();
  }
  if (leadKind === "none" && !link) return null;
  if (!rest) return null;

  // An explicit link noun ("לינק", "קישור") makes the request unambiguous for every target; otherwise the
  // lead verb decides what may navigate ("תן לי את המספר 73" is an information request, not a link request).
  const mode = link ? "none" : leadKind;
  for (const target of TARGETS) {
    if (target.linkOnly && !link) continue;
    if (!target.allow.includes(mode)) continue;
    if (!target.re.test(rest)) continue;
    const slot = numberSlot(rest);
    if (target.requireReference && slot.status !== "none") continue;
    return Object.freeze({
      version: RAZIEL_NAVIGATION_ACTIONS_VERSION,
      intent: target.intent,
      lead: leadKind,
      link,
      number: Object.freeze(slot),
    });
  }
  return null;
}

// ── Resolution ───────────────────────────────────────────────────────────────────────────────────

const COPY = Object.freeze({
  [RAZIEL_NAVIGATION_INTENT.NUMBER_PAGE]: (n) => ({
    message: `בשמחה — הנה דף המספר ${n}. 🌳`,
    label: `פתח את דף המספר ${n}`,
  }),
  [RAZIEL_NAVIGATION_INTENT.NUMBER_EXPRESSIONS]: (n) => ({
    message: `בשמחה — הביטויים של ${n} מחכים לך בדף המספר שלו. 🌳`,
    label: `הביטויים של ${n}`,
  }),
  [RAZIEL_NAVIGATION_INTENT.RESEARCH_MAP]: (n) => ({
    message: `בשמחה — מפת המחקר של ${n} נמצאת בדף המספר שלו. 🌳`,
    label: `פתח את מפת המחקר של ${n}`,
  }),
});
const WORLD_COPY = Object.freeze({
  message: "בשמחה — הנה העולם. 🌳",
  label: "פתח את העולם",
});

const CLARIFY = Object.freeze({
  missing_number: RAZIEL_NAVIGATION_ASK_NUMBER,
  invalid_number: `אפשר לפתוח דף למספרים בין 1 ל־${RAZIEL_NAVIGATION_NUMBER_MAX.toLocaleString("en-US")}. ${RAZIEL_NAVIGATION_ASK_NUMBER}`,
  ambiguous_number: `דיברנו על כמה מספרים. ${RAZIEL_NAVIGATION_ASK_NUMBER}`,
});

function clarify(reason, intent = RAZIEL_NAVIGATION_INTENT.NUMBER_PAGE) {
  return Object.freeze({
    type: "clarify",
    version: RAZIEL_NAVIGATION_ACTIONS_VERSION,
    intent,
    reason,
    message: CLARIFY[reason],
    model_calls: 0,
  });
}

function navigate(intent, number, numberSource) {
  if (intent === RAZIEL_NAVIGATION_INTENT.WORLD) {
    return Object.freeze({
      type: "navigate",
      version: RAZIEL_NAVIGATION_ACTIONS_VERSION,
      intent,
      href: RAZIEL_NAVIGATION_ROUTES.world(),
      number: null,
      number_source: null,
      ...WORLD_COPY,
      model_calls: 0,
    });
  }
  const copy = COPY[intent](number);
  return Object.freeze({
    type: "navigate",
    version: RAZIEL_NAVIGATION_ACTIONS_VERSION,
    intent,
    href: razielNumberPageHref(number),
    number,
    number_source: numberSource,
    ...copy,
    model_calls: 0,
  });
}

// focus: null | { ambiguous: true } | { number: <verified integer>, source: "conversation" | "surface" | ... }
// A verified focus is supplied by the transport adapter from its own trusted context; it is
// revalidated here (shape + range) so a bad value can never mint a wrong or out-of-range page.
export function resolveRazielNavigationAction({ text = "", request = null, focus = null } = {}) {
  const parsed = request || parseRazielNavigationRequest(text);
  if (!parsed) return null;
  const { intent, number } = parsed;
  if (intent === RAZIEL_NAVIGATION_INTENT.WORLD) return navigate(intent, null, null);
  if (number.status === "invalid") return clarify("invalid_number", intent);
  if (number.status === "explicit") return navigate(intent, number.value, "explicit");

  if (focus && focus.ambiguous === true) return clarify("ambiguous_number", intent);
  const focused = focus && isValidRazielNavigationNumber(focus.number) ? Number(focus.number) : null;
  if (focused != null) return navigate(intent, focused, typeof focus.source === "string" && focus.source ? focus.source : "conversation");
  // No explicit and no verified number: ask. "מפת המחקר" has no owner-approved home without a number, so it is never
  // redirected to the world page; only an explicit request for the world opens it.
  return clarify("missing_number", intent);
}

// Does the message need a verified focus before it can resolve? Lets a transport skip any context
// lookup (history fetch, DB call) when the number is explicit or the request does not need one.
export function razielNavigationNeedsFocus(request) {
  return Boolean(request) && request.intent !== RAZIEL_NAVIGATION_INTENT.WORLD && (request.number.status === "reference" || request.number.status === "none");
}

// After Raziel asked "לאיזה מספר תרצה שאפתח דף?", a bare numeral ("73" / "המספר 73") answers it.
// Anything else is an ordinary Raziel turn. `pendingIntent` comes from the transport's own record of the clarification.
const FOLLOW_UP_NUMBER = /^(?:(?:ה)?מספר )?(\d{1,12})$/u;

export function razielNavigationIsClarification(text) {
  return typeof text === "string" && text.includes(RAZIEL_NAVIGATION_ASK_NUMBER);
}

export function resolveRazielNavigationFollowUp({ text = "", pendingIntent = RAZIEL_NAVIGATION_INTENT.NUMBER_PAGE } = {}) {
  const match = stripFiller(normalize(text)).match(FOLLOW_UP_NUMBER);
  if (!match) return null;
  const intent = Object.values(RAZIEL_NAVIGATION_INTENT).includes(pendingIntent) ? pendingIntent : RAZIEL_NAVIGATION_INTENT.NUMBER_PAGE;
  if (/^0/.test(match[1]) || !isValidRazielNavigationNumber(Number(match[1]))) return clarify("invalid_number", intent);
  return navigate(intent, Number(match[1]), "explicit");
}

// Strict single-subject reading of a *user's own earlier turn* for transports that only hold chat text
// (WhatsApp). A typed numeral is verified by construction; a short Hebrew expression with an explicit gematria/check cue is returned as a
// label that the adapter may resolve through the canonical gematria RPC. Model prose never reaches here.
const SUBJECT_STOP = /(?:^| )(?:דף|עמוד|מספר|מספרים|אתר|לינק|קישור|מפת|ביטויים|מחקר|תודה|שלום|בבקשה|כן|לא)(?: |$)/u;
const NUMBER_TURN = new RegExp(`^(?:(?:מה זה|מהו|מה הוא|ספר על|ספר לי על|מה ידוע על|בדוק|תבדוק|בדקי|תבדקי|חקור|תחקור|חקרי|תחקרי)(?: את)? )?(?:ה)?(?:מספר )?(\\d{1,6})$`, "u");
const EXPRESSION_TURN = /^(?:(?:מה )?(?:ה)?(?:גימטריה|גימטריא|ערך) של|(?:בדוק|תבדוק|בדקי|תבדקי|חשב|תחשב|חשבי|תחשבי|חקור|תחקור)(?: את)?) ([א-ת]{2,}(?: [א-ת]{2,}){0,2})$/u;

export function razielFocusSubjectFromUserText(text) {
  const normalized = stripFiller(normalize(text));
  if (!normalized) return null;
  const numeric = normalized.match(NUMBER_TURN);
  if (numeric && !/^0/.test(numeric[1]) && isValidRazielNavigationNumber(Number(numeric[1]))) {
    return Object.freeze({ kind: "number", value: Number(numeric[1]) });
  }
  const expression = normalized.match(EXPRESSION_TURN);
  if (expression && !SUBJECT_STOP.test(expression[1])) {
    return Object.freeze({ kind: "expression", label: expression[1] });
  }
  return null;
}

// A canonical number-page link that Raziel itself sent earlier in the chat is a verified focus.
export function razielFocusNumberFromCanonicalLink(text, origin) {
  if (typeof text !== "string" || !text) return null;
  let base;
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== "https:") return null;
    base = parsed.origin;
  } catch {
    return null;
  }
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`${escaped}/2029/number/([1-9]\\d{0,5})(?![\\d])`));
  return match ? Number(match[1]) : null;
}

// WhatsApp focus (pure). `turns` is the chat NEWEST FIRST: [{ outgoing: boolean, text: string }]. A focus is valid only from
//   • a canonical page link Raziel itself sent in this stretch, or
//   • the latest CONTINUOUS topic: the newest substantive user message, provided it is a verified subject (a typed numeral, or a
//     short gematria question whose value the adapter resolves through the canonical engine).
// The first substantive user message that is neither a subject nor a navigation request ends the stretch: an older number is never
// reached across an unrelated conversation. Raziel's own prose is never a source. Returns
//   { kind: "number", value } | { kind: "expression", label } | null.
export function razielWhatsappVerifiedFocus(turns, origin) {
  for (const turn of Array.isArray(turns) ? turns : []) {
    const text = typeof turn?.text === "string" ? turn.text : "";
    if (!text) continue;
    if (turn.outgoing) {
      const linked = razielFocusNumberFromCanonicalLink(text, origin);
      if (linked) return Object.freeze({ kind: "number", value: linked });
      continue;
    }
    const content = stripFiller(normalize(text));
    if (!content) continue;                                   // thanks / greetings carry no topic
    const subject = razielFocusSubjectFromUserText(text);
    if (subject) return subject;
    if (parseRazielNavigationRequest(text)) continue;         // a navigation request keeps the same topic
    if (FOLLOW_UP_NUMBER.test(content)) continue;             // a bare numeral answering the clarification
    return null;                                              // unrelated message: the topic ended here
  }
  return null;
}

// WhatsApp wording: the warm sentence, then one tappable https link on its own line.
export function razielNavigationWhatsappText(action, origin) {
  if (!action) return "";
  if (action.type === "clarify") return action.message;
  const url = razielNavigationUrl(action.href, origin);
  return url ? `${action.message}\n${url}` : "";
}

// Site wording: a plain, serializable action the thread renders as a button. Revalidated on render.
export function normalizeRazielNavigationAction(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (value.version !== RAZIEL_NAVIGATION_ACTIONS_VERSION) return null;
  if (!isCanonicalRazielNavigationHref(value.href)) return null;
  const label = typeof value.label === "string" ? value.label.trim().slice(0, 80) : "";
  if (!label) return null;
  const match = value.href.match(NUMBER_HREF);
  return Object.freeze({
    version: RAZIEL_NAVIGATION_ACTIONS_VERSION,
    intent: Object.values(RAZIEL_NAVIGATION_INTENT).includes(value.intent) ? value.intent : RAZIEL_NAVIGATION_INTENT.NUMBER_PAGE,
    href: value.href,
    label,
    number: match ? Number(match[1]) : null,
  });
}

export function razielNavigationSiteAction(action) {
  return action?.type === "navigate" ? normalizeRazielNavigationAction(action) : null;
}
