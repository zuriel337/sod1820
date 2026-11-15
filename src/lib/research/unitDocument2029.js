// ONE continuous document over the existing structured unit blocks (postUnitBody2029). ZURIEL 15.11.2026: "one unit, one editor".
// A PURE module (no DOM, no storage, no network): the editor component turns its contenteditable into `items`, this module turns items into blocks,
// validates them, and offers the document operations (replace, clear, restore sources, plain-text copy, repeats). Nothing here persists anything.
//
// Protected material (the writers' words, verses, the four numbers, equations, the table) is never a text field: it is a CHIP — an atomic item that
// carries only block references (`refs`), never text. The chip's words always come from the approved base. A document that drops, duplicates,
// reorders or invents a chip is INVALID and says exactly why; it is never silently repaired, silently reverted, or silently shortened.
import { EDITABLE_KINDS, MAX_TEXT, baseBodyBlocks } from "./postUnitBody2029.js";
import { ATTRIBUTION_GROUPS } from "./postPreviewUnits2029.js";

export const DOC_KINDS = Object.freeze(["p", "heading", "subtitle", "kicker", "closing", "title"]);
export const DOC_KIND_LABEL = Object.freeze({ p: "פסקה", heading: "כותרת מקטע", subtitle: "כותרת משנה", kicker: "שורת פתיחה", closing: "שורת סיום", title: "כותרת ראשית", rule: "מפריד" });
// plain-text markers (used by "copy the document" and "replace content"); a line without a marker is a paragraph
const MARKERS = Object.freeze([["title", "# "], ["heading", "## "], ["subtitle", "#- "], ["kicker", "#^ "], ["closing", "#! "]]);
const SOURCE_TOKEN = /^\[\[מקור\s+(b\d+)(?:\s*[–-]\s*(b\d+))?[^\]]*\]\]$/;
const RULE_LINE = /^[-–—─]{3,}$/;

const identityLabel = (id) => (ATTRIBUTION_GROUPS.find((g) => g.identity === id) || {}).label || (id === "baal-hasulam" ? "בעל הסולם" : id === "scripture" ? "מקרא" : id === "editorial-phrase" ? "ביטוי פרשני מהרצף" : id);

// chips group CONSECUTIVE protected blocks of the same class (a writer's whole attribution, a table, a run of equations, one verse, one peak number)
export const chipClass = (block) => block.group || (block.kind === "row" ? "table" : block.kind === "claim" ? "claims" : block.kind === "verse" ? `verse:${block.identity || ""}` : block.kind);
export function chipLabel(block) {
  if (block.group) return identityLabel(block.group);
  if (block.kind === "row") return "טבלת ראשי התיבות";
  if (block.kind === "claim") return "משוואות";
  if (block.kind === "verse") return `ציטוט · ${identityLabel(block.identity)}`;
  if (block.kind === "numbers") return "ארבעת המספרים";
  if (block.kind === "peak") return "מספר בולט";
  return "מקור";
}

// blocks → the document's items, in order
export function docItems(blocks) {
  const out = [];
  for (const block of blocks) {
    if (block.locked) {
      const cls = chipClass(block);
      const last = out[out.length - 1];
      if (last && last.t === "chip" && last.cls === cls) last.refs.push(block.id);
      else out.push({ t: "chip", cls, refs: [block.id], label: chipLabel(block) });
    } else if (block.kind === "rule") out.push({ t: "rule", ref: block.id });
    else out.push({ t: "text", ref: block.added ? null : block.id, kind: block.kind, text: block.text });
  }
  return out;
}

const lockedIds = (base) => base.filter((block) => block.locked).map((block) => block.id);

