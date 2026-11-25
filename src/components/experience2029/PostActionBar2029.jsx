import React, { useState } from "react";
import { openBarShare } from "../../lib/share/barShare2029.js";
import NavigationIcon2029 from "./NavigationIcon2029.jsx";
import PersonalSaveButton2029 from "../userCenter/PersonalSaveButton2029.jsx";
import { use2029Shell } from "./Sod2029Shell.jsx";
import { useAuth } from "../../lib/AuthContext.jsx";
import { personalActionsLocked } from "../../lib/publicLaunch2029.js";
import { postActionTarget2029 } from "../../lib/research/postActionTarget2029.js";
import { useResearch } from "../../lib/research/ResearchProvider.jsx";
import { entityIdentity } from "../../lib/research/researchSyncState.js";
import "./royal2029.css";
import "./postReadingActions2029.css";

const PostFollowBox = React.lazy(() => import("../PostFollowBox.jsx"));   // the follow engine loads only when the bell is pressed

// ONE compact row for every Post (ZURIEL 25.11.2026, the Hall's language): save · share · follow (one bell) · add to research (only where the research workspace is open).
// The bell opens ONE compact panel with the existing follow composition (PostFollowBox variant 2029 → the one WatchButton and the existing engine): it offers only targets
// that can deliver real updates and never starts mail, push or WhatsApp. Where follows are still closed to the public it says so (publicReadingActionsLocked).
export default function PostActionBar2029({ projection }) {
  const auth = useAuth();
  const research = useResearch();
  const shell = use2029Shell();
  const [note, setNote] = useState(""), [follow, setFollow] = useState(false);
  const target = postActionTarget2029(projection);
  if (!target) return null;
  const inResearch = (research.cart || []).some(item => entityIdentity(item) === entityIdentity(target.entity));
  const add = () => {
    if (personalActionsLocked(auth) || !auth.user?.id) { shell.openWorkspace?.(); return; }
    setNote(research.addToResearch?.(target.entity) ? "" : "לא ניתן להוסיף למחקר כרגע.");
  };
  const share = () => setNote(openBarShare({ type: "post", url: target.url, entityId: target.ref, title: target.title, image: projection.post.image_url, sourceSurface: "post_2029", label: "הפוסט" }) ? "" : "חלונית השיתוף אינה זמינה כרגע.");
  const researchLabel = inResearch ? "במחקר" : "הוסף למחקר";
  return <div className="r29 post-reading-actions post-action-bar" data-post-action-target={target.ref} role="group" aria-label="פעולות לפוסט">
    <div className="post-reading-action-row">
      <PersonalSaveButton2029 entity={target.entity} royal />
      <button type="button" className="r29-btn is-quiet post-reading-share" aria-haspopup="dialog" aria-label="שיתוף" title="שיתוף" onClick={share}>
        <NavigationIcon2029 name="share" size={18} /> <span>שיתוף</span>
      </button>
      <button type="button" className="r29-btn is-quiet" aria-expanded={follow} aria-controls="post-follow-panel" aria-label="מעקב" title="מעקב" onClick={() => setFollow(value => !value)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg> <span>מעקב</span>
      </button>
      {research.researchWorkspaceActive ? <button type="button" className="r29-btn is-quiet" onClick={add} aria-label={researchLabel} title={researchLabel} aria-pressed={inResearch} disabled={inResearch}>
        <NavigationIcon2029 name="research" size={18} /> <span>{researchLabel}</span>
      </button> : null}
    </div>
    {follow ? <div id="post-follow-panel" className="post-follow-panel"><React.Suspense fallback={<small role="status">טוען…</small>}>
      <PostFollowBox variant="2029" post={projection.sourcePost} source="post_bell_2029" />
    </React.Suspense></div> : null}
    {note ? <small role="status">{note}</small> : null}
  </div>;
}
