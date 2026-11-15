// "✦ ערוך עם רזיאל" — the PURE half of the editorial review of a whole unit through the EXISTING single Raziel session (ZURIEL 15.11.2026).
// Nothing here calls a model or a transport and nothing is persisted. The component hands each request to the session's own `submit()`
// (the same temporary conversation the Companion shows) and hands the answer back here.
//
// WHY SEGMENTS: the supported request carries at most 300 characters of subject + 1200 of facts + 600 of context (razielSessionRequest2029 LIMITS;
// the server re-clips subject at 300 and facts at 3500, and the session builder collapses whitespace). The unit is ~3.2k characters, so it cannot be
// one request. It is therefore split into bounded segments, ONE user action sends them in sequence, and the answers are merged DETERMINISTICALLY into
// ONE proposal against the ONE document. Nothing is truncated: a block too long for a request is reported, not cut.
//
// WHAT RAZIEL MAY RETURN: suggestions only, in a closed line grammar ([id] new text · [id]= · [+id] new paragraph after · [-id] removal). The parser is
// fail-closed: a line that is not in the grammar is commentary, a reference to a protected block is rejected, and nothing is applied until the person
// approves it. Numbers are never trusted from the model: any number in a proposed text that is not already in the document is flagged "not verified".
import { MAX_TEXT, EDITABLE_KINDS } from "./postUnitBody2029.js";
import { chipLabel } from "./unitDocument2029.js";

// mirrors the private LIMITS of the Raziel session request builder (a test reads that file and fails when they drift)
export const RAZIEL_REQUEST_LIMITS = Object.freeze({ question: 300, facts: 1200 });
export const SEGMENT_FACTS_BUDGET = 1000;                       // headroom under 1200 for the outline line and separators

export const REVIEW_TASKS = Object.freeze({
  structure: { label: "מבנה וניסוח", ask: "שפר מבנה וניסוח" },
  repeats: { label: "חזרות והסברים כפולים", ask: "אתר חזרות והסברים כפולים והצע איחוד" },
  attribution: { label: "ייחוס", ask: "בדוק ייחוס: דברי הכותב מול פרשנות העורך" },
  flow: { label: "זרימה וכותרות", ask: "הצע זרימת קריאה וכותרות ברורות יותר" },
});
const FORMAT = "החזר רק שורות: [id] נוסח מחליף · [id]= בלי שינוי · [+id] פסקה חדשה אחרי · [-id] הסרה. אל תשנה [מקור נעול]. בלי חישובי גימטריה.";
export const FREE_TASK_MAX = 80;

export function segmentUnit(blocks, { budget = SEGMENT_FACTS_BUDGET } = {}) {
  const outline = blocks.filter((b) => !b.locked && (b.kind === "title" || b.kind === "heading")).map((b) => b.text.replace(/[✨✦👑📜]/gu, "").trim().slice(0, 28)).join(" | ").slice(0, 150);
  const prefix = outline ? `כותרות היחידה: ${outline} ¦ ` : "";
  const room = Math.max(300, budget - prefix.length);
  const lines = [];
  const skipped = [];
  for (const block of blocks) {
    if (block.kind === "rule") continue;
    if (block.locked) { const label = `[מקור נעול: ${chipLabel(block)}]`; if (lines[lines.length - 1]?.text !== label) lines.push({ id: null, text: label }); continue; }
    const text = `[${block.id}] ${block.text}`;
    if (text.length + 3 > room) { skipped.push({ id: block.id, chars: block.text.length, reason: "too_long_for_one_request" }); continue; }
    lines.push({ id: block.id, text });
  }
  const segments = [];
  let current = null;
  for (const line of lines) {
    if (!current || current.chars + line.text.length + 3 > room) { current = { ids: [], parts: [], chars: 0 }; segments.push(current); }
    current.parts.push(line.text); current.chars += line.text.length + 3;
    if (line.id) current.ids.push(line.id);
  }
  const live = segments.filter((s) => s.ids.length);
  return { segments: live.map((s, i) => ({ index: i + 1, total: live.length, ids: s.ids, facts: `${prefix}${s.parts.join(" ¦ ")}` })), skipped, outline };
}

export function buildSegmentQuestion({ task, index, total, free = "" }) {
  const ask = task === "free" ? String(free).trim().slice(0, FREE_TASK_MAX) : (REVIEW_TASKS[task] || REVIEW_TASKS.structure).ask;
  return `✦ ערוך עם רזיאל — ${ask}. מקטע ${index}/${total} של היחידה. ${FORMAT}`;
}

// ---- the answer → proposals ------------------------------------------------------------------------------------------------
const LINE = /^\s*(?:[-*•]|\d+[.)])?\s*\**\[(\+|-)?\s*([bn]\d+)\s*\]\**\s*(=)?\s*[:：]?\s*(.*?)\s*$/u;
const MARKS = [["heading", "## "], ["subtitle", "#- "], ["kicker", "#^ "], ["closing", "#! "]];
const digitsOf = (text) => String(text ?? "").match(/\d{3,}/g) || [];
export const stripQuotes = (text) => String(text ?? "").replace(/^\*+|\*+$/g, "").trim();

