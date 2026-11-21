import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { openBarShare } from "../../lib/share/barShare2029.js";
import NavigationIcon2029 from "./NavigationIcon2029.jsx";
import PersonalSaveButton2029 from "../userCenter/PersonalSaveButton2029.jsx";
import { use2029Shell } from "./Sod2029Shell.jsx";
import { useAuth } from "../../lib/AuthContext.jsx";
import { personalActionsLocked } from "../../lib/publicLaunch2029.js";
import { postActionTarget2029 } from "../../lib/research/postActionTarget2029.js";
import { useResearch } from "../../lib/research/ResearchProvider.jsx";
import { entityIdentity } from "../../lib/research/researchSyncState.js";

export default function PostReadingActions2029({ projection, units, openingUnit }) {
  const [selected, setSelected] = useState(null);
  const post = postActionTarget2029(projection);
  if (!post) return null;
  const unit = postActionTarget2029(projection, units, selected ?? openingUnit);
  const target = unit || (selected ? null : post);
  return <>
    {units.length || selected ? <label>
      יעד הפעולות{" "}
      <select value={target?.unitId || selected || ""} onChange={event => setSelected(event.target.value)}>
        <option value="">הפוסט כולו</option>
        {!target ? <option value={selected} disabled>היחידה אינה זמינה</option> : null}
        {units.map(unit => <option key={unit.id} value={unit.id}>{unit.title || unit.id}</option>)}
      </select>
    </label> : null}
    {target ? <PostTargetActions key={target.ref} target={target} image={projection.post.image_url} /> : null}
  </>;
}

function PostTargetActions({ target, image }) {
  const auth = useAuth();
  const research = useResearch();
  const shell = use2029Shell();
  const navigate = useNavigate();
  const [note, setNote] = useState("");
  const [opening, setOpening] = useState(false);
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
    const opened = openBarShare({ type: "post", url: target.url, entityId: target.ref, title: target.title,
      image, sourceSurface: "post_2029", label: target.unitId ? "היחידה" : "הפוסט" });
    setNote(opened ? "" : "חלונית השיתוף אינה זמינה כרגע.");
  };

  const reply = async () => {
    if (opening) return;
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

  return <div className="sod29-actions" data-post-action-target={target.ref}>
    <PersonalSaveButton2029 entity={target.entity} />
    <button type="button" className="sod29-action" aria-haspopup="dialog" onClick={share}>
      <NavigationIcon2029 name="share" size={18} /> שיתוף
    </button>
    <button type="button" className="sod29-action" onClick={add} aria-pressed={inResearch} disabled={inResearch}>
      {inResearch ? "במחקר" : "הוסף למחקר"}
    </button>
    <button type="button" className="sod29-action" onClick={reply} disabled={opening}>
      {target.unitId ? "להגיב ליחידה בקהילה" : "להגיב לפוסט בקהילה"}
    </button>
    {note ? <small role="status">{note}</small> : null}
  </div>;
}
