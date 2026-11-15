// The browser half of the continuous unit editor: draws a document (docItems) into ONE contenteditable and reads it back into items. Text is only ever
// set with textContent, pasted content is taken as plain text, and protected chips are atomic (contenteditable=false) and carry only references.
import { docItems, DOC_KIND_LABEL } from "../../lib/research/unitDocument2029.js";

const el = (doc, tag, attrs = {}, text) => {
  const node = doc.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) if (value != null) node.setAttribute(name, value);
  if (text != null) node.textContent = text;
  return node;
};

export function renderDoc(root, blocks, doc = root.ownerDocument) {
  const byId = new Map(blocks.map((block) => [block.id, block]));
  const nodes = [];
  for (const item of docItems(blocks)) {
    if (item.t === "chip") {
      const chip = el(doc, "div", { class: "sod29-ude-chip", contenteditable: "false", "data-refs": item.refs.join(","), "data-chip": item.cls, role: "group", "aria-label": `מקור מוגן: ${item.label}` });
      chip.append(el(doc, "div", { class: "sod29-ude-chip-head" }, `🔒 מקור מוגן · ${item.label} — לא ניתן לעריכה`));
      for (const ref of item.refs) { const b = byId.get(ref); chip.append(el(doc, "p", { class: "sod29-ude-line", "data-kind": b.kind }, b.kind === "row" ? b.text.replace("|", " · ") : b.text)); }
      nodes.push(chip);
    } else if (item.t === "rule") nodes.push(el(doc, "hr", { class: "sod29-ude-rule", contenteditable: "false", "data-b": item.ref }));
    else nodes.push(el(doc, "p", { class: "sod29-ude-p", "data-kind": item.kind, "data-b": item.ref || "", title: DOC_KIND_LABEL[item.kind] }, item.text));
  }
  root.replaceChildren(...nodes);
}

function textOf(node) {
  let out = "";
  const walk = (parent) => {
    for (const child of parent.childNodes) {
      if (child.nodeType === 3) out += child.nodeValue;
      else if (child.nodeName === "BR") out += "\n";
      else if (child.nodeType === 1) {
        const block = /^(P|DIV|H\d|LI)$/.test(child.nodeName);
        if (block && out && !out.endsWith("\n")) out += "\n";
        walk(child);
        if (block && !out.endsWith("\n")) out += "\n";
      }
    }
  };
  walk(node);
  return out.replace(/ /g, " ").replace(/\n+$/, "");
}

export function readDoc(root) {
  const items = [];
  const seen = new Set();
  const visit = (parent) => {
    for (const child of parent.childNodes) {
      if (child.nodeType === 1 && child.hasAttribute("data-refs")) { items.push({ t: "chip", refs: child.getAttribute("data-refs").split(",").filter(Boolean), cls: child.getAttribute("data-chip") }); continue; }
      if (child.nodeType === 1 && child.nodeName === "HR") { items.push({ t: "rule", ref: child.getAttribute("data-b") || null }); continue; }
      if (child.nodeType === 1 && child.querySelector("[data-refs]")) { visit(child); continue; }
      const own = child.nodeType === 1 ? child : null;
      let ref = own?.getAttribute("data-b") || null;
      let kind = own?.getAttribute("data-kind") || "p";
      if (ref && seen.has(ref)) { ref = null; kind = "p"; }          // a split paragraph: the browser copied the reference — the new half is a new paragraph
      if (ref) seen.add(ref);
      const text = child.nodeType === 3 ? child.nodeValue : textOf(child);
      if (child.nodeType === 3 && !text.trim()) continue;
      items.push({ t: "text", ref, kind, text });
    }
  };
  visit(root);
  return items;
}

export const paragraphAt = (root, node) => { let n = node; while (n && n !== root) { if (n.parentNode === root) return n.nodeType === 1 && !n.hasAttribute("data-refs") && n.nodeName !== "HR" ? n : null; n = n.parentNode; } return null; };
export const rangeTouchesChip = (root, range) => { if (range.collapsed) return false; const frag = range.cloneContents(); return Boolean(frag.querySelector && frag.querySelector("[data-refs]")); };

// Insert plain text at the caret as paragraphs (never HTML); returns false when there is no editable caret.
export function insertPlainText(root, text) {
  const sel = root.ownerDocument.getSelection();
  if (!sel || !sel.rangeCount) return false;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.startContainer)) return false;
  if (!range.collapsed) range.deleteContents();
  let p = paragraphAt(root, range.startContainer);
  const doc = root.ownerDocument;
  if (!p) { p = el(doc, "p", { class: "sod29-ude-p", "data-kind": "p", "data-b": "" }); root.append(p); range.selectNodeContents(p); range.collapse(true); }
  const pre = doc.createRange(); pre.selectNodeContents(p); pre.setEnd(range.startContainer, range.startOffset);
  const post = doc.createRange(); post.selectNodeContents(p); post.setStart(range.endContainer, range.endOffset);
  const before = pre.toString(), after = post.toString();
  const lines = String(text).replace(/\r\n?/g, "\n").split("\n");
  p.textContent = before + lines[0] + (lines.length === 1 ? after : "");
  let last = p;
  for (let i = 1; i < lines.length; i += 1) {
    const next = el(doc, "p", { class: "sod29-ude-p", "data-kind": "p", "data-b": "" }, lines[i] + (i === lines.length - 1 ? after : ""));
    last.after(next); last = next;
  }
  const caret = doc.createRange();
  const tail = last.firstChild || last;
  const offset = last.firstChild ? Math.max(0, (last.textContent.length) - (lines.length === 1 ? after.length : after.length)) : 0;
  try { caret.setStart(tail, Math.min(offset, tail.nodeType === 3 ? tail.nodeValue.length : 0)); caret.collapse(true); sel.removeAllRanges(); sel.addRange(caret); } catch { /* caret placement is a convenience */ }
  return true;
}
