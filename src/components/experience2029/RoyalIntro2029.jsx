import React, { useEffect, useId, useRef, useState } from "react";
import { ENTRY_METHODS_LEARNING_HREF, ENTRY_ORIENTATION_MANIFESTS } from "../../lib/entryLearn2029.js";
import { MethodsLearningLink } from "./LearnMark2029.jsx";
import "./royal2029.css";
import "./royalIntro2029.css";

// Optional atmosphere/help inside the existing page intro. The frame's live
// heading and context links render independently of this chunk and its image.
export default function RoyalIntro2029({ surface, title, description, orientationCopy, initialOpen = false }) {
  const [open, setOpen] = useState(initialOpen);
  const trigger = useRef(null);
  const panel = useId();
  useEffect(() => { if (initialOpen) trigger.current?.focus(); }, [initialOpen]);
  const manifest = ENTRY_ORIENTATION_MANIFESTS[surface];
  const close = () => { setOpen(false); trigger.current?.focus(); };
  // Escape closes wherever the focus is while the explanation is open (the same rule as LearnMark2029's surface help).
  useEffect(() => {
    if (!open) return undefined;
    const onKey = event => { if (event.key === "Escape") { event.stopPropagation(); close(); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  return <>
    <div className="r29-palace-help" onKeyDown={event => {
      if (event.key === "Escape" && open) { event.stopPropagation(); close(); }
    }}>
      <button ref={trigger} type="button" className="r29-btn is-quiet" style={{ background: "none", border: 0, boxShadow: "none", padding: "0 6px", fontSize: "var(--s29-type-micro,14px)", minHeight: 44 }} aria-expanded={open} aria-controls={panel} onClick={() => setOpen(!open)}>
        ? מה זה?
      </button>
      <div id={panel} className="r29-palace-disclosure" data-open={open} inert={!open} aria-hidden={!open}>
        <div className="r29-palace-explanation">
          <strong>{title}</strong>
          {description ? <p>{description}</p> : null}
          {manifest ? <p>{orientationCopy?.body || manifest.body}</p> : null}
          <p>אפשר להמשיך דרך הקישורים באזור התוכן ובפס ההקשר למטה. כשיש יעד חזרה שמור, „חזרה אל” מחזירה אליו בדיוק.</p>
          {manifest && open ? <React.Suspense fallback={null}><MethodsLearningLink href={ENTRY_METHODS_LEARNING_HREF} /></React.Suspense> : null}
          <button type="button" className="r29-btn is-quiet" onClick={close}>סגירת ההסבר</button>
        </div>
      </div>
    </div>
  </>;
}
