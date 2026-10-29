import React, { useEffect, useRef, useState } from "react";
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
  const sectionRef = useRef(null);
  const hostRef = useRef(null);
  // An external OpenWeb iframe is outside the preview worker's write boundary.
  // Never mount its launcher or SSO in a read-only or mock preview.
  const readOnlyPreview = import.meta.env.VITE_INTEGRATED_PREVIEW === "true"
    || (typeof document !== "undefined" && Boolean(document.querySelector('[data-raziel-preview-transport="mock-only"]')));
  const [active, setActive] = useState(() => !readOnlyPreview && (typeof IntersectionObserver === "undefined" || wantsHistoryNow()));

  useEffect(() => {
    let frame;
    const scrollToHistory = () => {
      if (window.location.hash !== "#legacy-chat") return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => sectionRef.current?.scrollIntoView({ block: "start", behavior: "auto" }));
    };
    scrollToHistory();
    window.addEventListener("hashchange", scrollToHistory);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("hashchange", scrollToHistory); };
  }, []);

  useEffect(() => {
    if (readOnlyPreview || active) return undefined;
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
      <h2 id="legacy-chat-title">הצ׳אט הוותיק</h2>
      <a href="#community-new-chat">לצ׳אט החדש ↑</a>
    </header>
    <div ref={hostRef} className="sod29-legacy-chat-conversation">
      {readOnlyPreview ? <p>הצ׳אט הוותיק זמין באתר המקורי. <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">פתיחת הצ׳אט המקורי</a></p>
        : active ? <OpenWebConversation /> : <p role="status">הצ׳אט הוותיק נטען כשמגיעים לכאן.</p>}
    </div>
  </section>;
}
