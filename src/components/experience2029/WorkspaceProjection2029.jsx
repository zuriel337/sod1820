// The personal workspace panel ("האזור האישי שלי") of the System Frame. It opens only from the frame's personal entry, so it loads on that open and
// not with the frame on every page (shell budget, ZURIEL 16.11.2026). Moved from SystemFrame2029.jsx unchanged and in the same order; the
// frame keeps the render site and shows a live loading state while this module arrives. Its follow, inbox, profile, personal-card and saved-
// research readers come with it; the stylesheet (myWorkspace2029.css) stays in the frame because the Raziel panel uses one of its classes.
import React, { useEffect, useId, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.jsx";
import { FrameState, use2029Shell, UserAvatar2029, normalizeTarget } from "./SystemFrame2029.jsx";
import { useOptionalRazielSession2029 } from "./RazielSessionMount2029.jsx";
import { publicContextLabel, contextDisplayTitle, entityTypeNounHe } from "./razielSessionSeam2029.js";
import { personalActionsLocked } from "../../lib/publicLaunch2029.js";
import { getNotificationPrefs } from "../../lib/supabase.js";
import { getUnreadCount } from "../../lib/notifications.js";
import { getMyProfile } from "../../lib/commandCenter.js";
import { WRITER_PERSONAL_MODULES, writerPersonalHref } from "../../lib/userCenter/writerPersonal2029.js";
import { followTopics } from "../../lib/userCenter/followCenter2029.js";
import { getVisitorId } from "../../lib/tracking.js";
import { workspaceResearchHref } from "../../lib/research/razielWorkspaceProjection2029.js";
import { projectWorkspaceRazielPresence2029 } from "../../lib/research/workspaceRazielPresence2029.js";
import { personalCards, personalPrimaryAction, personalCardHref } from "../../lib/userCenter/personalArea2029.js";

const AccountEntry2029 = React.lazy(() => import("../auth2029/AccountEntry2029.jsx"));
const RazielCenter2029 = React.lazy(() => import("./RazielCenter2029.jsx"));
const ElsResearchActivity2029 = React.lazy(() => import("./ElsResearchActivity2029.jsx"));

// Native personal routes have one existing source. An unbuilt module never falls back to another product runtime.
const PERSONAL_2029_MODULES = new Set(WRITER_PERSONAL_MODULES.map(([id]) => id));

const RESEARCH_SECTIONS = [
  { key: "saved", title: "שמורים", remove: "removeSaved" },
  { key: "cart", title: "במחקר עכשיו", remove: "removeFromResearch" },
  { key: "pinned", title: "מוצמדים", remove: "togglePin", removeWithEntity: true },
  { key: "history", title: "אחרונים", limit: 8 },
];

const PersonalHomeLazy2029 = React.lazy(() => import("./PersonalHome2029.jsx"));

function SavedItemEditor2029({ item, research }) {
  const [open,setOpen]=useState(false),[title,setTitle]=useState(item.title||""),[note,setNote]=useState(item.note||""),[status,setStatus]=useState("");
  const id=useId(),pending=useRef(false);
  useEffect(()=>{
    if(!pending.current)return;
    if(research.syncStatus==="synced"&&research.syncPending===0){pending.current=false;setStatus("העריכה נשמרה בחשבון ✓");}
    else if(["error","conflict","local_error"].includes(research.syncStatus)){pending.current=false;setStatus("לא התקבל אישור שמירה מהשרת. העריכה המקומית נשמרה לסנכרון חוזר.");}
  },[research.syncStatus,research.syncPending]);
  return <div><button className="sod29-workspace-unfollow" type="button" aria-expanded={open} onClick={()=>setOpen(x=>!x)}>עריכת פריט שמור</button>{open?<form className="sod29-workspace-list sod29-workspace-auth-form" onSubmit={event=>{event.preventDefault();if(pending.current)return;pending.current=true;const ok=research.saveItem?.({...item,title:title.trim()||item.title,note});setStatus(ok?"ממתין לאישור שמירה מהשרת…":"לא ניתן לשמור כרגע.");if(!ok)pending.current=false;}}>
    <label htmlFor={id+"-title"}>כותרת אישית</label><input id={id+"-title"} value={title} maxLength={200} disabled={pending.current} onChange={e=>setTitle(e.target.value)}/>
    <label htmlFor={id+"-note"}>הערה פרטית</label><textarea id={id+"-note"} value={note} maxLength={4000} rows={3} disabled={pending.current} onChange={e=>setNote(e.target.value)}/>
    <button type="submit" className="sod29-action" disabled={pending.current}>שמירת העריכה</button><small role="status">{status}</small>
  </form>:null}</div>;
}

export function ResearchStateSections({ research, go, onInspect, onOpenNumber, onOpenSavedConversation }) {
  const syncStatus = research?.syncStatus || "local_only";
  const syncLabel = research?.syncAwaitingAction ? "שינויים מקומיים ממתינים לשמירה" : syncStatus === "synced" ? "מסונכרן לחשבון" : syncStatus === "local_only" ? "מקומי בדפדפן הזה — לא מסונכרן" : syncStatus === "auth_loading" ? "בודק חשבון" : "בסנכרון עם החשבון";
  const rowTarget = (e) => ({ id: e.id, type: e.type, label: e.title, href: e.link || null, number: e.type === "number" ? e.ref : null });
  const openRow = (e) => {
    if (e.type === "raziel_session") return onOpenSavedConversation?.(e.id);
    const href = workspaceResearchHref(e);
    if (href) return go(href);
    if (e.type === "number" || e.type === "phrase") return onOpenNumber?.(rowTarget(e));
    return onInspect?.(rowTarget(e));
  };
  const collections = Array.isArray(research?.collections) ? research.collections : [];
  const saved = Array.isArray(research?.saved) ? research.saved : [];
  if (["auth_loading","loading"].includes(syncStatus)) return <FrameState kind="loading" title="קורא את השמורים מהחשבון">תוכן שטרם נקרא אינו רשימה ריקה.</FrameState>;
  if (["error","conflict","local_error","local_recovery_required"].includes(syncStatus)) return <FrameState kind="error" title="השמורים עדיין לא סונכרנו" action={<button type="button" className="sod29-action" onClick={()=>research.retryResearchSync?.()}>ניסיון סנכרון נוסף</button>}>המידע המקומי נשמר. לא התקבל אישור מהשרת; לא הוחלף מידע בחשבון.</FrameState>;
  return (
    <div className="sod29-workspace-research-state" data-research-state-source="ResearchProvider" data-research-sync={syncStatus}>
      <ElsResearchActivity2029 />
      <div className="sod29-workspace-pulse-stats" aria-label="המחקר שלי במספרים">
        {RESEARCH_SECTIONS.map((sec) => <span key={sec.key} data-count-for={sec.key}><b>{(research?.[sec.key] || []).length}</b><small>{sec.title}</small></span>)}
        <span data-count-for="collections"><b>{collections.length}</b><small>אוספים</small></span>
      </div>
      <small className="sod29-workspace-sync-note">{syncLabel}</small>
      {research?.syncAwaitingAction ? <button type="button" className="sod29-action" onClick={() => research.retryResearchSync?.()}>סנכרן את השינויים</button> : null}
      {RESEARCH_SECTIONS.map((sec) => {
        const all = Array.isArray(research?.[sec.key]) ? research[sec.key] : [];
        const rows = sec.limit ? all.slice(0, sec.limit) : all;
        return (
          <section key={sec.key} className="sod29-workspace-research-bucket" data-research-bucket={sec.key}>
            <div className="sod29-workspace-section-head"><strong>{sec.title}</strong><small>{all.length}</small>
              {sec.key === "history" && all.length ? <button type="button" className="sod29-workspace-unfollow" onClick={() => research?.clearHistory?.()}>נקה</button> : null}
            </div>
            {rows.length ? <ul className="sod29-workspace-list">
              {rows.map((e) => (
                <li key={`${sec.key}:${e.id}`} className="sod29-workspace-follow-row">
                  <button type="button" className="sod29-workspace-follow-open" onClick={() => openRow(e)}><strong>{e.title || e.id}</strong><small>{e.type === "raziel_session" ? "שיחה שמורה" : e.type}</small></button>
                  {sec.remove ? <button type="button" className="sod29-workspace-unfollow" aria-label={`הסר: ${e.title || e.id}`} onClick={() => research?.[sec.remove]?.(sec.removeWithEntity ? e : e.id)}>הסר</button> : null}
                  {sec.key === "saved" && e.type !== "raziel_session" ? <SavedItemEditor2029 key={e.id} item={e} research={research}/> : null}
                </li>
              ))}
            </ul> : <FrameState kind="empty" title="ריק">{sec.key === "saved" ? "לחץ ＋ שמור בבדיקה מהירה כדי לשמור פריט לספרייה." : "אין כאן עדיין פריטים."}</FrameState>}
          </section>
        );
      })}
      <section className="sod29-workspace-research-bucket" data-research-bucket="collections">
        <div className="sod29-workspace-section-head"><strong>אוספים</strong><small>{collections.length}</small></div>
        {collections.length ? <ul className="sod29-workspace-list">
          {collections.map((c) => <li key={c.id}><details className="sod29-raziel-center-reading"><summary>{c.name} · {saved.filter(e => e.coll === c.id).length} שמורים</summary>
            <ul className="sod29-workspace-list">{saved.filter(e => e.coll === c.id).map(e => <li key={e.id}><button type="button" className="sod29-workspace-follow-open" onClick={() => openRow(e)}>{e.title || "פתח פריט שמור"}</button></li>)}</ul>
          </details></li>)}
        </ul> : <FrameState kind="empty" title="אין אוספים">אוספים מוצגים כאן כשהם קיימים.</FrameState>}
      </section>
    </div>
  );
}

// All account surfaces share the same server-configured Auth entry.
function AccountConnection2029() {
  const location = useLocation();
  return <section className="sod29-workspace-account" data-workspace-section="account" aria-label="חיבור לחשבון">
    <AccountEntry2029 inline variant="account" returnHref={location.pathname + location.search + location.hash} />
  </section>;
}

// "האזור האישי שלי" is one entry: PersonalHome2029 (account first, compact cards, lists on demand) over the existing owners.
// A guest (or an account not yet verified) sees the account hall with the sign-in form and what opens after signing in.
function PersonalGuestHome2029() {
  const { loading } = useAuth();
  const { openIssueReport } = use2029Shell();
  const cards = personalCards({ signedIn: false });
  return <PersonalHomeLazy2029 signedIn={false} onReport={() => openIssueReport({ capability: "personal_area", returnToWorkspace: true })} avatar={<UserAvatar2029 user={null} profile={null} size="header" />} cards={cards}
    primary={null}
    slots={{ account: <AccountConnection2029 />, guestNote: <FrameState kind="empty" title="האזור האישי שלך">התחברות לחשבון קיים תציג את הפרטים והשמורים שלך. שמירה ועריכה נעשות בפעולה מפורשת; התחברות אינה מפעילה רזיאל, חיוב או דיוור.</FrameState> }} />;
}

export default function WorkspaceProjection(props) {
  const auth = useAuth();
  const actionsLocked = personalActionsLocked(auth);
  if (actionsLocked) return <PersonalGuestHome2029 />;
  return <WorkspaceProjectionOpen key={auth.user?.id || "guest"} {...props} />;
}

function WorkspaceProjectionOpen({ context, go, onRaziel, onOpenPrivateHints, journeyLocked, razielLocked, elsLocked, research, onInspect, onOpenNumber, pathResume, onSavePath, onResumePath }) {
  const subject = normalizeTarget(context?.subject, "research-context");
  const savedContext = pathResume?.latest?.representation?.context || null;
  const savedSubject = normalizeTarget(savedContext?.subject, "saved-research-path");
  const [actionState, setActionState] = useState(null);
  const { user, profile, signOut, loading: authLoading } = useAuth();
  const { openIssueReport } = use2029Shell();
  const userId = user?.id || null;
  const [follows, setFollows] = useState({ status: "loading", topics: [] });
  const [inbox, setInbox] = useState({ status: "loading", unread: null });
  const [stats, setStats] = useState(null);
  const razielSession = useOptionalRazielSession2029();
  const [workspaceSection, setWorkspaceSection] = useState("home");
  const [focusSection, setFocusSection] = useState(null);   // a section the panel is asked to open (hooks stay above the early Raziel return)
  const [summaryAttempt, setSummaryAttempt] = useState(0);

  // Follow = canonical notification_prefs seam (user or approved guest getter); no new store.
  useEffect(() => {
    let alive = true;
    setFollows({ status: "loading", topics: [] });
    if (authLoading) return () => { alive = false; };
    const idObj = userId ? { userId } : { visitorId: getVisitorId() };
    getNotificationPrefs(idObj)
      .then((row) => { const topics = followTopics(row); if (alive) setFollows({ status: "ready", topics }); })
      .catch(() => { if (alive) setFollows({ status: "error", topics: [] }); });
    return () => { alive = false; };
  }, [userId, authLoading, summaryAttempt]);

  // Notifications / profile are RLS-scoped to the signed-in user only.
  useEffect(() => {
    let alive = true;
    setInbox({ status: authLoading ? "loading" : "signed-out", unread: null });
    setStats(null);
    if (authLoading || !userId) return () => { alive = false; };
    setInbox({ status: "loading", unread: null });
    getUnreadCount({ strict: true, userId })
      .then(unread => { if (alive) setInbox({ status: "ready", unread }); })
      .catch(() => { if (alive) setInbox({ status: "error", unread: null }); });
    getMyProfile({ strict: true, userId })
      .then(prof => { if (alive) setStats(prof); })
      .catch(() => { if (alive) setStats(null); });
    return () => { alive = false; };
  }, [userId, authLoading, summaryAttempt]);

  const profileName = String(profile?.display_name || profile?.full_name || profile?.username || user?.user_metadata?.full_name || "").trim();

  const savePath = async () => {
    if (!onSavePath || pathResume?.loading) return;
    setActionState({ kind: "saving" });
    const result = await onSavePath();
    setActionState(result?.ok
      ? { kind: "saved", revision: result.revision_no }
      : { kind: "error", message: result?.error || "save_failed" });
  };

  const resumePath = async () => {
    if (!onResumePath || pathResume?.loading || !pathResume?.latest?.path_id) return;
    setActionState({ kind: "resuming" });
    const result = await onResumePath(pathResume.latest.path_id);
    if (!result?.ok) {
      setActionState({ kind: "error", message: result?.error || "resume_failed" });
      return;
    }
    setActionState({ kind: "resumed", revision: result.revision_no });
    if (result.href) go(result.href, { preserve: false });
  };

  const openResearch = () => {
    document.querySelector('[data-workspace-section="research"]')?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  };

  const openAccount = () => {
    document.querySelector('[data-workspace-section="account"]')?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  };

  const openExistingModule = (module) => {
    if (!userId || authLoading) { openAccount(); return; }
    if (!PERSONAL_2029_MODULES.has(module)) return;
    const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    go(writerPersonalHref(module, { returnTo }), { preserve: false });
  };

  const openPrivateHints = () => {
    if (!userId || authLoading) { openAccount(); return; }
    onOpenPrivateHints?.();
  };

  const requestPersonalAreaCompanion = () => {
    if (razielLocked || razielSession?.busy || typeof razielSession?.submitPersonalAreaCompanion !== "function") return;
    void razielSession.submitPersonalAreaCompanion({
      capability: "personal_overview",
      focus: "current_step",
      opaqueRefs: [],
    });
    onRaziel();
  };

  const openSavedConversation = async id => {
    try {
      const result = await razielSession?.restoreSavedSession?.(id);
      if (result?.ok) { onRaziel(); return; }
    } catch { /* existing library or lazy serializer unavailable */ }
    setActionState({ kind: "conversation_error" });
  };
  const openResearchItem = item => {
    const href = workspaceResearchHref(item);
    if (href) return go(href);
    onInspect?.({ id: item.id, type: item.type, label: item.title });
  };

  if (workspaceSection === "raziel") {
    return <RazielCenter2029
      session={razielSession}
      research={research}
      credits={stats?.credits}
      onOpenResearchItem={openResearchItem}
      onBack={() => setWorkspaceSection("home")}
      onOpenConversation={onRaziel}
    />;
  }

  const cards = personalCards({
    signedIn: !!userId, stats, follows, inbox, research, journeyLocked, elsLocked, razielLocked,
    savedConversations: Array.isArray(razielSession?.savedSessions) ? razielSession.savedSessions.length : null,
  });
  const primary = personalPrimaryAction({ signedIn: !!userId, hasContext: !!subject?.href, hasSavedPath: !!savedSubject });
  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const onNavigate = card => {
    const href = personalCardHref(card, { returnTo });
    if (!href) return;
    go(href, card.to?.module ? { preserve: false } : undefined);
  };
  const onAction = card => {
    if (card.to?.section === "raziel") setWorkspaceSection("raziel");
    else if (card.to?.section === "hints") openPrivateHints();
  };
  const onPrimary = action => {
    if (action.to?.resume && subject?.href) go(subject.href, { preserve: false });
    else if (action.to?.resumePath) resumePath();
    else if (action.to?.section) setFocusSection(action.to.section);
  };

  const razielPresence = projectWorkspaceRazielPresence2029({
    subjectLabel: publicContextLabel(subject?.label),
    savedResearchCount: Array.isArray(research?.saved) ? research.saved.filter((item) => item?.type !== "raziel_session").length : null,
    activeResearchCount: Array.isArray(research?.cart) ? research.cart.length : null,
    savedConversationCount: Array.isArray(razielSession?.savedSessions) ? razielSession.savedSessions.length : null,
    activeQuestionCount: Array.isArray(razielSession?.thread) ? razielSession.thread.filter((message) => message?.role === "user").length : null,
    followCount: follows.status === "ready" ? follows.topics.length : null,
    hintsAvailable: !journeyLocked,
    razielLocked,
  });

  const researchNode = <section data-workspace-section="research" className="sod29-workspace-research-section">
    {subject ? (
      <section className="sod29-workspace-resume-native">
        <span>איפה אני עכשיו</span><strong>{contextDisplayTitle(context, subject) || "ההקשר הנוכחי"}</strong><small>{entityTypeNounHe(subject.type)}</small>
        <div className="sod29-actions">
          {subject.href ? <button className="sod29-action primary" type="button" onClick={() => go(subject.href, { preserve: false })}>המשך בדיוק</button> : null}
          <button className="sod29-action" type="button" onClick={savePath} disabled={pathResume?.loading}>שמור מסלול</button>
          <button className="sod29-action" type="button" onClick={onRaziel} disabled={razielLocked}>{razielLocked ? "✦ רזיאל · נעול" : "✦ המשך עם רזיאל"}</button>
        </div>
      </section>
    ) : null}
    {savedSubject ? (
      <section className="sod29-workspace-resume-native" data-research-path-resume="available">
        <span>מסלול שמור (נפרד מפריטים שמורים)</span>
        <strong>{savedSubject.label}</strong>
        <small>
          {savedSubject.type}
          {pathResume?.latest?.revision_no ? ` · revision ${pathResume.latest.revision_no}` : ""}
          {" · נשמר פרטי; התוכן נבדק מחדש כשפותחים אותו"}
        </small>
        <div className="sod29-actions">
          <button className="sod29-action primary" type="button" onClick={resumePath} disabled={pathResume?.loading}>המשך מהמסלול השמור</button>
        </div>
      </section>
    ) : null}
    {!subject && !savedSubject && !pathResume?.loading ? (
      <FrameState kind="empty" title="אין כרגע מסלול פעיל">פתח גילוי, מספר, מקור או עולם — ומשם אפשר לשמור ולהמשיך.</FrameState>
    ) : null}
    <ResearchStateSections research={research} go={go} onInspect={onInspect} onOpenNumber={onOpenNumber} onOpenSavedConversation={openSavedConversation} />
    {pathResume?.loading ? <FrameState kind="loading" title="מסנכרן את המסלול">המקום שבו אתה נמצא נשמר בזמן הסנכרון.</FrameState> : null}
    {actionState?.kind === "saved" ? <FrameState title="המסלול נשמר">המסלול נשמר פרטי. המקור והפרסום לא משתנים.</FrameState> : null}
    {actionState?.kind === "error" ? <FrameState kind="error" title="המסלול לא עודכן">{actionState.message}</FrameState> : null}
    {actionState?.kind === "conversation_error" ? <FrameState kind="error" title="השיחה אינה זמינה">לא הצלחנו לפתוח את השיחה כרגע.</FrameState> : null}
  </section>;

  const followNode = <section className="sod29-workspace-follow" aria-label="אחרי מה אני עוקב" data-workspace-section="follow">
    {follows.status === "loading" ? <FrameState kind="loading" title="טוען מעקבים">קורא את ההעדפות שלך.</FrameState> : null}
    {follows.status === "error" ? <FrameState kind="error" title="המעקבים לא נטענו" action={<button type="button" className="sod29-action" onClick={() => setSummaryAttempt(n => n + 1)}>ניסיון נוסף</button>}>מצב המעקב אינו ידוע כרגע.</FrameState> : null}
    {follows.status === "ready" && !follows.topics.length ? <FrameState kind="empty" title="אין עדיין מעקבים">לחץ 🔔 על מספר, קטגוריה או ערוץ כדי לעקוב.</FrameState> : null}
    {inbox.status === "loading" ? <small>טוען את מספר העדכונים…</small> : null}
    {inbox.status === "signed-out" ? <small>התחברות נדרשת כדי לראות עדכונים אישיים.</small> : null}
    {inbox.status === "error" ? <FrameState kind="unavailable" title="מספר העדכונים אינו זמין" action={<button type="button" className="sod29-action" onClick={() => setSummaryAttempt(n => n + 1)}>ניסיון נוסף</button>}>לא ניתן לקבוע כרגע כמה עדכונים לא נקראו.</FrameState> : null}
    {inbox.status === "ready" ? <small>{inbox.unread} עדכונים שלא נקראו</small> : null}
    <button type="button" className="sod29-action" onClick={() => openExistingModule("notifications")}>{userId ? "לכל המעקבים והעדכונים" : "התחברות לניהול המעקבים והעדכונים"}</button>
  </section>;

  const razielNode = <section className="sod29-workspace-raziel-presence" aria-label="רזיאל באזור האישי" data-workspace-raziel-presence="deterministic" data-raziel-session-source="RazielSessionProvider2029">
    <div className="sod29-workspace-raziel-copy">
      <strong>{razielPresence.location}</strong>
      <p>{razielPresence.existingCopy}</p>
      <small>{razielPresence.nextStep}</small>
    </div>
    <div className="sod29-workspace-raziel-actions">
      <button className="sod29-action primary" type="button" onClick={requestPersonalAreaCompanion}
        disabled={!razielPresence.canAsk || razielSession?.busy || typeof razielSession?.submitPersonalAreaCompanion !== "function"} data-raziel-explicit-action="submit-personal-area-companion">
        {razielSession?.busy ? "רזיאל בודק…" : "עזור לי בצעד הבא"}
      </button>
      <button className="sod29-action" type="button" onClick={onRaziel} disabled={!razielPresence.canAsk} data-raziel-explicit-action="open-existing-conversation">
        {razielPresence.canAsk ? "שאל את רזיאל" : "רזיאל נעול זמנית"}
      </button>
      <button className="sod29-action" type="button" onClick={() => setWorkspaceSection("raziel")}>השיחות שלי</button>
    </div>
  </section>;

  return <PersonalHomeLazy2029 signedIn={!!userId} onReport={() => openIssueReport({ capability: "personal_area", returnToWorkspace: true })} name={profileName} email={user?.email || ""} avatar={<UserAvatar2029 user={user} profile={profile} size="header" />}
    stats={stats} follows={follows} inbox={inbox} cards={cards} primary={primary} onPrimary={onPrimary} onNavigate={onNavigate} onAction={onAction}
    focusSection={focusSection} onSectionHandled={() => setFocusSection(null)} guestLists
    slots={{ account: <AccountConnection2029 user={user} profile={profile} signOut={signOut} />, research: researchNode, follow: followNode, raziel: razielNode }} />;
}

// The visual comparison folds context independently from decorative intros.
// Context data and navigation continue to come from the existing ResearchProvider.
