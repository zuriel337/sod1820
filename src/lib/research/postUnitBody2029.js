// The editable BODY of a flagship unit (ZURIEL 13.11.2026: "the whole unit is editable, not only a headline") — a PURE module over the existing
// structured unit representation (parseYaminSmolText blocks). It is a DRAFT layer in this Preview only:
//   · editorial blocks (title, subtitle, kicker, headings, prose, closing line, rules) can be edited, moved, removed, and new ones added;
//   · SOURCE blocks are IMMUTABLE provenance — anything inside an attribution group (Yaniv / Shachar / the editorial-phrase quote), verses and quotations,
//     the four numbers, the focal numbers, the gematria equations and the table. They can neither be edited nor removed (a draft that drops one is
//     rejected and the approved body is used); they keep their text, identity and method truth.
//   · text is plain text only (it is rendered with textContent by the builder); nothing is ever parsed as markup.
// The stored draft is a list of REFERENCES (`{ref}` / `{ref,text}` / `{add,kind,text}`) — never the text of a locked block — and it lives in this
// browser only (there is no canonical unit store; see the proposal in UNIT_YAMIN_SMOL.md). `diffBody` produces the exact proposed change.
import { parseYaminSmolText } from "./postPreviewUnits2029.js";

export const EDITABLE_KINDS = Object.freeze(["title", "subtitle", "kicker", "heading", "p", "closing"]);
export const ADDABLE_KINDS = Object.freeze([["p", "פסקה"], ["heading", "כותרת מקטע"], ["subtitle", "כותרת משנה"], ["closing", "שורת מסר / סיום"]]);
export const KIND_LABEL = Object.freeze({ title: "כותרת", subtitle: "כותרת משנה", kicker: "שורת פתיחה", heading: "כותרת מקטע", p: "פסקה", closing: "שורת סיום", verse: "פסוק / ציטוט",
  numbers: "ארבעת המספרים", peak: "מספר בולט", claim: "משוואה", row: "שורת טבלה", rule: "מפריד" });
export const MAX_TEXT = 1500;

const LOCKED_KINDS = new Set(["verse", "numbers", "peak", "claim", "row"]);
export const isLockedBlock = (block) => Boolean(block.group) || LOCKED_KINDS.has(block.kind);
export const cleanBodyText = (value) => String(value ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replace(/\s+\n/g, "\n").trim().slice(0, MAX_TEXT);

// The approved body as identified blocks (`id` = position in the approved text, stable across drafts).
export function baseBodyBlocks(text) {
  return parseYaminSmolText(text).map((block, index) => ({ ...block, id: `b${index}`, locked: isLockedBlock(block) }));
}

// entries → blocks. FAILS CLOSED: any unknown ref, any change to a locked block's text, or a draft that drops a locked block returns the approved body.
export function resolveBodyBlocks(entries, base) {
  if (!Array.isArray(entries)) return base;
  const byId = new Map(base.map((block) => [block.id, block]));
  const out = [];
  const seen = new Set();
  let added = 0;
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") return base;
    if (entry.add === true) {
      const kind = EDITABLE_KINDS.includes(entry.kind) && entry.kind !== "title" ? entry.kind : null;
      const text = cleanBodyText(entry.text);
      if (!kind || !text) return base;
      out.push({ id: `n${added += 1}`, kind, text, identity: "editorial", locked: false, added: true });
      continue;
    }
    const original = byId.get(entry.ref);
    if (!original || seen.has(entry.ref)) return base;
    seen.add(entry.ref);
    if (original.locked) { out.push(original); continue; }              // locked blocks always keep the approved text, whatever the draft says
    if (typeof entry.text === "string" && EDITABLE_KINDS.includes(original.kind)) {
      const text = cleanBodyText(entry.text);
      if (!text) return base;
      out.push({ ...original, text });
    } else out.push(original);
  }
  if (!base.every((block) => !block.locked || seen.has(block.id))) return base;
  return out;
}

// working blocks → storable entries (a locked block is stored as a bare reference)
export const entriesFromBlocks = (blocks, base) => {
  const baseById = new Map(base.map((block) => [block.id, block]));
  return blocks.map((block) => {
    if (block.added) return { add: true, kind: block.kind, text: block.text };
    const original = baseById.get(block.id);
    return original && !original.locked && block.text !== original.text ? { ref: block.id, text: block.text } : { ref: block.id };
  });
};

// The exact proposed change: what would have to be written if a canonical path is approved. Words of locked blocks never appear as edited.
export function diffBody(base, blocks) {
  const ops = [];
  const keptOrder = blocks.filter((block) => !block.added).map((block) => block.id);
  const baseOrder = base.map((block) => block.id).filter((id) => keptOrder.includes(id));
  keptOrder.forEach((id, index) => { if (baseOrder[index] !== id) ops.push({ op: "moved", id, toIndex: blocks.findIndex((block) => block.id === id) }); });
  for (const block of blocks) {
    if (block.added) { ops.push({ op: "added", kind: block.kind, text: block.text, atIndex: blocks.indexOf(block) }); continue; }
    const original = base.find((b) => b.id === block.id);
    if (original && original.text !== block.text) ops.push({ op: "edited", id: block.id, kind: original.kind, before: original.text, after: block.text });
  }
  for (const original of base) if (!blocks.some((block) => block.id === original.id)) ops.push({ op: "removed", id: original.id, kind: original.kind, text: original.text });
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
export function clearBodyDraft(postId, unitId, storage = globalThis.localStorage) { try { storage?.removeItem(bodyDraftKey(postId, unitId)); } catch { /* optional */ } }

// the blocks the Post shows right now: the local draft if it is valid, otherwise the approved body
export function resolveUnitBlocks(postId, unitId, text, storage = globalThis.localStorage) {
  const base = baseBodyBlocks(text);
  const draft = readBodyDraft(postId, unitId, storage);
  return draft ? resolveBodyBlocks(draft, base) : base;
}
