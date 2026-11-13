// "גוף היחידה" — the whole-unit body editor tab of the EXISTING unit editor dialog (ZURIEL 13.11.2026). It edits the structured blocks of the unit
// (postUnitBody2029): editorial text can be edited, moved, removed and added; SOURCE blocks (the writers' words, quotations, the numbers, the
// equations, the table) are shown as locked provenance and cannot be changed. A live preview shows the complete final unit; "save" is truthful
// (this browser only — there is no canonical unit store), and the exact proposed change can be exported for an approved canonical path.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { baseBodyBlocks, resolveBodyBlocks, entriesFromBlocks, diffBody, readBodyDraft, writeBodyDraft, clearBodyDraft, cleanBodyText, ADDABLE_KINDS, KIND_LABEL, MAX_TEXT } from "../../lib/research/postUnitBody2029.js";
import { buildPreviewUnitCopy, rebuildPreviewUnitBody } from "../../lib/research/postPreviewUnitDom2029.js";
import { ATTRIBUTION_GROUPS } from "../../lib/research/postPreviewUnits2029.js";

const sig = (blocks) => JSON.stringify(blocks.map((b) => [b.id, b.text]));
const identityLabel = (id) => (ATTRIBUTION_GROUPS.find((g) => g.identity === id) || {}).label || (id === "baal-hasulam" ? "בעל הסולם" : id === "scripture" ? "מקרא" : id);

