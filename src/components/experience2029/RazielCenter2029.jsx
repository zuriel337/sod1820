import React, { useMemo, useState } from "react";
import "./razielCenter2029.css";

const LOADING_STATES = new Set(["auth_loading", "loading"]);
const ERROR_STATES = new Set(["conflict", "error", "local_error", "local_recovery_required"]);

function savedDate(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return "תאריך לא זמין";
  return new Intl.DateTimeFormat("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function syncCopy(status) {
  if (status === "synced") return "פרטי ומסונכרן לחשבון";
  if (status === "local_only") return "מקומי בדפדפן הזה";
  if (["pending", "syncing", "resolving"].includes(status)) return "השינויים נשמרו מקומית והסנכרון ממשיך";
  if (LOADING_STATES.has(status)) return "טוען את השיחות שלך…";
  if (ERROR_STATES.has(status)) return "השיחות המקומיות נשמרו, אך הסנכרון אינו זמין כרגע";
  return "מצב הסנכרון עדיין אינו זמין";
}

function questionCountCopy(value) {
  const count = Number.isSafeInteger(value) && value >= 0 ? value : 0;
  return count === 1 ? "שאלה אחת" : `${count} שאלות`;
}

export default function RazielCenter2029({ session, onBack, onOpenConversation }) {
  const [notice, setNotice] = useState("");
  const [pendingId, setPendingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const savedSessions = Array.isArray(session?.savedSessions) ? session.savedSessions : [];
  const syncStatus = session?.savedSessionsSyncStatus || "auth_loading";
  const loading = LOADING_STATES.has(syncStatus);
  const error = ERROR_STATES.has(syncStatus);
  const activeRef = session?.sessionRef || null;
  const sessionById = useMemo(() => new Map(savedSessions.map((saved) => [saved.id, saved])), [savedSessions]);

  const continueConversation = async (saved) => {
    setNotice("");
    setPendingId(saved.id);
    const result = await session?.restoreSavedSession?.(saved.id);
    setPendingId(null);
    if (!result?.ok) {
      setNotice("לא הצלחנו לפתוח את השיחה כרגע.");
      return;
    }
    onOpenConversation?.();
  };

  const startNewConversation = () => {
    setNotice("");
    if (session?.busy) return;
    if (session?.thread?.length && typeof window !== "undefined"
      && !window.confirm("לפתוח שיחה חדשה? השיחה הנוכחית תיעלם אם עדיין לא שמרת אותה.")) return;
    if (!session?.resetTemporarySession?.()) {
      setNotice("לא הצלחנו לפתוח שיחה חדשה כרגע.");
      return;
    }
    onOpenConversation?.();
  };

  const beginRename = (saved) => {
    setNotice("");
    setDeleteId(null);
    setEditingId(saved.id);
    setDraftTitle(saved.title || "שיחה עם רזיאל");
  };

  const saveRename = async (event, saved) => {
    event.preventDefault();
    setNotice("");
    setPendingId(saved.id);
    const result = await session?.renameSavedSession?.(saved.id, draftTitle);
    setPendingId(null);
    if (!result?.ok) {
      setNotice(result?.error === "title_required" ? "יש להזין שם לשיחה." : "לא הצלחנו לשנות את שם השיחה כרגע.");
      return;
    }
    setEditingId(null);
    setDraftTitle("");
    setNotice("שם השיחה עודכן.");
  };

  const confirmDelete = (saved) => {
    setNotice("");
    setEditingId(null);
    setDeleteId(saved.id);
  };

  const removeConversation = (saved) => {
    setNotice("");
    const selected = sessionById.get(saved.id);
    if (!selected || !session?.removeSavedSession?.(selected.id)) {
      setNotice("לא הצלחנו למחוק את השיחה כרגע.");
      return;
    }
    setDeleteId(null);
    setNotice("השיחה נמחקה מהשמורים.");
  };

  return (
    <section className="sod29-raziel-center" data-raziel-center="true" aria-labelledby="sod29-raziel-center-title">
      <div className="sod29-raziel-center-head">
        <button type="button" className="sod29-action" onClick={onBack}>חזרה לאזור האישי</button>
        <div>
          <div className="sod29-kicker">האזור של רזיאל</div>
          <h3 id="sod29-raziel-center-title">השיחות שלי</h3>
          <p>אפשר לפתוח שיחה שמורה ולהמשיך בדיוק מאותה נקודה.</p>
        </div>
      </div>

      <div className="sod29-raziel-center-toolbar">
        <button type="button" className="sod29-action primary" disabled={session?.busy} data-raziel-center-new="true" onClick={startNewConversation}>שיחה חדשה</button>
        <small data-raziel-center-sync={syncStatus}>{syncCopy(syncStatus)}</small>
      </div>

      {loading && !savedSessions.length ? <div className="sod29-raziel-center-state" role="status"><strong>טוען את השיחות שלך…</strong><span>השיחות יוצגו כאן כשהטעינה תסתיים.</span></div> : null}
      {error ? <div className="sod29-raziel-center-state is-error" role="status"><strong>הסנכרון אינו זמין כרגע</strong><span>אם קיימות שיחות מקומיות אפשר עדיין לפתוח אותן. לא נמחק דבר.</span></div> : null}
      {!loading && !error && !savedSessions.length ? <div className="sod29-raziel-center-state is-empty"><strong>אין עדיין שיחות שמורות</strong><span>אחרי שרזיאל עונה, אפשר לבחור „שמור שיחה” ולחזור אליה מכאן.</span></div> : null}

      {savedSessions.length ? <ul className="sod29-raziel-center-list" aria-label="השיחות השמורות שלי">
        {savedSessions.map((saved) => {
          const pending = pendingId === saved.id;
          const active = activeRef != null && (saved.ref === activeRef || saved.id === activeRef);
          return <li key={saved.id} data-raziel-center-session={saved.id} data-active={active ? "true" : "false"}>
            {editingId === saved.id ? <form className="sod29-raziel-center-rename" onSubmit={(event) => saveRename(event, saved)}>
              <label htmlFor={`raziel-title-${saved.id}`}>שם השיחה</label>
              <input id={`raziel-title-${saved.id}`} value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} maxLength={96} autoFocus disabled={pending} />
              <div className="sod29-raziel-center-row-actions">
                <button type="submit" className="sod29-action primary" disabled={pending || !draftTitle.trim()}>שמור שם</button>
                <button type="button" className="sod29-action" disabled={pending} onClick={() => setEditingId(null)}>ביטול</button>
              </div>
            </form> : <>
              <div className="sod29-raziel-center-session-copy">
                <strong>{saved.title || "שיחה עם רזיאל"}</strong>
                <small>{savedDate(saved.saved_at)} · {questionCountCopy(saved.turn_count)}{active ? " · פתוחה עכשיו" : ""}</small>
              </div>
              <div className="sod29-raziel-center-row-actions">
                <button type="button" className="sod29-action primary" disabled={pending || session?.busy} onClick={() => continueConversation(saved)}>{pending ? "פותח…" : "המשך מאיפה שעצרתי"}</button>
                <button type="button" className="sod29-action" disabled={pending || session?.busy} onClick={() => beginRename(saved)}>שינוי שם</button>
                <button type="button" className="sod29-action" disabled={pending || session?.busy} onClick={() => confirmDelete(saved)}>מחיקה</button>
              </div>
            </>}
            {deleteId === saved.id ? <div className="sod29-raziel-center-delete" role="group" aria-label={`אישור מחיקת השיחה ${saved.title || "שיחה עם רזיאל"}`}>
              <span>למחוק את השיחה הזאת?</span>
              <button type="button" className="sod29-action" onClick={() => removeConversation(saved)}>כן, למחוק</button>
              <button type="button" className="sod29-action" onClick={() => setDeleteId(null)}>ביטול</button>
            </div> : null}
          </li>;
        })}
      </ul> : null}

      {notice ? <p className="sod29-raziel-center-notice" role="status">{notice}</p> : null}
    </section>
  );
}
