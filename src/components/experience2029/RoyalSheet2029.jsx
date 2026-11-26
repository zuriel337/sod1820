import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./royal2029.css";

// THE dialog of the Royal layer (Design V2 §14.13, ZURIEL 25.11.2026): one behaviour for every sheet, not only one look. `.r29-sheet` in royal2029.css draws it.
//   · role="dialog", aria-modal, labelled by its one title (titleId);
//   · closes on Escape, on a press on the backdrop, and through the content's own close/primary button (onClose);
//   · focus moves in on open, stays inside (Tab and Shift+Tab wrap), and returns to the opener on close;
//   · the page behind does not scroll while it is open.
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
export default function RoyalSheet2029({ titleId, onClose, children, "data-sheet": sheet }) {
  const ref = useRef(null);
  useEffect(() => {
    const opener = document.activeElement;
    const html = document.documentElement, previousOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    const first = ref.current?.querySelector(FOCUSABLE);
    (first || ref.current)?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") { event.stopPropagation(); onClose(); return; }
      if (event.key !== "Tab" || !ref.current) return;
      const items = [...ref.current.querySelectorAll(FOCUSABLE)].filter(item => item.offsetParent !== null || item === document.activeElement);
      if (!items.length) { event.preventDefault(); ref.current.focus(); return; }
      const firstItem = items[0], lastItem = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === firstItem || document.activeElement === ref.current)) { event.preventDefault(); lastItem.focus(); }
      else if (!event.shiftKey && document.activeElement === lastItem) { event.preventDefault(); firstItem.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); html.style.overflow = previousOverflow; opener?.focus?.(); };
  }, [onClose]);
  return createPortal(<div className="r29 r29-sheet-backdrop" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={ref} tabIndex={-1} className="r29-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} data-sheet={sheet}>{children}</section>
  </div>, document.querySelector(".sod29-root") || document.body);
}
