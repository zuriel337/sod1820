import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.jsx";
import { PUBLIC_READING_PRODUCTION_ARTIFACT } from "../../lib/publicReadingRelease2029.js";
import { publicLaunchActionsLocked } from "../../lib/publicLaunch2029.js";
import { useOpenWeb } from "../../lib/openweb.js";
import "./legacyOpenWebChat2029.css";

const SOURCE_URL = "https://sod1820.co.il/community/chat";

// The existing OpenWeb owner keeps the same public source and conversation identity.
function OpenWebConversation() {
  useOpenWeb();
  return <div data-spotim-module="conversation" data-post-id="POST_ID_GOES_HERE"
    data-post-url={SOURCE_URL} style={{ minHeight: 400 }} />;
}

function wantsHistoryNow() {
  return typeof window !== "undefined" && (window.location.hash === "#legacy-chat" || /spot_?im|openweb/i.test(window.location.search));
}

export default function LegacyOpenWebChat2029({ autoOpen = false, first = false }) {
  const actionsLocked = publicLaunchActionsLocked(useAuth().isAdmin);
  const location = useLocation();
  const sectionRef = useRef(null);
  const hostRef = useRef(null);
  // Preview/mock transport never opens external OpenWeb.
  // The Community landing page can request automatic, post-paint activation;
  // other embeds retain the existing explicit-click behavior.
  const readOnlyPreview = (actionsLocked && !PUBLIC_READING_PRODUCTION_ARTIFACT) || import.meta.env.VITE_INTEGRATED_PREVIEW === "true"
    || (typeof document !== "undefined" && Boolean(document.querySelector('[data-raziel-preview-transport="mock-only"]')));
  const [active, setActive] = useState(() => !readOnlyPreview && wantsHistoryNow());

  // Paint the reserved box first, then allow the third-party launcher to start.
  // This avoids competing with the initial React paint while preserving an
  // already-open conversation for visitors on the regular Community landing.
  useEffect(() => {
    if (!autoOpen || readOnlyPreview || active) return undefined;
    let cancelled = false;
    let timeout;
    let idle;
    const start = () => { if (!cancelled) setActive(true); };
    if (typeof window.requestIdleCallback === "function") {
      idle = window.requestIdleCallback(start, { timeout: 900 });
    } else {
      timeout = window.setTimeout(start, 350);
    }
    return () => {
      cancelled = true;
      if (idle !== undefined) window.cancelIdleCallback?.(idle);
      if (timeout !== undefined) window.clearTimeout(timeout);
    };
  }, [autoOpen, readOnlyPreview, active]);

  useEffect(() => {
    let frame;
    const scrollToHistory = () => {
      if (!wantsHistoryNow()) return;
      setActive((current) => current || !readOnlyPreview);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => sectionRef.current?.scrollIntoView({ block: "start", behavior: "auto" }));
    };
    scrollToHistory();
    window.addEventListener("hashchange", scrollToHistory);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("hashchange", scrollToHistory); };
  }, [location.hash, location.search, readOnlyPreview]);

  return <section ref={sectionRef} id="legacy-chat" className="sod29-legacy-chat" aria-labelledby="legacy-chat-title"
    data-community-chat="legacy" data-openweb-loaded={!readOnlyPreview && active ? "true" : "false"}>
    <header className="sod29-legacy-chat-header">
      <h2 id="legacy-chat-title">הצ׳אט הישן</h2>
      <a href="#community-new-chat">{first ? "לקהילה החדשה ↓" : "בחזרה לשיחה ↑"}</a>
    </header>
    <div ref={hostRef} className="sod29-legacy-chat-conversation" style={autoOpen ? { minHeight: 400 } : undefined}>
      {readOnlyPreview ? <p role="note">ההודעות מהצ׳אט הוותיק שזמינות לקריאה ציבורית מופיעות בשיחה למעלה. רכיב OpenWeb המקורי, שכולל התחברות וכתיבה, אינו פעיל בגרסה זו. קישור להודעה במקור OpenWeb אינו מבטיח שההודעה המסוימת זמינה כאן. <a href="#community-new-chat">לשיחות הציבוריות ↑</a></p>
        : active ? <OpenWebConversation /> : autoOpen
          ? <p role="status">פותח את הצ׳אט הוותיק…</p>
          : <button type="button" className="sod29-legacy-chat-open" onClick={() => setActive(true)}>הצגת הצ׳אט הישן <span aria-hidden="true">↓</span></button>}
    </div>
  </section>;
}
