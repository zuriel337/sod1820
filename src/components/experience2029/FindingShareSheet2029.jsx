import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
// The share actions are the existing component, loaded when the sheet opens (the same chunk the frame already loads on demand).
const ShareActions = React.lazy(() => import("../ShareActions.jsx"));
import { FINDING_NOT_SENT, findingCardUrl, findingDisclosure, findingShareMessage } from "../../lib/share.js";

// The finding-share sheet (ZURIEL 18.11.2026): shows exactly what will be sent (the finding, its method and result, the link, the card) and the
// existing ShareActions sends it. Loaded only when the button is pressed, so the share helpers never join a page's opening graph (speed law).
function findingImage({ kind, expression, value, method, number, context }) {
  return kind === "number" && !expression
    ? `https://sod1820.co.il/api/card?n=${encodeURIComponent(number)}`
    : findingCardUrl({ kind, expression, value, method, context: kind === "number" && number != null ? `בדף המספר ${number}` : context });
}

// The same finding for the bar's one share window (ZURIEL 19.11.2026): what the sheet shows — the card, "מה יישלח", the note — and the
// ShareActions props it sends. The button loads this module on press only, as it loaded the sheet.
export function findingBarShare({ kind, url, expression, value, method, number, context, sourceSurface }) {
  return { type: kind === "number" ? "number" : "gematria_result", url, title: findingShareMessage({ kind, expression, value, method, number }),
    image: findingImage({ kind, expression, value, method, number, context }), sourceSurface,
    label: expression || kind !== "number" ? "הממצא" : "דף המספר",
    disclosure: [["יישלח", expression ? "הביטוי, השיטה והתוצאה שבחרת, עם קישור שפותח את אותו ממצא" : "קישור לדף המספר"],
      ...findingDisclosure({ kind, expression, value, method, number, url })],
    note: FINDING_NOT_SENT };
}

export default function FindingShareSheet2029({ kind, url, expression, value, method, number, context, sourceSurface, buttonRef, onClose }) {
  const titleId = useId();
  const sheetRef = useRef(null);
  const close = () => { onClose(); buttonRef.current?.focus(); };
  useEffect(() => {
    sheetRef.current?.querySelector("button, a")?.focus();
    const onKey = (event) => { if (event.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  // The number page itself has its own card (the number and its phrases); a finding gets a finding card.
  const numberPageImage = findingImage({ kind, expression, value, method, number, context });
  const rows = findingDisclosure({ kind, expression, value, method, number, url });
  const message = findingShareMessage({ kind, expression, value, method, number });
  // Rendered into the frame root (its theme tokens live there), outside the page container, so the page's own stacking cannot keep it under
  // the frame's bottom bar.
  return createPortal(<div className="sod29-finding-share-layer" onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section ref={sheetRef} className="sod29-finding-share-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} dir="rtl">
        <header><h3 id={titleId}>{expression || kind !== "number" ? "שיתוף הממצא" : "שיתוף הדף"}</h3>
          <button type="button" className="sod29-finding-share-close" aria-label="סגירה" onClick={close}>×</button></header>
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
    </div>, buttonRef.current?.closest(".sod29-root") || document.body);
}
