// Semantic reading design of a Post (ZURIEL 12.11.2026, decisions 2–6 and 9) — PRESENTATION ONLY.
//
// Deterministic rules read the markup the Post already carries and mark blocks with data-sod-* attributes; the stylesheet
// (pages/post2029-semantic.css) turns those into centering, peak moments and the royal / calm finish. Nothing here changes
// a word, a number, a source, an author, a calculation or posts.ai_addition, and nothing calls an AI at view time: AI may
// only SUGGEST units / peak moments while a Post is edited (a suggestion is data the editor accepts; it is not part of this file).
//
// One displayed copy is produced from the stored source HTML:
//   1. blocks get a role (title · peak · number · verse · source · short · prose · media) and a smart alignment;
//   2. proven content updates (postSourceUpdates2029.js) are MOVED — never copied — to the top of the story, newest first,
//      each keeping its own source id (so exact return, hash entry and the update strip keep working);
//   3. a manual per-unit choice (admin, preview-local) outranks the automatic one.
import { PROVEN_POST_SOURCE_UPDATES, orderedSourceUpdates, addedDateLabel, plainDayLabel } from "./postSourceUpdates2029.js";
import { previewUnitIdsFor, previewUnitDefinition } from "./postPreviewUnits2029.js";
import { injectPreviewUnits } from "./postPreviewUnitDom2029.js";

export const SEMANTIC_ROLES = Object.freeze({
  title: "title", peak: "peak", number: "number", verse: "verse", source: "source", short: "short", prose: "prose", media: "media",
});
const CENTER_ROLES = new Set(["title", "peak", "number", "verse", "media"]);

// One legend for the whole Post (decision 5): symbols live in the content, the meaning lives here, once.
export const SEMANTIC_LEGEND = Object.freeze([
  Object.freeze({ key: "added", symbol: "＋", label: "נוסף לפוסט", detail: "מועד הוספת היחידה לפוסט — התאריך המרכזי של עדכון." }),
  Object.freeze({ key: "event", symbol: "◷", label: "זמן האירוע", detail: "היום שבו התרחש האירוע שהיחידה מספרת עליו, כפי שנכתב ביחידה עצמה." }),
  Object.freeze({ key: "source", symbol: "⌁", label: "זמן פרסום המקור", detail: "היום שבו פורסם המקור המצוטט, כפי שנכתב ביחידה עצמה." }),
  Object.freeze({ key: "peak", symbol: "✦", label: "רגע שיא", detail: "יחידה שנבחרה (אוטומטית או בידי עורך) כרגע מרכזי בסיפור. זה סימן עריכה, לא סימן אמת." }),
  Object.freeze({ key: "unchecked", symbol: "◌", label: "לא נבדק במנוע", detail: "המספר או הביטוי טרם נבדקו במנוע החישוב. זה מצב ניטרלי, לא אזהרה." }),
  Object.freeze({ key: "verified", symbol: "✓", label: "חישוב נבדק", detail: "השיטה והתוצאה נבדקו בפועל במנוע. אימות חישוב אינו אימות פרשנות." }),
  Object.freeze({ key: "mismatch", symbol: "≠", label: "אי־התאמה", detail: "הבדיקה במנוע נתנה ערך אחר מהנטען במקור; שני הערכים מוצגים." }),
]);

const NIQQUD = /[ְ-ׇ]/g;
const NUMBERISH = /^[\d\s.,:%·\-–—=+/]+$/;
const SOURCE_LEAD = /^(מקורות?\s*[:·]|מקור הסרטון|לסרטון המקורי|לדבריו בסרטון|המקור והחיבורים|מקור\s*:)/;
const QUOTED = /^[״"“„].{3,}[״"”]\.?$/;

