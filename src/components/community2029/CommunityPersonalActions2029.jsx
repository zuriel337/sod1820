import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.jsx";
import { getNotificationPrefs } from "../../lib/supabase.js";
import { watchToggle } from "../../lib/commandCenter.js";
import { makeEntity } from "../../lib/research/entity.js";
import PersonalSaveButton2029 from "../userCenter/PersonalSaveButton2029.jsx";
import WatchButton from "../WatchButton.jsx";

// These are projections of the existing private library and Follow controller.
// Mount the follow reader only on explicit opening, rather than once per feed row.
const followIO = Object.freeze({ read: getNotificationPrefs, toggle: watchToggle });
export default function CommunityPersonalActions2029({ row, rootId, href }) {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const menu = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = event => { if (menu.current && !menu.current.contains(event.target)) menu.current.open = false; };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  const entity = makeEntity({ type: "contribution", ref: row.id, title: `הודעה של ${row.authorName}`, link: href, metadata: { origin: row.origin, communityThreadId: rootId } });
  return <details ref={menu} className="sod29-community-personal-menu" onToggle={event => setOpen(event.currentTarget.open)} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}>
    <summary aria-label="שמירה ומעקב" title="שמירה ומעקב"><span aria-hidden="true">⋯</span></summary>
    {open ? <div className="sod29-community-personal-options">
      {auth.user?.id && auth.verified ? <>
        <PersonalSaveButton2029 entity={entity} />
        <div className="sod29-community-thread-watch"><p>עדכון בפעמון כשתתווסף תגובה לשרשור</p><WatchButton communityThread topic={`thread:${rootId}`} source="community_thread" label="מעקב אחרי השרשור" followLabel="עוקב אחרי השרשור" variant="thread" noPush followIO={followIO} /></div>
      </> : <Link className="sod29-community-secondary" to={`/login?returnTo=${encodeURIComponent(href)}`}>כניסה לשמירה ולמעקב</Link>}
    </div> : null}
  </details>;
}
