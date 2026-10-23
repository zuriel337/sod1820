import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";
import { use2029Shell } from "../experience2029/Sod2029Shell.jsx";
import WatchButton from "../WatchButton.jsx";
import ShareActions from "../ShareActions.jsx";
import { fetchContributorOverview } from "./contributorOverview2029Model.js";
import { contributorInteraction } from "./contributorInteractions2029.js";
import { writerPersonalHref } from "../../lib/userCenter/writerPersonal2029.js";
import { useLocation } from "react-router-dom";
import { ContributorOverview2029, ContributorStudio2029, ContributorActionRow2029, ContributorMessageDialog2029 } from "./ContributorPublicExtras2029.jsx";

// This controller only wires the existing public reader, subscription, inbox and private workspace.
// Presentation belongs to the controlled Claude components above; no new account/content store.
export default function ContributorActionsController2029({ view, onPublicData, excludedStudioIds }) {
  const { user, loading } = useAuth();
  const shell = use2029Shell();
  const key = decodeURIComponent(view.canonicalHref?.split("/").filter(Boolean).pop() || "");
  const actor = user?.id || null;
  const visitorPreview = new URLSearchParams(useLocation().search).get("view") === "public";
  const scope = `${key}:${actor || "guest"}:${visitorPreview ? "visitor" : "viewer"}`;
  const [overview, setOverview] = useState({ key: null, value: { state: "loading" } });
  const [capabilities, setCapabilities] = useState({ scope: null });
  const [dialog, setDialog] = useState({ scope: null, open: false, state: "idle" });
  const [more, setMore] = useState("idle");
  const pendingSend = useRef(false);
  const activeScope = useRef(scope);
  activeScope.current = scope;
  useEffect(() => {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 8000);
    setOverview({ key, value: { state: "loading" } }); setMore("idle");
    fetchContributorOverview(key, { signal: abort.signal }).then((value) => {
      if (!abort.signal.aborted) setOverview({ key, value });
    }).finally(() => clearTimeout(timer));
    const timeout = () => setOverview({ key, value: { state: "unavailable" } });
    abort.signal.addEventListener("abort", timeout, { once: true });
    return () => { abort.signal.removeEventListener("abort", timeout); abort.abort(); clearTimeout(timer); };
  }, [key]);
  useEffect(() => {
    if (loading) return;
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 8000);
    setCapabilities({ scope }); setDialog({ scope, open: false, state: "idle" });
    contributorInteraction(key, { signal: abort.signal, userId: visitorPreview ? null : actor }).then((value) => {
      if (!abort.signal.aborted) setCapabilities({ scope, ...value });
    }).finally(() => clearTimeout(timer));
    const timeout = () => setCapabilities({ scope, state: "unavailable" });
    abort.signal.addEventListener("abort", timeout, { once: true });
    return () => { abort.signal.removeEventListener("abort", timeout); abort.abort(); clearTimeout(timer); };
  }, [key, scope, loading, actor, visitorPreview]);
  const data = overview.key === key ? overview.value : { state: "loading" };
  const caps = capabilities.scope === scope ? capabilities : {};
  const modal = dialog.scope === scope ? dialog : { open: false, state: "idle" };
  useEffect(() => {
    onPublicData?.({ overview: overview.key === key ? overview.value : { state: "loading" },
      owner: capabilities.scope === scope && capabilities.owner === true });
  }, [onPublicData, overview, capabilities, key, scope]);
  const personalHref = (module) => writerPersonalHref(module, { returnTo: view.canonicalHref });
  async function send(body) {
    if (pendingSend.current || caps.message !== "ready" || !actor) return;
    pendingSend.current = true;
    setDialog({ scope, open: true, state: "sending" });
    try {
      const result = await contributorInteraction(key, { userId: actor, body, signal: AbortSignal.timeout(15000) });
      if (activeScope.current === scope) setDialog({ scope, open: true, state: result.state === "sent" ? "sent" : result.state === "login_required" ? "login_required" : "error" });
    } finally { pendingSend.current = false; }
  }
  async function loadMore() {
    if (more === "loading" || !data.studio?.hasMore) return;
    const requestedKey = key;
    setMore("loading");
    const result = await fetchContributorOverview(key, { page: data.studio.page + 1, signal: AbortSignal.timeout(8000) });
    if (activeScope.current.split(":")[0] !== requestedKey) return;
    if (result.state !== "ready" || !result.studio.available) { setMore("error"); return; }
    setOverview((current) => current.key === requestedKey ? { key, value: { ...current.value, studio: {
      ...result.studio, items: [...new Map([...current.value.studio.items, ...result.studio.items].map((item) => [item.id, item])).values()],
    } } } : current);
    setMore("idle");
  }
  return <>
    <ContributorOverview2029 overview={data} />
    <ContributorActionRow2029>
      {caps.followTopic && !caps.owner ? <WatchButton key={caps.followTopic} topic={caps.followTopic} source="writer-2029" label={`מעקב אחרי ${view.profile.name}`}
        explainer="עדכונים על פרסומים חדשים של הכותב. ערוצי ההתראה נבחרים בנפרד." noPush /> : null}
      {caps.message === "ready" ? <button type="button" className="pc-open" onClick={() => setDialog({ scope, open: true, state: "idle" })}>שליחת הודעה לכותב</button>
        : caps.message === "login_required" || caps.state === "login_required" ? <a className="pc-open" href={`/login?returnTo=${encodeURIComponent(view.canonicalHref)}`}>התחברות לשליחת הודעה</a>
          : caps.message === "unavailable" ? <span className="pc-reason">לכותב אין תיבת הודעות מקושרת.</span> : null}
      {caps.owner ? <><a className="pc-open" href={personalHref("page-editor")}>עריכת הדף הציבורי שלי</a><a className="pc-open" href={personalHref("messages")}>תיבת ההודעות שלי</a></> : null}
      <button type="button" className="pc-open" onClick={shell.openWorkspace}>{actor ? "האזור האישי שלי" : "התחברות לאזור האישי"}</button>
      <ShareActions type="researcher" url={`${typeof window === "undefined" ? "https://sod1820.co.il" : window.location.origin}${view.canonicalHref}`}
        title={view.profile.name} image={view.profile.avatar} sourceSurface="public-contributor-2029" />
    </ContributorActionRow2029>
    {caps.state === "unavailable" ? <p className="pc-reason" role="status">פעולות הכותב אינן זמינות כרגע.</p> : null}
    {modal.state === "sent" ? <a className="pc-open" href={writerPersonalHref("messages", { writer: key, returnTo: view.canonicalHref })}>להמשך השיחה בתיבה שלי</a> : null}
    {data.state === "ready" ? <>
      <ContributorStudio2029 items={data.studio.items.filter((item) => !excludedStudioIds?.has(item.id))} available={data.studio.available} />
      {data.studio.hasMore ? <button className="pc-more" type="button" disabled={more === "loading"} onClick={loadMore}>{more === "loading" ? "טוען חומרים…" : "עוד מהסטודיו של הכותב"}</button> : null}
      {more === "error" ? <p className="pc-notice" role="status">לא ניתן לטעון חומרים נוספים כרגע. אפשר לנסות שוב.</p> : null}
    </> : null}
    <ContributorMessageDialog2029 key={scope} open={modal.open} state={modal.state} writerName={view.profile.name} onSubmit={send}
      onClose={() => { if (modal.state !== "sending") setDialog({ scope, open: false, state: "idle" }); }} />
  </>;
}
