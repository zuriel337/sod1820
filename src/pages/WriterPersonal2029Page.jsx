import React, { useEffect, useState, useCallback, useRef } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import { use2029Palette } from "../lib/palette.js";
import { applySeo } from "../lib/seo.js";
import { WRITER_PERSONAL_MODULES, personalReturnHref, writerPersonalHref, writerSelfRequest } from "../lib/userCenter/writerPersonal2029.js";
import { use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import ProfileSettings from "../components/ProfileSettings.jsx";
import { PageEditor, MessagesHub, FollowingPanel, NotificationsPanel, PushPanel } from "../components/userCenter/UserCenter.jsx";
import { ContributorRankSeal2029 } from "../components/contributor2029/ContributorRankSeal2029.jsx";
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
  const { user, loading } = useAuth();
  const location = useLocation();
  const { data } = useSelf(loading ? null : user?.id);
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
  const { module } = useParams();
  const { user, loading } = useAuth();
  useEffect(() => { applySeo({ title: "האזור האישי", description: "הדף שלי והפעילות האישית שלי.", path: writerPersonalHref(module), noindex: true }); }, [module]);
  return <WriterPersonalController2029 key={user?.id || "guest"} module={module} user={user} authLoading={loading} />;
}

function WriterPersonalController2029({ module, user, authLoading }) {
  const auth = useAuth(), shell = use2029Shell(), P = use2029Palette(), location = useLocation(), navigate = useNavigate();
  const { data, reload } = useSelf(authLoading ? null : user?.id);
  const [mutation, setMutation] = useState("idle"), [conversation, setConversation] = useState(null);
  const pending = useRef(false), mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const params = new URLSearchParams(location.search);
  const selected = WRITER_PERSONAL_MODULES.some(([id]) => id === module) ? module : "public-page";
  const returnHref = personalReturnHref(params.get("returnTo"));
  const state = authLoading || user && data.state === "loading" ? "loading" : !user ? "login_required" : data.state === "ready" ? "ready" : "error";
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
    if (pending.current || !user?.id) return { ok: false, error: "הפעולה אינה זמינה כרגע." };
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
    state={state} onRetry={reload} publicHref={writer.publicVisible ? writer.href : null} returnHref={returnHref} nav={nav}>
    {!user && !authLoading ? <button className="pc-more" type="button" onClick={shell.openWorkspace}>התחברות לאזור האישי</button> : null}
    {state === "ready" ? <>
      {selected === "public-page" ? <WriterPersonalHome2029 principalKey={user.id} writer={writer} state="ready" onRetry={reload}
        onCreate={(values) => mutate("create", values)} onEdit={() => setActive("page-editor")} /> : null}
      {selected === "page-editor" ? <>
        {writer.state === "ready" ? <PageEditor T={T} goto={goto} onSaved={() => reload(true)} refreshUnavailable={data.refreshState === "unavailable"} /> : <WriterPersonalHome2029 principalKey={user.id} writer={writer} state="ready" onRetry={reload} onCreate={(values) => mutate("create", values)} />}
        {writer.publicVisible ? <a className="pc-open" href={writer.href}>בחירת כתבים והקדמה בדף שלי</a> : null}
      </> : null}
      {selected === "profile" ? <>
        <ProfileSettings key={user.id} t={{ fieldBg: P.cardSoft, ink: P.ink, line: P.border, sub: P.inkSoft, acc: P.accentText, danger: P.dangerText, btnBg: P.accentBtn, btnText: P.onAccent }} onDone={reload} />
        {writer.state === "ready" ? <WriterPublicPortrait2029 principalKey={user.id} accountAvatar={data.accountAvatar} publicAvatar={writer.avatar} state={mutation} onRetry={reload}
          onApply={() => mutate("portrait", { enabled: true })} onHide={() => mutate("portrait", { enabled: false })} />
          : <a className="pc-open" href={writerPersonalHref("public-page", { returnTo: returnHref })}>פתיחת הדף הציבורי שלי</a>}
      </> : null}
      {selected === "messages" ? <>
        {conversation?.state === "not_found" || conversation?.state === "unavailable" ? <p role="status">לא נמצאה שיחה זמינה בכתובת הזאת. מוצגת התיבה האישית.</p> : null}
        {(sourceWriter || dm) && !conversation ? <p role="status">בודק את השיחה בתיבה שלך…</p> : <MessagesHub key={`${user.id}:${conversation?.counterpart || "inbox"}`} T={T} goto={goto} initialDm={conversation?.counterpart || null} resolveWriterHref={resolveWriterHref} />}
      </> : null}
      {selected === "notifications" ? <>
        <h2>העדכונים שלי</h2><NotificationsPanel T={T} goto={goto} setActive={setActive} />
        <h2>אחרי מי ומה אני עוקב</h2><FollowingPanel T={T} goto={goto} />
        <h2>ערוצי עדכון</h2><PushPanel T={T} user={user} isAdmin={auth.isAdmin} />
      </> : null}
      {selected === "progress" ? <WriterPrivateProgress2029 rank={data.rank} stats={data.stats}>
        <ContributorRankSeal2029 rank={data.rank} name={writer.name || (auth.profile?.id === user.id ? auth.profile.display_name : "")} avatar={writer.avatar} />
      </WriterPrivateProgress2029> : null}
    </> : null}
  </WriterPersonalLayout2029>;
}
