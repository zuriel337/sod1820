import { mapLeadId } from "./mapUnitReading2029.js";
import { calculationRow, focalTrace, renderPostUnitTimeline2029, textElement } from "./postUnitTimelinePreview2029.js";

const firstUnitId = "yamin-smol-2026-5787-1237-1158";
const originalUnitId = "elections-original-reading";
export const sharsharId = "sharshar-shoes-66";
export const sharsharSourceIds = ["sharshar-knesset-source", "sharshar-monthly-help-requests"];

const readings = {
  "yamin-smol-2026-5787-1237-1158": {
    title: "ימין ושמאול תפרצי",
    essence: ["הפסוק מישעיהו מתחבר לשנת ", "2026 ולתשפ״ז", " בשתי שיטות חישוב."],
    expansion: "הרחבה ומקורות",
  },
  "knesset-sworn-1234-1011": {
    title: "השבעת הכנסת ה־26",
    essence: ["״ממשלת משיח בן דוד״ = ", "1234", " בגימטריה רגילה."],
    sameDayLabel: "נוסף ביום ההשבעה",
    expansion: "הרחבה וחישובים",
  },
  "election-turnout-777-news-signal": {
    title: "שיעור ההצבעה בבחירות",
    essence: ["", "77.7%", " בדיווח הראשון ב־27.10 · ", "77.9%", " בתוצאה הסופית."],
    expansion: "הרחבה ומקורות",
  },
  [originalUnitId]: {
    title: "רמזי הבחירות לכנסת ה־26",
    essence: ["תאריך הבחירות והחיבורים במספרים, עם עופר וינטר ב־", "631 וב־1820", "."],
    expansion: "הרחבה וחישובים",
  },
  [sharsharId]: {
    title: "שרשר בבחירות",
    essence: ["הנעליים והחיבור ", "בן דוד = 66", ", דבריו על הכנסת ועל בקשות העזרה, וסרטון הכתר."],
    expansion: "הרחבה וסרטונים",
    dateLabel: "שלושה קטעים נוספו ב־",
  },
  "netanyahu-77-mazal": {
    title: "נתניהו בן 77",
    essence: ["", "מזל = 77", " והחיבור ליום הולדתו העברי בשבוע פרשת בראשית."],
    expansion: "הרחבה ומקורות",
  },
};

// In the expanded reading, keep the existing number control on its first
// equation line. Only combine adjacent source blocks that express the same value.
function placeOathNumbersInline(content) {
  for (const number of ["1234", "1437", "1011"]) {
    const mark = content.querySelector(`:scope > p > [data-gem="${number}"]`);
    const standalone = mark?.parentElement;
    const equation = standalone?.nextElementSibling;
    const tail = equation?.lastChild;
    if (!standalone || standalone.id || standalone.textContent.trim() !== number
      || equation?.tagName !== "P" || tail?.nodeType !== 3 || !tail.textContent.trimEnd().endsWith("= " + number)) continue;
    tail.textContent = tail.textContent.trimEnd().slice(0, -number.length);
    equation.append(mark);
    standalone.remove();
  }
}

function rewriteOathCalculation(content) {
  placeOathNumbersInline(content);
  const doc = content.ownerDocument;
  const expressions = [
    ["ממשלת משיח בן דוד", 1234, "רגיל"],
    ["התגלות השכינה", 1234, "רגיל"],
    ["משיח הויה", 1437, "קדמי", "משיח י-הוה — משולש"],
    ["המשיח פועל במעשים", 1011, "רגיל"],
    ["הגאלה תבא בהיסח הדעת", 1011, "רגיל"],
    ["קץ זוהמת הנחש", 1011, "רגיל"],
  ];
  for (const [expression, value, method, sourcePhrase = expression] of expressions) {
    const authored = [...content.querySelectorAll(":scope > p")]
      .find(node => node.textContent.trim().replace(/\s+/g, " ") === `${sourcePhrase} = ${value}`);
    if (!authored && value !== 1437) continue;
    const row = calculationRow(doc, expression, value, method);
    if (authored) {
      if (authored.id) row.id = authored.id;
      authored.replaceWith(row);
    } else content.append(row);
    if (value === 1437) row.after(focalTrace(doc, expression, method, value));
  }
}

