// ONE continuous document over the existing structured unit blocks (postUnitBody2029). ZURIEL 15.11.2026: "one unit, one editor".
// A PURE module (no DOM, no storage, no network): the editor component turns its contenteditable into `items`, this module turns items into blocks,
// validates them, and offers the document operations (replace, clear, restore sources, plain-text copy, repeats). Nothing here persists anything.
//
// Protected material (the writers' words, verses, the four numbers, equations, the table) is never a text field: it is a CHIP — an atomic item that
// carries only block references (`refs`), never text. The chip's words always come from the approved base. A document that drops, duplicates,
// reorders or invents a chip is INVALID and says exactly why; it is never silently repaired, silently reverted, or silently shortened.
import { TEXT_KINDS, DATA_KINDS, MAX_TEXT, ALIGNS, GX_DISPLAYS, baseBodyBlocks, refreshData, cleanGematriaItem } from "./postUnitBody2029.js";
import { ATTRIBUTION_GROUPS } from "./postPreviewUnits2029.js";

export const DOC_KINDS = Object.freeze(["p", "heading", "subtitle", "kicker", "closing", "title"]);
export const DOC_KIND_LABEL = Object.freeze({ p: "פסקה", heading: "כותרת מקטע", subtitle: "כותרת משנה", kicker: "שורת פתיחה", closing: "שורת סיום", title: "כותרת ראשית", rule: "מפריד",
  numbers: "ארבעת המספרים", peak: "מספר בולט", claim: "משוואה", row: "שורת טבלה", gematria: "גימטריה" });
// plain-text markers (used by "copy the document" and "replace content"); a line without a marker is a paragraph
const MARKERS = Object.freeze([["title", "# "], ["heading", "## "], ["subtitle", "#- "], ["kicker", "#^ "], ["closing", "#! "], ["numbers", "#N "], ["peak", "#P "], ["claim", "#C "], ["row", "#R "]]);
const ALIGN_WORD = Object.freeze({ start: "ימין", center: "מרכז", end: "שמאל" });
const ALIGN_MARK = /^\{(ימין|מרכז|שמאל)\}\s*/;
const SOURCE_TOKEN = /^\[\[מקור\s+(b\d+)(?:\s*[–-]\s*(b\d+))?[^\]]*\]\]$/;
const REMOVE_TOKEN = /^\[\[הסרת מקור\s+(b\d+)(?:\s*[–-]\s*(b\d+))?[^\]]*\]\]$/;
const GX_TOKEN = /^\[\[גימטריה\s*\|(.*)\]\]$/;
const RULE_LINE = /^[-–—─]{3,}$/;

const identityLabel = (id) => (ATTRIBUTION_GROUPS.find((g) => g.identity === id) || {}).label || (id === "baal-hasulam" ? "בעל הסולם" : id === "scripture" ? "מקרא" : id === "editorial-phrase" ? "ביטוי פרשני מהרצף" : id);

// chips group CONSECUTIVE source blocks of one author/identity (a writer's whole attribution, one verse)
export const chipClass = (block) => block.group || `verse:${block.identity || ""}`;
export function chipLabel(block) {
  if (block.group) return identityLabel(block.group);
  if (block.kind === "verse") return `ציטוט · ${identityLabel(block.identity)}`;
  return "מקור";
}
const idNum = (id) => Number(String(id).slice(1));

// blocks → the document's items, in order
export function docItems(blocks) {
  const out = [];
  for (const block of blocks) {
    if (block.locked) {
      const cls = chipClass(block);
      const last = out[out.length - 1];
      if (last && last.t === "chip" && last.cls === cls && idNum(block.id) === idNum(last.refs[last.refs.length - 1]) + 1) last.refs.push(block.id);
      else out.push({ t: "chip", cls, refs: [block.id], label: chipLabel(block), align: block.align || null });
    } else if (block.kind === "gematria") out.push({ t: "gx", ref: null, item: block.item, align: block.align || null });
    else if (block.kind === "rule") out.push({ t: "rule", ref: block.id });
    else out.push({ t: "text", ref: block.added ? null : block.id, kind: block.kind, text: block.text, align: block.align || null });
  }
  return out;
}

const withAlign = (block, align) => (ALIGNS.includes(align) ? { ...block, align } : block);

