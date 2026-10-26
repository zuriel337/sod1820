import React, { useEffect, useRef, useState } from "react";
import "./communityMessageManage2029.css";

// Existing inline editor/confirmation presentation from Community handoff
// 15a4a956. Data wiring uses the shared principal-scoped adapters, never a local
// ownership guess or an optimistic/fabricated save timestamp.
export const COMMUNITY_EDIT_MAX_LENGTH = 6000;
const actionError = state => state === "review_required" ? "ההודעה משמשת מקור למחקר; השינוי דורש בדיקה."
  : state === "denied" || state === "stale" ? "ההרשאה השתנתה. רעננו את ההודעה לפני ניסיון נוסף."
    : "הפעולה לא אושרה. התוכן נשמר לניסיון נוסף.";

export function MessageEditor({ row, actions, onCancel, onSaved }) {
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
      const result = await actions.mutate("edit", row, trimmed);
      if (result.state === "saved" || result.state === "unchanged") { onSaved(); return; }
      setError(actionError(result.state));
    } catch { setError(actionError("unavailable")); }
    setSaving(false);
  };
  return <div className="sod29-community-editor">
    <label className="sod29-community-sr-only" htmlFor={`edit-${row.id}`}>עריכת ההודעה</label>
    <textarea ref={ref} id={`edit-${row.id}`} rows={3} maxLength={COMMUNITY_EDIT_MAX_LENGTH} value={value} disabled={saving} dir="auto"
      onChange={event => setValue(event.target.value)}
      onKeyDown={event => { if (event.key === "Escape" && !saving) { event.stopPropagation(); onCancel(); } else if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) save(); }} />
    {error ? <p className="sod29-community-status" role="alert">{error}</p> : null}
    <div className="sod29-community-editor-actions">
      <button type="button" className="sod29-community-primary" disabled={!trimmed || saving} onClick={save}>{saving ? "שומר…" : "שמירה"}</button>
      <button type="button" className="sod29-community-secondary" disabled={saving} onClick={onCancel}>ביטול</button>
    </div>
  </div>;
}

export function MessageConfirm({ row, actions, onCancel, onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const confirmRef = useRef(null);
  useEffect(() => { confirmRef.current?.focus(); }, []);
  const run = async () => {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const result = await actions.mutate("delete", row);
      if (result.state === "deleted") { onDone(); return; }
      setError(actionError(result.state));
    } catch { setError(actionError("unavailable")); }
    setBusy(false);
  };
  return <div className="sod29-community-confirm" role="alertdialog" aria-labelledby={`confirm-${row.id}`} onKeyDown={event => { if (event.key === "Escape" && !busy) { event.stopPropagation(); onCancel(); } }}>
    <p id={`confirm-${row.id}`}>למחוק את ההודעה? במקומה תוצג ״ההודעה נמחקה״, והתגובות שמתחתיה יישארו.</p>
    {error ? <p className="sod29-community-status" role="alert">{error}</p> : null}
    <div className="sod29-community-editor-actions">
      <button ref={confirmRef} type="button" className="sod29-community-primary" disabled={busy} onClick={run}>{busy ? "מבצע…" : "מחיקה"}</button>
      <button type="button" className="sod29-community-secondary" disabled={busy} onClick={onCancel}>ביטול</button>
    </div>
  </div>;
}
