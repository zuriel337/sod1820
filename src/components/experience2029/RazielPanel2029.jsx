// The Raziel conversation panel of the System Frame, moved unchanged from SystemFrame2029.jsx (SHELL_WEIGHT_REDUCTION_20261118, ZURIEL
// 18.11.2026): the frame loads it when the Raziel panel opens (React.lazy inside PanelShell's Suspense), so its code, the Raziel context
// snapshot, the ELS guidance and the saved-session sync helpers are no longer part of the frame every page downloads.
import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.jsx";
import { recordTimeLabel } from "../../lib/relativeTime2029.js";
import { useResearch } from "../../lib/research/ResearchProvider.jsx";
import { buildElsRazielGuidance } from "../../lib/research/elsRazielContext.js";
import { isRazielNextAction } from "../../lib/research/razielActionContract.js";
import { razielSavedSyncCopy, canRetryRazielSync, RAZIEL_LOCAL_SAVE_NOTICE } from "../../lib/research/razielSavedSync2029.js";
import { createRazielContextSnapshot, selectRazielDeepeningCandidate } from "../../lib/research/razielSession2029.js";
import { razielViewModeLabel } from "../../lib/research/razielViewMode2029.js";
import { useOptionalRazielSession2029 } from "./RazielSessionMount2029.jsx";
import { publicContextLabel, contextDisplayTitle, entityTypeNounHe, razielContextParts, razielNavigationButton, razielStatusLabel } from "./razielSessionSeam2029.js";
import { FrameState, PreviewTransportDisclosure2029, RazielOrb } from "./SystemFrame2029.jsx";

const RazielViewModeSelector2029 = React.lazy(() => import("./RazielViewModeSelector2029.jsx"));
const RazielOneShotActions2029 = React.lazy(() => import("./RazielOneShotActions2029.jsx"));
const ElsMatrixReadingActivity2029 = React.lazy(() => import("./ElsMatrixReadingActivity2029.jsx"));

const RAZIEL_LEVEL_LABEL = { deterministic: "דטרמיניסטי", fast: "מהיר", deep: "עמוק" };

function savedRazielDate(value) {
  return recordTimeLabel(value, "bilingual", "");
}

