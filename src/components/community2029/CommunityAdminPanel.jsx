import React, { useCallback, useEffect, useState } from "react";
import { describeCommunityActionError, fetchCommunityRemoved, fetchCommunityReports, resolveCommunityReport, restoreCommunityMessage } from "../../lib/community/communityArchive.js";

const dateFormat = new Intl.DateTimeFormat("he-IL", { dateStyle: "medium", timeStyle: "short" });
const reasonLabels = { spam: "ספאם או פרסומת", abuse: "פגיעה או הטרדה", personal: "מידע אישי", other: "אחר" };
const snippet = (text) => (text.length > 180 ? `${text.slice(0, 180)}…` : text);

// Admin only. Open reports and recently removed messages, with the actions that undo or settle them.
// The database re-checks the admin role on every call.
export default function CommunityAdminPanel({ onChanged, refreshKey = 0 }) {
  const [open, setOpen] = useState(false);
  const [reports, setReports] = useState(null);
  const [removed, setRemoved] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const [nextReports, nextRemoved] = await Promise.all([fetchCommunityReports(), fetchCommunityRemoved()]);
      setReports(nextReports); setRemoved(nextRemoved);
    } catch (err) { setError(describeCommunityActionError(err)); }
  }, []);
  useEffect(() => { if (open) load(); }, [open, load, refreshKey]);

  const run = async (key, task) => {
    if (busyId) return;
    setBusyId(key); setError("");
    try { await task(); await load(); onChanged?.(); }
    catch (err) { setError(describeCommunityActionError(err)); }
    finally { setBusyId(""); }
  };

  return <details className="sod29-community-admin" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary>ניהול הקהילה{reports?.length ? ` · ${reports.length} דיווחים פתוחים` : ""}</summary>
    {error ? <p className="sod29-community-status" role="alert">{error}</p> : null}
    {open && !reports && !error ? <p role="status">טוען…</p> : null}
    {reports ? <section aria-label="דיווחים פתוחים">
      <h3>דיווחים פתוחים</h3>
      {!reports.length ? <p>אין דיווחים פתוחים.</p> : <ul className="sod29-community-admin-list">{reports.map((item) => <li key={item.reportId}>
        <small>{reasonLabels[item.reason] || item.reason} · {item.count > 1 ? `${item.count} דיווחים · ` : ""}דווח על ידי {item.reporterName} · {dateFormat.format(new Date(item.at))}</small>
        <p dir="auto"><strong>{item.authorName}:</strong> {snippet(item.body)}</p>
        {item.note ? <p dir="auto" className="sod29-community-admin-note">הערה: {item.note}</p> : null}
        <div className="sod29-community-editor-actions">
          <button type="button" className="sod29-community-secondary" disabled={Boolean(busyId)} onClick={() => run(item.reportId, () => resolveCommunityReport(item.reportId, "dismiss"))}>התעלמות</button>
          <button type="button" className="sod29-community-secondary" disabled={Boolean(busyId)} onClick={() => run(item.reportId, () => resolveCommunityReport(item.reportId, "delete"))}>מחיקת ההודעה</button>
          {!item.parentId ? <button type="button" className="sod29-community-secondary" disabled={Boolean(busyId)} onClick={() => { if (window.confirm("להסתיר את כל השרשור מהציבור?")) run(item.reportId, () => resolveCommunityReport(item.reportId, "hide_thread")); }}>הסתרת השרשור</button> : null}
        </div>
      </li>)}</ul>}
    </section> : null}
    {removed ? <section aria-label="הוסרו לאחרונה">
      <h3>הוסרו לאחרונה</h3>
      {!removed.length ? <p>לא הוסרו הודעות.</p> : <ul className="sod29-community-admin-list">{removed.map((item) => <li key={`${item.kind}-${item.id}`}>
        <small>{item.kind === "thread" ? "שרשור שהוסתר" : "הודעה שנמחקה"} · {dateFormat.format(new Date(item.at))}</small>
        <p dir="auto"><strong>{item.authorName}:</strong> {snippet(item.body) || "(ללא טקסט)"}</p>
        <div className="sod29-community-editor-actions">
          <button type="button" className="sod29-community-secondary" disabled={Boolean(busyId)} onClick={() => run(item.id, () => restoreCommunityMessage(item.id))}>{busyId === item.id ? "משחזר…" : "שחזור"}</button>
        </div>
      </li>)}</ul>}
    </section> : null}
  </details>;
}
