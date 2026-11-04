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

export default function LegacyOpenWebChat2029() {
  const actionsLocked = publicLaunchActionsLocked(useAuth().isAdmin);
  const location = useLocation();
  const sectionRef = useRef(null);
  const hostRef = useRef(null);
  // An external OpenWeb iframe is outside the preview worker's write boundary.
  // Keep historical read-only/mock previews closed. The user explicitly restored
  // the original working chat in the public artifact, open on initial load.
  const readOnlyPreview = (actionsLocked && !PUBLIC_READING_PRODUCTION_ARTIFACT) || import.meta.env.VITE_INTEGRATED_PREVIEW === "true"
    || (typeof document !== "undefined" && Boolean(document.querySelector('[data-raziel-preview-transport="mock-only"]')));
  const [active, setActive] = useState(() => !readOnlyPreview && (PUBLIC_READING_PRODUCTION_ARTIFACT || typeof IntersectionObserver === "undefined" || wantsHistoryNow()));

  useEffect(() => {
    let frame;
    const scrollToHistory = () => {
      if (!wantsHistoryNow()) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => sectionRef.current?.scrollIntoView({ block: "start", behavior: "auto" }));
    };
    scrollToHistory();
    window.addEventListener("hashchange", scrollToHistory);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("hashchange", scrollToHistory); };
  }, [location.hash, location.search]);

  useEffect(() => {
    if (readOnlyPreview || active) return undefined;
    if (typeof IntersectionObserver === "undefined") { setActive(true); return undefined; }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setActive(true);
    }, { rootMargin: "900px 0px" });
    if (hostRef.current) observer.observe(hostRef.current);
    const onHash = () => { if (wantsHistoryNow()) setActive(true); };
    window.addEventListener("hashchange", onHash);
    return () => { observer.disconnect(); window.removeEventListener("hashchange", onHash); };
  }, [active, readOnlyPreview]);

  return <section ref={sectionRef} id="legacy-chat" className="sod29-legacy-chat" aria-labelledby="legacy-chat-title"
    data-community-chat="legacy" data-openweb-loaded={!readOnlyPreview && active ? "true" : "false"}>
    <header className="sod29-legacy-chat-header">
      <h2 id="legacy-chat-title">הצ׳אט הישן</h2>
      <a href="#community-new-chat">בחזרה לשיחה ↑</a>
    </header>
    <div ref={hostRef} className="sod29-legacy-chat-conversation">
      {readOnlyPreview ? <p role="note">ההודעות מהצ׳אט הוותיק שזמינות לקריאה ציבורית מופיעות בשיחה למעלה. רכיב OpenWeb המקורי, שכולל התחברות וכתיבה, אינו פעיל בגרסה זו. קישור להודעה במקור OpenWeb אינו מבטיח שההודעה המסוימת זמינה כאן. <a href="#community-new-chat">לשיחות הציבוריות ↑</a></p>
        : active ? <OpenWebConversation /> : <p role="status">טוענים את השיחה…</p>}
    </div>
  </section>;
}
