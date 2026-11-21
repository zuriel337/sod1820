import { BENNETT_SOURCE_MEDIA_2029 } from "./bennettSourceMedia2029.js";
import { calculationRow, focalTrace, renderPostUnitTimeline2029 } from "./postUnitTimelinePreview2029.js";

export const bennettPostId = 5113;
const leadId = "bennett-salt-covenant-unity-20261119";
const originalId = "bennett-original-reading";
const readings = {
  [leadId]: {
    title: "ברית מלח · בנט",
    essence: ["מהמלחיות בבני ברק ועד לניסיון להגיע להסכמה בין יריבים. הפוסט מחבר את שני הרגעים דרך הפסוק על ", "ברית מלח", "."],
    expansion: "הרחבה, חישובים ומקורות",
    hasVideo: Boolean(BENNETT_SOURCE_MEDIA_2029.highlight.src),
  },
  [originalId]: {
    title: "הסיפור המקורי והמקורות",
    essence: ["תיעוד האירוע בבני ברק, המקורות והקשרים לפוסט הבחירות ולים המלח."],
    expansion: "הרחבה ומקורות",
  },
  "bennett-israel-78": {
    title: "מלח ו־78 שנות עצמאות",
    essence: ["בשנת 2026 ישראל מציינת 78 שנות עצמאות. בגימטריה רגילה, ", "מלח = 78", "."],
    expansion: "הרחבה וחישובים",
    dateLabel: "שתי יחידות נוספו ב־",
  },
  "bennett-dead-sea-sequence": {
    title: "מים המלח לבני ברק",
    essence: ["יומיים אחרי פרסום הפוסט על ים המלח, תועד אירוע המלחיות בבני ברק."],
    expansion: "הרחבה ומקורות",
  },
};

const regularValues = new Map([
  ["מלח", 78], ["נפתלי בנט", 631], ["מלך ישראל", 631], ["הבחירות", 631], ["עופר וינטר", 631], ["נס נתניהו", 631],
  ["ברית מלח", 690], ["מלח ברית אלהיך", 756], ["ברית מלח עולם", 836], ["ים המלח", 133],
  ["המלח", 83], ["חמלה", 83], ["מחלה", 83],
]);

const focalPhrases = ["מלח", "נפתלי בנט", "מלך ישראל"];

function formatBennettContent(content, unitId) {
  const doc = content.ownerDocument;
  // Keep old anchors while using one reading disclosure at the unit level.
  for (const disclosure of content.querySelectorAll("details")) {
    const block = doc.createElement("div");
    block.id = disclosure.id;
    if (!block.id) block.removeAttribute("id");
    const summary = disclosure.querySelector(":scope > summary");
    if (summary) {
      const heading = doc.createElement("h3");
      if (summary.id) heading.id = summary.id;
      heading.append(...summary.childNodes);
      summary.replaceWith(heading);
    }
    block.append(...disclosure.childNodes);
    disclosure.replaceWith(block);
  }
  const shown = new Set();
  for (const node of content.querySelectorAll("[data-sod-unit]")) node.removeAttribute("data-sod-unit");
  for (const paragraph of content.querySelectorAll("p")) {
    const text = paragraph.textContent.trim().replace(/\s+/g, " ");
    if (unitId === leadId && !paragraph.id && paragraph.querySelector('time[datetime="2026-11-19"]') && text === "19.11.2026") {
      paragraph.remove();
      continue;
    }
    const [, phrase, digits] = text.match(/^(.+?)\s*=\s*(\d+)$/) || [];
    const value = regularValues.get(phrase);
    if (value == null || value !== Number(digits) || paragraph.querySelector("a[href], [id]")) continue;
    if (shown.has(phrase) && !paragraph.id) { paragraph.remove(); continue; }
    if (shown.has(phrase)) continue;
    const row = calculationRow(doc, phrase, value, "רגיל", false, unitId);
    if (paragraph.id) row.id = paragraph.id;
    paragraph.replaceWith(row);
    shown.add(phrase);
    if (unitId === leadId && focalPhrases.includes(phrase)) row.after(focalTrace(doc, phrase, "רגיל", value));
  }
  if (unitId === leadId && !shown.has("מלח")) {
    const insertBefore = content.querySelector("blockquote") || content.querySelector("h3");
    if (insertBefore) insertBefore.before(
      calculationRow(doc, "מלח", 78, "רגיל", false, unitId),
      focalTrace(doc, "מלח", "רגיל", 78),
    );
  }
  if (unitId === leadId) {
    const media = doc.createElement("div");
    media.dataset.bennettUnitMedia = "";
    content.prepend(media);
  }
}

export function bennettUnitTimelineHtml2029(html) {
  const template = globalThis.document?.createElement("template");
  if (!template) return html;
  template.innerHTML = html;
  const root = template.content;
  const stack = root.querySelector("[data-sod-update-stack]");
  const first = root.getElementById(leadId)?.closest("[data-update-unit]");
  if (!stack || stack.parentNode !== root || first?.parentNode !== stack) return html;

  const doc = root.ownerDocument;
  const holder = doc.createElement("div");
  holder.className = "sod29-update-unit";
  holder.dataset.updateUnit = originalId;
  const meta = doc.createElement("div");
  meta.className = "sod29-update-meta";
  const original = doc.createElement("section");
  original.id = originalId;
  original.dataset.sodUnit = originalId;
  original.dataset.postPresentationUnit = "";
  for (const node of [...root.childNodes]) {
    if (node === stack) continue;
    if (node.nodeType === 1 && node.hasAttribute("data-sod-story-start")) node.remove();
    else original.append(node);
  }
  const research = doc.createElement("div");
  research.dataset.bennettUnitResearch = "";
  original.append(research);
  holder.append(meta, original);
  first.after(holder);

  return renderPostUnitTimeline2029(template, { postId: bennettPostId, readings, mergeBatchDates: true, onContent: formatBennettContent });
}
