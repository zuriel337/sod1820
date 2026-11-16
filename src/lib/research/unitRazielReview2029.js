// "✦ ערוך עם רזיאל" — the PURE half of the editorial review of a whole unit through the EXISTING single Raziel session (ZURIEL 15–16.11.2026).
// Nothing here calls a model or a transport and nothing is persisted. The component hands each request to the session's own `submit()` (the same
// temporary conversation the Companion shows) and hands the answer back here.
//
// WHY SEGMENTS: the supported request carries at most 300 characters of subject + 1200 of facts + 600 of context (razielSessionRequest2029 LIMITS; the server
// re-clips subject at 300 and facts at 3500, and the session builder collapses whitespace). The unit is ~3.2k+ characters, so it cannot be one request. It is split
// into bounded segments, ONE user action sends them in sequence, and the answers are merged DETERMINISTICALLY into ONE proposal against the ONE document.
// This is a bridge, NOT proof that Raziel understands the whole document: every segment's outcome (answered / failed / skipped, accepted / rejected proposals) is
// reported, and nothing that was rejected or could not be sent is hidden.
//
// WHAT RAZIEL MAY RETURN: suggestions only, in a closed line grammar (see FORMAT). The parser is fail-closed: a line outside the grammar is commentary; a proposal that
// would rewrite a SOURCE, touch an unknown block, or carry an invalid item is rejected and shown as rejected; nothing is applied until the person approves it.
// Raziel may SUGGEST a gematria item (phrase + method + display): it is only a reference — its value always comes from the canonical engine when it is shown, and a
// proposal can never carry a number of its own. Any number in a proposed text that is not already in the document is flagged "not verified".
import { MAX_TEXT, TEXT_KINDS, DATA_KINDS, ALIGNS, GX_DISPLAYS, refreshData, cleanGematriaItem } from "./postUnitBody2029.js";
import { chipLabel } from "./unitDocument2029.js";

// mirrors the private LIMITS of the Raziel session request builder (a test reads that file and fails when they drift)
export const RAZIEL_REQUEST_LIMITS = Object.freeze({ question: 300, facts: 1200 });
export const SEGMENT_FACTS_BUDGET = 1000;                       // headroom under 1200 for the outline line and separators

export const REVIEW_TASKS = Object.freeze({
  structure: { label: "ניסוח ומבנה", ask: "שפר ניסוח ומבנה" },
  reorder: { label: "סדר מחדש את היחידה", ask: "הצע סדר מחדש של הבלוקים לקריאה טובה יותר" },
  repeats: { label: "כפילויות וצמצום", ask: "אתר חזרות והסברים כפולים והצע צמצום" },
  gematria: { label: "הוסף גימטריות וחיבורים", ask: "הצע גימטריות לביטויים ביחידה (ביטוי, שיטה, תצוגה) ממקורות ביחידה בלבד" },
  attribution: { label: "קרדיטים, מקורות ושיטות", ask: "בדוק קרדיטים: דברי הכותב מול פרשנות העורך, מקורות ושיטות" },
  layouts: { label: "כמה מבני תצוגה", ask: "הצע שלושה מבני תצוגה (סדר, כותרות, יישור) כמבנה א ו־ב ו־ג" },
});
// the closed grammar Raziel is asked to use (kept short: the whole question is bounded to 300 characters)
const FORMAT = "שורות בלבד: [id] נוסח · [id]= · [+id] פסקה אחריו · [-id] · [~id] סוג=… יישור=… · [>id] אחרי id2 · [+g id] ביטוי|שיטה|תצוגה. מקור — לא לשכתב. בלי חישובים.";
export const FREE_TASK_MAX = 60;

