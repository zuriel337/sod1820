import React, { useMemo, useRef, useState } from "react";
import { buildElsMatrixShareUrl } from "../../lib/elsMatrixShare.js";

export default function ElsMatrixShare2029({ state, disabled }) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState(null);
  const inputRef = useRef(null);
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
  return <details className="els29-matrix-share" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>שתף מטריצה</summary>
    <div role="group" aria-label="שיתוף המטריצה">
      <p>הקישור כולל את הציר ואת הסימונים שנבחרו ברשימת הממצאים. הוא אינו כולל שיחות, הערות פרטיות או סימוני AI שלא נוספו לרשימה.</p>
      <p>כל מי שמקבל את הקישור יכול לראות את התוכן ששיתפתם. אין שמירה או פרסום אוטומטי בגלריה.</p>
      {url ? <>
        <label>קישור למטריצה<textarea ref={inputRef} dir="ltr" readOnly value={url} rows={2} onFocus={event => event.target.select()} /></label>
        <div className="els29-matrix-share-actions">
          <button type="button" onClick={copy}>העתק קישור</button>
          {typeof navigator.share === "function" ? <button type="button" onClick={share}>שתף דרך המכשיר</button> : null}
          <button type="button" onClick={() => { setOpen(false); inputRef.current?.closest("details")?.querySelector("summary")?.focus(); }}>סגור שיתוף</button>
        </div>
        {notice?.url === url ? <p role="status">{notice.text}</p> : null}
      </> : <p role="status">{disabled ? "בחרו מופע מאומת והמתינו לסיום החיפוש כדי לשתף את המטריצה." : "לא ניתן להכין קישור לכל הסימונים הנוכחיים. נסו לבחור פחות ממצאים."}</p>}
    </div>
  </details>;
}
