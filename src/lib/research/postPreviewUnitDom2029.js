// Builds the DISPLAY element of a preview unit (postPreviewUnits2029.js) and places it as the newest update of its Post. Browser only; the
// words are set with textContent, so nothing in the approved text can become markup, and no word is changed. Numbers (3–5 digits) become the
// same clickable [data-gem] controls the rest of the Post uses, so a click opens the existing Number window and returns to this exact unit.
import { parseYaminSmolText, previewUnitsFor, ATTRIBUTION_GROUPS } from "./postPreviewUnits2029.js";

const NUMBER = /(?<![\d.])\d{3,5}(?![\d.])/g;

function el(doc, tag, attrs = {}, text) {
  const node = doc.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) if (value != null) node.setAttribute(name, value);
  if (text != null) node.textContent = text;
  return node;
}
function gem(doc, value, extraClass = "") {
  const attrs = { "data-gem": String(value), role: "button", tabindex: "0", "aria-label": `בדוק את המספר ${value}` };
  if (extraClass) attrs.class = extraClass;
  const span = el(doc, "span", attrs, String(value));
  return span;
}
// text with its numbers made clickable (the surrounding words are untouched)
function withNumbers(doc, node, text) {
  let last = 0;
  for (const match of text.matchAll(NUMBER)) {
    if (match.index > last) node.append(doc.createTextNode(text.slice(last, match.index)));
    node.append(gem(doc, match[0]));
    last = match.index + match[0].length;
  }
  if (last < text.length) node.append(doc.createTextNode(text.slice(last)));
  return node;
}

// number of a peak -> id of its (single) engine claim in YAMIN_SMOL_CLAIMS
const PEAK_TRACE_CLAIMS = Object.freeze({ 2026: "c2026", 5787: "c5787" });