export function segmentUnit(blocks, { budget = SEGMENT_FACTS_BUDGET } = {}) {
  const outline = blocks.filter((b) => !b.locked && (b.kind === "title" || b.kind === "heading")).map((b) => b.text.replace(/[✨✦👑📜]/gu, "").trim().slice(0, 28)).join(" | ").slice(0, 150);
  const prefix = outline ? `כותרות היחידה: ${outline} ¦ ` : "";
  const room = Math.max(300, budget - prefix.length);
  const lines = [];
  const skipped = [];
  for (const block of blocks) {
    if (block.kind === "rule") continue;
    if (block.locked) { const label = `[מקור חיצוני — לא לשכתב: ${chipLabel(block)}]`; if (lines[lines.length - 1]?.text !== label) lines.push({ id: null, text: label }); continue; }
    const body = block.kind === "gematria" ? `⟨גימטריה: ${block.item.phrase} · ${block.item.methodKey} · ${GX_DISPLAYS[block.item.display]}⟩` : block.text;
    const text = `[${block.id}] ${body}`;
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
  return `✦ ערוך עם רזיאל — ${ask}. מקטע ${index}/${total}. ${FORMAT}`;
}

// ---- the answer → proposals ------------------------------------------------------------------------------------------------
const LINE = /^\s*(?:[-*•]|\d+[.)])?\s*\**\[\s*(\+g|\+|-|~|>)?\s*([bn]\d+)\s*\]\**\s*(=)?\s*[:：]?\s*(.*?)\s*$/u;
const VARIANT = /^\s*\**מבנה\s+([א-ת])\**\s*[:：.)-]?\s*\**\s*(.*)$/u;
const MARKS = [["heading", "## "], ["subtitle", "#- "], ["kicker", "#^ "], ["closing", "#! "]];
const KIND_WORDS = Object.freeze({ "פסקה": "p", "כותרת מקטע": "heading", "כותרת משנה": "subtitle", "שורת פתיחה": "kicker", "שורת סיום": "closing" });
const ALIGN_WORDS = Object.freeze({ "ימין": "start", "מרכז": "center", "שמאל": "end" });
const DISPLAY_WORDS = Object.freeze({ ...Object.fromEntries(Object.entries(GX_DISPLAYS).map(([k, v]) => [v, k])), ...Object.fromEntries(Object.keys(GX_DISPLAYS).map((k) => [k, k])) });
const digitsOf = (text) => String(text ?? "").match(/\d{3,}/g) || [];
export const stripQuotes = (text) => String(text ?? "").replace(/^\*+|\*+$/g, "").trim();

