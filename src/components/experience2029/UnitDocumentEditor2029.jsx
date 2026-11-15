// "גוף היחידה" — ONE continuous editor for the whole unit (ZURIEL 15.11.2026: one unit, one editor, one Raziel, one source of truth).
// The unit is a single document: editorial text is edited in place like any document; every protected source (the writers' words, verses, the four
// numbers, the equations, the table) is an atomic, identified, non-editable chip INSIDE the document. All operations act on the whole unit:
// replace, clear editable content, undo, restore the approved version, full preview, before/after. "✦ ערוך עם רזיאל" uses the EXISTING single
// Raziel session — it only ever returns a proposal; nothing is applied until the person approves it, and one apply is one undo checkpoint.
// Saving is truthful: a browser-local draft (this device only). The canonical write path is prepared in unitFragmentSavePlan2029.js and is not active.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { baseBodyBlocks, resolveBodyBlocks, entriesFromBlocks, diffBody, readBodyDraft, writeBodyDraft, clearBodyDraft, readBodyDraftMeta, writeBodyDraftMeta, textFingerprint, cleanGematriaItem, TEXT_KINDS, ALIGN_LABEL, GX_DISPLAYS, GX_IDENTITIES } from "../../lib/research/postUnitBody2029.js";
import { itemsToBlocks, validateBlocks, restoreMissingSources, clearEditable, blocksToDoc, replaceFromText, findRepeats, wordDiff, DOC_KIND_LABEL } from "../../lib/research/unitDocument2029.js";
import { segmentUnit, buildSegmentQuestion, parseRazielAnswer, mergeProposals, applyProposals, proposalCounts, segmentReport, REVIEW_TASKS, FREE_TASK_MAX, REJECT_LABEL, OP_LABEL } from "../../lib/research/unitRazielReview2029.js";
import { buildPreviewUnitCopy, rebuildPreviewUnitBody } from "../../lib/research/postPreviewUnitDom2029.js";
import { YAMIN_SMOL_APPROVED_TEXT, YAMIN_SMOL_CLAIMS, parseFieldLine } from "../../lib/research/postPreviewUnits2029.js";
import { checkSourceHint, HINT_STATES, collapseSpacedLetters } from "../../lib/research/postSourceHintCheck2029.js";
import { useOptionalRazielSession2029 } from "../../lib/research/RazielSessionProvider2029.jsx";
import { renderDoc, readDoc, paragraphAt, rangeTouchesChip, insertPlainText, gxNode } from "./unitDocumentDom2029.js";
import UnitGematria2029 from "./UnitGematria2029.jsx";
import { loadMethodChoices } from "../../lib/research/unitGematriaTrace2029.js";

const KIND_BUTTONS = ["p", "heading", "subtitle", "kicker", "closing"];
const EMPTY_GX = Object.freeze({ phrase: "", methodKey: "", display: "letters", stated: "", by: "", note: "", where: "after", editNode: null });
const IDENTITY_NAME = Object.freeze({ "yaniv-levi": "יניב לוי", "shachar-kandro": "יצחק שחר קנדרו", editorial: "בנוסח העריכה" });
const sigOf = (blocks) => JSON.stringify(blocks.map((b) => [b.id, b.kind, b.text, b.align || "", b.item || ""]));
const time = (ms) => new Date(ms).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });

function WordDiff({ before, after }) {
  return <span className="sod29-ude-wd" dir="rtl">{wordDiff(before, after).map((part, index) => (part.t === "same" ? <span key={index}>{part.s}</span> : part.t === "del" ? <del key={index}>{part.s}</del> : <ins key={index}>{part.s}</ins>))}</span>;
}