// items → blocks. Never throws; every problem is returned in `errors` (blocking) or `notices` (informational).
export function itemsToBlocks(items, base) {
  const byId = new Map(base.map((block) => [block.id, block]));
  const blocks = [];
  const errors = [];
  const notices = [];
  const seen = new Set();
  let added = 0;
  const push = (block) => blocks.push(block);
  for (const item of Array.isArray(items) ? items : []) {
    if (!item || typeof item !== "object") continue;
    if (item.t === "chip") {
      for (const ref of item.refs || []) {
        const original = byId.get(ref);
        if (!original || !original.locked) { errors.push({ code: "unknown_source", ids: [ref], message: `מקור לא מוכר או לא נעול (${ref}) — לא ניתן להוסיף מקורות.` }); continue; }
        if (seen.has(ref)) { errors.push({ code: "duplicate_source", ids: [ref], message: `המקור ${ref} מופיע יותר מפעם אחת.` }); continue; }
        seen.add(ref); push(original);
      }
    } else if (item.t === "rule") {
      const original = item.ref ? byId.get(item.ref) : null;
      if (original && original.kind === "rule" && !seen.has(original.id)) { seen.add(original.id); push(original); }
    } else if (item.t === "text") {
      const lines = String(item.text ?? "").split(/\n+/).map((line) => line.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim()).filter(Boolean);
      lines.forEach((line, index) => {
        if (line.length > MAX_TEXT) { errors.push({ code: "too_long", ids: [item.ref || "new"], message: `פסקה ארוכה מדי (${line.length} תווים; המקסימום ${MAX_TEXT}). לא נקצצה — קצרו אותה.` }); return; }
        let kind = EDITABLE_KINDS.includes(item.kind) ? item.kind : "p";
        const original = index === 0 && item.ref ? byId.get(item.ref) : null;
        if (original && !original.locked && EDITABLE_KINDS.includes(original.kind) && !seen.has(original.id)) {
          seen.add(original.id);
          if ((kind === "title") !== (original.kind === "title")) { notices.push(`הסוג של ״${line.slice(0, 24)}…״ נשאר ${DOC_KIND_LABEL[original.kind]} (הכותרת הראשית אינה מוחלפת ואין כותרת ראשית שנייה).`); kind = original.kind; }
          push({ ...original, kind, text: line });
        } else {
          if (kind === "title") { notices.push(`״${line.slice(0, 24)}…״ נוספה כפסקה ולא ככותרת ראשית.`); kind = "p"; }
          push({ id: `n${added += 1}`, kind, text: line, identity: "editorial", locked: false, added: true });
        }
      });
    }
  }
  const check = validateBlocks(blocks, base);
  return { blocks, errors: [...errors, ...check.errors], notices, ok: errors.length === 0 && check.ok };
}

// every protected block present exactly once, in the approved order
export function validateBlocks(blocks, base) {
  const errors = [];
  const want = lockedIds(base);
  const have = blocks.filter((block) => block.locked).map((block) => block.id);
  const missing = want.filter((id) => !have.includes(id));
  if (missing.length) {
    const groups = missingGroups(missing, base);
    errors.push({ code: "missing_source", ids: missing, message: `הוסרו מקורות מוגנים: ${groups.map((g) => g.label).join(" · ")}. אי אפשר לשמור בלעדיהם — אפשר להחזיר אותם למקומם.` });
  }
  const order = have.filter((id) => want.includes(id));
  if (!missing.length && order.some((id, index) => id !== want[index])) errors.push({ code: "source_order", ids: order, message: "סדר המקורות המוגנים שונה מהנוסח המאושר." });
  return { ok: errors.length === 0, errors, missing };
}

function missingGroups(ids, base) {
  const byId = new Map(base.map((block) => [block.id, block]));
  const out = [];
  for (const id of ids) {
    const block = byId.get(id);
    const last = out[out.length - 1];
    if (last && chipClass(byId.get(last.ids[last.ids.length - 1])) === chipClass(block) && Number(id.slice(1)) === Number(last.ids[last.ids.length - 1].slice(1)) + 1) last.ids.push(id);
    else out.push({ ids: [id], label: chipLabel(block) });
  }
  return out;
}