export function parseRazielAnswer(answer, blocks) {
  const byId = new Map(blocks.map((b) => [b.id, b]));
  const known = new Set(blocks.flatMap((b) => digitsOf(b.text)));
  const proposals = [];
  const commentary = [];
  const touched = new Set();
  let unchanged = 0;
  for (const raw of String(answer ?? "").replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(LINE);
    if (!m) { if (commentary.length < 12) commentary.push(line.slice(0, 280)); continue; }
    const [, sign, ref, equals, rest] = m;
    const block = byId.get(ref);
    const id = `p${proposals.length + 1}`;
    if (equals) { unchanged += 1; continue; }
    let kind = null; let after = stripQuotes(rest);
    const mark = MARKS.find(([, prefix]) => after.startsWith(prefix));
    if (mark) { kind = mark[0]; after = after.slice(mark[1].length).trim(); }
    const op = sign === "+" ? "add" : sign === "-" ? "remove" : "edit";
    const reject = (reason) => proposals.push({ id, op, ref, before: block ? block.text : "", after, kind, status: "rejected", reason, flags: [] });
    if (!block) { reject("unknown_ref"); continue; }
    if (op !== "add" && block.locked) { reject("locked_source"); continue; }
    if (op === "remove" && block.kind === "title") { reject("title_required"); continue; }
    if (op === "edit" && block.kind === "rule") { reject("not_editable"); continue; }
    if (op !== "remove" && !after) { reject("empty_text"); continue; }
    if (after.length > MAX_TEXT) { reject("too_long"); continue; }
    if (kind && !EDITABLE_KINDS.includes(kind)) kind = null;
    if (op !== "add" && touched.has(ref)) { reject("duplicate"); continue; }
    if (op === "edit" && after === block.text && !kind) { unchanged += 1; continue; }
    if (op !== "add") touched.add(ref);
    const newNumbers = op === "remove" ? [] : [...new Set(digitsOf(after))].filter((n) => !known.has(n));
    proposals.push({ id, op, ref, before: op === "add" ? "" : block.text, after: op === "remove" ? "" : after, kind, status: "proposed", reason: null, flags: newNumbers.length ? [{ code: "unverified_numbers", numbers: newNumbers }] : [] });
  }
  return { proposals, commentary, unchanged };
}

// merging the answers of all segments: one list, ids renumbered, nothing dropped silently
export function mergeProposals(parsedList) {
  const proposals = []; const commentary = []; let unchanged = 0; const touched = new Set();
  for (const parsed of parsedList) {
    unchanged += parsed.unchanged || 0;
    commentary.push(...(parsed.commentary || []));
    for (const p of parsed.proposals || []) {
      const entry = { ...p, id: `p${proposals.length + 1}` };
      if (entry.status === "proposed" && entry.op !== "add") { if (touched.has(entry.ref)) { entry.status = "rejected"; entry.reason = "duplicate"; } else touched.add(entry.ref); }
      proposals.push(entry);
    }
  }
  return { proposals, commentary: commentary.slice(0, 24), unchanged };
}

export const REJECT_LABEL = Object.freeze({ unknown_ref: "מזהה לא קיים ביחידה", locked_source: "מקור מוגן — אסור לשינוי", title_required: "הכותרת הראשית לא מוסרת", not_editable: "לא ניתן לעריכה", empty_text: "נוסח ריק", too_long: "ארוך מדי", duplicate: "הצעה כפולה לאותו בלוק" });

// Apply exactly the approved proposals, once, to the current blocks. Protected blocks are never touched (a proposal can neither edit nor remove one).
export function applyProposals(blocks, proposals, approvedIds) {
  const approved = new Set(approvedIds);
  const list = proposals.filter((p) => p.status === "proposed" && approved.has(p.id));
  const edits = new Map(list.filter((p) => p.op === "edit").map((p) => [p.ref, p]));
  const removes = new Set(list.filter((p) => p.op === "remove").map((p) => p.ref));
  const adds = new Map();
  for (const p of list.filter((x) => x.op === "add")) adds.set(p.ref, [...(adds.get(p.ref) || []), p]);
  let counter = blocks.reduce((max, b) => Math.max(max, /^n(\d+)$/.test(b.id) ? Number(b.id.slice(1)) : 0), 0);
  const out = [];
  for (const block of blocks) {
    if (!block.locked && removes.has(block.id)) { /* removed */ }
    else if (!block.locked && edits.has(block.id)) {
      const p = edits.get(block.id);
      const kind = p.kind && (p.kind === "title") === (block.kind === "title") ? p.kind : block.kind;
      out.push({ ...block, text: p.after, kind });
    } else out.push(block);
    for (const p of adds.get(block.id) || []) out.push({ id: `n${counter += 1}`, kind: p.kind || "p", text: p.after, identity: "editorial", locked: false, added: true });
  }
  return out;
}

export const proposalCounts = (proposals) => ({ total: proposals.length, proposed: proposals.filter((p) => p.status === "proposed").length, rejected: proposals.filter((p) => p.status === "rejected").length, flagged: proposals.filter((p) => p.flags?.length).length });