// One temporary Raziel conversation is shared by the desktop Companion and the mobile sheet.
// Opening, navigating and changing view mode make no AI call; only an explicit submit crosses the transport.
function RazielNativeChat({ context, label, numberFocus, readingFocus, elsFocus = null, primary = false, projection = "mobile", onSignup = null }) {
  const researchSync = useResearch();
  const session = useOptionalRazielSession2029();
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [deepOpen, setDeepOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [savedNotice, setSavedNotice] = useState("");
  const [guestQuotaEnded, setGuestQuotaEnded] = useState(false);
  const threadLength = session?.thread?.length || 0;
  const lastTurnRef = useCallback((node) => { node?.scrollIntoView?.({ block: "nearest" }); }, [threadLength]);
  // Quota belongs to the server and to the current principal. This local bit is only a transient
  // presentation of a server-emitted denial; it is reset whenever identity changes and is never persisted.
  useEffect(() => { setGuestQuotaEnded(false); }, [user?.id]);
  if (!session) return <section className="sod29-panel-context-card sod29-raziel-chat" data-raziel-native-chat="unavailable"><b>רזיאל</b><small role="status">השיחה עם רזיאל אינה זמינה כאן כרגע.</small></section>;
  const { thread, busy, status, announcement } = session;
  const subjectLabel = context?.subject?.label || "";
  const buildFacts = () => [
    numberFocus?.root != null ? `שורש עמוד: ${numberFocus.root}` : "",
    numberFocus ? `מוקד מספר: ${numberFocus.expression || numberFocus.root}${numberFocus.method ? ` · ${numberFocus.method}` : ""}${numberFocus.resultValue != null ? ` → ${numberFocus.resultValue}` : ""}` : "",
    readingFocus ? `קוראים עכשיו: ${readingFocus.label || ""} ${readingFocus.primary || ""}`.trim() : "",
    label && label !== subjectLabel ? `מוקד נבחר: ${label}` : "",
  ].filter(Boolean).join("\n").slice(0, 1200);
  // Listen only while this explicit AI action is in flight. Opening the chat, changing its view,
  // deterministic UI and public reading never pass through here and therefore cannot trigger the journey.
  const runSessionAction = async (action) => {
    let deniedAsGuest = false;
    const onQuota = (event) => { if (event?.detail?.tier === "anon") deniedAsGuest = true; };
    try { window.addEventListener("sod:ai-quota", onQuota); } catch { /* non-browser renderer */ }
    try {
      const result = await action();
      if (deniedAsGuest && !user?.id) setGuestQuotaEnded(true);
      return result;
    } finally {
      try { window.removeEventListener("sod:ai-quota", onQuota); } catch { /* non-browser renderer */ }
    }
  };
  const send = async (question, level, again = false, continuationTurnId = null) => {
    const q = String(question || "").trim();
    if (!q || busy || guestQuotaEnded) return;
    setDeepOpen(false);
    const result = await runSessionAction(() => session.submit({ question: q, intelligenceLevel: level, again, continuationTurnId, facts: buildFacts(), view: { numberFocus, readingFocus, elsFocus }, projection }));
    if (result?.ok && !again) setText("");
  };
  const saveConversation = async () => {
    setSavedNotice("");
    const result = await session.saveCurrentSession?.();
    setSavedNotice(result?.ok
      ? RAZIEL_LOCAL_SAVE_NOTICE
      : result?.error === "session_too_large" ? "השיחה ארוכה מדי לשמירה אחת. כדאי לפתוח שיחה חדשה ולשמור את החלק הבא בנפרד."
        : "לא הצלחנו לשמור את השיחה כרגע.");
  };
  const openConversation = async (saved) => {
    setSavedNotice("");
    const result = await session.restoreSavedSession?.(saved.id);
    if (result?.ok) {
      setSavedOpen(false);
      setSavedNotice("השיחה השמורה נפתחה ואפשר להמשיך ממנה.");
    } else setSavedNotice("השיחה השמורה אינה זמינה כרגע.");
  };
  const removeConversation = (saved) => {
    if (typeof window !== "undefined" && !window.confirm(`למחוק את השיחה „${saved.title || "שיחה עם רזיאל"}”?`)) return;
    if (session.removeSavedSession?.(saved.id)) setSavedNotice("השיחה הוסרה מהשמורים.");
  };
  const newConversation = () => {
    if (busy || !thread.length) return;
    if (typeof window !== "undefined" && !window.confirm("לפתוח שיחה חדשה? השיחה הנוכחית תיעלם אם עדיין לא שמרת אותה.")) return;
    if (session.resetTemporarySession?.()) {
      setDeepOpen(false);
      setSavedNotice("נפתחה שיחה חדשה.");
    }
  };
  const contextParts = razielContextParts(createRazielContextSnapshot(context, { numberFocus, readingFocus, elsFocus }));
  const lastRaziel = [...thread].reverse().find((m) => m.role === "raziel");
  const deepCandidate = selectRazielDeepeningCandidate(session);
  const sourceNames = Array.isArray(lastRaziel?.sourceNames) ? lastRaziel.sourceNames.slice(0, 3) : [];
  const stateLabel = razielStatusLabel({ busy, status });
  return (
    <section className="sod29-panel-context-card sod29-raziel-chat" data-raziel-native-chat="true" data-raziel-session="shared" data-raziel-projection={projection} aria-label="שיחה עם רזיאל">
      <b>✦ השיחה עם רזיאל</b><small data-raziel-state={busy ? "thinking" : status}>{stateLabel}</small>
      {projection === "desktop" ? <PreviewTransportDisclosure2029 /> : null}
      <div className="sod29-raziel-context" data-raziel-context-strip="true" aria-label="מה רזיאל רואה עכשיו">
        <p>{contextParts.length ? contextParts.map((part, index) => <React.Fragment key={part.key}>{index ? <span aria-hidden="true"> · </span> : null}{part.prefix ? `${part.prefix}: ` : ""}<bdi>{part.label}</bdi></React.Fragment>) : "שאלה חופשית — או בחר מספר, ביטוי או קטע"}</p>
      </div>
      <RazielViewModeSelector2029 />
      <ElsMatrixReadingActivity2029 />
      <div className="sod29-raziel-thread" role="log" aria-label="השיחה עם רזיאל">
        {thread.map((m, i) => (
          <div key={`${m.turnId || i}:${m.role}`} ref={i === thread.length - 1 ? lastTurnRef : undefined} className={m.role === "user" ? "sod29-raziel-chat-user" : "sod29-raziel-chat-raziel"}>
            <small>{m.role === "user" ? "שאלת" : "רזיאל"}</small>
            {m.viewMode === "landscape" && m.viewModeApplied ? <details open><summary>התמונה המלאה</summary><span dir="auto">{m.text}</span></details> : <span dir="auto">{m.text}</span>}
            {razielNavigationButton(m) ? <div className="sod29-raziel-nav-action">{razielNavigationButton(m).external
              ? <a className="sod29-action primary" href={razielNavigationButton(m).href} target="_blank" rel="noopener noreferrer" data-raziel-navigation-action={razielNavigationButton(m).intent}>{razielNavigationButton(m).label}</a>
              : <Link className="sod29-action primary" to={razielNavigationButton(m).href} data-raziel-navigation-action={razielNavigationButton(m).intent}>{razielNavigationButton(m).label}</Link>}</div> : null}
            {m.role === "raziel" ? <div className="sod29-raziel-answer-meta">
              <small data-raziel-level={m.level}>{RAZIEL_LEVEL_LABEL[m.level] || ""}</small>
              {m.viewMode ? <small data-raziel-view-mode-answer={m.viewModeApplied ? m.viewMode : "not_applied"}>{m.viewModeApplied ? `${razielViewModeLabel(m.viewMode)} · ניסוי` : `${razielViewModeLabel(m.viewMode)} לא הופעל`}</small> : null}
              {m === lastRaziel && sourceNames.length ? <small className="sod29-raziel-provenance">מקורות: <bdi>{sourceNames.join(" · ")}</bdi></small> : null}
              {m === lastRaziel && m.grounding === "interpretation" ? <small className="sod29-raziel-grounding" data-raziel-grounding="interpretation">ללא מקור מאומת · פרשנות של רזיאל</small> : null}
              {m === deepCandidate ? <button className="sod29-action" type="button" disabled={busy || guestQuotaEnded} aria-expanded={deepOpen} data-raziel-deepen-preview="true" onClick={() => setDeepOpen((open) => !open)}>בדוק לעומק</button> : null}
              {m === lastRaziel && status === "ready" ? <RazielOneShotActions2029 session={session} disabled={guestQuotaEnded} onRun={(kind) => runSessionAction(() => session.submitOneShot(kind, { projection }))} /> : null}
            </div> : null}
          </div>
        ))}
      </div>
      {deepCandidate && deepOpen ? <div className="sod29-raziel-deep-offer" data-raziel-deep-offer="true">
        <b>מה ההעמקה תעשה</b>
        <ul>
          <li>אותה שאלה ואותו הקשר, במודל העמוק של רזיאל.</li>
          <li>{sourceNames.length ? <>תבחן שוב את המקורות שכבר צורפו: <bdi>{sourceNames.join(" · ")}</bdi>.</> : "בתשובה המהירה לא צורפו מקורות מאומתים, וההעמקה לא תמציא מקור."}</li>
          <li>לא מורצים כלים חדשים ואין חיפוש ברשת.</li>
          <li>אם אין ראיה לקשר, התשובה תאמר זאת.</li>
        </ul>
        <button className="sod29-action primary" type="button" disabled={busy || guestQuotaEnded} data-raziel-deepen="true" onClick={() => send(deepCandidate.question, "deep", true, deepCandidate.turnId)}>בדוק לעומק</button>
        <button className="sod29-action" type="button" onClick={() => setDeepOpen(false)}>לא עכשיו</button>
      </div> : null}
      <div className="sod29-raziel-session-actions" aria-label="שמירה והיסטוריה של שיחות רזיאל">
        <button className="sod29-action" type="button" disabled={busy || !lastRaziel} data-raziel-save-session="true" onClick={saveConversation}>♡ שמור שיחה</button>
        <button className="sod29-action" type="button" aria-expanded={savedOpen} data-raziel-saved-sessions="true" onClick={() => setSavedOpen((open) => !open)}>▤ השיחות שלי{session.savedSessions?.length ? ` · ${session.savedSessions.length}` : ""}</button>
        <button className="sod29-action" type="button" disabled={busy || !thread.length} data-raziel-new-session="true" onClick={newConversation}>＋ שיחה חדשה</button>
      </div>
      {savedOpen ? <div className="sod29-raziel-saved-panel" data-raziel-saved-panel="true">
        <b>השיחות השמורות שלי</b>
        <small role="status" data-raziel-saved-sync={session.savedSessionsSyncStatus}>{razielSavedSyncCopy(session.savedSessionsSyncStatus)}</small>
        {canRetryRazielSync(session.savedSessionsSyncStatus) ? <button className="sod29-action" type="button" onClick={() => researchSync.retryResearchSync?.()}>נסה לסנכרן שוב</button> : null}
        {!session.savedSessions?.length ? <p>כאן יוצגו שיחות שנשמרו במפורש באמצעות „שמור שיחה”. שיחות שלא נשמרו אינן היסטוריה אוטומטית בחשבון.</p> : null}
        <ul>
          {session.savedSessions.map((saved) => <li key={saved.id}>
            <button type="button" className="sod29-raziel-saved-open" onClick={() => openConversation(saved)}>
              <strong>{saved.title || "שיחה עם רזיאל"}</strong>
              <small>{saved.turn_count || 0} שאלות{savedRazielDate(saved.saved_at) ? ` · ${savedRazielDate(saved.saved_at)}` : ""}</small>
            </button>
            <button type="button" className="sod29-workspace-unfollow" aria-label={`מחק שיחה: ${saved.title || "שיחה עם רזיאל"}`} onClick={() => removeConversation(saved)}>מחק</button>
          </li>)}
        </ul>
      </div> : null}
      {savedNotice ? <small className="sod29-raziel-save-notice" role="status">{savedNotice}</small> : null}
      {savedNotice && !savedOpen ? <small role="status" data-raziel-saved-sync={session.savedSessionsSyncStatus}>{razielSavedSyncCopy(session.savedSessionsSyncStatus)}</small> : null}
      {!user?.id && lastRaziel ? guestQuotaEnded ? <div className="sod29-raziel-deep-offer" data-raziel-quota-ended="guest" role="status">
        <p>שיחות הניסיון להיום הסתיימו. הרשמה חינמית תאפשר לך להמשיך לדבר עם רזיאל ולשמור את השיחות שלך.</p>
        {onSignup ? <button className="sod29-action primary" type="button" onClick={onSignup}>הרשמה בחינם</button> : null}
      </div> : <div className="sod29-raziel-deep-offer" data-raziel-registration-nudge="after-value">
        <p>נהנית מהשיחה? הירשם בחינם כדי לשמור אותה ולהמשיך בדיוק מאותה נקודה, גם ממכשיר אחר.</p>
        {onSignup ? <button className="sod29-action" type="button" onClick={onSignup}>הרשמה בחינם</button> : null}
      </div> : null}
      <small className="sod29-raziel-status" role="status">{busy || (status === "error" && !guestQuotaEnded) ? announcement : ""}</small>
      <form className="sod29-raziel-composer" onSubmit={(e) => { e.preventDefault(); send(text, "fast"); }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="שאל את רזיאל על מה שמולך" maxLength={300} aria-label="שאלה לרזיאל" dir="auto" disabled={busy || guestQuotaEnded} />
        <button className={primary ? "sod29-action primary" : "sod29-action"} type="submit" disabled={busy || guestQuotaEnded || !text.trim()}>{busy ? "חושב…" : "שלח"}</button>
      </form>
    </section>
  );
}

function RazielProjection({ target, context, numberCoreFocus = null, microIntent: transientMicroIntent = null, readingFocus: transientReadingFocus = null, elsSurfaceContext = null, razielRouteAction = null, onSignup = null }) {
  const displayLabel = contextDisplayTitle(context, target);
  const label = displayLabel || "ההקשר הנוכחי";
  const numberFocus = numberCoreFocus || context?.dimensions?.numberCoreFocus || null;
  const readingFocus = transientReadingFocus || context?.dimensions?.readingFocus || null;
  const routeActionValid = isRazielNextAction(razielRouteAction);
  const routeHomeLabel = routeActionValid ? ({
    current: "כאן",
    world: "בעולם",
    heichal: "בהיכל",
    journey: "במסע",
  }[razielRouteAction.preferred_home] || null) : null;
  const elsFocus = elsSurfaceContext?.surface === "els"
    && elsSurfaceContext?.occurrence?.occurrenceRef
    && elsSurfaceContext?.result?.contract === "els_2029_projection_v1"
    && elsSurfaceContext?.result?.status === "OK"
    && elsSurfaceContext?.result?.presentationPolicy === "exact_replay_v1"
    ? elsSurfaceContext
    : null;
  const elsGuide = elsFocus ? buildElsRazielGuidance(elsFocus) : null;
  const microIntent = transientMicroIntent || context?.dimensions?.razielMicroIntent || null;
  const intentLabel = {
    explain_crossing: "הסבר את ההצלבה",
    explain_method: "הסבר את השיטה",
    compare_methods: "השווה שיטות",
    next_research_step: "מה כדאי לבדוק עכשיו?",
    explain_world: "הסבר את העולם",
    explain_world_context: "הסבר את מרכז העולמות",
    expand_panel: "המשך מה־Micro",
    explain_reading_focus: "הסבר את החלק שאני קורא",
    explain_els_occurrence: "הסבר את מופע ה־ELS",
  }[microIntent] || null;
  const quickInsight = (() => {
    if (!numberFocus) return null;
    if (numberFocus.kind === "method") {
      const methodLabel = numberFocus.methodLabel || numberFocus.method || "השיטה הפעילה";
      return {
        title: `תגובה מהירה · ${methodLabel}`,
        text: `${methodLabel} מחושבת באמצעות החישוב המאומת של האתר על ${numberFocus.expression || numberFocus.root}. התוצאה הפעילה היא ${numberFocus.resultValue ?? "—"}. פתח את החישוב כדי לראות את השלבים; השוואה לשיטה אחרת היא בדיקה נפרדת ולא משנה את הביטוי שבחרת.`,
        boundary: "החישוב מאומת בנפרד; המשמעות נשארת פרשנות.",
      };
    }
    if (numberFocus.kind === "crossing") {
      const names = Array.isArray(numberFocus.methods) ? numberFocus.methods.map((item) => item?.methodLabel).filter(Boolean).join(" · ") : "";
      return {
        title: "תגובה מהירה · הצלבה",
        text: `${numberFocus.expression || numberFocus.root} והביטוי ${numberFocus.partner || numberFocus.crossingPartner || "המקביל"} נפגשים סביב ${numberFocus.root}${names ? ` דרך ${names}` : ""}. זו הצלבה חישובית; היא פותחת חיבור לבדיקה אבל אינה מסקנה בפני עצמה.`,
        boundary: "שוויון מספרי לבדו אינו הוכחה למשמעות.",
      };
    }
    if (numberFocus.kind === "world") {
      return {
        title: `תגובה מהירה · ${numberFocus.world || "עולם"}`,
        text: `העולם הזה מחובר כרגע למספר ${numberFocus.root} כהקשר עם ${numberFocus.count ?? 0} פריטים. הוא לא תוצאה של שיטת גימטריה. אפשר לפתוח את העולם המלא כדי לראות את הקשרים והמקורות סביב העוגן.`,
        boundary: "העולם מציג הקשר; הוא לא תוצאת חישוב.",
      };
    }
    if (numberFocus.kind === "world_hub") {
      const worldCount = Array.isArray(numberFocus.worlds) ? numberFocus.worlds.length : 0;
      const relatedCount = Array.isArray(numberFocus.relatedNumbers) ? numberFocus.relatedNumbers.length : 0;
      return {
        title: "תגובה מהירה · מרכז העולמות",
        text: `סביב ${numberFocus.root} מוצגים כרגע ${worldCount} עולמות ו־${relatedCount} מספרים קשורים בתצוגה המוגבלת. זהו מבט ניווטי; העולם המלא מחזיק את ההקשרים הרחבים יותר.`,
        boundary: "הצגה בולטת אינה דירוג אמת.",
      };
    }
    return {
      title: `תגובה מהירה · ${intentLabel || "המספר"}`,
      text: `רזיאל קיבל את המספר ${numberFocus.root}, הביטוי ${numberFocus.expression || numberFocus.root} והשיטה ${numberFocus.method || "הפעילה"}. אפשר להמשיך לחישוב, להשוואה או לעומק בלי לאבד את המקום.`,
      boundary: "אותו הקשר, עומק שונה.",
    };
  })();
  return (
    <>
      <section className="sod29-raziel-native-hero">
        <RazielOrb />
        <div>
          <div className="sod29-kicker">רזיאל · איתך כאן</div>
          <h3>{displayLabel ? `איתך בחקירת ${displayLabel}` : "מה תרצה לחקור?"}</h3>
          <p>זה אותו רזיאל בכל האתר. הוא יודע איפה אתה ומה פתחת, והעמקה לא מאבדת את ההקשר.</p>
        </div>
      </section>
      {readingFocus ? <section className="sod29-panel-context-card" data-reading-focus-card="true">
        <b>{`קוראים עכשיו · ${readingFocus.label || "המקור"}`}</b>
        <span>{readingFocus.primary || readingFocus.label || "החלק הפעיל"}</span>
        {readingFocus.sourceLabel ? <small>מקור · {readingFocus.sourceLabel}</small> : null}
        {readingFocus.signals?.length ? <small>{readingFocus.signals.slice(0, 3).join(" · ")}</small> : null}
      </section> : null}
      {elsFocus ? <section className="sod29-panel-context-card" data-raziel-els-context="true">
        <b>{intentLabel || "המופע הנבחר"}</b>
        <span><bdi>{elsFocus.text?.term || label}</bdi> · מופע מאומת</span>
        <span>דילוג <bdi>{elsFocus.occurrence.skip ?? "—"}</bdi> · {elsFocus.occurrence.dir === -1 ? "לאחור" : elsFocus.occurrence.dir === 1 ? "קדימה" : "הכיוון לא צוין"}</span>
        <small>מיקום התחלה <bdi>{elsFocus.occurrence.start ?? "—"}</bdi> · סיום <bdi>{elsFocus.occurrence.end ?? "—"}</bdi> · <bdi>{elsFocus.occurrence.positions?.length ?? 0}</bdi> אותיות</small>
        <small>האותיות והמיקומים אומתו במנוע. קרבה חזותית אינה מדד לחוזק הממצא.</small>
      </section> : null}
      {elsGuide ? <section className="sod29-panel-context-card sod29-raziel-els-guide" data-raziel-els-guide={elsGuide.contract}>
        <b>{elsGuide.title}</b>
        <span>{elsGuide.lead}</span>
        <small>{elsGuide.boundary}</small>
        <small>{elsGuide.inactive}</small>
        <span>{elsGuide.question}</span>
      </section> : null}
      {numberFocus ? <section className="sod29-panel-context-card">
        <b>{intentLabel || "המספר הנבחר"}</b>
        <span>{numberFocus.expression || numberFocus.root}{numberFocus.method ? ` · ${numberFocus.method}` : ""}{numberFocus.resultValue != null ? ` → ${numberFocus.resultValue}` : ""}</span>
        {numberFocus.crossingPartner ? <small>הצלבה · {numberFocus.crossingPartner}</small> : null}
        {numberFocus.zeroScaleNext != null ? <small>סולם האפס · <bdi>{numberFocus.root} → {numberFocus.zeroScaleNext}</bdi></small> : null}
      </section> : !readingFocus && !elsFocus && !routeActionValid ? <FrameState title="אפשר להתחיל בשאלה">אין כרגע מוקד מחקר נבחר. אפשר לבחור מספר, ביטוי או קטע, או לשאול שאלה חופשית.</FrameState> : null}
      {quickInsight ? <section className="sod29-panel-context-card sod29-raziel-quick-insight">
        <b>{quickInsight.title}</b>
        <span>{quickInsight.text}</span>
        <small>{quickInsight.boundary}</small>
      </section> : null}
      <div className="sod29-panel-context-card">
        <b>מה רזיאל רואה עכשיו</b>
        <span>{context?.subject ? contextDisplayTitle(context) || "ההקשר הנוכחי" : "אין מוקד פעיל"}</span>
        {target?.source === "selection" ? <small>בחירה זמנית: {publicContextLabel(target.label) || entityTypeNounHe(target.type)}</small> : null}
      </div>
      <div className="sod29-panel-actions-grid">
        {routeActionValid ? <button
          className="sod29-action primary"
          type="button"
          disabled
          data-raziel-route-action={razielRouteAction.route_action}
          data-raziel-route-home={razielRouteAction.preferred_home}
          title="הפעולה מוכנה בהקשר הזה, אבל עדיין אינה פעילה"
        >◌ {razielRouteAction.label}{routeHomeLabel ? ` · ${routeHomeLabel}` : ""}</button> : null}
      </div>
      <RazielNativeChat context={context} label={label} numberFocus={numberFocus} readingFocus={readingFocus} elsFocus={elsFocus} primary={!routeActionValid} projection="mobile" onSignup={onSignup} />
    </>
  );
}

export default RazielProjection;