// Puts every missing protected block back where the approved text had it (after its nearest preceding block that is still present).
export function restoreMissingSources(blocks, base) {
  const present = new Set(blocks.map((block) => block.id));
  let out = [...blocks];
  for (let index = 0; index < base.length; index += 1) {
    const block = base[index];
    if (!block.locked || present.has(block.id)) continue;
    let after = -1;
    for (let back = index - 1; back >= 0; back -= 1) { const at = out.findIndex((b) => b.id === base[back].id); if (at >= 0) { after = at; break; } }
    out.splice(after + 1, 0, block);
    present.add(block.id);
  }
  return out;
}

// Clear Editable Content: every editorial block goes; every protected block stays, in order.
export const clearEditable = (blocks) => blocks.filter((block) => block.locked);

// ---- plain text (copy the whole document / replace the content) ----------------------------------------------------------
function chipToken(item) {
  const first = item.refs[0], last = item.refs[item.refs.length - 1];
  return `[[מקור ${first}${last !== first ? `–${last}` : ""} · ${item.label}]]`;
}
export function blocksToDoc(blocks, { withSources = true } = {}) {
  const lines = [];
  for (const item of docItems(blocks)) {
    if (item.t === "chip") { if (withSources) lines.push(chipToken(item)); }
    else if (item.t === "rule") lines.push("---");
    else { const mark = (MARKERS.find(([kind]) => kind === item.kind) || [null, ""])[1]; lines.push(`${mark}${item.text}`); }
  }
  return lines.join("\n\n");
}

// text → items (an unchanged paragraph keeps its reference; paragraphs edited in place are paired with the block they replace)
export function docToItems(text, base) {
  const byId = new Map(base.map((block) => [block.id, block]));
  const order = base.map((block) => block.id);
  const raw = [];
  const errors = [];
  for (const line of String(text ?? "").replace(/\r\n?/g, "\n").split("\n").map((l) => l.trim()).filter(Boolean)) {
    const token = line.match(SOURCE_TOKEN);
    if (token) {
      const from = order.indexOf(token[1]);
      const to = token[2] ? order.indexOf(token[2]) : from;
      const refs = from >= 0 && to >= from ? order.slice(from, to + 1) : [];
      if (!refs.length || !refs.every((id) => byId.get(id).locked)) { errors.push({ code: "bad_source_token", ids: [token[1]], message: `סימון מקור לא תקין: ${line.slice(0, 40)}` }); continue; }
      raw.push({ t: "chip", refs, label: chipLabel(byId.get(refs[0])), cls: chipClass(byId.get(refs[0])) });
    } else if (RULE_LINE.test(line)) raw.push({ t: "rule", ref: null });
    else {
      const mark = MARKERS.find(([, m]) => line.startsWith(m));
      raw.push({ t: "text", ref: null, kind: mark ? mark[0] : "p", text: mark ? line.slice(mark[1].length).trim() : line });
    }
  }
  // 1) exact matches keep their reference
  const used = new Set();
  const editable = base.filter((block) => !block.locked && block.kind !== "rule");
  raw.forEach((item) => {
    if (item.t !== "text") return;
    const hit = editable.find((block) => !used.has(block.id) && block.text === item.text);
    if (hit) { item.ref = hit.id; used.add(hit.id); }
  });
  // 2) between two anchors (a chip, an exact match, or a rule) the same number of new lines and old blocks are paired as in-place edits
  const anchorsOf = (list, isOld) => list.map((entry, index) => ({ entry, index })).filter(({ entry }) => (isOld ? (entry.locked || used.has(entry.id) || entry.kind === "rule") : (entry.t !== "text" || entry.ref)));
  const newAnchors = anchorsOf(raw, false);
  const oldAnchorIds = base.filter((block) => block.locked || used.has(block.id)).map((block) => block.id);
  const newAnchorIds = newAnchors.flatMap(({ entry }) => (entry.t === "chip" ? entry.refs : entry.t === "text" ? [entry.ref] : []));
  const shared = newAnchorIds.filter((id) => oldAnchorIds.includes(id));
  const monotonic = shared.every((id, i) => i === 0 || order.indexOf(id) > order.indexOf(shared[i - 1]));
  for (let s = 0; monotonic && s <= shared.length; s += 1) {
    const lo = s === 0 ? -1 : raw.findIndex((entry) => (entry.t === "chip" ? entry.refs.includes(shared[s - 1]) : entry.ref === shared[s - 1]));
    const hi = s === shared.length ? raw.length : raw.findIndex((entry) => (entry.t === "chip" ? entry.refs.includes(shared[s]) : entry.ref === shared[s]));
    const news = raw.slice(lo + 1, hi).filter((entry) => entry.t === "text" && !entry.ref);
    const loOld = s === 0 ? -1 : order.indexOf(shared[s - 1]);
    const hiOld = s === shared.length ? order.length : order.indexOf(shared[s]);
    const olds = base.slice(loOld + 1, hiOld).filter((block) => !block.locked && block.kind !== "rule" && !used.has(block.id));
    if (news.length && news.length === olds.length) news.forEach((entry, i) => { entry.ref = olds[i].id; used.add(olds[i].id); });
  }
  // a rule line keeps the approved rule when the same number of rules are in place (simple, positional)
  const rules = base.filter((block) => block.kind === "rule");
  let r = 0;
  raw.forEach((item) => { if (item.t === "rule" && rules[r]) item.ref = rules[r++].id; });
  return { items: raw, errors };
}

