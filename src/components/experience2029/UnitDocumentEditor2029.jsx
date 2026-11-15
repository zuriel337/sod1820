// "גוף היחידה" — ONE continuous editor for the whole unit (ZURIEL 15.11.2026: one unit, one editor, one Raziel, one source of truth).
// The unit is a single document: editorial text is edited in place like any document; every protected source (the writers' words, verses, the four
// numbers, the equations, the table) is an atomic, identified, non-editable chip INSIDE the document. All operations act on the whole unit:
// replace, clear editable content, undo, restore the approved version, full preview, before/after. "✦ ערוך עם רזיאל" uses the EXISTING single
// Raziel session — it only ever returns a proposal; nothing is applied until the person approves it, and one apply is one undo checkpoint.
// Saving is truthful: a browser-local draft (this device only). The canonical write path is prepared in unitFragmentSavePlan2029.js and is not active.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { baseBodyBlocks, resolveBodyBlocks, entriesFromBlocks, diffBody, readBodyDraft, writeBodyDraft, clearBodyDraft, readBodyDraftMeta, writeBodyDraftMeta, textFingerprint } from "../../lib/research/postUnitBody2029.js";
import { itemsToBlocks, validateBlocks, restoreMissingSources, clearEditable, blocksToDoc, replaceFromText, findRepeats, wordDiff, DOC_KIND_LABEL } from "../../lib/research/unitDocument2029.js";
import { segmentUnit, buildSegmentQuestion, parseRazielAnswer, mergeProposals, applyProposals, proposalCounts, REVIEW_TASKS, FREE_TASK_MAX, REJECT_LABEL } from "../../lib/research/unitRazielReview2029.js";
import { buildPreviewUnitCopy, rebuildPreviewUnitBody } from "../../lib/research/postPreviewUnitDom2029.js";
import { YAMIN_SMOL_APPROVED_TEXT, YAMIN_SMOL_CLAIMS } from "../../lib/research/postPreviewUnits2029.js";
import { checkSourceHint, HINT_STATES, collapseSpacedLetters } from "../../lib/research/postSourceHintCheck2029.js";
import { useOptionalRazielSession2029 } from "../../lib/research/RazielSessionProvider2029.jsx";
import { renderDoc, readDoc, paragraphAt, rangeTouchesChip, insertPlainText } from "./unitDocumentDom2029.js";