// items → blocks. Never throws; every problem is returned in `errors` (blocking) or `notices` (informational).
// `removed`: the ids of sources the person EXPLICITLY removed from the unit (the canonical source itself is never touched).
export function itemsToBlocks(items, base, { removed = new Set() } = {}) {
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
        if (!original || !original.locked) { errors.push({ code: "unknown_source", ids: [ref], message: `מקור לא מוכר (${ref}) — אי אפשר להוסיף מקורות חדשים או להפוך פסקה למקור.` }); continue; }
        if (seen.has(ref)) { errors.push({ code: "duplicate_source", ids: [ref], message: `המקור ${ref} מופיע יותר מפעם אחת.` }); continue; }
        seen.add(ref); push(withAlign(original, item.align));
      }
    } else if (item.t === "rule") {
      const original = item.ref ? byId.get(item.ref) : null;
      if (original && original.kind === "rule" && !seen.has(original.id)) { seen.add(original.id); push(original); }
    } else if (item.t === "gx") {
      const clean = cleanGematriaItem(item.item);
      if (!clean) { errors.push({ code: "bad_gematria", ids: ["gx"], message: "פריט גימטריה לא תקין (ביטוי, שיטה או סוג תצוגה חסרים)." }); continue; }
      push(withAlign({ id: `n${added += 1}`, kind: "gematria", item: clean, text: clean.phrase, identity: "editorial", locked: false, added: true }, item.align));
    } else if (item.t === "text") {
      const lines = String(item.text ?? "").split(/\n+/).map((line) => line.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim()).filter(Boolean);
      lines.forEach((line, index) => {
        if (line.length > MAX_TEXT) { errors.push({ code: "too_long", ids: [item.ref || "new"], message: `פסקה ארוכה מדי (${line.length} תווים; המקסימום ${MAX_TEXT}). לא נקצצה — קצרו אותה.` }); return; }
        const original = index === 0 && item.ref ? byId.get(item.ref) : null;
        const own = original && !original.locked && !seen.has(original.id) ? original : null;
        // research data (numbers, a focal number, an equation, a table row): editable, validated as a line of its own kind
        const dataKind = own ? (DATA_KINDS.includes(own.kind) ? own.kind : null) : (DATA_KINDS.includes(item.kind) && item.kind !== "numbers" ? item.kind : null);
        if (dataKind) {
          const proto = own || { id: `n${added += 1}`, kind: dataKind, identity: "editorial", locked: false, added: true, head: false };
          const next = refreshData(proto, line);
          if (!next) { errors.push({ code: "bad_data", ids: [proto.id], message: `שורת נתון לא תקינה (${DOC_KIND_LABEL[dataKind]}): ״${line.slice(0, 30)}״.` }); return; }
          if (own) seen.add(own.id);
          push(withAlign(next, item.align)); return;
        }
        let kind = TEXT_KINDS.includes(item.kind) ? item.kind : "p";
        if (own && TEXT_KINDS.includes(own.kind)) {
          seen.add(own.id);
          if ((kind === "title") !== (own.kind === "title")) { notices.push(`הסוג של ״${line.slice(0, 24)}…״ נשאר ${DOC_KIND_LABEL[own.kind]} (הכותרת הראשית אינה מוחלפת ואין כותרת ראשית שנייה).`); kind = own.kind; }
          push(withAlign({ ...own, kind, text: line }, item.align));
        } else {
          if (kind === "title") { notices.push(`״${line.slice(0, 24)}…״ נוספה כפסקה ולא ככותרת ראשית.`); kind = "p"; }
          push(withAlign({ id: `n${added += 1}`, kind, text: line, identity: "editorial", locked: false, added: true }, item.align));
        }
      });
    }
  }
  const check = validateBlocks(blocks, base, removed);
  return { blocks, errors: [...errors, ...check.errors], notices, ok: errors.length === 0 && check.ok };
}

const lockedIds = (base) => base.filter((block) => block.locked).map((block) => block.id);

// every source present exactly once — or explicitly removed from the unit. The order of sources is free (a source may be moved).
export function validateBlocks(blocks, base, removed = new Set()) {
  const errors = [];
  const have = new Set(blocks.filter((block) => block.locked).map((block) => block.id));
  const missing = lockedIds(base).filter((id) => !have.has(id) && !removed.has(id));
  if (missing.length) {
    const groups = missingGroups(missing, base);
    errors.push({ code: "missing_source", ids: missing, message: `הוסרו מקורות בלי אישור מפורש: ${groups.map((g) => g.label).join(" · ")}. אפשר להחזיר אותם למקומם, או להסיר אותם מהיחידה באישור (הסר מהיחידה).` });
  }
  return { ok: errors.length === 0, errors, missing };
}

function missingGroups(ids, base) {
  const byId = new Map(base.map((block) => [block.id, block]));
  const out = [];
  for (const id of ids) {
    const block = byId.get(id);
    const last = out[out.length - 1];
    if (last && chipClass(byId.get(last.ids[last.ids.length - 1])) === chipClass(block) && idNum(id) === idNum(last.ids[last.ids.length - 1]) + 1) last.ids.push(id);
    else out.push({ ids: [id], label: chipLabel(block) });
  }
  return out;
}