export default function UnitBodyEditor2029({ unit, unitDef, postId, onPickMessage }) {
  const base = useMemo(() => baseBodyBlocks(), []);
  const initial = useMemo(() => { const d = readBodyDraft(postId, unitDef.id); return d ? resolveBodyBlocks(d, base) : base; }, [postId, unitDef.id, base]);
  const [saved, setSaved] = useState(initial);
  const [blocks, setBlocks] = useState(initial);
  const [note, setNote] = useState("");
  const [exported, setExported] = useState("");
  const previewRef = useRef(null);
  const dirty = sig(blocks) !== sig(saved);
  const diff = useMemo(() => diffBody(base, blocks), [base, blocks]);

  useEffect(() => {
    const host = previewRef.current;
    if (!host) return;
    host.replaceChildren(buildPreviewUnitCopy(document, unitDef, blocks));
  }, [blocks, unitDef]);

  const edit = (index, text) => setBlocks((list) => list.map((b, i) => (i === index ? { ...b, text } : b)));
  const remove = (index) => setBlocks((list) => list.filter((_, i) => i !== index));
  const add = (index, kind) => setBlocks((list) => { const next = [...list]; next.splice(index + 1, 0, { id: `new-${Date.now()}-${index}`, kind, text: "טקסט חדש", identity: "editorial", locked: false, added: true }); return next; });
  // moving never changes a locked block's text; an editorial block hops over a whole source group instead of landing inside it
  const move = (index, dir) => setBlocks((list) => {
    let j = index + dir;
    if (j < 0 || j >= list.length) return list;
    const groupOf = (b) => b && b.group ? b.group : null;
    while (list[j] && groupOf(list[j]) && list[j + dir] && groupOf(list[j + dir]) === groupOf(list[j])) j += dir;
    if (j < 0 || j >= list.length) return list;
    const next = [...list]; const [item] = next.splice(index, 1); next.splice(j, 0, item); return next;
  });
  const save = () => {
    const clean = blocks.map((b) => (b.locked ? b : { ...b, text: cleanBodyText(b.text) })).filter((b) => b.locked || b.text);
    const entries = entriesFromBlocks(clean, base);
    const resolved = resolveBodyBlocks(entries, base);
    if (resolved === base && diffBody(base, clean).changed) { setNote("הטיוטה נדחתה: אי אפשר למחוק או לשנות מקור. לא נשמר דבר."); return; }
    if (!writeBodyDraft(postId, unitDef.id, entries)) { setNote("השמירה בדפדפן נכשלה. לא נשמר דבר."); return; }
    setBlocks(resolved); setSaved(resolved);
    rebuildPreviewUnitBody(unit, unitDef, resolved);
    setNote("נשמר בדפדפן הזה בלבד · היחידה בפוסט עודכנה · אין כתיבה ל־DB ואין פרסום");
  };
  const undo = () => { setBlocks(saved); setNote("השינויים שלא נשמרו בוטלו"); };
  const restore = () => { clearBodyDraft(postId, unitDef.id); setBlocks(base); setSaved(base); rebuildPreviewUnitBody(unit, unitDef, base); setNote("חזרה לנוסח המאושר"); };
  const exportDiff = async () => {
    const text = JSON.stringify({ unit: unitDef.id, postId, status: "PROPOSED_NOT_PERSISTED", base: "approved-text-12.11.2026", ...diff }, null, 1);
    setExported(text);
    try { await navigator.clipboard.writeText(text); setNote("הצעת השינוי הועתקה. היא אינה נשמרת בשום מסד."); } catch { setNote("הצעת השינוי מוצגת למטה. היא אינה נשמרת בשום מסד."); }
  };

  return <div className="sod29-ube" data-ube-dirty={dirty ? "true" : "false"}>
    <p className="sod29-ube-state" role="status">{dirty ? <b>● שינויים שלא נשמרו ({diff.count} מול הנוסח המאושר)</b> : diff.changed ? <>נוסח ערוך שמור בדפדפן הזה ({diff.count} שינויים מול המאושר)</> : "הנוסח המאושר — ללא שינויים"}</p>
    <ol className="sod29-ube-list">
      {blocks.map((block, index) => <li key={block.id} className={block.locked ? "is-locked" : "is-editable"} data-block-kind={block.kind}>
        <div className="sod29-ube-head">
          <span>{KIND_LABEL[block.kind] || block.kind}{block.added ? " · חדש" : ""}</span>
          {block.locked ? <em>🔒 מקור{block.group ? ` · ${identityLabel(block.group)}` : block.identity && block.identity !== "editorial" ? ` · ${identityLabel(block.identity)}` : ""} — לא ניתן לשינוי</em> : null}
          <span className="sod29-ube-tools">
            <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="הזז למעלה">↑</button>
            <button type="button" onClick={() => move(index, 1)} disabled={index === blocks.length - 1} aria-label="הזז למטה">↓</button>
            {!block.locked ? <button type="button" onClick={() => remove(index)} aria-label="מחק">✕</button> : null}
          </span>
        </div>
        {block.locked || block.kind === "rule"
          ? <p className="sod29-ube-text is-readonly" dir="rtl">{block.kind === "rule" ? "────────" : block.text}</p>
          : <textarea className="sod29-ube-text" dir="rtl" rows={Math.min(6, Math.max(2, Math.ceil(block.text.length / 46)))} maxLength={MAX_TEXT} value={block.text} onChange={(e) => edit(index, e.target.value)} aria-label={`${KIND_LABEL[block.kind] || block.kind} ${index + 1}`} />}
        <div className="sod29-ube-row">
          {!block.locked && block.kind !== "rule" ? <button type="button" onClick={() => onPickMessage?.(block.text)}>הפוך למסר הראשי</button> : null}
          <label className="sod29-ube-add">הוסף אחריו
            <select defaultValue="" onChange={(e) => { if (e.target.value) { add(index, e.target.value); e.target.value = ""; } }}>
              <option value="">בחר סוג…</option>
              {ADDABLE_KINDS.map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}
            </select>
          </label>
        </div>
      </li>)}
    </ol>
    <section className="sod29-ube-preview" aria-label="תצוגה מקדימה של היחידה השלמה">
      <h4>תצוגה מקדימה — היחידה השלמה</h4>
      <div className="sod29-reading-post r29" data-reality-map="preview_acceptance_exception"><div className="sod29-reading-source"><div ref={previewRef} /></div></div>
    </section>
    <div className="sod29-ube-actions">
      <button type="button" className="is-primary" onClick={save} disabled={!dirty}>שמירת גוף היחידה</button>
      <button type="button" onClick={undo} disabled={!dirty}>ביטול שינויים</button>
      <button type="button" onClick={restore} disabled={!diff.changed && !dirty}>חזרה לנוסח המאושר</button>
      <button type="button" onClick={exportDiff} disabled={!diff.changed}>ייצוא הצעת שינוי</button>
    </div>
    {exported ? <textarea className="sod29-ube-export" readOnly dir="ltr" rows={8} value={exported} aria-label="הצעת שינוי מדויקת (לא נשמרה)" /> : null}
    <small role="status">{note || "המקורות נעולים: דברי יניב לוי ויצחק שחר קנדרו, הציטוטים, המספרים והמשוואות נשארים כפי שנמסרו. אין כרגע מסלול קנוני מורשה לשמירה — הטיוטה נשמרת בדפדפן הזה בלבד."}</small>
  </div>;
}
