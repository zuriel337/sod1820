import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
// The share actions are the existing component, loaded when the sheet opens (the same chunk the frame already loads on demand).
const ShareActions = React.lazy(() => import("../ShareActions.jsx"));
import { FINDING_NOT_SENT, findingCardUrl, findingDisclosure, findingShareMessage } from "../../lib/share.js";
import "./findingShare2029.css";

// A finding share (ZURIEL 18.11.2026): one clear button; on press a sheet shows exactly what will be sent (the finding, its method and result,
// the link, the card) and the existing ShareActions sends it. Loaded on demand by the pages, never in the frame or the opening graph.
export default function FindingShare2029({ kind = "calc", label = "שתף", url, expression = "", value = null, method = "", number = null,
  context = "", prominent = false, sourceSurface = "finding-share-2029" }) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const buttonRef = useRef(null);
  const sheetRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    sheetRef.current?.querySelector("button, a")?.focus();
    const onKey = (event) => { if (event.key === "Escape") { setOpen(false); buttonRef.current?.focus(); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  if (!url) return null;
  // The number page itself has its own card (the number and its phrases); a finding gets a finding card.
  const numberPageImage = kind === "number" && !expression
    ? `https://sod1820.co.il/api/card?n=${encodeURIComponent(number)}`
    : findingCardUrl({ kind, expression, value, method, context: kind === "number" && number != null ? `בדף המספר ${number}` : context });
  const rows = findingDisclosure({ kind, expression, value, method, number, url });
  const message = findingShareMessage({ kind, expression, value, method, number });
  return <>
    <button ref={buttonRef} type="button" className={`sod29-finding-share-button${prominent ? " is-prominent" : ""}`} data-finding-share={kind}
      aria-label={label} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
      <span aria-hidden="true">⤴</span><span className="sod29-finding-share-label">{label}</span>
    </button>
    {/* The sheet is rendered into the frame root (its theme tokens live there), outside the page container, so the page's own stacking
        cannot keep it under the frame's bottom bar. */}
    {open ? createPortal(<div className="sod29-finding-share-layer" onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section ref={sheetRef} className="sod29-finding-share-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} dir="rtl">
        <header><h3 id={titleId}>{expression || kind !== "number" ? "שיתוף הממצא" : "שיתוף הדף"}</h3>
          <button type="button" className="sod29-finding-share-close" aria-label="סגירה" onClick={() => { setOpen(false); buttonRef.current?.focus(); }}>×</button></header>
        <dl className="sod29-finding-share-sent" aria-label="מה יישלח">
          <div><dt>יישלח</dt><dd>{expression ? "הביטוי, השיטה והתוצאה שבחרת, עם קישור שפותח את אותו ממצא" : "קישור לדף המספר"}</dd></div>
          {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd dir="auto">{v}</dd></div>)}
        </dl>
        <img className="sod29-finding-share-preview" src={numberPageImage} alt="תמונת השיתוף" width="600" height="315" loading="lazy" decoding="async" />
        <React.Suspense fallback={<p role="status">טוען את אפשרויות השיתוף…</p>}>
          <ShareActions type={kind === "number" ? "number" : "gematria_result"} url={url} title={message} image={numberPageImage}
            channels={["native", "whatsapp", "copy"]} sourceSurface={sourceSurface} force style={{ flexWrap: "wrap", overflowX: "visible" }} />
        </React.Suspense>
        <p className="sod29-finding-share-note">{FINDING_NOT_SENT}</p>
      </section>
    </div>, buttonRef.current?.closest(".sod29-root") || document.body) : null}
  </>;
}