export function parseRazielAnswer(answer, blocks, { variant = null } = {}) {
  const byId = new Map(blocks.map((b) => [b.id, b]));
  const known = new Set(blocks.flatMap((b) => digitsOf(b.kind === "gematria" ? "" : b.text)));
  const proposals = [];
  const commentary = [];
  const touched = new Set();
  let unchanged = 0;
  let currentVariant = variant;
  for (const raw of String(answer ?? "").replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const v = line.match(VARIANT);
    if (v && !LINE.test(line)) { currentVariant = v[1]; if (v[2] && commentary.length < 12) commentary.push(`מבנה ${v[1]}: ${v[2]}`.slice(0, 280)); continue; }
    const m = line.match(LINE);
    if (!m) { if (commentary.length < 12) commentary.push(line.slice(0, 280)); continue; }
    const [, sign, ref, equals, rest] = m;
    const block = byId.get(ref);
    const id = `p${proposals.length + 1}`;
    if (equals) { unchanged += 1; continue; }
    const op = sign === "+g" ? "gematria" : sign === "+" ? "add" : sign === "-" ? "remove" : sign === "~" ? "retype" : sign === ">" ? "move" : "edit";
    const base = { id, op, ref, variant: currentVariant, before: block ? block.text : "", after: "", kind: null, align: null, afterRef: null, item: null, status: "proposed", reason: null, flags: [] };
    const reject = (reason, extra = {}) => proposals.push({ ...base, ...extra, status: "rejected", reason });
    if (!block) { reject("unknown_ref", { after: stripQuotes(rest) }); continue; }
    const key = `${op}:${ref}:${currentVariant || ""}`;
    if (op === "retype") {
      const kind = KIND_WORDS[(rest.match(/סוג\s*=\s*([^·|]+?)\s*(?:יישור|$)/) || [])[1]?.trim()] || null;
      const align = ALIGN_WORDS[(rest.match(/יישור\s*=\s*([^·|\s]+)/) || [])[1]?.trim()] || null;
      if (!kind && !align) { reject("empty_text", { after: stripQuotes(rest) }); continue; }
      if (kind && (block.locked || block.kind === "rule" || DATA_KINDS.includes(block.kind) || block.kind === "gematria" || !TEXT_KINDS.includes(block.kind) || (kind === "title") !== (block.kind === "title"))) { reject("not_editable", { kind, align }); continue; }
      if (touched.has(key)) { reject("duplicate", { kind, align }); continue; }
      touched.add(key);
      proposals.push({ ...base, kind, align, after: [kind ? `סוג=${Object.keys(KIND_WORDS).find((w) => KIND_WORDS[w] === kind)}` : null, align ? `יישור=${Object.keys(ALIGN_WORDS).find((w) => ALIGN_WORDS[w] === align)}` : null].filter(Boolean).join(" · ") });
      continue;
    }
    if (op === "move") {
      const target = (rest.match(/(?:אחרי\s*)?([bn]\d+|התחלה)/) || [])[1] || null;
      if (block.kind === "title") { reject("title_required", { afterRef: target }); continue; }
      if (!target || (target !== "התחלה" && !byId.has(target)) || target === ref) { reject("unknown_ref", { afterRef: target }); continue; }
      if (touched.has(key)) { reject("duplicate", { afterRef: target }); continue; }
      touched.add(key);
      proposals.push({ ...base, afterRef: target, after: target === "התחלה" ? "בתחילת היחידה" : `אחרי ${target}` });
      continue;
    }
    if (op === "gematria") {
      const [phrase, methodKey, display, stated, by] = rest.replace(/^גימטריה\s*[:：]\s*/, "").split("|").map((x) => stripQuotes(x).replace(/^(?:ביטוי|שיטה|תצוגה|מקור|של)\s*[:：]\s*/, "").trim());
      const item = cleanGematriaItem({ phrase, methodKey, display: DISPLAY_WORDS[display] || display, ...(stated ? { stated: Number(stated) } : {}), ...(by ? { by } : {}) });
      if (!item) { reject("bad_gematria", { after: stripQuotes(rest) }); continue; }
      proposals.push({ ...base, item, after: `${item.phrase} · ${item.methodKey} · ${GX_DISPLAYS[item.display]}`, flags: [{ code: "engine_value_on_display", method: item.methodKey }] });
      continue;
    }
    let kind = null; let after = stripQuotes(rest);
    const mark = MARKS.find(([, prefix]) => after.startsWith(prefix));
    if (mark) { kind = mark[0]; after = after.slice(mark[1].length).trim(); }
    if (op !== "add" && block.locked) { reject("locked_source", { after }); continue; }
    if (op === "remove" && block.kind === "title") { reject("title_required"); continue; }
    if (op === "edit" && (block.kind === "rule" || block.kind === "gematria")) { reject("not_editable", { after }); continue; }
    if (op !== "remove" && !after) { reject("empty_text"); continue; }
    if (after.length > MAX_TEXT) { reject("too_long", { after }); continue; }
    if (op === "edit" && DATA_KINDS.includes(block.kind) && !refreshData(block, after)) { reject("bad_data", { after }); continue; }
    if (kind && !TEXT_KINDS.includes(kind)) kind = null;
    if (op !== "add" && touched.has(key)) { reject("duplicate", { after }); continue; }
    if (op === "edit" && after === block.text && !kind) { unchanged += 1; continue; }
    if (op !== "add") touched.add(key);
    const newNumbers = op === "remove" ? [] : [...new Set(digitsOf(after))].filter((n) => !known.has(n));
    proposals.push({ ...base, before: op === "add" ? "" : block.text, after: op === "remove" ? "" : after, kind, flags: newNumbers.length ? [{ code: "unverified_numbers", numbers: newNumbers }] : [] });
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
      const key = `${entry.op}:${entry.ref}:${entry.variant || ""}`;
      if (entry.status === "proposed" && !["add", "gematria"].includes(entry.op)) { if (touched.has(key)) { entry.status = "rejected"; entry.reason = "duplicate"; } else touched.add(key); }
      proposals.push(entry);
    }
  }
  const variants = [...new Set(proposals.map((p) => p.variant).filter(Boolean))];
  return { proposals, commentary: commentary.slice(0, 24), unchanged, variants };
}

