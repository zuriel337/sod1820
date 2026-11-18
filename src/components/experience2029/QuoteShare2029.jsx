import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { quoteLink, quoteMessage, shareableQuote } from "../../lib/quoteShareLink2029.js";
import "./quoteShare2029.css";
// The share actions are the existing component, loaded when the sheet opens.
const ShareActions = React.lazy(() => import("../ShareActions.jsx"));

// Share a selected sentence of a post (ZURIEL 18.11.2026). Loaded only after the reader's first selection inside the article, so it never
// joins the post's opening graph. A small button appears under the selection; the sheet shows exactly what will be sent (the sentence and a
// link that opens the post at that sentence) and the one ShareActions sends it.
export default function QuoteShare2029({ rootRef, url, title, entityId }) {
  const [pick, setPick] = useState(null); // { quote, top, left }
  const [open, setOpen] = useState(null); // the quote being shared
  const titleId = useId();
  const sheetRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    let timer = 0;
    const read = () => {
      const sel = window.getSelection?.();
      const root = rootRef?.current;
      if (!sel || sel.isCollapsed || !sel.rangeCount || !root) return setPick(null);
      const range = sel.getRangeAt(0);
      if (!root.contains(range.commonAncestorContainer)) return setPick(null);
      const quote = shareableQuote(sel.toString());
      if (!quote) return setPick(null);
      const rect = range.getBoundingClientRect();
      const left = Math.min(Math.max(rect.left + rect.width / 2, 96), window.innerWidth - 96);
      const top = Math.min(rect.bottom + 10, window.innerHeight - 140);
      setPick({ quote, top, left });
    };
    const onChange = () => { clearTimeout(timer); timer = setTimeout(read, 220); };
    // the button follows the selection while the page scrolls (it never strands over other text)
    const onScroll = onChange;
    document.addEventListener("selectionchange", onChange);
    window.addEventListener("scroll", onScroll, { passive: true });
    onChange();
    return () => { clearTimeout(timer); document.removeEventListener("selectionchange", onChange); window.removeEventListener("scroll", onScroll); };
  }, [rootRef]);

  useEffect(() => {
    if (!open) return undefined;
    sheetRef.current?.querySelector("button, a")?.focus();
    const onKey = (event) => { if (event.key === "Escape") setOpen(null); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const host = () => rootRef?.current?.closest(".sod29-root") || document.body;
  const link = open ? quoteLink(url, open) : null;
  return <>
    {pick && !open ? createPortal(<button ref={buttonRef} type="button" className="sod29-quote-share-button" style={{ top: pick.top, left: pick.left }}
      onPointerDown={(event) => event.preventDefault()} onClick={() => { setOpen(pick.quote); setPick(null); }} aria-haspopup="dialog">
      <span aria-hidden="true">⤴</span> שתף את המשפט
    </button>, host()) : null}
    {open && link ? createPortal(<div className="sod29-finding-share-layer sod29-quote-share-layer" onClick={(event) => { if (event.target === event.currentTarget) setOpen(null); }}>
      <section ref={sheetRef} className="sod29-quote-share-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} dir="rtl">
        <header><h3 id={titleId}>שיתוף המשפט</h3>
          <button type="button" className="sod29-quote-share-close" aria-label="סגירה" onClick={() => setOpen(null)}>×</button></header>
        <blockquote className="sod29-quote-share-quote">{open}</blockquote>
        <p className="sod29-quote-share-note">יישלח: המשפט שסימנת וקישור שפותח את הפוסט בדיוק במשפט הזה.</p>
        <React.Suspense fallback={<p role="status">טוען את אפשרויות השיתוף…</p>}>
          <ShareActions type="post" url={link} title={quoteMessage(open, title)} entityId={entityId} sourceSurface="post_2029_quote"
            channels={["native", "whatsapp", "telegram", "facebook", "copy"]} style={{ flexWrap: "wrap", overflowX: "visible" }} />
        </React.Suspense>
      </section>
    </div>, host()) : null}
  </>;
}