// Puts every missing source (that was not explicitly removed) back where the approved text had it (after its nearest preceding block that is still present).
export function restoreMissingSources(blocks, base, removed = new Set()) {
  const present = new Set(blocks.map((block) => block.id));
  let out = [...blocks];
  for (let index = 0; index < base.length; index += 1) {
    const block = base[index];
    if (!block.locked || present.has(block.id) || removed.has(block.id)) continue;
    let after = -1;
    for (let back = index - 1; back >= 0; back -= 1) { const at = out.findIndex((b) => b.id === base[back].id); if (at >= 0) { after = at; break; } }
    out.splice(after + 1, 0, block);
    present.add(block.id);
  }
  return out;
}

// Clear Editable Content: every editorial block and every research-data block goes; every source stays, in order.
export const clearEditable = (blocks) => blocks.filter((block) => block.locked);

// ---- plain text (copy the whole document / replace the content) ----------------------------------------------------------
const chipToken = (item) => { const first = item.refs[0], last = item.refs[item.refs.length - 1]; return `[[מקור ${first}${last !== first ? `–${last}` : ""} · ${item.label}]]`; };
const gxToken = (item) => { const g = item.item; return `[[גימטריה | ${g.phrase.replace(/\|/g, " ")} | ${g.methodKey} | ${g.display} | ${g.stated ?? ""} | ${g.by ?? ""}]]`; };
const alignPrefix = (align) => (ALIGNS.includes(align) ? `{${ALIGN_WORD[align]}} ` : "");
// `base` (optional): sources the person removed from the unit are written as explicit [[הסרת מקור …]] lines, so a copied / saved document pastes back as valid.
export function blocksToDoc(blocks, { withSources = true, base = null } = {}) {
  const lines = [];
  for (const item of docItems(blocks)) {
    const prefix = alignPrefix(item.align);
    if (item.t === "chip") { if (withSources) lines.push(prefix + chipToken(item)); }
    else if (item.t === "gx") lines.push(prefix + gxToken(item));
    else if (item.t === "rule") lines.push("---");
    else { const mark = (MARKERS.find(([kind]) => kind === item.kind) || [null, ""])[1]; lines.push(`${prefix}${mark}${item.text}`); }
  }
  if (base && withSources) {
    const present = new Set(blocks.map((b) => b.id));
    for (const g of missingGroups(lockedIds(base).filter((id) => !present.has(id)), base)) lines.push(`[[הסרת מקור ${g.ids[0]}${g.ids.length > 1 ? `–${g.ids[g.ids.length - 1]}` : ""}]]`);
  }
  return lines.join("\n\n");
}

const compatible = (a, b) => a === b || (TEXT_KINDS.includes(a) && TEXT_KINDS.includes(b));