export default function UnitDocumentEditor2029({ unit, unitDef, postId, onPickMessage }) {
  const base = useMemo(() => baseBodyBlocks(), []);
  const baseFingerprint = useMemo(() => textFingerprint(YAMIN_SMOL_APPROVED_TEXT), []);
  const initial = useMemo(() => { const d = readBodyDraft(postId, unitDef.id); return d ? resolveBodyBlocks(d, base) : base; }, [postId, unitDef.id, base]);
  const rootRef = useRef(null);
  const blocksRef = useRef(initial);
  const savedRef = useRef(initial);
  const removedRef = useRef(new Set());                       // sources the person explicitly REMOVED from the unit (an approved removal is never an accident)
  const lastValidRef = useRef(initial);                       // an undo checkpoint is always a VALID document, never a half-broken intermediate
  const historyRef = useRef([]);
  const typedRef = useRef(false);
  const timer = useRef(0);
  const [blocks, setBlocksState] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [errors, setErrors] = useState([]);
  const [notices, setNotices] = useState([]);
  const [note, setNote] = useState("");
  const [panel, setPanel] = useState(null);                     // null | replace | diff | preview | raziel
  const [historyDepth, setHistoryDepth] = useState(0);
  const [caret, setCaret] = useState({ kind: null, text: "" });
  const [replaceText, setReplaceText] = useState("");
  const [meta, setMeta] = useState(() => readBodyDraftMeta(postId, unitDef.id));
  const previewRef = useRef(null);

  const setBlocks = (next) => { blocksRef.current = next; setBlocksState(next); };
  const dirty = sigOf(blocks) !== sigOf(saved);
  const diff = useMemo(() => diffBody(base, blocks), [base, blocks]);
  const invalid = errors.length > 0;

  // draw the document once, and again only for a programmatic change (typing never re-draws: the caret stays)
  useEffect(() => { if (rootRef.current) renderDoc(rootRef.current, initial); try { document.execCommand("defaultParagraphSeparator", false, "p"); } catch { /* optional */ } }, [initial]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const missingSources = (list) => new Set(base.filter((b) => b.locked && !list.some((x) => x.id === b.id)).map((b) => b.id));
  const pushCheckpoint = () => { const snap = validateBlocks(blocksRef.current, base, removedRef.current).ok ? blocksRef.current : lastValidRef.current; historyRef.current = [...historyRef.current.slice(-29), snap]; setHistoryDepth(historyRef.current.length); };
  const sync = useCallback(() => {
    const root = rootRef.current; if (!root) return;
    const result = itemsToBlocks(readDoc(root), base, { removed: removedRef.current });
    if (!typedRef.current && sigOf(result.blocks) !== sigOf(blocksRef.current)) { pushCheckpoint(); typedRef.current = true; }
    setBlocks(result.blocks); setErrors(result.errors); setNotices(result.notices);
    if (result.ok) lastValidRef.current = result.blocks;
  }, [base]);
  const scheduleSync = () => { window.clearTimeout(timer.current); timer.current = window.setTimeout(sync, 220); };
  // a programmatic change of the WHOLE document: one checkpoint, redraw, validated
  const commit = (next, message, removed = new Set()) => {
    window.clearTimeout(timer.current);
    pushCheckpoint(); typedRef.current = false;
    removedRef.current = removed;
    const check = validateBlocks(next, base, removed);
    setBlocks(next); setErrors(check.errors); setNotices([]);
    if (check.ok) lastValidRef.current = next;
    if (rootRef.current) renderDoc(rootRef.current, next);
    setNote(message);
  };

  // ---- document operations ----
  const undo = () => {
    window.clearTimeout(timer.current);
    const previous = historyRef.current.pop(); setHistoryDepth(historyRef.current.length);
    if (!previous) return;
    typedRef.current = false; lastValidRef.current = previous; removedRef.current = missingSources(previous); setBlocks(previous); setErrors(validateBlocks(previous, base, removedRef.current).errors); setNotices([]);
    renderDoc(rootRef.current, previous); setNote("הפעולה האחרונה בוטלה");
  };
  const restoreApproved = () => commit(base, "הנוסח המאושר הוחזר לעורך (עדיין לא נשמר כטיוטה)");
  const clearAll = () => { if (window.confirm("לנקות את כל טקסט העריכה והנתונים? המקורות החיצוניים נשארים. אפשר לבטל.")) commit(clearEditable(blocksRef.current), "הטקסט והנתונים נוקו — המקורות החיצוניים נשארו"); };
  const restoreSources = () => commit(restoreMissingSources(blocksRef.current, base, removedRef.current), "המקורות שהוסרו הוחזרו למקומם בנוסח המאושר", removedRef.current);
  const copyDoc = async () => { try { await navigator.clipboard.writeText(blocksToDoc(blocksRef.current, { base })); setNote("כל המסמך הועתק (המקורות כסימונים [[מקור …]])"); } catch { setNote("ההעתקה נכשלה — פתחו ״החלפת התוכן״ כדי לראות את המסמך כטקסט"); } };
  const saveDraft = () => {
    if (invalid) { setNote("אי אפשר לשמור: יש שגיאות באימות המקורות (ראו למעלה). לא נשמר דבר."); return; }
    const entries = entriesFromBlocks(blocksRef.current, base);
    const resolved = resolveBodyBlocks(entries, base);
    if (sigOf(resolved) !== sigOf(blocksRef.current)) { setNote("הטיוטה נדחתה בבדיקה הסופית (המקורות או הסדר אינם תואמים לנוסח המאושר). לא נשמר דבר."); return; }
    if (!writeBodyDraft(postId, unitDef.id, entries)) { setNote("השמירה בדפדפן נכשלה. לא נשמר דבר."); return; }
    const info = { savedAt: Date.now(), baseFingerprint, blocks: resolved.length, changes: diffBody(base, resolved).count };
    writeBodyDraftMeta(postId, unitDef.id, info); setMeta({ scope: "local-browser-draft", ...info });
    savedRef.current = resolved; setSaved(resolved);
    rebuildPreviewUnitBody(unit, unitDef, resolved, { draft: true });
    setNote("נשמר כטיוטה מקומית — בדפדפן הזה בלבד · היחידה בפוסט עודכנה אצלך · לא פורסם, אין כתיבה ל־DB");
  };
  const discardDraft = () => {
    clearBodyDraft(postId, unitDef.id); setMeta(null); savedRef.current = base; setSaved(base);
    rebuildPreviewUnitBody(unit, unitDef, base, { draft: false });
    commit(base, "הטיוטה המקומית נמחקה — הנוסח המאושר מוצג");
  };

  // ---- the editor surface: guards that keep protected chips intact ----
  const onKeyDown = (event) => {
    const root = rootRef.current; if (!root || (event.key !== "Backspace" && event.key !== "Delete")) return;
    const sel = document.getSelection(); if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (rangeTouchesChip(root, range)) { event.preventDefault(); setNote("הבחירה כוללת מקור מוגן — הוא לא נמחק. בחרו רק טקסט עריכה."); return; }
    if (!range.collapsed) return;
    const p = paragraphAt(root, range.startContainer); if (!p) return;
    const atStart = range.startOffset === 0 && (range.startContainer === p || range.startContainer === p.firstChild || !p.firstChild);
    const atEnd = range.startContainer.nodeType === 3 ? range.startOffset === range.startContainer.nodeValue.length && !range.startContainer.nextSibling : range.startOffset >= p.childNodes.length;
    const neighbour = event.key === "Backspace" ? (atStart ? p.previousElementSibling : null) : (atEnd ? p.nextElementSibling : null);
    if (neighbour && neighbour.hasAttribute("data-refs")) {
      event.preventDefault();
      if (!p.textContent.trim()) { p.remove(); scheduleSync(); } else setNote("מקור מוגן — אי אפשר למחוק אותו מכאן.");
    }
  };
  const onBeforeInput = (event) => {
    const root = rootRef.current; const type = event.inputType || "";
    if (type.startsWith("format")) { event.preventDefault(); return; }                                  // no rich text: plain paragraphs only
    if (/^(delete|insert)/.test(type) && !type.includes("Paste")) {
      const sel = document.getSelection();
      if (sel && sel.rangeCount && rangeTouchesChip(root, sel.getRangeAt(0))) { event.preventDefault(); setNote("הבחירה כוללת מקור מוגן — הוא לא שונה. בחרו רק טקסט עריכה."); }
    }
  };
  const onPaste = (event) => {
    event.preventDefault();
    const root = rootRef.current; const text = event.clipboardData?.getData("text/plain") || "";
    if (!text) return;
    const sel = document.getSelection();
    if (sel && sel.rangeCount && rangeTouchesChip(root, sel.getRangeAt(0))) { setNote("הבחירה כוללת מקור מוגן — לא הודבק דבר."); return; }
    if (/\[\[מקור\s/.test(text)) { setNote("בטקסט יש סימוני מקור. להדבקת מסמך שלם השתמשו ב״החלפת התוכן״ — שם המקורות נבדקים."); return; }
    if (insertPlainText(root, text)) scheduleSync();
  };
  const onDrop = (event) => { event.preventDefault(); setNote("גרירה אינה נתמכת — הדביקו או הקלידו."); };
  useEffect(() => {
    const onSel = () => {
      const root = rootRef.current; const sel = document.getSelection();
      if (!root || !sel || !sel.rangeCount || !root.contains(sel.anchorNode)) return;
      const p = paragraphAt(root, sel.anchorNode);
      setCaret(p ? { kind: p.getAttribute("data-kind"), text: p.textContent.trim(), el: p } : { kind: null, text: "" });
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, []);
  const setKind = (kind) => { if (caret.el && caret.el.getAttribute("data-kind") !== "title") { caret.el.setAttribute("data-kind", kind); setCaret({ ...caret, kind }); sync(); } };

  // ---- the selected block: move, align, remove (paragraphs, data lines, gematria items and source chips alike) ----
  const [sel, setSel] = useState(null);
  const currentEl = () => { const root = rootRef.current; if (sel && root?.contains(sel)) return sel; if (caret.el && root?.contains(caret.el)) return caret.el; return null; };
  const onDocClick = (event) => {
    const root = rootRef.current; if (!root) return;
    const target = event.target.closest ? event.target.closest("[data-refs],[data-gx]") : null;
    root.querySelectorAll(".is-selected").forEach((node) => node.classList.remove("is-selected"));
    if (target && root.contains(target)) { target.classList.add("is-selected"); setSel(target); } else setSel(null);
  };
  const moveBlock = (dir) => { const el = currentEl(); if (!el) return; const sib = dir < 0 ? el.previousElementSibling : el.nextElementSibling; if (!sib) return; if (dir < 0) sib.before(el); else sib.after(el); el.scrollIntoView({ block: "nearest" }); sync(); setNote(dir < 0 ? "הבלוק הוזז מעלה" : "הבלוק הוזז מטה"); };
  const alignBlock = (align) => { const el = currentEl(); if (!el) return; if (align) el.setAttribute("data-align", align); else el.removeAttribute("data-align"); sync(); setNote(align ? `יישור ${ALIGN_LABEL[align]} — העדפת תצוגה בלבד, הטקסט לא שונה` : "היישור חזר לברירת המחדל"); };
  const deleteBlock = () => {
    const el = currentEl(); if (!el) return;
    if (el.hasAttribute("data-refs")) {
      if (!window.confirm("להסיר את המקור מהיחידה? נוסח המקור הקנוני אינו נמחק, ואפשר לבטל.")) return;
      el.getAttribute("data-refs").split(",").forEach((ref) => removedRef.current.add(ref));
    }
    el.remove(); setSel(null); sync(); setNote("הבלוק הוסר מהיחידה (אפשר לבטל)");
  };

  // ---- + add / edit a gematria item (a REFERENCE: the shared component rebuilds it from the canonical engine) ----
  const [gx, setGx] = useState(EMPTY_GX);
  const [choices, setChoices] = useState({ loading: false, rows: [], asked: "" });
  const gxItem = useMemo(() => cleanGematriaItem({ phrase: gx.phrase, methodKey: gx.methodKey, display: gx.display, stated: gx.stated, by: gx.by || undefined, note: gx.note }), [gx]);
  const candidates = useMemo(() => {
    const out = [];
    for (const b of blocks) {
      const field = b.kind === "claim" ? parseFieldLine(b.text) : null;
      const text = field ? (field.label === "הביטוי" ? field.value : null) : b.kind === "claim" ? b.text.split(/\s=\s/)[0] : b.kind === "verse" ? b.text : null;
      const clean = text && text.replace(/[«»״"]/g, "").replace(/\s+/g, " ").trim();
      if (clean && clean.length >= 2 && !out.includes(clean)) out.push(clean);
    }
    return out.slice(0, 40);
  }, [blocks]);
  const openGx = (node = null) => {
    let g = null; try { g = node ? JSON.parse(node.getAttribute("data-gx")) : null; } catch { g = null; }
    setGx(g ? { ...EMPTY_GX, phrase: g.phrase, methodKey: g.methodKey, display: g.display, stated: g.stated ?? "", by: g.by || "", note: g.note || "", editNode: node } : { ...EMPTY_GX });
    setChoices({ loading: false, rows: [], asked: "" }); setPanel("gx");
  };
  const loadChoices = async () => {
    const phrase = gx.phrase.trim(); if (!phrase) return;
    setChoices({ loading: true, rows: [], asked: phrase });
    const rows = await loadMethodChoices(phrase);
    setChoices({ loading: false, rows, asked: phrase });
    setGx((f) => (f.methodKey || !rows.length ? f : { ...f, methodKey: (rows.find((r) => r.key === "regular") || rows[0]).key }));
  };
  const submitGx = () => {
    const root = rootRef.current; if (!gxItem || !root) return;
    const editing = gx.editNode && root.contains(gx.editNode) ? gx.editNode : null;
    const node = gxNode(document, { item: gxItem, align: editing ? editing.getAttribute("data-align") || null : null });
    if (editing) editing.replaceWith(node);
    else { const ref = currentEl(); if (gx.where === "start") root.prepend(node); else if (gx.where === "end" || !ref) root.append(node); else ref.after(node); }
    sync(); setPanel(null); setSel(null);
    setNote(editing ? "פריט הגימטריה עודכן — הנתונים נקראים מהמנוע בכל הצגה" : "נוספה גימטריה — מוצגת מהמנוע הקנוני; אפשר להזיז, ליישר ולהוסיף עוד");
  };

  // ---- panels ----
  useEffect(() => {
    if (panel !== "preview" || !previewRef.current) return undefined;
    previewRef.current.replaceChildren(buildPreviewUnitCopy(document, unitDef, blocks));
    // the gematria items of the unit are drawn by the SAME shared component the Post uses
    const roots = [...previewRef.current.querySelectorAll("[data-pu-gx]")].map((node) => {
      let item = null; try { item = cleanGematriaItem(JSON.parse(node.getAttribute("data-gx-item"))); } catch { item = null; }
      if (!item) return null;
      const root = createRoot(node); root.render(<UnitGematria2029 item={item} align={node.getAttribute("data-gx-align")} eager />); return root;
    }).filter(Boolean);
    return () => { window.setTimeout(() => roots.forEach((root) => root.unmount()), 0); };
  }, [panel, blocks, unitDef]);
  const parsedReplace = useMemo(() => (panel === "replace" ? replaceFromText(replaceText, base) : null), [panel, replaceText, base]);
  const openReplace = () => { setReplaceText(blocksToDoc(blocksRef.current, { base })); setPanel("replace"); };

  // ---- ✦ Raziel (the existing single session) ----
  const session = useOptionalRazielSession2029();
  const sessionRef = useRef(session);
  sessionRef.current = session;
  // the session's `busy` flag follows its reducer, i.e. the next render: consecutive turns of ONE review wait for the session to be idle again
  const waitIdle = async () => { for (let i = 0; i < 120 && sessionRef.current?.busy; i += 1) await new Promise((resolve) => window.setTimeout(resolve, 50)); return !sessionRef.current?.busy; };
  const [task, setTask] = useState("structure");
  const [free, setFree] = useState("");
  const [review, setReview] = useState(null);                   // null | { status, step, total, proposals, commentary, error, approved:Set, skipped }
  const cancelRef = useRef(false);
  const [engine, setEngine] = useState(null);
  const repeats = useMemo(() => findRepeats(blocks), [blocks]);
  const runRaziel = async () => {
    if (!session || session.busy || review?.status === "running") return;
    if (invalid) { setNote("תקנו קודם את שגיאות המקורות — רזיאל בודק מסמך תקין."); return; }
    if (task === "free" && !free.trim()) return;
    const plan = segmentUnit(blocksRef.current);
    if (!plan.segments.length) { setReview({ status: "done", proposals: [], commentary: [], approved: new Set(), skipped: plan.skipped, report: [], error: "אין טקסט עריכה לבדיקה." }); return; }
    cancelRef.current = false;
    const answers = []; let failure = null;
    for (const segment of plan.segments) {
      if (cancelRef.current) { failure = "cancelled"; break; }
      if (!(await waitIdle())) { failure = "session_busy"; break; }
      setReview({ status: "running", step: segment.index, total: segment.total, proposals: [], commentary: [], approved: new Set(), skipped: plan.skipped, report: segmentReport(plan, answers) });
      const result = await session.submit({ question: buildSegmentQuestion({ task, index: segment.index, total: segment.total, free }), facts: segment.facts, intelligenceLevel: "fast" });
      if (!result?.ok || !result.response?.answer) { failure = result?.error || "unavailable"; answers.push({ ok: false, error: failure }); break; }
      answers.push({ ok: true, parsed: parseRazielAnswer(result.response.answer, blocksRef.current) });
    }
    const merged = mergeProposals(answers.filter((a) => a.ok).map((a) => a.parsed));
    setReview({ status: failure ? "partial" : "done", proposals: merged.proposals, commentary: merged.commentary, unchanged: merged.unchanged, variants: merged.variants, variant: merged.variants[0] || null, approved: new Set(), skipped: plan.skipped, error: failure, segments: plan.segments.length, answered: answers.filter((a) => a.ok).length, report: segmentReport(plan, answers) });
  };
  const toggleApproved = (id) => setReview((r) => { const approved = new Set(r.approved); if (approved.has(id)) approved.delete(id); else approved.add(id); return { ...r, approved }; });
  const visible = (r, p) => !r.variant || !p.variant || p.variant === r.variant;
  const approveAll = (on) => setReview((r) => ({ ...r, approved: on ? new Set(r.proposals.filter((p) => p.status === "proposed" && visible(r, p) && !p.flags?.some((f) => f.code === "unverified_numbers")).map((p) => p.id)) : new Set() }));
  const snippet = (id) => { const b = blocksRef.current.find((x) => x.id === id); return b ? (b.kind === "gematria" ? `גימטריה: ${b.item.phrase}` : b.text).slice(0, 56) : id; };
  const applyApproved = () => {
    if (!review || !review.approved.size) return;
    const next = applyProposals(blocksRef.current, review.proposals, review.approved);
    const check = validateBlocks(next, base);
    if (!check.ok) { setNote("ההצעות לא הוחלו: הן היו פוגעות במקורות המוגנים."); return; }
    commit(next, `הוחלו ${review.approved.size} הצעות מאושרות כפעולה אחת — אפשר לבטל. עדיין לא נשמר כטיוטה.`);
    setReview(null);
  };
  const runEngine = async () => {
    setEngine({ running: true, rows: [] });
    const rows = [];
    for (const claim of YAMIN_SMOL_CLAIMS) {
      const result = await checkSourceHint({ expression: collapseSpacedLetters(claim.phrase).text, stated: claim.number, methodText: claim.methodText }).catch(() => null);
      rows.push({ claim, result });
      setEngine({ running: true, rows: [...rows] });
    }
    setEngine({ running: false, rows });
  };

  const counts = review ? proposalCounts(review.proposals || []) : null;
  const stateLine = invalid ? <b className="is-bad">● יש שגיאות באימות המקורות — השמירה חסומה</b>
    : dirty ? <b>● שינויים שלא נשמרו ({diff.count} מול הנוסח המאושר)</b>
    : meta ? <>טיוטה מקומית שמורה ({time(meta.savedAt)}) · {diff.count} שינויים מול המאושר</> : "הנוסח המאושר — ללא שינויים";

  return <div className="sod29-ude" data-ude-dirty={dirty ? "true" : "false"} data-ude-invalid={invalid ? "true" : "false"}>
    <p className="sod29-ude-state" role="status">{stateLine}</p>
    <p className="sod29-ude-scope" data-ude-scope="local-draft">טיוטה מקומית בלבד: נשמרת בדפדפן הזה, לא פורסמה ולא נראית במכשיר אחר. פרסום הוא החלטה נפרדת.</p>

    <div className="sod29-ude-bar" role="toolbar" aria-label="פעולות על כל היחידה">
      <button type="button" className="is-primary" data-ude-add-gx onClick={() => openGx(null)}>+ הוסף גימטריה</button>
      <button type="button" className="is-raziel" data-ude-raziel onClick={() => setPanel(panel === "raziel" ? null : "raziel")} aria-expanded={panel === "raziel"}>✦ ערוך עם רזיאל</button>
      <button type="button" onClick={openReplace}>החלפת התוכן</button>
      <button type="button" onClick={clearAll}>ניקוי טקסט העריכה</button>
      <button type="button" onClick={undo} disabled={!historyDepth}>ביטול ↶</button>
      <button type="button" onClick={restoreApproved} disabled={!diff.changed}>הנוסח המאושר</button>
      <button type="button" onClick={() => setPanel(panel === "preview" ? null : "preview")} aria-expanded={panel === "preview"}>תצוגה מלאה</button>
      <button type="button" onClick={() => setPanel(panel === "diff" ? null : "diff")} aria-expanded={panel === "diff"} disabled={!diff.changed}>לפני / אחרי</button>
      <button type="button" onClick={copyDoc}>העתק מסמך</button>
    </div>
    <div className="sod29-ude-kinds" role="toolbar" aria-label="סוג הפסקה בסמן">
      <span>הפסקה בסמן:</span>
      {KIND_BUTTONS.map((kind) => <button key={kind} type="button" aria-pressed={caret.kind === kind} disabled={!caret.kind || !TEXT_KINDS.includes(caret.kind) || caret.kind === "title"} onMouseDown={(e) => e.preventDefault()} onClick={() => setKind(kind)}>{DOC_KIND_LABEL[kind]}</button>)}
      {onPickMessage ? <button type="button" disabled={!caret.text || caret.kind === "title"} onMouseDown={(e) => e.preventDefault()} onClick={() => onPickMessage(caret.text)}>הפוך למסר הראשי</button> : null}
    </div>

    <div className="sod29-ude-blockbar" role="toolbar" aria-label="פעולות על הבלוק הנבחר" data-ude-blockbar>
      <span>{currentEl() ? `בלוק: ${currentEl().hasAttribute("data-refs") ? "מקור חיצוני" : currentEl().hasAttribute("data-gx") ? "גימטריה" : (DOC_KIND_LABEL[currentEl().getAttribute("data-kind")] || "פסקה")}` : "בחרו בלוק (לחיצה על שבב / גימטריה, או סמן בפסקה)"}</span>
      <button type="button" disabled={!currentEl()} onMouseDown={(e) => e.preventDefault()} onClick={() => moveBlock(-1)} data-ude-act="up">↑ הזז מעלה</button>
      <button type="button" disabled={!currentEl()} onMouseDown={(e) => e.preventDefault()} onClick={() => moveBlock(1)} data-ude-act="down">↓ הזז מטה</button>
      {["start", "center", "end"].map((a) => <button key={a} type="button" disabled={!currentEl()} aria-pressed={currentEl()?.getAttribute("data-align") === a} onMouseDown={(e) => e.preventDefault()} onClick={() => alignBlock(a)} data-ude-act={`align-${a}`}>יישור {ALIGN_LABEL[a]}</button>)}
      <button type="button" disabled={!currentEl()?.getAttribute("data-align")} onMouseDown={(e) => e.preventDefault()} onClick={() => alignBlock(null)}>איפוס יישור</button>
      {currentEl()?.hasAttribute("data-gx") ? <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => openGx(currentEl())} data-ude-act="edit-gx">✎ ערוך גימטריה</button> : null}
      <button type="button" disabled={!currentEl() || currentEl().getAttribute("data-kind") === "title"} onMouseDown={(e) => e.preventDefault()} onClick={deleteBlock} data-ude-act="delete">{currentEl()?.hasAttribute("data-refs") ? "הסר מהיחידה" : "מחק בלוק"}</button>
    </div>

    {invalid ? <div className="sod29-ude-errors" role="alert">
      {errors.map((e, i) => <p key={i} data-ude-error={e.code}>{e.message}</p>)}
      {errors.some((e) => e.code === "missing_source") ? <button type="button" onClick={restoreSources}>החזר את המקורות למקומם</button> : null}
    </div> : null}
    {notices.length ? <p className="sod29-ude-notices" role="status">{notices.join(" · ")}</p> : null}

    <div ref={rootRef} className="sod29-ude-doc" dir="rtl" contentEditable suppressContentEditableWarning spellCheck lang="he" role="textbox" aria-multiline="true"
      aria-label="גוף היחידה — מסמך אחד מתחילתו ועד סופו" data-ude-doc onInput={scheduleSync} onClick={onDocClick} onKeyDown={onKeyDown} onBeforeInput={onBeforeInput} onPaste={onPaste} onDrop={onDrop} />

    {panel === "replace" && parsedReplace ? <section className="sod29-ude-panel" aria-label="החלפת התוכן" data-ude-panel="replace">
      <h4>החלפת התוכן — הדביקו מסמך שלם</h4>
      <p className="sod29-ude-hint">שורה = פסקה. סימונים: <code># </code>כותרת ראשית · <code>## </code>מקטע · <code>#- </code>משנה · <code>#^ </code>פתיחה · <code>#! </code>סיום · <code>#N </code>ארבעת המספרים · <code>#P </code>מספר בולט · <code>#C </code>משוואה · <code>#R </code>שורת טבלה · <code>---</code> מפריד · יישור: <code>{"{מרכז}"}</code> <code>{"{שמאל}"}</code> <code>{"{ימין}"}</code> בתחילת שורה · גימטריה: <code>{"[[גימטריה | ביטוי | שיטה | תצוגה | טענה | של]]"}</code> · מקור חיצוני: <code>{"[[מקור b24–b26 · …]]"}</code> (נוסחו נשמר) · הסרת מקור מהיחידה באישור: <code>{"[[הסרת מקור b33]]"}</code>.</p>
      <textarea dir="rtl" rows={12} value={replaceText} onChange={(e) => setReplaceText(e.target.value)} aria-label="המסמך כטקסט" data-ude-replace-text />
      {parsedReplace.errors.map((e, i) => <p key={i} className="is-bad" data-ude-replace-error={e.code}>{e.message}</p>)}
      {parsedReplace.notices.map((n, i) => <p key={i} className="sod29-ude-hint">{n}</p>)}
      {parsedReplace.ok ? <p className="is-good">✓ המסמך תקין: {parsedReplace.blocks.length} בלוקים, כל המקורות המוגנים במקומם.</p> : null}
      <div className="sod29-ude-actions">
        <button type="button" className="is-primary" disabled={!parsedReplace.ok} onClick={() => { commit(parsedReplace.blocks, "התוכן הוחלף (כפעולה אחת, אפשר לבטל). עדיין לא נשמר כטיוטה.", parsedReplace.removed); setPanel(null); }}>החל את המסמך</button>
        {parsedReplace.errors.some((e) => e.code === "missing_source") ? <button type="button" onClick={() => setReplaceText(blocksToDoc(restoreMissingSources(parsedReplace.blocks, base, parsedReplace.removed)))}>השלם את המקורות החסרים למקומם</button> : null}
        <button type="button" onClick={() => setPanel(null)}>סגירה</button>
      </div>
    </section> : null}

    {panel === "gx" ? <section className="sod29-ude-panel" aria-label="הוספת גימטריה" data-ude-panel="gx">
      <h4>{gx.editNode ? "עריכת גימטריה" : "+ הוסף גימטריה"}</h4>
      <p className="sod29-ude-hint">כל גימטריה היא הפניה בלבד: ביטוי + שיטה + סוג תצוגה. הערך, הפירוק והעיצוב נקראים מהמנוע הקנוני ומהרכיב המשותף בכל הצגה — לא נשמרים ביחידה. אפשר להוסיף כמה ממצאים של אותו מספר, ממקורות ושיטות שונים; הם לא מתאחדים.</p>
      <label>ביטוי או פסוק<input type="text" dir="rtl" value={gx.phrase} maxLength={200} data-ude-gx-phrase onChange={(e) => setGx({ ...gx, phrase: e.target.value, methodKey: "" })} onBlur={loadChoices} placeholder="הקלידו ביטוי…" /></label>
      {candidates.length ? <label>או בחרו מתוך המסמך<select value="" onChange={(e) => { if (e.target.value) setGx({ ...gx, phrase: e.target.value, methodKey: "" }); }}><option value="">מתוך מקור קיים…</option>{candidates.map((c) => <option key={c} value={c}>{c.slice(0, 60)}</option>)}</select></label> : null}
      <div className="sod29-ude-actions"><button type="button" data-ude-gx-load disabled={!gx.phrase.trim() || choices.loading} onClick={loadChoices}>טען שיטות מהמנוע</button>{choices.loading ? <span role="status">קורא מהמנוע…</span> : null}</div>
      <label>שיטת גימטריה<select value={gx.methodKey} data-ude-gx-method onChange={(e) => setGx({ ...gx, methodKey: e.target.value })} disabled={!choices.rows.length && !gx.methodKey}>
        <option value="">{choices.rows.length ? "בחרו שיטה…" : choices.asked ? "המנוע לא החזיר שיטות לביטוי" : "טענו שיטות…"}</option>
        {gx.methodKey && !choices.rows.some((r) => r.key === gx.methodKey) ? <option value={gx.methodKey}>{gx.methodKey}</option> : null}
        {choices.rows.map((r) => <option key={r.key} value={r.key}>{r.label} · {r.value}</option>)}</select></label>
      <label>סוג תצוגה<select value={gx.display} data-ude-gx-display onChange={(e) => setGx({ ...gx, display: e.target.value })}>{Object.entries(GX_DISPLAYS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <label>טענת מקור (לא חובה — המספר שהמקור טען; הפער מול המנוע יוצג)<input type="text" inputMode="numeric" dir="ltr" value={gx.stated} data-ude-gx-stated onChange={(e) => setGx({ ...gx, stated: e.target.value.replace(/[^\d]/g, "").slice(0, 6) })} /></label>
      <label>של מי הממצא<select value={gx.by} data-ude-gx-by onChange={(e) => setGx({ ...gx, by: e.target.value })}><option value="">ללא ייחוס</option>{GX_IDENTITIES.map((id) => <option key={id} value={id}>{IDENTITY_NAME[id]}</option>)}</select></label>
      <label>הערה קצרה (לא חובה)<input type="text" dir="rtl" maxLength={120} value={gx.note} onChange={(e) => setGx({ ...gx, note: e.target.value })} /></label>
      {!gx.editNode ? <label>מיקום<select value={gx.where} data-ude-gx-where onChange={(e) => setGx({ ...gx, where: e.target.value })}><option value="after">אחרי הבלוק הנבחר / הפסקה בסמן</option><option value="start">בתחילת היחידה</option><option value="end">בסוף היחידה</option></select></label> : null}
      {gxItem ? <div className="sod29-reading-post r29" data-reality-map="preview_acceptance_exception"><div className="sod29-reading-source" data-ude-gx-preview><UnitGematria2029 key={JSON.stringify(gxItem)} item={gxItem} eager /></div></div> : <p className="sod29-ude-hint" role="status">בחרו ביטוי ושיטה כדי לראות תצוגה מקדימה מהמנוע.</p>}
      <div className="sod29-ude-actions">
        <button type="button" className="is-primary" data-ude-gx-submit disabled={!gxItem} onClick={submitGx}>{gx.editNode ? "עדכן גימטריה" : "הוסף לתוך המסמך"}</button>
        <button type="button" onClick={() => setPanel(null)}>סגירה</button>
      </div>
    </section> : null}

    {panel === "diff" ? <section className="sod29-ude-panel" aria-label="לפני ואחרי" data-ude-panel="diff">
      <h4>לפני / אחרי — {diff.count} שינויים מול הנוסח המאושר</h4>
      {!diff.changed ? <p>אין שינויים.</p> : <ol className="sod29-ude-diff">{diff.ops.map((op, i) => <li key={i} data-op={op.op}>
        <b>{{ edited: "נערך", added: "נוסף", removed: op.source ? "מקור הוסר מהיחידה" : "הוסר", moved: "הוזז", retyped: "סוג שונה", aligned: "יישור" }[op.op]}</b>
        {op.op === "edited" ? <WordDiff before={op.before} after={op.after} /> : null}
        {op.op === "added" ? <ins>{op.text}</ins> : null}
        {op.op === "removed" ? <del>{op.text}</del> : null}
        {op.op === "retyped" ? <span>{DOC_KIND_LABEL[op.from]} ← {DOC_KIND_LABEL[op.to]}</span> : null}
        {op.op === "aligned" ? <span>{op.id} · {ALIGN_LABEL[op.to] || "ברירת מחדל"}</span> : null}
        {op.op === "moved" ? <span>{op.id} → מקום {op.toIndex + 1}</span> : null}
      </li>)}</ol>}
    </section> : null}

    {panel === "preview" ? <section className="sod29-ude-panel" aria-label="תצוגה מלאה" data-ude-panel="preview">
      <h4>תצוגה מלאה — כך תיראה היחידה בפוסט</h4>
      <div className="sod29-reading-post r29" data-reality-map="preview_acceptance_exception"><div className="sod29-reading-source"><div ref={previewRef} /></div></div>
    </section> : null}

    {panel === "raziel" ? <section className="sod29-ude-panel sod29-ude-raziel" aria-label="עריכה עם רזיאל" data-ude-panel="raziel">
      <h4>✦ ערוך עם רזיאל</h4>
      <p className="sod29-ude-hint">זו אותה שיחת רזיאל היחידה של האתר (היא תופיע גם בבן־הלוויה). רזיאל מציע בלבד: שום דבר לא משתנה, לא נשמר ולא מתפרסם עד שתאשרו. החישובים אינם של המודל — הם נבדקים במנוע הקנוני. היחידה נשלחת במקטעים (הבקשה הקיימת מוגבלת ל־{1200} תווי עובדות), ומאוחדת להצעה אחת.</p>
      {!session ? <p className="is-bad" data-ude-raziel-unavailable>רזיאל אינו זמין בעמוד הזה.</p> : null}
      <fieldset className="sod29-ude-tasks" disabled={!session || review?.status === "running"}>
        <legend>מה לבדוק</legend>
        {Object.entries(REVIEW_TASKS).map(([key, def]) => <label key={key}><input type="radio" name="ude-task" checked={task === key} onChange={() => setTask(key)} /> {def.label}</label>)}
        <label><input type="radio" name="ude-task" checked={task === "free"} onChange={() => setTask("free")} /> אחר:</label>
        <input type="text" dir="rtl" maxLength={FREE_TASK_MAX} value={free} disabled={task !== "free"} onChange={(e) => setFree(e.target.value)} placeholder={`עד ${FREE_TASK_MAX} תווים`} aria-label="הנחיה חופשית" />
      </fieldset>
      <div className="sod29-ude-actions">
        <button type="button" className="is-primary" data-ude-raziel-run disabled={!session || session.busy || review?.status === "running" || invalid} onClick={runRaziel}>שלח לרזיאל</button>
        {review?.status === "running" ? <button type="button" onClick={() => { cancelRef.current = true; }}>עצור אחרי המקטע הנוכחי</button> : null}
      </div>
      {review?.status === "running" ? <p role="status" data-ude-raziel-progress>רזיאל קורא מקטע {review.step} מתוך {review.total}…</p> : null}
      {review && review.status !== "running" ? <div data-ude-raziel-result>
        {review.error ? <p className="is-bad" role="alert">{review.error === "cancelled" ? "נעצר לפי בקשתך." : `רזיאל לא החזיר תשובה לכל המקטעים (${review.error}). מוצגות רק התשובות שהתקבלו (${review.answered ?? 0}/${review.segments ?? 0}).`}</p> : null}
        {review.skipped?.length ? <p className="is-bad">לא נשלחו (ארוכים מדי לבקשה אחת): {review.skipped.map((s) => s.id).join(", ")}</p> : null}
        {counts && counts.total ? <>
          <p>{counts.proposed} הצעות · {counts.rejected} נדחו אוטומטית · {review.unchanged || 0} בלוקים ללא שינוי{counts.flagged ? ` · ${counts.flagged} עם מספר שלא אומת` : ""}</p>
          {review.variants?.length ? <div className="sod29-ude-variants" role="tablist" aria-label="מבני תצוגה">{review.variants.map((v) => <button key={v} type="button" role="tab" aria-selected={review.variant === v} data-ude-variant={v} onClick={() => setReview((r) => ({ ...r, variant: v, approved: new Set() }))}>מבנה {v}</button>)}<span className="sod29-ude-hint">הצעות של מבנה אחד בלבד מוחלות יחד</span></div> : null}
          <ol className="sod29-ude-proposals">{review.proposals.filter((p) => visible(review, p)).map((p) => <li key={p.id} data-proposal-status={p.status} data-proposal-op={p.op}>
            <label>
              <input type="checkbox" disabled={p.status !== "proposed"} checked={review.approved.has(p.id)} onChange={() => toggleApproved(p.id)} aria-label={`אשר הצעה ${p.id}`} />
              <b>{OP_LABEL[p.op]} · {p.ref}</b>
            </label>
            {p.status === "rejected" ? <em className="is-bad">נדחה: {REJECT_LABEL[p.reason] || p.reason}</em> : null}
            {p.op === "edit" ? <WordDiff before={p.before} after={p.after} /> : p.op === "add" ? <ins>{p.after}</ins> : p.op === "remove" ? <del>{p.before}</del> : null}
            {p.op === "retype" ? <span>״{snippet(p.ref)}״ ← {p.after}</span> : null}
            {p.op === "move" ? <span>״{snippet(p.ref)}״ ← {p.after === "בתחילת היחידה" ? p.after : `אחרי ״${snippet(p.afterRef)}״`}</span> : null}
            {p.op === "gematria" ? <><ins>{p.after}</ins>{p.status === "proposed" ? <div className="sod29-reading-post r29" data-reality-map="preview_acceptance_exception"><div className="sod29-reading-source"><UnitGematria2029 item={p.item} /></div></div> : null}<em className="is-warn" data-proposal-flag="engine_value_on_display">הערך והפירוק נקראים מהמנוע בהצגה — רזיאל מציע ביטוי ושיטה בלבד</em></> : null}
            {p.flags?.filter((f) => f.code === "unverified_numbers").map((f, i) => <em key={i} className="is-warn" data-proposal-flag={f.code}>⚠ מספר שלא אומת במנוע: {f.numbers.join(", ")} — דורש אישור מפורש ובדיקה</em>)}
          </li>)}</ol>
          <div className="sod29-ude-actions">
            <button type="button" onClick={() => approveAll(true)}>אשר את הבטוחות (בלי מספרים שלא אומתו)</button>
            <button type="button" onClick={() => approveAll(false)}>נקה אישורים</button>
            <button type="button" className="is-primary" data-ude-apply-approved disabled={!review.approved.size} onClick={applyApproved}>החל את כל ההצעות המאושרות ({review.approved.size})</button>
          </div>
        </> : !review.error ? <p>רזיאל לא החזיר הצעת עריכה בפורמט — אין מה להחיל.</p> : null}
        {review.report?.length ? <details open data-ude-segment-report><summary>דוח מקטעים — מה נשלח ומה חזר ({review.report.length})</summary><table className="sod29-ude-report"><thead><tr><th>מקטע</th><th>בלוקים</th><th>סטטוס</th><th>הצעות</th><th>נדחו</th><th>הערות</th></tr></thead><tbody>{review.report.map((r) => <tr key={r.index} data-segment-status={r.status}><td>{r.index}</td><td>{r.blocks}</td><td>{{ answered: "נענה", failed: `נכשל (${r.error})`, not_sent: "לא נשלח" }[r.status]}</td><td>{r.proposed}</td><td>{r.rejected}</td><td>{r.commentary}</td></tr>)}</tbody></table></details> : null}
        {review.commentary?.length ? <details open><summary>הערות רזיאל (טקסט חופשי — לא ניתן להחלה)</summary><ul>{review.commentary.map((c, i) => <li key={i}>{c}</li>)}</ul></details> : null}
      </div> : null}

      <h5>בדיקות מקומיות (ללא מודל)</h5>
      <p>{repeats.length ? `${repeats.length} חזרות אפשריות: ` : "לא נמצאו חזרות מילה במילה."}{repeats.map((g) => (g.kind === "same_paragraph" ? `אותה פסקה (${g.ids.join(", ")})` : `חוזר על מקור (${g.ids.join(" ← ")})`)).join(" · ")}</p>
      <div className="sod29-ude-actions"><button type="button" data-ude-engine disabled={engine?.running} onClick={runEngine}>בדוק את החישובים במנוע הקנוני</button></div>
      {engine ? <ul className="sod29-ude-engine" data-ude-engine-result>{engine.rows.map(({ claim, result }) => <li key={claim.id} data-engine-state={result?.state || "unchecked"}>
        <span dir="rtl">{claim.phrase}</span> = {claim.number} — {result?.state === HINT_STATES.verified ? "✓ המנוע מאשר" : result?.state === HINT_STATES.mismatch ? "≠ אי־התאמה" : "לא נבדק"}</li>)}{engine.running ? <li>בודק…</li> : null}</ul> : null}
      <p className="sod29-ude-hint">חיבורים ליחידות, פוסטים, מספרים ונושאים קיימים — בלשונית ״חיבורים״ (קוראים קנוניים, בלי שכפול תוכן).</p>
    </section> : null}

    <div className="sod29-ude-actions">
      <button type="button" className="is-primary" data-ude-save onClick={saveDraft} disabled={!dirty || invalid}>שמירת טיוטה מקומית</button>
      <button type="button" onClick={discardDraft} disabled={!meta}>מחיקת הטיוטה המקומית</button>
    </div>
    <small role="status" data-ude-note>{note || "מקורות חיצוניים (דברי יניב לוי ויצחק שחר קנדרו, פסוקים וציטוטים) הם שבבים בתוך המסמך: הנוסח נשמר; אפשר להזיז, ליישר או להסיר אותם מהיחידה באישור. מספרים, משוואות, טבלאות וגימטריות — ניתנים לעריכה. אין כרגע מסלול קנוני מורשה לשמירה — ראו CANONICAL_SAVE_PLAN."}</small>
  </div>;
}
