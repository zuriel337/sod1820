import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import WatchButton from "../WatchButton.jsx";
import { useAuth } from "../../lib/AuthContext.jsx";
import { publicReadingActionsLocked } from "../../lib/publicReadingRelease2029.js";
import { closePostFollow } from "../../lib/research/postFollowOpenStore2029.js";
import { sharedFollowIO, usePostFollowTargets } from "./postFollowShared2029.js";
import "./royal2029.css";
import "./postFollowDialog2029.css";

// THE follow panel of a Post (ZURIEL 25.11.2026): one compact Hall-style sheet, opened by the bell and by the invitation line. It lists only the series, categories
// and writer that have a verified updates route (usePostFollowTargets) and uses the existing WatchButton and engine with the one shared I/O. A follow never starts mail,
// push or WhatsApp. Where follows are still closed to the public it says so instead of offering a dead button.
export default function PostFollowDialog2029({ post }) {
  const auth = useAuth();
  const locked = publicReadingActionsLocked(auth.isAdmin);
  const { ready, status } = usePostFollowTargets(post);
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.focus();
    const onKey = (event) => { if (event.key === "Escape") closePostFollow(); };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); previous?.focus?.(); };
  }, []);
  return createPortal(<div className="r29 r29-sheet-backdrop" onClick={event => { if (event.target === event.currentTarget) closePostFollow(); }}>
    <section ref={ref} tabIndex={-1} className="r29-sheet" role="dialog" aria-modal="true" aria-labelledby="post-follow-title" data-post-follow-panel>
      <h2 id="post-follow-title">מעקב</h2>
      {locked ? <p>המעקבים ייפתחו בהמשך. אפשר להמשיך לקרוא את הסדרות והתכנים הציבוריים.</p>
        : status === "loading" ? <p className="r29-status" role="status" data-state="loading">בודק אילו יעדי מעקב זמינים…</p>
        : status === "error" ? <p className="r29-status" role="alert" data-state="error">לא הצלחנו לבדוק את יעדי המעקב. אפשר לנסות שוב מאוחר יותר.</p>
        : !ready.length ? <p>אין כרגע מעקב עם עדכונים זמינים לפוסט הזה.</p>
        : <><p>עדכון באתר כשמתפרסם פוסט חדש. בלי מייל ובלי התראות דפדפן.</p>
          <div className="r29-check-group" role="group" aria-label="מה לעקוב אחריו">
            {ready.map(item => <WatchButton key={item.topic} variant="check2029" topic={item.topic} source="post_follow_panel_2029" noPush followIO={sharedFollowIO}
              label={`${item.kind}: ${item.label}`} />)}
          </div></>}
      <div className="r29-btn-group"><button type="button" className="r29-btn is-primary" onClick={closePostFollow}>סגירה</button></div>
    </section>
  </div>, document.querySelector(".sod29-root") || document.body);
}