export function buildPreviewUnitElement(doc, unit) {
  const blocks = parseYaminSmolText();
  const section = el(doc, "section", { id: unit.id, class: "sod29-pu", "data-sod-unit": unit.id, "data-preview-unit": "true", "data-sod-peak": "auto", "aria-labelledby": `${unit.id}-title`, "data-series": unit.seriesKey, "data-post-id": String(unit.postId) });
  const head = el(doc, "header", { class: "sod29-pu-head" });
  const body = el(doc, "div", { class: "sod29-pu-body" });
  section.append(el(doc, "div", { "data-pu-host": "bar", class: "sod29-pu-host sod29-pu-host-bar" }), head, body);
  let group = null, table = null, groupId = null;
  const labelOf = (id) => (ATTRIBUTION_GROUPS.find((g) => g.identity === id) || {}).label;
  for (const block of blocks) {
    if (block.kind === "title") { head.append(el(doc, "h2", { id: `${unit.id}-title`, "data-sod-role": "title", "data-sod-align": "center" }, block.text)); continue; }
    if (block.kind === "subtitle") { head.append(el(doc, "p", { class: "sod29-pu-subtitle", "data-sod-role": "title", "data-sod-align": "center" }, block.text)); continue; }
    if (block.kind === "numbers") {
      const p = el(doc, "p", { class: "sod29-pu-numbers", "data-sod-role": "unit-numbers", "data-sod-align": "center", "aria-label": "המספרים של היחידה" });
      block.numbers.forEach((n, i) => { if (i) p.append(el(doc, "i", { "aria-hidden": "true" }, "·")); p.append(gem(doc, n, "r29-coin")); }); // the existing Royal coin primitive; the "·" separators stay in the text and are hidden by CSS
      head.append(p); continue;
    }
    if (block.kind === "kicker") { head.append(el(doc, "p", { class: "sod29-pu-kicker", "data-sod-align": "center" }, block.text)); continue; }
    if (block.kind === "rule") { group = null; groupId = null; table = null; body.append(el(doc, "hr", { class: "sod29-pu-rule", "aria-hidden": "true" })); continue; }
    // attribution groups wrap consecutive blocks of one identity (and name that identity once, at the start)
    if (block.group && block.group !== groupId) {
      groupId = block.group;
      group = el(doc, "div", { class: "sod29-pu-group", "data-source-identity": groupId });
      group.append(el(doc, "small", { class: "sod29-pu-group-label" }, labelOf(groupId) || groupId));
      body.append(group);
    } else if (!block.group) { group = null; groupId = null; }
    const host = group || body;
    if (block.kind === "row") {
      if (!table) { table = el(doc, "table", { class: "sod29-pu-table" }); host.append(table); table.append(doc.createElement("tbody")); }
      const tr = doc.createElement("tr");
      block.cells.forEach((cell, i) => { const c = el(doc, block.head ? "th" : "td", { scope: block.head ? "col" : undefined, "data-sod-role": "short" }); withNumbers(doc, c, cell); tr.append(c); if (i === 0 && !block.head) c.setAttribute("scope", "row"); });
      table.firstChild.append(tr); continue;
    }
    table = null;
    if (block.kind === "heading") { host.append(el(doc, "h3", { "data-sod-role": "title", "data-sod-align": "center", class: "sod29-pu-h3" }, block.text)); continue; }
    if (block.kind === "closing") { host.append(el(doc, "p", { class: "sod29-pu-closing", "data-sod-role": "peak-text", "data-sod-align": "center" }, block.text)); continue; }
    if (block.kind === "verse") { host.append(el(doc, "blockquote", { class: "sod29-pu-verse", "data-sod-role": "verse", "data-sod-align": "center", "data-quote-identity": block.identity }, block.text)); continue; }
    if (block.kind === "peak") { const p = el(doc, "p", { "data-sod-role": "peak", "data-sod-align": "center" }); p.append(gem(doc, block.number)); host.append(p);
      // The canonical method trace of a focal number opens right under it (a React host, filled by PreviewUnitExtras2029; empty until the reader asks).
      const traceClaim = PEAK_TRACE_CLAIMS[block.number];
      if (traceClaim) host.append(el(doc, "div", { "data-pu-trace": traceClaim, class: "sod29-pu-host sod29-pu-trace-host" }));
      continue; }
    if (block.kind === "claim") { host.append(withNumbers(doc, el(doc, "p", { class: "sod29-pu-claim", "data-sod-role": "short", "data-sod-align": "center" }), block.text)); continue; }
    const p = el(doc, "p", { "data-sod-role": "prose", "data-sod-align": "start" });
    host.append(withNumbers(doc, p, block.text));
  }
  // hosts for the React parts (share, images, public sources, engine panel): created empty, filled by PreviewUnitExtras2029
  const footer = el(doc, "footer", { class: "sod29-pu-foot" });
  for (const name of ["images", "sources", "engine", "share"]) footer.append(el(doc, "div", { "data-pu-host": name, class: `sod29-pu-host sod29-pu-host-${name}` }));
  section.append(footer);
  return section;
}

// Places each preview unit of the Post as the NEWEST unit: first in the update stack (or first in the source when no stack exists).
export function injectPreviewUnits(root, postId, doc = root.ownerDocument || document) {
  const units = previewUnitsFor(postId);
  if (!units.length) return 0;
  let placed = 0;
  for (const unit of units) {
    if (root.querySelector(`[id="${unit.id}"]`)) continue; // never twice: the same identity is one unit
    const element = buildPreviewUnitElement(doc, unit);
    const holder = el(doc, "div", { class: "sod29-update-unit", "data-update-unit": unit.id, "data-preview-holder": "true" });
    const meta = el(doc, "p", { class: "sod29-update-meta" });
    meta.append(el(doc, "span", { class: "sod29-update-added sod29-pu-badge" }, "יחידה חדשה · הדגמה בפריוויו"));
    holder.append(meta, element);
    const stack = root.querySelector("[data-sod-update-stack]");
    if (stack) {
      const head = stack.querySelector(".sod29-update-stack-head");
      stack.insertBefore(holder, head ? head.nextSibling : stack.firstChild);
      const count = head && head.querySelector("span");
      if (count) count.textContent = `${stack.querySelectorAll("[data-update-unit]").length} יחידות · מהחדשה לישנה`;
    } else {
      const stackNew = el(doc, "div", { class: "sod29-update-stack", "data-sod-update-stack": "true", role: "region", "aria-label": "מה התחדש בפוסט" });
      stackNew.append(holder);
      root.insertBefore(stackNew, root.firstChild);
    }
    placed += 1;
  }
  return placed;
}
