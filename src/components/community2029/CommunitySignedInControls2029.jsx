import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.jsx";
import { publicLaunchActionsLocked } from "../../lib/publicLaunch2029.js";
import { supabase } from "../../lib/supabase.js";
import { getUnreadCount } from "../../lib/notifications.js";
import { writerPersonalHref } from "../../lib/userCenter/writerPersonal2029.js";
import { communityAccountReturnHref } from "../../lib/community/communityPersonNavigation.js";
import NavigationIcon2029 from "../experience2029/NavigationIcon2029.jsx";

// A presentation of the existing account and notification reader, not another inbox.
export default function CommunitySignedInControls2029({ children }) {
  const { user, profile, loading, isAdmin } = useAuth();
  const actionsLocked = publicLaunchActionsLocked(isAdmin);
  const location = useLocation(), menu = useRef(null);
  const principal = actionsLocked ? null : user?.id || null, active = useRef(principal); active.current = principal;
  const [snapshot, setSnapshot] = useState({ owner: null, state: "loading", count: null });
  const ownProfile = profile?.id === principal ? profile : null;
  const returnTo = communityAccountReturnHref(location);
  useEffect(() => {
    if (!principal || loading) return;
    let alive = true, pending = false;
    const refresh = async () => {
      if (pending || document.hidden || !alive || active.current !== principal) return;
      pending = true;
      try {
        const identity = await supabase.auth.getUser();
        if (identity.error || identity.data?.user?.id !== principal) throw new Error("Account unavailable");
        if (!alive || active.current !== principal) return;
        const count = await getUnreadCount({ strict: true });
        if (alive && active.current === principal) setSnapshot({ owner: principal, state: "ready", count });
      } catch {
        if (alive && active.current === principal) setSnapshot({ owner: principal, state: "error", count: null });
      } finally { pending = false; }
    };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    const interval = setInterval(refresh, 60000);
    return () => { alive = false; clearInterval(interval); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [principal, loading]);
  useEffect(() => {
    const closeOutside = event => { if (menu.current && !menu.current.contains(event.target)) menu.current.open = false; };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);
  if (actionsLocked || !user) return null;
  const count = snapshot.owner === principal && snapshot.state === "ready" ? snapshot.count : null;
  return <div className="sod29-community-account-row" data-notification-state={snapshot.owner === principal ? snapshot.state : "loading"}>
    <Link className="sod29-community-account-name" to={writerPersonalHref("profile", { returnTo })}>{ownProfile?.display_name || ownProfile?.username || "החשבון שלי"}</Link>
    <div className="sod29-community-account-actions">
      <Link className="sod29-community-account-icon" to={writerPersonalHref("notifications", { returnTo })} aria-label={count > 0 ? `ההתראות שלי — ${count} חדשות` : "ההתראות שלי"} title="ההתראות שלי">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4M12 2V1" /></svg>
        {count > 0 ? <span className="sod29-community-unread-badge" aria-hidden="true">{count > 99 ? "99+" : count}</span> : null}
      </Link>
      <details ref={menu} className="sod29-community-account-menu" onKeyDown={event => { if (event.key === "Escape" && !event.target.closest("dialog[open]")) { event.preventDefault(); event.stopPropagation(); menu.current.open = false; menu.current.querySelector("summary")?.focus(); } }}>
        <summary className="sod29-community-account-icon" aria-label="הגדרות החשבון" title="הגדרות החשבון"><NavigationIcon2029 name="settings" size={20} /></summary>
        <div className="sod29-community-account-options">
          <Link to={writerPersonalHref("profile", { returnTo })}>הפרופיל שלי</Link>
          <Link to={`/login?returnTo=${encodeURIComponent(returnTo)}`}>כניסה עם חשבון אחר</Link>
          {children}
        </div>
      </details>
    </div>
  </div>;
}
