import React, { useEffect, useState, useCallback, useRef } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import { use2029Palette } from "../lib/palette.js";
import { personalActionsLocked } from "../lib/publicLaunch2029.js";
import { PUBLIC_READING_RELEASE } from "../lib/publicReadingRelease2029.js";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { ResearchStateSections } from "../components/experience2029/SystemFrame2029.jsx";
import PersonalNotes2029 from "../components/userCenter/PersonalNotes2029.jsx";
import { applySeo } from "../lib/seo.js";
import { WRITER_PERSONAL_MODULES, personalMessagesState, personalReturnHref, writerPersonalHref, writerSelfRequest } from "../lib/userCenter/writerPersonal2029.js";
import { use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import ProfileSettings from "../components/ProfileSettings.jsx";
import { PageEditor, MessagesHub } from "../components/userCenter/UserCenter.jsx";
import FollowCenterController2029 from "../components/followCenter2029/FollowCenterController2029.jsx";
import { WriterPersonalLayout2029, WriterPersonalHome2029, WriterPublicPortrait2029, WriterPrivateProgress2029 } from "../components/contributor2029/WriterPersonalViews2029.jsx";

function useSelf(userId) {
  const [attempt, setAttempt] = useState({ version: 0, background: false });
  const [state, setState] = useState({ key: null, state: "loading" });
  const reload = useCallback((background = false) => setAttempt((value) => ({ version: value.version + 1, background: background === true })), []);
  useEffect(() => {
    if (!userId) return;
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 12000);
    const sameReadyAccount = (value) => attempt.background && value.key === userId && value.state === "ready";
    setState((value) => sameReadyAccount(value) ? { ...value, refreshState: "loading" } : { key: userId, state: "loading" });
    const settle = (value) => setState((current) => value.state === "unavailable" && sameReadyAccount(current)
      ? { ...current, refreshState: "unavailable" } : { key: userId, ...value, refreshState: "idle" });
    writerSelfRequest({ userId, signal: abort.signal }).then((value) => { if (!abort.signal.aborted) settle(value); }).finally(() => clearTimeout(timer));
    const timeout = () => settle({ state: "unavailable" });
    abort.signal.addEventListener("abort", timeout, { once: true });
    return () => { abort.signal.removeEventListener("abort", timeout); abort.abort(); clearTimeout(timer); };
  }, [userId, attempt]);
  return { data: state.key === userId ? state : { state: "loading" }, reload };
}

export function WriterMe2029Redirect() {
  const actionsLocked = personalActionsLocked(useAuth());
  const { user, loading } = useAuth();
  const location = useLocation();
  const { data } = useSelf(actionsLocked || loading ? null : user?.id);
  if (actionsLocked) return <Navigate replace to={writerPersonalHref("public-page")} />;
  if (user && data.state === "ready" && data.writer?.state === "ready" && data.writer.publicVisible) {
    const input = new URLSearchParams(location.search), output = new URLSearchParams();
    for (const key of ["view", "section", "item", "format", "page", "sort"]) if (input.has(key)) output.set(key, input.get(key));
    if (personalReturnHref(input.get("returnTo"))) output.set("returnTo", input.get("returnTo"));
    return <Navigate replace to={`${data.writer.href}${output.size ? `?${output}` : ""}`} />;
  }
  if (!loading && (!user || data.state !== "loading")) return <Navigate replace to={writerPersonalHref("public-page")} />;
  return <WriterPersonalLayout2029 title="הדף שלי" state="loading" />;
}

export default function WriterPersonal2029Page() {
  const auth = useAuth();
  const actionsLocked = personalActionsLocked(auth);
  const { module } = useParams();
  const { user, loading } = useAuth();
  useEffect(() => { applySeo({ title: "האזור האישי", description: "הדף שלי והפעילות האישית שלי.", path: writerPersonalHref(module), noindex: true }); }, [module]);
  if (actionsLocked && !PUBLIC_READING_RELEASE) return <WriterPersonalLayout2029 title="האזור האישי ייפתח בהמשך" state="acceptance-pending"><p>פעולות החשבון נשמרו ואינן פעילות בגרסת תצוגה זו.</p></WriterPersonalLayout2029>;
  return <WriterPersonalController2029 key={user?.id || "guest"} module={module} user={user} authLoading={loading} />;
}

