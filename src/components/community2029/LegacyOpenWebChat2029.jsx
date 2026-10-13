import React from "react";
import { useOpenWeb } from "../../lib/openweb.js";
import "./legacyOpenWebChat2029.css";

// Keep the existing external conversation identity during the transition.
// Loading and account SSO remain owned by openweb.js.
export default function LegacyOpenWebChat2029() {
  useOpenWeb();

  return <section className="sod29-legacy-chat" aria-labelledby="legacy-chat-title" data-community-chat="legacy">
    <header className="sod29-legacy-chat-header">
      <h1 id="legacy-chat-title">הצ׳אט הוותיק</h1>
      <a href="#community-new-chat">לצ׳אט החדש ↓</a>
    </header>
    <div className="sod29-legacy-chat-conversation">
      <div
        data-spotim-module="conversation"
        data-post-id="POST_ID_GOES_HERE"
        data-post-url="https://sod1820.co.il/community/chat"
        style={{ minHeight: 400 }}
      />
    </div>
  </section>;
}
