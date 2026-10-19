import React, { useEffect, useRef, useState } from "react";
import { deleteCommunityMessage, describeCommunityActionError, editCommunityMessage, fetchCommunityEditHistory, hideCommunityThread, reportCommunityMessage } from "../../lib/community/communityArchive.js";

export const COMMUNITY_EDIT_MAX_LENGTH = 6000;

// Which controls a viewer may see. The database re-checks every action; this only keeps
// controls that cannot work for this viewer off the screen.
export function communityMessagePermissions({ row, user, isAdmin, actionsAvailable }) {
  if (!actionsAvailable || !user?.id || row.isDeleted) return { edit: false, remove: false, hideThread: false, report: false, history: false };
  const own = row.origin === "community_2029" && row.authorUserId === user.id;
  return {
    edit: own,
    remove: own || Boolean(isAdmin),
    hideThread: Boolean(isAdmin) && !row.parentId,
    // Any signed-in reader may report a message that is not their own.
    report: row.authorUserId !== user.id,
    history: Boolean(isAdmin) && Boolean(row.editedAt),
  };
}

const rtf = typeof Intl !== "undefined" && Intl.RelativeTimeFormat ? new Intl.RelativeTimeFormat("he", { numeric: "auto" }) : null;
const absoluteDate = typeof Intl !== "undefined" ? new Intl.DateTimeFormat("he-IL", { dateStyle: "medium", timeStyle: "short" }) : null;

// "נערך לפני שעה" for recent edits, the date for older ones. The exact time is always in the tooltip.
export function describeEdited(editedAt, now = Date.now()) {
  const time = Date.parse(editedAt);
  if (!Number.isFinite(time)) return { text: "נערך", title: "ההודעה נערכה אחרי הפרסום" };
  const title = `נערך ב־${absoluteDate ? absoluteDate.format(new Date(time)) : editedAt}`;
  const seconds = Math.max(0, Math.round((now - time) / 1000));
  if (!rtf || seconds >= 7 * 86400) return { text: "נערך", title };
  if (seconds < 60) return { text: "נערך עכשיו", title };
  const [value, unit] = seconds < 3600 ? [Math.round(seconds / 60), "minute"] : seconds < 86400 ? [Math.round(seconds / 3600), "hour"] : [Math.round(seconds / 86400), "day"];
  return { text: `נערך ${rtf.format(-value, unit)}`, title };
}

const REPORT_REASONS = [["spam", "ספאם או פרסומת"], ["abuse", "פגיעה או הטרדה"], ["personal", "מידע אישי"], ["other", "אחר"]];

export function MessageReport({ row, onCancel, onDone }) {
  const [reason, setReason] = useState("spam");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selectRef = useRef(null);
  useEffect(() => { selectRef.current?.focus(); }, []);
  const send = async () => {
    if (busy) return;
    setBusy(true); setError("");
    try { await reportCommunityMessage(row.id, reason, note.trim()); onDone(); }
    catch (err) { setError(describeCommunityActionError(err)); setBusy(false); }
  };
  return <div className="sod29-community-confirm" role="group" aria-labelledby={`report-${row.id}`} onKeyDown={(event) => { if (event.key === "Escape" && !busy) { event.stopPropagation(); onCancel(); } }}>
    <p id={`report-${row.id}`}>דיווח על ההודעה למנהלים</p>
    <label className="sod29-community-report-field">סיבה
      <select ref={selectRef} value={reason} disabled={busy} onChange={(event) => setReason(event.target.value)}>{REPORT_REASONS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
    </label>
    <label className="sod29-community-report-field">הערה (לא חובה)
      <textarea rows={2} maxLength={300} value={note} disabled={busy} dir="auto" onChange={(event) => setNote(event.target.value)} />
    </label>
    {error ? <p className="sod29-community-status" role="alert">{error}</p> : null}
    <div className="sod29-community-editor-actions">
      <button type="button" className="sod29-community-primary" disabled={busy} onClick={send}>{busy ? "שולח…" : "שליחת הדיווח"}</button>
      <button type="button" className="sod29-community-secondary" disabled={busy} onClick={onCancel}>ביטול</button>
    </div>
  </div>;
}

// Admin only: previous bodies of an edited message, newest first.
export function EditHistory({ row, onClose }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetchCommunityEditHistory(row.id).then((list) => { if (active) setItems(list); }).catch((err) => { if (active) setError(describeCommunityActionError(err)); });
    return () => { active = false; };
  }, [row.id]);
  return <div className="sod29-community-confirm" role="group" aria-label="היסטוריית עריכות">
    {error ? <p className="sod29-community-status" role="alert">{error}</p> : null}
    {!items && !error ? <p role="status">טוען…</p> : null}
    {items && !items.length ? <p>אין גרסאות קודמות שמורות.</p> : null}
    {items?.length ? <ol className="sod29-community-history">{items.map((item, index) => <li key={index}><small>{item.editedBy} · {absoluteDate ? absoluteDate.format(new Date(item.editedAt)) : item.editedAt}</small><p dir="auto">{item.body}</p></li>)}</ol> : null}
    <div className="sod29-community-editor-actions"><button type="button" className="sod29-community-secondary" onClick={onClose}>סגירה</button></div>
  </div>;
}


