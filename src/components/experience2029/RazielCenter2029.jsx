import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { recordTimeLabel } from "../../lib/relativeTime2029.js";
import { filterRazielTitles, projectRazielConversation, projectSavedRazielConversations, projectRazielDossier, razielGroundingCopy, workspaceCreditBalance } from "../../lib/research/razielWorkspaceProjection2029.js";
import "./razielCenter2029.css";
import { razielSavedSyncCopy, canRetryRazielSync, RAZIEL_LOCAL_SAVE_NOTICE } from "../../lib/research/razielSavedSync2029.js";

const LOADING_STATES = new Set(["auth_loading", "loading"]);
const ERROR_STATES = new Set(["conflict", "error", "local_error", "local_recovery_required"]);

function savedDate(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return "תאריך לא זמין";
  return recordTimeLabel(value, "bilingual", "תאריך לא זמין");
}

const syncCopy = razielSavedSyncCopy;

function questionCountCopy(value) {
  if (!Number.isSafeInteger(value) || value < 0) return "מספר השאלות אינו זמין";
  const count = value;
  return count === 1 ? "שאלה אחת" : `${count} שאלות`;
}

function ConversationReading({ conversation }) {
  const [open, setOpen] = useState(false);
  return <details className="sod29-raziel-center-reading" data-conversation-reading="true" onToggle={event => { if (event.target === event.currentTarget) setOpen(event.currentTarget.open); }}>
    <summary>פתיחת שיחה לקריאה</summary>
    {open ? conversation.messages.length ? conversation.messages.map((message, index) => <div key={index} data-message-role={message.role}>
      <strong>{message.role === "user" ? "השאלה שלי" : razielGroundingCopy(message)}</strong>
      {message.role === "raziel" && message.viewMode === "landscape" && message.viewModeApplied
        ? <details data-raziel-picture="true"><summary>תמונה מלאה</summary><p>השאלה: {message.question || conversation.pictures.find(picture => picture.index === index)?.question || "לא נשמר קישור לשאלה"}</p><p dir="auto">{message.text}</p></details>
        : <p dir="auto">{message.text}</p>}
      {message.role === "raziel" && Array.isArray(message.sourceNames) && message.sourceNames.length ? <small>מקורות שיוחסו בשיחה: {message.sourceNames.filter(name => typeof name === "string").join(" · ")}</small> : null}
    </div>) : <p>תוכן השיחה אינו זמין לקריאה כרגע.</p> : null}
  </details>;
}

function ConversationDossier({ conversation, conversations, research, onOpenResearchItem }) {
  const [open, setOpen] = useState(false);
  const dossier = projectRazielDossier(conversation, conversations, research);
  return <details className="sod29-raziel-center-reading" data-conversation-dossier="true" onToggle={event => { if (event.target === event.currentTarget) setOpen(event.currentTarget.open); }}>
    <summary>תיק מחקר · קריאה בלבד</summary>
    {open ? <>
    <p>מקור, עובדה, חישוב ופרשנות נשארים נפרדים. ייחוס למקור אינו אישור לעובדה; מוצג רק הסיווג שכבר נשמר.</p>
    <strong>{dossier.subject?.label || "לא נשמר נושא מקושר"}</strong>
    <p>{dossier.conversations.length} שיחות קשורות · {dossier.conversations.reduce((count, item) => count + item.pictures.length, 0)} תמונות מלאות מהשיחות</p>
    {dossier.conversations.map(item => <details key={item.ref}><summary>{item.title}</summary><ConversationReading conversation={item} /></details>)}
    {dossier.items.length ? <ul>{dossier.items.map(item => <li key={`${item.type}:${item.ref ?? item.id}`}>
      {item.type === "note" ? <><strong>הערה · {item.title}</strong><p dir="auto">{typeof item.metadata?.text === "string" ? item.metadata.text : ""}</p></> : <>
        <span>{["source", "post", "verse", "book"].includes(item.type) ? "מקור שמור" : "פריט מחקר שמור · הסיווג כפי שנשמר"}</span>
        <button type="button" className="sod29-action" onClick={() => onOpenResearchItem?.(item)}>{item.title || "פתח פריט"}</button>
      </>}
    </li>)}</ul> : <p>לא נמצאו ממצאים או הערות עם קישור מפורש לאותו נושא. לא בוצע שיוך לפי מילות הכותרת.</p>}
    </> : null}
  </details>;
}