// A display-size number: ≥ 2rem / 32px, including the first value of clamp().
export function isDisplaySize(styleText = "") {
  const match = /font-size\s*:\s*(?:clamp\(\s*)?([\d.]+)\s*(px|rem|em|vw)/i.exec(String(styleText));
  if (!match) return false;
  const value = Number(match[1]), unit = match[2].toLowerCase();
  return unit === "px" ? value >= 32 : unit === "vw" ? value >= 6 : value >= 2;
}

// Pure: one block's role and the alignment the smart default gives it. `authoredCenter` = the stored markup already centers it.
export function classifyText({ tag = "p", text = "", styleText = "", hasMedia = false, authoredCenter = false } = {}) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  const name = String(tag).toLowerCase();
  if (hasMedia && !t) return { role: SEMANTIC_ROLES.media, align: "center" };
  if (/^h[1-6]$/.test(name)) return { role: SEMANTIC_ROLES.title, align: "center" };
  if (!t) return { role: null, align: null };
  if (t.length <= 14 && NUMBERISH.test(t)) {
    return isDisplaySize(styleText) ? { role: SEMANTIC_ROLES.peak, align: "center" } : { role: SEMANTIC_ROLES.number, align: "center" };
  }
  if (name === "blockquote" || (t.match(NIQQUD) || []).length >= 3 && t.length <= 260 || QUOTED.test(t) && t.length <= 170) {
    return { role: SEMANTIC_ROLES.verse, align: "center" };
  }
  if (SOURCE_LEAD.test(t)) return { role: SEMANTIC_ROLES.source, align: "start" };
  if (t.length <= 90) return { role: SEMANTIC_ROLES.short, align: authoredCenter ? "center" : "start" };
  return { role: SEMANTIC_ROLES.prose, align: "start" };
}

export const isCenterRole = (role) => CENTER_ROLES.has(role);

const BLOCK_CHILDREN = "p,div,h1,h2,h3,h4,h5,h6,blockquote,section,article,ul,ol,figure,table,details,pre";
const TEXT_BLOCKS = "h1,h2,h3,h4,h5,h6,p,blockquote,li,div,figure";
const SKIP_INSIDE = "table,pre,svg,[class*='sgx'],[data-sod-skip]";

const inlineCenter = (el) => /text-align\s*:\s*center/i.test(el.getAttribute("style") || "");

function annotateBlocks(root, { voice }) {
  const preserve = voice === "original";
  let peaks = 0;
  for (const el of root.querySelectorAll(TEXT_BLOCKS)) {
    if (el.closest(SKIP_INSIDE)) continue;
    const tag = el.tagName.toLowerCase();
    if (tag === "div" && el.querySelector(BLOCK_CHILDREN)) continue; // a wrapper, not a text block
    if (tag === "figure" && !el.querySelector("img,video,iframe")) continue;
    const hasMedia = !!el.querySelector("img,video,iframe") || tag === "figure";
    const { role, align } = classifyText({
      tag, text: el.textContent, styleText: el.getAttribute("style") || "", hasMedia,
      authoredCenter: inlineCenter(el),
    });
    if (!role) continue;
    el.setAttribute("data-sod-role", role);
    if (role === SEMANTIC_ROLES.peak) peaks += 1;
    // The original WordPress layout is a reference: its own alignment stays, only roles are marked for readability.
    if (preserve) continue;
    el.setAttribute("data-sod-align", align);
    // Smart centering: long readable text starts at the reading edge even when the stored markup centered it.
    // This edits only the displayed copy's alignment; the stored source is untouched.
    if (align === "start" && inlineCenter(el)) el.style.removeProperty("text-align");
  }
  return peaks;
}

// A unit key: the section's own id; else the first existing reading-region id inside it (source-region-…, built by the reading
// projection); else its first authored data marker (data-fz1073-… on Post 5112). Never a new id: the displayed anchors are untouched.
export function unitKeyOf(section, index = 0) {
  if (section.id) return section.id;
  const region = section.querySelector('[id^="source-region-"]');
  if (region) return region.id;
  for (const attr of section.attributes) if (/^data-/.test(attr.name) && !/^data-sod-/.test(attr.name)) return attr.name.slice(5);
  // Last resort: the section's position among the Post's sections. It identifies the unit for this reading only (not an anchor id).
  return section.querySelector("h1,h2,h3,h4,video,[data-gem]") ? `section-${index + 1}` : "";
}
function markUnits(root, voice) {
  let index = 0;
  for (const unit of root.querySelectorAll("section")) {
    const key = unitKeyOf(unit, index++);
    if (!key) continue;
    unit.setAttribute("data-sod-unit", key);
    // One to three display numbers make a peak moment; a unit that is a grid of many number tiles is a table of values, not a peak.
    const peaks = unit.querySelectorAll('[data-sod-role="peak"]').length;
    if (peaks >= 1 && peaks <= 3) unit.setAttribute("data-sod-peak", "auto");
  }
  return voice;
}

