// RAZIEL_SITE_LINK_ANSWERS_V1 (5.11.2026)
//
// Deterministic "where is X?" answers over the single SITE_LINK_REGISTRY. Runs only AFTER the canonical
// navigation grammar (razielNavigationActions.js) returned no request, so number pages / the world keep their
// pinned behaviour. No model, database or network; a URL exists only if it is a registry entry.
// Both transports load this module: the 2029 site (razielSessionRequest2029) and wa-raziel.

import { SITE_LINK_BY_ID, SITE_LINK_GROUPS, SITE_LINK_REGISTRY, siteLinkUrl } from "./siteLinkRegistry.js";

export const RAZIEL_SITE_LINKS_VERSION = "raziel-site-link-answers-v1";

function normalize(text) {
  if (text == null) return "";
  return String(text)
    .normalize("NFC")
    .replace(/[֑-ׇ]/g, "")
    .replace(/\p{Extended_Pictographic}/gu, " ")
    .replace(/[׳״'"`’‘“”]/g, "")
    .replace(/[־‐-―-]/g, " ")
    .replace(/[?!.,;:()[\]{}…<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .slice(0, 200);
}

const FILLER = new Set(["בבקשה", "נא", "אנא", "תודה", "רזיאל", "באתר", "שלנו", "שלכם", "לי", "לנו", "אשמח", "אפשר", "טוב", "נו", "אוקי", "אוקיי", "סבבה", "היי", "שלום", "אז", "עכשיו", "כעת", "מיד", "ישר", "פשוט", "ממש", "יפה", "מעולה", "כן"]);
const NEGATION = /(?:^| )(?:לא|בלי)(?: |$)|(?:^| )אל ת/u;
// "איפה (אפשר) ..." / "איפה נמצא ..." / "איפה אפשר להצטרף ל..."
const WHERE_LEAD = /^(?:איפה|היכן|מאיפה|מהיכן)(?: (?:נמצא(?:ת|ים|ות)?|למצוא|אני מוצא|מוצאים|עוד|זה|זו|הוא|היא))*(?: (?:להצטרף|להירשם))?(?: |$)/u;
// "מה הלינק/הקישור (ל|אל|של) ..."
const ASK_LINK_LEAD = /^מה (?:ה)?(?:לינק|קישור)(?: (?:אל|של))?(?: |$)/u;
// "(תן לי) (את) הלינק/קישור (ל|אל|של) ..." and "פתח/קח אותי ..." — an explicit link noun or a move verb.
const LINK_LEAD = /^(?:(?:תן|תני|שלח|שלחי|תשלח|תשלחי|הבא|הראה|הראי|תראה|תראי|תביא|תביאי|אני רוצה|רוצה|צריך|צריכה) )?(?:את )?(?:ה)?(?:לינק|קישור|קישורית)(?: (?:אל|עבור|של))?(?: |$)/u;
const MOVE_LEAD = /^(?:אני )?(?:(?:תפתח|תפתחי|פתח|פתחי|לפתוח|רוצה לפתוח) |(?:קח|קחי|תיקח|תיקחי|הובל|הובילי|תוביל|תובילי|העבר|העבירי) אותי )/u;

let index = null;
function forms(text) {
  const out = new Set();
  const value = String(text || "").trim().replace(/^(?:את|אל|של) /u, "");
  out.add(value);
  if (/^[לב]/u.test(value) && value.length > 3) out.add(value.slice(1));
  for (const form of [...out]) if (form.startsWith("ה") && form.length > 3) out.add(form.slice(1));
  return out;
}
function aliasIndex() {
  if (index) return index;
  index = new Map();
  for (const item of SITE_LINK_REGISTRY) {
    for (const alias of item.aliases) {
      for (const form of forms(normalize(alias))) {
        if (!index.has(form)) index.set(form, new Set());
        index.get(form).add(item.id);
      }
    }
  }
  return index;
}

function stripFiller(text) {
  return text.split(" ").filter((token) => token && !FILLER.has(token)).join(" ");
}

// Returns null unless the WHOLE message asks for a registry link.
export function parseRazielSiteLinkRequest(text) {
  const normalized = normalize(text);
  if (!normalized || NEGATION.test(normalized)) return null;
  const rest = stripFiller(normalized);
  let tail = null;
  for (const lead of [WHERE_LEAD, ASK_LINK_LEAD, LINK_LEAD, MOVE_LEAD]) {
    const match = rest.match(lead);
    if (match) { tail = rest.slice(match[0].length).trim(); break; }
  }
  if (!tail) return null;
  const spoken = tail.replace(/ ?(?:הזה|הזאת)$/u, "");
  let ids = null;
  for (const form of forms(spoken)) if (SITE_LINK_GROUPS[form]) { ids = [...SITE_LINK_GROUPS[form]]; break; }
  if (!ids) {
    for (const form of forms(spoken)) {
      const hit = aliasIndex().get(form);
      if (hit && hit.size === 1) { ids = [...hit]; break; }
    }
  }
  // A number page needs a number: that stays with the canonical navigation grammar.
  if (!ids || (ids.includes("number") && !WHERE_LEAD.test(rest))) return null;
  return Object.freeze({ version: RAZIEL_SITE_LINKS_VERSION, ids: Object.freeze(ids) });
}

const LINE = Object.freeze({
  open: (item, url) => `${item.label}:\n${url}`,
  account: (item, url) => `${item.label} (נדרשת כניסה לחשבון):\n${url}`,
  building: (item) => `${item.label} — נמצא בבנייה כרגע ועדיין אינו פתוח לציבור.`,
  section: (item) => `${item.label} — הטופס נמצא בתחתית כל עמוד באתר, כשההרשמה פעילה.`,
});

export function resolveRazielSiteLinkAnswer({ text = "", request = null } = {}) {
  const parsed = request || parseRazielSiteLinkRequest(text);
  if (!parsed) return null;
  const items = parsed.ids.map((id) => SITE_LINK_BY_ID[id]).filter(Boolean);
  if (!items.length) return null;
  const lines = items.map((item) => {
    const url = siteLinkUrl(item);
    if ((item.availability === "open" || item.availability === "account") && !url) return null;
    return LINE[item.availability](item, url);
  });
  if (lines.some((line) => !line)) return null;
  return Object.freeze({
    type: "link_answer",
    version: RAZIEL_SITE_LINKS_VERSION,
    intent: "site_link",
    link_ids: Object.freeze(items.map((item) => item.id)),
    message: `בשמחה — הנה ${items.length > 1 ? "הקישורים" : "הקישור"}:\n${lines.join("\n")}`,
    model_calls: 0,
  });
}

export function razielSiteLinkWhatsappText(action) {
  return action?.type === "link_answer" ? action.message : "";
}
