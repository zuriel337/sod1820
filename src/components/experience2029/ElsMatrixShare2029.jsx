import React, { useMemo, useRef, useState } from "react";
import { buildElsMatrixShareUrl } from "../../lib/elsMatrixShare.js";
import NavigationIcon2029 from "./NavigationIcon2029.jsx";

export default function ElsMatrixShare2029({ state, disabled }) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState(null);
  const inputRef = useRef(null);
  const triggerRef = useRef(null);
  const url = useMemo(() => open && !disabled ? buildElsMatrixShareUrl(state, window.location.origin) : null, [open, disabled, state]);
  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setNotice({ url, text: "הקישור הועתק. הצופן לא פורסם בגלריה." });
    } catch {
      inputRef.current?.focus(); inputRef.current?.select();
      setNotice({ url, text: "העתקה אוטומטית אינה זמינה. סמנו והעתיקו את הקישור." });
    }
  };
  const share = async () => {
    if (!url) return;
    try { await navigator.share({ title: "מטריצת הצופן התנ״כי", text: state.termRaw || state.term, url }); }
    catch (error) { if (error?.name !== "AbortError") setNotice({ url, text: "השיתוף לא נפתח. אפשר להעתיק את הקישור." }); }
  };
  return <>
    <button ref={triggerRef} type="button" className="els29-matrix-share-trigger" aria-label="שתף מטריצה"
      aria-expanded={open} aria-controls="els29-matrix-share-panel" onClick={() => setOpen(value => !value)}>
      <NavigationIcon2029 name="share" /><span>שיתוף</span>
    </button>
    {open ? <div id="els29-matrix-share-panel" className="els29-matrix-share" role="group" aria-label="שיתוף המטריצה"
      onKeyDown={event => { if(event.key === "Escape") { event.stopPropagation();setOpen(false);triggerRef.current?.focus(); } }}>
      <p>הקישור כולל את הציר ואת הסימונים שנבחרו ברשימת הממצאים. הוא אינו כולל שיחות, הערות פרטיות או סימוני AI שלא נוספו לרשימה.</p>
      <p>כל מי שמקבל את הקישור יכול לראות את התוכן ששיתפתם. אין שמירה או פרסום אוטומטי בגלריה.</p>
      {url ? <>
        <label>קישור למטריצה<textarea ref={inputRef} dir="ltr" readOnly value={url} rows={2} onFocus={event => event.target.select()} /></label>
        <div className="els29-matrix-share-actions">
          <button type="button" onClick={copy}>העתק קישור</button>
          {typeof navigator.share === "function" ? <button type="button" onClick={share}>שתף דרך המכשיר</button> : null}
          <button type="button" onClick={() => { setOpen(false); triggerRef.current?.focus(); }}>סגור שיתוף</button>
        </div>
        {notice?.url === url ? <p role="status">{notice.text}</p> : null}
      </> : <p role="status">{disabled ? "בחרו מופע מאומת והמתינו לסיום החיפוש כדי לשתף את המטריצה." : "לא ניתן להכין קישור לכל הסימונים הנוכחיים. נסו לבחור פחות ממצאים."}</p>}
    </div> : null}
  </>;
}
