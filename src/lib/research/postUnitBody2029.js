// The editable BODY of a flagship unit — a PURE module over the existing structured unit representation (parseYaminSmolText blocks). A DRAFT layer in the
// Preview only. Three kinds of content (ZURIEL 16.11.2026), never collapsed into one:
//   · SOURCE — an external author's words and verses/quotations (`isSourceBlock`). Their wording is kept whole and is never rewritten (by a person or by AI).
//     The representation may be MOVED, aligned, or REMOVED FROM THE UNIT on an explicit approval (`{ref, removed:true}`); the canonical source itself is untouched.
//   · RESEARCH DATA — the numbers, the focal numbers, equations and table rows, and the gematria items added by the editor. Editable, replaceable, movable; every
//     calculation claim is checked by the canonical engine elsewhere (the gap between a source's claim and the engine's result is kept, never overwritten).
//     A number is NOT locked just because it sits inside an attribution group.
//   · EDITORIAL — titles, explanations, interpretations, messages: free editing.
// Gematria items store ONLY a reference ({phrase, methodKey, display, stated?, by?}) — never a computed value, letter breakdown, HTML or CSS: the shared canonical
// components rebuild them from engine data every time they are shown.
// The stored draft is a list of REFERENCES (`{ref}` / `{ref,text}` / `{ref,removed}` / `{add,kind,text}` / `{add,kind:"gematria",item}`) and lives in this browser only
// (no canonical unit store). Text is plain text only (rendered with textContent). `diffBody` produces the exact proposed change.
import { parseYaminSmolText } from "./postPreviewUnits2029.js";

export const TEXT_KINDS = Object.freeze(["title", "subtitle", "kicker", "heading", "p", "closing"]);
export const DATA_KINDS = Object.freeze(["numbers", "peak", "claim", "row"]);
export const EDITABLE_KINDS = Object.freeze([...TEXT_KINDS]);                 // kinds a block may be RETYPED to/from (data kinds keep their kind)
export const ADDABLE_KINDS = Object.freeze([["p", "פסקה"], ["heading", "כותרת מקטע"], ["subtitle", "כותרת משנה"], ["closing", "שורת מסר / סיום"]]);
export const KIND_LABEL = Object.freeze({ title: "כותרת", subtitle: "כותרת משנה", kicker: "שורת פתיחה", heading: "כותרת מקטע", p: "פסקה", closing: "שורת סיום", verse: "פסוק / ציטוט",
  numbers: "ארבעת המספרים", peak: "מספר בולט", claim: "משוואה", row: "שורת טבלה", rule: "מפריד", gematria: "גימטריה" });
export const MAX_TEXT = 1500;
export const ALIGNS = Object.freeze(["start", "center", "end"]);              // RTL: start = right, end = left
export const ALIGN_LABEL = Object.freeze({ start: "ימין", center: "מרכז", end: "שמאל" });
export const GX_DISPLAYS = Object.freeze({ peak: "מספר בולט", full: "פירוק מלא", letters: "פירוק אותיות ומילים", compact: "תצוגה מצומצמת" });
export const GX_IDENTITIES = Object.freeze(["yaniv-levi", "shachar-kandro", "editorial"]);

