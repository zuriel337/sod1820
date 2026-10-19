import React, { useEffect, useRef, useState } from "react";
import { deleteCommunityMessage, describeCommunityActionError, editCommunityMessage, hideCommunityThread } from "../../lib/community/communityArchive.js";

export const COMMUNITY_EDIT_MAX_LENGTH = 6000;

// Which controls a viewer may see. The database re-checks every action; this only keeps
// controls that cannot work for this viewer off the screen.
export function communityMessagePermissions({ row, user, isAdmin, actionsAvailable }) {
  if (!actionsAvailable || !user?.id || row.isDeleted) return { edit: false, remove: false, hideThread: false };
  const own = row.origin === "community_2029" && row.authorUserId === user.id;
  return {
    edit: own,
    remove: own || Boolean(isAdmin),
    hideThread: Boolean(isAdmin) && !row.parentId,
  };
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
