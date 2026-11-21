import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { openBarShare, registerMobilePostShare } from "../../lib/share/barShare2029.js";
import NavigationIcon2029 from "./NavigationIcon2029.jsx";
import PersonalSaveButton2029 from "../userCenter/PersonalSaveButton2029.jsx";
import { use2029Shell } from "./Sod2029Shell.jsx";
import { useAuth } from "../../lib/AuthContext.jsx";
import { personalActionsLocked } from "../../lib/publicLaunch2029.js";
import { postActionTarget2029, postActionUnits2029 } from "../../lib/research/postActionTarget2029.js";
import { useResearch } from "../../lib/research/ResearchProvider.jsx";
import { mapIntegrationReview, readMapReviewValue, writeMapReviewValue } from "../../lib/research/mapIntegrationReviewStorage.js";
import { entityIdentity } from "../../lib/research/researchSyncState.js";
import "./royal2029.css";
import "./postReadingActions2029.css";

export default function PostReadingActions2029({ projection, rootRef, articleHtml, onDraft }) {
  const [unitHosts, setUnitHosts] = useState([]);
  const { pathname } = useLocation();
  const context = useResearch().context;
  const activeId = context?.dimensions?.surfaceContextHref?.split(/[?#]/)[0] === pathname
    ? context.dimensions.activeUnitRef : null;
  useEffect(() => {
    const root = rootRef.current;
    const post = projection.post;
    const units = postActionUnits2029(post, root);
    const byId = new Map(Array.from(root?.querySelectorAll("[id]") || [], node => [node.id, node]));
    const hosts = units.filter(unit => !byId.get(unit.id)?.hasAttribute("data-elections-former-unit")).map(unit => {
      const host = document.createElement("div");
      host.dataset.postUnitActionHost = unit.id;
      const anchor = byId.get(unit.id);
      const unitDepth = anchor.matches("[data-elections-timeline-unit]") && anchor.querySelector(":scope > details[data-map-depth]");
      if (unitDepth) unitDepth.append(host);
      else anchor.after(host);
      const target = postActionTarget2029(projection, units, unit.id);
      if (target && mapIntegrationReview && anchor.hasAttribute("data-elections-original-unit")) {
        target.url = new URL(target.href, window.location.origin).href;
      }
      return { host, anchor, target };
    });
    setUnitHosts(hosts);
    return () => hosts.forEach(({ host }) => host.remove());
  }, [projection, rootRef, articleHtml]);

  const target = postActionTarget2029(projection);
  useEffect(() => {
    if (!mapIntegrationReview || !target) return undefined;
    return registerMobilePostShare(pathname, () => {
      const line = window.innerHeight * 0.38;
      let visible;
      let distance = Infinity;
      for (const item of unitHosts) {
        if (!item.target || !rootRef.current?.contains(item.anchor) || !item.anchor.getClientRects().length) continue;
        const box = item.anchor.getBoundingClientRect();
        if (box.bottom < 0 || box.top > window.innerHeight * 0.82) continue;
        const gap = Math.max(box.top - line, line - box.bottom, 0);
        if (gap < distance) { visible = item.target; distance = gap; }
      }
      const active = visible || unitHosts.find(item => item.target?.unitId === activeId && rootRef.current?.contains(item.anchor))?.target;
      return postShareItem(active || target, projection.post.image_url);
    });
  }, [pathname, projection, rootRef, unitHosts, activeId]);

  if (!target) return null;
  const image = projection.post.image_url;
  return <>
    <PostTargetActions key={target.ref} target={target} image={image} onDraft={onDraft} />
    {unitHosts.filter(item => item.target).map(item => createPortal(
      <PostTargetActions target={item.target} image={image} onDraft={onDraft} />, item.host, item.target.ref
    ))}
  </>;
}

function postShareItem(target, image) {
  return { type: "post", url: target.url, entityId: target.ref, title: target.title,
    image, sourceSurface: "post_2029", label: target.unitId ? "היחידה" : "הפוסט" };
}

function PostTargetActions({ target, image, onDraft }) {
  const auth = useAuth();
  const research = useResearch();
  const shell = use2029Shell();
  const navigate = useNavigate();
  const [note, setNote] = useState("");
  const [opening, setOpening] = useState(false);
  const [reviewSaved, setReviewSaved] = useState(() => mapIntegrationReview && readMapReviewValue("saved", target.ref, false));
  const inResearch = (research.cart || []).some(item => entityIdentity(item) === entityIdentity(target.entity));

  const add = () => {
    if (personalActionsLocked(auth) || !auth.user?.id) {
      shell.openWorkspace?.();
      return;
    }
    if (!research.addToResearch?.(target.entity)) setNote("לא ניתן להוסיף למחקר כרגע.");
    else setNote("");
  };

  const share = () => {
    const opened = openBarShare(postShareItem(target, image));
    setNote(opened ? "" : "חלונית השיתוף אינה זמינה כרגע.");
  };

  const reply = async () => {
    if (opening) return;
    if (onDraft) { onDraft(target); return; }
    setOpening(true);
    // Capture the target on press, before the composer or auth flow loads.
    const href = target.url;
    try {
      const { communityShareDraft } = await import("../../lib/community/communityShareHandoff.js");
      const result = communityShareDraft({ auth, href });
      if (result.ok) navigate("/community/chat");
      else setNote(result.message);
    } catch {
      setNote("לא הצלחנו לפתוח את הטיוטה. אפשר לנסות שוב.");
    } finally {
      setOpening(false);
    }
  };

  const replyLabel = `להגיב ל${target.unitId ? "יחידה" : "פוסט"}${onDraft ? "" : " בקהילה"}`;
  const researchLabel = inResearch ? "במחקר" : "הוסף למחקר";
  return <div className="r29 post-reading-actions" data-post-action-target={target.ref} data-mobile-share-in-dock={mapIntegrationReview || undefined} role="group"
    aria-label={target.unitId ? `פעולות ליחידה · ${target.title}` : "פעולות לפוסט"}>
    <div className="post-reading-action-row">
      {mapIntegrationReview ? <button type="button" className="r29-btn is-quiet" aria-pressed={reviewSaved}
        aria-label={reviewSaved ? "נשמר בדפדפן הבדיקה" : "שמירת בדיקה"}
        onClick={() => {
          if (writeMapReviewValue("saved", target.ref, true)) setReviewSaved(true);
          else setNote("לא ניתן לשמור בדפדפן הזה.");
        }}><NavigationIcon2029 name={reviewSaved ? "check" : "save"} size={18} /><span>{reviewSaved ? "נשמר" : "שמירת בדיקה"}</span></button>
        : <PersonalSaveButton2029 entity={target.entity} royal />}
      <button type="button" className="r29-btn is-quiet post-reading-share" aria-haspopup="dialog" aria-label="שיתוף" title="שיתוף" onClick={share}>
        <NavigationIcon2029 name="share" size={18} /> <span>שיתוף</span>
      </button>
      {!mapIntegrationReview ? <button type="button" className="r29-btn is-quiet" onClick={add} aria-label={researchLabel} title={researchLabel} aria-pressed={inResearch} disabled={inResearch}>
        <NavigationIcon2029 name="research" size={18} /> <span>{researchLabel}</span>
      </button> : null}
      <button type="button" className="r29-btn is-quiet" onClick={reply} aria-label={replyLabel} title={replyLabel} disabled={opening}>
        <NavigationIcon2029 name="conversation" size={18} /> <span>תגובה</span>
      </button>
    </div>
    {note ? <small role="status">{note}</small> : null}
  </div>;
}