function moveSharsharIntoOneUnit(root) {
  const lead = root.getElementById(sharsharId);
  const parts = sharsharSourceIds.map(id => root.getElementById(id));
  const video = root.querySelector('video[poster*="sharshar-crown"]')?.closest("section");
  if (!lead || parts.some(part => !part) || !video || video.closest("[data-update-unit]")) return;

  const doc = root.ownerDocument;
  lead.prepend(textElement(doc, "p", "בסרטונים שלו שרשר מדבר על שירות הציבור ועל בקשות העזרה שהוא מקבל. בפוסט הוא מופיע כמתמודד שפתקו נקרא ״צדק״. אחד הקטעים מתחיל דווקא בנעליים."));
  const notes = [
    ["על השירות בכנסת", "בקטע נוסף שרשר אומר: ״ועכשיו אני הגעתי לכנסת ישראל לשרת את עם ישראל״."],
    ["על בקשות לעזרה", "כשהוא מתאר את הפניות אליו, שרשר אומר שמגיעות אליו 5,000–6,000 בקשות לעזרה כספית מדי חודש. זהו המספר שהוא מסר בסרטון."],
  ];
  parts.forEach((part, index) => {
    const holder = part.closest("[data-update-unit]");
    const heading = textElement(doc, "h3", notes[index][0]);
    const authoredTitle = part.querySelector("h2");
    if (authoredTitle?.id) heading.id = authoredTitle.id;
    const source = [...part.querySelectorAll(":scope > p")].find(node => node.querySelector("a[href]"));
    part.replaceChildren(heading, textElement(doc, "p", notes[index][1]));
    if (source) part.append(source);
    part.removeAttribute("data-sod-unit");
    part.dataset.electionsFormerUnit = "";
    lead.append(part);
    holder?.remove();
  });

  video.removeAttribute("data-sod-unit");
  video.dataset.electionsFormerUnit = "";
  video.dataset.electionsCrownSource = "";
  video.prepend(textElement(doc, "h3", "סרטון הכתר"),
    textElement(doc, "p", "בסרטון נוסף של שרשר הפוסט מחבר בין המספרים שמופיעים על המסך לבין סיפור הבחירות."));
  lead.append(video);
}

function moveOriginalReadingBelowFirst(root) {
  const first = root.getElementById(firstUnitId)?.closest("[data-update-unit]");
  const original = root.querySelector('[data-elections-chain="v1"][data-gem="26"]')?.closest("section");
  if (!first || !original || original.closest("[data-update-unit]")) return;
  // Leave an unrecognized edition intact rather than moving or dropping unknown sections.
  if (!original.querySelector('a[href*="election-timeline26"]') || original.querySelector("section")) return;

  const doc = root.ownerDocument;
  const dateSource = original.querySelector('a[href*="election-timeline26"]');
  const continuation = original.querySelector("[data-elections-continuation]");
  const verse = original.querySelector("blockquote");
  const holder = doc.createElement("div");
  holder.className = "sod29-update-unit";
  holder.dataset.updateUnit = originalUnitId;
  const unit = doc.createElement("section");
  unit.id = originalUnitId;
  unit.dataset.sodUnit = originalUnitId;
  unit.dataset.reviewOnlyUnit = "";
  const meta = doc.createElement("div");
  meta.className = "sod29-update-meta";

  const reading = doc.createElement("div");
  reading.dataset.electionsOriginalNumbers = "";
  reading.append(
    textElement(doc, "h3", "הכנסת ה־26 ותאריך הבחירות"),
    calculationRow(doc, "יהוה", 26, "רגיל", true),
    textElement(doc, "p", "27.10.2026 · ט״ז בחשוון תשפ״ז. בקריאת התאריך 27.10 מתקבל 2710, וממנו הפוסט ממשיך ל־271."),
    calculationRow(doc, "הריון", 271, "רגיל", true),
    calculationRow(doc, "חכמה", 271, "קדמי"),
    textElement(doc, "h3", "בראשית"),
  );
  if (verse) {
    verse.removeAttribute("style");
    reading.append(verse);
  }
  reading.append(
    calculationRow(doc, "בראשית ברא אלהים את השמים ואת הארץ", 2701, "רגיל", true),
    textElement(doc, "h3", "עופר וינטר וציר 631"),
    calculationRow(doc, "עופר וינטר", 1820, "מילוי", true),
    focalTrace(doc, "עופר וינטר", "מילוי", 1820),
    calculationRow(doc, "עופר וינטר", 631, "רגיל", true),
    focalTrace(doc, "עופר וינטר", "רגיל", 631),
    calculationRow(doc, "הבחירות", 631, "רגיל"),
    calculationRow(doc, "מלך ישראל", 631, "רגיל"),
    calculationRow(doc, "נפתלי בנט", 631, "רגיל"),
    calculationRow(doc, "נס נתניהו", 631, "רגיל"),
  );
  if (continuation) {
    const link = textElement(doc, "a", "המשך ציר 631 בפוסט בנט ←");
    link.href = continuation.getAttribute("href");
    reading.append(link);
  }
  const source = textElement(doc, "p", "מקור למועד הבחירות · ");
  source.append(dateSource);
  reading.append(source);
  unit.append(reading);
  holder.append(meta, unit);
  first.after(holder);
  original.remove();
  if (root.querySelector("[data-elections-crown-source]")) root.querySelector("[data-sod-story-start]")?.remove();
}

export function electionsUnitTimelineHtml2029(html) {
  const template = globalThis.document?.createElement("template");
  if (!template) return html;
  template.innerHTML = html;
  const stack = template.content.querySelector("[data-sod-update-stack]");
  if (!stack) return html;
  moveSharsharIntoOneUnit(template.content);
  moveOriginalReadingBelowFirst(template.content);
  return renderPostUnitTimeline2029(template, {
    postId: mapLeadId, readings,
    onContent: (content, key) => { if (key === "knesset-sworn-1234-1011") rewriteOathCalculation(content); },
  });
}