export function symbolFor(key) { return SEMANTIC_LEGEND.find((item) => item.key === key)?.symbol || ""; }

function el(doc, tag, attrs = {}, children = []) {
  const node = doc.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) if (value != null) node.setAttribute(name, value);
  for (const child of [].concat(children)) node.append(child instanceof Node ? child : doc.createTextNode(String(child)));
  return node;
}

// Moves each proven unit (never copies) to the top, newest first, and says where the original story begins.
export function placeProvenUpdatesFirst(root, postId, doc = root.ownerDocument || document) {
  const entries = orderedSourceUpdates([...(PROVEN_POST_SOURCE_UPDATES[Number(postId)] || [])])
    .filter((entry) => root.querySelector(`[id="${entry.targetId}"]`));
  if (!entries.length) return 0;
  const stack = el(doc, "div", { class: "sod29-update-stack", "data-sod-update-stack": "true", role: "region", "aria-label": "מה התחדש בפוסט" }, [
    el(doc, "p", { class: "sod29-update-stack-head" }, [el(doc, "strong", {}, "מה התחדש בפוסט"), el(doc, "span", {}, `${entries.length} יחידות · מהחדשה לישנה`)]),
  ]);
  for (const entry of entries) {
    const unit = root.querySelector(`[id="${entry.targetId}"]`);
    if (!unit || stack.contains(unit)) continue;
    const added = addedDateLabel(entry), eventDay = plainDayLabel(entry.eventDate), sourceDay = plainDayLabel(entry.sourceDate);
    const meta = el(doc, "p", { class: "sod29-update-meta" }, []);
    meta.append(el(doc, "span", { class: "sod29-update-added" }, [
      el(doc, "i", { "aria-hidden": "true" }, symbolFor("added")),
      added ? el(doc, "span", {}, ["נוסף ", el(doc, "time", { datetime: entry.updatedAt }, added)]) : el(doc, "span", {}, "נוסף לפוסט"),
    ]));
    if (eventDay) meta.append(el(doc, "span", { class: "sod29-update-event", title: "זמן האירוע" }, [el(doc, "i", { "aria-hidden": "true" }, symbolFor("event")), el(doc, "span", { class: "sod29-sr" }, "זמן האירוע: "), eventDay]));
    if (sourceDay) meta.append(el(doc, "span", { class: "sod29-update-source", title: "זמן פרסום המקור" }, [el(doc, "i", { "aria-hidden": "true" }, symbolFor("source")), el(doc, "span", { class: "sod29-sr" }, "זמן פרסום המקור: "), sourceDay]));
    const holder = el(doc, "div", { class: "sod29-update-unit", "data-update-unit": entry.targetId });
    holder.append(meta);
    unit.parentNode.replaceChild(doc.createComment(`moved:${entry.targetId}`), unit);
    holder.append(unit);
    stack.append(holder);
  }
  const divider = el(doc, "p", { class: "sod29-story-divider", "data-sod-story-start": "true" }, [el(doc, "span", {}, "הסיפור המקורי")]);
  root.insertBefore(divider, root.firstChild);
  root.insertBefore(stack, root.firstChild);
  return entries.length;
}

// A manual per-unit choice outranks the automatic suggestion. choice = { align?: "auto"|"center", peak?: "auto"|"on"|"off", accent?: palette key }.
export const UNIT_ACCENTS = Object.freeze(["auto", "royal", "sapphire", "gold", "calm"]);
export function applyUnitChoice(unit, choice = {}) {
  if (!unit) return;
  const setOrClear = (name, value, auto = "auto") => value && value !== auto ? unit.setAttribute(name, value) : unit.removeAttribute(name);
  setOrClear("data-sod-unit-align", choice.align);
  setOrClear("data-sod-peak-choice", choice.peak);
  setOrClear("data-sod-accent", UNIT_ACCENTS.includes(choice.accent) ? choice.accent : null);
}

