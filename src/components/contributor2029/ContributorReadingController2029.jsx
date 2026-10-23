import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.jsx";
import { useResearch } from "../../lib/research/ResearchProvider.jsx";
import { use2029Shell } from "../experience2029/Sod2029Shell.jsx";
import { fetchContributorOverview } from "./contributorOverview2029Model.js";
import { writerFeaturedItems, writerReadingEntity, writerReadingProjection } from "./contributorReading2029Model.js";
import { updateWriterCuration } from "./contributorCuration2029Model.js";
import { WriterReadingActions2029, WriterReadingSummary2029, WriterFeatured2029, WriterIntroductionEditor2029 } from "./ContributorReadingControls2029.jsx";

export function useContributorReading2029(view, onRefresh) {
  const research = useResearch();
  const { user } = useAuth();
  const shell = use2029Shell();
  const location = useLocation();
  const visitorPreview = new URLSearchParams(location.search).get("view") === "public";
  const navigate = useNavigate();
  const key = view?.canonicalHref || "";
  const scope = `${key}:${user?.id || "guest"}:${visitorPreview ? "visitor" : "viewer"}`;
  const [publicData, setPublicData] = useState({ scope: null });
  const [edit, setEdit] = useState(false);
  const [mutation, setMutation] = useState({ scope: null, state: "idle", id: null });
  const [status, setStatus] = useState({ scope: null, id: null, text: "" });
  const busy = useRef(false), active = useRef(scope);
  active.current = scope;
  useEffect(() => { setEdit(false); }, [scope]);
  const receivePublicData = useCallback((data) => setPublicData({ scope, ...data }), [scope]);
  const current = publicData.scope === scope ? publicData : {};
  const featured = writerFeaturedItems(view, current.overview?.studio?.items);
  const projected = writerReadingProjection(view, research);
  const state = mutation.scope === scope ? mutation : { state: "idle", id: null };
  const selected = new Set(featured.map((item) => item.id));
  const canonicalKey = decodeURIComponent(key.split("/").pop() || "");
  async function mutate(action, payload, id = null) {
    if (!current.owner || !user?.id || busy.current) return;
    busy.current = true; setMutation({ scope, state: "saving", id });
    try {
      const result = await updateWriterCuration(canonicalKey, action, payload, { userId: user.id });
      if (active.current !== scope) return;
      if (result.state === "saved") {
        if (onRefresh) onRefresh();
        else {
          const overview = await fetchContributorOverview(canonicalKey, { signal: AbortSignal.timeout(8000) });
          if (active.current === scope) setPublicData((data) => ({ ...data, overview }));
        }
      }
      if (active.current === scope) setMutation({ scope, state: result.state, id });
    } finally { busy.current = false; }
  }
  function recordOpen(item) {
    const entity = writerReadingEntity(item, key);
    if (!entity) return;
    research.logHistory?.(entity);
    // Explicit source navigation preserves the existing Journey through the provider's merge semantics.
    research.updateResearchContext?.({ subject: { id: entity.ref, type: entity.type, label: entity.title, href: entity.link },
      selection: { sourceRef: entity.metadata.sourceRef, locator: entity.link.includes("#") ? entity.link.slice(entity.link.indexOf("#")) : null },
      returnTo: { href: location.pathname + location.search + location.hash, label: view.profile.name } });
  }
  const actions = (item) => {
    const entity = writerReadingEntity(item, key);
    if (!entity) return null;
    const saved = !visitorPreview && (research.saved || []).some((saved) => saved.type === entity.type && String(saved.ref) === String(entity.ref));
    return <WriterReadingActions2029 saved={saved} onSave={research.saveItem ? () => {
      if (visitorPreview) { setStatus({ scope, id: item.id, text: "זו תצוגה ציבורית. אפשר לחזור לאזור האישי כדי לשמור." }); return; }
      const ok = research.saveItem(entity);
      setStatus({ scope, id: item.id, text: ok ? "נשמר בספרייה האישית" : "השמירה אינה זמינה כרגע" });
    } : undefined} onResume={() => { recordOpen(item); if (item.href.startsWith("/")) navigate(item.href); else window.location.assign(item.href); }} isOwner={!visitorPreview && current.owner === true}
      onFeature={() => mutate("feature", { itemId: item.id, enabled: !selected.has(item.id) }, item.id)} featured={selected.has(item.id)} busy={state.state === "saving"}
      status={state.id === item.id && state.state === "limit" ? "אפשר לבחור עד שלושה כתבים להצגה. בטלו בחירה קיימת כדי להחליף כתב."
        : state.id === item.id && ["error", "login_required"].includes(state.state) ? "לא ניתן לאשר את העדכון. רעננו לפני ניסיון נוסף." : status.scope === scope && status.id === item.id ? status.text : ""} />;
  };
  const header = view ? <>
    {!visitorPreview && (projected.savedCount > 0 || projected.resume) ? <WriterReadingSummary2029 {...projected} onOpenWorkspace={shell.openWorkspace} /> : null}
    {featured.length ? <div onClickCapture={(event) => {
      const href = event.target.closest?.("a")?.getAttribute("href");
      const item = featured.find((item) => item.href === href);
      if (item) recordOpen(item);
    }}><WriterFeatured2029 items={featured} writerName={view.profile.name} /></div> : null}
    {!visitorPreview && current.owner ? <>
      <button className="pc-more" type="button" onClick={() => setEdit((value) => !value)}>עריכת ההקדמה הציבורית</button>
      {edit ? <WriterIntroductionEditor2029 bio={view.profile.bio} state={state.id === null ? state.state : "idle"}
        onSave={(bio) => mutate("introduction", { bio })} onClose={() => { if (state.state !== "saving") setEdit(false); }} /> : null}
    </> : null}
  </> : null;
  return { actions, header, recordOpen, receivePublicData, featuredIds: new Set(featured.map((item) => item.studioId)) };
}