function WriterPersonalController2029({ module, user, authLoading }) {
  const auth = useAuth(), shell = use2029Shell(), P = use2029Palette(), location = useLocation(), navigate = useNavigate();
  const research = useResearch();
  const independentModule = ["notifications","messages","profile","research","notes"].includes(module);
  const { data, reload } = useSelf(authLoading || ["notifications","messages","research","notes"].includes(module) ? null : user?.id);
  const [mutation, setMutation] = useState("idle"), [conversation, setConversation] = useState(null);
  const pending = useRef(false), mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const params = new URLSearchParams(location.search);
  const selected = WRITER_PERSONAL_MODULES.some(([id]) => id === module) ? module : "public-page";
  const previewReadOnly = import.meta.env.VITE_INTEGRATED_PREVIEW === "true" && import.meta.env.VITE_FUNCTIONAL_UNIFIED_PREVIEW !== "true";
  const returnHref = personalReturnHref(params.get("returnTo"));
  // These modules have their own authenticated readers. An unavailable public
  // writer overview must not prevent the existing private inbox from opening.
  const state = authLoading ? "loading" : !user ? "login_required" : independentModule ? "ready" : data.state === "loading" ? "loading" : data.state === "ready" ? "ready" : "error";
  const writer = data.writer || { state: "unavailable" };
  const T = { bg: P.pageBg, card: P.card, ink: P.ink, sub: P.inkSoft, line: P.border, acc: P.accentText,
    accSoft: P.cardSoft, gold: P.brandGold, goldSoft: P.cardSoft };
  const setActive = (next, payload) => navigate(writerPersonalHref(next, { returnTo: returnHref, dm: payload?.dm }));
  const goto = (href) => { if (typeof href === "string" && href.startsWith("/") && !href.startsWith("//")) navigate(href); };
  const sourceWriter = params.get("writer"), dm = params.get("dm");
  useEffect(() => {
    let alive = true;
    setConversation(null);
    if (!user?.id || selected !== "messages" || !sourceWriter && !dm) return;
    writerSelfRequest({ userId: user.id, query: { action: "conversation", ...(sourceWriter ? { writer: sourceWriter } : { counterpart: dm }) } })
      .then((result) => { if (alive) setConversation(result); });
    return () => { alive = false; };
  }, [user?.id, selected, sourceWriter, dm]);
  const resolveWriterHref = useCallback(async (counterpart) => {
    const result = await writerSelfRequest({ userId: user?.id, query: { action: "conversation", counterpart } });
    return result.state === "ready" ? result.writerHref : null;
  }, [user?.id]);
  async function mutate(action, payload) {
    if (pending.current || !user?.id || personalActionsLocked(auth)) return { ok: false, error: "הפעולה אינה זמינה כרגע." };
    pending.current = true;
    setMutation("saving");
    const result = await writerSelfRequest({ action, payload: { ...payload, ack: true }, userId: user.id });
    pending.current = false;
    if (mounted.current) {
      setMutation(result.state === "saved" ? "saved" : "error");
      if (result.state === "saved") reload();
    }
    return { ok: result.state === "saved", error: result.state === "name_taken" ? "השם הציבורי כבר בשימוש. בחרו שם שיבדיל את הדף שלכם." : "לא התקבל אישור עדכון. רעננו את הדף לפני ניסיון נוסף." };
  }
  const nav = WRITER_PERSONAL_MODULES.map(([id, label]) => ({ id, label, href: writerPersonalHref(id, { returnTo: returnHref }), active: id === selected }));
  return <WriterPersonalLayout2029 title={WRITER_PERSONAL_MODULES.find(([id]) => id === selected)?.[1]} description="אותו חשבון, אותם תכנים ואותם כלים אישיים."
    state={state} module={selected} onRetry={reload} onOpenWorkspace={shell.openWorkspace} publicHref={writer.publicVisible ? writer.href : null} returnHref={returnHref} nav={nav}>
    {!user && !authLoading ? <section className="wp-card wp-login" aria-labelledby="wp-login-title"><h2 id="wp-login-title" className="wp-h">צריך להתחבר כדי לראות את האזור האישי</h2><p className="wp-muted">הפרופיל, ההודעות, המעקב וההתקדמות מוצגים רק לחשבון שלהם הם שייכים.</p><button className="wp-btn wp-primary" type="button" onClick={shell.openWorkspace}>התחברות לאזור האישי</button></section> : null}
    {state === "ready" && PUBLIC_READING_RELEASE && !auth.verified ? <p role="status">מאמת את החשבון לפני הצגת המידע האישי…</p> : null}
    {state === "ready" ? <div style={{display: PUBLIC_READING_RELEASE && !auth.verified ? "none" : undefined}} inert={PUBLIC_READING_RELEASE && !auth.verified ? true : undefined}>
      {selected === "research" ? <ResearchStateSections research={research} go={goto} onOpenNumber={target=>shell.openNumber?.(target)} onInspect={target=>shell.openInspect?.(target)} /> : null}
      {selected === "notes" ? <PersonalNotes2029 key={user.id} userId={user.id} disabled={personalActionsLocked(auth)} /> : null}
      {previewReadOnly && (selected === "public-page" || selected === "page-editor") ? <p role="status">בגרסת התצוגה אפשר לצפות בפרטי הדף. יצירה ושמירה של שינויים אינן זמינות כאן.</p> : null}
      {selected === "public-page" ? <WriterPersonalHome2029 principalKey={user.id} writer={writer} state="ready" onRetry={reload}
        onCreate={previewReadOnly ? undefined : (values) => mutate("create", values)} onEdit={() => setActive("page-editor")} /> : null}
      {selected === "page-editor" ? <>
        {writer.state === "ready" ? <PageEditor T={T} goto={goto} onSaved={() => reload(true)} refreshUnavailable={data.refreshState === "unavailable"} readOnly={previewReadOnly} /> : <WriterPersonalHome2029 principalKey={user.id} writer={writer} state="ready" onRetry={reload} onCreate={previewReadOnly ? undefined : (values) => mutate("create", values)} />}
        {writer.publicVisible ? <a className="pc-open" href={writer.href}>בחירת כתבים והקדמה בדף שלי</a> : null}
      </> : null}
      {selected === "profile" ? <>
        <ProfileSettings key={user.id} t={{ fieldBg: P.cardSoft, ink: P.ink, line: P.border, sub: P.inkSoft, acc: P.accentText, danger: P.dangerText, btnBg: P.accentBtn, btnText: P.onAccent }} onDone={reload} showSignOut onSignOut={()=>navigate(returnHref||"/")} />
        {writer.state === "ready" ? <WriterPublicPortrait2029 principalKey={user.id} accountAvatar={data.accountAvatar} publicAvatar={writer.avatar} state={mutation} onRetry={reload}
          onApply={() => mutate("portrait", { enabled: true })} onHide={() => mutate("portrait", { enabled: false })} />
          : <a className="pc-open" href={writerPersonalHref("public-page", { returnTo: returnHref })}>פתיחת הדף הציבורי שלי</a>}
      </> : null}
      {selected === "messages" ? <>
        {conversation?.state === "not_found" || conversation?.state === "unavailable" ? <p role="status">לא נמצאה שיחה זמינה בכתובת הזאת. מוצגת התיבה האישית.</p> : null}
        {(sourceWriter || dm) && !conversation ? <p role="status">בודק את השיחה בתיבה שלך…</p> : <MessagesHub key={`${user.id}:${conversation?.counterpart || "inbox"}`} T={T} goto={goto} initialDm={conversation?.counterpart || null} resolveWriterHref={resolveWriterHref}
          messageNavigation={{ ...personalMessagesState(location.search), returnTo: returnHref,
            onChange: next => navigate(writerPersonalHref("messages", { returnTo: returnHref, ...next }), { replace: true }) }} />}
      </> : null}
      {selected === "notifications" ? <FollowCenterController2029 returnHref={`${location.pathname}${location.search}`} onSignIn={shell.openWorkspace} /> : null}
      {/* Activity stats are not a research standing. The approved 2029 standing
          adapter is not connected; never reuse the Legacy five-level result. */}
      {selected === "progress" ? <WriterPrivateProgress2029 rank={null} stats={{ ...data.stats, tier: null }} /> : null}
    </div> : null}
  </WriterPersonalLayout2029>;
}