// Replace Content: text in, validated blocks out (never partial)
export function replaceFromText(text, base) {
  const parsed = docToItems(text, base);
  const result = itemsToBlocks(parsed.items, base);
  return { ...result, errors: [...parsed.errors, ...result.errors], ok: parsed.errors.length === 0 && result.ok };
}

// ---- repeated explanations (deterministic; reports, never edits) ---------------------------------------------------------
const squash = (value) => String(value ?? "").replace(/[֑-ׇ]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
export function findRepeats(blocks) {
  const groups = [];
  const seen = new Map();
  for (const block of blocks) {
    if (block.locked || block.kind === "rule") continue;
    const key = squash(block.text);
    if (key.length < 14) continue;
    if (seen.has(key)) seen.get(key).ids.push(block.id); else seen.set(key, { kind: "same_paragraph", key, ids: [block.id] });
  }
  for (const group of seen.values()) if (group.ids.length > 1) groups.push(group);
  // an editorial paragraph that re-states a protected line word for word (informational: a quotation may be intended)
  const protectedLines = blocks.filter((block) => block.locked && squash(block.text).length >= 14).map((block) => ({ id: block.id, key: squash(block.text) }));
  for (const block of blocks) {
    if (block.locked || block.kind === "rule") continue;
    const key = squash(block.text);
    const hit = protectedLines.find((line) => key.includes(line.key));
    if (hit) groups.push({ kind: "restates_source", key: hit.key, ids: [block.id, hit.id] });
  }
  return groups;
}

export const unitPlainStats = (blocks) => ({ blocks: blocks.length, locked: blocks.filter((block) => block.locked).length, editableChars: blocks.filter((block) => !block.locked).reduce((sum, block) => sum + (block.text || "").length, 0) });
export const approvedBase = (text) => baseBodyBlocks(text);

// ---- Before/After: a word-level diff for the review panels (read-only) -------------------------------------------------------
export function wordDiff(before, after) {
  const a = String(before ?? "").split(/(\s+)/).filter((t) => t !== "");
  const b = String(after ?? "").split(/(\s+)/).filter((t) => t !== "");
  if (a.length * b.length > 90000) return [{ t: "del", s: String(before ?? "") }, { t: "add", s: String(after ?? "") }];
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1) for (let j = b.length - 1; j >= 0; j -= 1) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = [];
  const push = (t, s) => { const last = out[out.length - 1]; if (last && last.t === t) last.s += s; else out.push({ t, s }); };
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { push("same", a[i]); i += 1; j += 1; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { push("del", a[i]); i += 1; }
    else { push("add", b[j]); j += 1; }
  }
  while (i < a.length) push("del", a[i++]);
  while (j < b.length) push("add", b[j++]);
  return out;
}