const SOURCE_IDENTITIES = Object.freeze(["yaniv-levi", "shachar-kandro", "scripture", "baal-hasulam"]);
// an external author's words (inside a writer's attribution group) or a verse / quotation: the wording is protected
export const isSourceBlock = (block) => block.kind === "verse" || (Boolean(block.group) && SOURCE_IDENTITIES.includes(block.group) && block.kind === "p");
export const isLockedBlock = isSourceBlock;
export const isDataBlock = (block) => DATA_KINDS.includes(block.kind) || block.kind === "gematria";
export const cleanBodyText = (value) => String(value ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replace(/\s+\n/g, "\n").trim().slice(0, MAX_TEXT);

// A data line inside a writer's attribution group (e.g. "X = 1237" in Shachar's group) may be EDITED (ZURIEL 15.11: the data is editable), but an edited line is never
// shown as that writer's words: it leaves the writer's group, becomes editorial wording, and keeps a link to the writer's untouched original (`editedFrom`) so the
// before and after stay visible. Editing back to the original text restores the attribution (nothing is lost).
function separatedFromSource(block, nextText) {
  const original = block.editedFrom ? block.editedFrom.text : block.text;
  const identity = block.editedFrom ? block.editedFrom.identity : block.identity;
  const group = block.editedFrom ? block.editedFrom.group : block.group;
  if (!group || !SOURCE_IDENTITIES.includes(group)) return null;     // not a writer's line: nothing to separate
  if (nextText === original) return { restored: true, identity, group, original };
  return { restored: false, identity, group, original };
}
function withAttribution(block, nextText, fields) {
  const sep = separatedFromSource(block, nextText);
  if (!sep) return { ...block, ...fields, text: nextText };
  if (sep.restored) { const { editedFrom, ...rest } = block; return { ...rest, ...fields, text: nextText, identity: sep.identity, group: sep.group }; }
  const { group, ...rest } = block;
  return { ...rest, ...fields, text: nextText, identity: "editorial", editedFrom: { identity: sep.identity, group: sep.group, text: sep.original } };
}

// the text of a data block, validated and its structured fields re-derived (null = not a valid line of that kind)
export function refreshData(block, text) {
  const clean = cleanBodyText(text);
  if (!clean) return null;
  if (block.kind === "numbers") { const parts = clean.split(/\s*·\s*/); return parts.length && parts.every((p) => /^\d{1,6}$/.test(p)) ? withAttribution(block, clean, { numbers: parts.map(Number) }) : null; }
  if (block.kind === "peak") return /^\d{1,6}$/.test(clean) ? withAttribution(block, clean, { number: Number(clean) }) : null;
  if (block.kind === "row") return withAttribution(block, clean, { cells: clean.split("|").map((c) => c.trim()) });
  if (block.kind === "claim") return withAttribution(block, clean, {});
  return null;
}

// the engine's own method keys are Hebrew names ("רגיל", "אותיות אחרי"): letters, digits, space, underscore, hyphen, geresh — never markup, quotes, brackets or "|"
// "<kind>:<id>" — e.g. "channel_updates:6d40048f-…" (a published source message) or "unit-block:b12" (a block of the unit being edited)
export const SOURCE_REF = /^[a-z][a-z0-9_-]{1,40}:[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/;
const METHOD_KEY = /^[\p{L}\p{N}][\p{L}\p{N} _\-'׳]{0,59}$/u;
// the reference to ONE gematria finding, cleaned (no computed value is ever stored)
export function cleanGematriaItem(item) {
  if (!item || typeof item !== "object") return null;
  const phrase = cleanBodyText(item.phrase).replace(/\s+/g, " ").slice(0, 200);
  const methodKey = String(item.methodKey ?? "").trim();
  const display = Object.keys(GX_DISPLAYS).includes(item.display) ? item.display : null;
  if (!phrase || !METHOD_KEY.test(methodKey) || !display) return null;
  const out = { phrase, methodKey, display };
  const stated = item.stated == null || item.stated === "" ? null : Number(item.stated);
  if (stated != null) { if (!Number.isSafeInteger(stated) || stated < 0) return null; out.stated = stated; }
  if (item.by) { if (!GX_IDENTITIES.includes(item.by)) return null; out.by = item.by; }
  // the exact place the phrase was taken from (a block of this unit or a published source): kept as a reference, never as content
  if (item.sourceRef != null && item.sourceRef !== "") { const ref = String(item.sourceRef).trim(); if (!SOURCE_REF.test(ref)) return null; out.sourceRef = ref; }
  const note = cleanBodyText(item.note).slice(0, 120);
  if (note) out.note = note;
  return out;
}

// The approved body as identified blocks (`id` = position in the approved text, stable across drafts).
export function baseBodyBlocks(text) {
  return parseYaminSmolText(text).map((block, index) => ({ ...block, id: `b${index}`, locked: isSourceBlock(block) }));
}

// entries → blocks. FAILS CLOSED: any unknown ref, any change to a source block's text, or a draft that drops a source that was not explicitly removed returns the approved body.
export function resolveBodyBlocks(entries, base) {
  if (!Array.isArray(entries)) return base;
  const byId = new Map(base.map((block) => [block.id, block]));
  const out = [];
  const seen = new Set();
  let added = 0;
  const withAlign = (block, entry) => (ALIGNS.includes(entry.align) ? { ...block, align: entry.align } : block);
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") return base;
    if (entry.add === true) {
      if (entry.kind === "gematria") {
        const item = cleanGematriaItem(entry.item);
        if (!item) return base;
        out.push(withAlign({ id: `n${added += 1}`, kind: "gematria", item, text: item.phrase, identity: "editorial", locked: false, added: true }, entry));
        continue;
      }
      const kind = TEXT_KINDS.includes(entry.kind) && entry.kind !== "title" ? entry.kind : null;
      const text = cleanBodyText(entry.text);
      if (!kind || !text) return base;
      out.push(withAlign({ id: `n${added += 1}`, kind, text, identity: "editorial", locked: false, added: true }, entry));
      continue;
    }
    const original = byId.get(entry.ref);
    if (!original || seen.has(entry.ref)) return base;
    seen.add(entry.ref);
    if (entry.removed === true) { if (!original.locked) return base; continue; }          // only a source may be removed, and only explicitly
    if (original.locked) { out.push(withAlign(original, entry)); continue; }              // a source always keeps its approved wording, whatever the draft says
    let block = original;
    if (DATA_KINDS.includes(original.kind)) {
      if (typeof entry.text === "string") { block = refreshData(original, entry.text); if (!block) return base; }
    } else if (TEXT_KINDS.includes(original.kind) && (typeof entry.text === "string" || typeof entry.kind === "string")) {
      const text = typeof entry.text === "string" ? cleanBodyText(entry.text) : original.text;
      if (!text) return base;
      // an editorial block may be retyped (paragraph ⇄ heading ⇄ …); the title stays the title and no other block becomes one
      const kind = typeof entry.kind === "string" && TEXT_KINDS.includes(entry.kind) && (entry.kind === "title") === (original.kind === "title") ? entry.kind : original.kind;
      block = { ...original, text, kind };
    }
    out.push(withAlign(block, entry));
  }
  // every source must be present, or explicitly removed (an entry with removed:true was seen above)
  if (!base.every((block) => !block.locked || seen.has(block.id))) return base;
  return out;
}

// working blocks → storable entries (a source is stored as a bare reference; a removed source as an explicit removal)
export const entriesFromBlocks = (blocks, base) => {
  const baseById = new Map(base.map((block) => [block.id, block]));
  const alignOf = (block) => (ALIGNS.includes(block.align) && block.align !== (baseById.get(block.id) || {}).align ? { align: block.align } : {});
  const entries = blocks.map((block) => {
    if (block.kind === "gematria") return { add: true, kind: "gematria", item: block.item, ...alignOf(block) };
    if (block.added) return { add: true, kind: block.kind, text: block.text, ...alignOf(block) };
    const original = baseById.get(block.id);
    if (!original || original.locked) return { ref: block.id, ...alignOf(block) };
    const retyped = block.kind !== original.kind && TEXT_KINDS.includes(block.kind);
    return { ref: block.id, ...(block.text !== original.text ? { text: block.text } : {}), ...(retyped ? { kind: block.kind } : {}), ...alignOf(block) };
  });
  const present = new Set(blocks.map((block) => block.id));
  for (const original of base) if (original.locked && !present.has(original.id)) entries.push({ ref: original.id, removed: true });
  return entries;
};

// The exact proposed change: what would have to be written if a canonical path is approved. Words of source blocks never appear as edited.
export function diffBody(base, blocks) {
  const ops = [];
  const keptOrder = blocks.filter((block) => !block.added).map((block) => block.id);
  const baseOrder = base.map((block) => block.id).filter((id) => keptOrder.includes(id));
  keptOrder.forEach((id, index) => { if (baseOrder[index] !== id) ops.push({ op: "moved", id, toIndex: blocks.findIndex((block) => block.id === id) }); });
  for (const block of blocks) {
    if (block.kind === "gematria") { ops.push({ op: "added", kind: "gematria", item: block.item, text: `${block.item.phrase} · ${block.item.methodKey} · ${GX_DISPLAYS[block.item.display]}`, atIndex: blocks.indexOf(block) }); continue; }
    if (block.added) { ops.push({ op: "added", kind: block.kind, text: block.text, atIndex: blocks.indexOf(block) }); continue; }
    const original = base.find((b) => b.id === block.id);
    if (original && original.text !== block.text) ops.push({ op: "edited", id: block.id, kind: original.kind, before: original.text, after: block.text });
    if (original && original.kind !== block.kind) ops.push({ op: "retyped", id: block.id, from: original.kind, to: block.kind });
    if (original && (block.align || null) !== (original.align || null)) ops.push({ op: "aligned", id: block.id, to: block.align || "default" });
  }
  for (const block of blocks) if (block.added && ALIGNS.includes(block.align)) ops.push({ op: "aligned", id: block.id, to: block.align });
  for (const original of base) if (!blocks.some((block) => block.id === original.id)) ops.push({ op: "removed", id: original.id, kind: original.kind, text: original.text, source: Boolean(original.locked) });
  return { changed: ops.length > 0, count: ops.length, ops };
}

// ---- browser-local draft (this device only) --------------------------------------------------------------------------------
export const bodyDraftKey = (postId, unitId) => `sod2029:post-unit-body-preview:${postId}:${unitId}`;
export function readBodyDraft(postId, unitId, storage = globalThis.localStorage) {
  try { const raw = storage?.getItem(bodyDraftKey(postId, unitId)); const parsed = raw ? JSON.parse(raw) : null; return Array.isArray(parsed) ? parsed : null; } catch { return null; }
}
export function writeBodyDraft(postId, unitId, entries, storage = globalThis.localStorage) {
  try { storage?.setItem(bodyDraftKey(postId, unitId), JSON.stringify(entries)); return true; } catch { return false; }
}
export function clearBodyDraft(postId, unitId, storage = globalThis.localStorage) { try { storage?.removeItem(bodyDraftKey(postId, unitId)); storage?.removeItem(bodyDraftMetaKey(postId, unitId)); } catch { /* optional */ } }
// What the local draft is: when it was saved and which approved text it was written against (a fingerprint, never the text). It makes the draft
// recognisable as a LOCAL draft; it is not a revision and it never leaves this browser.
export const bodyDraftMetaKey = (postId, unitId) => `${bodyDraftKey(postId, unitId)}:meta`;
export const textFingerprint = (text) => { let h1 = 0x811c9dc5, h2 = 0x01000193; for (let i = 0; i < text.length; i += 1) { h1 = Math.imul(h1 ^ text.charCodeAt(i), 0x01000193) >>> 0; h2 = (Math.imul(h2 ^ text.charCodeAt(i), 0x85ebca6b) + i) >>> 0; } return `${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`; };
export function writeBodyDraftMeta(postId, unitId, meta, storage = globalThis.localStorage) {
  try { storage?.setItem(bodyDraftMetaKey(postId, unitId), JSON.stringify({ scope: "local-browser-draft", ...meta })); return true; } catch { return false; }
}
export function readBodyDraftMeta(postId, unitId, storage = globalThis.localStorage) {
  try { const raw = storage?.getItem(bodyDraftMetaKey(postId, unitId)); const parsed = raw ? JSON.parse(raw) : null; return parsed && typeof parsed === "object" ? parsed : null; } catch { return null; }
}

// the blocks the Post shows right now: the local draft if it is valid, otherwise the approved body
export function resolveUnitBlocks(postId, unitId, text, storage = globalThis.localStorage) {
  const base = baseBodyBlocks(text);
  const draft = readBodyDraft(postId, unitId, storage);
  return draft ? resolveBodyBlocks(draft, base) : base;
}