// string → string. Outside a browser (no DOM) the stored HTML passes through unchanged.
export function annotatePostSource(html, { postId = null, voice = "unspecified", placeUpdates = true, unitChoices = null } = {}) {
  if (!globalThis.document?.createElement) return String(html || "");
  const template = document.createElement("template");
  template.innerHTML = String(html || "");
  const root = template.content;
  annotateBlocks(root, { voice });
  markUnits(root, voice);
  if (placeUpdates) placeProvenUpdatesFirst(root, postId, document);
  // Preview-only units of the flagship series (flag-gated inside; nothing is injected in any other build).
  if (placeUpdates) injectPreviewUnits(root, postId, document);
  if (unitChoices) for (const [id, choice] of Object.entries(unitChoices)) applyUnitChoice(root.querySelector(`[data-sod-unit="${CSS.escape(id)}"]`), choice);
  return template.innerHTML;
}

// ---- preview-local manual choices (ZURIEL decision 9) ---------------------------------------------------------------
// There is NO authorized persistence path for a per-unit presentation preference today (no column, no table, and a new one needs
// a ZURIEL decision), so a choice is kept in this browser only and is shown to nobody else.
const PREF_KEY = (postId) => `sod2029:post-unit-prefs-preview:${Number(postId)}`;
const listeners = new Set();
export const subscribeUnitChoices = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const notify = (postId) => { for (const fn of listeners) { try { fn(Number(postId)); } catch { /* a listener never breaks a save */ } } };
export function readLocalUnitChoices(postId) {
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem(PREF_KEY(postId)) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
}
// A choice may carry design fields (align / peak / accent), a free MESSAGE with its "main message" flag, and canonical REFERENCES
// ({kind, ref, href, mode}). It is ONE record per (post, unit): the main message is part of the canonical unit, never a second copy
// kept for "עכשיו". Preview-local: this is not a saved publication and no one else sees it.
export function writeLocalUnitChoice(postId, unitId, choice) {
  try {
    const all = readLocalUnitChoices(postId);
    const clean = {};
    for (const [key, value] of Object.entries(choice || {})) {
      if (value == null || value === "auto" || value === false || value === "") continue;
      if (Array.isArray(value) && !value.length) continue;
      clean[key] = value;
    }
    if (clean.primary && !clean.message) delete clean.primary; // a main message needs words
    if (Object.keys(clean).length) all[unitId] = clean; else delete all[unitId];
    globalThis.localStorage?.setItem(PREF_KEY(postId), JSON.stringify(all));
    notify(postId);
    return all;
  } catch { return readLocalUnitChoices(postId); }
}
// The unit's MAIN MESSAGE (the words Zuriel chose as the update's central caption), only when flagged primary.
export function resolveUnitMessage(postId, unitId) {
  const choice = readLocalUnitChoices(postId)[unitId];
  return choice?.primary === true && typeof choice.message === "string" && choice.message.trim() ? choice.message : null;
}

// ONE update event per Post in "עכשיו" (no duplicated Post): the first unit that carries a main message wins — the Post's preview units first
// (newest unit of the Post), then the Post's older pinned anchor. Same canonical local record; nothing is copied.
export function resolveFeaturedUnit(postId, anchor) {
  for (const unitId of [...previewUnitIdsFor(postId), anchor]) {
    if (!unitId) continue;
    const text = resolveUnitMessage(postId, unitId);
    if (text) return { unitId, text, preview: previewUnitDefinition(postId, unitId) };
  }
  return null;
}
export const resolveFeaturedUnitMessage = (postId, anchor) => resolveFeaturedUnit(postId, anchor)?.text || null;
// The pinned central message with the winning unit's main message. A preview unit brings ITS OWN title and numbers (never the older update's
// date or numbers), so the card is one coherent update of the same Post.
export function featuredCentralWithUnit(postId, central) {
  const found = resolveFeaturedUnit(postId, central?.anchor);
  if (!found) return null;
  if (!found.preview) return { ...central, lead: found.text, leadSub: "", fromMainMessage: true };
  const { preview } = found;
  return { ...central, lead: found.text, leadSub: "", fromMainMessage: true, kicker: "יחידה חדשה בפוסט", date: null, fullTitle: preview.title, title: preview.title,
    anchor: preview.id, groups: preview.numbers.map((value) => ({ value, phrases: [], numberOnly: [] })), statement: null };
}