// text → items (an unchanged paragraph keeps its reference; paragraphs edited in place are paired with the block they replace)
export function docToItems(text, base) {
  const byId = new Map(base.map((block) => [block.id, block]));
  const order = base.map((block) => block.id);
  const raw = [];
  const errors = [];
  const removed = new Set();
  const range = (m) => { const from = order.indexOf(m[1]); const to = m[2] ? order.indexOf(m[2]) : from; return from >= 0 && to >= from ? order.slice(from, to + 1) : []; };
  for (let line of String(text ?? "").replace(/\r\n?/g, "\n").split("\n").map((l) => l.trim()).filter(Boolean)) {
    let align = null;
    const am = line.match(ALIGN_MARK);
    if (am) { align = Object.entries(ALIGN_WORD).find(([, word]) => word === am[1])[0]; line = line.slice(am[0].length); }
    const rem = line.match(REMOVE_TOKEN);
    if (rem) { const refs = range(rem); if (!refs.length || !refs.every((id) => byId.get(id).locked)) errors.push({ code: "bad_source_token", ids: [rem[1]], message: `סימון הסרת מקור לא תקין: ${line.slice(0, 40)}` }); else refs.forEach((id) => removed.add(id)); continue; }
    const token = line.match(SOURCE_TOKEN);
    if (token) {
      const refs = range(token);
      if (!refs.length || !refs.every((id) => byId.get(id).locked)) { errors.push({ code: "bad_source_token", ids: [token[1]], message: `סימון מקור לא תקין: ${line.slice(0, 40)}` }); continue; }
      raw.push({ t: "chip", refs, label: chipLabel(byId.get(refs[0])), cls: chipClass(byId.get(refs[0])), align }); continue;
    }
    const gx = line.match(GX_TOKEN);
    if (gx) {
      const [phrase, methodKey, display, stated, by] = gx[1].split("|").map((x) => x.trim());
      raw.push({ t: "gx", ref: null, item: { phrase, methodKey, display, ...(stated ? { stated: Number(stated) } : {}), ...(by ? { by } : {}) }, align }); continue;
    }
    if (RULE_LINE.test(line)) { raw.push({ t: "rule", ref: null }); continue; }
    const mark = MARKERS.find(([, m]) => line.startsWith(m));
    raw.push({ t: "text", ref: null, kind: mark ? mark[0] : "p", text: mark ? line.slice(mark[1].length).trim() : line, align });
  }
  // 1) exact matches (same text, compatible kind) keep their reference
  const used = new Set();
  const editable = base.filter((block) => !block.locked && block.kind !== "rule");
  raw.forEach((item) => {
    if (item.t !== "text") return;
    const hit = editable.find((block) => !used.has(block.id) && block.text === item.text && compatible(block.kind, item.kind));
    if (hit) { item.ref = hit.id; used.add(hit.id); }
  });
  // 2) between two anchors the same number of new lines and old blocks (of compatible kinds) are paired as in-place edits
  const newAnchorIds = raw.flatMap((entry) => (entry.t === "chip" ? entry.refs : entry.t === "text" && entry.ref ? [entry.ref] : []));
  const oldAnchorIds = base.filter((block) => block.locked || used.has(block.id)).map((block) => block.id);
  const shared = newAnchorIds.filter((id) => oldAnchorIds.includes(id));
  const monotonic = shared.every((id, i) => i === 0 || order.indexOf(id) > order.indexOf(shared[i - 1]));
  const at = (id) => raw.findIndex((entry) => (entry.t === "chip" ? entry.refs.includes(id) : entry.ref === id));
  for (let s = 0; monotonic && s <= shared.length; s += 1) {
    const lo = s === 0 ? -1 : at(shared[s - 1]);
    const hi = s === shared.length ? raw.length : at(shared[s]);
    const news = raw.slice(lo + 1, hi).filter((entry) => entry.t === "text" && !entry.ref);
    const loOld = s === 0 ? -1 : order.indexOf(shared[s - 1]);
    const hiOld = s === shared.length ? order.length : order.indexOf(shared[s]);
    const olds = base.slice(loOld + 1, hiOld).filter((block) => !block.locked && block.kind !== "rule" && !used.has(block.id));
    if (news.length && news.length === olds.length && news.every((entry, i) => compatible(entry.kind, olds[i].kind))) news.forEach((entry, i) => { entry.ref = olds[i].id; used.add(olds[i].id); });
  }
  const rules = base.filter((block) => block.kind === "rule");
  let r = 0;
  raw.forEach((item) => { if (item.t === "rule" && rules[r]) item.ref = rules[r++].id; });
  return { items: raw, errors, removed };
}

// Replace Content: text in, validated blocks out (never partial)
export function replaceFromText(text, base) {
  const parsed = docToItems(text, base);
  const result = itemsToBlocks(parsed.items, base, { removed: parsed.removed });
  return { ...result, removed: parsed.removed, errors: [...parsed.errors, ...result.errors], ok: parsed.errors.length === 0 && result.ok };
}

// ---- repeated explanations (deterministic; reports, never edits) ---------------------------------------------------------
const squash = (value) => String(value ?? "").replace(/[֑-ׇ]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
export function findRepeats(blocks) {
  const groups = [];
  const seen = new Map();
  for (const block of blocks) {
    if (block.locked || block.kind === "rule" || block.kind === "gematria") continue;
    const key = squash(block.text);
    if (key.length < 14) continue;
    if (seen.has(key)) seen.get(key).ids.push(block.id); else seen.set(key, { kind: "same_paragraph", key, ids: [block.id] });
  }
  for (const group of seen.values()) if (group.ids.length > 1) groups.push(group);
  // an editorial paragraph that re-states a protected line word for word (informational: a quotation may be intended)
  const protectedLines = blocks.filter((block) => block.locked && squash(block.text).length >= 14).map((block) => ({ id: block.id, key: squash(block.text) }));
  for (const block of blocks) {
    if (block.locked || block.kind === "rule" || block.kind === "gematria") continue;
    const key = squash(block.text);
    const hit = protectedLines.find((line) => key.includes(line.key));
    if (hit) groups.push({ kind: "restates_source", key: hit.key, ids: [block.id, hit.id] });
  }
  return groups;
}

export const unitPlainStats = (blocks) => ({ blocks: blocks.length, locked: blocks.filter((block) => block.locked).length, editableChars: blocks.filter((block) => !block.locked).reduce((sum, block) => sum + (block.text || "").length, 0) });
export const approvedBase = (text) => baseBodyBlocks(text);
export { GX_DISPLAYS };

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
