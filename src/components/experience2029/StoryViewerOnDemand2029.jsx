import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { use2029Palette } from "../../lib/palette2029.js";
import { TYPEFACE } from "../../lib/designTokens.js";

// One canonical viewer. Importing the shortcut never imports its playback code.
const loadViewer = () => import("../StoryViewer.jsx");

function LoadStatus({ failed, onClose }) {
  const P = use2029Palette();
  const close = useRef(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    close.current?.focus();
    const key = (event) => {
      if (event.key === "Escape") { event.preventDefault(); onClose?.(); }
      if (event.key === "Tab") {
        const buttons = close.current?.parentElement?.querySelectorAll("button");
        if (!buttons?.length) return;
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = previousOverflow; previousFocus?.focus?.(); };
  }, [onClose]);
  const buttonStyle = { minHeight: 44, minWidth: 44, cursor: "pointer", font: "inherit", color: P.ink, background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: "8px 16px" };
  return createPortal(<div role="dialog" aria-modal="true" aria-label="פתיחת סטורי" data-story-viewer-status={failed ? "error" : "loading"}
    style={{ position: "fixed", inset: 0, zIndex: 2147483000, display: "grid", placeItems: "center", background: P.pageBg, color: P.ink, direction: "rtl", fontFamily: TYPEFACE.body }}>
    <div style={{ display: "grid", gap: 16, padding: 24, textAlign: "center" }}>
      <p role={failed ? "alert" : "status"}>{failed ? "לא הצלחנו לפתוח את הסטורי. אפשר לסגור או לרענן את הדף ולנסות שוב." : "פותח את הסטורי…"}</p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <button ref={close} type="button" style={buttonStyle} onClick={onClose}>סגירה</button>
        {failed ? <button type="button" style={buttonStyle} onClick={() => window.location.reload()}>רענון הדף</button> : null}
      </div>
    </div>
  </div>, document.body);
}

export default function StoryViewerOnDemand2029({ onClose, load = loadViewer, ...props }) {
  const [state, setState] = useState({ Viewer: null, failed: false });
  useEffect(() => {
    let alive = true;
    Promise.resolve().then(load).then((module) => {
      if (alive) setState({ Viewer: module.default, failed: false });
    }).catch(() => { if (alive) setState({ Viewer: null, failed: true }); });
    return () => { alive = false; };
  }, [load]);
  return state.Viewer ? <state.Viewer {...props} onClose={onClose} /> : <LoadStatus failed={state.failed} onClose={onClose} />;
}
