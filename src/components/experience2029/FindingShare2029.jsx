import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./findingShare2029.css";
import { openBarShare } from "../../lib/share/barShare2029.js";
// The sheet (with the share helpers and the card) loads when the button is pressed: the button alone joins the page (speed law, 18.11.2026).
const FindingShareSheet2029 = React.lazy(() => import("./FindingShareSheet2029.jsx"));

// A finding share (ZURIEL 18.11.2026): one clear button; on press a sheet shows exactly what will be sent (the finding, its method and result,
// the link, the card) and the existing ShareActions sends it. Never in the frame or the opening graph.
export default function FindingShare2029({ kind = "calc", label = "שתף", url, expression = "", value = null, method = "", number = null,
  context = "", prominent = false, sourceSurface = "finding-share-2029" }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  if (!url) return null;
  // One share window (ZURIEL 19.11.2026): the bar's window shows what the sheet showed (card, "מה יישלח", the note); the sheet stays the
  // fallback where no bar is mounted. The helpers load on press, as before (speed law).
  const press = async () => {
    try {
      const { findingBarShare } = await import("./FindingShareSheet2029.jsx");
      if (openBarShare(findingBarShare({ kind, url, expression, value, method, number, context, sourceSurface }))) return;
    } catch { /* the sheet below still opens (and reports its own loading failure) */ }
    setOpen(true);
  };
  return <>
    <button ref={buttonRef} type="button" className={`sod29-finding-share-button${prominent ? " is-prominent" : ""}`} data-finding-share={kind}
      aria-label={label} aria-haspopup="dialog" aria-expanded={open} onClick={press}>
      <span aria-hidden="true">⤴</span><span className="sod29-finding-share-label">{label}</span>
    </button>
    {/* While the sheet loads, the same layer shows a live status (operation visibility law); a failed download goes to the app's chunk
        recovery (ErrorBoundary2029), like every other part loaded on demand. */}
    {open ? <React.Suspense fallback={createPortal(<div className="sod29-finding-share-layer"><section className="sod29-finding-share-sheet" role="dialog"
      aria-modal="true" aria-busy="true" aria-label={label} dir="rtl"><p role="status">פותח את השיתוף…</p></section></div>, buttonRef.current?.closest(".sod29-root") || document.body)}>
      <FindingShareSheet2029 kind={kind} url={url} expression={expression} value={value} method={method} number={number} context={context}
        sourceSurface={sourceSurface} buttonRef={buttonRef} onClose={() => setOpen(false)} />
    </React.Suspense> : null}
  </>;
}
