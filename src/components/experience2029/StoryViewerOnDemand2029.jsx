import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { F } from "../../theme.js";
import OnDemandComponent2029 from "./OnDemandComponent2029.jsx";
import { createOnDemandLoader } from "./onDemandLoader2029.js";
import { registeredStaticStoryViewer } from "./storyViewerRegistry2029.js";

// The full-screen story viewer for 2029 consumers: its code is requested when a story is first opened, not with the shell
// (dependency-handoff D3). Legacy keeps its static import; the Legacy-facing ../OrGeulaStoryColumn.jsx binds ../StoryViewer.jsx directly.
// A slow load shows a status the person can close; a failed load shows a message with retry and close, instead of unmounting the app.
export const STORY_VIEWER_STATUS_DELAY_MS = 250;
// In the Legacy build there is no separate request for the viewer: the Legacy-facing rail registers the static component (storyViewerRegistry2029.js)
// and the build-time branch below removes the dynamic import from that build. In the 2029 build the branch removes the registry lookup.
const IS_2029_BUILD = typeof __SOD_2029_BUILD__ !== "undefined" && __SOD_2029_BUILD__;
export const loadStoryViewer = createOnDemandLoader(() => {
  if (IS_2029_BUILD) return import("../StoryViewer.jsx");
  const registered = registeredStaticStoryViewer();
  return registered ? Promise.resolve({ default: registered }) : Promise.reject(new Error("story viewer is not registered"));
});

const buttonStyle = { background: "rgba(255,255,255,.14)", color: "#fff", border: "1px solid rgba(255,255,255,.4)", borderRadius: 999, padding: "10px 22px", fontFamily: F.heading, fontSize: 14, fontWeight: 800, cursor: "pointer", minBlockSize: 44 };

function StatusOverlay({ kind, onClose, onRetry }) {
  const primary = useRef(null);
  useEffect(() => { primary.current?.focus(); }, [kind]);
  useEffect(() => {
    const onKey = (event) => { if (event.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const failed = kind === "error";
  const ui = (
    <div role="dialog" aria-modal="true" aria-label="סטוריז" data-story-viewer-status={kind} onClick={() => onClose?.()}
      style={{ position: "fixed", inset: 0, zIndex: 2147483000, background: "rgba(0,0,0,.86)", display: "grid", placeItems: "center", direction: "rtl" }}>
      <div onClick={(event) => event.stopPropagation()} role={failed ? "alert" : "status"}
        style={{ display: "grid", gap: 14, justifyItems: "center", padding: 24, maxWidth: 360, textAlign: "center", color: "#fff", fontFamily: F.body, fontSize: 15, lineHeight: 1.55 }}>
        <span>{failed ? "לא הצלחנו לפתוח את הסטורי. אפשר לנסות שוב." : "פותח את הסטורי…"}</span>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          {failed ? <button type="button" ref={primary} onClick={onRetry} style={buttonStyle}>נסו שוב</button> : null}
          <button type="button" ref={failed ? undefined : primary} onClick={() => onClose?.()} aria-label="סגירה" style={buttonStyle}>{failed ? "סגירה" : "✕ סגירה"}</button>
        </div>
      </div>
    </div>
  );
  return typeof document !== "undefined" && document.body ? createPortal(ui, document.body) : ui;
}

// A fast load shows nothing in between; only a load that is still pending after the delay shows a status.
function SlowLoadStatus({ onClose }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), STORY_VIEWER_STATUS_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);
  return visible ? <StatusOverlay kind="loading" onClose={onClose} /> : null;
}

export default function StoryViewerOnDemand2029({ load = loadStoryViewer, onClose, ...viewerProps }) {
  return <OnDemandComponent2029 load={load} onClose={onClose} {...viewerProps}
    fallback={<SlowLoadStatus onClose={onClose} />}
    renderError={({ retry }) => <StatusOverlay kind="error" onClose={onClose} onRetry={retry} />} />;
}