export const REJECT_LABEL = Object.freeze({ unknown_ref: "מזהה לא קיים ביחידה", locked_source: "מקור חיצוני — אסור לשכתב", title_required: "הכותרת הראשית לא מוסרת ולא מוזזת", not_editable: "לא ניתן לעריכה", empty_text: "נוסח ריק", too_long: "ארוך מדי", duplicate: "הצעה כפולה לאותו בלוק", bad_data: "שורת נתון לא תקינה", bad_gematria: "פריט גימטריה לא תקין (ביטוי | שיטה | תצוגה)" });
export const OP_LABEL = Object.freeze({ edit: "נוסח", add: "פסקה חדשה אחרי", remove: "הסרה", retype: "סוג / יישור", move: "הזזה", gematria: "גימטריה חדשה אחרי" });

// Apply exactly the approved proposals, once, in order, to the current blocks. A source is never rewritten or removed by a proposal (it may be moved / aligned).
export function applyProposals(blocks, proposals, approvedIds) {
  const approved = new Set(approvedIds);
  const list = proposals.filter((p) => p.status === "proposed" && approved.has(p.id));
  let counter = blocks.reduce((max, b) => Math.max(max, /^n(\d+)$/.test(b.id) ? Number(b.id.slice(1)) : 0), 0);
  let out = blocks.map((b) => ({ ...b }));
  const indexOf = (id) => out.findIndex((b) => b.id === id);
  for (const p of list) {
    const at = indexOf(p.ref);
    if (at < 0) continue;
    const block = out[at];
    if (p.op === "edit" && !block.locked) {
      const next = DATA_KINDS.includes(block.kind) ? refreshData(block, p.after) : { ...block, text: p.after, kind: p.kind && (p.kind === "title") === (block.kind === "title") ? p.kind : block.kind };
      if (next) out[at] = next;
    } else if (p.op === "remove" && !block.locked) out.splice(at, 1);
    else if (p.op === "retype") {
      const next = { ...block };
      if (p.kind && !block.locked && TEXT_KINDS.includes(block.kind) && (p.kind === "title") === (block.kind === "title")) next.kind = p.kind;
      if (p.align && ALIGNS.includes(p.align)) next.align = p.align;
      out[at] = next;
    } else if (p.op === "move") {
      const [item] = out.splice(at, 1);
      const to = p.afterRef === "התחלה" ? -1 : indexOf(p.afterRef);
      out.splice(to + 1, 0, item);
    } else if (p.op === "add") out.splice(at + 1, 0, { id: `n${counter += 1}`, kind: p.kind || "p", text: p.after, identity: "editorial", locked: false, added: true });
    else if (p.op === "gematria") out.splice(at + 1, 0, { id: `n${counter += 1}`, kind: "gematria", item: p.item, text: p.item.phrase, identity: "editorial", locked: false, added: true });
  }
  return out;
}

export const proposalCounts = (proposals) => ({ total: proposals.length, proposed: proposals.filter((p) => p.status === "proposed").length, rejected: proposals.filter((p) => p.status === "rejected").length, flagged: proposals.filter((p) => p.flags?.some((f) => f.code === "unverified_numbers")).length });

// a per-segment report that always shows what happened (nothing rejected, cut or unanswered is hidden)
export function segmentReport(plan, answers) {
  return plan.segments.map((segment) => {
    const answer = answers[segment.index - 1];
    const proposals = answer?.parsed?.proposals || [];
    return { index: segment.index, blocks: segment.ids.length, factsChars: segment.facts.length, status: answer ? (answer.ok ? "answered" : "failed") : "not_sent", error: answer?.error || null,
      proposed: proposals.filter((p) => p.status === "proposed").length, rejected: proposals.filter((p) => p.status === "rejected").length, commentary: answer?.parsed?.commentary?.length || 0 };
  });
}
