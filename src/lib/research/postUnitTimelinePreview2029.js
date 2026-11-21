import { mapUnitReading } from "./mapUnitReading2029.js";
import { numberExpressionFocusHref } from "./numberExpressionFocus.js";

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

function placeTimelineDate(holder, meta, depthContent, { sameDayLabel, dateLabel }, suppressStamp = false) {
  const stamp = meta.querySelector(".sod29-update-added time");
  const event = meta.querySelector(".sod29-update-event");
  if (stamp && !suppressStamp) {
    const line = meta.ownerDocument.createElement("p");
    line.dataset.readingUnitDate = "";
    const matchingEvent = sameDayLabel && event?.textContent.trim().endsWith(stamp.textContent.trim());
    line.append(matchingEvent ? `${sameDayLabel} · ` : dateLabel || "נוסף · ", stamp);
    holder.prepend(line);
    if (matchingEvent) event.remove();
  }
  // Source-day and event-day metadata remain available with the full reading.
  meta.querySelector(".sod29-update-added")?.remove();
  meta.querySelector(".sod29-update-batch")?.remove();
  if (meta.children.length) depthContent.prepend(meta);
  else meta.remove();
}

export function textElement(doc, tag, text) {
  const node = doc.createElement(tag);
  node.textContent = text;
  return node;
}

export function calculationRow(doc, expression, value, method, region = false, prefix = "elections") {
  const row = doc.createElement("p");
  row.className = "reading-calculation-row";
  const methodLabel = method === "קדמי" ? "משולש" : method;
  const link = doc.createElement("a");
  link.href = numberExpressionFocusHref(value, { expression, method });
  link.id = `${prefix}-calculation-${value}-${method}-${expression.replace(/[^\p{L}\p{N}]+/gu, "-")}`;
  link.dataset.readingCalculation = String(value);
  link.setAttribute("aria-haspopup", "dialog");
  link.setAttribute("aria-label", `${expression} = ${value}, ${methodLabel}`);
  const number = textElement(doc, "strong", String(value));
  if (region) number.dataset.sourceHeading = "true";
  link.append(textElement(doc, "b", expression), textElement(doc, "span", "="), number, textElement(doc, "small", methodLabel));
  row.append(link);
  return row;
}

export function focalTrace(doc, phrase, methodKey, stated) {
  const host = doc.createElement("div");
  host.dataset.readingFocalTrace = "";
  host.dataset.puPublished = "";
  host.dataset.gxItem = JSON.stringify({ phrase, methodKey, stated, display: "letters" });
  return host;
}

export function renderPostUnitTimeline2029(template, { postId, readings, onContent, mergeBatchDates = false }) {
  const root = template.content;
  const stack = root.querySelector("[data-sod-update-stack]");
  if (!stack) return template.innerHTML;
  const doc = root.ownerDocument;
  const displayedBatches = new Set();
  let count = 0;
  for (const holder of stack.querySelectorAll(":scope > [data-update-unit]")) {
    const key = holder.dataset.updateUnit;
    const reading = readings[key];
    const unit = root.getElementById(key);
    const meta = holder.querySelector(":scope > .sod29-update-meta");
    if (!reading || !unit || unit.parentElement !== holder || !meta) continue;

    const title = doc.createElement("h2");
    title.textContent = reading.title;
    title.id = `${key}-reading-title`;
    unit.setAttribute("aria-labelledby", title.id);
    unit.dataset.readingTimelineUnit = "";

    const details = doc.createElement("details");
    details.dataset.mapDepth = "";
    const summary = doc.createElement("summary");
    summary.textContent = reading.expansion;
    const content = doc.createElement("div");
    content.dataset.readingUnitContent = "";
    while (unit.firstChild) content.append(unit.firstChild);

    onContent?.(content, key);
    const hasVideo = reading.hasVideo || content.querySelector('video[src]:not([src=""]), video source[src]:not([src=""])')
      || [...content.querySelectorAll("iframe[src]")].some(frame => /^https?:\/\/(?:(?:www\.)?youtube(?:-nocookie)?\.com\/embed\/|player\.vimeo\.com\/video\/)/i.test(frame.getAttribute("src")));
    if (hasVideo) {
      const icon = doc.createElement("span");
      icon.className = "reading-unit-video";
      icon.title = "יש וידאו ביחידה";
      icon.setAttribute("aria-hidden", "true");
      const label = textElement(doc, "span", " · יש וידאו ביחידה");
      label.className = "sod29-sr";
      summary.append(icon, label);
    }
    const batch = mergeBatchDates && holder.hasAttribute("data-update-batch") ? meta.querySelector("time")?.dateTime : null;
    placeTimelineDate(holder, meta, content, reading, batch && displayedBatches.has(batch));
    if (batch) displayedBatches.add(batch);
    const relation = mapUnitReading(postId, key);
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
  if (!count) return template.innerHTML;
  stack.dataset.readingTimeline = "";
  stack.setAttribute("aria-label", "יחידות הפוסט");
  const heading = stack.querySelector(".sod29-update-stack-head");
  if (heading) {
    heading.querySelector("strong").textContent = "יחידות הפוסט";
    heading.querySelector("span").textContent = `${count} יחידות`;
  }
  return template.innerHTML;
}