const KIND_BUTTONS = ["p", "heading", "subtitle", "kicker", "closing"];
const sigOf = (blocks) => JSON.stringify(blocks.map((b) => [b.id, b.kind, b.text]));
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

  const pushCheckpoint = () => { const snap = validateBlocks(blocksRef.current, base).ok ? blocksRef.current : lastValidRef.current; historyRef.current = [...historyRef.current.slice(-29), snap]; setHistoryDepth(historyRef.current.length); };
  const sync = useCallback(() => {
    const root = rootRef.current; if (!root) return;
    const result = itemsToBlocks(readDoc(root), base);
    if (!typedRef.current && sigOf(result.blocks) !== sigOf(blocksRef.current)) { pushCheckpoint(); typedRef.current = true; }
    setBlocks(result.blocks); setErrors(result.errors); setNotices(result.notices);
    if (result.ok) lastValidRef.current = result.blocks;
  }, [base]);
  const scheduleSync = () => { window.clearTimeout(timer.current); timer.current = window.setTimeout(sync, 220); };
  // a programmatic change of the WHOLE document: one checkpoint, redraw, validated
  const commit = (next, message) => {
    window.clearTimeout(timer.current);
    pushCheckpoint(); typedRef.current = false;
    const check = validateBlocks(next, base);
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
    typedRef.current = false; lastValidRef.current = previous; setBlocks(previous); setErrors(validateBlocks(previous, base).errors); setNotices([]);
    renderDoc(rootRef.current, previous); setNote("הפעולה האחרונה בוטלה");
  };
  const restoreApproved = () => commit(base, "הנוסח המאושר הוחזר לעורך (עדיין לא נשמר כטיוטה)");
  const clearAll = () => { if (window.confirm("לנקות את כל טקסט העריכה? המקורות המוגנים נשארים. אפשר לבטל.")) commit(clearEditable(blocksRef.current), "טקסט העריכה נוקה — המקורות המוגנים נשארו"); };
  const restoreSources = () => commit(restoreMissingSources(blocksRef.current, base), "המקורות שהוסרו הוחזרו למקומם בנוסח המאושר");
  const copyDoc = async () => { try { await navigator.clipboard.writeText(blocksToDoc(blocksRef.current)); setNote("כל המסמך הועתק (המקורות כסימונים [[מקור …]])"); } catch { setNote("ההעתקה נכשלה — פתחו ״החלפת התוכן״ כדי לראות את המסמך כטקסט"); } };
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

  // ---- panels ----
  useEffect(() => { if (panel === "preview" && previewRef.current) previewRef.current.replaceChildren(buildPreviewUnitCopy(document, unitDef, blocks)); }, [panel, blocks, unitDef]);
  const parsedReplace = useMemo(() => (panel === "replace" ? replaceFromText(replaceText, base) : null), [panel, replaceText, base]);
  const openReplace = () => { setReplaceText(blocksToDoc(blocksRef.current)); setPanel("replace"); };

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
    if (!plan.segments.length) { setReview({ status: "done", proposals: [], commentary: [], approved: new Set(), skipped: plan.skipped, error: "אין טקסט עריכה לבדיקה." }); return; }
    cancelRef.current = false;
    const parsed = []; let failure = null;
    for (const segment of plan.segments) {
      if (cancelRef.current) { failure = "cancelled"; break; }
      if (!(await waitIdle())) { failure = "session_busy"; break; }
      setReview({ status: "running", step: segment.index, total: segment.total, proposals: [], commentary: [], approved: new Set(), skipped: plan.skipped });
      const result = await session.submit({ question: buildSegmentQuestion({ task, index: segment.index, total: segment.total, free }), facts: segment.facts, intelligenceLevel: "fast" });
      if (!result?.ok || !result.response?.answer) { failure = result?.error || "unavailable"; break; }
      parsed.push(parseRazielAnswer(result.response.answer, blocksRef.current));
    }
    const merged = mergeProposals(parsed);
    setReview({ status: failure ? "partial" : "done", proposals: merged.proposals, commentary: merged.commentary, unchanged: merged.unchanged, approved: new Set(), skipped: plan.skipped, error: failure, segments: plan.segments.length, answered: parsed.length });
  };
  const toggleApproved = (id) => setReview((r) => { const approved = new Set(r.approved); if (approved.has(id)) approved.delete(id); else approved.add(id); return { ...r, approved }; });
  const approveAll = (on) => setReview((r) => ({ ...r, approved: on ? new Set(r.proposals.filter((p) => p.status === "proposed" && !p.flags?.length).map((p) => p.id)) : new Set() }));
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
      {KIND_BUTTONS.map((kind) => <button key={kind} type="button" aria-pressed={caret.kind === kind} disabled={!caret.kind || caret.kind === "title"} onMouseDown={(e) => e.preventDefault()} onClick={() => setKind(kind)}>{DOC_KIND_LABEL[kind]}</button>)}
      {onPickMessage ? <button type="button" disabled={!caret.text || caret.kind === "title"} onMouseDown={(e) => e.preventDefault()} onClick={() => onPickMessage(caret.text)}>הפוך למסר הראשי</button> : null}
    </div>

    {invalid ? <div className="sod29-ude-errors" role="alert">
      {errors.map((e, i) => <p key={i} data-ude-error={e.code}>{e.message}</p>)}
      {errors.some((e) => e.code === "missing_source") ? <button type="button" onClick={restoreSources}>החזר את המקורות למקומם</button> : null}
    </div> : null}
    {notices.length ? <p className="sod29-ude-notices" role="status">{notices.join(" · ")}</p> : null}

    <div ref={rootRef} className="sod29-ude-doc" dir="rtl" contentEditable suppressContentEditableWarning spellCheck lang="he" role="textbox" aria-multiline="true"
      aria-label="גוף היחידה — מסמך אחד מתחילתו ועד סופו" data-ude-doc onInput={scheduleSync} onKeyDown={onKeyDown} onBeforeInput={onBeforeInput} onPaste={onPaste} onDrop={onDrop} />

    {panel === "replace" && parsedReplace ? <section className="sod29-ude-panel" aria-label="החלפת התוכן" data-ude-panel="replace">
      <h4>החלפת התוכן — הדביקו מסמך שלם</h4>
      <p className="sod29-ude-hint">שורה = פסקה. סימונים: <code># </code>כותרת ראשית · <code>## </code>כותרת מקטע · <code>#- </code>משנה · <code>#^ </code>פתיחה · <code>#! </code>סיום · <code>---</code> מפריד. מקורות מוגנים הם <code>[[מקור b24–b31 · …]]</code> ואינם ניתנים לשינוי או להסרה.</p>
      <textarea dir="rtl" rows={12} value={replaceText} onChange={(e) => setReplaceText(e.target.value)} aria-label="המסמך כטקסט" data-ude-replace-text />
      {parsedReplace.errors.map((e, i) => <p key={i} className="is-bad" data-ude-replace-error={e.code}>{e.message}</p>)}
      {parsedReplace.notices.map((n, i) => <p key={i} className="sod29-ude-hint">{n}</p>)}
      {parsedReplace.ok ? <p className="is-good">✓ המסמך תקין: {parsedReplace.blocks.length} בלוקים, כל המקורות המוגנים במקומם.</p> : null}
      <div className="sod29-ude-actions">
        <button type="button" className="is-primary" disabled={!parsedReplace.ok} onClick={() => { commit(parsedReplace.blocks, "התוכן הוחלף (כפעולה אחת, אפשר לבטל). עדיין לא נשמר כטיוטה."); setPanel(null); }}>החל את המסמך</button>
        {parsedReplace.errors.some((e) => e.code === "missing_source") ? <button type="button" onClick={() => setReplaceText(blocksToDoc(restoreMissingSources(parsedReplace.blocks, base)))}>השלם את המקורות החסרים למקומם</button> : null}
        <button type="button" onClick={() => setPanel(null)}>סגירה</button>
      </div>
    </section> : null}

    {panel === "diff" ? <section className="sod29-ude-panel" aria-label="לפני ואחרי" data-ude-panel="diff">
      <h4>לפני / אחרי — {diff.count} שינויים מול הנוסח המאושר</h4>
      {!diff.changed ? <p>אין שינויים.</p> : <ol className="sod29-ude-diff">{diff.ops.map((op, i) => <li key={i} data-op={op.op}>
        <b>{{ edited: "נערך", added: "נוסף", removed: "הוסר", moved: "הוזז", retyped: "סוג שונה" }[op.op]}</b>
        {op.op === "edited" ? <WordDiff before={op.before} after={op.after} /> : null}
        {op.op === "added" ? <ins>{op.text}</ins> : null}
        {op.op === "removed" ? <del>{op.text}</del> : null}
        {op.op === "retyped" ? <span>{DOC_KIND_LABEL[op.from]} ← {DOC_KIND_LABEL[op.to]}</span> : null}
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
          <ol className="sod29-ude-proposals">{review.proposals.map((p) => <li key={p.id} data-proposal-status={p.status} data-proposal-op={p.op}>
            <label>
              <input type="checkbox" disabled={p.status !== "proposed"} checked={review.approved.has(p.id)} onChange={() => toggleApproved(p.id)} aria-label={`אשר הצעה ${p.id}`} />
              <b>{{ edit: "נוסח", add: "פסקה חדשה אחרי", remove: "הסרה" }[p.op]} · {p.ref}</b>
            </label>
            {p.status === "rejected" ? <em className="is-bad">נדחה: {REJECT_LABEL[p.reason] || p.reason}</em> : null}
            {p.op === "edit" ? <WordDiff before={p.before} after={p.after} /> : p.op === "add" ? <ins>{p.after}</ins> : <del>{p.before}</del>}
            {p.flags?.map((f, i) => <em key={i} className="is-warn" data-proposal-flag={f.code}>⚠ מספר שלא אומת במנוע: {f.numbers.join(", ")} — דורש אישור מפורש ובדיקה</em>)}
          </li>)}</ol>
          <div className="sod29-ude-actions">
            <button type="button" onClick={() => approveAll(true)}>אשר את הבטוחות (בלי מספרים שלא אומתו)</button>
            <button type="button" onClick={() => approveAll(false)}>נקה אישורים</button>
            <button type="button" className="is-primary" data-ude-apply-approved disabled={!review.approved.size} onClick={applyApproved}>החל את כל ההצעות המאושרות ({review.approved.size})</button>
          </div>
        </> : !review.error ? <p>רזיאל לא החזיר הצעת עריכה בפורמט — אין מה להחיל.</p> : null}
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
    <small role="status" data-ude-note>{note || "המקורות המוגנים (דברי יניב לוי ויצחק שחר קנדרו, הציטוטים, המספרים והמשוואות) הם שבבים נעולים בתוך המסמך. אין כרגע מסלול קנוני מורשה לשמירה — ראו CANONICAL_SAVE_PLAN."}</small>
  </div>;
}
