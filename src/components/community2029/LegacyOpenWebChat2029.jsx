import React, { useEffect, useRef, useState } from "react";
import { useOpenWeb } from "../../lib/openweb.js";
import "./legacyOpenWebChat2029.css";

// Keep the existing external conversation identity during the transition.
// Loading and account SSO remain owned by openweb.js.
function OpenWebConversation() {
  useOpenWeb();
  return <div
    data-spotim-module="conversation"
    data-post-id="POST_ID_GOES_HERE"
    data-post-url="https://sod1820.co.il/community/chat"
    style={{ minHeight: 400 }}
  />;
}

// A link that targets the history, or an OpenWeb deep link, must open it right away.
const wantsHistoryNow = () => typeof window !== "undefined" && (window.location.hash === "#legacy-chat" || /spot_?im|openweb/i.test(window.location.search));

// The history sits at the bottom of the page. The OpenWeb launcher and conversation load
// only when the reader is near it (or asks for it), through the same useOpenWeb owner.
export default function LegacyOpenWebChat2029() {
  const hostRef = useRef(null);
  const [active, setActive] = useState(() => typeof IntersectionObserver === "undefined" || wantsHistoryNow());

  useEffect(() => {
    if (active) return undefined;
    const open = () => setActive(true);
    const observer = new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting)) open(); }, { rootMargin: "900px 0px" });
    if (hostRef.current) observer.observe(hostRef.current);
    const onHash = () => { if (wantsHistoryNow()) open(); };
    window.addEventListener("hashchange", onHash);
    return () => { observer.disconnect(); window.removeEventListener("hashchange", onHash); };
  }, [active]);

  return <section id="legacy-chat" className="sod29-legacy-chat" aria-labelledby="legacy-chat-title" data-community-chat="legacy" data-openweb-loaded={active ? "true" : "false"}>
    <header className="sod29-legacy-chat-header">
      <h2 id="legacy-chat-title">הצ׳אט הוותיק</h2>
      <a className="sod29-legacy-chat-claim" href="#legacy-claim">כתבת כאן בעבר? קח את החשבון שלך ↑</a>
    </header>
    <div ref={hostRef} className="sod29-legacy-chat-conversation">
      {active ? <OpenWebConversation /> : <p className="sod29-legacy-chat-pending" role="status">היסטוריית הצ׳אט נטענת כשמגיעים לכאן.</p>}
    </div>
  </section>;
}