export default function RazielCenter2029({ session, research, credits, onBack, onOpenConversation, onOpenResearchItem }) {
  const root = useRef(null);
  useLayoutEffect(() => {
    const panel = root.current?.closest(".sod29-frame-panel");
    if (panel) panel.scrollTop = 0;
    root.current?.querySelector("h3")?.focus({ preventScroll: true });
  }, []);
  const [notice, setNotice] = useState("");
  const [pendingId, setPendingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [query, setQuery] = useState("");
  const savedSessions = useMemo(() => projectSavedRazielConversations(Array.isArray(research?.saved) ? research.saved : session?.savedSessions), [research?.saved, session?.savedSessions]);
  const visibleSessions = useMemo(() => filterRazielTitles(savedSessions, query), [savedSessions, query]);
  const current = projectRazielConversation(session, true);
  const storedCurrent = savedSessions.find(saved => saved.ref === current.ref);
  if (storedCurrent) current.title = storedCurrent.title;
  const balance = workspaceCreditBalance(credits);
  const syncStatus = session?.savedSessionsSyncStatus || "auth_loading";
  const loading = LOADING_STATES.has(syncStatus);
  const error = ERROR_STATES.has(syncStatus);
  const activeRef = current.ref;
  const sessionById = useMemo(() => new Map(savedSessions.map((saved) => [saved.id, saved])), [savedSessions]);

  const continueConversation = async (saved) => {
    setNotice("");
    setPendingId(saved.id);
    try {
      const result = await session?.restoreSavedSession?.(saved.id);
      if (result?.ok) { onOpenConversation?.(); return; }
      setNotice("לא הצלחנו לפתוח את השיחה כרגע.");
    } catch { setNotice("לא הצלחנו לפתוח את השיחה כרגע."); }
    finally { setPendingId(null); }
  };

  const saveCurrent = async () => {
    setNotice(""); setPendingId("current");
    try {
      const result = await session?.saveCurrentSession?.();
      setNotice(result?.ok ? RAZIEL_LOCAL_SAVE_NOTICE : "לא הצלחנו לשמור את השיחה כרגע.");
    } catch { setNotice("לא הצלחנו לשמור את השיחה כרגע."); }
    finally { setPendingId(null); }
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
    try {
      const result = await session?.renameSavedSession?.(saved.id, draftTitle);
      if (!result?.ok) {
        setNotice(result?.error === "title_required" ? "יש להזין שם לשיחה." : "לא הצלחנו לשנות את שם השיחה כרגע.");
        return;
      }
      setEditingId(null);
      setDraftTitle("");
      setNotice("שם השיחה עודכן.");
    } catch { setNotice("לא הצלחנו לשנות את שם השיחה כרגע."); }
    finally { setPendingId(null); }
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
    <section ref={root} className="sod29-raziel-center" data-raziel-center="true" aria-labelledby="sod29-raziel-center-title">
      <div className="sod29-raziel-center-head">
        <button type="button" className="sod29-action" onClick={onBack}>חזרה לאזור האישי</button>
        <div>
          <div className="sod29-kicker">האזור של רזיאל</div>
          <h3 id="sod29-raziel-center-title" tabIndex={-1}>השיחות שלי</h3>
          <p>אפשר לפתוח שיחה שמורה ולהמשיך בדיוק מאותה נקודה.</p>
        </div>
      </div>

      <div className="sod29-raziel-center-toolbar">
        <button type="button" className="sod29-action primary" disabled={session?.busy} data-raziel-center-new="true" onClick={startNewConversation}>שיחה חדשה</button>
        <small data-raziel-center-sync={syncStatus}>{syncCopy(syncStatus)}</small>
        {canRetryRazielSync(syncStatus) ? <button type="button" className="sod29-action" disabled={pendingId != null} onClick={async () => {
          setPendingId("sync");
          try { await research?.retryResearchSync?.(); }
          catch { setNotice("הסנכרון עדיין אינו זמין. השיחה לא הוצגה כמסונכרנת."); }
          finally { setPendingId(null); }
        }}>נסה לסנכרן שוב</button> : null}
      </div>

      <section className="sod29-raziel-center-state" data-current-conversation="true" aria-labelledby="raziel-current-title">
        <h4 id="raziel-current-title">השיחה הנוכחית</h4>
        {current.messages.length ? <>
          <strong>{current.title}</strong><span>{questionCountCopy(current.questions)} · {current.mode}</span>
          <div className="sod29-raziel-center-row-actions">
            <button type="button" className="sod29-action primary" onClick={() => onOpenConversation?.()}>המשך שיחה</button>
            <button type="button" className="sod29-action" disabled={session?.busy || pendingId != null || !current.messages.some(message => message.role === "raziel")} onClick={saveCurrent}>שמור שיחה</button>
          </div>
          <ConversationReading conversation={current} />
          <ConversationDossier conversation={current} conversations={[current, ...savedSessions.filter(saved => saved.ref !== current.ref)]} research={research} onOpenResearchItem={onOpenResearchItem} />
        </> : <span>אין כרגע שיחה פתוחה. אפשר להמשיך משיחה שמורה או לפתוח שיחה חדשה.</span>}
      </section>

      <div className="sod29-raziel-center-rename">
        <label htmlFor="raziel-conversation-search">חיפוש בכותרות השיחות</label>
        <input id="raziel-conversation-search" type="search" value={query} onChange={event => setQuery(event.target.value)} autoComplete="off" />
      </div>

      {loading && !savedSessions.length ? <div className="sod29-raziel-center-state" role="status"><strong>טוען את השיחות שלך…</strong><span>השיחות יוצגו כאן כשהטעינה תסתיים.</span></div> : null}
      {error ? <div className="sod29-raziel-center-state is-error" role="status"><strong>הסנכרון אינו זמין כרגע</strong><span>אם קיימות שיחות מקומיות אפשר עדיין לפתוח אותן. הרשימה אינה הוכחה שאין שיחות בחשבון.</span></div> : null}
      {!loading && !error && !savedSessions.length ? <div className="sod29-raziel-center-state is-empty"><strong>אין עדיין שיחות שמורות</strong><span>אחרי שרזיאל עונה, אפשר לבחור „שמור שיחה” ולחזור אליה מכאן.</span></div> : null}

      {savedSessions.length ? <ul className="sod29-raziel-center-list" aria-label="השיחות השמורות שלי">
        {visibleSessions.map((saved) => {
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
                <small>{savedDate(saved.savedAt)} · {questionCountCopy(saved.questions)} · {saved.mode}{active ? " · פתוחה עכשיו" : ""}</small>
                <small>{syncCopy(syncStatus)}</small>
              </div>
              <ConversationReading conversation={saved} />
              <ConversationDossier conversation={saved} conversations={savedSessions} research={research} onOpenResearchItem={onOpenResearchItem} />
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

      {savedSessions.length > 0 && !visibleSessions.length ? <p role="status">לא נמצאו שיחות בכותרת הזאת.</p> : null}

      <section className="sod29-raziel-center-state" data-raziel-credits="true" aria-label="יתרת הקרדיטים">
        <strong>הקרדיטים שלי</strong><span>{balance == null ? "היתרה אינה זמינה להצגה כרגע" : `${balance.toLocaleString("he-IL")} קרדיטים`}</span>
        <span>שמירה, שחזור וניהול של שיחה או צפייה בתמונה שכבר נוצרה אינם מחייבים קרדיטים.</span>
      </section>
      <section className="sod29-raziel-center-state" data-raziel-allowance="unavailable" aria-label="מכסת השיחות עם רזיאל">
        <strong>מכסת השיחות עם רזיאל</strong><span>המכסה עדיין אינה זמינה להצגה</span>
        <span>מכסת השיחות ויתרת הקרדיטים הן מערכות נפרדות.</span>
      </section>

      {notice ? <p className="sod29-raziel-center-notice" role="status">{notice}</p> : null}
    </section>
  );
}
