import { mapLeadId, mapUnitReading } from "./mapUnitReading2029.js";

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
  "sharshar-shoes-66": {
    title: "שרשר והנעליים",
    essence: ["״יש לי שישים ושש זוגות״ · ", "בן דוד = 66"],
    expansion: "הרחבה ומקורות",
  },
  "sharshar-knesset-source": {
    title: "שרשר בכנסת",
    essence: ["״הגעתי לכנסת ישראל לשרת את עם ישראל״."],
    expansion: "למקור ולפרטים",
  },
  "sharshar-monthly-help-requests": {
    title: "בקשות לעזרה",
    essence: ["שרשר מספר על ", "5,000–6,000", " בקשות לעזרה בחודש."],
    expansion: "למקור ולפרטים",
  },
  "netanyahu-77-mazal": {
    title: "נתניהו בן 77",
    essence: ["", "מזל = 77", " והחיבור ליום הולדתו העברי בשבוע פרשת בראשית."],
    expansion: "הרחבה ומקורות",
  },
};

function renderEssence(doc, parts) {
  const essence = doc.createElement("p");
  essence.dataset.mapEssence = "";
  parts.forEach((part, index) => {
    if (index % 2 === 0) essence.append(part);
    else {
      const emphasis = doc.createElement("strong");
      emphasis.textContent = part;
      essence.append(emphasis);
    }
  });
  return essence;
}

function placeTimelineDate(holder, meta, depthContent, previousBatch, sameDayLabel) {
  const stamp = meta.querySelector(".sod29-update-added time");
  const event = meta.querySelector(".sod29-update-event");
  const exactBatch = holder.hasAttribute("data-update-batch") ? stamp?.getAttribute("datetime") : null;
  const shared = Boolean(exactBatch && exactBatch === previousBatch);
  if (stamp && !shared) {
    const line = meta.ownerDocument.createElement("p");
    line.dataset.electionsUnitDate = "";
    const matchingEvent = sameDayLabel && event?.textContent.trim().endsWith(stamp.textContent.trim());
    line.append(matchingEvent ? `${sameDayLabel} · ` : exactBatch ? "נוספו ב־" : "נוסף · ", stamp);
    holder.prepend(line);
    if (matchingEvent) event.remove();
  }
  // Source-day and event-day metadata remain available with the full reading.
  meta.querySelector(".sod29-update-added")?.remove();
  meta.querySelector(".sod29-update-batch")?.remove();
  if (meta.children.length) depthContent.prepend(meta);
  else meta.remove();
  return exactBatch;
}

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

export function electionsUnitTimelineHtml2029(html) {
  const template = globalThis.document?.createElement("template");
  if (!template) return html;
  template.innerHTML = html;
  const stack = template.content.querySelector("[data-sod-update-stack]");
  if (!stack) return html;
  const doc = template.content.ownerDocument;
  let previousBatch = null;
  let count = 0;
  for (const holder of stack.querySelectorAll(":scope > [data-update-unit]")) {
    const key = holder.dataset.updateUnit;
    const reading = readings[key];
    const unit = template.content.getElementById(key);
    const meta = holder.querySelector(":scope > .sod29-update-meta");
    if (!reading || !unit || unit.parentElement !== holder || !meta) {
      previousBatch = null;
      continue;
    }

    const title = doc.createElement("h2");
    title.textContent = reading.title;
    title.id = `${key}-reading-title`;
    unit.setAttribute("aria-labelledby", title.id);
    unit.dataset.electionsTimelineUnit = "";

    const details = doc.createElement("details");
    details.dataset.mapDepth = "";
    const summary = doc.createElement("summary");
    summary.textContent = reading.expansion;
    const content = doc.createElement("div");
    content.dataset.electionsUnitContent = "";
    while (unit.firstChild) content.append(unit.firstChild);

    if (reading.sameDayLabel) placeOathNumbersInline(content);
    previousBatch = placeTimelineDate(holder, meta, content, previousBatch, reading.sameDayLabel);
    const relation = mapUnitReading(mapLeadId, key);
    if (relation) {
      const link = doc.createElement("a");
      link.dataset.mapRelated = "";
      link.href = relation.href;
      link.textContent = relation.relatedLabel + " ←";
      content.append(link);
    }
    details.append(summary, content);
    unit.append(title, renderEssence(doc, reading.essence), details);
    count += 1;
  }
  if (!count) return html;
  stack.dataset.electionsTimeline = "";
  return template.innerHTML;
}