export function MessageEditor({ row, onCancel, onSaved }) {
  const [value, setValue] = useState(row.body);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); ref.current?.setSelectionRange?.(row.body.length, row.body.length); }, []);
  const trimmed = value.trim();
  const save = async () => {
    if (!trimmed || saving) return;
    if (trimmed === row.body.trim()) { onCancel(); return; }
    setSaving(true); setError("");
    try {
      const editedAt = await editCommunityMessage(row.id, trimmed);
      onSaved({ body: trimmed, editedAt: editedAt || new Date().toISOString() });
    } catch (err) { setError(describeCommunityActionError(err)); setSaving(false); }
  };
  return <div className="sod29-community-editor">
    <label className="sod29-community-sr-only" htmlFor={`edit-${row.id}`}>עריכת ההודעה</label>
    <textarea ref={ref} id={`edit-${row.id}`} rows={3} maxLength={COMMUNITY_EDIT_MAX_LENGTH} value={value} disabled={saving} dir="auto"
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={(event) => { if (event.key === "Escape" && !saving) { event.stopPropagation(); onCancel(); } else if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) save(); }} />
    {error ? <p className="sod29-community-status" role="alert">{error}</p> : null}
    <div className="sod29-community-editor-actions">
      <button type="button" className="sod29-community-primary" disabled={!trimmed || saving} onClick={save}>{saving ? "שומר…" : "שמירה"}</button>
      <button type="button" className="sod29-community-secondary" disabled={saving} onClick={onCancel}>ביטול</button>
    </div>
  </div>;
}

// Inline confirmation for delete and (admin) hide-thread. `kind` picks the wording and action.
export function MessageConfirm({ row, kind, onCancel, onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const confirmRef = useRef(null);
  useEffect(() => { confirmRef.current?.focus(); }, []);
  const isHide = kind === "hide-thread";
  const run = async () => {
    if (busy) return;
    setBusy(true); setError("");
    try {
      if (isHide) await hideCommunityThread(row.id); else await deleteCommunityMessage(row.id);
      onDone(kind);
    } catch (err) { setError(describeCommunityActionError(err)); setBusy(false); }
  };
  return <div className="sod29-community-confirm" role="alertdialog" aria-labelledby={`confirm-${row.id}`} onKeyDown={(event) => { if (event.key === "Escape" && !busy) { event.stopPropagation(); onCancel(); } }}>
    <p id={`confirm-${row.id}`}>{isHide ? "להסתיר את כל השרשור מהציבור? ההודעה וכל התגובות שמתחתיה לא יוצגו." : "למחוק את ההודעה? במקומה תוצג ״ההודעה נמחקה״, והתגובות שמתחתיה יישארו."}</p>
    {error ? <p className="sod29-community-status" role="alert">{error}</p> : null}
    <div className="sod29-community-editor-actions">
      <button ref={confirmRef} type="button" className="sod29-community-primary" disabled={busy} onClick={run}>{busy ? "מבצע…" : isHide ? "הסתרת השרשור" : "מחיקה"}</button>
      <button type="button" className="sod29-community-secondary" disabled={busy} onClick={onCancel}>ביטול</button>
    </div>
  </div>;
}
